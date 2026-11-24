import type { PlannerDocumentV3 } from "./types.ts";

/** Mutually exclusive physical products at the same WC wall position.
 * Product finishes are based on the retailers' own 2026 image galleries:
 * Simple is muted Artisan oak, BOXXX very light beige oak; Livetastic is
 * reddish acacia with an irregular bevelled front edge (not oak).
 */
export const WC_WALLBOARD_BUILTIN_ID = "builtin-wc-wallboard-artisan-80";
export const WC_WALLBOARD_STYLING_ID = "builtin-wc-shelf-styling";
export const WC_REAR_WALL_WIDTH_CM = 98;

export const WC_WALLBOARD_OPTIONS = [
  {
    id: "simple-80", catalogId: "wc-artisan-wallboard-80", articleId: "007326000408",
    name: "Wandboard Simple · 80 cm Eiche Artisan", shortName: "Simple · Eiche Artisan",
    retailer: "Möbelix",
    sourceUrl: "https://www.moebelix.at/p/wandboard-simple-b-80-cm-eiche-artisan-dekor-007326000408",
    widthCm: 80, heightCm: 3.8, depthCm: 23.5,
    finish: "Foliertes MDF · Eiche Artisan (gedecktes Eichenbraun)", materialId: "wc-board-simple-face", edgeMaterialId: "wc-board-simple-edge", swatch: "#aa956f",
    price: 14.99, loadKg: 10,
  },
  {
    id: "boxxx-90", catalogId: "wc-boxxx-wallboard-90", articleId: "004201012302",
    name: "BOXXX Wandboard · 90 cm Eichefarben", shortName: "BOXXX · Eichefarben",
    retailer: "XXXLutz",
    sourceUrl: "https://www.xxxlutz.at/p/boxxx-wandboard-in-90-3-8-23-5-cm-eichefarben-004201012302",
    widthCm: 90, heightCm: 3.8, depthCm: 23.5,
    finish: "MDF · helles Eiche-Dekor", materialId: "wc-board-boxxx-face", edgeMaterialId: "wc-board-boxxx-edge", swatch: "#d8c0a4",
    price: 9.90, loadKg: 5,
  },
  {
    id: "livetastic-90", catalogId: "wc-livetastic-wallboard-90", articleId: "000377013101",
    name: "Livetastic Wandboard · 90 cm Naturfarben", shortName: "Livetastic · Naturholz",
    retailer: "XXXLutz",
    sourceUrl: "https://www.xxxlutz.at/p/livetastic-wandboard-in-90-3-5-20-cm-naturfarben-000377013101",
    widthCm: 90, heightCm: 3.5, depthCm: 20,
    finish: "Massive Akazie · rotbraune Naturmaserung, schräge Baumkante", materialId: "wc-board-livetastic-face", edgeMaterialId: "wc-board-livetastic-edge", swatch: "#bc6f3e",
    price: 44.91, loadKg: 5,
  },
] as const;

export type WcWallboardOption = (typeof WC_WALLBOARD_OPTIONS)[number];
export type WcWallboardOptionId = WcWallboardOption["id"];

export function findWcWallboardOption(id: string): WcWallboardOption | undefined {
  return WC_WALLBOARD_OPTIONS.find((option) => option.id === id);
}

export function getSelectedWcWallboardOption(document: Pick<PlannerDocumentV3, "builtIns">): WcWallboardOption {
  const board = document.builtIns.find((item) => item.id === WC_WALLBOARD_BUILTIN_ID);
  return WC_WALLBOARD_OPTIONS.find((option) => option.catalogId === board?.catalogId) ?? WC_WALLBOARD_OPTIONS[0];
}

export function isWcWallboardCatalogId(catalogId: string | undefined): boolean {
  return WC_WALLBOARD_OPTIONS.some((option) => option.catalogId === catalogId);
}

export function wallboardDimensionLabel(option: WcWallboardOption): string {
  const format = (value: number) => value.toLocaleString("de-AT", { maximumFractionDigits: 1 });
  return `${format(option.widthCm)} × ${format(option.heightCm)} × ${format(option.depthCm)} cm`;
}
