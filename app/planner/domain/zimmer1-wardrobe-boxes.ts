import type { PlannerBuiltIn, PlannerPlacement } from "./types.ts";

export const ZGV_WARDROBE_BOX_ID = "builtin-z1-wardrobe-top-decor";
export const ZGV_WARDROBE_ARTICLE = Object.freeze({
  id: "607487503734082",
  sku: "118252395101764",
  url: "https://www.temu.com/goods.html?goods_id=607487503734082&sku_id=118252395101764",
  imageUrl: "https://img.kwcdn.com/product/fancy/edbf37b3-64f4-4dc4-9c81-b9ad8cb96c58.jpg",
  price: 12.74,
  packSize: 3,
});

export const ZGV_WARDROBE_LAYOUT = Object.freeze({
  boxWidth: .6, boxDepth: .4, boxHeight: .3,
  gap: .07, groupWidth: 1.94, wardrobeWidth: 2.25,
  wardrobeHeight: 2.1, ceilingHeight: 2.56,
});

export function zgvWardrobeBoxCenters() {
  const pitch = ZGV_WARDROBE_LAYOUT.boxWidth + ZGV_WARDROBE_LAYOUT.gap;
  return [-pitch, 0, pitch];
}

const l = ZGV_WARDROBE_LAYOUT;
export const ZGV_WARDROBE_BOXES: PlannerBuiltIn = {
  id: ZGV_WARDROBE_BOX_ID,
  label: "ZGV · 3 XL-Aufbewahrungsbeutel auf dem Schrank · je 60 × 40 × 30 cm",
  roomId: "zimmer1",
  kind: "storage",
  catalogId: "zimmer1-wardrobe-top-decor",
  position: { x: 1.19, z: 2.98 },
  elevation: l.wardrobeHeight,
  rotation: 180,
  size: { width: l.groupWidth, depth: l.boxDepth, height: l.boxHeight },
  locked: true,
  collision: "decorative",
  materialVariants: { main: "fabric-taupe", trim: "fabric-ecru" },
  metadata: {
    source: "Temu Art. 607487503734082 · SKU 118252395101764 · Nutzer-Produktbild und Preis · ZGV 3St/XL",
    confidence: "confirmed",
    notes: [
      "Drei faltbare Kleider-Aufbewahrungsbeutel je 60 × 40 × 30 cm (B/T/H), Preis 12,74 € für das gesamte 3er-Set laut Nutzerangabe.",
      "Braun-cremefarbenes geometrisches Textilmuster, cremefarbene Einfassung, doppelter Reißverschluss, vorderes Sichtfenster mit sichtbaren gefalteten Textilien und seitliche verstärkte Griffe. Detailgeometrie und Muster sind bildbasierte Annäherungen.",
      "Nebeneinander auf der 225 × 58 cm großen Schrankoberseite; 7 cm Zwischenraum, 15,5 cm seitlicher Rand, 9 cm Tiefenrand vorne und hinten. Schrankoberseite bei 210 cm, Taschenoberkante bei 240 cm, 16 cm bis zur 256-cm-Decke.",
      "Tragfähigkeit der Schrankoberseite vor tatsächlicher Beladung prüfen.",
    ],
  },
};

/** One-time product replacement of the existing locked group without moving furniture. */
export function upgradeZimmer1WardrobeBoxes<T extends { id: string; builtIns: PlannerBuiltIn[]; placements?: PlannerPlacement[] }>(document: T): T {
  if (document.id !== "wohnung-v3") return document;
  const previous = document.builtIns.find(item => item.id === ZGV_WARDROBE_BOX_ID);
  if (!previous || previous.metadata?.source === ZGV_WARDROBE_BOXES.metadata?.source) return document;
  const wardrobe = document.placements?.find(item => item.id === "zimmer1-wardrobe" && item.roomId === "zimmer1");
  if (!wardrobe || wardrobe.size.width < l.groupWidth || wardrobe.size.depth < l.boxDepth) return document;
  const top = (wardrobe.elevation ?? 0) + wardrobe.size.height;
  if (top + l.boxHeight > l.ceilingHeight + 1e-8) return document;
  const replacement: PlannerBuiltIn = {
    ...structuredClone(ZGV_WARDROBE_BOXES),
    position: { ...wardrobe.position },
    elevation: top,
    rotation: wardrobe.rotation,
  };
  return { ...document, builtIns: document.builtIns.map(item => item.id === previous.id ? replacement : item) };
}
