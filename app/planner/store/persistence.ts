import { DEFAULT_APARTMENT_DOCUMENT, upgradeZimmer1WallLights } from "../domain/apartment-v3.ts";
import { upgradeZimmer1EntryGold, ZIMMER1_ENTRY_ART_ID } from "../domain/zimmer1-entry-gold.ts";
import { upgradeZimmer1WardrobeBoxes } from "../domain/zimmer1-wardrobe-boxes.ts";
import {
  migrateStoredPlannerData,
  type MigrationResult,
} from "../domain/migration.ts";
import { parsePlannerDocument } from "../domain/schema.ts";
import { removeZimmer1EntryNiche } from "../domain/room-refinement.ts";
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
  "builtin-z1-wall-art-pair",
  "builtin-z1-headboard-led",
  "builtin-z1-headboard-sconces",
  "builtin-z1-layered-curtain",
  "builtin-z1-nightstand-decor",
  "builtin-hall-wall-decor",
]);

const RETIRED_BASELINE_BUILT_IN_IDS = new Set([
  ZIMMER1_ENTRY_ART_ID,
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
  // The chair has its own one-time product migration so locally moved chairs
  // are not reset to default coordinates during a visual baseline rebase.
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
  const hasMigrationMarker = table?.metadata?.notes?.some((note) => /Vier (?:Kaleo-Armlehnstühle|WOLTU Chenille-Drehstühle)/i.test(note));
  if (!table || !defaultNorth || hasMigrationMarker || upgraded.placements.some((item) => item.id === defaultNorth.id)) {
    return upgraded;
  }
  return parsePlannerDocument({
    ...upgraded,
    placements: [
      ...upgraded.placements,
      defaultNorth,
    ].map((item) => item.id === table.id
      ? { ...item, metadata: { ...item.metadata, notes: [...(item.metadata?.notes ?? []), "Vier WOLTU Chenille-Drehstühle sind als aktuelle Essgruppe markiert."] } }
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
  const targetRug = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-rug-concept") ?? rug;

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
        // Only the recognized legacy default is re-centered. A moved
        // sofa keeps its saved position, even while the old product model is
        // being upgraded to the sourced replacement.
        position: legacyDefault ? { x: targetRug.position.x, z: targetRug.position.z } : item.position,
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
  const original = storage as typeof storage & Partial<Pick<Storage, "key" | "length">>;
  storage = {
    getItem(key) {
      const current = original.getItem(key);
      if (current !== null || !key.startsWith("wohnung-planner-v3") || !original.key) return current;
      const suffix = key.slice("wohnung-planner-v3".length);
      for (let index = 0; index < (original.length ?? 0); index++) {
        const candidate = original.key(index);
        const match = candidate?.match(/^wohnung-top\d+-planner-v3(.*)$/);
        if (candidate && match?.[1] === suffix) return original.getItem(candidate);
      }
      return null;
    },
    setItem: (key, value) => original.setItem(key, value),
    removeItem: (key) => original.removeItem(key),
  };
  return {
    load() {
      const raw = storage.getItem(PLANNER_STORAGE_KEY);
      if (raw === null) return emptyResult();
      const result = readStoredValue(raw);
      if (result.legacyBackupJson !== null) {
        try { storage.setItem(PLANNER_MIGRATION_BACKUP_KEY, result.legacyBackupJson); }
        catch { result.warnings.push("Die Sicherung konnte nicht gespeichert werden; dein vorhandener Plan bleibt erhalten."); }
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
        document: upgradeZimmer1WardrobeBoxes(upgradeZimmer1WardrobeToFly(upgradeZimmer1EntryGold(upgradeZimmer1WallLights(removeZimmer1EntryNiche(migration.document))))),
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
      const withoutEntryNiche = removeZimmer1EntryNiche(parsed);
      const withEntryGold = upgradeZimmer1EntryGold(withoutEntryNiche);
      const withWallLights = upgradeZimmer1WallLights(withEntryGold);
      const withRug = upgradeLivingRugMaterial(withWallLights);
      const withHall = restoreHallTejoCashmere(withRug);
      const withChair = upgradeZimmer1Chair(withHall);
      const withDining = upgradeDiningChairsToWoltu(withChair);
      const withTuckedDining = upgradeDefaultWoltuDiningChairTuck(withDining);
      const withWc = upgradeWcPhotoReference(withTuckedDining);
      const withWallboards = upgradeZimmer1VanityWallboards(withWc);
      const withFly = upgradeZimmer1WardrobeToFly(withWallboards);
      const withBoxes = upgradeZimmer1WardrobeBoxes(withFly);
      if (!normalized.identityChanged && isOlderBaselineModel(withBoxes)) {
        return {
          document: rebaseBaselineModel(withBoxes),
          warnings: ["Das gespeicherte Möbel-Layout und die Bad-/WC-Materialien wurden auf den aktuellen Stand aktualisiert."],
          legacyBackupJson: raw,
          unmapped: [],
        };
      }
      if (normalized.changed || withBoxes !== parsed) {
        return {
          document: withBoxes,
          warnings: [normalized.changed
            ? "Das gespeicherte Dokument wurde auf die zusammengeführte Balkon-/Loggia-Struktur aktualisiert."
            : withBoxes !== withFly
              ? "Die drei Schrankboxen wurden auf das ausgewählte ZGV-XL-Set aktualisiert; andere Möbel bleiben erhalten."
              : withFly !== withWallboards
              ? "Der Kleiderschrank in Zimmer 1 wurde an das MID.YOU-FLY-Maß angepasst; Kaschmirfronten und angepasste Möbelpositionen bleiben erhalten."
            : withWallboards !== withWc
              ? "Die drei Wandboards der Schminkecke wurden auf die ausgewählten Möbelix-Produkte aktualisiert; andere Möbelpositionen bleiben erhalten."
            : withWc !== withTuckedDining
              ? "Die WC-Fotoreferenz mit Eiche-Artisan-Regal, Schacht und Lüftung wurde übernommen; sonstige Möbelpositionen bleiben erhalten."
              : withTuckedDining !== withDining
                ? "Die vier unveränderten WOLTU-Hauptstühle wurden teilweise unter den Bozan-Tisch geschoben; manuell verschobene Möbel bleiben unberührt."
              : withDining !== withChair
                ? "Die vier bisherigen Kaleo-Hauptstühle wurden auf WOLTU Chenille umgestellt; ihre Positionen bleiben erhalten."
              : withChair !== withHall
                ? "Der Stuhl in Zimmer 1 wurde auf das neue AliExpress-Modell aktualisiert; Position und Drehung bleiben erhalten."
                : withHall !== withRug
                  ? "Die Vorraumgarderobe wurde anhand der braunen Fotoreferenz aktualisiert; Position und Maße bleiben erhalten."
                  : withRug !== withWallLights
                    ? "Der vorhandene Wohnzimmerteppich wurde auf das neue Temu-Design aktualisiert; Position und Drehung bleiben erhalten."
                    : withWallLights !== withEntryGold
                      ? "Die zwei Wandleuchten in Zimmer 1 wurden auf die ausgewählte GGbingo-Referenz aktualisiert; andere Möbelpositionen bleiben erhalten."
                      : withEntryGold !== withoutEntryNiche
                        ? "Das Bild neben der Zimmer-1-Tür wurde durch vier goldene Acryl-Spiegellinien ersetzt; andere Möbelpositionen bleiben erhalten."
                        : "Die schmale Eiche-Nische in Zimmer 1 wurde entfernt; andere Möbelpositionen bleiben erhalten."],
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
function normalizeLegacyV3Aliases(value: object): { document: object; changed: boolean; identityChanged?: boolean } {
  const record = value as Record<string, unknown>;
  if (typeof record.id === "string" && /^wohnung-top-\d+-v3$/.test(record.id)) {
    const renamed = { ...record, id: DEFAULT_APARTMENT_DOCUMENT.id };
    const normalized = normalizeLegacyV3Aliases(renamed);
    return { document: normalized.document, changed: true, identityChanged: true };
  }
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

/** Change untouched default Kaleo seats to the newly selected WOLTU model.
 * Preserve moved/rotated seats, personal notes and explicit comparison choices. */
export function upgradeDiningChairsToWoltu(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const defaults = new Map(DEFAULT_APARTMENT_DOCUMENT.placements
    .filter((item) => item.id.startsWith("living-kaleo-chair-"))
    .map((item) => [item.id, item]));
  let changed = false;
  const placements = document.placements.map((item) => {
    const next = defaults.get(item.id);
    if (!next || item.catalogId !== "chair-kaleo-chenille-beige"
      || item.size.width !== 0.63 || item.size.depth !== 0.64 || item.size.height !== 0.87
      || item.metadata?.notes?.some((note) => /Stuhlvergleich chair-kaleo-chenille-beige/.test(note))) return item;
    const extraNotes = (item.metadata?.notes ?? []).filter((note) => ![
      "Produktmaß 63", "Armlehnenoberkante", "Schwarzer pulverbeschichteter",
      "Beiger Chenillebezug", "Oberer/Nord-Stuhl", "Rechter/Ost-Stuhl",
      "Linker/West-Stuhl", "Südlicher vierter Sitzplatz", "Die Position hält",
    ].some((phrase) => note.includes(phrase)));
    changed = true;
    return {
      ...item,
      catalogId: next.catalogId,
      size: { ...next.size },
      materialVariants: { ...item.materialVariants, main: next.materialVariants?.main ?? "fabric-woltu-chenille-cream" },
      metadata: {
        ...item.metadata,
        source: next.metadata?.source,
        confidence: "estimated" as const,
        notes: [...new Set([...(next.metadata?.notes ?? []), ...extraNotes])],
      },
    };
  });
  return changed ? { ...document, placements } : document;
}

/**
 * Upgrade the original 225 cm wardrobe to the sourced MID.YOU FLY footprint.
 * Only the previous exact default-sized wardrobe changes. A moved/rotated
 * cupboard keeps its coordinates; only the original back-wall centre is
 * shifted 2 cm so the shallower case stays flush with the wall. The matching
 * top decoration follows the new 210 cm top instead of floating above it.
 */
export function upgradeZimmer1WardrobeToFly(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const current = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-wardrobe");
  const previous = document.placements.find((item) => item.id === "zimmer1-wardrobe");
  if (!current || !previous || previous.catalogId !== "wardrobe-225"
    || previous.size.width !== 2.25 || previous.size.depth !== 0.62 || previous.size.height !== 2.2) {
    return document;
  }
  return parsePlannerDocument({
    ...document,
    placements: document.placements.map((item) => item.id === previous.id ? {
      ...item,
      size: { ...current.size },
      position: { ...item.position, z: Math.abs(item.position.z - 2.96) < 0.001 ? 2.98 : item.position.z },
      metadata: { ...item.metadata, ...current.metadata },
    } : item),
    builtIns: document.builtIns.map((item) => item.id === "builtin-z1-wardrobe-top-decor"
      && Math.abs((item.elevation ?? 0) - 2.2) < 0.001
      ? { ...item, elevation: 2.1 }
      : item),
  });
}

/**
 * One-time compact partial-tuck upgrade for the original WOLTU dining group.
 * Keep the Bozan table fixed and never overwrite a custom/moved/rotated chair.
 * WOLTU dimensions are estimated, so this is a planning pose, not an assertion
 * that its 85-cm backrest fits under the 73.5-cm tabletop underside.
 */
export function upgradeDefaultWoltuDiningChairTuck(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const table = document.placements.find((item) => item.id === "living-bozan-table");
  if (!table || table.catalogId !== "dining-table-bozan-110"
    || table.position.x !== 2.2 || table.position.z !== 5.7
    || table.rotation !== 180 || table.size.width !== 1.1
    || table.size.depth !== 1.1 || table.size.height !== 0.76) return document;

  const oldPositions = new Map([
    ["living-kaleo-chair-west", { x: 2.2, z: 5.0 }],
    ["living-kaleo-chair-east", { x: 2.9, z: 5.7 }],
    ["living-kaleo-chair-south", { x: 1.5, z: 5.7 }],
    ["living-kaleo-chair-north", { x: 2.2, z: 6.4 }],
  ]);
  const reference = new Map(DEFAULT_APARTMENT_DOCUMENT.placements
    .filter((item) => oldPositions.has(item.id))
    .map((item) => [item.id, item]));
  let changed = false;
  const placements = document.placements.map((item) => {
    const old = oldPositions.get(item.id);
    const target = reference.get(item.id);
    if (!old || !target || item.catalogId !== "chair-aliexpress-woltu-1005013095870024"
      || item.groupId !== "living-dining-group" || item.roomId !== "wohnkueche"
      || item.rotation !== target.rotation
      || item.size.width !== 0.58 || item.size.depth !== 0.6 || item.size.height !== 0.85
      || item.position.x !== old.x || item.position.z !== old.z) return item;
    changed = true;
    const originalNotes = (item.metadata?.notes ?? [])
      .filter((note) => !(note.startsWith("Stuhlplatz ")
        && note.endsWith("Tisch und übrige Möbel bleiben unverändert.")));
    const updatedNote = target.metadata?.notes?.find((note) => note.startsWith("Stuhlplatz "));
    return {
      ...item,
      position: { ...target.position },
      metadata: {
        ...item.metadata,
        notes: [...new Set([...originalNotes, ...(updatedNote ? [updatedNote] : [])])],
      },
    };
  });
  return changed ? { ...document, placements } : document;
}

/** Switch only the previous default Zimmer-1 chair, preserving custom positions,
 * rotations, and any genuinely user-resized bounding box. Alternative product
 * selections remain untouched; also refresh the superseded gallery evidence. */
export function upgradeZimmer1Chair(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const current = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "zimmer1-chair");
  const previous = document.placements.find((item) => item.id === "zimmer1-chair");
  if (!current || !previous) return document;
  if (previous.catalogId === current.catalogId) {
    // Only the obsolete built-in evidence is refreshed, not personal choices.
    if (!previous.metadata?.source?.includes("Galerie und Maßblatt nicht verifiziert")) return document;
    const priorNotes = (previous.metadata.notes ?? []).filter((note) => ![
      "Geplant als kompakter", "Nur Stellplatzschätzung", "Ecru/Creme als Planungsfarbe",
    ].some((prefix) => note.startsWith(prefix)));
    return parsePlannerDocument({
      ...document,
      placements: document.placements.map((item) => item.id === previous.id
        ? { ...item, metadata: {
          ...item.metadata,
          ...current.metadata,
          notes: [...new Set([...(current.metadata?.notes ?? []), ...priorNotes])],
        } }
        : item),
    });
  }
  if (previous.catalogId !== "chair-temu-executive-ivory") return document;
  const wasDefaultSize = previous.size.width === 0.64 && previous.size.depth === 0.51 && previous.size.height === 1.14;
  return parsePlannerDocument({
    ...document,
    placements: document.placements.map((item) => item.id === previous.id ? {
      ...item,
      catalogId: current.catalogId,
      size: wasDefaultSize ? current.size : item.size,
      materialVariants: current.materialVariants,
      metadata: current.metadata,
    } : item),
  });
}

/** Restore the selected cashmere Tejo after the obsolete brown photo substitution.
 * Preserve the saved placement, dimensions, personal notes and unrelated choices. */
export function restoreHallTejoCashmere(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const target = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "hall-tejo-wardrobe");
  if (!target) return document;
  const previous = document.placements.find((item) => item.id === target.id);
  if (!previous || previous.catalogId !== "hallway-brown-mirror-bench-115") return document;
  const obsoleteNotes = [
    "Fotoreferenz: warmbraune Holzfronten",
    "Maße 115 × 37,5 × 231,9 cm entsprechen dem vorhandenen Stellplatz",
    "Bestehende Vorraumposition und 180°-Ausrichtung bleiben unverändert.",
  ];
  const personalNotes = (previous.metadata?.notes ?? []).filter((note) =>
    !obsoleteNotes.some((prefix) => note.startsWith(prefix)));
  return parsePlannerDocument({
    ...document,
    placements: document.placements.map((item) => item.id === previous.id ? {
      ...item,
      catalogId: target.catalogId,
      materialVariants: { ...item.materialVariants, main: "tejo-cashmere" },
      metadata: { ...item.metadata, ...target.metadata,
        notes: [...new Set([...(target.metadata?.notes ?? []), ...personalNotes])] },
    } : item),
  });
}

/**
 * One-time adoption of the user's WC photo in older saved apartment plans.
 * Only new locked wall details and the recognized former revision-panel
 * height change; custom furniture, room finishes and doors remain untouched.
 */
export function upgradeWcPhotoReference(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const ids = new Set(["builtin-wc-wallboard-artisan-80", "builtin-wc-shelf-styling", "builtin-wc-ventilation"]);
  const already = new Set(document.builtIns.map((item) => item.id));
  const missing = DEFAULT_APARTMENT_DOCUMENT.builtIns.filter((item) => ids.has(item.id) && !already.has(item.id));
  const previous = document.builtIns.find((item) => item.id === "builtin-wc-revision");
  const target = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.id === "builtin-wc-revision");
  const oldRevision = Boolean(previous && target
    && previous.catalogId === "wc-revision-panel"
    && previous.position.x === -1.87 && previous.position.z === 4.15
    && previous.size.width === 0.42 && previous.size.height === 0.3
    && previous.elevation === 1.68);
  if (!missing.length && !oldRevision) return document;
  return parsePlannerDocument({
    ...document,
    builtIns: [
      ...document.builtIns.map((item) => oldRevision && item.id === "builtin-wc-revision"
        ? { ...item, elevation: target!.elevation, label: target!.label, metadata: target!.metadata }
        : item),
      ...missing,
    ],
  });
}

/** Update only three uncustomized old vanity wallboards in saved documents.
 * Preserve positions customized by the user and every unrelated furniture item. */
export function upgradeZimmer1VanityWallboards(document: PlannerDocumentV3): PlannerDocumentV3 {
  if (document.id !== DEFAULT_APARTMENT_DOCUMENT.id) return document;
  const old: Record<string, { width: number; depth: number; height: number; x: number; z: number }> = {
    "builtin-z1-vanity-shelf-main": { width: 1.12, depth: 0.19, height: 0.045, x: 2.96, z: 0.095 },
    "builtin-z1-vanity-shelf-side-upper": { width: 0.36, depth: 0.16, height: 0.04, x: 3.475, z: 0.49 },
    "builtin-z1-vanity-shelf-side-lower": { width: 0.32, depth: 0.16, height: 0.04, x: 3.475, z: 0.84 },
  };
  const chosen = new Map(DEFAULT_APARTMENT_DOCUMENT.builtIns
    .filter((item) => Object.hasOwn(old, item.id)).map((item) => [item.id, item]));
  let changed = false;
  const builtIns = document.builtIns.map((item) => {
    const before = old[item.id];
    const next = chosen.get(item.id);
    if (!before || !next || item.catalogId !== next.catalogId || item.materialVariants?.main !== "oak-light"
      || item.size.width !== before.width || item.size.depth !== before.depth || item.size.height !== before.height) return item;
    changed = true;
    return {
      ...item,
      label: next.label,
      size: { ...next.size },
      position: {
        ...item.position,
        x: item.position.x === before.x ? next.position.x : item.position.x,
        z: item.position.z === before.z ? next.position.z : item.position.z,
      },
      materialVariants: { ...item.materialVariants, main: next.materialVariants?.main ?? "oak-artisan" },
      metadata: next.metadata,
    };
  });
  const present = new Set(builtIns.map((item) => item.id));
  const missing = [...chosen.values()].filter((item) => !present.has(item.id));
  return !changed && missing.length === 0 ? document
    : parsePlannerDocument({ ...document, builtIns: [...builtIns, ...missing] });
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
  const hasMarkedFourChairGroup = diningTable?.metadata?.notes?.some((note) => /Vier (?:Kaleo-Armlehnstühle|WOLTU Chenille-Drehstühle)/i.test(note)) ?? false;
  return DEFAULT_APARTMENT_DOCUMENT.placements.some((item) => {
    if (!BASELINE_VISUAL_PLACEMENT_REFRESH_IDS.has(item.id)) return false;
    // An older cabinet depth must not rebase the entire saved apartment.
    // The targeted FLY migration above preserves user-modified positions.
    if (item.id === "zimmer1-wardrobe") return false;
    const previous = storedPlacements.get(item.id);
    if (item.id === "living-bozan-table" && previous
      && (isTableComparisonPlacement(previous) || previous.catalogId === "dining-table-bozan-110")) return false;
    if (item.id === "living-kaleo-chair-north" && !previous && hasMarkedFourChairGroup) return false;
    // Seat coordinates have their own non-destructive one-time migration.
    // A deliberately chosen alternate seat or custom placement stays untouched.
    if (item.id.startsWith("living-kaleo-chair-") && previous) return false;
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
          ? item.id === "living-bozan-table" && storedPlacements.get(item.id)
            && (isTableComparisonPlacement(storedPlacements.get(item.id)!)
              || storedPlacements.get(item.id)!.catalogId === "dining-table-bozan-110")
            ? storedPlacements.get(item.id)!
            : item.id.startsWith("living-kaleo-chair-") && storedPlacements.has(item.id)
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
