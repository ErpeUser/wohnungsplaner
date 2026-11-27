import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { parsePlannerDocument } from "../app/planner/domain/schema.ts";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";
import { INTERIOR_BACKUP_KEY, readRefinedInterior } from "../app/planner/store/interior-upgrade.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";

const newlyAddedWc = [
  "builtin-wc-wallboard-artisan-80",
  "builtin-wc-shelf-styling",
  "builtin-wc-ventilation",
] as const;

function legacySavedPlan() {
  const saved = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  saved.name = "Mein eingerichteter Grundriss";
  saved.builtIns = saved.builtIns.filter((item) => !newlyAddedWc.includes(item.id as typeof newlyAddedWc[number]));
  const hatch = saved.builtIns.find((item) => item.id === "builtin-wc-revision")!;
  hatch.elevation = 1.68;

  const wardrobe = saved.placements.find((item) => item.id === "hall-tejo-wardrobe")!;
  wardrobe.catalogId = "hallway-brown-mirror-bench-115";
  wardrobe.materialVariants = { main: "hallway-walnut-brown" };
  wardrobe.position = { x: -1.77, z: 7.92 };

  const chair = saved.placements.find((item) => item.id === "zimmer1-chair")!;
  chair.catalogId = "chair-temu-executive-ivory";
  chair.materialVariants = { main: "leather-ivory" };
  chair.size = { width: 0.64, depth: 0.51, height: 1.14 };
  chair.position = { x: 2.91, z: 0.91 };
  chair.rotation = 175;

  saved.placements.find((item) => item.id === "zimmer1-bliss-bed")!.position.x += 0.07;
  saved.doorStates["hall-wc-door"] = "open";
  return saved;
}

test("actual browser preparation upgrades missing photo objects from an existing saved V3 plan", () => {
  const old = legacySavedPlan();
  const saved = JSON.stringify(old);
  const data = new Map<string, string>();
  const storage = {
    getItem(key: string) { return data.get(key) ?? null; },
    setItem(key: string, value: string) { data.set(key, value); },
  };

  const result = readRefinedInterior(saved, storage, parsePlannerDocument,
    prepareSavedPlannerDocument, DEFAULT_APARTMENT_DOCUMENT.id)!;
  assert.ok(result);
  assert.equal(result.legacyBackupJson, saved);
  assert.equal(data.get(INTERIOR_BACKUP_KEY), saved);

  const next = result.document;
  assert.equal(next.name, old.name);
  for (const id of newlyAddedWc) {
    assert.equal(next.builtIns.filter((item) => item.id === id).length, 1);
  }
  const board = next.builtIns.find((item) => item.id === "builtin-wc-wallboard-artisan-80")!;
  assert.equal(board.catalogId, "wc-artisan-wallboard-80");
  assert.deepEqual(board.size, { width: 0.8, depth: 0.235, height: 0.038 });
  assert.equal(next.builtIns.find((item) => item.id === "builtin-wc-revision")?.elevation, 1.48);

  const wardrobe = next.placements.find((item) => item.id === "hall-tejo-wardrobe")!;
  assert.equal(wardrobe.catalogId, "hallway-tejo-115");
  assert.equal(wardrobe.materialVariants?.main, "tejo-cashmere");
  assert.deepEqual(wardrobe.position, { x: -1.77, z: 7.92 });
  const chair = next.placements.find((item) => item.id === "zimmer1-chair")!;
  assert.equal(chair.catalogId, "chair-aliexpress-xuegw-1005012445521181");
  assert.deepEqual(chair.position, { x: 2.91, z: 0.91 });
  assert.equal(chair.rotation, 175);

  assert.deepEqual(next.placements.find((item) => item.id === "zimmer1-bliss-bed")?.position,
    old.placements.find((item) => item.id === "zimmer1-bliss-bed")?.position);
  assert.equal(next.doorStates["hall-wc-door"], "open");

  const scene = createSceneModel(next, "wc");
  assert.ok(scene.builtIns.some((item) => item.id === board.id && item.catalogId === "wc-artisan-wallboard-80"));
  assert.equal(prepareSavedPlannerDocument(next), next, "once upgraded, no further changes on reload");
});

test("manually chosen furniture is preserved and previously completed WC details are not duplicated", () => {
  const custom = legacySavedPlan();
  custom.placements.find((item) => item.id === "hall-tejo-wardrobe")!.catalogId = "wardrobe-225";
  custom.placements.find((item) => item.id === "zimmer1-chair")!.catalogId = "office-chair";
  const prepared = prepareSavedPlannerDocument(custom);
  assert.equal(prepared.placements.find((item) => item.id === "zimmer1-chair")?.catalogId, "office-chair");
  assert.equal(prepared.placements.find((item) => item.id === "hall-tejo-wardrobe")?.catalogId, "wardrobe-225");
  for (const id of newlyAddedWc) assert.equal(prepared.builtIns.filter((item) => item.id === id).length, 1);
  assert.equal(prepareSavedPlannerDocument(prepared), prepared);
});

test("an unrecognized apartment is not changed", () => {
  const custom = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  custom.id = "other-layout";
  assert.equal(prepareSavedPlannerDocument(custom), custom);
});

test("the default hall wardrobe uses the original cashmere Tejo", () => {
  const wardrobe = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "hall-tejo-wardrobe")!;
  assert.equal(wardrobe.catalogId, "hallway-tejo-115");
  assert.equal(wardrobe.materialVariants?.main, "tejo-cashmere");
});
