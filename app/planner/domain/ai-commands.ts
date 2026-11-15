import { FURNITURE_CATALOG, getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { applyPlannerCommand, type CommandResult, type PlannerCommand } from "./commands.ts";
import { isKnownMaterialId } from "./material-registry.ts";
import type { PlannerDocumentV3, PlannerPlacement, Point2, Size3 } from "./types.ts";

/**
 * Stable, transport-friendly commands for an assistant or another editor.
 * The adapter deliberately accepts IDs and metres only; natural-language
 * parsing belongs at the product boundary and must resolve to this contract.
 */
export type PlannerAiRequest =
  | { action: "move"; objectId: string; position: Point2 }
  | { action: "rotate"; objectId: string; rotation: number }
  | { action: "resize"; objectId: string; size: Size3 }
  | { action: "remove"; objectId: string }
  | { action: "add"; objectId?: string; roomId: string; catalogId: string; position: Point2; rotation?: number; size?: Size3; materialId?: string }
  | { action: "material"; objectId: string; slot?: string; materialId: string }
  | { action: "door"; openingId: string; state?: "open" | "closed" };

export type PlannerAiResult = {
  request: PlannerAiRequest;
  command?: PlannerCommand;
  result: CommandResult;
  stableId?: string;
};

export type PlannerAiCatalogEntry = {
  id: string;
  name: string;
  symbol: string;
  defaultSize: Size3;
  materialIds: string[];
};

export function listPlannerAiCatalog(): PlannerAiCatalogEntry[] {
  // This is a projection, so catalog metadata remains the single source of truth.
  return getFurnitureCatalogEntries().map((item) => ({
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    defaultSize: { ...item.defaultSize },
    materialIds: item.materials.map((material) => material.id),
  }));
}

export function executePlannerAiRequest(
  document: PlannerDocumentV3,
  request: PlannerAiRequest,
): PlannerAiResult {
  const commandResult = toPlannerCommand(document, request);
  if ("error" in commandResult) return { request, result: commandResult.result };
  const result = applyPlannerCommand(document, commandResult.command);
  return { request, command: commandResult.command, result, stableId: commandResult.stableId };
}

function toPlannerCommand(
  document: PlannerDocumentV3,
  request: PlannerAiRequest,
): { command: PlannerCommand; stableId?: string } | { error: true; result: CommandResult } {
  if (!request || typeof request !== "object") return invalid(document, "Der KI-Befehl ist kein Objekt.");
  if (typeof (request as { action?: unknown }).action !== "string") return invalid(document, "Der KI-Befehl enthält keine gültige Aktion.");

  switch (request.action) {
    case "move":
      return nonEmptyId(request.objectId) && finitePoint(request.position)
        ? { command: { type: "movePlacement", placementId: request.objectId, position: request.position } }
        : invalid(document, "Die Zielposition ist ungültig.");
    case "rotate":
      return nonEmptyId(request.objectId) && Number.isFinite(request.rotation)
        ? { command: { type: "rotatePlacement", placementId: request.objectId, rotation: request.rotation } }
        : invalid(document, "Der Drehwinkel ist ungültig.");
    case "resize":
      return nonEmptyId(request.objectId) && validSize(request.size)
        ? { command: { type: "resizePlacement", placementId: request.objectId, size: request.size } }
        : invalid(document, "Die Zielmaße sind ungültig.");
    case "remove":
      return nonEmptyId(request.objectId)
        ? { command: { type: "removePlacement", placementId: request.objectId } }
        : invalid(document, "Die Objekt-ID ist ungültig.");
    case "door":
      return nonEmptyId(request.openingId)
        ? { command: { type: "toggleDoor", openingId: request.openingId, state: request.state } }
        : invalid(document, "Die Tür-ID ist ungültig.");
    case "material": {
      const materialId = typeof request.materialId === "string" ? request.materialId.trim() : "";
      const slot = typeof request.slot === "string" ? request.slot.trim() || "main" : "main";
      return nonEmptyId(request.objectId) && materialId && isKnownMaterialId(document, materialId)
        ? { command: { type: "setPlacementMaterial", placementId: request.objectId, slot, materialId } }
        : invalid(document, `Das Material ${materialId || "(leer)"} ist nicht im Katalog vorhanden.`);
    }
    case "add": {
      if (!nonEmptyId(request.roomId) || !nonEmptyId(request.catalogId)) return invalid(document, "Raum- und Katalog-ID sind erforderlich.");
      const catalogItem = getFurnitureCatalogItem(request.catalogId);
      if (!catalogItem) return invalid(document, `Das Produkt ${request.catalogId} ist nicht im Katalog vorhanden.`);
      if (!finitePoint(request.position)) return invalid(document, "Die Zielposition ist ungültig.");
      const size = request.size ?? catalogItem.defaultSize;
      if (!validSize(size)) return invalid(document, "Die Zielmaße sind ungültig.");
      if (request.rotation !== undefined && !Number.isFinite(request.rotation)) return invalid(document, "Der Drehwinkel ist ungültig.");
      const materialId = request.materialId ?? catalogItem.materials[0]?.id;
      if (!materialId || !catalogItem.materials.some((material) => material.id === materialId)) {
        return invalid(document, `Das Material ${materialId ?? "(leer)"} gehört nicht zum Produkt ${request.catalogId}.`);
      }
      const stableId = request.objectId?.trim() || createStablePlacementId(document, request.catalogId, request.roomId);
      const placement: PlannerPlacement = {
        id: stableId,
        roomId: request.roomId,
        catalogId: request.catalogId,
        position: { ...request.position },
        rotation: request.rotation ?? 0,
        size: { ...size },
        materialVariants: { main: materialId },
        metadata: { source: "KI-Befehl · lokaler Möbelkatalog", confidence: "estimated" },
      };
      return { command: { type: "addPlacement", placement }, stableId };
    }
    default:
      return invalid(document, "Die KI-Aktion ist unbekannt.");
  }
}

function nonEmptyId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getFurnitureCatalogEntries() {
  return FURNITURE_CATALOG;
}

function finitePoint(point: Point2) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.z);
}

function validSize(size: Size3) {
  return Number.isFinite(size?.width) && Number.isFinite(size?.depth) && Number.isFinite(size?.height)
    && size.width > 0 && size.depth > 0 && size.height > 0;
}

function createStablePlacementId(document: PlannerDocumentV3, catalogId: string, roomId: string) {
  const base = `ai-${catalogId}-${roomId}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!document.placements.some((item) => item.id === base) && !document.builtIns.some((item) => item.id === base)) return base;
  let index = 2;
  while (document.placements.some((item) => item.id === `${base}-${index}`) || document.builtIns.some((item) => item.id === `${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function invalid(document: PlannerDocumentV3, message: string): { error: true; result: CommandResult } {
  return { error: true, result: { document, warnings: [], error: { code: "invalid", message } } };
}

