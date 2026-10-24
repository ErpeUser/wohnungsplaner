import assert from "node:assert/strict";
import test from "node:test";

import {
  doorPassagePolygon,
  doorSweepPolygon,
  placementPolygon,
  pointInPolygon,
  roomAtPoint,
  roomContainsPlacement,
} from "../app/planner/domain/geometry.ts";
import { inspectPlacement } from "../app/planner/domain/collisions.ts";
import { snapPlacement } from "../app/planner/domain/snapping.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import type { PlannerDocumentV3, PlannerPlacement } from "../app/planner/domain/types.ts";

test("builds the footprint of a rotated rectangular placement", () => {
  const polygon = placementPolygon(placement({ x: 0, z: 0 }, 2, 1, 90));
  assert.deepEqual(bounds(polygon), { minX: -0.5, minZ: -1, maxX: 0.5, maxZ: 1 });
});

test("locates points against diagonal room facades", () => {
  assert.equal(roomAtPoint(DEFAULT_APARTMENT_DOCUMENT, { x: 5.3, z: 9.5 }), "loggia");
  assert.equal(roomAtPoint(DEFAULT_APARTMENT_DOCUMENT, { x: 5.8, z: 9 }), null);
  assert.equal(pointInPolygon({ x: 0, z: 0 }, [
    { x: 0, z: 0 }, { x: 2, z: 0 }, { x: 1, z: 2 },
  ]), true);
});

test("requires a transferred placement to fit completely inside the target room", () => {
  const inside = placement({ x: 1.5, z: 10.4 }, 0.5, 0.5, 0, "zimmer2");
  const crossing = placement({ x: 0.05, z: 10.4 }, 0.5, 0.5, 0, "zimmer2");

  assert.equal(roomContainsPlacement(DEFAULT_APARTMENT_DOCUMENT, "zimmer2", inside), true);
  assert.equal(roomContainsPlacement(DEFAULT_APARTMENT_DOCUMENT, "zimmer2", crossing), false);
});

test("adds five centimetres to the 90 degree door sweep", () => {
  const document = squareRoomDocument();
  const sweep = doorSweepPolygon(document, "door-main");
  const hinge = { x: 1, z: 0 };
  const farthest = Math.max(...sweep.map((point) => Math.hypot(point.x - hinge.x, point.z - hinge.z)));

  assert.ok(Math.abs(farthest - 0.85) < 0.001);
  assert.ok(sweep.some((point) => point.z > 0.8));
});

test("creates a 60 centimetre passage warning zone on both door sides", () => {
  const passage = doorPassagePolygon(squareRoomDocument(), "door-main");
  assert.deepEqual(bounds(passage), { minX: 1, minZ: -0.6, maxX: 1.8, maxZ: 0.6 });
});

test("reports walls, built-ins and door sweeps as hard collisions but fixtures as non-blocking", () => {
  const document = squareRoomDocument();

  assert.ok(inspectPlacement(document, placement({ x: 3, z: 3 }, 0.5, 0.5)).hard.some((hit) => hit.kind === "built-in"));
  assert.ok(inspectPlacement(document, placement({ x: 1.35, z: 0.35 }, 0.2, 0.2)).hard.some((hit) => hit.kind === "door-sweep"));
  assert.ok(inspectPlacement(document, placement({ x: -0.05, z: 2 }, 0.2, 0.2)).hard.some((hit) => hit.kind === "room-boundary"));
  assert.deepEqual(inspectPlacement(document, placement({ x: 2.5, z: 2 }, 0.2, 0.2)).hard, []);
});

test("keeps passage clearance as a warning without blocking placement", () => {
  const report = inspectPlacement(squareRoomDocument(), placement({ x: 1.78, z: 0.55 }, 0.02, 0.02));
  assert.equal(report.hard.length, 0);
  assert.ok(report.warnings.some((hit) => hit.kind === "door-passage"));
});

test("prioritises wall and object edge guides before the five centimetre grid", () => {
  const result = snapPlacement({
    position: { x: 1.02, z: 1.03 },
    size: { width: 1, depth: 1 },
    rotation: 0,
    guides: [
      { axis: "x", value: 0.5, kind: "wall", sourceId: "wall-west" },
      { axis: "z", value: 1.55, kind: "object", sourceId: "sofa" },
    ],
  });

  assert.deepEqual(result.position, { x: 1, z: 1.05 });
  assert.deepEqual(result.guides.map((guide) => guide.kind), ["wall", "object"]);
});

test("uses a five centimetre grid and lets disableGrid bypass only that fallback", () => {
  const snapped = snapPlacement({ position: { x: 1.023, z: 1.076 }, size: { width: 1, depth: 1 } });
  const free = snapPlacement({ position: { x: 1.023, z: 1.076 }, size: { width: 1, depth: 1 }, disableGrid: true });

  assert.deepEqual(snapped.position, { x: 1, z: 1.1 });
  assert.deepEqual(free.position, { x: 1.023, z: 1.076 });
  assert.deepEqual(free.guides, []);
});

function placement(
  position: { x: number; z: number },
  width: number,
  depth: number,
  rotation = 0,
  roomId = "room-square",
): PlannerPlacement {
  return {
    id: `candidate-${position.x}-${position.z}`,
    roomId,
    catalogId: "test-item",
    position,
    rotation,
    size: { width, depth, height: 0.8 },
  };
}

function bounds(points: Array<{ x: number; z: number }>) {
  const rounded = (value: number) => Number(value.toFixed(3));
  return {
    minX: rounded(Math.min(...points.map((point) => point.x))),
    minZ: rounded(Math.min(...points.map((point) => point.z))),
    maxX: rounded(Math.max(...points.map((point) => point.x))),
    maxZ: rounded(Math.max(...points.map((point) => point.z))),
  };
}

function squareRoomDocument(): PlannerDocumentV3 {
  return {
    schemaVersion: 3,
    id: "geometry-document",
    name: "Geometry fixture",
    updatedAt: "2026-10-24T08:00:00.000Z",
    walls: [
      { id: "wall-south", start: { x: 0, z: 0 }, end: { x: 4, z: 0 }, thickness: 0.12, height: 2.6, roomIds: ["room-square"] },
      { id: "wall-east", start: { x: 4, z: 0 }, end: { x: 4, z: 4 }, thickness: 0.12, height: 2.6, roomIds: ["room-square"] },
      { id: "wall-north", start: { x: 4, z: 4 }, end: { x: 0, z: 4 }, thickness: 0.12, height: 2.6, roomIds: ["room-square"] },
      { id: "wall-west", start: { x: 0, z: 4 }, end: { x: 0, z: 0 }, thickness: 0.12, height: 2.6, roomIds: ["room-square"] },
    ],
    rooms: [{
      id: "room-square",
      name: "Square",
      area: 16,
      includedInWnf: true,
      boundary: [
        { wallId: "wall-south", direction: 1 },
        { wallId: "wall-east", direction: 1 },
        { wallId: "wall-north", direction: 1 },
        { wallId: "wall-west", direction: 1 },
      ],
      surfaces: { floor: "oak", walls: "white", ceiling: "white" },
    }],
    openings: [{
      id: "door-main",
      label: "Main door",
      wallId: "wall-south",
      offset: 1,
      width: 0.8,
      height: 2.05,
      sill: 0,
      kind: "door",
      hinge: "start",
      swingDegrees: 90,
    }],
    builtIns: [{
      id: "builtin-cabinet",
      label: "Cabinet",
      roomId: "room-square",
      kind: "storage",
      position: { x: 3, z: 3 },
      rotation: 0,
      size: { width: 0.8, depth: 0.8, height: 2 },
      locked: true,
    }],
    fixtures: [{
      id: "fixture-light",
      label: "Ceiling light",
      roomId: "room-square",
      kind: "light",
      position: { x: 2.5, z: 2 },
      height: 2.5,
    }],
    placements: [],
    doorStates: { "door-main": "closed" },
    viewPreferences: {
      activeRoomId: "room-square",
      overlays: { dimensions: false, fixtures: false, evidence: false },
    },
  };
}
