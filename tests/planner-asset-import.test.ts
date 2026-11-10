import assert from "node:assert/strict";
import test from "node:test";

import { MAX_PLANNER_ASSET_BYTES, parseAssetImportMetadata, preparePlannerAsset } from "../app/planner/catalog/asset-import.ts";

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

test("supports WEBP with a matching MIME type", async () => {
  const prepared = await preparePlannerAsset({
    name: "Textur",
    category: "Licht/Deko",
    width: 1,
    depth: 1,
    height: 0.01,
  }, new TextEncoder().encode("RIFFxxxxWEBP"), { filename: "textur.webp", mediaType: "image/webp" });
  assert.equal(prepared.mediaType, "image/webp");
});

test("rejects oversized files and extension/MIME mismatches before import", async () => {
  await assert.rejects(
    preparePlannerAsset({ name: "Groß", category: "Sitzen", width: 1, depth: 1, height: 1 }, new Uint8Array(MAX_PLANNER_ASSET_BYTES + 1), { filename: "gross.glb" }),
    /zu groß|maximal/i,
  );
  await assert.rejects(
    preparePlannerAsset({ name: "Falsch", category: "Sitzen", width: 1, depth: 1, height: 1 }, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), { filename: "falsch.png", mediaType: "image/jpeg" }),
    /MIME|passen/i,
  );
});

test("rejects unknown materials and unsafe SVG markup", async () => {
  assert.throws(
    () => parseAssetImportMetadata({ name: "Unbekannt", category: "Sitzen", width: 1, depth: 1, height: 1, materialId: "does-not-exist" }),
    /Unbekanntes Material/i,
  );
  await assert.rejects(
    preparePlannerAsset({ name: "SVG", category: "Licht/Deko", width: 1, depth: 1, height: 0.1 }, new TextEncoder().encode('<svg><script>alert(1)</script></svg>'), { filename: "unsafe.svg" }),
    /Signatur|SVG/i,
  );
});
