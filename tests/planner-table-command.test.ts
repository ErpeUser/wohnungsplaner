import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";

const tableId = "living-bozan-table";
const baseTable = DEFAULT_APARTMENT_DOCUMENT.placements.find((placement) => placement.id === tableId)!;

test("wechselt den Esstisch atomar und bewahrt Gruppe, Position und Drehung", () => {
  assert.ok(getFurnitureCatalogItem("dining-table-kaufland-567080013-120-160"));
  const result = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "setPlacementProduct",
    placementId: tableId,
    catalogId: "dining-table-kaufland-567080013-120-160",
    size: { width: 1.6, depth: 0.8, height: 0.755 },
    materialId: "walnut",
    metadata: {
      source: "Kaufland.at Produkt 567080013",
      confidence: "confirmed",
      notes: ["160 × 80 × 75,5 cm"],
    },
  });

  assert.equal(result.error, undefined);
  const updated = result.document.placements.find((placement) => placement.id === tableId)!;
  assert.equal(updated.catalogId, "dining-table-kaufland-567080013-120-160");
  assert.deepEqual(updated.size, { width: 1.6, depth: 0.8, height: 0.755 });
  assert.equal(updated.materialVariants?.main, "walnut");
  assert.equal(updated.groupId, baseTable.groupId);
  assert.deepEqual(updated.position, baseTable.position);
  assert.equal(updated.rotation, baseTable.rotation);
  assert.match(updated.metadata?.source ?? "", /Vente-Unique Art\. 5034153/);
});

test("weist unbekannte Produkte und harte Geometrien zurück ohne Teiländerung", () => {
  const unknown = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "setPlacementProduct",
    placementId: tableId,
    catalogId: "dining-table-does-not-exist",
    size: { width: 1, depth: 1, height: 0.75 },
  } as never);
  assert.equal(unknown.error?.code, "invalid");
  assert.equal(unknown.document, DEFAULT_APARTMENT_DOCUMENT);

  const invalidSize = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "setPlacementProduct",
    placementId: tableId,
    catalogId: "dining-table-kaufland-567080013-120-160",
    size: { width: 4, depth: 4, height: 0.755 },
    materialId: "walnut",
  });
  assert.equal(invalidSize.error?.code, "invalid");
  assert.equal(invalidSize.document, DEFAULT_APARTMENT_DOCUMENT);
});

test("restricts product switching to the dining table and derives truthful source metadata", () => {
  const chair = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-kaleo-chair-west")!;
  const rejected = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "setPlacementProduct",
    placementId: chair.id,
    catalogId: "dining-table-kaufland-567080013-120-160",
    size: { width: 1.6, depth: 0.8, height: 0.755 },
    materialId: "walnut",
  });
  assert.equal(rejected.error?.code, "invalid");
  const updated = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "setPlacementProduct",
    placementId: tableId,
    catalogId: "dining-table-kaufland-567080013-120-160",
    size: { width: 1.6, depth: 0.8, height: 0.755 },
    materialId: "walnut",
  });
  assert.equal(updated.error, undefined);
  assert.match(updated.document.placements.find((item) => item.id === tableId)?.metadata?.source ?? "", /Kaufland/);
});

test("lehnt Produktwechsel für eingebaute Elemente ab", () => {
  const result = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "setPlacementProduct",
    placementId: "builtin-living-tv",
    catalogId: "dining-table-kaufland-567080013-120-160",
    size: { width: 1.6, depth: 0.8, height: 0.755 },
  });
  assert.equal(result.error?.code, "locked");
});

test("verschiebt einen Esszimmerstuhl einzeln ohne Tischgruppe oder Tischkollision", () => {
  const chair = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-kaleo-chair-west")!;
  const table = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === tableId)!;
  const otherChair = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-kaleo-chair-east")!;
  const result = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "movePlacement",
    placementId: chair.id,
    position: table.position,
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.document.placements.find((item) => item.id === chair.id)?.position, table.position);
  assert.deepEqual(result.document.placements.find((item) => item.id === tableId)?.position, table.position);
  assert.deepEqual(result.document.placements.find((item) => item.id === otherChair.id)?.position, otherChair.position);
});
