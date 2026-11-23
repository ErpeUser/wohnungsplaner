import { DEFAULT_APARTMENT_DOCUMENT } from "./apartment-v3.ts";
import { parsePlannerDocument } from "./schema.ts";
import type { PlannerDocumentV3, Point2 } from "./types.ts";

const WC = "wc";
const STORAGE = "abstellraum";
const PARTITION = "wall-abstellraum-4-1";
const LEGACY_SIDE = "wall-wc-2-1";
const SHARED_SIDE = "wall-abstellraum-4-2";
const PARTITION_TIP = "wall-abstellraum-4-3";
const UPDATED_WALLS = new Set([
  "wall-wc-1-1", LEGACY_SIDE, "wall-wc-3-1", "wall-wc-4-1", PARTITION, SHARED_SIDE, PARTITION_TIP,
]);

export function getWcClearOutline(document: PlannerDocumentV3): Point2[] | null {
  const walls = document.walls.filter((wall) => wall.roomIds.includes(WC));
  const vertical = walls.filter((wall) => Math.abs(wall.start.x - wall.end.x) < 0.001);
  const horizontal = walls.filter((wall) => Math.abs(wall.start.z - wall.end.z) < 0.001);
  if (vertical.length !== 2 || horizontal.length !== 2) return null;
  vertical.sort((a, b) => a.start.x - b.start.x);
  horizontal.sort((a, b) => a.start.z - b.start.z);
  const [west, east] = vertical;
  const [north, south] = horizontal;
  const x1 = west.start.x + west.thickness / 2;
  const x2 = east.start.x - east.thickness / 2;
  const z1 = north.start.z + north.thickness / 2;
  const z2 = south.start.z - south.thickness / 2;
  return [{ x: x1, z: z1 }, { x: x2, z: z1 }, { x: x2, z: z2 }, { x: x1, z: z2 }];
}

export function restoreWcMeasuredLayout(document: PlannerDocumentV3): PlannerDocumentV3 {
  const canonical = DEFAULT_APARTMENT_DOCUMENT;
  const oldRear = document.walls.find((wall) => wall.id === "wall-wc-1-1");
  if (document.id !== canonical.id || oldRear?.start.x !== -2.42 || oldRear.start.z !== 4.1
    || oldRear.end.x !== -1.52 || oldRear.end.z !== 4.1
    || !document.rooms.some((room) => room.id === STORAGE)
    || document.openings.some((opening) => UPDATED_WALLS.has(opening.wallId))) return document;

  const walls = canonical.walls.filter((wall) => UPDATED_WALLS.has(wall.id)).map((wall) => {
    const saved = document.walls.find((item) => item.id === wall.id);
    return { ...wall, height: saved?.height ?? wall.height, metadata: saved?.metadata ?? wall.metadata };
  });
  const roomBoundaries = new Map(canonical.rooms.map((room) => [room.id, room.boundary]));
  const positions = new Map([
    ...canonical.builtIns.filter((item) => item.roomId === WC),
    ...canonical.fixtures.filter((item) => item.roomId === WC),
  ].map((item) => [item.id, item.position]));

  function remapWall<T extends { wallId?: string; position: Point2 }>(item: T): T {
    if (item.wallId === LEGACY_SIDE) return { ...item, wallId: SHARED_SIDE };
    if (item.wallId !== PARTITION) return item;
    const wallId = item.position.z > 5.68 ? PARTITION : item.position.z < 4.14 ? PARTITION_TIP : SHARED_SIDE;
    return { ...item, wallId };
  }

  const restored = {
    ...document,
    rooms: document.rooms.map((room) => room.id === WC || room.id === STORAGE
      ? { ...room, boundary: roomBoundaries.get(room.id)! }
      : room),
    walls: [...document.walls.filter((wall) => !UPDATED_WALLS.has(wall.id)), ...walls],
    builtIns: document.builtIns.map((item) => positions.has(item.id)
      ? { ...item, position: positions.get(item.id)! } : item),
    fixtures: document.fixtures.map((item) => remapWall(positions.has(item.id)
      ? { ...item, position: positions.get(item.id)! } : item)),
    placements: document.placements.map(remapWall),
  };
  try { parsePlannerDocument(restored); }
  catch { return document; }
  return restored;
}
