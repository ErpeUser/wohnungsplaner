import { inspectPlacement, type CollisionHit } from "./collisions.ts";
import type {
  PlannerDocumentV3,
  PlannerPlacement,
  Point2,
  Size3,
} from "./types.ts";

export type PlannerCommand =
  | { type: "addPlacement"; placement: PlannerPlacement }
  | { type: "movePlacement"; placementId: string; position: Point2 }
  | { type: "resizePlacement"; placementId: string; size: Size3 }
  | { type: "rotatePlacement"; placementId: string; rotation: number }
  | { type: "setPlacementMaterial"; placementId: string; slot: string; materialId: string }
  | { type: "removePlacement"; placementId: string }
  | { type: "transferPlacement"; placementId: string; roomId: string; position: Point2 }
  | { type: "toggleDoor"; openingId: string; state?: "open" | "closed" }
  | {
      type: "setSurfaceMaterial";
      roomId: string;
      surface: "floor" | "walls" | "ceiling";
      materialId: string;
    };

export type CommandError = {
  code: "collision" | "duplicate-id" | "invalid" | "locked" | "not-found";
  message: string;
  collisions?: CollisionHit[];
};

export type CommandResult = {
  document: PlannerDocumentV3;
  warnings: CollisionHit[];
  error?: CommandError;
};

export function applyPlannerCommand(
  document: PlannerDocumentV3,
  command: PlannerCommand,
): CommandResult {
  switch (command.type) {
    case "addPlacement": {
      if (hasEntityId(document, command.placement.id)) {
        return reject(document, "duplicate-id", `Die ID ${command.placement.id} ist bereits vergeben.`);
      }
      if (!validPlacement(command.placement)) {
        return reject(document, "invalid", "Das neue Objekt enthält ungültige Maße oder Koordinaten.");
      }
      return validatePlacement(document, command.placement, (placement) => ({
        ...document,
        updatedAt: timestamp(),
        placements: [...document.placements, placement],
      }));
    }

    case "movePlacement":
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        position: { ...command.position },
      }));

    case "resizePlacement":
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        size: { ...command.size },
      }));

    case "rotatePlacement":
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        rotation: normalizeRotation(command.rotation),
      }));

    case "setPlacementMaterial":
      if (!command.slot.trim() || !command.materialId.trim()) {
        return reject(document, "invalid", "Material-Slot und Material dürfen nicht leer sein.");
      }
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        materialVariants: { ...placement.materialVariants, [command.slot]: command.materialId },
      }));

    case "transferPlacement":
      if (!document.rooms.some((room) => room.id === command.roomId)) {
        return reject(document, "not-found", `Der Zielraum ${command.roomId} wurde nicht gefunden.`);
      }
      return updatePlacement(document, command.placementId, (placement) => ({
        ...placement,
        roomId: command.roomId,
        position: { ...command.position },
        wallId: undefined,
      }));

    case "removePlacement": {
      if (document.builtIns.some((item) => item.id === command.placementId)) {
        return reject(document, "locked", "Fest eingebaute Elemente können nicht entfernt werden.");
      }
      if (!document.placements.some((item) => item.id === command.placementId)) {
        return reject(document, "not-found", `Das Objekt ${command.placementId} wurde nicht gefunden.`);
      }
      return accept({
        ...document,
        updatedAt: timestamp(),
        placements: document.placements.filter((item) => item.id !== command.placementId),
      });
    }

    case "toggleDoor": {
      const opening = document.openings.find((item) => item.id === command.openingId);
      if (!opening || opening.kind !== "door") {
        return reject(document, "not-found", `Die Tür ${command.openingId} wurde nicht gefunden.`);
      }
      const current = document.doorStates[opening.id] ?? "closed";
      const state = command.state ?? (current === "open" ? "closed" : "open");
      return accept({
        ...document,
        updatedAt: timestamp(),
        doorStates: { ...document.doorStates, [opening.id]: state },
      });
    }

    case "setSurfaceMaterial": {
      const roomIndex = document.rooms.findIndex((room) => room.id === command.roomId);
      if (roomIndex < 0) {
        return reject(document, "not-found", `Der Raum ${command.roomId} wurde nicht gefunden.`);
      }
      if (!command.materialId.trim()) {
        return reject(document, "invalid", "Eine Material-ID darf nicht leer sein.");
      }
      const rooms = document.rooms.map((room, index) => index === roomIndex
        ? { ...room, surfaces: { ...room.surfaces, [command.surface]: command.materialId } }
        : room);
      return accept({ ...document, updatedAt: timestamp(), rooms });
    }
  }
}

function updatePlacement(
  document: PlannerDocumentV3,
  placementId: string,
  change: (placement: PlannerPlacement) => PlannerPlacement,
): CommandResult {
  if (document.builtIns.some((item) => item.id === placementId)) {
    return reject(document, "locked", "Fest eingebaute Elemente können nicht verändert werden.");
  }
  const index = document.placements.findIndex((item) => item.id === placementId);
  if (index < 0) return reject(document, "not-found", `Das Objekt ${placementId} wurde nicht gefunden.`);

  const candidate = change(document.placements[index]);
  if (!validPlacement(candidate)) {
    return reject(document, "invalid", "Das Objekt enthält ungültige Maße oder Koordinaten.");
  }
  return validatePlacement(document, candidate, (placement) => ({
    ...document,
    updatedAt: timestamp(),
    placements: document.placements.map((item, placementIndex) => placementIndex === index ? placement : item),
  }));
}

function validatePlacement(
  document: PlannerDocumentV3,
  placement: PlannerPlacement,
  update: (placement: PlannerPlacement) => PlannerDocumentV3,
): CommandResult {
  const report = inspectPlacement(document, placement);
  if (report.hard.length > 0) {
    return {
      document,
      warnings: report.warnings,
      error: {
        code: "collision",
        message: report.hard[0].message,
        collisions: report.hard,
      },
    };
  }
  return accept(update(placement), report.warnings);
}

function accept(document: PlannerDocumentV3, warnings: CollisionHit[] = []): CommandResult {
  return { document, warnings };
}

function reject(
  document: PlannerDocumentV3,
  code: CommandError["code"],
  message: string,
): CommandResult {
  return { document, warnings: [], error: { code, message } };
}

function hasEntityId(document: PlannerDocumentV3, id: string) {
  return [
    ...document.walls,
    ...document.rooms,
    ...document.openings,
    ...document.builtIns,
    ...document.fixtures,
    ...document.placements,
  ].some((entity) => entity.id === id);
}

function validPlacement(placement: PlannerPlacement) {
  return [
    placement.position.x,
    placement.position.z,
    placement.rotation,
    placement.size.width,
    placement.size.depth,
    placement.size.height,
  ].every(Number.isFinite)
    && placement.size.width > 0
    && placement.size.depth > 0
    && placement.size.height > 0;
}

function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

function timestamp() {
  return new Date().toISOString();
}
