import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { marbleTileBuffers, bathMarbleWallBounds, wcMarbleWallBounds } from "../app/planner/scene-3d/architecture/marble-tiles.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

test("tiles the complete bathtub wall from corner to corner and floor to ceiling", () => {
  for (const roomId of [null, "bad"]) {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, roomId);
    const tub = scene.builtIns.find((item) => item.catalogId === "sanitary-bathtub");
    assert.ok(tub);
    const surfaces = scene.walls.flatMap((wall) => wall.segments
      .map((segment) => bathMarbleWallBounds(wall, segment, tub))).filter(Boolean);
    assert.equal(surfaces.length, 1, "only the bathtub wall is tiled");
    const surface = surfaces[0]!;
    assert.ok(Math.abs(surface.width - 1.85) < 1e-6);
    assert.ok(Math.abs(surface.width - tub.size[2] - 0.25) < 1e-6);
    assert.ok(Math.abs(surface.position[2] - surface.width / 2 - 8.2) < 1e-6);
    assert.ok(Math.abs(surface.position[2] + surface.width / 2 - 10.05) < 1e-6);
    assert.ok(Math.abs(surface.position[1] - surface.height / 2) < 1e-6, "finish reaches floor below bath");
    assert.ok(Math.abs(surface.position[1] + surface.height / 2 - 2.56) < 1e-6, "finish reaches ceiling");
    assert.ok(Math.abs(surface.position[0] - (-2.358)) < 1e-6);
  }
});

test("uses a 60 × 30 cm module and crops the finish at the surface edges", () => {
  const { positions, uvs } = marbleTileBuffers(1.6, 0.53);
  assert.equal(positions.length / 18, 7);
  assert.ok(Math.abs(positions[3] - positions[0] - 0.59925) < 1e-6);
  assert.ok(Math.abs(positions[7] - positions[1] - 0.29925) < 1e-6);
  const xs = positions.filter((_, index) => index % 3 === 0);
  const ys = positions.filter((_, index) => index % 3 === 1);
  assert.ok(Math.abs(Math.min(...xs) + 0.8) < 1e-6);
  assert.ok(Math.abs(Math.max(...xs) - 0.8) < 1e-6);
  assert.ok(Math.abs(Math.min(...ys) + 0.265) < 1e-6);
  assert.ok(Math.abs(Math.max(...ys) - 0.265) < 1e-6);
  assert.ok(uvs.every((value) => value > 0 && value < 1));
});

test("fills the complete 185 × 256 cm wall without left, right, top or bottom slivers", () => {
  const { positions } = marbleTileBuffers(1.85, 2.56);
  const xs = positions.filter((_, index) => index % 3 === 0);
  const ys = positions.filter((_, index) => index % 3 === 1);
  assert.ok(Math.abs(Math.min(...xs) + 0.925) < 1e-6);
  assert.ok(Math.abs(Math.max(...xs) - 0.925) < 1e-6);
  assert.ok(Math.abs(Math.min(...ys) + 1.28) < 1e-6);
  assert.ok(Math.abs(Math.max(...ys) - 1.28) < 1e-6);
});

test("finishes every WC-facing tiled wall without crossing into the neighboring rooms", () => {
  for (const roomId of [null, "wc"]) {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, roomId);
    const wcWalls = scene.walls.filter(wall => wall.roomIds.includes("wc"));
    const tiled = wcWalls.flatMap(wall => wall.segments.map(segment => ({
      wall, segment, surface: wcMarbleWallBounds(wall, segment),
    })));
    assert.equal(wcWalls.length, 4);
    assert.ok(tiled.length >= 4, "opening-specific wall segments are all tiled");
    assert.ok(tiled.every(({ surface }) => surface !== null));
    for (const { wall, segment, surface } of tiled) {
      assert.ok(surface);
      assert.equal(surface.width, segment.size[0]);
      assert.equal(surface.height, segment.size[1]);
      const inward = {
        x: -1.875 - segment.position[0],
        z: 4.91 - segment.position[2],
      };
      const facing = {
        x: surface.position[0] - segment.position[0],
        z: surface.position[2] - segment.position[2],
      };
      assert.ok(inward.x * facing.x + inward.z * facing.z > 0,
        `tile faces into WC at ${wall.id}`);
    }
    for (const other of scene.walls.filter(wall => !wall.roomIds.includes("wc"))) {
      for (const segment of other.segments) assert.equal(wcMarbleWallBounds(other, segment), null);
    }
    const rear = tiled.find(({ wall }) => wall.id === "wall-wc-1-1");
    assert.ok(rear?.surface);
    assert.equal(rear.surface.width, 1.09);
    assert.equal(rear.surface.height, 2.56);
  }
  const tiles = marbleTileBuffers(0.9, 2.56, 0, "wc");
  const firstTileWidth = tiles.positions[3] - tiles.positions[0];
  // The warmer ceramic finish uses a 1.5-mm joint instead of 0.75 mm.
  assert.ok(Math.abs(firstTileWidth - 0.44925) < 1e-6);
});
