import assert from "node:assert/strict";
import test from "node:test";

import {
  doorPassagePolygon,
  doorPose,
  doorSweepPolygon,
  openingSegment,
  placementPolygon,
  pointInPolygon,
  roomAtPoint,
  roomContainsPlacement,
} from "../app/planner/domain/geometry.ts";
import { inspectPlacement, inspectPlacementLinear } from "../app/planner/domain/collisions.ts";
import { snapPlacement } from "../app/planner/domain/snapping.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import type { PlannerDocumentV3, PlannerPlacement } from "../app/planner/domain/types.ts";
import { buildWallGraph } from "../app/planner/domain/wall-graph.ts";

test("builds the footprint of a rotated rectangular placement", () => {
  const polygon = placementPolygon(placement({ x: 0, z: 0 }, 2, 1, 90));
  assert.deepEqual(bounds(polygon), { minX: -0.5, minZ: -1, maxX: 0.5, maxZ: 1 });
});

test("locates points against diagonal room facades", () => {
  assert.equal(roomAtPoint(DEFAULT_APARTMENT_DOCUMENT, { x: 5.3, z: 9.5 }), "balkon");
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

test("keeps placement footprints outside the physical wall face", () => {
  const document = squareRoomDocument();
  const penetrating = placement({ x: 0.25, z: 2 }, 0.5, 0.5);
  const flushToFace = placement({ x: 0.31, z: 2 }, 0.5, 0.5);

  assert.equal(roomContainsPlacement(document, "room-square", penetrating), false);
  assert.equal(roomContainsPlacement(document, "room-square", flushToFace), true);
});

test("rejects a footprint whose edge crosses a concave room notch", () => {
  const document = concaveRoomDocument();
  const crossing = placement({ x: 2, z: 2 }, 3, 1, 0, "concave");

  assert.equal(roomContainsPlacement(document, "concave", crossing), false);
});

test("splits partially overlapping room edges into canonical shared wall segments", () => {
  const graph = buildWallGraph([
    roomOutline("left", [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 3, z: 4 }, { x: 0, z: 4 }]),
    roomOutline("right", [{ x: 3, z: 1 }, { x: 5, z: 1 }, { x: 5, z: 3 }, { x: 3, z: 3 }]),
  ]);

  const shared = graph.walls.filter((wall) => wall.roomIds.includes("left") && wall.roomIds.includes("right"));
  assert.equal(shared.length, 1);
  assert.deepEqual([shared[0].start, shared[0].end], [{ x: 3, z: 1 }, { x: 3, z: 3 }]);
  assert.equal(graph.rooms.find((room) => room.id === "left")?.boundary.length, 6);
});

test("checks a shared doorway from the room on either side", () => {
  const document = adjacentRoomsDocument();
  const report = inspectPlacement(document, placement({ x: 1.75, z: 2 }, 0.2, 0.2, 0, "left"));
  assert.ok(report.hard.some((hit) => hit.kind === "door-sweep"));
});

test("resolves an opening across a collinear wall chain without extending past the physical wall", () => {
  const document = squareRoomDocument();
  document.walls = [
    { ...document.walls[0], id: "wall-south-a", end: { x: 2, z: 0 } },
    { ...document.walls[0], id: "wall-south-b", start: { x: 2, z: 0 }, end: { x: 4, z: 0 } },
    ...document.walls.slice(1),
  ];
  document.rooms[0].boundary[0] = { wallId: "wall-south-a", direction: 1 };
  document.rooms[0].boundary.splice(1, 0, { wallId: "wall-south-b", direction: 1 });
  document.openings[0] = { ...document.openings[0], wallId: "wall-south-a", offset: 1.5, width: 2 };

  const segment = openingSegment(document, document.openings[0]);
  assert.deepEqual(segment.start, { x: 1.5, z: 0 });
  assert.deepEqual(segment.end, { x: 3.5, z: 0 });
});

test("adds five centimetres to the 90 degree door sweep", () => {
  const document = squareRoomDocument();
  const sweep = doorSweepPolygon(document, "door-main");
  const hinge = { x: 1, z: 0 };
  const farthest = Math.max(...sweep.map((point) => Math.hypot(point.x - hinge.x, point.z - hinge.z)));

  assert.ok(Math.abs(farthest - 0.85) < 0.001);
  assert.ok(sweep.some((point) => point.z > 0.8));
});

test("leaves a wall return between the opened bath door and the east hall wall", () => {
  const opening = DEFAULT_APARTMENT_DOCUMENT.openings.find((candidate) => candidate.id === "hall-bath-door");
  const pose = doorPose(DEFAULT_APARTMENT_DOCUMENT, "hall-bath-door");

  assert.ok(opening);
  assert.equal(opening.swingDegrees, 90);
  assert.ok(Math.abs(opening.width - 0.85) < 0.002, "the door opening should be 85 cm wide");
  assert.deepEqual(pose.hinge, { x: -0.28, z: 8.2 });
  assert.ok(Math.abs(pose.openEnd.z - 7.35) < 0.002);
});

test("keeps a 24 centimetre wall return on the non-intercom side of the apartment entrance", () => {
  const opening = DEFAULT_APARTMENT_DOCUMENT.openings.find((candidate) => candidate.id === "apartment-entry-door");
  const pose = doorPose(DEFAULT_APARTMENT_DOCUMENT, "apartment-entry-door");

  assert.ok(opening);
  assert.equal(opening.swingDegrees, 90);
  assert.ok(Math.abs(opening.width - 1.11) < 0.002, "the entrance opening should be 111 cm wide");
  assert.deepEqual(pose.hinge, { x: -2.42, z: 6.11 });
  assert.deepEqual(pose.closedEnd, { x: -2.42, z: 7.22 });
  assert.ok(Math.abs(pose.openEnd.x - -1.31) < 0.002);
});

test("uses explicit hinges and swing directions for every apartment door", () => {
  const expected = {
    "zimmer1-door": { hinge: { x: 3.3, z: 3.97 }, openEnd: { x: 3.3, z: 3.17 } },
    "hall-living-door": { hinge: { x: -0.16, z: 6.125 }, openEnd: { x: -1.01, z: 6.125 } },
    "apartment-entry-door": { hinge: { x: -2.42, z: 6.11 }, openEnd: { x: -1.31, z: 6.11 } },
    "hall-bath-door": { hinge: { x: -0.28, z: 8.2 }, openEnd: { x: -0.28, z: 7.35 } },
    "hall-wc-door": { hinge: { x: -1.54, z: 5.87 }, openEnd: { x: -1.54, z: 6.67 } },
    "hall-store-door": { hinge: { x: -1.06, z: 5.87 }, openEnd: { x: -1.06, z: 6.67 } },
    "living-zimmer2-door": { hinge: { x: 3.58, z: 8.95 }, openEnd: { x: 3.58, z: 9.75 } },
    "living-loggia-door": { hinge: { x: 4.557959, z: 8.892847 }, openEnd: { x: 4.511326, z: 8.094908 } },
  } as const;

  for (const [openingId, value] of Object.entries(expected)) {
    const pose = doorPose(DEFAULT_APARTMENT_DOCUMENT, openingId);
    assert.deepEqual(pose.hinge, value.hinge, `${openingId} hinge`);
    assert.ok(Math.abs(pose.openEnd.x - value.openEnd.x) < 0.002, `${openingId} open x`);
    assert.ok(Math.abs(pose.openEnd.z - value.openEnd.z) < 0.002, `${openingId} open z`);
  }
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

test("spatial collision index matches the linear check for 1000+ placements", () => {
  const document = squareRoomDocument();
  document.builtIns = [];
  document.openings = [];
  document.doorStates = {};
  document.placements = Array.from({ length: 1024 }, (_, index) => {
    const column = index % 32;
    const row = Math.floor(index / 32);
    return {
      id: `grid-${index}`,
      roomId: "room-square",
      catalogId: "test-grid",
      position: { x: 0.2 + column * 0.11, z: 0.2 + row * 0.11 },
      rotation: index % 2 === 0 ? 0 : 17,
      size: { width: 0.06, depth: 0.06, height: 0.3 },
    } satisfies PlannerPlacement;
  });
  const candidate = placement({ x: 0.2 + 17 * 0.11, z: 0.2 + 8 * 0.11 }, 0.08, 0.08, 11);

  assert.deepEqual(inspectPlacement(document, candidate), inspectPlacementLinear(document, candidate));
});

test("does not treat every thin object as a floor covering", () => {
  const document = squareRoomDocument();
  document.placements = [{
    id: "thin-tabletop",
    roomId: "room-square",
    catalogId: "tabletop",
    position: { x: 3, z: 3 },
    rotation: 0,
    size: { width: 0.8, depth: 0.8, height: 0.06 },
  }];
  const report = inspectPlacement(document, placement({ x: 3, z: 3 }, 0.4, 0.4));
  assert.ok(report.hard.some((hit) => hit.kind === "placement" && hit.entityId === "thin-tabletop"));

  document.placements[0] = { ...document.placements[0], floorCovering: true };
  const rugReport = inspectPlacement(document, placement({ x: 3, z: 3 }, 0.4, 0.4));
  assert.ok(!rugReport.hard.some((hit) => hit.entityId === "thin-tabletop"));
});

test("treats the kitchen floor finish as a surface instead of a furniture collision", () => {
  const report = inspectPlacement(
    DEFAULT_APARTMENT_DOCUMENT,
    placement({ x: 2.68, z: 3.72 }, 0.08, 0.08, 0, "wohnkueche"),
  );
  assert.ok(!report.hard.some((hit) => hit.entityId === "builtin-kitchen-tile-north"));
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
      swingDirection: 1,
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

function roomOutline(id: string, outline: Array<{ x: number; z: number }>) {
  return {
    id,
    name: id,
    area: 10,
    includedInWnf: true,
    surfaces: { floor: "oak", walls: "white", ceiling: "white" },
    outline,
  };
}

function concaveRoomDocument(): PlannerDocumentV3 {
  const graph = buildWallGraph([roomOutline("concave", [
    { x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 },
    { x: 2.5, z: 4 }, { x: 2.5, z: 1.5 }, { x: 1.5, z: 1.5 },
    { x: 1.5, z: 4 }, { x: 0, z: 4 },
  ])]);
  return { ...squareRoomDocument(), walls: graph.walls, rooms: graph.rooms, openings: [], builtIns: [], fixtures: [], doorStates: {}, viewPreferences: { ...squareRoomDocument().viewPreferences, activeRoomId: "concave" } };
}

function adjacentRoomsDocument(): PlannerDocumentV3 {
  const graph = buildWallGraph([
    roomOutline("left", [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 4 }, { x: 0, z: 4 }]),
    roomOutline("right", [{ x: 2, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 4 }, { x: 2, z: 4 }]),
  ]);
  const shared = graph.walls.find((wall) => wall.roomIds.length === 2)!;
  return {
    ...squareRoomDocument(),
    walls: graph.walls,
    rooms: graph.rooms,
    openings: [{ id: "shared-door", label: "Shared", wallId: shared.id, offset: 1.6, width: 0.8, height: 2.05, sill: 0, kind: "door", hinge: "start", swingDirection: 1, swingDegrees: 90 }],
    builtIns: [], fixtures: [], doorStates: { "shared-door": "closed" },
    viewPreferences: { ...squareRoomDocument().viewPreferences, activeRoomId: "right" },
  };
}
