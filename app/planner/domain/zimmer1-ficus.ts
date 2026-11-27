import type { PlannerPlacement } from "./types.ts";

/** Supplier dimensions in metres. Only the foliage envelope and seating depth
 * of the nursery pot are estimates from the actual product photographs. */
export const ZIMMER1_FICUS = Object.freeze({
  catalogId: "plant-zimmer1-ficus-90623179",
  placementId: "zimmer1-olive-plant", // Stable saved placement identity.
  plantArticle: "90623179",
  planterArticle: "607016466675388",
  planterSku: "107283317021641",
  plantUrl: "https://www.ikea.com/at/de/p/ficus-microcarpa-pflanze-chinesische-feige-90623179/",
  planterUrl: "https://www.temu.com/goods.html?goods_id=607016466675388&sku_id=107283317021641",
  plantHeight: 0.95,
  nurseryDiameter: 0.19,
  nurseryHeight: 0.165,
  planterDiameter: 0.265,
  openingDiameter: 0.235,
  baseDiameter: 0.21,
  planterHeight: 0.355,
  nurseryRimHeight: 0.335,
  width: 0.42,
  depth: 0.42,
  height: 1.12,
  plantPrice: 9.99,
  planterPrice: 23.15,
});

export const ZIMMER1_FICUS_METADATA = {
  source: "IKEA AT 906.231.79 + Temu 607016466675388, SKU 107283317021641; Produktfotos und Maßbilder des Nutzers, 27.11.2026.",
  confidence: "estimated" as const,
  notes: [
    "IKEA: Pflanzenhöhe 95 cm, Kulturtopf Ø 19 cm; Preis 9,99 €. Einzelpflanzen können in der Höhe variieren.",
    "Temu: beigefarbenes großes Harz-Kelchgefäß; Außen-Ø 26,5 cm, Öffnung Ø 23,5 cm, Fuß Ø 21 cm, Höhe 35,5 cm (zweites Maßbild gerundet 36 cm). Preis 23,15 € laut Nutzer.",
    "Kulturtopf ca. 16,5 cm hoch geschätzt, Oberkante 2 cm unter dem Rand; bei Bedarf standsicherer Einsatz. Gesamthöhe im Plan 112 cm, Blattbreite/-tiefe ca. 42 cm; keine Händlermaße für Kronenbreite oder Einstecktiefe.",
    "Standort: bisherige Fensterecke in Zimmer 1; hell, ohne direkte Sonne. Drainageöffnung des Übertopfs mit geeignetem Untersetzer sichern.",
  ],
};

/** One-time product replacement, preserving position, rotation and every
 * unrelated placement. Respect intentional deletion and alternative products. */
export function upgradeZimmer1Ficus<T extends { id: string; placements?: PlannerPlacement[] }>(document: T): T {
  if (document.id !== "wohnung-v3" || !document.placements) return document;
  let changed = false;
  const placements = document.placements.map(item => {
    if (item.id !== ZIMMER1_FICUS.placementId || item.roomId !== "zimmer1" || item.catalogId !== "plant-zimmer1-olive") return item;
    changed = true;
    return {
      ...item,
      catalogId: ZIMMER1_FICUS.catalogId,
      size: { width: ZIMMER1_FICUS.width, depth: ZIMMER1_FICUS.depth, height: ZIMMER1_FICUS.height },
      materialVariants: { ...item.materialVariants, main: "ficus-green" },
      metadata: ZIMMER1_FICUS_METADATA,
    };
  });
  return changed ? { ...document, placements } : document;
}
