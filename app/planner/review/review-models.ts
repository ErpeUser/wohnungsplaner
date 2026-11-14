import { FURNITURE_CATALOG, type FurnitureMaterial } from "../catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../domain/apartment-v3.ts";
import { refineRoomLayout } from "../domain/room-refinement.ts";
import type { PlannerBuiltIn, PlannerPlacement, Size3 } from "../domain/types.ts";
import { createSceneModel } from "../scene-3d/scene-model.ts";
import { TABLE_MODELS } from "../tables/table-models.ts";

export type ReviewView = "front" | "side" | "back" | "perspective";
export type ReviewModel = {
  id: string; name: string; category: string; size: Size3;
  materials: readonly FurnitureMaterial[];
  variants: readonly { id: string; label: string; size: Size3 }[];
  builtIn?: PlannerBuiltIn;
};

const furniture: ReviewModel[] = FURNITURE_CATALOG.map((item) => {
  const table = TABLE_MODELS.find((model) => model.catalogId === item.id);
  return {
    id: item.id, name: item.name, category: item.category, size: item.defaultSize,
    materials: item.materials,
    variants: table?.variants.map((variant) => ({
      id: variant.id, label: variant.label,
      size: { width: variant.sizeCm.width / 100, depth: variant.sizeCm.depth / 100, height: variant.sizeCm.height / 100 },
    })) ?? [{ id: "default", label: "Standard", size: item.defaultSize }],
  };
});

// The workspace applies this refinement to its default apartment before rendering.
const REVIEW_DOCUMENT = refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT);
const fixed = new Map<string, PlannerBuiltIn>();
for (const item of REVIEW_DOCUMENT.builtIns) {
  const id = `builtin:${item.catalogId ?? item.id}`;
  if (!fixed.has(id)) fixed.set(id, item);
}

export const REVIEW_MODELS: readonly ReviewModel[] = [
  ...furniture,
  ...[...fixed].map(([id, item]) => ({
    id, name: item.label, category: "Wohnung / Einbauten", size: item.size,
    materials: [{ id: item.materialVariants?.main ?? item.materialVariants?.color ?? "object-neutral", label: "Originalmaterial", color: "#b7b1a5" }],
    variants: [{ id: "default", label: "Standard", size: item.size }], builtIn: item,
  })),
];

export function createReviewScene(id: string, materialId?: string, variantId?: string) {
  const model = REVIEW_MODELS.find((entry) => entry.id === id);
  if (!model) throw new Error(`Unbekanntes Modell: ${id}`);
  const material = model.materials.find((entry) => entry.id === (materialId ?? model.materials[0]?.id));
  if (!material) throw new Error("Unbekanntes Material");
  const variant = model.variants.find((entry) => entry.id === (variantId ?? model.variants[0].id));
  if (!variant) throw new Error("Unbekannte Größenvariante");
  const size = { ...variant.size };
  const position = { x: 0, z: 0 };
  const roomId = REVIEW_DOCUMENT.rooms[0].id;
  const materialVariants = { ...model.builtIn?.materialVariants, main: material.id };
  const placement: PlannerPlacement = { id: `review-${model.id}`, catalogId: model.id, roomId, position, rotation: 0, size, materialVariants };
  const document = {
    ...REVIEW_DOCUMENT,
    walls: [], openings: [], fixtures: [],
    builtIns: model.builtIn ? [{ ...model.builtIn, roomId, position, rotation: 0, elevation: 0, size, materialVariants }] : [],
    placements: model.builtIn ? [] : [placement],
    rooms: [{ ...REVIEW_DOCUMENT.rooms[0], boundary: [] }],
  };
  const scene = createSceneModel(document, null);
  scene.floors = [];
  scene.bounds = { minX: -size.width / 2, maxX: size.width / 2, minZ: -size.depth / 2, maxZ: size.depth / 2 };
  scene.center = [0, size.height / 2, 0];
  return { scene, size, model, material, variant };
}

export function reviewCameraPosition(size: Size3, view: ReviewView): [number, number, number] {
  const distance = Math.max(size.width, size.depth, size.height, 0.3) * 2.3;
  const y = size.height / 2;
  if (view === "front") return [0, y + distance * 0.1, distance];
  if (view === "side") return [distance, y + distance * 0.1, 0];
  if (view === "back") return [0, y + distance * 0.1, -distance];
  return [distance * 0.75, y + distance * 0.6, distance * 0.85];
}
