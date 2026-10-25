import { openingSegment, pointInPolygon } from "../domain/geometry.ts";
import type {
  PlannerBuiltIn,
  PlannerDocumentV3,
  PlannerOpening,
  PlannerPlacement,
  PlannerWall,
  Point2,
} from "../domain/types.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";

export type SceneFloor = {
  id: string;
  roomId: string;
  materialId: string;
  points: Point2[];
};

export type SceneWallSegment = {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
};

export type SceneWall = {
  id: string;
  start: Point2;
  end: Point2;
  length: number;
  angle: number;
  thickness: number;
  height: number;
  roomIds: string[];
  openingIds: string[];
  segments: SceneWallSegment[];
};

export type SceneDoor = {
  id: string;
  label: string;
  state: "open" | "closed";
  hinge: Point2;
  width: number;
  height: number;
  baseAngle: number;
  openAngle: number;
  materialId: string;
};

export type SceneObject<T extends PlannerBuiltIn | PlannerPlacement> = {
  id: string;
  roomId: string;
  catalogId: string;
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  materialId: string;
  source: T;
};

export type SceneBounds = {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
};

export type SceneModel = {
  floors: SceneFloor[];
  walls: SceneWall[];
  doors: SceneDoor[];
  builtIns: Array<SceneObject<PlannerBuiltIn>>;
  placements: Array<SceneObject<PlannerPlacement>>;
  bounds: SceneBounds;
  center: [number, number, number];
};

export function createSceneModel(
  document: PlannerDocumentV3,
  activeRoomId: string | null,
): SceneModel {
  const rooms = document.rooms.filter((room) => !activeRoomId || room.id === activeRoomId);
  const roomIds = new Set(rooms.map((room) => room.id));
  const roomPolygons = rooms.map((room) => deriveRoomPolygon(document, room.id));
  const touchingOpeningWallIds = new Set(document.openings
    .filter((opening) => {
      if (!activeRoomId) return true;
      const { start, end } = openingSegment(document, opening);
      const midpoint = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
      return roomPolygons.some((polygon) => (
        pointInPolygon(start, polygon) || pointInPolygon(end, polygon) || pointInPolygon(midpoint, polygon)
      ));
    })
    .map((opening) => opening.wallId));
  const sourceWalls = document.walls.filter((wall) => (
    wall.roomIds.some((roomId) => roomIds.has(roomId)) || touchingOpeningWallIds.has(wall.id)
  ));
  const wallIds = new Set(sourceWalls.map((wall) => wall.id));
  const openings = document.openings.filter((opening) => wallIds.has(opening.wallId));
  const floors = rooms.map((room) => ({
    id: `floor-${room.id}`,
    roomId: room.id,
    materialId: room.surfaces.floor,
    points: deriveRoomPolygon(document, room.id),
  }));
  const walls = sourceWalls.map((wall) => {
    const wallOpenings = openings.filter((opening) => opening.wallId === wall.id);
    return {
      id: wall.id,
      start: wall.start,
      end: wall.end,
      length: distance(wall.start, wall.end),
      angle: Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x),
      thickness: wall.thickness,
      height: wall.height,
      roomIds: wall.roomIds.filter((roomId) => roomIds.has(roomId)),
      openingIds: wallOpenings.map((opening) => opening.id),
      segments: createWallSegments(wall, wallOpenings),
    };
  });
  const doors = openings
    .filter((opening) => opening.kind === "door")
    .map((opening) => createDoor(document, opening));
  const builtIns = document.builtIns
    .filter((item) => roomIds.has(item.roomId))
    .map((item) => objectDescriptor(item, item.catalogId ?? `builtin-${item.kind}`));
  const placements = document.placements
    .filter((item) => roomIds.has(item.roomId))
    .map((item) => objectDescriptor(item, item.catalogId));
  const bounds = boundsFromFloors(floors);

  return {
    floors,
    walls,
    doors,
    builtIns,
    placements,
    bounds,
    center: [(bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2],
  };
}

function createWallSegments(wall: PlannerWall, openings: PlannerOpening[]): SceneWallSegment[] {
  const length = distance(wall.start, wall.end);
  const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
  const tangent = { x: Math.cos(angle), z: Math.sin(angle) };
  const breaks = uniqueSorted([
    0,
    length,
    ...openings.flatMap((opening) => [
      clamp(opening.offset, 0, length),
      clamp(opening.offset + opening.width, 0, length),
    ]),
  ]);
  const segments: SceneWallSegment[] = [];

  for (let index = 0; index < breaks.length - 1; index += 1) {
    const from = breaks[index];
    const to = breaks[index + 1];
    const segmentLength = to - from;
    if (segmentLength <= 0.001) continue;
    const midpoint = (from + to) / 2;
    const cuts = openings.filter((opening) => (
      midpoint > opening.offset - 0.001
      && midpoint < opening.offset + opening.width + 0.001
    ));
    if (cuts.length === 0) {
      segments.push(segment(wall, tangent, angle, from, to, 0, wall.height, segments.length));
      continue;
    }
    const sill = Math.min(...cuts.map((opening) => opening.sill));
    const head = Math.max(...cuts.map((opening) => opening.sill + opening.height));
    if (sill > 0.001) segments.push(segment(wall, tangent, angle, from, to, 0, sill, segments.length));
    if (head < wall.height - 0.001) {
      segments.push(segment(wall, tangent, angle, from, to, head, wall.height - head, segments.length));
    }
  }
  return segments;
}

function segment(
  wall: PlannerWall,
  tangent: Point2,
  angle: number,
  from: number,
  to: number,
  elevation: number,
  height: number,
  index: number,
): SceneWallSegment {
  const center = (from + to) / 2;
  return {
    id: `${wall.id}-segment-${index}`,
    position: [
      wall.start.x + tangent.x * center,
      elevation + height / 2,
      wall.start.z + tangent.z * center,
    ],
    size: [to - from, height, wall.thickness],
    rotationY: -angle,
  };
}

function createDoor(document: PlannerDocumentV3, opening: PlannerOpening): SceneDoor {
  const { start, end } = openingSegment(document, opening);
  const hinge = opening.hinge === "end" ? end : start;
  const leafEnd = opening.hinge === "end" ? start : end;
  const baseAngle = Math.atan2(leafEnd.z - hinge.z, leafEnd.x - hinge.x);
  const direction = opening.hinge === "end" ? -1 : 1;
  return {
    id: opening.id,
    label: opening.label,
    state: document.doorStates[opening.id] ?? "closed",
    hinge,
    width: opening.width,
    height: opening.height,
    baseAngle,
    openAngle: baseAngle + direction * opening.swingDegrees * Math.PI / 180,
    materialId: "door-oak",
  };
}

function objectDescriptor<T extends PlannerBuiltIn | PlannerPlacement>(item: T, catalogId: string): SceneObject<T> {
  return {
    id: item.id,
    roomId: item.roomId,
    catalogId,
    position: [item.position.x, ("elevation" in item ? item.elevation ?? 0 : 0) + item.size.height / 2, item.position.z],
    size: [item.size.width, item.size.height, item.size.depth],
    rotationY: -item.rotation * Math.PI / 180,
    materialId: item.materialVariants?.main ?? item.materialVariants?.color ?? "object-neutral",
    source: item,
  };
}

function boundsFromFloors(floors: SceneFloor[]): SceneBounds {
  const points = floors.flatMap((floor) => floor.points);
  if (points.length === 0) return { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

function uniqueSorted(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(6))))].sort((left, right) => left - right);
}

function distance(left: Point2, right: Point2) {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
