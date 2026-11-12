import assert from "node:assert/strict";
import test from "node:test";
import { DataTexture, NoColorSpace } from "three";

import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";

test("WC and bathroom rugs use a generated waffle fabric, never the advertising graphic", () => {
  const material = getPlannerMaterial("temu-bath-rug-woven");
  assert.ok(material.map instanceof DataTexture, "rug must use a procedural pixel texture");
  assert.match(material.map.name, /generated:temu-bath-rug-waffle-1cm/);
  assert.notEqual(material.bumpMap, material.map, "height sampling must not mutate the sRGB color map");
  assert.equal(material.bumpMap?.colorSpace, NoColorSpace);
  assert.equal(material.map.repeat.x, 7.6);
  assert.equal(material.map.repeat.y, 3.8);
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
  assert.equal(new Set(finishes.map((material) => material.color.getHexString())).size, 3);
  assert.ok(finishes.every((material) => material.bumpMap && material.bumpMap !== material.map));
  assert.ok(finishes.every((material) => material.bumpMap?.colorSpace === NoColorSpace));
});
