import { DEFAULT_APARTMENT_DOCUMENT } from "../domain/apartment-v3.ts";
import {
  migrateStoredPlannerData,
  type MigrationResult,
} from "../domain/migration.ts";
import { parsePlannerDocument } from "../domain/schema.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";

export const PLANNER_STORAGE_KEY = "wohnung-planner-v3";
export const PLANNER_BACKUP_KEY = "wohnung-planner-v3-backup";
export const PLANNER_MIGRATION_BACKUP_KEY = "wohnung-planner-v3-migration-backup";
export const PLANNER_IMPORT_SOURCE_BACKUP_KEY = "wohnung-planner-v3-import-source-backup";

const BASELINE_VISUAL_REFRESH_IDS = new Set([
  "builtin-kitchen-tile-north",
  "builtin-kitchen-tile-west",
  "builtin-kitchen-base-north",
  "builtin-kitchen-base-west",
  "builtin-kitchen-corner-base",
  "builtin-kitchen-worktop-north",
  "builtin-kitchen-worktop-west",
  "builtin-kitchen-worktop-corner",
  "builtin-kitchen-upper-north",
  "builtin-kitchen-upper-west",
  "builtin-kitchen-upper-west-end",
  "builtin-kitchen-corner-shelf",
  "builtin-kitchen-backsplash",
  "builtin-kitchen-backsplash-west",
  "builtin-kitchen-sink",
  "builtin-kitchen-hob",
  "builtin-kitchen-oven",
  "builtin-kitchen-hood",
  "builtin-kitchen-microwave",
  "builtin-kitchen-fridge",
  "builtin-living-tv-slats",
  "builtin-living-tv",
  "builtin-living-floating-cabinet",
  "builtin-bath-washer",
  "builtin-bath-basin-cabinet-scout",
  "builtin-bath-washer-cabinet-scout",
  "builtin-bath-shower-set",
  "builtin-bath-tub-apron",
  "builtin-bath-tub-end-ledge",
  "builtin-bath-tub-side-apron",
  "builtin-bath-round-mirror",
  "builtin-bath-mat",
  "builtin-wc-mat",
  "builtin-bath-towel-hook-rail",
  "builtin-bath-shower-rod",
  "builtin-bath-shower-curtain",
  "builtin-wc-paper-holder",
  "builtin-z1-bed-accent-wall",
  "builtin-z1-entry-wallpaper-return",
  "builtin-z1-entry-wallpaper-door-strip",
  "builtin-z1-entry-slim-art",
  "builtin-z1-wall-art-pair",
  "builtin-z1-headboard-led",
  "builtin-z1-headboard-sconces",
  "builtin-z1-layered-curtain",
  "builtin-z1-vanity-shelf-main",
  "builtin-z1-vanity-shelf-side-upper",
  "builtin-z1-vanity-shelf-side-lower",
  "builtin-z1-entry-niche",
  "builtin-z1-wardrobe-top-decor",
  "builtin-z1-nightstand-decor",
  "builtin-hall-wall-decor",
]);

const RETIRED_BASELINE_BUILT_IN_IDS = new Set([
  "builtin-z1-entry-mirror-console",
  "builtin-z1-desk-mirror",
  "builtin-z1-desk-shelf",
  "builtin-z1-desk-accessories",
  "builtin-z1-curtain-north",
  "builtin-z1-curtain-south",
  "builtin-z1-wall-panel",
  "builtin-wc-brush",
]);

const RETIRED_BASELINE_OPENING_IDS = new Set([
  "hall-living-inner-passage",
]);

const RETIRED_BASELINE_PLACEMENT_IDS = new Set([
  "zimmer1-bed",
  "zimmer1-cloudy-bed",
  "zimmer1-soft-rug",
  "living-sectional",
  "living-kylly-sofa",
  "living-amber-chair-west",
  "living-amber-chair-east",
]);

const RETIRED_DINING_PLACEMENT_IDS = new Set([
  "living-amber-chair-west",
  "living-amber-chair-east",
]);

const CURRENT_DINING_GROUP_IDS = new Set([
  "living-bozan-table",
  "living-kaleo-chair-west",
  "living-kaleo-chair-east",
  "living-kaleo-chair-south",
  "living-kaleo-chair-north",
]);

const LEGACY_DINING_GROUP_POSITION_SETS = [
  new Map([
    ["living-bozan-table", { x: 2.5, z: 5.47 }],
    ["living-kaleo-chair-west", { x: 1.8, z: 5.47 }],
    ["living-kaleo-chair-east", { x: 3.2, z: 5.47 }],
    ["living-kaleo-chair-south", { x: 2.5, z: 6.17 }],
  ]),
  new Map([
    ["living-bozan-table", { x: 2.35, z: 5.47 }],
    ["living-kaleo-chair-west", { x: 1.65, z: 5.47 }],
    ["living-kaleo-chair-east", { x: 3.05, z: 5.47 }],
    ["living-kaleo-chair-south", { x: 2.35, z: 6.17 }],
  ]),
  new Map([
    ["living-bozan-table", { x: 2.35, z: 5.42 }],
    ["living-kaleo-chair-west", { x: 1.65, z: 5.42 }],
    ["living-kaleo-chair-east", { x: 3.05, z: 5.42 }],
    ["living-kaleo-chair-south", { x: 2.35, z: 6.12 }],
  ]),
];

const BASELINE_VISUAL_PLACEMENT_REFRESH_IDS = new Set([
  "zimmer1-bliss-bed",
  "zimmer1-wardrobe",
  "zimmer1-temu-shaggy-rug",
  // The rug gets a targeted material migration so customized coordinates survive.
  "zimmer1-desk",
  "zimmer1-chair",
  "zimmer1-led-nightstand",
  "zimmer1-olive-plant",
  "living-chicago-sofa",
  "living-bozan-table",
  "living-kaleo-chair-west",
  "living-kaleo-chair-east",
  "living-kaleo-chair-south",
  "living-kaleo-chair-north",
  "vorraum-temu-rabbit-rug",
  "hall-tejo-wardrobe",
]);

const BASELINE_VISUAL_FIXTURE_REFRESH_IDS = new Set([
  "fixture-z1-switch",
  "fixture-z1-blind",
  "fixture-z1-outlet-west",
  "fixture-hall-intercom",
  "fixture-hall-switch",
  "fixture-hall-outlet",
  "fixture-hall-panel",
  "fixture-living-outlet-west",
  "fixture-wc-switch",
  "fixture-store-switch",
  "fixture-balcony-outlet",
]);

export type PlannerImportPreview = MigrationResult & {
  canCommit: boolean;
};

export function upgradeRetiredDiningGroup(document: PlannerDocumentV3): PlannerDocumentV3 {
  const containsRetiredChair = document.placements.some((item) => RETIRED_DINING_PLACEMENT_IDS.has(item.id));
  const hasLegacyPosition = LEGACY_DINING_GROUP_POSITION_SETS.some((positions) => (
    [...positions].every(([id, position]) => {
      const item = document.placements.find((candidate) => candidate.id === id);
      return item
        && Math.abs(item.position.x - position.x) < 0.001
        && Math.abs(item.position.z - position.z) < 0.001;
    })
  ));
  let upgraded = document;
  if (containsRetiredChair || hasLegacyPosition) {
    const currentGroup = DEFAULT_APARTMENT_DOCUMENT.placements.filter((item) => CURRENT_DINING_GROUP_IDS.has(item.id));
    upgraded = parsePlannerDocument({
      ...document,
      placements: [
        ...document.placements.filter((item) => (
          !RETIRED_DINING_PLACEMENT_IDS.has(item.id) && !CURRENT_DINING_GROUP_IDS.has(item.id)
        )),
        ...currentGroup,
      ],
    });
  }
  const table = upgraded.placements.find((item) => item.id === "living-bozan-table");
  const defaultNorth = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-kaleo-chair-north");
  const hasMigrationMarker = table?.metadata?.notes?.some((note) => /Vier Kaleo-Armlehnstühle/i.test(note));
  if (!table || !defaultNorth || hasMigrationMarker || upgraded.placements.some((item) => item.id === defaultNorth.id)) {
    return upgraded;
  }
  return parsePlannerDocument({
    ...upgraded,
    placements: [
      ...upgraded.placements,
      defaultNorth,
    ].map((item) => item.id === table.id
      ? { ...item, metadata: { ...item.metadata, notes: [...(item.metadata?.notes ?? []), "Vier Kaleo-Armlehnstühle sind als aktuelle Essgruppe markiert."] } }
      : item),
  });
}

/**
 * Unlinks the living sofa and rug so each can be dragged independently.
 * Older default saves are still moved to the measured inner face of the
 * 358-cm south wall while customized positions are preserved.
 */
export function upgradeLivingSofaRugGroup(document: PlannerDocumentV3): PlannerDocumentV3 {
  const rug = document.placements.find((item) => item.id === "living-rug-concept");
  const sofa = document.placements.find((item) => item.id === "living-chicago-sofa");
  if (!rug || !sofa) return document;

  const legacyDefault = Math.abs(rug.position.x - 1.55) < 0.001
    && Math.abs(rug.position.z - 7.75) < 0.001
    && Math.abs(sofa.position.x - 2.2) < 0.001
    && Math.abs(sofa.position.z - 7.82) < 0.001;
  const currentSofa = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === sofa.id);
  // The Chicago placeholder was replaced by the sourced AliExpress sofa.
  // Upgrade it even when the user has already moved the old sofa, while
  // preserving that user's position, rotation and grouping.
  const legacySofaModel = sofa.catalogId === "sofa-chicago-206"
    && Boolean(currentSofa && sofa.catalogId !== currentSofa.catalogId);
  const needsUnlink = legacyDefault || Boolean(rug.groupId) || Boolean(sofa.groupId);
  if (!needsUnlink && !legacySofaModel) return document;
  const next = document.placements.map((item) => {
    if (item.id === rug.id) {
      return {
        ...item,
        groupId: undefined,
        position: legacyDefault ? { x: 1.55, z: 7.99 } : item.position,
      };
    }
    if (item.id === sofa.id) {
      return {
        ...item,
        ...(legacySofaModel && currentSofa ? {
          catalogId: currentSofa.catalogId,
          size: currentSofa.size,
          materialVariants: currentSofa.materialVariants,
          metadata: currentSofa.metadata,
        } : {}),
        groupId: undefined,
        position: legacyDefault ? { x: 2.2, z: 8.06 } : item.position,
      };
    }
    return item;
  });
  const changed = next.some((item, index) => item !== document.placements[index]);
  return changed ? parsePlannerDocument({ ...document, placements: next }) : document;
}

export type PlannerRepository = {
  load(): MigrationResult;
  save(document: PlannerDocumentV3): PlannerDocumentV3;
  restoreBackup(): MigrationResult | null;
  getMigrationBackup(): string | null;
  getImportSourceBackup(): string | null;
  previewImport(value: unknown): PlannerImportPreview;
  commitImport(preview: PlannerImportPreview): PlannerDocumentV3;
};

export function createLocalStoragePlannerRepository(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  clock: () => Date = () => new Date(),
): PlannerRepository {
  return {
    load() {
      const raw = storage.getItem(PLANNER_STORAGE_KEY);
      if (raw === null) return emptyResult();
      const result = readStoredValue(raw);
      if (result.legacyBackupJson !== null) {
        storage.setItem(PLANNER_MIGRATION_BACKUP_KEY, result.legacyBackupJson);
      }
      return result;
    },

    save(document) {
      const valid = parsePlannerDocument(document);
      const persisted = parsePlannerDocument({ ...valid, updatedAt: clock().toISOString() });
      const nextJson = JSON.stringify(persisted);
      const previousCurrent = storage.getItem(PLANNER_STORAGE_KEY);
      const previousBackup = storage.getItem(PLANNER_BACKUP_KEY);
      const previousMigrationBackup = storage.getItem(PLANNER_MIGRATION_BACKUP_KEY);
      const validCurrent = validDocumentJson(previousCurrent);

      try {
        if (previousCurrent !== null && validCurrent === null) {
          storage.setItem(PLANNER_MIGRATION_BACKUP_KEY, previousCurrent);
        }
        if (validCurrent !== null) storage.setItem(PLANNER_BACKUP_KEY, validCurrent);
        storage.setItem(PLANNER_STORAGE_KEY, nextJson);
      } catch (error) {
        restoreValue(storage, PLANNER_STORAGE_KEY, previousCurrent);
        restoreValue(storage, PLANNER_BACKUP_KEY, previousBackup);
        restoreValue(storage, PLANNER_MIGRATION_BACKUP_KEY, previousMigrationBackup);
        throw error;
      }
      return persisted;
    },

    restoreBackup() {
      const raw = storage.getItem(PLANNER_BACKUP_KEY);
      return raw === null ? null : readStoredValue(raw);
    },

    getMigrationBackup() {
      return storage.getItem(PLANNER_MIGRATION_BACKUP_KEY);
    },

    getImportSourceBackup() {
      return storage.getItem(PLANNER_IMPORT_SOURCE_BACKUP_KEY);
    },

    previewImport(value) {
      const migration = migrateStoredPlannerData(value, DEFAULT_APARTMENT_DOCUMENT);
      return {
        ...migration,
        canCommit: isValidV3(value) || isRecognizedLegacyDocument(value),
      };
    },

    commitImport(preview) {
      if (!preview.canCommit) {
        throw new Error("Diese Vorschau kann nicht importiert werden.");
      }
      if (preview.legacyBackupJson !== null) {
        storage.setItem(PLANNER_IMPORT_SOURCE_BACKUP_KEY, preview.legacyBackupJson);
      }
      return this.save(preview.document);
    },
  };
}

function readStoredValue(raw: string): MigrationResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {
      document: DEFAULT_APARTMENT_DOCUMENT,
      warnings: ["Die gespeicherten Daten enthalten ungültiges JSON und wurden nicht geladen."],
      legacyBackupJson: raw,
      unmapped: [{ roomId: "unknown", reason: "invalid-json", value: raw }],
    };
  }
  if (value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 3) {
    try {
      const normalized = normalizeLegacyV3Aliases(value);
      const parsed = parsePlannerDocument(normalized.document);
      const withRug = upgradeLivingRugMaterial(parsed);
      if (isOlderBaselineModel(withRug)) {
        return {
          document: rebaseBaselineModel(withRug),
          warnings: ["Das gespeicherte Möbel-Layout und die Bad-/WC-Materialien wurden auf den aktuellen Stand aktualisiert."],
          legacyBackupJson: raw,
          unmapped: [],
        };
      }
      if (normalized.changed || withRug !== parsed) {
        return {
          document: withRug,
          warnings: [normalized.changed
            ? "Das gespeicherte Dokument wurde auf die zusammengeführte Balkon-/Loggia-Struktur aktualisiert."
            : "Der vorhandene Wohnzimmerteppich wurde auf das neue Temu-Design aktualisiert; Position und Drehung bleiben erhalten."],
          legacyBackupJson: raw,
          unmapped: [],
        };
      }
      return {
        document: parsed,
        warnings: [],
        legacyBackupJson: null,
        unmapped: [],
      };
    } catch (error) {
      return {
        document: DEFAULT_APARTMENT_DOCUMENT,
        warnings: [`Das gespeicherte V3-Dokument ist ungültig: ${error instanceof Error ? error.message : "Validierungsfehler"}`],
        legacyBackupJson: raw,
        unmapped: [{ roomId: "unknown", reason: "invalid-v3", value }],
      };
    }
  }
  return migrateStoredPlannerData(value, DEFAULT_APARTMENT_DOCUMENT);
}

/**
 * V3 documents written before the balcony/loggia merge can still contain a
 * duplicate `loggia` room with the old 2.23 m² label. Normalize this alias
 * before strict geometry validation so the legacy save can be recovered.
 */
function normalizeLegacyV3Aliases(value: object): { document: object; changed: boolean } {
  const record = value as Record<string, unknown>;
  const rooms = Array.isArray(record.rooms) ? record.rooms : [];
  const hasLoggia = rooms.some((room) => (
    room && typeof room === "object" && (room as { id?: unknown }).id === "loggia"
  ));
  const hasBalkon = rooms.some((room) => (
    room && typeof room === "object" && (room as { id?: unknown }).id === "balkon"
  ));
  const preferences = record.viewPreferences && typeof record.viewPreferences === "object"
    ? record.viewPreferences as Record<string, unknown>
    : null;
  const activeRoomId = preferences?.activeRoomId === "loggia";
  if (!hasLoggia && !activeRoomId) return { document: value, changed: false };

  const mapRoomId = (roomId: unknown) => roomId === "loggia" ? "balkon" : roomId;
  const normalizedRooms = rooms.flatMap((room) => {
    if (!room || typeof room !== "object" || (room as { id?: unknown }).id !== "loggia") return [room];
    return hasBalkon ? [] : [{ ...(room as Record<string, unknown>), id: "balkon" }];
  });
  const normalizeEntityRoomIds = (items: unknown) => Array.isArray(items)
    ? items.map((item) => item && typeof item === "object" && (item as { roomId?: unknown }).roomId === "loggia"
      ? { ...(item as Record<string, unknown>), roomId: "balkon" }
      : item)
    : items;

  const normalized = {
    ...record,
    rooms: normalizedRooms,
    walls: Array.isArray(record.walls)
      ? record.walls.map((wall) => wall && typeof wall === "object"
        ? { ...(wall as Record<string, unknown>), roomIds: Array.isArray((wall as { roomIds?: unknown }).roomIds)
            ? ((wall as { roomIds: unknown[] }).roomIds).filter((roomId) => roomId !== "loggia").map(mapRoomId)
            : (wall as Record<string, unknown>).roomIds }
        : wall)
      : record.walls,
    openings: Array.isArray(record.openings)
      ? record.openings.map((opening) => opening && typeof opening === "object"
        ? { ...(opening as Record<string, unknown>), roomIds: Array.isArray((opening as { roomIds?: unknown }).roomIds)
            ? ((opening as { roomIds: unknown[] }).roomIds).map(mapRoomId)
            : (opening as Record<string, unknown>).roomIds }
        : opening)
      : record.openings,
    builtIns: normalizeEntityRoomIds(record.builtIns),
    fixtures: normalizeEntityRoomIds(record.fixtures),
    placements: normalizeEntityRoomIds(record.placements),
    viewPreferences: preferences ? { ...preferences, activeRoomId: activeRoomId ? "balkon" : preferences.activeRoomId } : record.viewPreferences,
  };
  return { document: normalized, changed: true };
}

/** Migrate the retired concept fabric without resetting the user's rug placement. */
export function upgradeLivingRugMaterial(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const old = document.placements.find((item) => item.id === "living-rug-concept");
  if (!old || old.catalogId !== "rug-living-concept-240x240") return document;
  if (old.materialVariants?.main === "rug-temu-vintage-cream") return document;
  const chosen = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-rug-concept");
  if (!chosen) return document;
  return parsePlannerDocument({
    ...document,
    placements: document.placements.map((item) => (
      item.id === "living-rug-concept" ? {
        ...item,
        materialVariants: chosen.materialVariants,
        metadata: chosen.metadata,
      } : item
    )),
  });
}

function isOlderBaselineModel(document: PlannerDocumentV3) {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return false;
  for (const roomId of ["zimmer1", "wohnkueche", "balkon"]) {
    const currentFloor = document.rooms.find((room) => room.id === roomId)?.surfaces.floor;
    const confirmedFloor = DEFAULT_APARTMENT_DOCUMENT.rooms.find((room) => room.id === roomId)?.surfaces.floor;
    if (currentFloor !== confirmedFloor) return true;
  }
  if (document.openings.some((opening) => RETIRED_BASELINE_OPENING_IDS.has(opening.id))) return true;
  const storedOpenings = new Map(document.openings.map((opening) => [opening.id, opening]));
  if (DEFAULT_APARTMENT_DOCUMENT.openings.some((opening) => {
    const storedOpening = storedOpenings.get(opening.id);
    return !storedOpening
      || storedOpening.wallId !== opening.wallId
      || storedOpening.offset !== opening.offset
      || storedOpening.width !== opening.width
      || storedOpening.hinge !== opening.hinge
      || storedOpening.swingDirection !== opening.swingDirection
      || storedOpening.visualOpenFraction !== opening.visualOpenFraction
      || storedOpening.visualStyle !== opening.visualStyle;
  })) return true;
  if (document.builtIns.some((item) => RETIRED_BASELINE_BUILT_IN_IDS.has(item.id))) return true;
  if (document.placements.some((item) => RETIRED_BASELINE_PLACEMENT_IDS.has(item.id))) return true;
  const stored = new Map(document.builtIns.map((item) => [item.id, item]));
  const builtInsNeedRefresh = DEFAULT_APARTMENT_DOCUMENT.builtIns.some((item) => {
    if (!BASELINE_VISUAL_REFRESH_IDS.has(item.id)) return false;
    const previous = stored.get(item.id);
    return !previous
      || previous.rotation !== item.rotation
      || previous.position.x !== item.position.x
      || previous.position.z !== item.position.z
      || (previous.elevation ?? 0) !== (item.elevation ?? 0)
      || previous.size.width !== item.size.width
      || previous.size.depth !== item.size.depth
      || previous.size.height !== item.size.height
      || previous.catalogId !== item.catalogId
      || (BASELINE_VISUAL_REFRESH_IDS.has(item.id) && (
        previous.materialVariants?.main !== item.materialVariants?.main
      ));
  });
  if (builtInsNeedRefresh) return true;
  const storedFixtures = new Map(document.fixtures.map((item) => [item.id, item]));
  const fixturesNeedRefresh = DEFAULT_APARTMENT_DOCUMENT.fixtures.some((item) => {
    if (!BASELINE_VISUAL_FIXTURE_REFRESH_IDS.has(item.id)) return false;
    const previous = storedFixtures.get(item.id);
    return !previous
      || previous.rotation !== item.rotation
      || previous.position.x !== item.position.x
      || previous.position.z !== item.position.z
      || previous.height !== item.height;
  });
  if (fixturesNeedRefresh) return true;
  const storedPlacements = new Map(document.placements.map((item) => [item.id, item]));
  const diningTable = storedPlacements.get("living-bozan-table");
  const hasMarkedFourChairGroup = diningTable?.metadata?.notes?.some((note) => /Vier Kaleo-Armlehnstühle/i.test(note)) ?? false;
  return DEFAULT_APARTMENT_DOCUMENT.placements.some((item) => {
    if (!BASELINE_VISUAL_PLACEMENT_REFRESH_IDS.has(item.id)) return false;
    const previous = storedPlacements.get(item.id);
    if (item.id === "living-bozan-table" && previous && isTableComparisonPlacement(previous)) return false;
    if (item.id === "living-kaleo-chair-north" && !previous && hasMarkedFourChairGroup) return false;
    return !previous
      || previous.rotation !== item.rotation
      || previous.position.x !== item.position.x
      || previous.position.z !== item.position.z
      || previous.size.width !== item.size.width
      || previous.size.depth !== item.size.depth
      || previous.size.height !== item.size.height
      || previous.groupId !== item.groupId;
  });
}

function rebaseBaselineModel(stored: PlannerDocumentV3): PlannerDocumentV3 {
  const legacyDefaultFloors = new Set(["parquet-oak", "porcelain-light", "epoxy-grey", "outdoor-concrete"]);
  const storedRooms = new Map(stored.rooms.map((room) => [room.id, room]));
  const storedBuiltIns = new Map(stored.builtIns.map((item) => [item.id, item]));
  const storedPlacements = new Map(stored.placements.map((item) => [item.id, item]));
  const validStoredDoorStates = Object.fromEntries(
    Object.entries(stored.doorStates).filter(([openingId]) => openingId in DEFAULT_APARTMENT_DOCUMENT.doorStates),
  );
  const baselineBuiltInIds = new Set(DEFAULT_APARTMENT_DOCUMENT.builtIns.map((item) => item.id));
  const baselinePlacementIds = new Set(DEFAULT_APARTMENT_DOCUMENT.placements.map((item) => item.id));
  return parsePlannerDocument({
    ...DEFAULT_APARTMENT_DOCUMENT,
    name: stored.name,
    updatedAt: stored.updatedAt,
    rooms: DEFAULT_APARTMENT_DOCUMENT.rooms.map((room) => {
      const previous = storedRooms.get(room.id);
      if (!previous) return room;
      return {
        ...room,
        surfaces: {
          floor: room.id === "zimmer1" || room.id === "wohnkueche" || legacyDefaultFloors.has(previous.surfaces.floor)
            ? room.surfaces.floor
            : previous.surfaces.floor,
          walls: previous.surfaces.walls === "paint-warm-white" ? room.surfaces.walls : previous.surfaces.walls,
          ceiling: previous.surfaces.ceiling === "paint-white" ? room.surfaces.ceiling : previous.surfaces.ceiling,
        },
      };
    }),
    builtIns: [
      ...DEFAULT_APARTMENT_DOCUMENT.builtIns.map((item) => (
        BASELINE_VISUAL_REFRESH_IDS.has(item.id) ? item : storedBuiltIns.get(item.id) ?? item
      )),
      ...stored.builtIns.filter((item) => !baselineBuiltInIds.has(item.id) && !RETIRED_BASELINE_BUILT_IN_IDS.has(item.id)),
    ],
    placements: [
      ...DEFAULT_APARTMENT_DOCUMENT.placements.map((item) => (
        BASELINE_VISUAL_PLACEMENT_REFRESH_IDS.has(item.id)
          ? item.id === "living-bozan-table" && storedPlacements.get(item.id) && isTableComparisonPlacement(storedPlacements.get(item.id)!)
            ? storedPlacements.get(item.id)!
            : item
          : storedPlacements.get(item.id) ?? item
      )),
      ...stored.placements.filter((item) => !baselinePlacementIds.has(item.id) && !RETIRED_BASELINE_PLACEMENT_IDS.has(item.id)),
    ],
    doorStates: {
      ...DEFAULT_APARTMENT_DOCUMENT.doorStates,
      ...validStoredDoorStates,
      "hall-living-door": DEFAULT_APARTMENT_DOCUMENT.doorStates["hall-living-door"],
      "zimmer1-door": DEFAULT_APARTMENT_DOCUMENT.doorStates["zimmer1-door"],
      "hall-bath-door": DEFAULT_APARTMENT_DOCUMENT.doorStates["hall-bath-door"],
    },
    viewPreferences: {
      ...stored.viewPreferences,
      overlays: {
        ...stored.viewPreferences.overlays,
        dimensions: true,
      },
      activeRoomId: stored.viewPreferences.activeRoomId === "loggia"
        ? "balkon"
        : stored.viewPreferences.activeRoomId,
    },
  });
}

function isTableComparisonPlacement(placement: PlannerDocumentV3["placements"][number]) {
  return placement.id === "living-bozan-table"
    && placement.catalogId !== "dining-table-bozan-110"
    && placement.catalogId.startsWith("dining-table-");
}

function emptyResult(): MigrationResult {
  return {
    document: DEFAULT_APARTMENT_DOCUMENT,
    warnings: [],
    legacyBackupJson: null,
    unmapped: [],
  };
}

function validDocumentJson(raw: string | null) {
  if (raw === null) return null;
  try {
    parsePlannerDocument(JSON.parse(raw));
    return raw;
  } catch {
    return null;
  }
}

function isValidV3(value: unknown) {
  try {
    parsePlannerDocument(value);
    return true;
  } catch {
    return false;
  }
}

function isRecognizedLegacyDocument(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion === 3) return false;
  const rooms = record.schemaVersion === 2 && record.rooms && typeof record.rooms === "object"
    ? record.rooms as Record<string, unknown>
    : record;
  const knownRooms = new Set(DEFAULT_APARTMENT_DOCUMENT.rooms.map((room) => room.id));
  return Object.entries(rooms).some(([roomId, items]) => knownRooms.has(roomId) && Array.isArray(items));
}

function restoreValue(
  storage: Pick<Storage, "setItem" | "removeItem">,
  key: string,
  value: string | null,
) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // The original storage error remains the actionable failure.
  }
}
