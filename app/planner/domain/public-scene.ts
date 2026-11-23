import type { PlannerDocumentV3 } from "./types.ts";

/**
 * Projects the canonical apartment into the public starter scene.
 *
 * The public workspace uses the complete canonical apartment so every supplied
 * room, including Zimmer 1, remains available alongside its catalogue products.
 */
export function projectPublicApartmentDocument(document: PlannerDocumentV3): PlannerDocumentV3 {
  const visibleRoomIds = new Set(document.rooms.map((room) => room.id));
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
