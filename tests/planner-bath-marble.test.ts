import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { bathMarbleTileBuffers, bathMarbleWallBounds } from "../app/planner/scene-3d/architecture/bath-marble.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

test("clips the white-gold wall finish to the tub length, rim and ceiling", () => {
  for (const roomId of [null, "bad"]) {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, roomId);
    const tub = scene.builtIns.find((item) => item.catalogId === "sanitary-bathtub");
    assert.ok(tub);
    const surfaces = scene.walls.flatMap((wall) => wall.segments
      .map((segment) => bathMarbleWallBounds(wall, segment, tub))).filter(Boolean);
    assert.equal(surfaces.length, 1);
    const surface = surfaces[0]!;
    assert.ok(Math.abs(surface.width - 1.6) < 1e-6);
    assert.ok(Math.abs(surface.position[1] - surface.height / 2 - 0.56) < 1e-6);
    assert.ok(Math.abs(surface.position[1] + surface.height / 2 - 2.56) < 1e-6);
    assert.ok(Math.abs(surface.position[0] - (-2.358)) < 1e-6);
  }
});

test("uses a 60 × 30 cm module and crops the finish at the surface edges", () => {
  const { positions, uvs } = bathMarbleTileBuffers(1.6, 0.53);
  assert.equal(positions.length / 18, 7);
  assert.ok(Math.abs(positions[3] - positions[0] - 0.5985) < 1e-6);
  assert.ok(Math.abs(positions[7] - positions[1] - 0.2985) < 1e-6);
  const xs = positions.filter((_, index) => index % 3 === 0);
  const ys = positions.filter((_, index) => index % 3 === 1);
  assert.ok(Math.abs(Math.max(...xs) - 0.8) < 1e-6);
  assert.ok(Math.abs(Math.max(...ys) - 0.265) < 1e-6);
  assert.ok(uvs.every((value) => value > 0 && value < 1));
});
