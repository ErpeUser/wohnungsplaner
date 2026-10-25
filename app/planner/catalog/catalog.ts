import type { Size3 } from "../domain/types.ts";

export type FurnitureCategory = "Schlafen" | "Sitzen" | "Arbeiten" | "Aufbewahren" | "Tische" | "Licht/Deko";
export type FurnitureResizeRule = "fixed" | "uniform" | "free";

export type FurnitureMaterial = {
  id: string;
  label: string;
  color: string;
};

export type FurnitureCatalogItem = {
  id: string;
  name: string;
  category: FurnitureCategory;
  description: string;
  defaultSize: Size3;
  resize: FurnitureResizeRule;
  symbol: "bed" | "storage" | "desk" | "chair" | "sofa" | "table" | "rug" | "light" | "plant";
  fallback3d: string;
  materials: FurnitureMaterial[];
};

const WOOD = [
  { id: "oak-natural", label: "Eiche natur", color: "#b98a5e" },
  { id: "walnut", label: "Nussbaum", color: "#704c35" },
  { id: "white-matte", label: "Weiß matt", color: "#e8e5de" },
];
const FABRIC = [
  { id: "fabric-sand", label: "Stoff Sand", color: "#c4aa8e" },
  { id: "fabric-sage", label: "Stoff Salbei", color: "#82938a" },
  { id: "fabric-anthracite", label: "Stoff Anthrazit", color: "#4c5252" },
];

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  item("bed-120", "Bett 120", "Schlafen", "Kompaktes Bett mit Kopfteil", [1.2, 2, 0.55], "free", "bed", "bed", FABRIC),
  item("bed-160", "Doppelbett 160", "Schlafen", "Doppelbett mit gepolstertem Kopfteil", [1.6, 2, 0.62], "free", "bed", "bed", FABRIC),
  item("nightstand", "Nachttisch", "Schlafen", "Kompakter Nachttisch", [0.45, 0.4, 0.52], "fixed", "storage", "cabinet", WOOD),
  item("sofa-3seat", "Sofa", "Sitzen", "Dreisitzer mit realer Sitztiefe", [2.2, 0.92, 0.82], "uniform", "sofa", "sofa", FABRIC),
  item("chair-dining", "Stuhl", "Sitzen", "Esszimmerstuhl", [0.5, 0.55, 0.84], "fixed", "chair", "chair", [...WOOD, ...FABRIC]),
  item("desk-standard", "Schreibtisch", "Arbeiten", "Gerader Arbeitstisch", [1.3, 0.65, 0.75], "free", "desk", "desk", WOOD),
  item("chair-office", "Bürostuhl", "Arbeiten", "Drehstuhl mit Armlehnen", [0.62, 0.62, 1.05], "fixed", "chair", "office-chair", FABRIC),
  item("wardrobe-200", "Kleiderschrank", "Aufbewahren", "Vier Türen, 60 cm tief", [2, 0.6, 2.2], "free", "storage", "wardrobe", WOOD),
  item("dresser", "Kommode", "Aufbewahren", "Breite Kommode mit Schubladen", [1.2, 0.45, 0.82], "free", "storage", "cabinet", WOOD),
  item("shelf", "Regal", "Aufbewahren", "Offenes Bücherregal", [0.9, 0.35, 1.9], "free", "storage", "shelf", WOOD),
  item("lowboard", "Lowboard", "Aufbewahren", "Niedriges Medienmöbel", [1.8, 0.42, 0.5], "free", "storage", "cabinet", WOOD),
  item("dining-table", "Esstisch", "Tische", "Tisch für vier bis sechs Personen", [1.6, 0.9, 0.75], "free", "table", "table", WOOD),
  item("rug-200", "Teppich", "Licht/Deko", "Flach gewebter Teppich", [2, 1.4, 0.02], "free", "rug", "rug", FABRIC),
  item("floor-lamp", "Stehleuchte", "Licht/Deko", "Schlanke Leselampe", [0.38, 0.38, 1.65], "fixed", "light", "lamp", WOOD),
  item("plant-medium", "Pflanze", "Licht/Deko", "Mittelgroße Zimmerpflanze", [0.55, 0.55, 1.15], "uniform", "plant", "plant", WOOD),
];

export function filterFurnitureCatalog(query: string, category: FurnitureCategory | "Alle") {
  const needle = query.trim().toLocaleLowerCase("de-AT");
  return FURNITURE_CATALOG.filter((catalogItem) => (
    (category === "Alle" || catalogItem.category === category)
    && (!needle || `${catalogItem.name} ${catalogItem.description} ${catalogItem.category}`.toLocaleLowerCase("de-AT").includes(needle))
  ));
}

export function getFurnitureCatalogItem(id: string) {
  return FURNITURE_CATALOG.find((catalogItem) => catalogItem.id === id);
}

function item(
  id: string,
  name: string,
  category: FurnitureCategory,
  description: string,
  size: [number, number, number],
  resize: FurnitureResizeRule,
  symbol: FurnitureCatalogItem["symbol"],
  fallback3d: string,
  materials: FurnitureMaterial[],
): FurnitureCatalogItem {
  return {
    id,
    name,
    category,
    description,
    defaultSize: { width: size[0], depth: size[1], height: size[2] },
    resize,
    symbol,
    fallback3d,
    materials,
  };
}
