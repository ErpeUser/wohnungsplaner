import { parsePlannerDocument, PlannerValidationError } from "./schema.ts";
import type { PlannerDocumentV3, PlannerPlacement } from "./types.ts";
import { deriveRoomPolygon } from "./wall-graph.ts";
import { roomContainsPlacement } from "./geometry.ts";

const LEGACY_CATALOG_IDS: Record<string, string> = {
  bed120: "bed-120",
  singleBed: "bed-90",
  doubleBed: "bed-160",
  wardrobe: "wardrobe-225",
  desk: "desk-standard",
  chair: "chair-office",
  shelf: "shelf-standard",
  sideboard: "sideboard-standard",
  sofa: "sofa-compact",
  diningTable: "dining-table",
  bench: "bench",
  rug: "rug",
  nightstand: "nightstand",
  plant: "plant",
  curtain: "curtain",
  wallMirror: "wall-mirror",
  wallShelf: "wall-shelf",
  wallArt: "wall-art",
  wallDecor: "wall-decor",
  wallPanel: "wall-panel",
  wallLamp: "wall-lamp",
};

export type UnmappedLegacyItem = {
  roomId: string;
  reason: string;
  value: unknown;
};

export type MigrationResult = {
  document: PlannerDocumentV3;
  warnings: string[];
  legacyBackupJson: string | null;
  unmapped: UnmappedLegacyItem[];
};

export function migrateStoredPlannerData(
  value: unknown,
  baseDocument: PlannerDocumentV3,
): MigrationResult {
  if (isV3Candidate(value)) {
    try {
      const document = parsePlannerDocument(value);
      return {
        document,
        warnings: [],
        legacyBackupJson: null,
        unmapped: [],
      };
    } catch (error) {
      if (!(error instanceof PlannerValidationError)) throw error;
    }
  }

  const warnings: string[] = [];
  const unmapped: UnmappedLegacyItem[] = [];
  const backup = safeStringify(value);
  const roomRecord = getLegacyRoomRecord(value);

  if (!roomRecord) {
    warnings.push("Gespeicherte Daten sind weder ein gültiges V3-Dokument noch ein v2-Raumdatensatz.");
    unmapped.push({ roomId: "unknown", reason: "invalid-root", value });
    return { document: baseDocument, warnings, legacyBackupJson: backup, unmapped };
  }

  const roomIds = new Set(baseDocument.rooms.map((room) => room.id));
  const touchedRooms = new Set<string>();
  const migrated: PlannerPlacement[] = [];
  const usedIds = collectEntityIds(baseDocument);

  for (const [roomId, items] of Object.entries(roomRecord)) {
    if (roomId === "schemaVersion") continue;
    if (!roomIds.has(roomId)) {
      collectUnmappedRoom(roomId, items, "unknown-room", warnings, unmapped);
      continue;
    }
    if (!Array.isArray(items)) {
      warnings.push(`${roomId}: gespeicherte Möbelliste ist ungültig.`);
      unmapped.push({ roomId, reason: "invalid-room-list", value: items });
      continue;
    }

    touchedRooms.add(roomId);
    const polygon = deriveRoomPolygon(baseDocument, roomId);
    const origin = {
      x: Math.min(...polygon.map((point) => point.x)),
      z: Math.min(...polygon.map((point) => point.z)),
    };

    items.forEach((item, index) => {
      const result = migrateLegacyPlacement(item, roomId, origin, index, usedIds);
      if (result.ok) {
        if (!roomContainsPlacement(baseDocument, roomId, result.placement)) {
          warnings.push(`${roomId}: ${result.placement.catalogId} liegt außerhalb des Raums.`);
          unmapped.push({ roomId, reason: "outside-room", value: item });
          return;
        }
        migrated.push(result.placement);
        return;
      }
      warnings.push(`${roomId}: ${result.reason}`);
      unmapped.push({ roomId, reason: result.code, value: item });
    });
  }

  const retained = baseDocument.placements.filter((placement) => !touchedRooms.has(placement.roomId));
  let document: PlannerDocumentV3;
  try {
    document = parsePlannerDocument({
      ...baseDocument,
      placements: [...retained, ...migrated],
    });
  } catch (error) {
    if (!(error instanceof PlannerValidationError)) throw error;
    warnings.push("Ein Teil der migrierten Möbel konnte wegen widersprüchlicher Geometrie nicht übernommen werden.");
    const safePlacements = retained.filter((placement) => roomContainsPlacement(baseDocument, placement.roomId, placement));
    document = parsePlannerDocument({ ...baseDocument, placements: safePlacements });
  }

  return { document, warnings, legacyBackupJson: backup, unmapped };
}

function migrateLegacyPlacement(
  value: unknown,
  roomId: string,
  origin: { x: number; z: number },
  index: number,
  usedIds: Set<string>,
): { ok: true; placement: PlannerPlacement } | { ok: false; code: string; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, code: "invalid-item", reason: "Möbeleintrag ist kein Objekt." };
  }
  const item = value as Record<string, unknown>;
  const legacyType = typeof item.type === "string" ? item.type : "";
  const catalogId = LEGACY_CATALOG_IDS[legacyType];
  if (!catalogId) {
    return { ok: false, code: "unknown-type", reason: `Unbekannter Möbeltyp ${legacyType || "(leer)"}.` };
  }

  const numbers = [item.x, item.y, item.w, item.d, item.h, item.rotation];
  if (!numbers.every((candidate) => typeof candidate === "number" && Number.isFinite(candidate))) {
    return { ok: false, code: "invalid-number", reason: `${legacyType} enthält ungültige Zahlen.` };
  }
  const [x, z, width, depth, height, rotation] = numbers as number[];
  if (width <= 0 || depth <= 0 || height <= 0) {
    return { ok: false, code: "invalid-size", reason: `${legacyType} enthält ungültige Abmessungen.` };
  }

  const sourceId = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `${legacyType}-${index + 1}`;
  const id = uniqueId(`legacy-${roomId}-${slug(sourceId)}`, usedIds);
  usedIds.add(id);

  return {
    ok: true,
    placement: {
      id,
      roomId,
      catalogId,
      position: { x: round(origin.x + x), z: round(origin.z + z) },
      rotation,
      size: { width, depth, height },
      materialVariants: typeof item.color === "string" ? { color: item.color } : undefined,
      metadata: {
        source: "Lokale v2-Planerdaten",
        confidence: "legacy",
        notes: typeof item.name === "string" ? [item.name] : undefined,
      },
    },
  };
}

function getLegacyRoomRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion === 2 && record.rooms && typeof record.rooms === "object" && !Array.isArray(record.rooms)) {
    return record.rooms as Record<string, unknown>;
  }
  return record;
}

function isV3Candidate(value: unknown): value is PlannerDocumentV3 {
  return Boolean(value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === 3);
}

function collectUnmappedRoom(
  roomId: string,
  value: unknown,
  reason: string,
  warnings: string[],
  unmapped: UnmappedLegacyItem[],
) {
  warnings.push(`${roomId}: unbekannter Raum bleibt nur in der Sicherung erhalten.`);
  if (Array.isArray(value)) {
    value.forEach((item) => unmapped.push({ roomId, reason, value: item }));
  } else {
    unmapped.push({ roomId, reason, value });
  }
}

function collectEntityIds(document: PlannerDocumentV3) {
  return new Set([
    document.id,
    ...document.walls.map((item) => item.id),
    ...document.rooms.map((item) => item.id),
    ...document.openings.map((item) => item.id),
    ...document.builtIns.map((item) => item.id),
    ...document.fixtures.map((item) => item.id),
    ...document.placements.map((item) => item.id),
  ]);
}

function uniqueId(preferred: string, usedIds: Set<string>) {
  if (!usedIds.has(preferred)) return preferred;
  let suffix = 2;
  while (usedIds.has(`${preferred}-${suffix}`)) suffix += 1;
  return `${preferred}-${suffix}`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function safeStringify(value: unknown) {
  try {
    const result = JSON.stringify(value, (_key, candidate) => {
      if (typeof candidate === "number" && !Number.isFinite(candidate)) {
        return `__nonfinite:${String(candidate)}`;
      }
      return candidate;
    });
    return result ?? "null";
  } catch {
    return "\"__unserializable-legacy-data\"";
  }
}
