import assert from "node:assert/strict";
import test from "node:test";

import { parsePlannerDocument } from "../app/planner/domain/schema.ts";

const validDocument = {
  schemaVersion: 3,
  id: "document-sample",
  name: "Wohnung",
  updatedAt: "2026-10-24T08:00:00.000Z",
  walls: [
    { id: "wall-north", start: { x: 0, z: 0 }, end: { x: 4, z: 0 }, thickness: 0.12, height: 2.6, roomIds: ["room-living"] },
    { id: "wall-east", start: { x: 4, z: 0 }, end: { x: 4, z: 3 }, thickness: 0.12, height: 2.6, roomIds: ["room-living"] },
    { id: "wall-south", start: { x: 4, z: 3 }, end: { x: 0, z: 3 }, thickness: 0.12, height: 2.6, roomIds: ["room-living"] },
    { id: "wall-west", start: { x: 0, z: 3 }, end: { x: 0, z: 0 }, thickness: 0.12, height: 2.6, roomIds: ["room-living"] },
  ],
  rooms: [
    {
      id: "room-living",
      name: "Wohnzimmer",
      boundary: [
        { wallId: "wall-north", direction: 1 },
        { wallId: "wall-east", direction: 1 },
        { wallId: "wall-south", direction: 1 },
        { wallId: "wall-west", direction: 1 },
      ],
      surfaces: { floor: "oak", walls: "warm-white", ceiling: "white" },
    },
  ],
  openings: [
    {
      id: "opening-door",
      wallId: "wall-north",
      offset: 0.7,
      width: 0.9,
      height: 2.05,
      sill: 0,
      kind: "door",
      hinge: "start",
      swingDegrees: 90,
    },
  ],
  builtIns: [],
  fixtures: [],
  placements: [
    {
      id: "placement-sofa",
      roomId: "room-living",
      catalogId: "sofa-compact",
      position: { x: 2, z: 2.2 },
      rotation: 0,
      size: { width: 1.8, depth: 0.85, height: 0.82 },
    },
  ],
  doorStates: { "opening-door": "closed" },
  viewPreferences: {
    activeRoomId: "room-living",
    overlays: { dimensions: false, fixtures: false, evidence: false },
  },
};

test("accepts a closed wall graph with one room and placement", () => {
  assert.equal(parsePlannerDocument(validDocument).schemaVersion, 3);
});

test("rejects openings outside their referenced wall", () => {
  const invalidOpening = structuredClone(validDocument);
  invalidOpening.openings[0].offset = 3.5;
  invalidOpening.openings[0].width = 0.9;

  assert.throws(
    () => parsePlannerDocument(invalidOpening),
    /opening.*wall/i,
  );
});

test("rejects duplicate ids", () => {
  const invalidIds = structuredClone(validDocument);
  invalidIds.placements[0].id = "wall-north";

  assert.throws(() => parsePlannerDocument(invalidIds), /duplicate/i);
});

test("rejects non-finite coordinates", () => {
  const invalidCoordinate = structuredClone(validDocument);
  invalidCoordinate.walls[0].start.x = Number.POSITIVE_INFINITY;

  assert.throws(() => parsePlannerDocument(invalidCoordinate), /finite/i);
});

test("rejects room boundaries that do not form a closed wall loop", () => {
  const invalidLoop = structuredClone(validDocument);
  invalidLoop.rooms[0].boundary[1].direction = -1;

  assert.throws(() => parsePlannerDocument(invalidLoop), /closed.*loop/i);
});
