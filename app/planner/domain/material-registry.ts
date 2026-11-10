import { FURNITURE_CATALOG } from "../catalog/catalog.ts";
import type { PlannerDocumentV3 } from "./types.ts";

const SURFACE_MATERIAL_IDS = new Set([
  "parquet-oak", "parquet-oak-narrow", "floor-oak", "floor-oak-herringbone",
  "porcelain-light", "porcelain-light-taupe", "floor-tile-light", "epoxy-grey",
  "outdoor-concrete", "balcony-floor-beige", "balcony-facade-grey", "balcony-parapet-grey",
  "balcony-coping-grey", "balcony-ceiling", "wall-warm-white", "paint-warm-white",
  "paint-warm-taupe", "paint-white", "tile-white-rect", "tile-white-square",
  "tile-kitchen-grey-square", "kitchen-white-gloss", "cashmere-matte", "scout-oak",
  "oak-backsplash", "walnut-grain-dark", "kitchen-worktop-black", "kitchen-plinth-grey",
  "slat-oak-dark", "object-neutral",
]);

const CATALOG_MATERIAL_IDS = new Set(
  FURNITURE_CATALOG.flatMap((item) => item.materials.map((material) => material.id)),
);

export function isKnownMaterialId(document: PlannerDocumentV3, materialId: string) {
  if (SURFACE_MATERIAL_IDS.has(materialId) || CATALOG_MATERIAL_IDS.has(materialId)) return true;
  return [
    ...document.rooms.flatMap((room) => Object.values(room.surfaces)),
    ...document.builtIns.flatMap((item) => Object.values(item.materialVariants ?? {})),
    ...document.placements.flatMap((item) => Object.values(item.materialVariants ?? {})),
  ].includes(materialId);
}

export function isKnownAssetMaterialId(materialId: string) {
  return SURFACE_MATERIAL_IDS.has(materialId) || CATALOG_MATERIAL_IDS.has(materialId);
}
