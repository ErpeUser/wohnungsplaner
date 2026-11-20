import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import {
  PLANNER_BACKUP_KEY,
  PLANNER_MIGRATION_BACKUP_KEY,
  PLANNER_IMPORT_SOURCE_BACKUP_KEY,
  PLANNER_STORAGE_KEY,
  createLocalStoragePlannerRepository,
  upgradeRetiredDiningGroup,
  upgradeLivingRugMaterial,
  upgradeLivingSofaRugGroup,
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

test("loads an earlier apartment storage namespace without losing personal furniture or backups", () => {
  const saved = documentNamed("Mein erhaltener Entwurf");
  saved.id = "wohnung-top-73-v3";
  const movedBed = saved.placements.find((item) => item.id === "zimmer1-bliss-bed")!;
  movedBed.position.x += 0.2;
  saved.placements = saved.placements.filter((item) => item.id !== "zimmer1-olive-plant");
  const previousJson = JSON.stringify(saved);
  const storage = new MemoryStorage({
    "wohnung-top73-planner-v3": previousJson,
    "wohnung-top73-planner-v3-backup": previousJson,
  });
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  const loaded = repository.load().document;
  assert.equal(loaded.name, "Mein erhaltener Entwurf");
  assert.equal(loaded.id, "wohnung-v3");
  assert.deepEqual(loaded.placements, JSON.parse(previousJson).placements);
  assert.equal(repository.restoreBackup()?.document.name, "Mein erhaltener Entwurf");
  repository.save(loaded);
  assert.equal(storage.getItem("wohnung-top73-planner-v3"), previousJson);
  assert.equal(JSON.parse(storage.getItem("wohnung-planner-v3")!).name, "Mein erhaltener Entwurf");
});

test("persists the imported asset register across reload", () => {
  const storage = new MemoryStorage();
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  const document = parseAssetRegisterFixture();
  repository.save(document);
  const reloaded = repository.load().document;
  assert.equal(reloaded.assets?.[0]?.assetId, document.assets?.[0]?.assetId);
  assert.equal(reloaded.assets?.[0]?.assetUrl, "https://storage.example/assets/chair.glb");
});

test("bewahrt eine ausgewählte Tischvariante über Save und Reload", () => {
  const storage = new MemoryStorage();
  const repository = createLocalStoragePlannerRepository(storage, fixedClock);
  const switched = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "setPlacementProduct",
    placementId: "living-bozan-table",
    catalogId: "dining-table-kaufland-567080013-120-160",
    size: { width: 1.6, depth: 0.8, height: 0.755 },
    materialId: "walnut",
    metadata: { source: "Kaufland.at Produkt 567080013", confidence: "confirmed", notes: ["160 × 80 × 75,5 cm"] },
  });
  assert.equal(switched.error, undefined);
  repository.save(switched.document);
  const reloaded = repository.load().document;
  const table = reloaded.placements.find((item) => item.id === "living-bozan-table")!;
  assert.equal(table.catalogId, "dining-table-kaufland-567080013-120-160");
  assert.deepEqual(table.size, { width: 1.6, depth: 0.8, height: 0.755 });
  assert.equal(table.materialVariants?.main, "walnut");
});

test("replaces the two retired Amber placeholders in a live document with four Kaleo chairs", () => {
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
  assert.equal(chairs.length, 4);
  assert.deepEqual(
    chairs.map((item) => item.id).toSorted(),
    [
      "living-kaleo-chair-east",
      "living-kaleo-chair-north",
      "living-kaleo-chair-south",
      "living-kaleo-chair-west",
    ],
  );
  assert.equal(upgradeRetiredDiningGroup(upgraded), upgraded);
});

test("keeps a deliberately removed fourth chair removed after migration", () => {
  const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  stale.placements = stale.placements.filter((item) => item.id !== "living-kaleo-chair-north");

  const upgraded = upgradeRetiredDiningGroup(stale);

  assert.equal(upgraded, stale);
  assert.equal(upgraded.placements.some((item) => item.id === "living-kaleo-chair-north"), false);
});

test("keeps a deliberately removed fourth chair removed through repository reload", () => {
  const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  stale.placements = stale.placements.filter((item) => item.id !== "living-kaleo-chair-north");
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(stale) });
  const loaded = createLocalStoragePlannerRepository(storage, fixedClock).load();

  assert.equal(loaded.document.placements.some((item) => item.id === "living-kaleo-chair-north"), false);
});

test("ergänzt einen fehlenden vierten Stuhl in einem alten Drei-Stuhl-Save einmalig", () => {
  const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  stale.placements = stale.placements.filter((item) => item.id !== "living-kaleo-chair-north");
  const table = stale.placements.find((item) => item.id === "living-bozan-table")!;
  table.metadata = { ...table.metadata, notes: table.metadata?.notes?.filter((note) => !/Vier Kaleo/i.test(note)) };

  const upgraded = upgradeRetiredDiningGroup(stale);

  assert.notEqual(upgraded, stale);
  assert.equal(upgraded.placements.filter((item) => item.catalogId === "chair-kaleo-chenille-beige").length, 4);
  assert.ok(upgraded.placements.some((item) => item.id === "living-kaleo-chair-north"));
  assert.equal(upgradeRetiredDiningGroup(upgraded), upgraded);
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

test("upgrades a previous living room rug material without moving a customized rug", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const rug = old.placements.find((item) => item.id === "living-rug-concept")!;
  rug.position = { x: 1.6, z: 7.72 };
  rug.rotation = 10;
  rug.materialVariants = { main: "rug-living-ivory-greige" };
  const updated = upgradeLivingRugMaterial(old);
  const newRug = updated.placements.find((item) => item.id === rug.id)!;
  assert.equal(newRug.materialVariants?.main, "rug-temu-vintage-cream");
  assert.deepEqual(newRug.position, { x: 1.6, z: 7.72 });
  assert.equal(newRug.rotation, 10);
  assert.equal(upgradeLivingRugMaterial(updated), updated);
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });
  const loaded = createLocalStoragePlannerRepository(storage, fixedClock).load();
  assert.deepEqual(loaded.document.placements.find((item) => item.id === rug.id)?.position, { x: 1.6, z: 7.72 });
  assert.equal(loaded.document.placements.find((item) => item.id === rug.id)?.materialVariants?.main, "rug-temu-vintage-cream");
});


test("preserves a moved sofa while unlinking it from the living rug group", () => {
  const moved = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const rug = moved.placements.find((item) => item.id === "living-rug-concept")!;
  const sofa = moved.placements.find((item) => item.id === "living-chicago-sofa")!;
  rug.groupId = "living-sofa-rug-group";
  sofa.groupId = "living-sofa-rug-group";
  sofa.position = { x: 2.8, z: 7.3 };

  const upgraded = upgradeLivingSofaRugGroup(moved);
  const upgradedRug = upgraded.placements.find((item) => item.id === rug.id)!;
  const upgradedSofa = upgraded.placements.find((item) => item.id === sofa.id)!;

  assert.deepEqual(upgradedSofa.position, { x: 2.8, z: 7.3 });
  assert.equal(upgradedSofa.groupId, undefined);
  assert.equal(upgradedRug.groupId, undefined);
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

test("refreshes an older bathroom door to the requested fully open presentation once", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const door = old.openings.find((item) => item.id === "hall-bath-door")! as typeof old.openings[number] & { visualOpenFraction?: number };
  delete door.visualOpenFraction;
  old.doorStates["hall-bath-door"] = "closed";
  const storage = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });

  const result = createLocalStoragePlannerRepository(storage, fixedClock).load();
  const refreshed = result.document.openings.find((item) => item.id === "hall-bath-door") as typeof door;

  assert.equal(refreshed.visualOpenFraction, 1);
  assert.equal(result.document.doorStates["hall-bath-door"], "open");
  assert.ok(result.warnings.some((warning) => /aktualisiert/i.test(warning)));
});

test("migrates saved WC rugs from marketing-image material to seamless waffle finish", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const wcRug = old.builtIns.find((item) => item.id === "builtin-wc-mat")!;
  const bathRug = old.builtIns.find((item) => item.id === "builtin-bath-mat")!;
  wcRug.materialVariants = { main: "bath-mat-shaggy-cream" };
  wcRug.rotation = 90;
  bathRug.materialVariants = { main: "bath-mat-shaggy-cream" };
  const stored = new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) });
  const upgraded = createLocalStoragePlannerRepository(stored, fixedClock).load();
  assert.equal(upgraded.document.builtIns.find((item) => item.id === "builtin-wc-mat")?.materialVariants?.main, "temu-bath-rug-woven");
  assert.equal(upgraded.document.builtIns.find((item) => item.id === "builtin-bath-mat")?.materialVariants?.main, "temu-bath-rug-woven");
  assert.equal(upgraded.document.builtIns.find((item) => item.id === "builtin-wc-mat")?.rotation, 0);
  assert.ok(upgraded.warnings.some((warning) => /aktualisiert/.test(warning)));
  assert.equal(upgraded.document.placements.length, old.placements.length, "no furniture is removed");
});

test("restores current WC shelf and replaces obsolete bathroom hook rail in saved layouts", () => {
  const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  old.builtIns = old.builtIns.filter((item) => item.id !== "builtin-wc-paper-holder");
  const hooks = old.builtIns.find((item) => item.id === "builtin-bath-towel-hook-rail")!;
  hooks.catalogId = "bath-towel-hook-rail";
  hooks.materialVariants = { main: "chrome-polished" };
  const upgraded = createLocalStoragePlannerRepository(
    new MemoryStorage({ [PLANNER_STORAGE_KEY]: JSON.stringify(old) }), fixedClock,
  ).load().document;
  assert.equal(upgraded.builtIns.filter((item) => item.id === "builtin-wc-paper-holder").length, 1);
  assert.equal(upgraded.builtIns.find((item) => item.id === "builtin-bath-towel-hook-rail")?.catalogId, "bath-towel-hooks-wood-black");
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

function parseAssetRegisterFixture(): PlannerDocumentV3 {
  return {
    ...structuredClone(DEFAULT_APARTMENT_DOCUMENT),
    assets: [{
      assetId: "import-chair-aaaaaaaaaaaa",
      name: "Import Chair",
      category: "Sitzen",
      mediaType: "model/gltf-binary",
      byteLength: 128,
      sha256: "a".repeat(64),
      normalizedSize: { width: 0.8, depth: 0.8, height: 0.9 },
      floorOffset: 0,
      pivot: "center",
      materialId: "object-neutral",
      assetUrl: "https://storage.example/assets/chair.glb",
      license: "CC0-1.0",
      source: "manual-import",
      confidence: "estimated",
      notes: [],
      createdAt: "2026-11-10T00:00:00.000Z",
    }],
  };
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
