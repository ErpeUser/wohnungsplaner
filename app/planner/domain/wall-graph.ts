import type {
  PlannerDocumentV3,
  PlannerRoom,
  PlannerWall,
  Point2,
  WallRef,
} from "./types.ts";

const POINT_EPSILON = 0.001;

export type RoomOutlineInput = Pick<
  PlannerRoom,
  "id" | "name" | "area" | "includedInWnf" | "surfaces" | "metadata"
> & {
  outline: Point2[];
};

export function deriveWallLength(wall: Pick<PlannerWall, "start" | "end">) {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
}

export function deriveRoomPolygon(document: PlannerDocumentV3, roomId: string): Point2[] {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  if (!room) throw new Error(`Unknown room: ${roomId}`);
  const walls = new Map(document.walls.map((wall) => [wall.id, wall]));

  return room.boundary.map((reference) => {
    const wall = walls.get(reference.wallId);
    if (!wall) throw new Error(`Room ${roomId} references unknown wall ${reference.wallId}`);
    return reference.direction === 1 ? wall.start : wall.end;
  });
}

export function buildWallGraph(roomOutlines: RoomOutlineInput[]): {
  walls: PlannerWall[];
  rooms: PlannerRoom[];
} {
  const walls: PlannerWall[] = [];
  const wallBySegment = new Map<string, PlannerWall>();
  const boundaries = new Map<string, WallRef[]>();

  for (const room of roomOutlines) {
    const boundary: WallRef[] = [];
    room.outline.forEach((start, index) => {
      const end = room.outline[(index + 1) % room.outline.length];
      const key = segmentKey(start, end);
      let wall = wallBySegment.get(key);
      if (!wall) {
        wall = {
          id: `wall-${room.id}-${index + 1}`,
          start: normalizePoint(start),
          end: normalizePoint(end),
          thickness: 0.12,
          height: 2.6,
          roomIds: [room.id],
        };
        walls.push(wall);
        wallBySegment.set(key, wall);
      } else if (!wall.roomIds.includes(room.id)) {
        wall.roomIds.push(room.id);
      }

      boundary.push({
        wallId: wall.id,
        direction: pointsEqual(wall.start, start) && pointsEqual(wall.end, end) ? 1 : -1,
      });
    });
    boundaries.set(room.id, boundary);
  }

  return {
    walls,
    rooms: roomOutlines.map((room) => ({
      id: room.id,
      name: room.name,
      area: room.area,
      includedInWnf: room.includedInWnf,
      surfaces: room.surfaces,
      metadata: room.metadata,
      boundary: boundaries.get(room.id) ?? [],
    })),
  };
}

function segmentKey(start: Point2, end: Point2) {
  const left = pointKey(start);
  const right = pointKey(end);
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function pointKey(point: Point2) {
  return `${normalize(point.x)},${normalize(point.z)}`;
}

function normalizePoint(point: Point2): Point2 {
  return { x: normalize(point.x), z: normalize(point.z) };
}

function normalize(value: number) {
  return Number(value.toFixed(4));
}

function pointsEqual(left: Point2, right: Point2) {
  return Math.hypot(left.x - right.x, left.z - right.z) <= POINT_EPSILON;
}
