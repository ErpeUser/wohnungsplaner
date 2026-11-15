import { PLANNER_ASSET_MANIFEST } from "../catalog/asset-manifest.ts";
import assetRevisions from "./asset-revisions.json";

const revisions = new Map<string, string>([
  ...PLANNER_ASSET_MANIFEST.assets.map(({ path, sha256 }) => [path, sha256] as const),
  ...Object.entries(assetRevisions),
]);

/** Version loader/cache inputs without changing persisted asset paths or imported URLs. */
export function plannerAssetUrl(path: string): string {
  const sha256 = revisions.get(path);
  return sha256 ? `${path}?v=${sha256}` : path;
}
