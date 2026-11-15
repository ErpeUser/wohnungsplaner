import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { DataUtils, FloatType } from "three";
import { RGBELoader } from "three-stdlib";

import {
  PLANNER_ASSET_MANIFEST,
  verifyPlannerAssetBytes,
} from "../app/planner/catalog/asset-manifest.ts";

const environmentPath = resolve(process.cwd(), "public/planner-assets/environment/studio-soft.hdr");

test("studio environment decodes exactly its declared 4 by 2 pixels", async () => {
  const bytes = await readFile(environmentPath);
  const parsed = new RGBELoader().parse(Uint8Array.from(bytes).buffer);

  assert.equal(parsed.width, 4);
  assert.equal(parsed.height, 2);
  assert.equal(parsed.data.length, 32, "Eight pixels must supply exactly eight RGBA tuples");
});

test("studio environment retains finite neutral-light radiance without half-float clipping", async () => {
  const bytes = await readFile(environmentPath);
  const buffer = Uint8Array.from(bytes).buffer;
  const floats = new RGBELoader().setDataType(FloatType).parse(buffer);
  const halfFloats = new RGBELoader().parse(buffer);

  for (let i = 0; i < floats.data.length; i += 1) {
    const linear = floats.data[i];
    const half = DataUtils.fromHalfFloat(halfFloats.data[i]);
    if (i % 4 === 3) {
      assert.equal(linear, 1);
      assert.equal(half, 1);
    } else {
      assert.ok(Number.isFinite(linear) && linear > 0 && linear < 2, `Unexpected neutral-environment radiance at channel ${i}: ${linear}`);
      assert.ok(Number.isFinite(half) && half > 0 && half < 2, `Unexpected half-float radiance at channel ${i}: ${half}`);
      assert.ok(Math.abs(linear - half) < 0.001, "Half-float storage must retain the neutral source values");
    }
  }
});

test("studio environment preserves the generator RGBE bytes and manifest integrity", async () => {
  const bytes = await readFile(environmentPath);
  // Independent byte fixture from the existing procedural environment source.
  // A text re-encoding must never expand high-bit pixel bytes into UTF-8.
  const expected = Buffer.concat([
    Buffer.from("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 2 +X 4\n", "ascii"),
    Buffer.from([
      210, 220, 235, 128, 230, 220, 198, 128, 248, 226, 190, 128, 196, 211, 230, 128,
      80, 86, 91, 128, 105, 96, 84, 128, 112, 100, 86, 128, 73, 82, 88, 128,
    ]),
  ]);
  assert.deepEqual(bytes, expected);

  const asset = PLANNER_ASSET_MANIFEST.assets.find((candidate) => candidate.id === "environment-studio");
  assert.ok(asset);
  assert.equal(asset.byteLength, bytes.length);
  assert.equal(asset.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(await verifyPlannerAssetBytes(asset, bytes), true);
});
