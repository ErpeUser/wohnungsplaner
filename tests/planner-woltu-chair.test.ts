import assert from "node:assert/strict";
import test from "node:test";

import { CHAIR_MODELS, getChairModelForCatalogId } from "../app/planner/chairs/chair-models.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { upgradeDiningChairsToWoltu } from "../app/planner/store/persistence.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { SHOPPING_ITEMS, shoppingSubtotal } from "../app/planner/workspace/shopping-items.ts";

const WOLTU = "chair-aliexpress-woltu-1005013095870024";
const SEATS = ["living-kaleo-chair-west", "living-kaleo-chair-east", "living-kaleo-chair-south", "living-kaleo-chair-north"];

test("WOLTU 2-pack is first-choice with clearly estimated geometry, not an invented manufacturer specification", () => {
  const product = getFurnitureCatalogItem(WOLTU)!;
  const model = getChairModelForCatalogId(WOLTU)!;
  assert.ok(product);
  assert.ok(model);
  assert.equal(model, CHAIR_MODELS[0]);
  assert.equal(product.sourceUrl, "https://de.aliexpress.com/item/1005013095870024.html");
  assert.equal(product.realism?.confidence, "estimated");
  assert.equal(model.sourceStatus, "estimated");
  assert.equal(product.renderMode, "parametric");
  assert.equal(model.swivel, true);
  assert.equal(model.baseStyle, "swivel-metal-legs");
  assert.equal(model.materialId, "fabric-woltu-chenille-cream");
  assert.deepEqual(product.defaultSize, { width: 0.58, depth: 0.6, height: 0.85 });
  assert.ok(model.sourceNotes.some((note) => /nicht zugänglich|unbestätigt/.test(note)));
  for (const former of ["chair-kaleo-chenille-beige", "chair-amber-chenille-beige", "chair-temu-swivel-upholstered", "chair-temu-faux-leather-metal", "chair-temu-velvet-swivel-arm"]) {
    assert.ok(CHAIR_MODELS.some((item) => item.catalogId === former), former + " retained as alternate");
    assert.ok(getFurnitureCatalogItem(former));
  }
});

test("every default dining seat uses the new chair but keeps its stable seat ID and dining group", () => {
  const chairs = DEFAULT_APARTMENT_DOCUMENT.placements.filter((item) => SEATS.includes(item.id));
  assert.equal(chairs.length, 4);
  for (const chair of chairs) {
    assert.equal(chair.catalogId, WOLTU);
    assert.equal(chair.groupId, "living-dining-group");
    assert.equal(chair.materialVariants?.main, "fabric-woltu-chenille-cream");
    assert.equal(chair.metadata?.confidence, "estimated");
    assert.deepEqual(chair.size, { width: 0.58, depth: 0.6, height: 0.85 });
  }
  assert.equal(DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-bozan-table")?.position.x, 2.2);
});

test("old stock Kaleo chairs change on loading without moving them or overwriting a chosen alternative", () => {
  const legacy = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  for (const seat of legacy.placements.filter((item) => SEATS.includes(item.id))) {
    seat.catalogId = "chair-kaleo-chenille-beige";
    seat.size = { width: 0.63, depth: 0.64, height: 0.87 };
    seat.materialVariants = { main: "fabric-kaleo-beige" };
    seat.metadata = { source: "Möbelix Produktseite · Art. 1634004202", confidence: "confirmed", notes: ["Eigene wichtige Notiz"] };
  }
  const first = legacy.placements.find((item) => item.id === SEATS[0])!;
  first.position = { x: first.position.x + 0.025, z: first.position.z };
  first.rotation = 12;
  const alternative = legacy.placements.find((item) => item.id === SEATS[1])!;
  alternative.catalogId = "chair-amber-chenille-beige";
  alternative.size = { width: 0.56, depth: 0.61, height: 0.9 };
  alternative.materialVariants = { main: "fabric-amber-beige" };
  const explicitKaleo = legacy.placements.find((item) => item.id === SEATS[2])!;
  explicitKaleo.metadata!.notes!.push("Stuhlvergleich chair-kaleo-chenille-beige · bewusst ausgewählt");
  const upgraded = upgradeDiningChairsToWoltu(legacy);
  const updatedFirst = upgraded.placements.find((item) => item.id === SEATS[0])!;
  assert.equal(updatedFirst.catalogId, WOLTU);
  assert.deepEqual(updatedFirst.position, first.position);
  assert.equal(updatedFirst.rotation, 12);
  assert.ok(updatedFirst.metadata?.notes?.includes("Eigene wichtige Notiz"));
  assert.equal(upgraded.placements.find((item) => item.id === SEATS[1])?.catalogId, "chair-amber-chenille-beige");
  assert.equal(upgraded.placements.find((item) => item.id === SEATS[2])?.catalogId, "chair-kaleo-chenille-beige");
  assert.equal(upgraded.placements.find((item) => item.id === SEATS[3])?.catalogId, WOLTU);
  assert.equal(upgradeDiningChairsToWoltu(upgraded), upgraded);
  const hydrated = prepareSavedPlannerDocument(legacy);
  assert.equal(hydrated.placements.find((item) => item.id === SEATS[0])?.catalogId, WOLTU);
  assert.equal(hydrated.placements.find((item) => item.id === SEATS[1])?.catalogId, "chair-amber-chenille-beige");
});

test("users can restore the old Kaleo chair and switch back to WOLTU without removing backup options", () => {
  const kaleo = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, { type: "setPlacementChairModel", placementId: SEATS[0], modelId: "chair-kaleo-chenille-beige" });
  assert.equal(kaleo.error, undefined);
  assert.equal(kaleo.document.placements.find((item) => item.id === SEATS[0])?.catalogId, "chair-kaleo-chenille-beige");
  const woltu = applyPlannerCommand(kaleo.document, { type: "setPlacementChairModel", placementId: SEATS[0], modelId: "aliexpress-woltu-chenille-1005013095870024" });
  assert.equal(woltu.error, undefined);
  assert.equal(woltu.document.placements.find((item) => item.id === SEATS[0])?.catalogId, WOLTU);
});

test("shopping list includes two WOLTU two-packs, excludes backup Kaleo from budget", () => {
  const woltu = SHOPPING_ITEMS.find((item) => item.id === "1005013095870024");
  const kaleo = SHOPPING_ITEMS.find((item) => item.id === "1634004202");
  assert.equal(woltu?.quantity, 2);
  assert.equal(woltu?.price, null);
  assert.match(woltu?.amountLabel ?? "", /4 Esszimmerstühle/);
  assert.equal(kaleo?.alternative, true);
  assert.equal(Math.round(shoppingSubtotal * 100), 215636);
});
