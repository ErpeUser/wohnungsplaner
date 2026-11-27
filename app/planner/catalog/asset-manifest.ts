import manifestJson from "../../../public/planner-assets/manifest.json";

import type { FurnitureCatalogItem } from "./catalog.ts";

export type PlannerAssetType = "model" | "texture" | "environment";

export type PlannerAsset = {
  id: string;
  type: PlannerAssetType;
  path: string;
  mediaType: string;
  license: {
    spdx: "CC0-1.0" | "MIT" | "LicenseRef-UserProvided";
    sourceUrl: string;
    note: string;
  };
  sha256: string;
  byteLength: number;
  meterScale: number;
  catalogIds?: string[];
  url?: string;
};

export type PlannerAssetManifest = {
  version: number;
  generatedBy: string;
  units: "metres";
  assets: PlannerAsset[];
};

export type AssetResolution =
  | { kind: "gltf"; itemId: string; asset: PlannerAsset }
  | { kind: "parametric"; itemId: string; fallback: string; reason: "no-model" | "asset-unavailable" };

export const PLANNER_ASSET_MANIFEST = manifestJson as PlannerAssetManifest;
let activeManifest = PLANNER_ASSET_MANIFEST;

export function setPlannerAssetManifest(manifest: PlannerAssetManifest) {
  activeManifest = manifest;
}

export function getPlannerAssetManifest() {
  return activeManifest;
}

export async function loadPlannerAssetManifest(): Promise<PlannerAssetManifest> {
  // The regular local visual server serves the checked-in manifest directly
  // and intentionally has no Cloud Run live-asset endpoint. Avoid a noisy 404
  // during browser smoke tests while retaining the endpoint for production
  // hosts and the live-preview server.
  if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1" && window.location.port === "3100") {
    return PLANNER_ASSET_MANIFEST;
  }
  try {
    const response = await fetch("/__codex/live-assets/manifest", { cache: "no-store" });
    if (!response.ok) return PLANNER_ASSET_MANIFEST;
    const manifest = await response.json() as PlannerAssetManifest;
    if (!Array.isArray(manifest.assets)) return PLANNER_ASSET_MANIFEST;
    return manifest;
  } catch {
    return PLANNER_ASSET_MANIFEST;
  }
}

export function resolveFurnitureAsset(
  item: FurnitureCatalogItem,
  unavailableAssetIds: ReadonlySet<string> = new Set(),
): AssetResolution {
  const asset = activeManifest.assets
    .filter((candidate) => candidate.type === "model")
    .flatMap((candidate) => (candidate.catalogIds ?? []).map((catalogId) => [catalogId, candidate] as const))
    .find(([catalogId]) => catalogId === item.id)?.[1];
  if (!asset) {
    return { kind: "parametric", itemId: item.id, fallback: item.fallback3d, reason: "no-model" };
  }
  if (unavailableAssetIds.has(asset.id)) {
    return { kind: "parametric", itemId: item.id, fallback: item.fallback3d, reason: "asset-unavailable" };
  }
  return { kind: "gltf", itemId: item.id, asset };
}

export async function verifyPlannerAssetBytes(asset: PlannerAsset, bytes: Uint8Array) {
  if (bytes.byteLength !== asset.byteLength) return false;
  const digestBuffer = bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", digestBuffer);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  if (sha256 !== asset.sha256) return false;
  if (asset.type === "model") {
    return bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
  }
  if (asset.path.endsWith(".hdr")) {
    return new TextDecoder().decode(bytes.subarray(0, 10)).startsWith("#?RADIANCE");
  }
  if (asset.path.endsWith(".svg")) {
    return new TextDecoder().decode(bytes.subarray(0, 128)).includes("<svg");
  }
  if (asset.path.endsWith(".png")) {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (asset.path.endsWith(".jpg") || asset.path.endsWith(".jpeg")) {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (asset.path.endsWith(".webp")) {
    return bytes.length >= 12
      && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF"
      && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP";
  }
  return bytes.byteLength > 0;
}
