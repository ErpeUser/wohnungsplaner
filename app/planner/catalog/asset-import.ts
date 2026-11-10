import { z } from "zod";

const assetImportMetadataSchema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(["Schlafen", "Sitzen", "Arbeiten", "Aufbewahren", "Tische", "Licht/Deko"]),
  width: z.number().finite().positive(),
  depth: z.number().finite().positive(),
  height: z.number().finite().positive(),
  materialId: z.string().trim().min(1).default("object-neutral"),
  sourceUrl: z.string().url().optional(),
  license: z.enum(["CC0-1.0", "MIT"]).default("CC0-1.0"),
  notes: z.array(z.string().trim().min(1)).default([]),
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
  const sha256 = await sha256Hex(bytes);
  const extension = options.filename.toLowerCase().split(".").pop() ?? "asset";
  const mediaType = options.mediaType ?? mediaTypeForExtension(extension);
  assertSupportedSignature(bytes, extension, mediaType);
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

function assertSupportedSignature(bytes: Uint8Array, extension: string, mediaType: string) {
  const isGlb = extension === "glb" || mediaType === "model/gltf-binary";
  const isPng = extension === "png" || mediaType === "image/png";
  const isJpeg = extension === "jpg" || extension === "jpeg" || mediaType === "image/jpeg";
  const isSvg = extension === "svg" || mediaType === "image/svg+xml";
  const isWebp = extension === "webp" || mediaType === "image/webp";
  const valid = isGlb
    ? bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46
    : isPng
      ? bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
      : isJpeg
        ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : isSvg
          ? new TextDecoder().decode(bytes.subarray(0, 256)).includes("<svg")
          : isWebp
            ? bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF"
              && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
            : bytes.length > 0;
  if (!valid) throw new Error(`Die ${extension.toUpperCase()}-Signatur des Assets ist ungültig.`);
}

function mediaTypeForExtension(extension: string) {
  return extension === "glb" ? "model/gltf-binary"
    : extension === "svg" ? "image/svg+xml"
      : extension === "png" ? "image/png"
        : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "application/octet-stream";
}

async function sha256Hex(bytes: Uint8Array) {
  const buffer = bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
