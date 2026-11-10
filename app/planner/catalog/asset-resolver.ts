import type { PlannerAssetRecord, PlannerDocumentV3 } from "../domain/types.ts";

export type PlannerAssetResolution =
  | {
      kind: "placeholder";
      asset: PlannerAssetRecord;
      reason: string;
    }
  | {
      kind: "remote";
      asset: PlannerAssetRecord;
      url: string;
    };

/**
 * Resolves a persisted planner asset without trusting URLs from the document.
 * A missing/invalid URL intentionally remains renderable as a placeholder.
 */
export function resolvePlannerAsset(
  document: Pick<PlannerDocumentV3, "assets">,
  assetId: string,
  allowedOrigins: ReadonlySet<string>,
): PlannerAssetResolution {
  const asset = document.assets?.find((candidate) => candidate.assetId === assetId);
  if (!asset) throw new Error(`Unbekanntes Asset: ${assetId}`);
  if (!asset.assetUrl) {
    return { kind: "placeholder", asset, reason: "Keine freigegebene Storage-URL" };
  }

  try {
    const url = new URL(asset.assetUrl);
    if (
      url.protocol !== "https:"
      || !allowedOrigins.has(url.origin)
      || url.username
      || url.password
    ) {
      return { kind: "placeholder", asset, reason: "Asset-URL ist nicht freigegeben" };
    }
    return { kind: "remote", asset, url: url.href };
  } catch {
    return { kind: "placeholder", asset, reason: "Ungültige Asset-URL" };
  }
}
