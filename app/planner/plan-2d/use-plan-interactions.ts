"use client";

import { useEffect, useMemo } from "react";

import { getFurnitureCatalogItem, type FurnitureCatalogItem } from "../catalog/catalog.ts";
import { inspectPlacement } from "../domain/collisions.ts";
import type { CommandResult, PlannerCommand } from "../domain/commands.ts";
import { placementPolygon, roomAtPoint } from "../domain/geometry.ts";
import { snapPlacement, type SnapGuide } from "../domain/snapping.ts";
import type { PlannerDocumentV3, PlannerPlacement, Point2, Size3 } from "../domain/types.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";

const GRID_SIZE = 0.05;
let placementSequence = 0;

export type PlanInteractionOptions = {
  disableGrid?: boolean;
};

export function createCatalogPlacement(
  item: FurnitureCatalogItem,
  roomId: string,
  position: Point2,
  id = createPlacementId(item.id),
): PlannerPlacement {
  return {
    id,
    roomId,
    catalogId: item.id,
    position: { ...position },
    rotation: 0,
    size: { ...item.defaultSize },
    materialVariants: { main: item.materials[0]?.id ?? "default" },
    metadata: { source: "Raumplaner-Katalog", confidence: "confirmed" },
  };
}

export function resolvePlacementMove(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  position: Point2,
  options: PlanInteractionOptions = {},
): { position: Point2; guides: SnapGuide[]; command: PlannerCommand } {
  const preview = previewPlacementMove(document, placement, position, options);
  return { position: preview.position, guides: preview.guides, command: preview.command };
}

export function previewPlacementMove(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  position: Point2,
  options: PlanInteractionOptions = {},
) {
  const snapped = snapPlacement({
    position,
    size: placement.size,
    rotation: placement.rotation,
    guides: createPlacementGuides(document, placement),
    disableGrid: options.disableGrid,
    gridSize: GRID_SIZE,
  });
  const roomId = roomAtPoint(document, snapped.position) ?? placement.roomId;
  const command: PlannerCommand = roomId === placement.roomId
    ? { type: "movePlacement", placementId: placement.id, position: snapped.position }
    : { type: "transferPlacement", placementId: placement.id, roomId, position: snapped.position };
  const candidate = { ...placement, roomId, position: snapped.position };
  return { ...snapped, command, report: inspectPlacement(document, candidate) };
}

export function createPlacementGuides(document: PlannerDocumentV3, placement: PlannerPlacement): SnapGuide[] {
  const guides: SnapGuide[] = [];
  for (const wall of document.walls.filter((candidate) => candidate.roomIds.includes(placement.roomId))) {
    if (Math.abs(wall.start.x - wall.end.x) <= 0.001) {
      guides.push({ axis: "x", value: wall.start.x, kind: "wall", sourceId: wall.id });
    }
    if (Math.abs(wall.start.z - wall.end.z) <= 0.001) {
      guides.push({ axis: "z", value: wall.start.z, kind: "wall", sourceId: wall.id });
    }
  }
  const objects = [
    ...document.builtIns.filter((item) => item.roomId === placement.roomId),
    ...document.placements.filter((item) => item.roomId === placement.roomId && item.id !== placement.id),
  ];
  for (const object of objects) {
    const points = placementPolygon(object);
    for (const axis of ["x", "z"] as const) {
      const values = points.map((point) => point[axis]);
      const minimum = Math.min(...values);
      const maximum = Math.max(...values);
      for (const value of [minimum, (minimum + maximum) / 2, maximum]) {
        guides.push({ axis, value: normalize(value), kind: "object", sourceId: object.id });
      }
    }
  }
  return guides.filter((guide, index) => guides.findIndex((candidate) => (
    candidate.axis === guide.axis && candidate.kind === guide.kind && candidate.value === guide.value
  )) === index);
}

export function nudgePlacement(placement: PlannerPlacement, key: string, largeStep: boolean): Point2 {
  const amount = largeStep ? 0.1 : 0.01;
  const delta = {
    ArrowLeft: { x: -amount, z: 0 },
    ArrowRight: { x: amount, z: 0 },
    ArrowUp: { x: 0, z: -amount },
    ArrowDown: { x: 0, z: amount },
  }[key];
  if (!delta) return { ...placement.position };
  return {
    x: normalize(placement.position.x + delta.x),
    z: normalize(placement.position.z + delta.z),
  };
}

export function resolvePlacementRotation(rotation: number, freeRotation: boolean) {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalize(freeRotation ? normalized : Math.round(normalized / 45) * 45 % 360);
}

export function resolvePlacementResize(
  item: FurnitureCatalogItem | undefined,
  current: Size3,
  scaleX: number,
  scaleZ: number,
): Size3 {
  if (item?.resize === "fixed") return { ...current };
  const safeX = clamp(Math.abs(scaleX), 0.25, 4);
  const safeZ = clamp(Math.abs(scaleZ), 0.25, 4);
  const uniform = item?.resize === "uniform" ? Math.max(safeX, safeZ) : null;
  return {
    width: normalize(Math.max(0.1, current.width * (uniform ?? safeX))),
    depth: normalize(Math.max(0.1, current.depth * (uniform ?? safeZ))),
    height: current.height,
  };
}

type UsePlanInteractionsOptions = {
  document: PlannerDocumentV3;
  activeRoomId: string | null;
  selectionId: string | null;
  dispatch(command: PlannerCommand): CommandResult;
  select(id: string | null): void;
};

export function usePlanInteractions({
  document,
  activeRoomId,
  selectionId,
  dispatch,
  select,
}: UsePlanInteractionsOptions) {
  const selectedPlacement = useMemo(
    () => document.placements.find((placement) => placement.id === selectionId) ?? null,
    [document.placements, selectionId],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        select(null);
        return;
      }
      if (!selectedPlacement) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const position = nudgePlacement(selectedPlacement, event.key, event.shiftKey);
        dispatch(resolvePlacementMove(document, selectedPlacement, position, { disableGrid: true }).command);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        const result = dispatch({ type: "removePlacement", placementId: selectedPlacement.id });
        if (!result.error) select(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, document, select, selectedPlacement]);

  const addCatalogItem = (catalogId: string) => {
    if (!activeRoomId) return null;
    const item = getFurnitureCatalogItem(catalogId);
    if (!item) return null;
    const placement = findAvailablePlacement(document, activeRoomId, item);
    if (!placement) return null;
    const result = dispatch({ type: "addPlacement", placement });
    if (!result.error) select(placement.id);
    return result;
  };

  const movePlacement = (placementId: string, position: Point2, options: PlanInteractionOptions = {}) => {
    const placement = document.placements.find((candidate) => candidate.id === placementId);
    if (!placement) return null;
    return dispatch(resolvePlacementMove(document, placement, position, options).command);
  };

  const resizePlacement = (placementId: string, scaleX: number, scaleZ: number) => {
    const placement = document.placements.find((candidate) => candidate.id === placementId);
    if (!placement) return null;
    const item = getFurnitureCatalogItem(placement.catalogId);
    const size = resolvePlacementResize(item, placement.size, scaleX, scaleZ);
    return dispatch({ type: "resizePlacement", placementId, size });
  };

  const rotatePlacement = (placementId: string, rotation: number, freeRotation = false) => dispatch({
    type: "rotatePlacement",
    placementId,
    rotation: resolvePlacementRotation(rotation, freeRotation),
  });

  return { addCatalogItem, movePlacement, resizePlacement, rotatePlacement };
}

function findAvailablePlacement(
  document: PlannerDocumentV3,
  roomId: string,
  item: FurnitureCatalogItem,
): PlannerPlacement | null {
  const polygon = deriveRoomPolygon(document, roomId);
  const center = {
    x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
    z: polygon.reduce((sum, point) => sum + point.z, 0) / polygon.length,
  };
  const candidates = [center, ...gridCandidates(polygon, center)];
  const id = createPlacementId(item.id);
  for (const position of candidates) {
    const placement = createCatalogPlacement(item, roomId, snapPlacement({
      position,
      size: item.defaultSize,
      gridSize: GRID_SIZE,
    }).position, id);
    if (inspectPlacement(document, placement).hard.length === 0) return placement;
  }
  return null;
}

function gridCandidates(polygon: Point2[], center: Point2) {
  const minX = Math.min(...polygon.map((point) => point.x));
  const maxX = Math.max(...polygon.map((point) => point.x));
  const minZ = Math.min(...polygon.map((point) => point.z));
  const maxZ = Math.max(...polygon.map((point) => point.z));
  const candidates: Point2[] = [];
  for (let z = minZ; z <= maxZ; z += 0.25) {
    for (let x = minX; x <= maxX; x += 0.25) candidates.push({ x, z });
  }
  return candidates.sort((left, right) => distance(left, center) - distance(right, center));
}

function createPlacementId(catalogId: string) {
  placementSequence += 1;
  return `placement-${catalogId}-${Date.now().toString(36)}-${placementSequence}`;
}

function distance(left: Point2, right: Point2) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function normalize(value: number) {
  return Number(value.toFixed(3));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
