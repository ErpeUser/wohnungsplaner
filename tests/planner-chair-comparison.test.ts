import assert from "node:assert/strict";
import test from "node:test";

import { CHAIR_MODELS } from "../app/planner/chairs/chair-models.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";

test("führt alle vier Stuhlmodelle als atomare Vierergruppe durch den Tisch", () => {
  for (const model of CHAIR_MODELS) {
    const result = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, { type: "setDiningChairModel", modelId: model.id });
    assert.equal(result.error, undefined, model.id);
    assert.equal(result.document.placements.filter((item) => item.groupId === "living-dining-group" && item.id.includes("kaleo-chair")).length, 4);
    for (const id of ["living-kaleo-chair-west", "living-kaleo-chair-east", "living-kaleo-chair-south", "living-kaleo-chair-north"]) {
      const placement = result.document.placements.find((item) => item.id === id)!;
      assert.equal(placement.catalogId, model.catalogId);
      assert.equal(placement.metadata?.source, model.sourceLabel);
      assert.equal(placement.materialVariants?.main, model.materialId);
    }
    assert.equal(result.warnings.length, 0, model.id);
  }
});

test("hält die vier Stuhloptionen im Katalog und markiert verifizierte Amber-Maße", () => {
  for (const model of CHAIR_MODELS) assert.ok(getFurnitureCatalogItem(model.catalogId), model.catalogId);
  const amber = getFurnitureCatalogItem("chair-amber-chenille-beige")!;
  assert.equal(amber.defaultSize.width, 0.56);
  assert.match(amber.realism?.dimensions ?? "", /56 × 61 × 90 cm/);
  assert.equal(amber.realism?.confidence, "verified");
});

test("weist ein unbekanntes Stuhlmodell ohne Teiländerung zurück", () => {
  const result = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, { type: "setDiningChairModel", modelId: "unknown-chair" });
  assert.equal(result.error?.code, "invalid");
  assert.equal(result.document, DEFAULT_APARTMENT_DOCUMENT);
});
