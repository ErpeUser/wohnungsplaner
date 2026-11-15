import { PLANNER_ASSET_MANIFEST } from "./asset-manifest.ts";
import assetRevisions from "../scene-3d/asset-revisions.json";

const revisions = new Map<string, string>([
  ...PLANNER_ASSET_MANIFEST.assets.map(({ path, sha256 }) => [path, sha256] as const),
  ...Object.entries(assetRevisions),
]);

/** Shared by 2D, 3D and product previews; this module has no Three dependency. */
export function plannerAssetUrl(path: string): string {
  const sha256 = revisions.get(path);
  return sha256 ? `${path}?v=${sha256}` : path;
}
