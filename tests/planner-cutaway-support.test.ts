import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import type { PlannerDocumentV3 } from "../app/planner/domain/types.ts";
import { createSceneModel, derivePerspectiveCutaway } from "../app/planner/scene-3d/scene-model.ts";

const wardrobeId = "zimmer1-wardrobe";
const boxesId = "builtin-z1-wardrobe-top-decor";

function bedroom(document: PlannerDocumentV3 = DEFAULT_APARTMENT_DOCUMENT) {
  const scene = createSceneModel(document, "zimmer1");
  return {
    scene,
    fromSouth: { x: scene.center[0], z: scene.center[2] + 6 },
    fromNorth: { x: scene.center[0], z: scene.center[2] - 6 },
  };
}

test("cuts away the wardrobe-top boxes with their support and restores both from the opposite side", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const before = structuredClone(document);
  const { scene, fromSouth, fromNorth } = bedroom(document);
  const south = derivePerspectiveCutaway(scene, fromSouth);
  const north = derivePerspectiveCutaway(scene, fromNorth);

  assert.ok(south.hiddenObjectIds.includes(wardrobeId));
  assert.ok(south.hiddenObjectIds.includes(boxesId), "the boxes must not float above a hidden wardrobe");
  assert.ok(!north.hiddenObjectIds.includes(wardrobeId));
  assert.ok(!north.hiddenObjectIds.includes(boxesId));
  assert.deepEqual(document, before, "cutaway must not modify stored measurements, placement or metadata");
});

test("keeps the supported assembly visible when either the wardrobe or its boxes are selected", () => {
  const { scene, fromSouth } = bedroom();
  for (const selectedId of [wardrobeId, boxesId]) {
    const cutaway = derivePerspectiveCutaway(scene, fromSouth, selectedId);
    assert.ok(!cutaway.hiddenObjectIds.includes(wardrobeId), `support remains visible for ${selectedId}`);
    assert.ok(!cutaway.hiddenObjectIds.includes(boxesId), `boxes remain visible for ${selectedId}`);
  }
});

test("does not retain the support dependency after the wardrobe moves away from the boxes", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const wardrobe = document.placements.find((item) => item.id === wardrobeId)!;
  wardrobe.position.x += 0.75;
  const { scene, fromSouth } = bedroom(document);
  const cutaway = derivePerspectiveCutaway(scene, fromSouth);

  assert.ok(cutaway.hiddenObjectIds.includes(wardrobeId));
  assert.ok(!cutaway.hiddenObjectIds.includes(boxesId));
});

test("does not attach elevated boxes to a lower wardrobe across a vertical gap", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  document.placements.find((item) => item.id === wardrobeId)!.size.height = 2;
  const { scene, fromSouth } = bedroom(document);
  const cutaway = derivePerspectiveCutaway(scene, fromSouth);

  assert.ok(cutaway.hiddenObjectIds.includes(wardrobeId));
  assert.ok(!cutaway.hiddenObjectIds.includes(boxesId));
});

test("does not hide the boxes by a stale wardrobe identifier after the support is removed", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  document.placements = document.placements.filter((item) => item.id !== wardrobeId);
  const { scene, fromSouth } = bedroom(document);

  assert.ok(!derivePerspectiveCutaway(scene, fromSouth).hiddenObjectIds.includes(boxesId));
});

test("uses the rotated support footprint instead of the unrotated width and depth", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  document.placements.find((item) => item.id === wardrobeId)!.rotation = 90;
  const { scene, fromSouth } = bedroom(document);
  const cutaway = derivePerspectiveCutaway(scene, fromSouth);

  assert.ok(cutaway.hiddenObjectIds.includes(wardrobeId));
  assert.ok(!cutaway.hiddenObjectIds.includes(boxesId));
});

test("keeps the support dependency when both footprints rotate together", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const wardrobe = document.placements.find((item) => item.id === wardrobeId)!;
  const boxes = document.builtIns.find((item) => item.id === boxesId)!;
  wardrobe.rotation = 90;
  boxes.rotation = 90;
  boxes.position = { ...wardrobe.position };
  const { scene, fromSouth } = bedroom(document);
  const cutaway = derivePerspectiveCutaway(scene, fromSouth);

  assert.ok(cutaway.hiddenObjectIds.includes(wardrobeId));
  assert.ok(cutaway.hiddenObjectIds.includes(boxesId));
});

test("does not infer attachments for unrelated elevated decoration", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  document.builtIns.find((item) => item.id === boxesId)!.catalogId = "unrelated-wall-decoration";
  const { scene, fromSouth } = bedroom(document);
  const cutaway = derivePerspectiveCutaway(scene, fromSouth);

  assert.ok(cutaway.hiddenObjectIds.includes(wardrobeId));
  assert.ok(!cutaway.hiddenObjectIds.includes(boxesId));
});
