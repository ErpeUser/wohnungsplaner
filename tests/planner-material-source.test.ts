import assert from "node:assert/strict";
import test from "node:test";
import { DataTexture, NoColorSpace } from "three";

import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";

test("WC and bathroom rugs use rectified reference-photo weave, not the full advertising graphic", () => {
  const material = getPlannerMaterial("aliexpress-bath-rug-woven");
  assert.ok(material.map instanceof DataTexture, "rug must use a sampled pixel texture");
  assert.match(material.map.name, /photo:aliexpress-waffle-1005013137520536/);
  assert.notEqual(material.bumpMap, material.map, "height sampling must not mutate the sRGB color map");
  assert.equal(material.bumpMap?.colorSpace, NoColorSpace);
  assert.equal(material.map.repeat.x, 15.25);
  assert.equal(material.map.repeat.y, 7.625);
  assert.equal(material.color.getHexString(), "ffffff", "no double tinting of beige pixel data");
  assert.doesNotMatch(material.map.name, /\.png|Extra Water Absorbent/i);
});

test("beige shower curtain uses a generated textile instead of a merchant screenshot", () => {
  const material = getPlannerMaterial("temu-shower-curtain-beige");
  assert.ok(material.map instanceof DataTexture);
  assert.match(material.map.name, /generated:temu-curtain-fabric-beige/);
});

test("comparison tables keep distinct local wood finishes with linear bump maps", () => {
  const finishes = ["oak-artisan", "oak-natural", "walnut"].map((id) => getPlannerMaterial(id));
  assert.ok(finishes.every((material) => material.map instanceof DataTexture));
  assert.ok(finishes.every((material) => material.color.getHexString() === "ffffff"), "authored wood RGB must not be tinted twice");
  assert.equal(new Set(finishes.map((material) => Array.from((material.map as DataTexture).image.data ?? []).slice(0, 3).join(","))).size, 3, "the authored albedo maps retain three different wood finishes");
  assert.ok(finishes.every((material) => material.bumpMap && material.bumpMap !== material.map));
  assert.ok(finishes.every((material) => material.bumpMap?.colorSpace === NoColorSpace));
});
