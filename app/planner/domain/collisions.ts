import type { PlannerBuiltIn, PlannerDocumentV3, PlannerPlacement } from "./types.ts";
import {
  doorPassagePolygon,
  doorSweepPolygon,
  placementPolygon,
  polygonsIntersect,
  roomContainsPlacement,
} from "./geometry.ts";
import { deriveRoomPolygon } from "./wall-graph.ts";

export type CollisionHit = {
  kind: "room-boundary" | "built-in" | "placement" | "door-sweep" | "door-passage";
  entityId: string;
  message: string;
};

export type CollisionReport = {
  hard: CollisionHit[];
  warnings: CollisionHit[];
};

type SpatialKind = "built-in" | "placement";
type SpatialEntry = {
  kind: SpatialKind;
  roomId: string;
  entityId: string;
  polygon: ReturnType<typeof placementPolygon>;
  source: PlannerBuiltIn | PlannerPlacement;
};

const SPATIAL_CELL_SIZE = 1;
const spatialIndexCache = new WeakMap<PlannerDocumentV3, {
  builtIns: readonly PlannerBuiltIn[];
  placements: readonly PlannerPlacement[];
  index: CollisionSpatialIndex;
}>();

/** Uniform-grid broad-phase index used before exact polygon intersection checks. */
export class CollisionSpatialIndex {
  private readonly cells = new Map<string, Set<number>>();
  private readonly entries: SpatialEntry[] = [];

  constructor(document: PlannerDocumentV3) {
    for (const item of document.builtIns) {
      this.add({
        kind: "built-in",
        roomId: item.roomId,
        entityId: item.id,
        polygon: placementPolygon(item),
        source: item,
      });
    }
    for (const item of document.placements) {
      this.add({
        kind: "placement",
        roomId: item.roomId,
        entityId: item.id,
        polygon: placementPolygon(item),
        source: item,
      });
    }
  }

  query(roomId: string, polygon: ReturnType<typeof placementPolygon>, kind: SpatialKind): SpatialEntry[] {
    const candidateIndexes = new Set<number>();
    for (const key of cellKeys(roomId, polygonBounds(polygon))) {
      for (const index of this.cells.get(key) ?? []) candidateIndexes.add(index);
    }
    return [...candidateIndexes]
      .sort((left, right) => left - right)
      .map((index) => this.entries[index])
      .filter((entry): entry is SpatialEntry => entry.kind === kind && entry.roomId === roomId);
  }

  private add(entry: SpatialEntry) {
    const index = this.entries.push(entry) - 1;
    for (const key of cellKeys(entry.roomId, polygonBounds(entry.polygon))) {
      const bucket = this.cells.get(key) ?? new Set<number>();
      bucket.add(index);
      this.cells.set(key, bucket);
    }
  }
}

export function inspectPlacement(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  options: { ignorePlacementIds?: ReadonlySet<string> } = {},
): CollisionReport {
  const cached = spatialIndexCache.get(document);
  const index = cached && sameEntries(cached.builtIns, document.builtIns) && sameEntries(cached.placements, document.placements)
    ? cached.index
    : new CollisionSpatialIndex(document);
  if (!cached || index !== cached.index) {
    spatialIndexCache.set(document, {
      builtIns: [...document.builtIns],
      placements: [...document.placements],
      index,
    });
  }
  return inspectPlacementInternal(document, placement, options, index);
}

/** Reference implementation retained for regression comparisons and diagnostics. */
export function inspectPlacementLinear(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  options: { ignorePlacementIds?: ReadonlySet<string> } = {},
): CollisionReport {
  return inspectPlacementInternal(document, placement, options);
}

function inspectPlacementInternal(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  options: { ignorePlacementIds?: ReadonlySet<string> },
  index?: CollisionSpatialIndex,
): CollisionReport {
  const footprint = placementPolygon(placement);
  const hard: CollisionHit[] = [];
  const warnings: CollisionHit[] = [];

  if (!roomContainsPlacement(document, placement.roomId, placement)) {
    hard.push({
      kind: "room-boundary",
      entityId: placement.roomId,
      message: "Das Möbel muss vollständig innerhalb des Raums bleiben.",
    });
  }

  const builtIns = index
    ? index.query(placement.roomId, footprint, "built-in")
      .map((entry) => entry.source as PlannerBuiltIn)
    : document.builtIns.filter((item) => item.roomId === placement.roomId);
  for (const builtIn of builtIns.filter((item) => (
    item.catalogId !== "floor-zone-kitchen"
    && item.collision !== "decorative"
    && item.size.height > 0.03
  ))) {
    if (polygonsIntersect(footprint, placementPolygon(builtIn))) {
      hard.push({
        kind: "built-in",
        entityId: builtIn.id,
        message: `${builtIn.label} ist fest eingebaut.`,
      });
    }
  }

  const otherPlacements = index
    ? index.query(placement.roomId, footprint, "placement")
      .map((entry) => entry.source as PlannerPlacement)
    : document.placements.filter((item) => item.roomId === placement.roomId);
  for (const other of otherPlacements.filter(
    (item) => item.id !== placement.id
      && !isFloorCovering(item)
      && !options.ignorePlacementIds?.has(item.id),
  )) {
    if (polygonsIntersect(footprint, placementPolygon(other))) {
      hard.push({
        kind: "placement",
        entityId: other.id,
        message: "Das Möbel überschneidet ein anderes Möbel.",
      });
    }
  }

  const roomPolygon = deriveRoomPolygon(document, placement.roomId);
  const doors = document.openings.filter(
    (opening) => opening.kind === "door" && (
      document.walls.find((wall) => wall.id === opening.wallId)?.roomIds.includes(placement.roomId)
      || polygonsIntersect(doorPassagePolygon(document, opening.id), roomPolygon)
    ),
  );
  for (const door of doors) {
    if (polygonsIntersect(footprint, doorSweepPolygon(document, door.id))) {
      hard.push({
        kind: "door-sweep",
        entityId: door.id,
        message: `Der 90°-Türschwenk von ${door.label} muss frei bleiben.`,
      });
    }
    if (polygonsIntersect(footprint, doorPassagePolygon(document, door.id))) {
      warnings.push({
        kind: "door-passage",
        entityId: door.id,
        message: `Der 60-cm-Durchgang von ${door.label} wird verengt.`,
      });
    }
  }

  return { hard, warnings };
}

function polygonBounds(polygon: ReturnType<typeof placementPolygon>) {
  return {
    minX: Math.min(...polygon.map((point) => point.x)),
    minZ: Math.min(...polygon.map((point) => point.z)),
    maxX: Math.max(...polygon.map((point) => point.x)),
    maxZ: Math.max(...polygon.map((point) => point.z)),
  };
}

function cellKeys(roomId: string, bounds: ReturnType<typeof polygonBounds>) {
  const minX = Math.floor(bounds.minX / SPATIAL_CELL_SIZE);
  const maxX = Math.floor(bounds.maxX / SPATIAL_CELL_SIZE);
  const minZ = Math.floor(bounds.minZ / SPATIAL_CELL_SIZE);
  const maxZ = Math.floor(bounds.maxZ / SPATIAL_CELL_SIZE);
  const keys: string[] = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) keys.push(`${roomId}:${x}:${z}`);
  }
  return keys;
}

function sameEntries<T>(left: readonly T[], right: readonly T[]) {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
}

/** Rugs are rendered as floor coverings and can intentionally sit below furniture. */
export function isFloorCovering(item: PlannerPlacement) {
  return item.floorCovering === true || /(^|[-_])(rug|carpet)([-_]|$)/i.test(item.catalogId);
}
