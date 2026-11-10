import type { PlannerDocumentV3, PlannerPlacement } from "./types.ts";
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

export function inspectPlacement(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  options: { ignorePlacementIds?: ReadonlySet<string> } = {},
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

  for (const builtIn of document.builtIns.filter((item) => (
    item.roomId === placement.roomId
    && item.catalogId !== "floor-zone-kitchen"
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

  for (const other of document.placements.filter(
    (item) => item.roomId === placement.roomId
      && item.id !== placement.id
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

/** Rugs are rendered as floor coverings and can intentionally sit below furniture. */
export function isFloorCovering(item: PlannerPlacement) {
  return item.floorCovering === true || /(^|[-_])(rug|carpet)([-_]|$)/i.test(item.catalogId);
}
