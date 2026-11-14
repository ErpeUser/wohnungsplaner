import assert from "node:assert/strict";
import test from "node:test";
import { FURNITURE_CATALOG } from "../app/planner/catalog/catalog.ts";
import { REVIEW_MODELS, createReviewScene, reviewCameraPosition } from "../app/planner/review/review-models.ts";

test("model review covers every furniture catalog entry using its stable id", () => {
  for (const item of FURNITURE_CATALOG) assert.ok(REVIEW_MODELS.some((model) => model.id === item.id));
  assert.equal(new Set(REVIEW_MODELS.map((model) => model.id)).size, REVIEW_MODELS.length);
});

test("review isolates models without mutating apartment or catalog defaults", () => {
  const first = createReviewScene("chair-kaleo-chenille-beige");
  assert.equal(first.scene.placements.length, 1);
  assert.equal(first.scene.builtIns.length, 0);
  assert.deepEqual(first.scene.placements[0].position, [0, 0.435, 0]);
  first.scene.placements[0].source.size.width = 99;
  assert.equal(createReviewScene("chair-kaleo-chenille-beige").size.width, 0.63);
  assert.equal(first.scene.walls.length, 0);
});

test("review applies registered size and material variants and rejects unknown inputs", () => {
  const extended = createReviewScene("dining-table-aliexpress-100-140", undefined, "extended");
  assert.equal(extended.size.width, 1.4);
  assert.equal(extended.scene.placements[0].source.size.width, 1.4);
  assert.throws(() => createReviewScene("../../private"), /Unbekanntes Modell/);
  assert.throws(() => createReviewScene("chair-kaleo-chenille-beige", "unknown"), /Material/);
});

test("review camera frames every model with repeatable finite positions", () => {
  for (const model of REVIEW_MODELS) {
    const { size } = createReviewScene(model.id);
    for (const view of ["front", "side", "back", "perspective"] as const) {
      assert.ok(reviewCameraPosition(size, view).every(Number.isFinite));
    }
  }
});
