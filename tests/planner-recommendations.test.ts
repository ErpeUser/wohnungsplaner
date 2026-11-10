import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { recommendDecor } from "../app/planner/recommendations/decor-recommendation.ts";
import { roomContainsPlacement } from "../app/planner/domain/geometry.ts";

test("builds measurable decoration placeholders from the room palette", () => {
  const analysis = recommendDecor(DEFAULT_APARTMENT_DOCUMENT, "zimmer2");

  assert.equal(analysis.roomName, "Zimmer 2");
  assert.ok(analysis.palette.length >= 2);
  assert.ok(analysis.recommendations.length > 0);
  for (const recommendation of analysis.recommendations) {
    assert.equal(recommendation.status, "placeholder");
    assert.match(recommendation.productSearchQuery, /cm|2700K|Zimmerpflanze|Teppich/i);
    assert.ok(roomContainsPlacement(DEFAULT_APARTMENT_DOCUMENT, "zimmer2", {
      position: recommendation.position,
      rotation: recommendation.rotation,
      size: recommendation.size,
    }));
  }
});

test("does not duplicate a rug or plant already present in the room", () => {
  const analysis = recommendDecor(DEFAULT_APARTMENT_DOCUMENT, "zimmer1");
  assert.equal(analysis.recommendations.some((item) => item.slot === "rug"), false);
  assert.equal(analysis.recommendations.some((item) => item.slot === "greenery"), false);
});
