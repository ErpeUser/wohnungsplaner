import type { PlannerDocumentV3 } from "./types.ts";

/** Zimmer 1 is retained in the canonical planning source for migrations and catalogue references. */
const PUBLIC_REMOVED_ROOM_IDS = new Set(["zimmer1"]);

/**
 * Projects the canonical apartment into the public starter scene.
 *
 * The source document intentionally remains complete: old exports, migration
 * code and product references still need the test room. Only the document fed
 * to the normal workspace is reduced, so Zimmer 1's products stay available in
 * the catalogue without appearing in the public scene.
 */
export function projectPublicApartmentDocument(document: PlannerDocumentV3): PlannerDocumentV3 {
  const visibleRoomIds = new Set(document.rooms
    .map((room) => room.id)
    .filter((roomId) => !PUBLIC_REMOVED_ROOM_IDS.has(roomId)));
  const rooms = document.rooms.filter((room) => visibleRoomIds.has(room.id));
  const walls = document.walls
    .map((wall) => ({ ...wall, roomIds: wall.roomIds.filter((roomId) => visibleRoomIds.has(roomId)) }))
    .filter((wall) => wall.roomIds.length > 0);
  const wallIds = new Set(walls.map((wall) => wall.id));
  const openings = document.openings
    .map((opening) => ({ ...opening, roomIds: opening.roomIds?.filter((roomId) => visibleRoomIds.has(roomId)) }))
    .filter((opening) => (opening.roomIds?.length ?? 0) > 0 && wallIds.has(opening.wallId));
  const openingIds = new Set(openings.map((opening) => opening.id));

  return {
    ...document,
    walls,
    rooms,
    openings,
    builtIns: document.builtIns.filter((item) => visibleRoomIds.has(item.roomId)),
    fixtures: document.fixtures.filter((item) => visibleRoomIds.has(item.roomId)),
    placements: document.placements.filter((item) => visibleRoomIds.has(item.roomId)),
    doorStates: Object.fromEntries(Object.entries(document.doorStates).filter(([openingId]) => openingIds.has(openingId))),
    viewPreferences: {
      ...document.viewPreferences,
      activeRoomId: document.viewPreferences.activeRoomId && visibleRoomIds.has(document.viewPreferences.activeRoomId)
        ? document.viewPreferences.activeRoomId
        : null,
    },
  };
}
