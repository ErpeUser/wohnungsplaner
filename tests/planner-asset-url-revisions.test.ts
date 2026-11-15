import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { PLANNER_ASSET_MANIFEST } from "../app/planner/catalog/asset-manifest.ts";
import assetRevisions from "../app/planner/scene-3d/asset-revisions.json";
import { plannerAssetUrl } from "../app/planner/scene-3d/asset-url.ts";

async function expectContentVersion(path: string, sha256: string) {
  const bytes = await readFile(resolve(process.cwd(), "public", path.slice(1)));
  const actual = createHash("sha256").update(bytes).digest("hex");
  assert.equal(sha256, actual, `${path} revision must change with its bytes`);
  const url = new URL(plannerAssetUrl(path), "https://test.invalid");
  assert.equal(url.pathname, path, "Only the request query changes; source paths remain stable");
  assert.equal(url.search, `?v=${actual}`);
}

test("all manifest assets use the hash of their current bytes as the loader version", async () => {
  assert.equal(PLANNER_ASSET_MANIFEST.assets.length, 11);
  for (const asset of PLANNER_ASSET_MANIFEST.assets) await expectContentVersion(asset.path, asset.sha256);
});

test("the corrected SVG revisions cannot drift from their actual files", async () => {
  assert.deepEqual(Object.keys(assetRevisions).sort(), [
    "/planner-assets/textures/fabric/temu-easy-line-colorblock-rug.svg",
    "/planner-assets/textures/fabric/temu-vintage-rug-607199740937372.svg",
    "/planner-assets/textures/tile/taupe-square.svg",
    "/planner-assets/textures/tile/white-rect.svg",
    "/planner-assets/textures/tile/white-square.svg",
  ]);
  const manifestPaths = new Set(PLANNER_ASSET_MANIFEST.assets.map((asset) => asset.path));
  for (const [path, sha256] of Object.entries(assetRevisions)) {
    assert.equal(manifestPaths.has(path), false, "The separate registry must not override manifest revisions");
    await expectContentVersion(path, sha256);
  }
});

test("external, imported, unknown and already versioned URLs remain unchanged", () => {
  const local = "/planner-assets/models/bed.glb";
  for (const path of [
    "https://assets.example.test/imported.glb?token=keep&v=external",
    `https://assets.example.test${local}`,
    "blob:https://planner.example.test/owned-import",
    "/planner-assets/textures/fabric/temu-organic-wave-rug.svg",
    "/planner-assets/models/unknown.glb",
    `${local}?token=keep`,
    plannerAssetUrl(local),
  ]) assert.equal(plannerAssetUrl(path), path);
});
