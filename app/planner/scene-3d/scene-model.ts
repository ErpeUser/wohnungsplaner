import { doorPose, GEOMETRY_EPSILON, openingSegment, placementPolygon, pointInPolygon } from "../domain/geometry.ts";
import type {
  PlannerBuiltIn,
  PlannerAssetRecord,
  PlannerDocumentV3,
  PlannerFixture,
  PlannerOpening,
  PlannerPlacement,
  PlannerWall,
  Point2,
} from "../domain/types.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";
import { createHallTejoPillow, HALL_TEJO_PILLOW_ID } from "../domain/hall-tejo-pillow.ts";

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
  materialId: string;
  sideMaterialIds: [positiveZ: string, negativeZ: string];
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
  displayOpenAngle: number;
  materialId: string;
  frameCenter: Point2;
  frameAngle: number;
  visualStyle: "solid-white" | "solid-oak" | "glass-clear" | "glass-frosted";
  detailProfile: "standard" | "entry-security" | "vented";
  handleSides: "both";
  leafOutlineSides: "both";
};

export type SceneWindow = {
  id: string;
  label: string;
  position: [number, number, number];
  width: number;
  height: number;
  sill: number;
  rotationY: number;
  mullions: number;
};

export type SceneObject<T extends PlannerBuiltIn | PlannerPlacement> = {
  id: string;
  roomId: string;
  catalogId: string;
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  materialId: string;
  renderProfile: "box" | "bathtub" | "washer" | "wall-wc";
  asset?: PlannerAssetRecord;
  assetTransform?: {
    meterScale: number;
    pivot: PlannerAssetRecord["pivot"];
    floorOffset: number;
    normalizedSize: PlannerAssetRecord["normalizedSize"];
  };
  source: T;
};

export type SceneFixture = {
  id: string;
  roomId: string;
  kind: string;
  label: string;
  position: [number, number, number];
  rotationY: number;
  detailProfile: "standard" | "hall-distribution" | "hall-revision";
  mountingDepth: number;
  surfaceOffset: number;
  source: PlannerFixture;
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
  windows: SceneWindow[];
  builtIns: Array<SceneObject<PlannerBuiltIn>>;
  placements: Array<SceneObject<PlannerPlacement>>;
  fixtures: SceneFixture[];
  bounds: SceneBounds;
  center: [number, number, number];
};

export type PerspectiveCutaway = {
  hiddenWallIds: string[];
  hiddenOpeningIds: string[];
  hiddenObjectIds: string[];
  hiddenFixtureIds: string[];
};

const EMPTY_PERSPECTIVE_CUTAWAY: PerspectiveCutaway = {
  hiddenWallIds: [],
  hiddenOpeningIds: [],
  hiddenObjectIds: [],
  hiddenFixtureIds: [],
};

const HALL_GLASS_DOOR_SIGHTLINE_IDS = new Set([
  "builtin-living-slats",
  "builtin-living-moss",
  "builtin-living-clock",
  "builtin-living-panel-light",
]);

export function createSceneModel(
  document: PlannerDocumentV3,
  activeRoomId: string | null,
): SceneModel {
  const rooms = document.rooms.filter((room) => !activeRoomId || room.id === activeRoomId);
  const roomIds = new Set(rooms.map((room) => room.id));
  const scopedOpenings = document.openings.filter((opening) => {
    if (!activeRoomId) return true;
    if (opening.roomIds?.length) return opening.roomIds.includes(activeRoomId);
    return document.walls.find((wall) => wall.id === opening.wallId)?.roomIds.includes(activeRoomId) ?? false;
  });
  const sourceWalls = document.walls.filter((wall) => (
    wall.roomIds.some((roomId) => roomIds.has(roomId))
  ));
  const openings = scopedOpenings.filter((opening) => (
    sourceWalls.some((wall) => openingSliceOnWall(document, opening, wall) !== null)
    || Boolean(activeRoomId && opening.roomIds?.includes(activeRoomId))
  ));
  const floors = rooms.map((room) => ({
    id: `floor-${room.id}`,
    roomId: room.id,
    materialId: room.surfaces.floor,
    points: deriveRoomPolygon(document, room.id),
  }));
  const walls = sourceWalls.map((wall) => {
    const wallOpenings = openings.flatMap((opening) => {
      const slice = openingSliceOnWall(document, opening, wall);
      return slice ? [slice] : [];
    });
    const sideMaterialIds = wallSideMaterialIds(document, wall);
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
      materialId: sideMaterialIds[0],
      sideMaterialIds,
      segments: createWallSegments(wall, wallOpenings),
    };
  });
  const doors = openings
    .filter((opening) => opening.kind === "door")
    .map((opening) => createDoor(document, opening));
  const windows = openings
    .filter((opening) => opening.kind === "window")
    .map((opening) => createWindow(document, opening));
  const builtIns = document.builtIns
    .filter((item) => roomIds.has(item.roomId)
      || (activeRoomId === "vorraum" && HALL_GLASS_DOOR_SIGHTLINE_IDS.has(item.id)))
    .map((item) => objectDescriptor(item, item.catalogId ?? `builtin-${item.kind}`, document.assets?.find((asset) => asset.assetId === item.catalogId)));
  const placements = document.placements
    .filter((item) => roomIds.has(item.roomId))
    .map((item) => objectDescriptor(item, item.catalogId, document.assets?.find((asset) => asset.assetId === item.catalogId)));
  const fixtures = document.fixtures
    .filter((item) => roomIds.has(item.roomId))
    .map((item) => ({
      id: item.id,
      roomId: item.roomId,
      kind: item.kind,
      label: item.label,
      position: [item.position.x, item.height ?? 0.3, item.position.z] as [number, number, number],
      rotationY: -(item.rotation ?? 0) * Math.PI / 180,
      detailProfile: item.id === "fixture-hall-panel"
        ? "hall-distribution" as const
        : item.id === "fixture-hall-floor-heating-panel"
          ? "hall-revision" as const
          : "standard" as const,
      mountingDepth: item.id === "fixture-hall-panel" || item.id === "fixture-hall-floor-heating-panel"
        ? 0.004
        : 0.025,
      surfaceOffset: item.id === "fixture-hall-panel" || item.id === "fixture-hall-floor-heating-panel"
        ? 0.034
        : 0,
      source: item,
    }));
  const bounds = boundsFromFloors(floors);

  return {
    floors,
    walls,
    doors,
    windows,
    builtIns,
    placements,
    fixtures,
    bounds,
    center: [(bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2],
  };
}

export function derivePerspectiveCutaway(
  scene: SceneModel,
  camera: Point2,
  selectedId: string | null = null,
): PerspectiveCutaway {
  const roomId = scene.floors.length === 1 ? scene.floors[0]?.roomId : null;
  if (!roomId) return EMPTY_PERSPECTIVE_CUTAWAY;

  const center = { x: scene.center[0], z: scene.center[2] };
  const cameraOffset = { x: camera.x - center.x, z: camera.z - center.z };
  const cameraDistance = Math.hypot(cameraOffset.x, cameraOffset.z);
  if (cameraDistance <= 0.01) return EMPTY_PERSPECTIVE_CUTAWAY;

  const view = { x: cameraOffset.x / cameraDistance, z: cameraOffset.z / cameraDistance };
  const span = Math.max(scene.bounds.maxX - scene.bounds.minX, scene.bounds.maxZ - scene.bounds.minZ);
  const nearThreshold = Math.max(0.035, span * 0.018);
  const roomWalls = scene.walls.filter((wall) => wall.roomIds.includes(roomId));
  const hiddenWalls = roomWalls.filter((wall) => {
    const midpoint = {
      x: (wall.start.x + wall.end.x) / 2 - center.x,
      z: (wall.start.z + wall.end.z) / 2 - center.z,
    };
    return midpoint.x * view.x + midpoint.z * view.z > nearThreshold;
  });
  const hiddenWallIds = hiddenWalls.map((wall) => wall.id).sort();
  const openDoorIds = new Set(scene.doors
    .filter((door) => door.state === "open")
    .map((door) => door.id));
  const foregroundOpenDoorIds = new Set(scene.doors
    .filter((door) => door.state === "open")
    .filter((door) => {
      const leafMidpoint = {
        x: door.hinge.x + Math.cos(door.openAngle) * door.width / 2,
        z: door.hinge.z + Math.sin(door.openAngle) * door.width / 2,
      };
      const relative = {
        x: leafMidpoint.x - center.x,
        z: leafMidpoint.z - center.z,
      };
      const forwardDistance = relative.x * view.x + relative.z * view.z;
      if (forwardDistance <= nearThreshold || forwardDistance >= cameraDistance) return false;

      const sightlineDistance = Math.abs(relative.x * view.z - relative.z * view.x);
      return sightlineDistance <= door.width / 2 + 0.08;
    })
    .map((door) => door.id));
  const hiddenOpeningIds = [...new Set([
    ...hiddenWalls
      .flatMap((wall) => wall.openingIds)
      .filter((openingId) => !openDoorIds.has(openingId)),
    ...foregroundOpenDoorIds,
  ])].sort();

  // This decorative built-in has no persisted attachment field. Infer its
  // support only while its full rotated footprint rests on the same top face.
  const supportedDecorations = scene.builtIns
    .filter((item) => item.catalogId === "zimmer1-wardrobe-top-decor")
    .flatMap((decoration) => {
      const bottom = decoration.position[1] - decoration.size[1] / 2;
      const footprint = placementPolygon(decoration.source);
      const support = scene.placements.find((item) => {
        if (item.roomId !== decoration.roomId) return false;
        const top = item.position[1] + item.size[1] / 2;
        if (Math.abs(top - bottom) > GEOMETRY_EPSILON) return false;
        const supportFootprint = placementPolygon(item.source);
        return footprint.every((point) => pointInPolygon(point, supportFootprint));
      });
      return support ? [{ decorationId: decoration.id, supportId: support.id }] : [];
    });
  // The pillow rests on the open bench, not the top of the tall cabinet.
  const hallPillow = scene.builtIns.find((item) => item.id === HALL_TEJO_PILLOW_ID);
  const hallBench = scene.placements.find((item) => item.id === "hall-tejo-wardrobe");
  const expectedPillow = hallBench && createHallTejoPillow(hallBench.source);
  if (hallPillow && hallBench && expectedPillow
    && Math.abs(hallPillow.source.position.x - expectedPillow.position.x) < GEOMETRY_EPSILON
    && Math.abs(hallPillow.source.position.z - expectedPillow.position.z) < GEOMETRY_EPSILON
    && Math.abs((hallPillow.source.elevation ?? 0) - (expectedPillow.elevation ?? 0)) < GEOMETRY_EPSILON
    && hallPillow.source.rotation === expectedPillow.rotation) {
    supportedDecorations.push({ decorationId: hallPillow.id, supportId: hallBench.id });
  }
  const protectedObjectIds = new Set(selectedId ? [selectedId] : []);
  for (const { decorationId, supportId } of supportedDecorations) {
    if (selectedId === decorationId || selectedId === supportId) {
      protectedObjectIds.add(decorationId);
      protectedObjectIds.add(supportId);
    }
  }

  const objects = [...scene.builtIns, ...scene.placements];
  const hiddenObjects = new Set(objects
    .filter((item) => !protectedObjectIds.has(item.id))
    .filter((item) => !(
      roomId === "vorraum"
      && item.id === "hall-tejo-wardrobe"
      && foregroundOpenDoorIds.size > 0
    ))
    .filter((item) => {
      const relative = {
        x: item.position[0] - center.x,
        z: item.position[2] - center.z,
      };
      const forwardDistance = relative.x * view.x + relative.z * view.z;
      if (forwardDistance <= nearThreshold || forwardDistance >= cameraDistance) return false;

      const footprintRadius = Math.hypot(item.size[0], item.size[2]) / 2;
      const sightlineDistance = Math.abs(relative.x * view.z - relative.z * view.x);
      const blocksRoomCenter = item.size[1] >= 1.2 && sightlineDistance <= footprintRadius + 0.14;
      const hugsHiddenWall = hiddenWalls.some((wall) => (
        pointToSegmentDistance(
          { x: item.position[0], z: item.position[2] },
          wall.start,
          wall.end,
        ) <= footprintRadius + wall.thickness / 2 + 0.08
      ));
      const wallMounted = Math.min(item.size[0], item.size[2]) <= 0.24;
      return blocksRoomCenter || (hugsHiddenWall && (item.size[1] >= 1.2 || wallMounted));
    })
    .map((item) => item.id));
  for (const { decorationId, supportId } of supportedDecorations) {
    if (hiddenObjects.has(supportId)) hiddenObjects.add(decorationId);
    else hiddenObjects.delete(decorationId);
  }
  const hiddenObjectIds = [...hiddenObjects].sort();

  const hiddenFixtureIds = scene.fixtures
    .filter((fixture) => hiddenWalls.some((wall) => (
      pointToSegmentDistance(
        { x: fixture.position[0], z: fixture.position[2] },
        wall.start,
        wall.end,
      ) <= wall.thickness / 2 + 0.12
    )))
    .map((fixture) => fixture.id)
    .sort();

  return { hiddenWallIds, hiddenOpeningIds, hiddenObjectIds, hiddenFixtureIds };
}

function wallSideMaterialIds(document: PlannerDocumentV3, wall: PlannerWall): [string, string] {
  const positiveRoom = document.rooms.find((room) => room.boundary.some((ref) => ref.wallId === wall.id && ref.direction === 1));
  const negativeRoom = document.rooms.find((room) => room.boundary.some((ref) => ref.wallId === wall.id && ref.direction === -1));
  const fallback = positiveRoom?.surfaces.walls ?? negativeRoom?.surfaces.walls ?? "paint-warm-white";
  return [positiveRoom?.surfaces.walls ?? fallback, negativeRoom?.surfaces.walls ?? fallback];
}

const MAX_PARALLEL_DOOR_FACE_DISTANCE = 0.22;

export function openingSliceOnWall(
  document: PlannerDocumentV3,
  opening: PlannerOpening,
  wall: PlannerWall,
): PlannerOpening | null {
  const openingLine = openingSegment(document, opening);
  const length = distance(wall.start, wall.end);
  if (length <= 0.001) return null;
  const tangent = { x: (wall.end.x - wall.start.x) / length, z: (wall.end.z - wall.start.z) / length };
  const openingLength = distance(openingLine.start, openingLine.end);
  if (openingLength <= 0.001) return null;
  const openingTangent = {
    x: (openingLine.end.x - openingLine.start.x) / openingLength,
    z: (openingLine.end.z - openingLine.start.z) / openingLength,
  };
  const parallel = Math.abs(tangent.x * openingTangent.z - tangent.z * openingTangent.x) <= 0.012;
  if (!parallel) return null;
  const faceDistance = Math.max(...[openingLine.start, openingLine.end].map((point) => Math.abs(
    (point.x - wall.start.x) * tangent.z - (point.z - wall.start.z) * tangent.x
  )));
  const directlyOnWall = faceDistance <= 0.012;
  const relatedDoorFace = (opening.kind === "door" || opening.kind === "passage")
    && wall.roomIds.some((roomId) => opening.roomIds?.includes(roomId))
    && faceDistance <= MAX_PARALLEL_DOOR_FACE_DISTANCE;
  if (!directlyOnWall && !relatedDoorFace) return null;
  const projected = [openingLine.start, openingLine.end].map((point) => (
    (point.x - wall.start.x) * tangent.x + (point.z - wall.start.z) * tangent.z
  ));
  const from = Math.max(0, Math.min(...projected));
  const to = Math.min(length, Math.max(...projected));
  if (to - from <= 0.001) return null;
  return { ...opening, wallId: wall.id, offset: from, width: to - from };
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
  const { hinge, closedEnd, openEnd } = doorPose(document, opening.id);
  const line = openingSegment(document, opening);
  const baseAngle = Math.atan2(closedEnd.z - hinge.z, closedEnd.x - hinge.x);
  const openAngle = Math.atan2(openEnd.z - hinge.z, openEnd.x - hinge.x);
  const openDelta = Math.atan2(Math.sin(openAngle - baseAngle), Math.cos(openAngle - baseAngle));
  return {
    id: opening.id,
    label: opening.label,
    state: document.doorStates[opening.id] ?? "closed",
    hinge,
    width: opening.width,
    height: opening.height,
    baseAngle,
    openAngle,
    displayOpenAngle: baseAngle + openDelta * (opening.visualOpenFraction ?? 1),
    materialId: "white-matte",
    frameCenter: {
      x: (line.start.x + line.end.x) / 2,
      z: (line.start.z + line.end.z) / 2,
    },
    frameAngle: Math.atan2(line.end.z - line.start.z, line.end.x - line.start.x),
    visualStyle: opening.visualStyle
      ?? (opening.id.includes("loggia") || opening.id.includes("balcony") ? "glass-clear" : "solid-white"),
    detailProfile: opening.id === "apartment-entry-door"
      ? "entry-security"
      : opening.id === "hall-wc-door"
        ? "vented"
        : "standard",
    handleSides: "both",
    leafOutlineSides: "both",
  };
}

function createWindow(document: PlannerDocumentV3, opening: PlannerOpening): SceneWindow {
  const line = openingSegment(document, opening);
  const width = distance(line.start, line.end);
  return {
    id: opening.id,
    label: opening.label,
    position: [
      (line.start.x + line.end.x) / 2,
      opening.sill + opening.height / 2,
      (line.start.z + line.end.z) / 2,
    ],
    width,
    height: opening.height,
    sill: opening.sill,
    rotationY: -Math.atan2(line.end.z - line.start.z, line.end.x - line.start.x),
    mullions: width > 1.15 ? 2 : 1,
  };
}

function objectDescriptor<T extends PlannerBuiltIn | PlannerPlacement>(item: T, catalogId: string, asset?: PlannerAssetRecord): SceneObject<T> {
  // Floor meshes are rendered at y=0.012. Parametric rugs are intentionally
  // very thin in the document (their height is only the visualization
  // thickness), so without a small lift their scaled geometry ends up below
  // the floor and is completely occluded. Keep every rug just above the floor
  // while preserving its documented footprint and height.
  const visualLift = catalogId.startsWith("rug-") ? 0.012 : 0;
  return {
    id: item.id,
    roomId: item.roomId,
    catalogId,
    // Keep the document position independent from imported-model metadata.
    // The renderer applies floorOffset exactly once after resolving the GLB
    // transform, so cutaway/framing math continues to use the real placement.
    position: [item.position.x, ("elevation" in item ? item.elevation ?? 0 : 0) + visualLift + item.size.height / 2, item.position.z],
    size: [item.size.width, item.size.height, item.size.depth],
    rotationY: -item.rotation * Math.PI / 180,
    materialId: item.materialVariants?.main ?? item.materialVariants?.color ?? "object-neutral",
    renderProfile: catalogId === "sanitary-bathtub"
      ? "bathtub"
      : catalogId === "appliance-washer"
        ? "washer"
        : catalogId === "sanitary-wall-wc"
          ? "wall-wc"
        : "box",
    asset,
    assetTransform: asset
      ? {
        meterScale: asset.meterScale ?? 1,
        pivot: asset.pivot,
        floorOffset: asset.floorOffset,
        normalizedSize: asset.normalizedSize,
      }
      : undefined,
    source: item,
  };
}

export function furnitureRenderTransform(
  item: SceneObject<PlannerPlacement>,
  options: { meterScale?: number; useAssetDimensions?: boolean } = {},
) {
  const useAssetDimensions = options.useAssetDimensions ?? Boolean(item.assetTransform);
  const reference = useAssetDimensions
    ? item.assetTransform?.normalizedSize ?? { width: 1, depth: 1, height: 1 }
    : { width: 1, depth: 1, height: 1 };
  const meterScale = options.meterScale ?? item.assetTransform?.meterScale ?? 1;
  return {
    scale: [
      (item.size[0] / reference.width) * meterScale,
      (item.size[1] / reference.height) * meterScale,
      (item.size[2] / reference.depth) * meterScale,
    ] as [number, number, number],
    floorOffset: item.assetTransform?.floorOffset ?? 0,
    pivot: item.assetTransform?.pivot ?? "center" as const,
  };
}

export function furnitureWorldPosition(
  item: SceneObject<PlannerPlacement>,
  transform = furnitureRenderTransform(item),
): [number, number, number] {
  const pivotAdjustment = transform.pivot === "center" ? 0 : item.size[1] / 2;
  return [
    item.position[0],
    item.position[1] - item.size[1] / 2 + transform.floorOffset + pivotAdjustment,
    item.position[2],
  ];
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

function pointToSegmentDistance(point: Point2, start: Point2, end: Point2) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 0.000001) return distance(point, start);
  const projection = clamp(
    ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(
    point.x - (start.x + dx * projection),
    point.z - (start.z + dz * projection),
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
