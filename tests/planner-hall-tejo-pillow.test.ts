import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createHallTejoPillow, ensureHallTejoPillow, HALL_TEJO_PILLOW_ID, HALL_TEJO_PILLOW_ARTICLE, HALL_TEJO_PILLOW_LAYOUT } from "../app/planner/domain/hall-tejo-pillow.ts";
import { refineRoomLayout } from "../app/planner/domain/room-refinement.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { shoppingItemsForDocument, shoppingItemsForSelection, shoppingPriceLabel, shoppingSubtotalForDocument } from "../app/planner/workspace/shopping-items.ts";

const doc = DEFAULT_APARTMENT_DOCUMENT;
const bench = doc.placements.find(item => item.id === "hall-tejo-wardrobe")!;
const pillow = doc.builtIns.find(item => item.id === HALL_TEJO_PILLOW_ID)!;
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test("one bronze 40 cm pillow rests on the right side of the open TEJO bench", () => {
  const l = HALL_TEJO_PILLOW_LAYOUT;
  assert.equal(doc.builtIns.filter(item => item.id === HALL_TEJO_PILLOW_ID).length, 1);
  assert.deepEqual(pillow.size, {width:.4,depth:.15,height:.4});
  assert.equal(pillow.materialVariants?.main, "fabric-hall-bronze-chenille");
  assert.equal(pillow.locked, true);
  assert.equal(pillow.collision, "decorative");
  assert.equal(pillow.roomId, "vorraum");
  assert.equal(pillow.rotation, bench.rotation);
  close(pillow.position.x, bench.position.x - l.localX);
  close(pillow.position.z, bench.position.z - l.localZ);
  close(pillow.elevation ?? 0, bench.size.height * l.seatTopRatio);
  const seatRight = (.19 + .58/2) * bench.size.width;
  const seatLeft = (.19 - .58/2) * bench.size.width;
  assert.ok(l.localX + .2 < seatRight);
  assert.ok(l.localX - .2 > seatLeft);
  assert.deepEqual(createReviewScene("builtin:hall-tejo-bronze-pillow").size, pillow.size);
});

test("one shopping row represents two covers at the supplied set price and warns that filling is separate", () => {
  const rows = shoppingItemsForSelection(doc, pillow);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, HALL_TEJO_PILLOW_ARTICLE.id);
  assert.equal(rows[0].quantity, 1);
  assert.equal(rows[0].price, 12.85);
  assert.equal(rows[0].url, "https://www.temu.com/goods.html?goods_id=605638990106029&sku_id=103514751647878");
  assert.match(rows[0].amountLabel ?? "", /2 Bezüge.*Füllung separat/);
  assert.match(shoppingPriceLabel(rows[0]), /12,85/);
  assert.equal(shoppingItemsForDocument(doc).filter(item => item.id === rows[0].id).length, 1);
  close(shoppingSubtotalForDocument(doc), 2199.78);
});

test("older saves and imports add one pillow without resetting other furniture; support-specific seat height is retained", () => {
  const old = { ...doc, builtIns: doc.builtIns.filter(item => item.id !== HALL_TEJO_PILLOW_ID) };
  const migrated = ensureHallTejoPillow(old);
  assert.deepEqual(migrated.placements, old.placements);
  assert.equal(migrated.builtIns.filter(item => item.id === HALL_TEJO_PILLOW_ID).length, 1);
  assert.equal(ensureHallTejoPillow(migrated), migrated);
  assert.equal(refineRoomLayout(old).builtIns.filter(item => item.id === HALL_TEJO_PILLOW_ID).length, 1);
  assert.equal(prepareSavedPlannerDocument(old).builtIns.filter(item => item.id === HALL_TEJO_PILLOW_ID).length, 1);
  const moved = { ...bench, position: {x:-1.71,z:7.91}, rotation:90 };
  const movedDoc = { ...old, placements: old.placements.map(item => item.id === bench.id ? moved : item) };
  assert.deepEqual(ensureHallTejoPillow(movedDoc).placements, movedDoc.placements);
  const placed = createHallTejoPillow(moved)!;
  close(placed.position.x, moved.position.x - HALL_TEJO_PILLOW_LAYOUT.localZ);
  close(placed.position.z, moved.position.z + HALL_TEJO_PILLOW_LAYOUT.localX);
  const photo = createHallTejoPillow({...bench,catalogId:"hallway-brown-mirror-bench-115"})!;
  close(photo.elevation ?? 0, bench.size.height * HALL_TEJO_PILLOW_LAYOUT.photoSeatTopRatio);
  const noBench = {...migrated, placements: migrated.placements.filter(item => item.id !== bench.id)};
  assert.equal(ensureHallTejoPillow(noBench).builtIns.some(item => item.id === HALL_TEJO_PILLOW_ID), false);
  const raw = JSON.stringify(old);
  const data = new Map([[PLANNER_STORAGE_KEY, raw]]);
  const repository = createLocalStoragePlannerRepository({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  });
  const result = repository.load();
  assert.equal(result.document.builtIns.filter(item => item.id === HALL_TEJO_PILLOW_ID).length, 1);
  assert.equal(repository.previewImport(JSON.parse(raw)).document.builtIns.filter(item => item.id === HALL_TEJO_PILLOW_ID).length, 1);
});
