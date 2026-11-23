import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { parsePlannerDocument } from "../app/planner/domain/schema.ts";
import { getWcClearOutline, restoreWcMeasuredLayout } from "../app/planner/domain/wc-layout.ts";
import { createPlanScene } from "../app/planner/plan-2d/plan-scene.ts";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

test("measures WC at the finished faces and keeps the 80 cm entrance open in 3D", () => {
  const plan = DEFAULT_APARTMENT_DOCUMENT;
  const [northwest, northeast, southeast] = getWcClearOutline(plan)!;
  assert.ok(Math.abs(northeast.x - northwest.x - 0.98) < 1e-8);
  assert.ok(Math.abs(southeast.z - northeast.z - 1.42) < 1e-8);
  const surface = createPlanScene(plan, { activeRoomId: "wc", overlays: plan.viewPreferences.overlays });
  assert.deepEqual(surface.dimensions.map((dimension) => dimension.label), ["98 cm", "142 cm", "98 cm", "142 cm"]);

  const room = createSceneModel(plan, "wc");
  const door = room.doors.find((item) => item.id === "hall-wc-door")!;
  assert.equal(door.width, 0.8);
  const rear = room.walls.find((wall) => wall.id === "wall-wc-1-1")!;
  const shared = room.walls.find((wall) => wall.id === "wall-abstellraum-4-2")!;
  assert.ok(Math.abs(rear.start.z + rear.thickness / 2 - northeast.z) < 1e-8);
  assert.ok(Math.abs(shared.start.x - shared.thickness / 2 - northeast.x) < 1e-8);
  assert.deepEqual(plan.walls.find((wall) => wall.id === shared.id)?.roomIds, ["abstellraum", "wc"]);
  assert.ok(room.walls.find((wall) => wall.id === "wall-wc-3-1")?.openingIds.includes(door.id));
});

test("upgrades the old WC layout without replacing unrelated walls, user furniture or open-door states", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const oldSide = "wall-wc-2-1";
  const partition = "wall-abstellraum-4-1";
  const west = { x: -2.42, z: 4.1 };
  const east = { x: -1.52, z: 4.1 };
  const oldRear = old.walls.find((wall) => wall.id === "wall-wc-1-1")!;
  const oldFront = old.walls.find((wall) => wall.id === "wall-wc-3-1")!;
  const oldWest = old.walls.find((wall) => wall.id === "wall-wc-4-1")!;
  oldRear.start = west;
  oldRear.end = east;
  oldFront.start.x = east.x;
  oldWest.end = west;
  old.walls.find((wall) => wall.id === partition)!.end = { x: -1.33, z: 4.1 };
  const addedSegments = new Set(["wall-abstellraum-4-2", "wall-abstellraum-4-3"]);
  old.walls = old.walls.filter((wall) => !addedSegments.has(wall.id));
  old.walls.push({ ...oldRear, id: oldSide, start: east, end: { x: east.x, z: 5.68 } });
  const wc = old.rooms.find((room) => room.id === "wc")!;
  const storage = old.rooms.find((room) => room.id === "abstellraum")!;
  wc.boundary[1] = { wallId: oldSide, direction: 1 };
  storage.boundary = storage.boundary.filter((reference) => !addedSegments.has(reference.wallId));
  const custom = old.placements[0];
  custom.materialVariants = { main: "Mein Material" };
  old.doorStates["hall-wc-door"] = "open";

  const upgraded = restoreWcMeasuredLayout(parsePlannerDocument(old));
  assert.deepEqual(getWcClearOutline(upgraded), getWcClearOutline(DEFAULT_APARTMENT_DOCUMENT));
  assert.deepEqual(upgraded.placements.find((item) => item.id === custom.id), custom);
  assert.equal(upgraded.doorStates["hall-wc-door"], "open");
  assert.equal(upgraded.rooms.find((room) => room.id === "wc")?.area, 1.42);
  assert.equal(restoreWcMeasuredLayout(upgraded), upgraded);
});
