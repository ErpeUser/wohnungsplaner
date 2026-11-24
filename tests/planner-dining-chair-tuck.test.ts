import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { parsePlannerDocument } from "../app/planner/domain/schema.ts";
import { upgradeDefaultWoltuDiningChairTuck, createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { prepareSavedPlannerDocument } from "../app/planner/store/prepare-saved-planner-document.ts";

const priorPositions = new Map([
  ["living-kaleo-chair-west", { x: 2.2, z: 5.0 }],
  ["living-kaleo-chair-east", { x: 2.9, z: 5.7 }],
  ["living-kaleo-chair-south", { x: 1.5, z: 5.7 }],
  ["living-kaleo-chair-north", { x: 2.2, z: 6.4 }],
]);

function previousWoltuLayout() {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  for (const seat of old.placements) {
    const position = priorPositions.get(seat.id);
    if (position) {
      seat.position = { ...position };
      const oldNote = seat.metadata?.notes?.find((note) => note.startsWith("Stuhlplatz "));
      if (oldNote) {
        seat.metadata!.notes = [
          ...(seat.metadata?.notes ?? []).filter((note) => !note.startsWith("Stuhlplatz ")),
          oldNote.replace(/X (?:150|220|282|158) \/ Z (?:508|570|632)/,
            seat.id.endsWith("west") ? "X 220 / Z 500"
            : seat.id.endsWith("east") ? "X 290 / Z 570"
            : seat.id.endsWith("south") ? "X 150 / Z 570" : "X 220 / Z 640")
            .replace("Bozan-Tisch unverändert.", "Tisch und übrige Möbel bleiben unverändert."),
        ];
      }
    }
  }
  return old;
}

test("migrates all four untouched WOLTU chairs inwards without changing the Bozan table", () => {
  const stored = previousWoltuLayout();
  const previousTable = structuredClone(stored.placements.find((p) => p.id === "living-bozan-table"));
  const updated = upgradeDefaultWoltuDiningChairTuck(stored);
  assert.notEqual(updated, stored);
  const current = DEFAULT_APARTMENT_DOCUMENT.placements;
  for (const id of priorPositions.keys()) {
    const next = updated.placements.find((p) => p.id === id)!;
    assert.deepEqual(next.position, current.find((p) => p.id === id)!.position);
    assert.equal(next.catalogId, "chair-aliexpress-woltu-1005013095870024");
    assert.equal(next.groupId, "living-dining-group");
    assert.ok(next.metadata?.notes?.some((note) => note.startsWith("Stuhlplatz ")));
  }
  assert.deepEqual(updated.placements.find((p) => p.id === "living-bozan-table"), previousTable);
  assert.equal(upgradeDefaultWoltuDiningChairTuck(updated), updated);
  assert.doesNotThrow(() => parsePlannerDocument(updated));
});

test("respects moved seats, deliberately selected backup, custom dining table and personal notes", () => {
  const stored = previousWoltuLayout();
  const west = stored.placements.find((p) => p.id === "living-kaleo-chair-west")!;
  west.position = { x: 2.2, z: 4.91 }; // personal movement
  west.metadata!.notes = [...(west.metadata?.notes ?? []), "Persönliche Position beibehalten"];
  const east = stored.placements.find((p) => p.id === "living-kaleo-chair-east")!;
  east.catalogId = "chair-kaleo-chenille-beige";
  east.size = { width: 0.63, depth: 0.64, height: 0.87 };
  const after = upgradeDefaultWoltuDiningChairTuck(stored);
  assert.deepEqual(after.placements.find((p) => p.id === west.id)?.position, west.position);
  assert.deepEqual(after.placements.find((p) => p.id === east.id)?.position, east.position);
  assert.equal(after.placements.find((p) => p.id === east.id)?.catalogId, east.catalogId);
  assert.ok(after.placements.find((p) => p.id === west.id)?.metadata?.notes?.includes("Persönliche Position beibehalten"));
  assert.deepEqual(after.placements.find((p) => p.id === "living-kaleo-chair-south")?.position, { x: 1.58, z: 5.7 });
  const otherTable = previousWoltuLayout();
  otherTable.placements.find((p) => p.id === "living-bozan-table")!.catalogId = "dining-table-kaufland-567080013-120-160";
  assert.equal(upgradeDefaultWoltuDiningChairTuck(otherTable), otherTable);
  const relocatedTable = previousWoltuLayout();
  relocatedTable.placements.find((p) => p.id === "living-bozan-table")!.position.x = 2.25;
  assert.equal(upgradeDefaultWoltuDiningChairTuck(relocatedTable), relocatedTable);
});

test("upgrades browser-persisted and repository-saved V3 documents without resetting table or user chairs", () => {
  const stored = previousWoltuLayout();
  const west = stored.placements.find((p) => p.id === "living-kaleo-chair-west")!;
  west.position.z = 4.92; // customized -> must survive both load routes
  const browser = prepareSavedPlannerDocument(stored);
  assert.deepEqual(browser.placements.find((p) => p.id === west.id)?.position, { x: 2.2, z: 4.92 });
  assert.deepEqual(browser.placements.find((p) => p.id === "living-kaleo-chair-north")?.position, { x: 2.2, z: 6.32 });
  assert.deepEqual(browser.placements.find((p) => p.id === "living-bozan-table"), stored.placements.find((p) => p.id === "living-bozan-table"));
  const cache = new Map([[PLANNER_STORAGE_KEY, JSON.stringify(stored)]]);
  const store = {
    getItem: (key: string) => cache.get(key) ?? null,
    setItem: (key: string, value: string) => { cache.set(key, value); },
    removeItem: (key: string) => { cache.delete(key); },
  };
  const loaded = createLocalStoragePlannerRepository(store).load().document;
  assert.deepEqual(loaded.placements.find((p) => p.id === west.id)?.position, { x: 2.2, z: 4.92 });
  assert.deepEqual(loaded.placements.find((p) => p.id === "living-kaleo-chair-north")?.position, { x: 2.2, z: 6.32 });
  assert.deepEqual(loaded.placements.find((p) => p.id === "living-bozan-table"), stored.placements.find((p) => p.id === "living-bozan-table"));
});
