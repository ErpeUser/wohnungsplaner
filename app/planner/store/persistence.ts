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

export type PlannerImportPreview = MigrationResult & {
  canCommit: boolean;
};

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
      return {
        document: parsePlannerDocument(value),
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
