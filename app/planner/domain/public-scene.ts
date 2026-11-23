import { DEFAULT_APARTMENT_DOCUMENT } from "./apartment-v3.ts";
import { parsePlannerDocument } from "./schema.ts";
import type { PlannerDocumentV3 } from "./types.ts";

const BEDROOM_ID = "zimmer1";

function restoreBedroomConnections<T extends { id: string; roomIds?: string[] }>(
  saved: readonly T[],
  canonical: readonly T[],
): T[] {
  const byId = new Map(saved.map((item) => [item.id, item]));
  for (const item of canonical) {
    const index = item.roomIds?.indexOf(BEDROOM_ID) ?? -1;
    if (index < 0) continue;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, structuredClone(item));
    } else if (!existing.roomIds?.includes(BEDROOM_ID)) {
      const roomIds = [...(existing.roomIds ?? [])];
      roomIds.splice(index, 0, BEDROOM_ID);
      byId.set(item.id, { ...existing, roomIds });
    }
  }
  return [...byId.values()];
}

/** Repair browser saves created by the former public projection without Zimmer 1. */
export function projectPublicApartmentDocument(document: PlannerDocumentV3): PlannerDocumentV3 {
  const canonical = DEFAULT_APARTMENT_DOCUMENT;
  const roomIds = new Set(document.rooms.map((room) => room.id));
  if (document.id !== canonical.id || roomIds.has(BEDROOM_ID)
    || canonical.rooms.some((room) => room.id !== BEDROOM_ID && !roomIds.has(room.id))) return document;

  const bedroom = canonical.rooms.find((room) => room.id === BEDROOM_ID);
  if (!bedroom) return document;
  const rooms = [...document.rooms];
  rooms.splice(rooms.findIndex((room) => room.id === "zimmer2"), 0, structuredClone(bedroom));

  const inBedroom = (item: { roomId: string }) => item.roomId === BEDROOM_ID;
  const doorStates = { ...document.doorStates };
  for (const opening of canonical.openings) {
    if (opening.kind === "door" && opening.roomIds?.includes(BEDROOM_ID)) {
      doorStates[opening.id] ??= canonical.doorStates[opening.id];
    }
  }

  const restored = {
    ...document,
    rooms,
    walls: restoreBedroomConnections(document.walls, canonical.walls),
    openings: restoreBedroomConnections(document.openings, canonical.openings),
    builtIns: [...document.builtIns, ...structuredClone(canonical.builtIns.filter(inBedroom))],
    fixtures: [...document.fixtures, ...structuredClone(canonical.fixtures.filter(inBedroom))],
    placements: [...document.placements, ...structuredClone(canonical.placements.filter(inBedroom))],
    doorStates,
  };
  // Imported plans may use custom wall geometry. Do not replace a valid plan with an incompatible merge.
  try { parsePlannerDocument(restored); }
  catch { return document; }
  return restored;
}
