import assert from "node:assert/strict";
import test from "node:test";

import { CHAIR_MODELS, chairSeatLayout } from "../app/planner/chairs/chair-models.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";

test("führt alle registrierten Stuhlmodelle als atomare Vierergruppe durch den Tisch", () => {
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

test("dreht Sitzpositionen und Stuhlrotation mit dem Tisch", () => {
  const model = CHAIR_MODELS.find((item) => item.id === "chair-kaleo-chenille-beige")!;
  const table = {
    ...DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table")!,
    rotation: 90,
  };
  const seats = chairSeatLayout(table, model);
  assert.equal(seats.find((seat) => seat.id === "living-kaleo-chair-west")?.rotation, 90);
  assert.equal(seats.find((seat) => seat.id === "living-kaleo-chair-east")?.rotation, 180);
  assert.deepEqual(
    seats.find((seat) => seat.id === "living-kaleo-chair-west")?.position,
    { x: table.position.x + (table.size.depth / 2 + model.sizeCm.depth / 200 + 0.04), z: table.position.z },
  );
});

test("hält die registrierten Stuhloptionen im Katalog und markiert verifizierte Amber-Maße", () => {
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
