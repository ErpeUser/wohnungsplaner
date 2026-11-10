import { openingSegment, placementPolygon } from "../domain/geometry.ts";
import type {
  PlannerDocumentV3,
  PlannerOpening,
  PlannerViewPreferences,
  Point2,
} from "../domain/types.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";

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
  swingDirection: PlannerOpening["swingDirection"];
  swingDegrees: number;
  visualStyle?: PlannerOpening["visualStyle"];
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
  catalogId?: string;
  materialId?: string;
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
  wallStart: Point2;
  wallEnd: Point2;
  start: Point2;
  end: Point2;
  label: string;
  rotation: number;
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
    .filter((opening) => (
      wallIds.has(opening.wallId)
      || Boolean(options.activeRoomId && opening.roomIds?.includes(options.activeRoomId))
    ))
    .map((opening) => {
      const segment = openingSegment(document, opening);
      return {
        id: opening.id,
        label: opening.label,
        wallId: opening.wallId,
        kind: opening.kind,
        hinge: opening.hinge,
        swingDirection: opening.swingDirection,
        swingDegrees: opening.swingDegrees,
        visualStyle: opening.visualStyle,
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
      catalogId: item.catalogId,
      materialId: item.materialVariants?.main ?? item.materialVariants?.color,
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
    ? rooms.flatMap((room) => createRoomDimensions(room))
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
    bounds: boundsFromScene(
      rooms,
      openings,
      dimensions,
      [
        ...builtIns.flatMap((item) => item.points),
        ...document.placements
          .filter((item) => roomIds.has(item.roomId))
          .flatMap((item) => placementPolygon(item)),
        ...fixtures.map((fixture) => fixture.position),
      ],
    ),
  };
}

export function fitPlanViewport(
  scene: Pick<PlanScene, "bounds">,
  viewport: { width: number; height: number; padding?: number; topInset?: number; bottomInset?: number },
): PlanViewport {
  const padding = viewport.padding ?? 44;
  const topInset = Math.max(0, viewport.topInset ?? 0);
  const bottomInset = Math.max(0, viewport.bottomInset ?? 0);
  const worldWidth = Math.max(0.1, scene.bounds.maxX - scene.bounds.minX);
  const worldHeight = Math.max(0.1, scene.bounds.maxZ - scene.bounds.minZ);
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - topInset - bottomInset - padding * 2);
  const scale = Math.min(availableWidth / worldWidth, availableHeight / worldHeight);
  const renderedWidth = worldWidth * scale;
  const renderedHeight = worldHeight * scale;

  return {
    x: (viewport.width - renderedWidth) / 2 - scene.bounds.minX * scale,
    y: topInset + padding + (availableHeight - renderedHeight) / 2 - scene.bounds.minZ * scale,
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

export function zoomPlanViewportAtCenter(
  viewport: PlanViewport,
  size: { width: number; height: number },
  factor: number,
): PlanViewport {
  return zoomPlanViewportAtPoint(
    viewport,
    { x: size.width / 2, z: size.height / 2 },
    factor,
  );
}

export function planViewportZoomPercent(viewport: PlanViewport) {
  const fitScale = viewport.minScale / 0.35;
  return Math.round(viewport.scale / fitScale * 100);
}

export function resizePlanViewport(
  viewport: PlanViewport,
  previousSize: { width: number; height: number },
  nextSize: { width: number; height: number },
  scene: Pick<PlanScene, "bounds">,
  insets: { topInset?: number; bottomInset?: number; padding?: number } = {},
): PlanViewport {
  const topInset = Math.max(0, insets.topInset ?? 0);
  const bottomInset = Math.max(0, insets.bottomInset ?? 0);
  const previousCenterY = topInset + (previousSize.height - topInset - bottomInset) / 2;
  const nextCenterY = topInset + (nextSize.height - topInset - bottomInset) / 2;
  const worldCenter = {
    x: (previousSize.width / 2 - viewport.x) / viewport.scale,
    z: (previousCenterY - viewport.y) / viewport.scale,
  };
  const previousFitScale = viewport.minScale / 0.35;
  const zoomRatio = viewport.scale / previousFitScale;
  const nextFit = fitPlanViewport(scene, { ...nextSize, ...insets });
  const scale = clamp(nextFit.scale * zoomRatio, nextFit.minScale, nextFit.maxScale);
  return {
    ...nextFit,
    scale,
    x: nextSize.width / 2 - worldCenter.x * scale,
    y: nextCenterY - worldCenter.z * scale,
  };
}

export function wheelZoomFactor(deltaY: number, deltaMode = 0) {
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? 800 : 1;
  const normalizedDelta = clamp(deltaY * unit, -240, 240);
  return Math.exp(-normalizedDelta * 0.002);
}

export function worldToScreen(point: Point2, viewport: PlanViewport): Point2 {
  return {
    x: viewport.x + point.x * viewport.scale,
    z: viewport.y + point.z * viewport.scale,
  };
}

function boundsFromScene(
  rooms: PlanRoomDescriptor[],
  openings: PlanOpeningDescriptor[],
  dimensions: PlanDimensionDescriptor[],
  extraPoints: Point2[] = [],
): PlanBounds {
  const points = [
    ...rooms.flatMap((room) => room.points),
    ...openings.flatMap((opening) => [opening.start, opening.end]),
    ...dimensions.flatMap((dimension) => [dimension.start, dimension.end]),
    ...extraPoints,
  ];
  if (points.length === 0) return { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

function createRoomDimensions(room: PlanRoomDescriptor): PlanDimensionDescriptor[] {
  if (room.points.length < 2) return [];
  const center = room.points.reduce(
    (sum, point) => ({ x: sum.x + point.x / room.points.length, z: sum.z + point.z / room.points.length }),
    { x: 0, z: 0 },
  );
  const offset = 0.22;

  return room.points.flatMap((wallStart, index) => {
    const wallEnd = room.points[(index + 1) % room.points.length];
    const dx = wallEnd.x - wallStart.x;
    const dz = wallEnd.z - wallStart.z;
    const length = Math.hypot(dx, dz);
    const midpoint = { x: (wallStart.x + wallEnd.x) / 2, z: (wallStart.z + wallEnd.z) / 2 };
    if (length <= 0.001) return [];
    const normal = { x: -dz / length, z: dx / length };
    const positiveCandidate = { x: midpoint.x + normal.x * offset, z: midpoint.z + normal.z * offset };
    const negativeCandidate = { x: midpoint.x - normal.x * offset, z: midpoint.z - normal.z * offset };
    const positiveDistance = Math.hypot(positiveCandidate.x - center.x, positiveCandidate.z - center.z);
    const negativeDistance = Math.hypot(negativeCandidate.x - center.x, negativeCandidate.z - center.z);
    const outward = positiveDistance >= negativeDistance ? normal : { x: -normal.x, z: -normal.z };
    let rotation = Math.atan2(dz, dx) * 180 / Math.PI;
    if (rotation > 90) rotation -= 180;
    if (rotation <= -90) rotation += 180;

    return [{
      id: `dimension-${room.id}-${index}`,
      wallStart,
      wallEnd,
      start: { x: wallStart.x + outward.x * offset, z: wallStart.z + outward.z * offset },
      end: { x: wallEnd.x + outward.x * offset, z: wallEnd.z + outward.z * offset },
      label: `${Math.round(length * 100)} cm`,
      rotation,
    }];
  });
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
