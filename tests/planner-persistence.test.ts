import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import {
  PLANNER_BACKUP_KEY,
  PLANNER_MIGRATION_BACKUP_KEY,
  PLANNER_STORAGE_KEY,
  createLocalStoragePlannerRepository,
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

  assert.deepEqual(JSON.parse(repository.getMigrationBackup()!), legacy);
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
    materialId: "oak-test",
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
    materialId: "failure-still-visible",
  });
  await delay(20);

  assert.equal(
    store.getState().document.rooms.find((room) => room.id === "zimmer1")?.surfaces.floor,
    "failure-still-visible",
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
