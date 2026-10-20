import assert from "node:assert/strict";
import test from "node:test";
import {
  EVIDENCE_FURNITURE_APPEARANCE,
  ROOM_DEFINITIONS,
  ROOM_FIXTURES,
  ZIMMER1_ANNOTATED_MEASURES,
  ZIMMER1_DECORATED_PRESET,
  ZIMMER1_DESIGN_PRESET,
  ZIMMER1_PC_AND_WARDROBE_PRESET,
  formatCentimeters,
  openingLength,
  removeZimmer1BedAndDecor,
  roomCornerCameraViews,
} from "../app/room-model.ts";

test("architectural shell matches the confirmed hand dimensions", () => {
  const room = ROOM_DEFINITIONS.zimmer1;
  const window = room.openings.find((opening) => opening.kind === "window");
  const door = room.openings.find((opening) => opening.kind === "door");
  assert.equal(room.width, 3.56);
  assert.equal(room.height, 3.97);
  assert.ok(window && door);
  assert.equal(formatCentimeters(openingLength(window)), "131 cm");
  assert.equal(formatCentimeters(openingLength(door)), "80 cm");
  assert.deepEqual(door.swing, { hinge: "end", openX: 3.5, openY: 3.17, sweep: 1 });
});

test("desk is restored parallel to the east/window wall", () => {
  const desk = ZIMMER1_PC_AND_WARDROBE_PRESET.find((item) => item.key === "desk");
  assert.ok(desk);
  assert.deepEqual(
    { w: desk.w, d: desk.d, h: desk.h, x: desk.x, y: desk.y, rotation: desk.rotation },
    { w: 1.29, d: 0.55, h: 0.75, x: 3.285, y: 0.645, rotation: 90 },
  );
  assert.equal(Math.round((desk.x - desk.d / 2) * 100), 301);
  assert.equal(Math.round((desk.x + desk.d / 2) * 100), 356);
  assert.equal(Math.round((desk.y - desk.w / 2) * 100), 0);
  assert.equal(Math.round((desk.y + desk.w / 2) * 100), 129);
});

test("wardrobe preserves 225 x 62 cm, closed fronts and the 25 cm entrance gap", () => {
  const wardrobe = ZIMMER1_PC_AND_WARDROBE_PRESET.find((item) => item.key === "wardrobe");
  assert.ok(wardrobe);
  assert.deepEqual({ w: wardrobe.w, d: wardrobe.d, x: wardrobe.x, y: wardrobe.y }, { w: 2.25, d: 0.62, x: 1.125, y: 3.02 });
  assert.equal(Math.round((2.5 - (wardrobe.x + wardrobe.w / 2)) * 100), 25);
  assert.equal(EVIDENCE_FURNITURE_APPEARANCE.wardrobe.doorsClosed, true);
  assert.deepEqual(EVIDENCE_FURNITURE_APPEARANCE.wardrobe.panels, ["white", "white", "mirror", "white", "white"]);
});

test("BERO distinguishes sleeping surface from verified exterior footprint", () => {
  const bed = ZIMMER1_DESIGN_PRESET.find((item) => item.key === "bed120");
  assert.ok(bed);
  assert.deepEqual(
    { w: bed.w, d: bed.d, h: bed.h, x: bed.x, y: bed.y, rotation: bed.rotation },
    { w: 1.42, d: 2.2, h: 1.3, x: 1.1, y: 0.71, rotation: 270 },
  );
  assert.match(bed.evidence, /Liegefläche 120 × 200 cm/);
  assert.match(bed.evidence, /Außenmaß 142 × 220 × 130 cm/);
});

test("decorated preset contains only verified selected product groups", () => {
  assert.equal(ZIMMER1_DECORATED_PRESET.length, 10);
  assert.equal(ZIMMER1_DECORATED_PRESET.filter((item) => item.productId === "action-holzpaneele").length, 4);
  assert.deepEqual(
    [...new Set(ZIMMER1_DECORATED_PRESET.map((item) => item.productId))],
    [
      "action-holzpaneele",
      "action-led-wandlampe",
      "moebelix-geometry",
      "moebelix-abstraction",
      "moebelix-41-807",
      "moebelix-miscanthus",
      "action-wanduhr",
    ],
  );
  assert.ok(ZIMMER1_DECORATED_PRESET.every((item) => item.evidenceStatus === "belegt"));
  assert.equal(ZIMMER1_DECORATED_PRESET.some((item) => ["curtain", "wallShelf", "nightstand", "rug"].includes(item.key)), false);
});

test("headboard panels form a 120 x 60 cm lightweight field", () => {
  const panels = ZIMMER1_DECORATED_PRESET.filter((item) => item.productId === "action-holzpaneele");
  assert.deepEqual(panels.map((item) => item.y), [0.26, 0.56, 0.86, 1.16]);
  assert.ok(panels.every((item) => item.w === 0.3 && item.h === 0.6 && item.d === 0.01));
  assert.ok(panels.every((item) => item.mountHeight === 1.45 && item.wall?.includes("hinter dem Kopfteil")));
});

test("east-wall decor clears the window and door swing zone", () => {
  const plant = ZIMMER1_DECORATED_PRESET.find((item) => item.productId === "moebelix-miscanthus");
  const clock = ZIMMER1_DECORATED_PRESET.find((item) => item.productId === "action-wanduhr");
  assert.ok(plant && clock);
  assert.equal(Math.round((plant.y - plant.d / 2) * 100), 265);
  assert.equal(Math.round((plant.y + plant.d / 2) * 100), 285);
  assert.ok(plant.y - plant.d / 2 >= 2.6, "plant begins after the window");
  assert.ok(plant.y + plant.d / 2 <= 3.17, "plant ends before the open door zone");
  assert.equal(clock.mountHeight, 1.58);
});

test("four print views are wall-specific and share the same room model", () => {
  const views = roomCornerCameraViews(ROOM_DEFINITIONS.zimmer1);
  assert.deepEqual(views.map((view) => view.title), ["Fensterwand", "Obere Wand", "Schrank / Eingang", "Linke Wand"]);
  assert.deepEqual(views.map((view) => view.walls[0]), ["east", "north", "south", "west"]);
  assert.equal(views.length, 4);
});

test("fixtures include switch, blind control, vent and outlets without invented certainty", () => {
  const fixtures = ROOM_FIXTURES.zimmer1;
  assert.ok(fixtures.some((item) => item.id === "entrance-switch" && item.x === 3.53));
  assert.ok(fixtures.some((item) => item.id === "blind-control"));
  assert.ok(fixtures.some((item) => item.id === "vent-cover"));
  assert.ok(fixtures.some((item) => item.kind === "outlet"));
});

test("reset helper removes bed and every decor variant while preserving ground equipment", () => {
  const remaining = removeZimmer1BedAndDecor([
    { id: "zimmer1-evidence-desk", type: "desk", fixed: true },
    { id: "zimmer1-evidence-wardrobe", type: "wardrobe", fixed: true },
    { id: "zimmer1-base-wallMirror", type: "wallMirror", fixed: true },
    { id: "zimmer1-decor-bed120", type: "bed120", fixed: true },
    { id: "zimmer1-decor-action-holzpaneele-1", type: "wallPanel", fixed: true },
  ]);
  assert.deepEqual(remaining.map((item) => item.id), ["zimmer1-evidence-desk", "zimmer1-evidence-wardrobe", "zimmer1-base-wallMirror"]);
});

test("published clearance measures agree with corrected geometry", () => {
  assert.deepEqual(ZIMMER1_ANNOTATED_MEASURES.map((item) => item.value), [
    "356 × 397 cm",
    "142 × 220 cm",
    "129 × 55 cm",
    "110 × 70 cm",
    "81 cm",
    "84 cm",
    "25 cm",
  ]);
});
