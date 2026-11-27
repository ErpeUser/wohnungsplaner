import type { PlannerBuiltIn } from "./types.ts";

export const ZIMMER1_ENTRY_ART_ID = "builtin-z1-entry-slim-art";
export const ZIMMER1_ENTRY_GOLD_ID = "builtin-z1-entry-gold-strips";
export const ZIMMER1_ENTRY_GOLD_ARTICLE = Object.freeze({
  id: "607229268836803",
  url: "https://www.temu.com/at/13-stuck-acryl-2cm-x-60cm-spiegel-wandaufkleber-kein-bohren-erforderlich-mit-selbstklebender-ruckseite--kombinier-und-montierbar--fur-wohnzimmer-hintergrundwande-eingangsbereiche-schlafzimmer-und-gewerbeflachen-g-607229268836803.html",
  imageUrl: "https://img.kwcdn.com/product/fancy/2e05a3ae-687f-4baa-a5a8-a2e935361104.jpg",
  price: 8.05,
  packSize: 13,
});

/** Metres. The existing 64 × 254 cm wallpaper return remains untouched. */
export const ZIMMER1_ENTRY_GOLD_LAYOUT = Object.freeze({
  wallWidth: 0.64,
  wallHeight: 2.54,
  wallCenterX: 2.565,
  wallCenterZ: 3.65,
  wallpaperDepth: 0.008,
  columnCount: 4,
  piecesPerColumn: 3,
  stripWidth: 0.02,
  stripLength: 0.6,
  clearGap: 0.10,
  groupWidth: 0.38,
  groupHeight: 1.8,
  elevation: 0.37,
  // Thickness is not specified in the listing; use a thin provisional model.
  depth: 0.002,
  surfaceClearance: 0.001,
});

/** Local coordinates of the twelve actual 2 × 60 cm pieces. */
export function zimmer1EntryGoldSegments() {
  const l = ZIMMER1_ENTRY_GOLD_LAYOUT;
  return Array.from({ length: l.columnCount }, (_, column) =>
    Array.from({ length: l.piecesPerColumn }, (_, row) => ({
      id: `gold-${column + 1}-${row + 1}`,
      x: -l.groupWidth / 2 + l.stripWidth / 2 + column * (l.stripWidth + l.clearGap),
      y: -l.groupHeight / 2 + l.stripLength / 2 + row * l.stripLength,
    })),
  ).flat();
}

const l = ZIMMER1_ENTRY_GOLD_LAYOUT;
export const ZIMMER1_ENTRY_GOLD_STRIPS: PlannerBuiltIn = {
  id: ZIMMER1_ENTRY_GOLD_ID,
  label: "Goldene Acryl-Spiegelstreifen neben der Tür · 4 Linien à 180 cm",
  roomId: "zimmer1",
  kind: "other",
  catalogId: "zimmer1-entry-gold-strips",
  position: {
    x: l.wallCenterX + l.wallpaperDepth / 2 + l.surfaceClearance + l.depth / 2,
    z: l.wallCenterZ,
  },
  elevation: l.elevation,
  rotation: 270,
  size: { width: l.groupWidth, depth: l.depth, height: l.groupHeight },
  locked: true,
  collision: "decorative",
  materialVariants: { main: "metal-gold" },
  metadata: {
    source: "Temu Art. 607229268836803 · Produktseite und Nutzerbild · 27.11.2026",
    confidence: "estimated",
    notes: [
      "13 selbstklebende Acryl-Spiegelstreifen, Golden, je 2 × 60 cm laut Produktseite und Nutzerbild. Angezeigter Preis 8,05 € vor Variantenwahl.",
      "Vier senkrechte Linien zu je drei bündig übereinander montierten Streifen; 12 Stück montiert, 1 Reserve. 10 cm lichte Zwischenräume, 38 cm Gesamtbreite, je 13 cm Wandrand.",
      "Unterkante 37 cm, Oberkante 217 cm; auf der 64 × 254 cm großen Tapeten-Rücksprungwand zentriert. Die 26 cm breite Tapetenfortsetzung an der Tür bleibt frei.",
      "2 mm Stärke und Goldreflexion als Visualisierungsannahmen. Eignung des Klebers auf strukturierter Stofftapete und mögliche Rückstände vor Montage an unauffälliger Stelle prüfen.",
    ],
  },
};

/** Retire the old picture placement, retain its separate model and preserve unrelated objects. */
export function upgradeZimmer1EntryGold<T extends { id: string; builtIns: PlannerBuiltIn[] }>(document: T): T {
  if (document.id !== "wohnung-v3") return document;
  const old = document.builtIns.some(item => item.id === ZIMMER1_ENTRY_ART_ID);
  const existing = document.builtIns.some(item => item.id === ZIMMER1_ENTRY_GOLD_ID);
  const anchor = document.builtIns.some(item => item.id === "builtin-z1-entry-wallpaper-return" && item.roomId === "zimmer1");
  if (!old && (existing || !anchor)) return document;
  const next = document.builtIns.filter(item => item.id !== ZIMMER1_ENTRY_ART_ID);
  // Only install on the intended wall; do not introduce a floating object into unrelated plans.
  if (!existing && anchor) {
    const index = document.builtIns.findIndex(item => item.id === ZIMMER1_ENTRY_ART_ID);
    next.splice(index < 0 ? next.length : index, 0, structuredClone(ZIMMER1_ENTRY_GOLD_STRIPS));
  }
  return { ...document, builtIns: next };
}
