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
  "id" | "name" | "area" | "includedInWnf" | "wnfArea" | "surfaces" | "metadata"
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
  const sourceSegments = roomOutlines.flatMap((room) => room.outline.map((start, index) => ({
    roomId: room.id,
    boundaryIndex: index,
    start: normalizePoint(start),
    end: normalizePoint(room.outline[(index + 1) % room.outline.length]),
  })));

  for (const room of roomOutlines) {
    const boundary: WallRef[] = [];
    room.outline.forEach((start, index) => {
      const end = room.outline[(index + 1) % room.outline.length];
      const splitPoints = collectSplitPoints(normalizePoint(start), normalizePoint(end), sourceSegments);
      splitPoints.slice(0, -1).forEach((pieceStart, pieceIndex) => {
        const pieceEnd = splitPoints[pieceIndex + 1];
        const key = segmentKey(pieceStart, pieceEnd);
        let wall = wallBySegment.get(key);
        if (!wall) {
          wall = {
            id: `wall-${room.id}-${index + 1}-${pieceIndex + 1}`,
            start: pieceStart,
            end: pieceEnd,
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
          direction: pointsEqual(wall.start, pieceStart) && pointsEqual(wall.end, pieceEnd) ? 1 : -1,
        });
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
      wnfArea: room.wnfArea,
      surfaces: room.surfaces,
      metadata: room.metadata,
      boundary: boundaries.get(room.id) ?? [],
    })),
  };
}

function collectSplitPoints(
  start: Point2,
  end: Point2,
  segments: Array<{ start: Point2; end: Point2 }>,
) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const values = [0, 1];
  for (const segment of segments) {
    for (const point of [segment.start, segment.end]) {
      if (!pointOnSegment(point, start, end)) continue;
      const t = ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared;
      if (t > POINT_EPSILON && t < 1 - POINT_EPSILON) values.push(t);
    }
  }
  return values
    .sort((left, right) => left - right)
    .filter((value, index, sorted) => index === 0 || Math.abs(value - sorted[index - 1]) > POINT_EPSILON)
    .map((value) => normalizePoint({ x: start.x + dx * value, z: start.z + dz * value }));
}

function pointOnSegment(point: Point2, start: Point2, end: Point2) {
  const cross = (point.x - start.x) * (end.z - start.z) - (point.z - start.z) * (end.x - start.x);
  if (Math.abs(cross) > POINT_EPSILON) return false;
  const dot = (point.x - start.x) * (end.x - start.x) + (point.z - start.z) * (end.z - start.z);
  const lengthSquared = (end.x - start.x) ** 2 + (end.z - start.z) ** 2;
  return dot >= -POINT_EPSILON && dot <= lengthSquared + POINT_EPSILON;
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
