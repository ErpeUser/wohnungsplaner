import type { Size3 } from "../domain/types.ts";

export type FurnitureCategory = "Schlafen" | "Sitzen" | "Arbeiten" | "Aufbewahren" | "Tische" | "Licht/Deko";
export type FurnitureResizeRule = "fixed" | "uniform" | "free";
export type FurnitureRenderMode = "auto" | "gltf" | "parametric";

export type FurnitureMaterial = {
  id: string;
  label: string;
  color: string;
};

export type ProductRealismSpec = {
  sourceLabel: string;
  dimensions: string;
  confidence: "verified" | "estimated";
  construction: readonly string[];
};

export type FurnitureCatalogItem = {
  id: string;
  name: string;
  category: FurnitureCategory;
  description: string;
  defaultSize: Size3;
  /** Default floor elevation for newly placed catalogue items, in metres. */
  defaultElevation?: number;
  resize: FurnitureResizeRule;
  symbol: "bed" | "storage" | "desk" | "chair" | "sofa" | "table" | "rug" | "light" | "plant";
  fallback3d: string;
  renderMode: FurnitureRenderMode;
  materials: FurnitureMaterial[];
  sourceUrl?: string;
  realism?: ProductRealismSpec;
};
