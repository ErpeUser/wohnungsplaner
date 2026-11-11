import type {
  PlannerBuiltIn,
  PlannerDocumentV3,
  PlannerOpening,
  PlannerPlacement,
  Point2,
  Size3,
} from "./types.ts";
import { deriveRoomPolygon } from "./wall-graph.ts";

export const GEOMETRY_EPSILON = 0.001;
const DOOR_SAFETY_MARGIN = 0.05;
const PASSAGE_DEPTH = 0.6;

type RectangularItem = Pick<PlannerPlacement | PlannerBuiltIn, "position" | "rotation" | "size">;

export function placementPolygon(item: RectangularItem): Point2[] {
  const halfWidth = item.size.width / 2;
  const halfDepth = item.size.depth / 2;
  const radians = item.rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ].map((point) => ({
    x: normalize(item.position.x + point.x * cosine - point.z * sine),
    z: normalize(item.position.z + point.x * sine + point.z * cosine),
  }));
}

export function pointInPolygon(point: Point2, polygon: Point2[]): boolean {
  if (polygon.length < 3) return false;
  if (polygon.some((start, index) => pointOnSegment(point, start, polygon[(index + 1) % polygon.length]))) {
    return true;
  }

  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const before = polygon[previous];
    if (
      (current.z > point.z) !== (before.z > point.z)
      && point.x < ((before.x - current.x) * (point.z - current.z)) / (before.z - current.z) + current.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function roomAtPoint(document: PlannerDocumentV3, point: Point2): string | null {
  return document.rooms.find((room) => pointInPolygon(point, deriveRoomPolygon(document, room.id)))?.id ?? null;
}

export function roomContainsPlacement(
  document: PlannerDocumentV3,
  roomId: string,
  placement: RectangularItem,
): boolean {
  const room = deriveRoomPolygon(document, roomId);
  const footprint = placementPolygon(placement);
  if (!footprint.every((point) => pointInPolygon(point, room))) return false;
  // The room polygon follows wall centre lines. A footprint can therefore be
  // technically inside while still penetrating the physical wall face by half
  // the wall thickness. Keep doors/windows passable, then enforce the actual
  // interior face for every remaining boundary segment.
  if (!footprint.every((point) => hasWallFaceClearance(document, roomId, point))) return false;
  return !footprint.some((start, index) => {
    const end = footprint[(index + 1) % footprint.length];
    return room.some((roomStart, roomIndex) => (
      segmentsProperlyIntersect(start, end, roomStart, room[(roomIndex + 1) % room.length])
    ));
  });
}

function hasWallFaceClearance(document: PlannerDocumentV3, roomId: string, point: Point2) {
  const roomDefinition = document.rooms.find((candidate) => candidate.id === roomId);
  if (!roomDefinition) return false;
  const boundaryWalls = roomDefinition.boundary
    .map((edge) => document.walls.find((wall) => wall.id === edge.wallId))
    .filter((wall): wall is PlannerDocumentV3["walls"][number] => Boolean(wall));
  return boundaryWalls.every((wall) => {
    const clearance = wall.thickness / 2;
    if (distanceToSegment(point, wall.start, wall.end) >= clearance - GEOMETRY_EPSILON) return true;
    return document.openings.some((opening) => {
      if (opening.kind !== "door" && opening.kind !== "window" && opening.kind !== "passage") return false;
      if (opening.wallId !== wall.id) return false;
      try {
        const segment = openingSegment(document, opening);
        return distanceToSegment(point, segment.start, segment.end) <= clearance + GEOMETRY_EPSILON;
      } catch {
        return false;
      }
    });
  });
}

function distanceToSegment(point: Point2, start: Point2, end: Point2) {
  const direction = { x: end.x - start.x, z: end.z - start.z };
  const lengthSquared = direction.x ** 2 + direction.z ** 2;
  if (lengthSquared <= GEOMETRY_EPSILON ** 2) return Math.hypot(point.x - start.x, point.z - start.z);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * direction.x + (point.z - start.z) * direction.z) / lengthSquared));
  return Math.hypot(point.x - (start.x + direction.x * ratio), point.z - (start.z + direction.z * ratio));
}

export function doorSweepPolygon(document: PlannerDocumentV3, openingId: string): Point2[] {
  const { opening } = resolveOpening(document, openingId);
  if (opening.kind !== "door") return [];
  const { hinge, closedEnd, swingDirection } = doorPose(document, openingId);
  const leafDirection = unitVector(hinge, closedEnd);
  const radius = opening.width + DOOR_SAFETY_MARGIN;
  const steps = Math.max(8, Math.ceil(opening.swingDegrees / 6));
  const points = [hinge];

  for (let index = 0; index <= steps; index += 1) {
    const angle = swingDirection * opening.swingDegrees * (index / steps) * Math.PI / 180;
    points.push({
      x: normalize(hinge.x + (leafDirection.x * Math.cos(angle) - leafDirection.z * Math.sin(angle)) * radius),
      z: normalize(hinge.z + (leafDirection.x * Math.sin(angle) + leafDirection.z * Math.cos(angle)) * radius),
    });
  }
  return points;
}

export function doorPose(document: PlannerDocumentV3, openingId: string) {
  const { opening, start, end } = resolveOpening(document, openingId);
  if (opening.kind !== "door") throw new Error(`Opening ${openingId} is not a door`);
  const hinge = opening.hinge === "end" ? end : start;
  const closedEnd = opening.hinge === "end" ? start : end;
  const swingDirection = opening.swingDirection ?? (opening.hinge === "end" ? -1 : 1);
  const radians = swingDirection * opening.swingDegrees * Math.PI / 180;
  const relative = { x: closedEnd.x - hinge.x, z: closedEnd.z - hinge.z };
  const openEnd = {
    x: normalize(hinge.x + relative.x * Math.cos(radians) - relative.z * Math.sin(radians)),
    z: normalize(hinge.z + relative.x * Math.sin(radians) + relative.z * Math.cos(radians)),
  };
  return { hinge, closedEnd, openEnd, swingDirection };
}

export function doorPassagePolygon(document: PlannerDocumentV3, openingId: string): Point2[] {
  const { start, end } = resolveOpening(document, openingId);
  const tangent = unitVector(start, end);
  const normal = { x: -tangent.z, z: tangent.x };
  return [
    addScaled(start, normal, -PASSAGE_DEPTH),
    addScaled(end, normal, -PASSAGE_DEPTH),
    addScaled(end, normal, PASSAGE_DEPTH),
    addScaled(start, normal, PASSAGE_DEPTH),
  ];
}

export function polygonsIntersect(left: Point2[], right: Point2[]): boolean {
  if (left.length < 3 || right.length < 3) return false;
  if (left.some((point) => pointInPolygon(point, right))) return true;
  if (right.some((point) => pointInPolygon(point, left))) return true;

  return left.some((start, leftIndex) => {
    const end = left[(leftIndex + 1) % left.length];
    return right.some((otherStart, rightIndex) => (
      segmentsIntersect(start, end, otherStart, right[(rightIndex + 1) % right.length])
    ));
  });
}

export function openingSegment(document: PlannerDocumentV3, opening: PlannerOpening) {
  const wall = document.walls.find((candidate) => candidate.id === opening.wallId);
  if (!wall) throw new Error(`Opening ${opening.id} references unknown wall ${opening.wallId}`);
  const tangent = unitVector(wall.start, wall.end);
  const chain = document.walls
    .filter((candidate) => candidate.roomIds.some((roomId) => wall.roomIds.includes(roomId)))
    .map((candidate) => {
      const projected = [candidate.start, candidate.end].map((point) => ({
        point,
        distance: (point.x - wall.start.x) * tangent.x + (point.z - wall.start.z) * tangent.z,
        offset: Math.abs((point.x - wall.start.x) * tangent.z - (point.z - wall.start.z) * tangent.x),
      }));
      if (projected.some((point) => point.offset > GEOMETRY_EPSILON)) return null;
      return {
        start: Math.min(projected[0].distance, projected[1].distance),
        end: Math.max(projected[0].distance, projected[1].distance),
      };
    })
    .filter((interval): interval is { start: number; end: number } => interval !== null)
    .sort((left, right) => left.start - right.start);
  const requiredStart = opening.offset;
  const requiredEnd = opening.offset + opening.width;
  let covered = requiredStart;
  for (const interval of chain) {
    if (interval.start > covered + GEOMETRY_EPSILON) break;
    if (interval.end >= covered - GEOMETRY_EPSILON) covered = Math.max(covered, interval.end);
    if (covered >= requiredEnd - GEOMETRY_EPSILON) break;
  }
  if (covered < requiredEnd - GEOMETRY_EPSILON) {
    throw new Error(`Opening ${opening.id} is not covered by a contiguous wall chain`);
  }
  const start = addScaled(wall.start, tangent, requiredStart);
  const end = addScaled(wall.start, tangent, requiredEnd);
  return { wall, start, end };
}

function resolveOpening(document: PlannerDocumentV3, openingId: string) {
  const opening = document.openings.find((candidate) => candidate.id === openingId);
  if (!opening) throw new Error(`Unknown opening: ${openingId}`);
  return { opening, ...openingSegment(document, opening) };
}

function pointOnSegment(point: Point2, start: Point2, end: Point2) {
  const cross = (point.x - start.x) * (end.z - start.z) - (point.z - start.z) * (end.x - start.x);
  if (Math.abs(cross) > GEOMETRY_EPSILON) return false;
  const dot = (point.x - start.x) * (end.x - start.x) + (point.z - start.z) * (end.z - start.z);
  const lengthSquared = (end.x - start.x) ** 2 + (end.z - start.z) ** 2;
  return dot >= -GEOMETRY_EPSILON && dot <= lengthSquared + GEOMETRY_EPSILON;
}

function segmentsIntersect(a: Point2, b: Point2, c: Point2, d: Point2) {
  const orientation = (first: Point2, second: Point2, third: Point2) => (
    (second.z - first.z) * (third.x - second.x) - (second.x - first.x) * (third.z - second.z)
  );
  const values = [orientation(a, b, c), orientation(a, b, d), orientation(c, d, a), orientation(c, d, b)];
  if (Math.abs(values[0]) <= GEOMETRY_EPSILON && pointOnSegment(c, a, b)) return true;
  if (Math.abs(values[1]) <= GEOMETRY_EPSILON && pointOnSegment(d, a, b)) return true;
  if (Math.abs(values[2]) <= GEOMETRY_EPSILON && pointOnSegment(a, c, d)) return true;
  if (Math.abs(values[3]) <= GEOMETRY_EPSILON && pointOnSegment(b, c, d)) return true;
  return (values[0] > 0) !== (values[1] > 0) && (values[2] > 0) !== (values[3] > 0);
}

function segmentsProperlyIntersect(a: Point2, b: Point2, c: Point2, d: Point2) {
  const ab = { x: b.x - a.x, z: b.z - a.z };
  const cd = { x: d.x - c.x, z: d.z - c.z };
  const denominator = ab.x * cd.z - ab.z * cd.x;
  if (Math.abs(denominator) <= GEOMETRY_EPSILON) return false;
  const ac = { x: c.x - a.x, z: c.z - a.z };
  const t = (ac.x * cd.z - ac.z * cd.x) / denominator;
  const u = (ac.x * ab.z - ac.z * ab.x) / denominator;
  return t > GEOMETRY_EPSILON && t < 1 - GEOMETRY_EPSILON
    && u > GEOMETRY_EPSILON && u < 1 - GEOMETRY_EPSILON;
}

function unitVector(start: Point2, end: Point2) {
  const length = Math.hypot(end.x - start.x, end.z - start.z);
  if (length <= GEOMETRY_EPSILON) throw new Error("Cannot derive a direction from a zero-length segment");
  return { x: (end.x - start.x) / length, z: (end.z - start.z) / length };
}

function addScaled(point: Point2, vector: Point2, scale: number): Point2 {
  return { x: normalize(point.x + vector.x * scale), z: normalize(point.z + vector.z * scale) };
}

function normalize(value: number) {
  return Number(value.toFixed(6));
}

export type { Size3 };
