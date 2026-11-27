import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT, ZIMMER1_ENTRY_NICHE_MODEL } from "../app/planner/domain/apartment-v3.ts";
import { refineRoomLayout, removeZimmer1EntryNiche } from "../app/planner/domain/room-refinement.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { SHOPPING_ITEMS, shoppingItemsForDocument } from "../app/planner/workspace/shopping-items.ts";

const nicheId = ZIMMER1_ENTRY_NICHE_MODEL.id;

test("retains the niche model and shopping reference without an active bedroom placement", () => {
  const document = DEFAULT_APARTMENT_DOCUMENT;
  assert.equal(document.builtIns.some(item => item.id === nicheId), false);
  assert.equal(refineRoomLayout(document).builtIns.some(item => item.id === nicheId), false);
  const review = createReviewScene("builtin:zimmer1-entry-niche");
  assert.deepEqual(review.size, { width: .22, depth: .13, height: 1.88 });
  assert.equal(review.scene.builtIns[0].source.id, nicheId);
  assert.ok(SHOPPING_ITEMS.some(item => item.id === "z1-deko-nische"));
  assert.equal(shoppingItemsForDocument(document).some(item => item.id === "z1-deko-nische"), false);
});

test("retires the exact saved placement without changing other furniture or built-ins", () => {
  const document = structuredClone(prepareSavedPlannerDocument(DEFAULT_APARTMENT_DOCUMENT));
  const saved = { ...document, builtIns: [...document.builtIns, structuredClone(ZIMMER1_ENTRY_NICHE_MODEL)] };
  assert.deepEqual(removeZimmer1EntryNiche(saved), document);
  assert.equal(removeZimmer1EntryNiche(document), document);
  assert.deepEqual(prepareSavedPlannerDocument(saved), document);
  const other = { ...saved, id: "another-flat" };
  assert.equal(removeZimmer1EntryNiche(other), other);
});

test("repository load and import do not restore the retired placement", () => {
  const saved = { ...structuredClone(DEFAULT_APARTMENT_DOCUMENT), builtIns: [
    ...structuredClone(DEFAULT_APARTMENT_DOCUMENT.builtIns), structuredClone(ZIMMER1_ENTRY_NICHE_MODEL),
  ] };
  const raw = JSON.stringify(saved);
  const data = new Map([[PLANNER_STORAGE_KEY, raw]]);
  const repository = createLocalStoragePlannerRepository({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  });
  const result = repository.load();
  assert.equal(result.document.builtIns.some(item => item.id === nicheId), false);
  assert.equal(result.legacyBackupJson, raw);
  assert.deepEqual(result.document.placements, saved.placements);
  const preview = repository.previewImport(saved);
  assert.equal(preview.canCommit, true);
  assert.equal(preview.document.builtIns.some(item => item.id === nicheId), false);
});
