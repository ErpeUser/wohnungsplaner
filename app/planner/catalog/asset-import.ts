import { z } from "zod";

import { isKnownAssetMaterialId } from "../domain/material-registry.ts";

export const MAX_PLANNER_ASSET_BYTES = 5 * 1024 * 1024;

const extensionToMediaType = {
  glb: "model/gltf-binary",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
} as const;

const supportedExtension = z.enum(["glb", "png", "jpg", "jpeg", "svg", "webp"]);

const assetImportMetadataSchema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(["Schlafen", "Sitzen", "Arbeiten", "Aufbewahren", "Tische", "Licht/Deko"]),
  width: z.number().finite().positive(),
  depth: z.number().finite().positive(),
  height: z.number().finite().positive(),
  materialId: z.string().trim().min(1).default("object-neutral"),
  sourceUrl: z.string().url().optional(),
  license: z.enum(["CC0-1.0", "MIT"]).default("CC0-1.0"),
  confidence: z.enum(["confirmed", "estimated", "legacy"]).default("estimated"),
  source: z.string().trim().min(1).default("manual-import"),
  notes: z.array(z.string().trim().min(1)).default([]),
}).superRefine((value, context) => {
  if (!isKnownAssetMaterialId(value.materialId)) {
    context.addIssue({ code: "custom", path: ["materialId"], message: `Unbekanntes Material: ${value.materialId}` });
  }
});

export type AssetImportMetadata = z.infer<typeof assetImportMetadataSchema>;

export type PreparedAsset = AssetImportMetadata & {
  assetId: string;
  byteLength: number;
  sha256: string;
  mediaType: string;
  normalizedSize: { width: number; depth: number; height: number };
  floorOffset: number;
  pivot: "center";
  confidence: "confirmed" | "estimated" | "legacy";
  source: string;
};

export function parseAssetImportMetadata(value: unknown): AssetImportMetadata {
  return assetImportMetadataSchema.parse(value);
}

export async function preparePlannerAsset(
  metadata: unknown,
  bytes: Uint8Array,
  options: { filename: string; mediaType?: string },
): Promise<PreparedAsset> {
  const parsed = parseAssetImportMetadata(metadata);
  if (bytes.byteLength === 0) throw new Error("Das Asset ist leer.");
  if (bytes.byteLength > MAX_PLANNER_ASSET_BYTES) {
    throw new Error(`Das Asset ist zu groß (maximal ${MAX_PLANNER_ASSET_BYTES / (1024 * 1024)} MB).`);
  }
  const sha256 = await sha256Hex(bytes);
  const extension = options.filename.toLowerCase().split(".").pop() ?? "";
  const extensionResult = supportedExtension.safeParse(extension);
  if (!extensionResult.success) throw new Error("Nicht unterstütztes Asset-Format. Erlaubt sind GLB, PNG, JPEG, SVG und WEBP.");
  const normalizedExtension = extensionResult.data;
  const mediaType = options.mediaType ?? mediaTypeForExtension(normalizedExtension);
  if (mediaType !== mediaTypeForExtension(normalizedExtension)) {
    throw new Error("Dateiendung und MIME-Typ des Assets passen nicht zusammen.");
  }
  assertSupportedSignature(bytes, normalizedExtension);
  const slug = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset";
  return {
    ...parsed,
    assetId: `import-${slug}-${sha256.slice(0, 12)}`,
    byteLength: bytes.byteLength,
    sha256,
    mediaType,
    normalizedSize: { width: parsed.width, depth: parsed.depth, height: parsed.height },
    floorOffset: 0,
    pivot: "center",
  };
}

function assertSupportedSignature(bytes: Uint8Array, extension: string) {
  const isGlb = extension === "glb";
  const isPng = extension === "png";
  const isJpeg = extension === "jpg" || extension === "jpeg";
  const isSvg = extension === "svg";
  const isWebp = extension === "webp";
  const valid = isGlb
    ? bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46
    : isPng
      ? bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
      : isJpeg
        ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : isSvg
          ? isSafeSvg(bytes)
          : isWebp
            ? bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF"
              && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
            : false;
  if (!valid) throw new Error(`Die ${extension.toUpperCase()}-Signatur des Assets ist ungültig.`);
}

function mediaTypeForExtension(extension: string) {
  return extensionToMediaType[extension as keyof typeof extensionToMediaType] ?? "application/octet-stream";
}

function isSafeSvg(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes);
  if (!/^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(text)) return false;
  if (/<\s*(?:script|foreignObject|iframe|object|embed|audio|video)\b/i.test(text)) return false;
  if (/\bon[a-z]+\s*=|javascript\s*:/i.test(text)) return false;
  if (/<!DOCTYPE\b|<!ENTITY\b/i.test(text)) return false;
  // SVG resources are only safe when embedded or local. Remote references would
  // bypass the planner's asset allowlist and can leak user data at render time.
  if (/(?:href|src|xlink:href)\s*=\s*["']\s*(?!(?:#|data:image\/))[^"']+/i.test(text)) return false;
  if (/url\(\s*["']?\s*(?:https?:|data:text|javascript:)/i.test(text)) return false;
  return true;
}

async function sha256Hex(bytes: Uint8Array) {
  const buffer = bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
