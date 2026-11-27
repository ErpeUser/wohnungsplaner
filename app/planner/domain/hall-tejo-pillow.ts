import type { PlannerBuiltIn, PlannerPlacement } from "./types.ts";

export const HALL_TEJO_PILLOW_ID = "builtin-hall-tejo-bronze-pillow";
export const HALL_TEJO_PILLOW_CATALOG_ID = "hall-tejo-bronze-pillow";
export const HALL_TEJO_PILLOW_ARTICLE = Object.freeze({
  id: "605638990106029",
  sku: "103514751647878",
  url: "https://www.temu.com/goods.html?goods_id=605638990106029&sku_id=103514751647878",
  imageUrl: "https://img.kwcdn.com/product/fancy/72fa7cf8-097b-412c-9ee2-07ffa06230a6.jpg",
  price: 12.85,
  packSize: 2,
});
export const HALL_TEJO_PILLOW_LAYOUT = Object.freeze({
  width: .4, height: .4, depth: .15,
  localX: .31, localZ: -.07,
  // Source: seat geometry in furniture/decor.tsx and furniture/hallway-brown.tsx.
  seatTopRatio: .244 + .055 / 2,
  photoSeatTopRatio: .289 + .06 / 2,
});
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Right side as seen facing the mirror/bench, not an absolute room direction. */
export function createHallTejoPillow(bench: PlannerPlacement): PlannerBuiltIn | undefined {
  const l = HALL_TEJO_PILLOW_LAYOUT;
  const brown = bench.catalogId === "hallway-brown-mirror-bench-115";
  if (bench.id !== "hall-tejo-wardrobe" || bench.roomId !== "vorraum"
    || (!brown && bench.catalogId !== "hallway-tejo-115")) return undefined;
  const seatCenter = (brown ? .167 : .19) * bench.size.width;
  const seatHalfWidth = (brown ? .573 : .58) * bench.size.width / 2;
  const seatBack = (brown ? .054 - .70/2 : .07 - .73/2) * bench.size.depth;
  const seatFront = (brown ? .054 + .70/2 : .07 + .73/2) * bench.size.depth;
  if (seatHalfWidth * 2 < l.width + .04 || seatFront - seatBack < l.depth + .04) return undefined;
  const x = Math.min(l.localX, seatCenter + seatHalfWidth - l.width / 2 - .025);
  const z = l.localZ;
  // Pillow bottom is 2.8 cm toward the front because of the soft backward lean.
  if (x - l.width/2 < seatCenter - seatHalfWidth || z + .028 < seatBack || z + .028 > seatFront) return undefined;
  const angle = bench.rotation * Math.PI / 180;
  const position = {
    x: round(bench.position.x + Math.cos(angle) * x - Math.sin(angle) * z),
    z: round(bench.position.z + Math.sin(angle) * x + Math.cos(angle) * z),
  };
  return {
    id: HALL_TEJO_PILLOW_ID,
    catalogId: HALL_TEJO_PILLOW_CATALOG_ID,
    label: "Vorraum · Chenille-Dekokissen Bronze · 40 × 40 cm · TEJO-Sitzbank",
    roomId: "vorraum",
    kind: "other",
    position,
    elevation: round((bench.elevation ?? 0) + bench.size.height * (brown ? l.photoSeatTopRatio : l.seatTopRatio)),
    rotation: bench.rotation,
    size: { width: l.width, depth: l.depth, height: l.height },
    locked: true,
    collision: "decorative",
    materialVariants: { main: "fabric-hall-bronze-chenille" },
    metadata: {
      source: "Temu Art. 605638990106029 · SKU 103514751647878 · Nutzerauswahl Bronze/40 × 40 cm",
      confidence: "estimated",
      notes: [
        "Nutzerangebot: 2 einfarbig geprägte Chenille-Dekokissenbezüge, Bronze, je 40 × 40 cm, 12,85 € pro 2er-Set. Ein Bezug wird am Sitzplatz verwendet, der andere bleibt Reserve.",
        "Nur Bezüge im Angebot; Kissenfüllung separat erforderlich und noch nicht bepreist. Gefüllte Tiefe 15 cm sowie tatsächlicher Farbton und Textur sind Modellannahmen.",
        "Rechte Ecke der offenen TEJO-Sitzfläche (von vorne gesehen), weich gefüllt und leicht nach hinten gelehnt. Garderobenposition und restliche Einrichtung bleiben unverändert.",
      ],
    },
  };
}

/** Add exactly one pillow to old saves; do not reset or move the furniture. */
export function ensureHallTejoPillow<T extends { id: string; builtIns: PlannerBuiltIn[]; placements?: PlannerPlacement[] }>(document: T): T {
  if (document.id !== "wohnung-v3" || !document.placements) return document;
  const bench = document.placements.find(item => item.id === "hall-tejo-wardrobe");
  const target = bench && createHallTejoPillow(bench);
  const current = document.builtIns.find(item => item.id === HALL_TEJO_PILLOW_ID);
  if (!target && !current) return document;
  if (target && current && current.metadata?.source === target.metadata?.source
    && current.position.x === target.position.x && current.position.z === target.position.z
    && current.rotation === target.rotation && current.elevation === target.elevation
    && current.size.width === target.size.width && current.size.depth === target.size.depth
    && current.size.height === target.size.height
    && document.builtIns.filter(item => item.id === HALL_TEJO_PILLOW_ID).length === 1) return document;
  const builtIns = document.builtIns.filter(item => item.id !== HALL_TEJO_PILLOW_ID);
  if (target) {
    const index = document.builtIns.findIndex(item => item.id === HALL_TEJO_PILLOW_ID);
    builtIns.splice(index < 0 ? builtIns.length : index, 0, target);
  }
  return { ...document, builtIns };
}
