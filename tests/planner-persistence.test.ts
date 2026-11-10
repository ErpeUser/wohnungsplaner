import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import {
  PLANNER_BACKUP_KEY,
  PLANNER_MIGRATION_BACKUP_KEY,
  PLANNER_IMPORT_SOURCE_BACKUP_KEY,
  PLANNER_STORAGE_KEY,
  createLocalStoragePlannerRepository,
  upgradeRetiredDiningGroup,
  type PlannerRepository,
} from "../app/planner/store/persistence.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";
import type { PlannerDocumentV3 } from "../app/planner/domain/types.ts";

test("loads the default from empty storage and accepts a valid V3 document", () => {
  const storage = new MemoryStorage();
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  assert.equal(repository.load().document, DEFAULT_APARTMENT_DOCUMENT);

  const saved = documentNamed("Mein Entwurf");
  storage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(saved));
  const result = repository.load();
  assert.equal(result.document.name, "Mein Entwurf");
  assert.deepEqual(result.warnings, []);
});

test("replaces the two retired Amber placeholders in a live document with three Kaleo chairs", () => {
  const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  stale.placements = stale.placements.filter((item) => item.catalogId !== "chair-kaleo-chenille-beige");
  stale.placements.push(
    {
      id: "living-amber-chair-west",
      roomId: "wohnkueche",
      catalogId: "chair-amber-chenille-beige",
      position: { x: 1.72, z: 5.47 },
      rotation: 270,
      size: { width: 0.57, depth: 0.63, height: 0.85 },
      groupId: "living-dining-group",
    },
    {
      id: "living-amber-chair-east",
      roomId: "wohnkueche",
      catalogId: "chair-amber-chenille-beige",
      position: { x: 3.28, z: 5.47 },
      rotation: 90,
      size: { width: 0.57, depth: 0.63, height: 0.85 },
      groupId: "living-dining-group",
    },
  );

  const upgraded = upgradeRetiredDiningGroup(stale);
  const chairs = upgraded.placements.filter((item) => item.catalogId === "chair-kaleo-chenille-beige");

  assert.notEqual(upgraded, stale);
  assert.equal(upgraded.placements.some((item) => item.catalogId === "chair-amber-chenille-beige"), false);
  assert.equal(chairs.length, 3);
  assert.deepEqual(
    chairs.map((item) => item.id).toSorted(),
    [
      "living-kaleo-chair-east",
      "living-kaleo-chair-south",
      "living-kaleo-chair-west",
    ],
  );
  assert.equal(upgradeRetiredDiningGroup(upgraded), upgraded);
});

test("removes the refrigerator-side Kaleo chair from an already open four-chair layout", () => {
  const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  stale.placements.push({
    id: "living-kaleo-chair-north",
    roomId: "wohnkueche",
    catalogId: "chair-kaleo-chenille-beige",
    position: { x: 2.5, z: 4.77 },
    rotation: 0,
    size: { width: 0.63, depth: 0.64, height: 0.87 },
    groupId: "living-dining-group",
  });

  const upgraded = upgradeRetiredDiningGroup(stale);

  assert.notEqual(upgraded, stale);
  assert.equal(upgraded.placements.some((item) => item.id === "living-kaleo-chair-north"), false);
  assert.equal(upgraded.placements.filter((item) => item.catalogId === "chair-kaleo-chenille-beige").length, 3);
});

test("moves an already open three-chair dining group to the balanced aisle position once", () => {
  const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const oldPositions = new Map([
    ["living-bozan-table", { x: 2.5, z: 5.47 }],
    ["living-kaleo-chair-west", { x: 1.8, z: 5.47 }],
    ["living-kaleo-chair-east", { x: 3.2, z: 5.47 }],
    ["living-kaleo-chair-south", { x: 2.5, z: 6.17 }],
  ]);
  for (const item of stale.placements) {
    const old = oldPositions.get(item.id);
    if (old) item.position = old;
  }

  const upgraded = upgradeRetiredDiningGroup(stale);

  assert.notEqual(upgraded, stale);
  assert.deepEqual(upgraded.placements.find((item) => item.id === "living-bozan-table")?.position, { x: 2.2, z: 5.7 });
  assert.deepEqual(upgraded.placements.find((item) => item.id === "living-kaleo-chair-east")?.position, { x: 2.9, z: 5.7 });
  assert.equal(upgradeRetiredDiningGroup(upgraded), upgraded);
});

test("moves the current dining group toward the refrigerator and kitchen once", () => {
  const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const previousPositions = new Map([
    ["living-bozan-table", { x: 2.35, z: 5.42 }],
    ["living-kaleo-chair-west", { x: 1.65, z: 5.42 }],
    ["living-kaleo-chair-east", { x: 3.05, z: 5.42 }],
    ["living-kaleo-chair-south", { x: 2.35, z: 6.12 }],
  ]);
  for (const item of stale.placements) {
    const previous = previousPositions.get(item.id);
    if (previous) item.position = previous;
  }

  const upgraded = upgradeRetiredDiningGroup(stale);

  assert.notEqual(upgraded, stale);
  assert.deepEqual(upgraded.placements.find((item) => item.id === "living-bozan-table")?.position, { x: 2.2, z: 5.7 });
  assert.deepEqual(upgraded.placements.find((item) => item.id === "living-kaleo-chair-south")?.position, { x: 1.5, z: 5.7 });
  assert.equal(upgradeRetiredDiningGroup(upgraded), upgraded);
});

test("rebases an older Wohnung save onto corrected architecture without losing user furniture", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  old.builtIns = old.builtIns.filter((item) => item.catalogId !== "living-tv" && item.catalogId !== "living-floating-cabinet");
  old.fixtures = old.fixtures.filter((item) => item.kind !== "blind-control");
  old.rooms.find((room) => room.id === "zimmer1")!.surfaces.floor = "screen-black";
  old.placements.push({
    id: "user-living-sofa",
    roomId: "wohnkueche",
    catalogId: "sofa-3seat",
    position: { x: 2.2, z: 6.8 },
    rotation: 0,
    size: { width: 1.8, depth: 0.8, height: 0.82 },
  });
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });
  const result = createLocalStoragePlannerRepository(storage, fixedClock).load();

  assert.ok(result.document.builtIns.some((item) => item.catalogId === "living-tv"));
  assert.ok(result.document.fixtures.some((item) => item.kind === "blind-control"));
  assert.ok(result.document.placements.some((item) => item.id === "user-living-sofa"));
  assert.equal(result.document.rooms.find((room) => room.id === "zimmer1")?.surfaces.floor, "parquet-oak-narrow");
  assert.ok(result.warnings.some((warning) => /aktualisiert/i.test(warning)));
});

test("moves an old active Loggia view to the merged balcony room", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const balcony = old.rooms.find((room) => room.id === "balkon")!;
  old.rooms.push({ ...structuredClone(balcony), id: "loggia", name: "Loggia", area: 2.23 });
  old.builtIns = old.builtIns.filter((item) => item.id !== "builtin-kitchen-fridge");
  old.viewPreferences.activeRoomId = "loggia";
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });

  const result = createLocalStoragePlannerRepository(storage, fixedClock).load();

  assert.equal(result.document.viewPreferences.activeRoomId, "balkon");
  assert.equal(result.document.rooms.some((room) => room.id === "loggia"), false);
});

test("refreshes a moved hall intercom from the corrected photo-based position", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const intercom = old.fixtures.find((item) => item.id === "fixture-hall-intercom")!;
  intercom.position.z = 7.8;
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });

  const result = createLocalStoragePlannerRepository(storage, fixedClock).load();

  assert.equal(
    result.document.fixtures.find((item) => item.id === "fixture-hall-intercom")?.position.z,
    DEFAULT_APARTMENT_DOCUMENT.fixtures.find((item) => item.id === "fixture-hall-intercom")?.position.z,
  );
  assert.ok(result.warnings.some((warning) => /aktualisiert/i.test(warning)));
});

test("refreshes an older solid hall-to-living door to the photographed glass door", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const door = old.openings.find((item) => item.id === "hall-living-door")! as typeof old.openings[number] & { visualStyle?: string };
  delete door.visualStyle;
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });

  const result = createLocalStoragePlannerRepository(storage, fixedClock).load();
  const refreshed = result.document.openings.find((item) => item.id === "hall-living-door") as typeof door;

  assert.equal(refreshed.visualStyle, "glass-clear");
  assert.ok(result.warnings.some((warning) => /aktualisiert/i.test(warning)));
});

test("refreshes an older bathroom door to the requested half-open presentation once", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const door = old.openings.find((item) => item.id === "hall-bath-door")! as typeof old.openings[number] & { visualOpenFraction?: number };
  delete door.visualOpenFraction;
  old.doorStates["hall-bath-door"] = "closed";
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });

  const result = createLocalStoragePlannerRepository(storage, fixedClock).load();
  const refreshed = result.document.openings.find((item) => item.id === "hall-bath-door") as typeof door;

  assert.equal(refreshed.visualOpenFraction, 0.5);
  assert.equal(result.document.doorStates["hall-bath-door"], "open");
  assert.ok(result.warnings.some((warning) => /aktualisiert/i.test(warning)));
});

test("migrates raw v2 data and reports corrupted or schema-invalid data", () => {
  const storage = new MemoryStorage();
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  storage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({
    zimmer1: [{ id: "desk", type: "desk", x: 1, y: 1, w: 1.2, d: 0.6, h: 0.75, rotation: 0 }],
  }));
  assert.ok(repository.load().document.placements.some((item) => item.catalogId === "desk-standard"));

  storage.setItem(PLANNER_STORAGE_KEY, "{kaputt");
  const corrupted = repository.load();
  assert.equal(corrupted.document, DEFAULT_APARTMENT_DOCUMENT);
  assert.ok(corrupted.warnings.some((warning) => warning.includes("JSON")));

  storage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({ schemaVersion: 3, id: "broken" }));
  const invalid = repository.load();
  assert.equal(invalid.document, DEFAULT_APARTMENT_DOCUMENT);
  assert.ok(invalid.warnings.length > 0);
});

test("durably preserves legacy source data before autosave replaces the current value", () => {
  const legacyJson = JSON.stringify({
    zimmer1: [
      { id: "known", type: "desk", x: 1, y: 1, w: 1.2, d: 0.6, h: 0.75, rotation: 0 },
      { id: "unknown", type: "teleporter", x: 2, y: 1, w: 1, d: 1, h: 1, rotation: 0 },
    ],
  });
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: legacyJson });
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);

  const migrated = repository.load();
  repository.save(migrated.document);

  const reloaded = createLocalStoragePlannerRepository(storage, fixedClock);
  assert.equal(reloaded.getMigrationBackup(), legacyJson);
  assert.equal(storage.getItem(PLANNER_MIGRATION_BACKUP_KEY), legacyJson);
  assert.equal(JSON.parse(storage.getItem(PLANNER_STORAGE_KEY)!).schemaVersion, 3);
});

test("preserves an imported legacy payload before committing its migration", () => {
  const storage = new MemoryStorage();
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  const legacy = { zimmer1: [{ id: "desk", type: "desk", x: 1, y: 1, w: 1, d: 0.6, h: 0.75, rotation: 0 }] };

  repository.commitImport(repository.previewImport(legacy));

  assert.deepEqual(JSON.parse(repository.getImportSourceBackup()!), legacy);
});

test("preserves both a malformed current source and a separately imported legacy source", () => {
  const malformedCurrent = "{kaputt";
  const imported = { zimmer1: [{ id: "desk", type: "desk", x: 1, y: 1, w: 1, d: 0.6, h: 0.75, rotation: 0 }] };
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: malformedCurrent });
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);

  repository.commitImport(repository.previewImport(imported));

  assert.equal(repository.getMigrationBackup(), malformedCurrent);
  assert.deepEqual(JSON.parse(repository.getImportSourceBackup()!), imported);
  assert.equal(storage.getItem(PLANNER_IMPORT_SOURCE_BACKUP_KEY), repository.getImportSourceBackup());
});

test("backs up the last valid document before atomically overwriting it", () => {
  const first = documentNamed("Erster Stand");
  const second = documentNamed("Zweiter Stand");
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(first) });
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);

  const saved = repository.save(second);
  assert.equal(saved.updatedAt, "2026-10-24T12:00:00.000Z");
  assert.equal(JSON.parse(storage.getItem(PLANNER_BACKUP_KEY)!).name, "Erster Stand");
  assert.equal(JSON.parse(storage.getItem(PLANNER_STORAGE_KEY)!).name, "Zweiter Stand");
});

test("rolls current document and backup back when storage throws", () => {
  const first = documentNamed("Sicherer Stand");
  const priorBackup = documentNamed("Alte Sicherung");
  const storage = new MemoryStorage({
    [PLANNER_STORAGE_KEY]: JSON.stringify(first),
    [PLANNER_BACKUP_KEY]: JSON.stringify(priorBackup),
  });
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  storage.failNextWriteTo(PLANNER_STORAGE_KEY);

  assert.throws(() => repository.save(documentNamed("Nicht gespeichert")), /quota/i);
  assert.equal(JSON.parse(storage.getItem(PLANNER_STORAGE_KEY)!).name, "Sicherer Stand");
  assert.equal(JSON.parse(storage.getItem(PLANNER_BACKUP_KEY)!).name, "Alte Sicherung");
});

test("previews imports without mutation and commits only an accepted preview", () => {
  const original = documentNamed("Original");
  const imported = documentNamed("Import");
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(original) });
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);

  const preview = repository.previewImport(imported);
  assert.equal(preview.canCommit, true);
  assert.equal(preview.document.name, "Import");
  assert.equal(JSON.parse(storage.getItem(PLANNER_STORAGE_KEY)!).name, "Original");

  repository.commitImport(preview);
  assert.equal(JSON.parse(storage.getItem(PLANNER_STORAGE_KEY)!).name, "Import");

  const rejected = repository.previewImport({ schemaVersion: 3, id: "bad" });
  assert.equal(rejected.canCommit, false);
  assert.throws(() => repository.commitImport(rejected), /nicht importiert/i);
});

test("hydrates, imports with history reset, and restores a valid backup", () => {
  const storage = new MemoryStorage({
    [PLANNER_STORAGE_KEY]: JSON.stringify(documentNamed("Gespeichert")),
    [PLANNER_BACKUP_KEY]: JSON.stringify(documentNamed("Sicherung")),
  });
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT, repository, autosaveDelayMs: 5 });

  store.getState().hydrate();
  assert.equal(store.getState().document.name, "Gespeichert");

  store.getState().dispatch({
    type: "setSurfaceMaterial",
    roomId: "zimmer1",
    surface: "floor",
    materialId: "oak-light",
  });
  assert.equal(store.getState().canUndo, true);

  const preview = repository.previewImport(documentNamed("Importiert"));
  store.getState().importDocument(preview);
  assert.equal(store.getState().document.name, "Importiert");
  assert.equal(store.getState().canUndo, false);

  storage.setItem(PLANNER_BACKUP_KEY, JSON.stringify(documentNamed("Sicherung")));
  store.getState().restoreBackup();
  assert.equal(store.getState().document.name, "Sicherung");
  assert.equal(store.getState().canUndo, false);
});

test("debounces document autosaves and ignores camera and panel changes", async () => {
  const saved: PlannerDocumentV3[] = [];
  const repository = repositorySpy(saved);
  const store = createPlannerStore({
    initialDocument: DEFAULT_APARTMENT_DOCUMENT,
    repository,
    autosaveDelayMs: 15,
  });
  store.getState().dispatch({
    type: "setSurfaceMaterial",
    roomId: "zimmer1",
    surface: "floor",
    materialId: "oak-light",
  });
  store.getState().dispatch({
    type: "setSurfaceMaterial",
    roomId: "zimmer1",
    surface: "floor",
    materialId: "oak-natural",
  });
  store.getState().setCameraMode("walk");
  store.getState().setPanel("details", true);
  await delay(35);

  assert.equal(saved.length, 1);
  assert.equal(saved[0].rooms.find((room) => room.id === "zimmer1")?.surfaces.floor, "oak-natural");
  assert.equal(store.getState().autosaveStatus, "saved");
});

test("keeps the edited store document intact when autosave fails", async () => {
  const repository = repositorySpy([], true);
  const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT, repository, autosaveDelayMs: 5 });
  store.getState().dispatch({
    type: "setSurfaceMaterial",
    roomId: "zimmer1",
    surface: "floor",
    materialId: "oak-light",
  });
  await delay(20);

  assert.equal(
    store.getState().document.rooms.find((room) => room.id === "zimmer1")?.surfaces.floor,
    "oak-light",
  );
  assert.equal(store.getState().autosaveStatus, "error");
});

function documentNamed(name: string): PlannerDocumentV3 {
  return structuredClone({ ...DEFAULT_APARTMENT_DOCUMENT, name });
}

function fixedClock() {
  return new Date("2026-10-24T12:00:00.000Z");
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function repositorySpy(saved: PlannerDocumentV3[], fail = false): PlannerRepository {
  return {
    load: () => ({ document: DEFAULT_APARTMENT_DOCUMENT, warnings: [], legacyBackupJson: null, unmapped: [] }),
    save(document) {
      if (fail) throw new Error("quota exceeded");
      saved.push(document);
      return document;
    },
    restoreBackup: () => null,
    getMigrationBackup: () => null,
    getImportSourceBackup: () => null,
    previewImport: () => ({
      document: DEFAULT_APARTMENT_DOCUMENT,
      warnings: [],
      legacyBackupJson: null,
      unmapped: [],
      canCommit: true,
    }),
    commitImport: (preview) => preview.document,
  };
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  private failKey: string | null = null;

  constructor(initial: Record<string, string> = {}) {
    Object.entries(initial).forEach(([key, value]) => this.values.set(key, value));
  }

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (this.failKey === key) {
      this.failKey = null;
      throw new Error("Quota exceeded");
    }
    this.values.set(key, value);
  }
  failNextWriteTo(key: string) { this.failKey = key; }
}
