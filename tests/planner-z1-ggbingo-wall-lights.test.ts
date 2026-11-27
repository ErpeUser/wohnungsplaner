import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT, upgradeZimmer1WallLights } from "../app/planner/domain/apartment-v3.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { shoppingItemsForDocument, shoppingItemsForSelection } from "../app/planner/workspace/shopping-items.ts";

const id = "builtin-z1-headboard-sconces";
const lights = DEFAULT_APARTMENT_DOCUMENT.builtIns.find(item => item.id === id)!;

test("the selected two-light group fits below the unchanged pictures and within the finished wall", () => {
  const doc = DEFAULT_APARTMENT_DOCUMENT;
  assert.equal(doc.builtIns.filter(item => item.id === id).length, 1);
  assert.match(lights.metadata?.source ?? "", /1005012428556452/);
  assert.equal(lights.metadata?.confidence, "estimated");
  assert.equal(lights.materialVariants?.main, "metal-gold");
  assert.equal(lights.collision, "decorative");
  const art = doc.builtIns.find(item => item.id === "builtin-z1-wall-art-pair")!;
  assert.equal(lights.position.z, art.position.z);
  assert.ok(lights.position.z - lights.size.width / 2 > 0.06);
  assert.ok((lights.elevation ?? 0) + lights.size.height < (art.elevation ?? 0));
  const review = createReviewScene("builtin:zimmer1-headboard-sconces");
  assert.equal(review.scene.builtIns.length, 1);
  assert.deepEqual(review.size, lights.size);
});

test("one active AliExpress shopping row represents two planned lights without an invented price", () => {
  const entries = shoppingItemsForDocument(DEFAULT_APARTMENT_DOCUMENT).filter(item => item.id === "z1-deko-wandleuchten");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].quantity, 2);
  assert.equal(entries[0].price, null);
  assert.equal(entries[0].url, "https://de.aliexpress.com/item/1005012428556452.html");
  assert.match(entries[0].amountLabel ?? "", /33,68.*Packungsinhalt/);
  assert.deepEqual(shoppingItemsForSelection(DEFAULT_APARTMENT_DOCUMENT, lights), entries);
});

test("older plans replace the former pair without duplicating it or changing other placements", () => {
  const doc = structuredClone(prepareSavedPlannerDocument(DEFAULT_APARTMENT_DOCUMENT));
  const old = { ...lights, label: "Zwei kompakte warme Wandleuchten am Bett", position: { x: .043, z: .735 },
    elevation: 1.18, size: { width: 1.72, depth: .12, height: .24 },
    materialVariants: { main: "metal-satin" }, metadata: { source: "old concept", confidence: "estimated" as const } };
  const saved = { ...doc, builtIns: doc.builtIns.map(item => item.id === id ? old : item) };
  assert.deepEqual(upgradeZimmer1WallLights(saved), doc);
  assert.deepEqual(prepareSavedPlannerDocument(saved), doc);
  assert.equal(upgradeZimmer1WallLights(doc), doc);
  const missing = { ...doc, builtIns: doc.builtIns.filter(item => item.id !== id) };
  assert.equal(upgradeZimmer1WallLights(missing).builtIns.filter(item => item.id === id).length, 1);
  const other = { ...saved, id: "another-flat" };
  assert.equal(upgradeZimmer1WallLights(other), other);
  const raw = JSON.stringify({ ...DEFAULT_APARTMENT_DOCUMENT, builtIns: DEFAULT_APARTMENT_DOCUMENT.builtIns.map(item => item.id === id ? old : item) });
  const data = new Map([[PLANNER_STORAGE_KEY, raw]]);
  const repository = createLocalStoragePlannerRepository({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  });
  const loaded = repository.load();
  assert.equal(loaded.document.builtIns.find(item => item.id === id)?.metadata?.source, lights.metadata?.source);
  assert.deepEqual(loaded.document.placements, JSON.parse(raw).placements);
  assert.equal(loaded.legacyBackupJson, raw);
  assert.equal(repository.previewImport(JSON.parse(raw)).document.builtIns.find(item => item.id === id)?.metadata?.source, lights.metadata?.source);
});
