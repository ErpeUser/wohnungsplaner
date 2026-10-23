import { APARTMENT_MODEL, type ApartmentOpening, type ApartmentSpaceId } from "./apartment-model";
import { kitchenBaseFootprints } from "./kitchen-model";
import type { PlannerFurnitureItem, Point, RoomId } from "./room-model";

export type ApartmentBounds = { minX: number; minY: number; maxX: number; maxY: number };

export type ApartmentWallSpan = {
  id: string;
  spaceId: ApartmentSpaceId;
  start: Point;
  end: Point;
  bottom: number;
  height: number;
  openingId?: string;
  openingKind?: ApartmentOpening["kind"];
};

export type WalkObstacle = {
  id: string;
  polygon: Point[];
};

const WALL_HEIGHT = 2.6;
const DOOR_HEAD = 2.04;
const WINDOW_SILL = 0.9;
const WINDOW_HEAD = 2.15;

const boundsOfPoints = (points: readonly Point[]): ApartmentBounds => ({
  minX: Math.min(...points.map((point) => point.x)),
  minY: Math.min(...points.map((point) => point.y)),
  maxX: Math.max(...points.map((point) => point.x)),
  maxY: Math.max(...points.map((point) => point.y)),
});

export function apartmentBounds(): ApartmentBounds {
  return boundsOfPoints(APARTMENT_MODEL.spaces.flatMap((space) => space.outline));
}

const spaceBounds = (roomId: RoomId) => {
  const space = APARTMENT_MODEL.spaces.find((candidate) => candidate.id === roomId);
  if (!space) throw new Error(`Raum ${roomId} fehlt im Wohnungsmodell.`);
  return boundsOfPoints(space.outline);
};

export function roomLocalToApartment(roomId: RoomId, point: Point): Point {
  const bounds = spaceBounds(roomId);
  return {
    x: Number((bounds.minX + point.x).toFixed(4)),
    y: Number((bounds.minY + point.y).toFixed(4)),
  };
}

const pointToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) return { distance: Math.hypot(point.x - start.x, point.y - start.y), t: 0, closest: start };
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const closest = { x: start.x + t * dx, y: start.y + t * dy };
  return { distance: Math.hypot(point.x - closest.x, point.y - closest.y), t, closest };
};

const pointOnSegment = (point: Point, start: Point, end: Point, tolerance = 1e-7) =>
  pointToSegment(point, start, end).distance <= tolerance;

const pointInPolygon = (point: Point, polygon: readonly Point[]) => {
  if (polygon.some((start, index) => pointOnSegment(point, start, polygon[(index + 1) % polygon.length]))) return true;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

const projectToEdge = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  return lengthSquared <= 1e-12 ? 0 : ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
};

const openingParallelToEdge = (opening: ApartmentOpening, start: Point, end: Point) => {
  const ox = opening.x2 - opening.x1;
  const oy = opening.y2 - opening.y1;
  const ex = end.x - start.x;
  const ey = end.y - start.y;
  const denominator = Math.hypot(ox, oy) * Math.hypot(ex, ey);
  return denominator > 0 && Math.abs((ox * ex + oy * ey) / denominator) >= 0.985;
};

const wallOpeningAssignments = () => {
  const assignments = new Map<string, ApartmentOpening[]>();
  const unmatched = new Set(APARTMENT_MODEL.openings.map((opening) => opening.id));

  APARTMENT_MODEL.spaces.forEach((space) => {
    space.outline.forEach((start, edgeIndex) => {
      const end = space.outline[(edgeIndex + 1) % space.outline.length];
      const key = `${space.id}:${edgeIndex}`;
      const matching = APARTMENT_MODEL.openings.filter((opening) => {
        if (!opening.rooms.includes(space.id) || !openingParallelToEdge(opening, start, end)) return false;
        const distance = Math.max(
          pointToSegment({ x: opening.x1, y: opening.y1 }, start, end).distance,
          pointToSegment({ x: opening.x2, y: opening.y2 }, start, end).distance,
        );
        return distance <= 0.22;
      });
      if (matching.length) {
        assignments.set(key, matching);
        matching.forEach((opening) => unmatched.delete(opening.id));
      }
    });
  });

  for (const openingId of unmatched) {
    const opening = APARTMENT_MODEL.openings.find((candidate) => candidate.id === openingId);
    if (!opening) continue;
    const candidates = APARTMENT_MODEL.spaces
      .filter((space) => opening.rooms.includes(space.id))
      .flatMap((space) => space.outline.map((start, edgeIndex) => {
        const end = space.outline[(edgeIndex + 1) % space.outline.length];
        const distance =
          pointToSegment({ x: opening.x1, y: opening.y1 }, start, end).distance +
          pointToSegment({ x: opening.x2, y: opening.y2 }, start, end).distance;
        return { space, edgeIndex, distance, parallel: openingParallelToEdge(opening, start, end) };
      }))
      .sort((left, right) => Number(right.parallel) - Number(left.parallel) || left.distance - right.distance);
    const closest = candidates[0];
    if (!closest) continue;
    const key = `${closest.space.id}:${closest.edgeIndex}`;
    assignments.set(key, [...(assignments.get(key) ?? []), opening]);
  }
  return assignments;
};

export function buildApartmentWallSpans(): ApartmentWallSpan[] {
  const assignments = wallOpeningAssignments();
  const spans: ApartmentWallSpan[] = [];
  APARTMENT_MODEL.spaces.forEach((space) => {
    space.outline.forEach((start, edgeIndex) => {
      const end = space.outline[(edgeIndex + 1) % space.outline.length];
      const edgeOpenings = (assignments.get(`${space.id}:${edgeIndex}`) ?? [])
        .map((opening) => ({
          opening,
          low: Math.max(0, Math.min(projectToEdge({ x: opening.x1, y: opening.y1 }, start, end), projectToEdge({ x: opening.x2, y: opening.y2 }, start, end))),
          high: Math.min(1, Math.max(projectToEdge({ x: opening.x1, y: opening.y1 }, start, end), projectToEdge({ x: opening.x2, y: opening.y2 }, start, end))),
        }))
        .filter(({ high, low }) => high - low > 0.015)
        .sort((left, right) => left.low - right.low);
      const pointAt = (t: number): Point => ({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
      const add = (suffix: string, from: number, to: number, bottom: number, height: number, opening?: ApartmentOpening) => {
        if (to - from <= 0.002 || height <= 0.002) return;
        spans.push({
          id: `${space.id}-${edgeIndex}-${suffix}`,
          spaceId: space.id,
          start: pointAt(from),
          end: pointAt(to),
          bottom,
          height,
          openingId: opening?.id,
          openingKind: opening?.kind,
        });
      };
      let cursor = 0;
      edgeOpenings.forEach(({ opening, low, high }, openingIndex) => {
        add(`solid-${openingIndex}`, cursor, low, 0, WALL_HEIGHT);
        if (opening.kind === "door") {
          add(`door-header-${openingIndex}`, low, high, DOOR_HEAD, WALL_HEIGHT - DOOR_HEAD, opening);
        } else {
          add(`window-sill-${openingIndex}`, low, high, 0, WINDOW_SILL, opening);
          add(`window-header-${openingIndex}`, low, high, WINDOW_HEAD, WALL_HEIGHT - WINDOW_HEAD, opening);
        }
        cursor = Math.max(cursor, high);
      });
      add("solid-end", cursor, 1, 0, WALL_HEIGHT);
    });
  });
  return spans;
}

export function roomAtApartmentPoint(point: Point): RoomId | null {
  return APARTMENT_MODEL.spaces.find((space) => pointInPolygon(point, space.outline))?.id ?? null;
}

const nearestPointOnOutline = (point: Point, outline: readonly Point[]) =>
  outline
    .map((start, index) => pointToSegment(point, start, outline[(index + 1) % outline.length]))
    .sort((left, right) => left.distance - right.distance)[0]?.closest ?? point;

const pointInDoorPortal = (point: Point, opening: ApartmentOpening, radius: number) => {
  if (opening.kind !== "door" || opening.rooms.length < 2) return false;
  const start = { x: opening.x1, y: opening.y1 };
  const end = { x: opening.x2, y: opening.y2 };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.01) return false;
  const along = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length);
  const perpendicular = Math.abs((point.x - start.x) * dy - (point.y - start.y) * dx) / length;
  if (along >= -radius / length && along <= 1 + radius / length && perpendicular <= 0.42 + radius) return true;

  const midpoint = { x: (opening.x1 + opening.x2) / 2, y: (opening.y1 + opening.y2) / 2 };
  const corridorHalfWidth = Math.max(0.2, Math.min(0.36, length / 2 - 0.03));
  return opening.rooms.some((roomId) => {
    const space = APARTMENT_MODEL.spaces.find((candidate) => candidate.id === roomId);
    if (!space) return false;
    const boundary = nearestPointOnOutline(midpoint, space.outline);
    return pointToSegment(point, midpoint, boundary).distance <= corridorHalfWidth + radius;
  });
};

const kitchenObstacles: WalkObstacle[] = kitchenBaseFootprints().map((footprint) => ({ ...footprint }));

const pointInObstacle = (point: Point, obstacle: WalkObstacle, radius: number) => {
  if (pointInPolygon(point, obstacle.polygon)) return true;
  return obstacle.polygon.some((start, index) => pointToSegment(point, start, obstacle.polygon[(index + 1) % obstacle.polygon.length]).distance < radius);
};

const inWalkableUnion = (point: Point, radius: number) =>
  APARTMENT_MODEL.spaces.some((space) => pointInPolygon(point, space.outline)) ||
  APARTMENT_MODEL.openings.some((opening) => pointInDoorPortal(point, opening, radius));

export function isApartmentWalkable(point: Point, radius: number, obstacles: readonly WalkObstacle[] = []): boolean {
  const samplePoints = [
    point,
    ...Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2;
      return { x: point.x + Math.cos(angle) * radius, y: point.y + Math.sin(angle) * radius };
    }),
  ];
  const allObstacles = [...kitchenObstacles, ...obstacles];
  return samplePoints.every((sample) => inWalkableUnion(sample, radius) && !allObstacles.some((obstacle) => pointInObstacle(sample, obstacle, radius)));
}

export function furnitureObstacle(roomId: RoomId, item: PlannerFurnitureItem): WalkObstacle {
  const center = roomLocalToApartment(roomId, { x: item.x, y: item.y });
  const radians = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotate = (x: number, y: number): Point => ({
    x: center.x + x * cos - y * sin,
    y: center.y + x * sin + y * cos,
  });
  return {
    id: item.id,
    polygon: [
      rotate(-item.w / 2, -item.d / 2),
      rotate(item.w / 2, -item.d / 2),
      rotate(item.w / 2, item.d / 2),
      rotate(-item.w / 2, item.d / 2),
    ],
  };
}
