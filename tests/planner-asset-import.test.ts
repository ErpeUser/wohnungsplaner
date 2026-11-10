import assert from "node:assert/strict";
import test from "node:test";

import { parseAssetImportMetadata, preparePlannerAsset } from "../app/planner/catalog/asset-import.ts";

test("normalizes imported asset metadata into a stable local identity", async () => {
  const prepared = await preparePlannerAsset({
    name: "Bouclé Sessel",
    category: "Sitzen",
    width: 0.82,
    depth: 0.8,
    height: 0.78,
  }, new Uint8Array([0x67, 0x6c, 0x54, 0x46, 1, 2, 3]), { filename: "sessel.glb" });

  assert.match(prepared.assetId, /^import-boucl-sessel-[0-9a-f]{12}$/);
  assert.equal(prepared.mediaType, "model/gltf-binary");
  assert.deepEqual(prepared.normalizedSize, { width: 0.82, depth: 0.8, height: 0.78 });
  assert.equal(prepared.floorOffset, 0);
});

test("rejects incomplete AI metadata before it can enter the catalog", () => {
  assert.throws(() => parseAssetImportMetadata({ name: "", width: 0 }), /Too small|positive/i);
});

test("rejects an imported GLB with an invalid file signature", async () => {
  await assert.rejects(
    preparePlannerAsset({
      name: "Ungültiges Modell",
      category: "Sitzen",
      width: 0.8,
      depth: 0.8,
      height: 0.8,
    }, new Uint8Array([1, 2, 3, 4]), { filename: "modell.glb" }),
    /Signatur|GLB/i,
  );
});
