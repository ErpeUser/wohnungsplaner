import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { PLANNER_STORAGE_KEY, createLocalStoragePlannerRepository, upgradeZimmer1VanityWallboards } from "../app/planner/store/persistence.ts";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";
import { readRefinedInterior, INTERIOR_BACKUP_KEY } from "../app/planner/store/interior-upgrade.ts";
import { parsePlannerDocument } from "../app/planner/domain/schema.ts";

const ids = ["builtin-z1-vanity-shelf-main", "builtin-z1-vanity-shelf-side-upper", "builtin-z1-vanity-shelf-side-lower"];
const shelf = (id: string) => DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === id)!;

test("Möbelix wallboards use their real sizes and separate Wotan and Artisan wood finishes", () => {
  const main = shelf(ids[0]);
  assert.deepEqual(main.size, { width: 1.2, depth: 0.2, height: 0.018 });
  assert.equal(main.materialVariants?.main, "oak-wotan");
  assert.equal(main.metadata?.confidence, "confirmed");
  assert.match(main.metadata?.source ?? "", /001555006211/);
  const upper = shelf(ids[1]);
  const lower = shelf(ids[2]);
  for (const board of [upper, lower]) {
    assert.deepEqual(board.size, { width: 0.235, depth: 0.235, height: 0.038 });
    assert.equal(board.materialVariants?.main, "oak-artisan");
    assert.equal(board.rotation, 90);
    assert.match(board.metadata?.source ?? "", /007326000308/);
  }
  assert.notEqual(upper.elevation, lower.elevation);
  const wotan = getPlannerMaterial("oak-wotan");
  const artisan = getPlannerMaterial("oak-artisan");
  assert.ok(wotan.map, "Wotan has procedural grain");
  assert.ok(artisan.map, "Artisan has procedural grain");
  assert.notEqual(wotan.map, artisan.map, "distinct wood finishes are not flattened");
});

test("saved legacy vanity shelves migrate once without resetting moved furniture", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  old.builtIns = old.builtIns.map((item) => {
    const original = ({
      "builtin-z1-vanity-shelf-main": [1.12, 0.19, 0.045],
      "builtin-z1-vanity-shelf-side-upper": [0.36, 0.16, 0.04],
      "builtin-z1-vanity-shelf-side-lower": [0.32, 0.16, 0.04],
    } as Record<string, [number, number, number]>)[item.id];
    if (!original) return item;
    return { ...item, size: { width: original[0], depth: original[1], height: original[2] },
      materialVariants: { main: "oak-light" }, position: {
        x: item.id === ids[0] ? 2.96 : 3.475,
        z: item.id === ids[0] ? 0.095 : item.position.z,
      },
    };
  });
  const chair = old.placements.find((item) => item.id === "zimmer1-chair")!;
  chair.position.x += 0.12;
  const migrated = upgradeZimmer1VanityWallboards(old);
  assert.notEqual(migrated, old);
  for (const id of ids) assert.deepEqual(migrated.builtIns.find((item) => item.id === id)?.size, shelf(id).size);
  assert.equal(migrated.placements.find((item) => item.id === chair.id)?.position.x, chair.position.x);
  assert.equal(migrated.builtIns.find((item) => item.id === ids[0])?.position.x, 2.92);
  assert.equal(migrated.builtIns.find((item) => item.id === ids[1])?.position.x, 3.4375);
  assert.equal(upgradeZimmer1VanityWallboards(migrated), migrated);
  const values = new Map<string,string>([[PLANNER_STORAGE_KEY, JSON.stringify(old)]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const loaded = createLocalStoragePlannerRepository(storage).load();
  for (const id of ids) assert.deepEqual(loaded.document.builtIns.find((item) => item.id === id)?.size, shelf(id).size);
  assert.equal(loaded.document.placements.find((item) => item.id === chair.id)?.position.x, chair.position.x);
});

test("custom finish and position on an individual wallboard are not silently overwritten", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const upper = document.builtIns.find((item) => item.id === ids[1])!;
  upper.materialVariants = { main: "walnut" };
  upper.size = { width: 0.36, depth: 0.16, height: 0.04 };
  upper.position.z = 0.56;
  assert.equal(upgradeZimmer1VanityWallboards(document), document);
});


test("browser saved-plan loader upgrades legacy Zimmer 1 shelves, backs up raw data and preserves moved furniture", () => {
  const legacy = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const oldSizes = new Map<string, [number, number, number]>([
    [ids[0], [1.12, 0.19, 0.045]],
    [ids[1], [0.36, 0.16, 0.04]],
    [ids[2], [0.32, 0.16, 0.04]],
  ]);
  legacy.builtIns = legacy.builtIns.map((item) => {
    const original = oldSizes.get(item.id);
    return original ? {
      ...item,
      size: { width: original[0], depth: original[1], height: original[2] },
      materialVariants: { ...item.materialVariants, main: "oak-light" },
      label: item.id === ids[0] ? "Haupt-Wandregal Natur-Eiche" : "Eck-Wandregal Natur-Eiche",
    } : item;
  });
  const chair = legacy.placements.find((item) => item.id === "zimmer1-chair")!;
  chair.position.z = 1.06;
  const raw = JSON.stringify(legacy);
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
  const result = readRefinedInterior(raw, storage, parsePlannerDocument,
    prepareSavedPlannerDocument, DEFAULT_APARTMENT_DOCUMENT.id);
  assert.ok(result, "the browser's valid V3 loading route is active");
  for (const id of ids) {
    const upgraded = result.document.builtIns.find((item) => item.id === id)!;
    assert.deepEqual(upgraded.size, shelf(id).size);
    assert.equal(upgraded.materialVariants?.main, shelf(id).materialVariants?.main);
  }
  assert.equal(result.document.placements.find((item) => item.id === chair.id)?.position.z, 1.06);
  assert.equal(data.get(INTERIOR_BACKUP_KEY), raw, "original plan remains recoverable");
  assert.equal(prepareSavedPlannerDocument(result.document), result.document, "browser migration is idempotent");
});
