import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { upgradeZimmer1WardrobeBoxes, ZGV_WARDROBE_ARTICLE, ZGV_WARDROBE_BOX_ID, ZGV_WARDROBE_LAYOUT, zgvWardrobeBoxCenters } from "../app/planner/domain/zimmer1-wardrobe-boxes.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { shoppingItemsForDocument, shoppingItemsForSelection, shoppingPriceLabel, shoppingSubtotalForDocument } from "../app/planner/workspace/shopping-items.ts";

const doc = DEFAULT_APARTMENT_DOCUMENT;
const boxes = doc.builtIns.find(item => item.id === ZGV_WARDROBE_BOX_ID)!;
const wardrobe = doc.placements.find(item => item.id === "zimmer1-wardrobe")!;
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8);

test("three full-size XL bags fit side-by-side on the wardrobe with even gaps and 16 cm ceiling clearance", () => {
  const l = ZGV_WARDROBE_LAYOUT;
  assert.equal(zgvWardrobeBoxCenters().length, 3);
  assert.deepEqual(boxes.size, { width: 1.94, depth: .4, height: .3 });
  assert.equal(boxes.locked, true);
  assert.equal(boxes.collision, "decorative");
  assert.deepEqual(boxes.position, wardrobe.position);
  assert.equal(boxes.rotation, wardrobe.rotation);
  close(l.groupWidth, 3 * l.boxWidth + 2 * l.gap);
  close((wardrobe.size.width - l.groupWidth)/2, .155);
  close((wardrobe.size.depth - l.boxDepth)/2, .09);
  close(boxes.elevation ?? 0, wardrobe.size.height);
  close(l.ceilingHeight - (boxes.elevation ?? 0) - boxes.size.height, .16);
  assert.deepEqual(createReviewScene("builtin:zimmer1-wardrobe-top-decor").size, boxes.size);
});

test("replaces the shopping placeholder with one ZGV XL pack of three for the supplied total price", () => {
  const entries = shoppingItemsForSelection(doc, boxes);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, "z1-deko-schrankboxen");
  assert.equal(entries[0].quantity, 1);
  assert.equal(entries[0].price, 12.74);
  assert.equal(entries[0].url, ZGV_WARDROBE_ARTICLE.url);
  assert.match(entries[0].url ?? "", /goods_id=607487503734082&sku_id=118252395101764/);
  assert.match(entries[0].amountLabel ?? "", /3 Stück XL/);
  assert.equal(shoppingItemsForDocument(doc).filter(item => item.id === entries[0].id).length, 1);
  close(shoppingSubtotalForDocument(doc), 2271.64);
  assert.match(shoppingPriceLabel(entries[0]), /12,74/);
});

test("older saves replace only the previous group, and retain actual wardrobe position and unrelated placements", () => {
  const current = prepareSavedPlannerDocument(doc);
  const old = { ...boxes, label: "Geflochtene Aufbewahrungsboxen auf dem Schrank",
    position: { x: 1.125, z: 3.02 }, size: { width: 1.46, depth: .42, height: .25 },
    metadata: { source: "old concept", confidence: "estimated" as const } };
  const saved = { ...current, builtIns: current.builtIns.map(item => item.id === boxes.id ? old : item) };
  assert.deepEqual(upgradeZimmer1WardrobeBoxes(saved), current);
  assert.equal(upgradeZimmer1WardrobeBoxes(current), current);
  assert.deepEqual(prepareSavedPlannerDocument(saved), current);
  const moved = { ...saved, placements: saved.placements.map(item => item.id === wardrobe.id ? { ...item, position: { x: 1.2, z: 2.97 } } : item) };
  const upgraded = upgradeZimmer1WardrobeBoxes(moved);
  assert.deepEqual(upgraded.placements, moved.placements);
  assert.deepEqual(upgraded.builtIns.find(item => item.id === boxes.id)?.position, { x: 1.2, z: 2.97 });
  const raw = JSON.stringify({ ...doc, builtIns: doc.builtIns.map(item => item.id === boxes.id ? old : item) });
  const data = new Map([[PLANNER_STORAGE_KEY, raw]]);
  const repository = createLocalStoragePlannerRepository({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  });
  const result = repository.load();
  assert.deepEqual(result.document.builtIns.find(item => item.id === boxes.id), JSON.parse(JSON.stringify(boxes)));
  assert.deepEqual(result.document.placements, JSON.parse(raw).placements);
  assert.equal(result.legacyBackupJson, raw);
  const preview = repository.previewImport(JSON.parse(raw));
  assert.equal(preview.canCommit, true);
  assert.equal(preview.document.builtIns.find(item => item.id === boxes.id)?.metadata?.source, boxes.metadata?.source);
});
