import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { migrateStoredPlannerData } from "../app/planner/domain/migration.ts";
import { deriveRoomPolygon, deriveWallLength } from "../app/planner/domain/wall-graph.ts";

const expectedOpeningIds = [
  "zimmer1-window",
  "zimmer1-door",
  "hall-living-door",
  "apartment-entry-door",
  "hall-bath-door",
  "hall-wc-door",
  "hall-store-door",
  "living-zimmer2-door",
  "living-east-window",
  "living-feature-window",
  "living-loggia-door",
  "zimmer2-balcony-door",
  "loggia-balcony-open-transition",
];

test("publishes the confirmed nine-room apartment and 59.49 square metres", () => {
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.rooms.length, 9);
  assert.equal(
    Number(
      DEFAULT_APARTMENT_DOCUMENT.rooms
        .filter((room) => room.includedInWnf)
        .reduce((sum, room) => sum + room.area, 0)
        .toFixed(2),
    ),
    59.49,
  );

  const zimmer1 = deriveRoomPolygon(DEFAULT_APARTMENT_DOCUMENT, "zimmer1");
  assert.equal(Math.max(...zimmer1.map((point) => point.x)) - Math.min(...zimmer1.map((point) => point.x)), 3.56);
  assert.equal(Math.max(...zimmer1.map((point) => point.z)) - Math.min(...zimmer1.map((point) => point.z)), 3.97);
});

test("keeps every opening, diagonal facades, and one shared wall record", () => {
  assert.deepEqual(DEFAULT_APARTMENT_DOCUMENT.openings.map((opening) => opening.id), expectedOpeningIds);
  assert.ok(
    DEFAULT_APARTMENT_DOCUMENT.walls.filter(
      (wall) => Math.abs(wall.start.x - wall.end.x) > 0.01 && Math.abs(wall.start.z - wall.end.z) > 0.01,
    ).length >= 4,
  );
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.walls.every((wall) => deriveWallLength(wall) > 0));

  const sharedLivingWall = DEFAULT_APARTMENT_DOCUMENT.walls.find(
    (wall) => wall.roomIds.includes("wohnkueche") && wall.roomIds.includes("zimmer2"),
  );
  assert.ok(sharedLivingWall);
  assert.equal(
    DEFAULT_APARTMENT_DOCUMENT.walls.filter(
      (wall) => wall.roomIds.includes("wohnkueche") && wall.roomIds.includes("zimmer2"),
    ).length,
    1,
  );
});

test("stores the fixed kitchen and sanitary inventory separately from movable furniture", () => {
  const builtInKinds = new Set(DEFAULT_APARTMENT_DOCUMENT.builtIns.map((item) => item.kind));
  assert.deepEqual([...builtInKinds].sort(), ["kitchen", "sanitary"]);
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "kitchen-sink"));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => item.catalogId === "sanitary-bathtub"));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.builtIns.every((item) => item.locked));
  assert.ok(DEFAULT_APARTMENT_DOCUMENT.placements.every((item) => item.roomId === "zimmer1"));
});

test("migrates a raw v2 room record through an explicit furniture map", () => {
  const result = migrateStoredPlannerData(
    {
      zimmer1: [
        { id: "old-desk", type: "desk", x: 2.1, y: 0.4, w: 1.29, d: 0.55, h: 0.75, rotation: 0 },
      ],
      vorraum: [
        { id: "old-bench", type: "bench", x: 0.4, y: 1.1, w: 1, d: 0.38, h: 0.46, rotation: 90 },
      ],
    },
    DEFAULT_APARTMENT_DOCUMENT,
  );

  assert.equal(result.unmapped.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.document.placements.find((item) => item.id === "legacy-zimmer1-old-desk")?.catalogId, "desk-standard");
  assert.equal(result.document.placements.find((item) => item.id === "legacy-vorraum-old-bench")?.roomId, "vorraum");
  assert.match(result.legacyBackupJson ?? "", /old-desk/);
});

test("keeps base placements in rooms missing from a partial v2 record", () => {
  const result = migrateStoredPlannerData({ vorraum: [] }, DEFAULT_APARTMENT_DOCUMENT);

  assert.equal(
    result.document.placements.filter((item) => item.roomId === "zimmer1").length,
    DEFAULT_APARTMENT_DOCUMENT.placements.filter((item) => item.roomId === "zimmer1").length,
  );
});

test("reports unknown furniture and invalid numbers without silently dropping the backup", () => {
  const result = migrateStoredPlannerData(
    {
      zimmer1: [
        { id: "mystery", type: "teleporter", x: 1, y: 1, w: 1, d: 1, h: 1, rotation: 0 },
        { id: "broken", type: "chair", x: Number.NaN, y: 1, w: 0.5, d: 0.5, h: 0.8, rotation: 0 },
      ],
    },
    DEFAULT_APARTMENT_DOCUMENT,
  );

  assert.equal(result.unmapped.length, 2);
  assert.equal(result.warnings.length, 2);
  assert.match(result.legacyBackupJson ?? "", /mystery/);
  assert.match(result.legacyBackupJson ?? "", /__nonfinite:NaN/);
});

test("accepts an already valid V3 document without migration", () => {
  const result = migrateStoredPlannerData(DEFAULT_APARTMENT_DOCUMENT, DEFAULT_APARTMENT_DOCUMENT);

  assert.equal(result.document, DEFAULT_APARTMENT_DOCUMENT);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.unmapped, []);
  assert.equal(result.legacyBackupJson, null);
});
