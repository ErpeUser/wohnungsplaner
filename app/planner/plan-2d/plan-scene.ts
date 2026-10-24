import { openingSegment, placementPolygon } from "../domain/geometry.ts";
import type {
  PlannerDocumentV3,
  PlannerOpening,
  PlannerViewPreferences,
  Point2,
} from "../domain/types.ts";
import { deriveRoomPolygon, deriveWallLength } from "../domain/wall-graph.ts";

export type PlanRoomDescriptor = {
  id: string;
  name: string;
  area: number;
  includedInWnf: boolean;
  floorMaterialId: string;
  points: Point2[];
};

export type PlanWallDescriptor = {
  id: string;
  start: Point2;
  end: Point2;
  thickness: number;
  roomIds: string[];
};

export type PlanOpeningDescriptor = {
  id: string;
  label: string;
  wallId: string;
  kind: PlannerOpening["kind"];
  hinge: PlannerOpening["hinge"];
  swingDegrees: number;
  width: number;
  start: Point2;
  end: Point2;
  state: "open" | "closed" | null;
};

export type PlanObjectDescriptor = {
  id: string;
  label: string;
  roomId: string;
  kind: string;
  points: Point2[];
  locked: boolean;
};

export type PlanFixtureDescriptor = {
  id: string;
  label: string;
  roomId: string;
  kind: string;
  position: Point2;
};

export type PlanDimensionDescriptor = {
  id: string;
  start: Point2;
  end: Point2;
  label: string;
};

export type PlanGuideDescriptor = {
  id: string;
  axis: "x" | "z";
  value: number;
  label?: string;
};

export type PlanBounds = {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
};

export type PlanScene = {
  orientation: "north-up";
  activeRoomId: string | null;
  rooms: PlanRoomDescriptor[];
  walls: PlanWallDescriptor[];
  openings: PlanOpeningDescriptor[];
  builtIns: PlanObjectDescriptor[];
  fixtures: PlanFixtureDescriptor[];
  dimensions: PlanDimensionDescriptor[];
  guides: PlanGuideDescriptor[];
  bounds: PlanBounds;
};

export type PlanSceneOptions = {
  activeRoomId: string | null;
  overlays: PlannerViewPreferences["overlays"];
  guides?: PlanGuideDescriptor[];
};

export type PlanViewport = {
  x: number;
  y: number;
  scale: number;
  minScale: number;
  maxScale: number;
};

export function createPlanScene(
  document: PlannerDocumentV3,
  options: PlanSceneOptions,
): PlanScene {
  const rooms = document.rooms
    .filter((room) => !options.activeRoomId || room.id === options.activeRoomId)
    .map((room) => ({
      id: room.id,
      name: room.name,
      area: room.area,
      includedInWnf: room.includedInWnf,
      floorMaterialId: room.surfaces.floor,
      points: deriveRoomPolygon(document, room.id),
    }));
  const roomIds = new Set(rooms.map((room) => room.id));
  const walls = document.walls
    .filter((wall) => wall.roomIds.some((roomId) => roomIds.has(roomId)))
    .map((wall) => ({
      id: wall.id,
      start: wall.start,
      end: wall.end,
      thickness: wall.thickness,
      roomIds: wall.roomIds.filter((roomId) => roomIds.has(roomId)),
    }));
  const wallIds = new Set(walls.map((wall) => wall.id));
  const openings = document.openings
    .filter((opening) => wallIds.has(opening.wallId))
    .map((opening) => {
      const segment = openingSegment(document, opening);
      return {
        id: opening.id,
        label: opening.label,
        wallId: opening.wallId,
        kind: opening.kind,
        hinge: opening.hinge,
        swingDegrees: opening.swingDegrees,
        width: opening.width,
        start: segment.start,
        end: segment.end,
        state: opening.kind === "door" ? document.doorStates[opening.id] ?? "closed" : null,
      };
    });
  const builtIns = document.builtIns
    .filter((item) => roomIds.has(item.roomId))
    .map((item) => ({
      id: item.id,
      label: item.label,
      roomId: item.roomId,
      kind: item.kind,
      points: placementPolygon(item),
      locked: true,
    }));
  const fixtures = options.overlays.fixtures
    ? document.fixtures
      .filter((fixture) => roomIds.has(fixture.roomId))
      .map((fixture) => ({
        id: fixture.id,
        label: fixture.label,
        roomId: fixture.roomId,
        kind: fixture.kind,
        position: fixture.position,
      }))
    : [];
  const dimensions = options.overlays.dimensions
    ? walls.map((wall) => ({
      id: `dimension-${wall.id}`,
      start: wall.start,
      end: wall.end,
      label: `${Math.round(deriveWallLength(wall) * 100)} cm`,
    }))
    : [];

  return {
    orientation: "north-up",
    activeRoomId: options.activeRoomId,
    rooms,
    walls,
    openings,
    builtIns,
    fixtures,
    dimensions,
    guides: options.guides ?? [],
    bounds: boundsFromRooms(rooms),
  };
}

export function fitPlanViewport(
  scene: Pick<PlanScene, "bounds">,
  viewport: { width: number; height: number; padding?: number },
): PlanViewport {
  const padding = viewport.padding ?? 44;
  const worldWidth = Math.max(0.1, scene.bounds.maxX - scene.bounds.minX);
  const worldHeight = Math.max(0.1, scene.bounds.maxZ - scene.bounds.minZ);
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const scale = Math.min(availableWidth / worldWidth, availableHeight / worldHeight);
  const renderedWidth = worldWidth * scale;
  const renderedHeight = worldHeight * scale;

  return {
    x: (viewport.width - renderedWidth) / 2 - scene.bounds.minX * scale,
    y: (viewport.height - renderedHeight) / 2 - scene.bounds.minZ * scale,
    scale,
    minScale: scale * 0.35,
    maxScale: scale * 6,
  };
}

export function zoomPlanViewportAtPoint(
  viewport: PlanViewport,
  pointer: Point2,
  factor: number,
): PlanViewport {
  const scale = clamp(viewport.scale * factor, viewport.minScale, viewport.maxScale);
  const world = {
    x: (pointer.x - viewport.x) / viewport.scale,
    z: (pointer.z - viewport.y) / viewport.scale,
  };
  return {
    ...viewport,
    scale,
    x: pointer.x - world.x * scale,
    y: pointer.z - world.z * scale,
  };
}

export function worldToScreen(point: Point2, viewport: PlanViewport): Point2 {
  return {
    x: viewport.x + point.x * viewport.scale,
    z: viewport.y + point.z * viewport.scale,
  };
}

function boundsFromRooms(rooms: PlanRoomDescriptor[]): PlanBounds {
  const points = rooms.flatMap((room) => room.points);
  if (points.length === 0) return { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
