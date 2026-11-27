import assert from "node:assert/strict";
import test from "node:test";
import { FURNITURE_CATALOG } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { refineRoomLayout } from "../app/planner/domain/room-refinement.ts";
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

test("review fixed models use the same refined kitchen and bathroom geometry and evidence as the apartment", () => {
  const apartment = refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT);
  for (const fixture of [
    { reviewId: "builtin:kitchen-base", builtInId: "builtin-kitchen-base-north", size: { width: 0.616, depth: 0.603, height: 0.87 } },
    { reviewId: "builtin:bath-towel-hooks-wood-black", builtInId: "builtin-bath-towel-hook-rail", size: { width: 0.72, depth: 0.09, height: 0.12 } },
  ]) {
    const review = createReviewScene(fixture.reviewId);
    const actual = apartment.builtIns.find((item) => item.id === fixture.builtInId)!;
    assert.deepEqual(review.size, fixture.size, fixture.builtInId);
    assert.deepEqual(review.scene.builtIns[0].source.size, actual.size);
    assert.deepEqual(review.scene.builtIns[0].source.metadata, actual.metadata);
    assert.equal(review.model.name, actual.label);
  }
});

test("review includes the two current hall decor groups and excludes the retired combined model", () => {
  assert.ok(REVIEW_MODELS.some((model) => model.builtIn?.id === "builtin-hall-tejo-art-plates"));
  assert.ok(REVIEW_MODELS.some((model) => model.builtIn?.id === "builtin-hall-between-door-decor"));
  assert.equal(REVIEW_MODELS.some((model) => model.builtIn?.id === "builtin-hall-wall-decor"), false);
});

test("model review retains archived decor and contains all ten selected woven basket models",()=>{
  assert.equal(REVIEW_MODELS.filter(model=>model.builtIn?.catalogId?.startsWith("hall-woven-basket-")).length,10);
});
