import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT, ZIMMER1_ENTRY_ART_MODEL } from "../app/planner/domain/apartment-v3.ts";
import { upgradeZimmer1EntryGold, zimmer1EntryGoldSegments, ZIMMER1_ENTRY_GOLD_ARTICLE, ZIMMER1_ENTRY_GOLD_ID, ZIMMER1_ENTRY_GOLD_LAYOUT } from "../app/planner/domain/zimmer1-entry-gold.ts";
import { refineRoomLayout } from "../app/planner/domain/room-refinement.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { shoppingItemsForDocument, shoppingItemsForSelection, shoppingPriceLabel, shoppingSubtotalForDocument } from "../app/planner/workspace/shopping-items.ts";

const doc = DEFAULT_APARTMENT_DOCUMENT;
const gold = doc.builtIns.find(item => item.id === ZIMMER1_ENTRY_GOLD_ID)!;
const artId = ZIMMER1_ENTRY_ART_MODEL.id;
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("door-side gold layout consists of twelve 2 × 60 cm pieces, four 180 cm lines, centered on the existing wall", () => {
  const l = ZIMMER1_ENTRY_GOLD_LAYOUT;
  const pieces = zimmer1EntryGoldSegments();
  assert.equal(pieces.length, 12);
  assert.equal(new Set(pieces.map(p => p.id)).size, 12);
  assert.equal(ZIMMER1_ENTRY_GOLD_ARTICLE.packSize - pieces.length, 1);
  assert.equal(new Set(pieces.map(p => p.x)).size, 4);
  assert.equal(new Set(pieces.map(p => p.y)).size, 3);
  const xs = [...new Set(pieces.map(p => p.x))].sort((a,b) => a-b);
  for (let i=1;i<xs.length;i++) close(xs[i]-xs[i-1]-l.stripWidth, .10);
  close(l.groupWidth, 4*l.stripWidth+3*l.clearGap);
  close((l.wallWidth-l.groupWidth)/2, .13);
  close((l.wallHeight-l.groupHeight)/2, .37);
  assert.equal(doc.builtIns.filter(item => item.id === ZIMMER1_ENTRY_GOLD_ID).length, 1);
  assert.equal(doc.builtIns.some(item => item.id === artId), false);
  assert.equal(gold.collision, "decorative");
  assert.equal(gold.locked, true);
  assert.deepEqual(gold.size, {width:.38,depth:.002,height:1.8});
  const wall = doc.builtIns.find(item => item.id === "builtin-z1-entry-wallpaper-return")!;
  assert.equal(gold.rotation, wall.rotation);
  close(gold.position.z, wall.position.z);
  close(gold.position.x - gold.size.depth/2, wall.position.x + wall.size.depth/2 + l.surfaceClearance);
  close((gold.elevation ?? 0) + gold.size.height, 2.17);
  assert.equal(doc.builtIns.find(item => item.id === "builtin-z1-entry-wallpaper-door-strip")?.size.width, .26);
  assert.equal(createReviewScene("builtin:zimmer1-entry-slim-art").model.builtIn?.id, artId);
  assert.equal(createReviewScene("builtin:zimmer1-entry-gold-strips").model.builtIn?.id, ZIMMER1_ENTRY_GOLD_ID);
});

test("one 13-piece pack costs EUR 8.05 and is linked to the placed group without duplicate purchase", () => {
  const selected = shoppingItemsForSelection(doc, gold);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, ZIMMER1_ENTRY_GOLD_ARTICLE.id);
  assert.equal(selected[0].quantity, 1);
  assert.equal(selected[0].price, 8.05);
  assert.equal(selected[0].url, ZIMMER1_ENTRY_GOLD_ARTICLE.url);
  assert.match(selected[0].amountLabel ?? "", /12 montiert, 1 Reserve/);
  assert.equal(shoppingItemsForDocument(doc).filter(item => item.id === selected[0].id).length, 1);
  close(shoppingSubtotalForDocument(doc), 2304.78);
  assert.match(shoppingPriceLabel(selected[0]), /8,05/);
});

test("old saved plans replace only the picture and preserve the original model and other placements", () => {
  const current = prepareSavedPlannerDocument(doc);
  const old = { ...current, builtIns: current.builtIns.map(item => item.id === ZIMMER1_ENTRY_GOLD_ID ? structuredClone(ZIMMER1_ENTRY_ART_MODEL) : item) };
  assert.deepEqual(upgradeZimmer1EntryGold(old), current);
  assert.equal(upgradeZimmer1EntryGold(current), current);
  assert.deepEqual(prepareSavedPlannerDocument(old), current);
  assert.equal(refineRoomLayout(old).builtIns.some(item => item.id === artId), false);
  const other = { ...old, id: "another-flat" };
  assert.equal(upgradeZimmer1EntryGold(other), other);
  const raw = JSON.stringify({ ...doc, builtIns: doc.builtIns.map(item => item.id === ZIMMER1_ENTRY_GOLD_ID ? structuredClone(ZIMMER1_ENTRY_ART_MODEL) : item) });
  const data = new Map([[PLANNER_STORAGE_KEY, raw]]);
  const repository = createLocalStoragePlannerRepository({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  });
  const loaded = repository.load();
  assert.equal(loaded.document.builtIns.some(item => item.id === artId), false);
  assert.equal(loaded.document.builtIns.filter(item => item.id === ZIMMER1_ENTRY_GOLD_ID).length, 1);
  assert.deepEqual(loaded.document.placements, JSON.parse(raw).placements);
  assert.equal(loaded.legacyBackupJson, raw);
  const preview = repository.previewImport(JSON.parse(raw));
  assert.equal(preview.canCommit, true);
  assert.equal(preview.document.builtIns.some(item => item.id === artId), false);
  assert.equal(preview.document.builtIns.filter(item => item.id === ZIMMER1_ENTRY_GOLD_ID).length, 1);
});
