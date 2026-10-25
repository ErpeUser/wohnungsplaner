import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { parsePlannerDocument } from "../domain/schema.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import type { PlanScene } from "../plan-2d/plan-scene.ts";

export type PlanStageExporter = {
  toDataURL(config: { mimeType: "image/png"; pixelRatio: number }): string;
};

export type PlannerPrintModel = {
  schemaVersion: 3;
  title: string;
  generatedAt: string;
  summary: string;
  plan: PlanScene;
  rooms: Array<{
    id: string;
    name: string;
    area: number;
    includedInWnf: boolean;
    floorMaterialId: string;
  }>;
  furniture: Array<{
    id: string;
    room: string;
    name: string;
    widthCm: number;
    depthCm: number;
    materialId: string;
  }>;
};

export function serializePlannerBackup(document: PlannerDocumentV3) {
  const validated = parsePlannerDocument(document);
  return JSON.stringify(validated, null, 2);
}

export function createPlanPng(
  stage: PlanStageExporter,
  options: { pixelRatio?: number } = {},
) {
  const pixelRatio = Math.min(4, Math.max(1, options.pixelRatio ?? 2));
  const dataUrl = stage.toDataURL({ mimeType: "image/png", pixelRatio });
  if (!dataUrl.startsWith("data:image/png")) {
    throw new Error("Die 2D-Ansicht konnte nicht als PNG erzeugt werden.");
  }
  return dataUrl;
}

export function createPrintModel(
  document: PlannerDocumentV3,
  plan: PlanScene,
): PlannerPrintModel {
  const validated = parsePlannerDocument(document);
  const roomById = new Map(validated.rooms.map((room) => [room.id, room.name]));
  const totalWnf = validated.rooms
    .filter((room) => room.includedInWnf)
    .reduce((sum, room) => sum + room.area, 0);
  return {
    schemaVersion: 3,
    title: `${validated.name} · Raumplan`,
    generatedAt: validated.updatedAt,
    summary: `${formatArea(totalWnf)} m² WNF · ${validated.rooms.length} Bereiche · ${validated.placements.length} Möbel`,
    plan,
    rooms: validated.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      area: room.area,
      includedInWnf: room.includedInWnf,
      floorMaterialId: room.surfaces.floor,
    })),
    furniture: validated.placements.map((placement) => ({
      id: placement.id,
      room: roomById.get(placement.roomId) ?? placement.roomId,
      name: getFurnitureCatalogItem(placement.catalogId)?.name ?? placement.catalogId,
      widthCm: Math.round(placement.size.width * 100),
      depthCm: Math.round(placement.size.depth * 100),
      materialId: placement.materialVariants?.main ?? placement.materialVariants?.color ?? "Standard",
    })),
  };
}

function formatArea(value: number) {
  return value.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
