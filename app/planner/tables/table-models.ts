import type { Size3 } from "../domain/types.ts";

export type TableModelId =
  | "aliexpress-100-140"
  | "temu-606997-120-160"
  | "kaufland-567080013-120-160"
  | "temu-609726-unknown";

export type TableVariantId = "closed" | "extended";
export type TableShape = "round" | "oval";
export type TableConfidence = "confirmed" | "estimated" | "unknown";
export type TableSourceStatus = "confirmed" | "mirror" | "blocked";

export type TableVariant = {
  id: TableVariantId;
  label: string;
  shape: TableShape;
  sizeCm: { width: number; depth: number; height: number };
  seatCount: number;
  confidence: TableConfidence;
  notes: readonly string[];
};

export type TableModel = {
  id: TableModelId;
  name: string;
  shortName: string;
  catalogId?: string;
  sourceUrl: string;
  canonicalUrl?: string;
  sourceStatus: TableSourceStatus;
  sourceLabel: string;
  sourceNotes: readonly string[];
  imageUrls: readonly string[];
  variants: readonly TableVariant[];
  materialId: string;
};

const ALIEXPRESS_URL = "https://de.aliexpress.com/item/1005013489223528.html?gatewayAdapt=glo2deu";
const TEMU_STORAGE_URL = "https://www.temu.com/at/g-606997911062061.html";
const KAUFLAND_URL = "https://www.kaufland.at/product/567080013/";
const TEMU_UNKNOWN_URL = "https://www.temu.com/at/g-609726356120319.html";

export const TABLE_MODELS: readonly TableModel[] = [
  {
    id: "aliexpress-100-140",
    name: "AliExpress · rund ausziehbar",
    shortName: "AliExpress 100 → 140",
    catalogId: "dining-table-aliexpress-100-140",
    sourceUrl: ALIEXPRESS_URL,
    canonicalUrl: "https://www.aliexpress.com/item/3256813302908776.html",
    sourceStatus: "mirror",
    sourceLabel: "AliExpress Art. 1005013489223528 · OG-Titel und Maßbild-Spiegel",
    sourceNotes: [
      "Direktseite liefert einen Sicherheits-/Bot-Hinweis; der Produkt-Titel nennt 100 × 100 cm rund und 140 × 100 cm oval.",
      "Die Höhe ist im gespeicherten Datensatz als geschätzte 75 cm markiert, bis ein eindeutiges Maßbild vorliegt.",
    ],
    imageUrls: [
      "https://ae-pic-a1.aliexpress-media.com/kf/S005657650b73487a92a7edecc2eecde9I.jpg",
      "https://www.rathwood.com/cdn/shop/files/092de11d5b818b283f67d5fea393c448.jpg?v=1763777978&width=1280",
    ],
    materialId: "oak-artisan",
    variants: [
      {
        id: "closed",
        label: "geschlossen · rund",
        shape: "round",
        sizeCm: { width: 100, depth: 100, height: 75 },
        seatCount: 4,
        confidence: "estimated",
        notes: ["Runde Grundform, im Produkt-Titel mit 100 × 100 cm angegeben."],
      },
      {
        id: "extended",
        label: "1 Auszug · oval",
        shape: "oval",
        sizeCm: { width: 140, depth: 100, height: 75 },
        seatCount: 6,
        confidence: "estimated",
        notes: ["Ovaler Auszug auf 140 × 100 cm; Höhe vom Produktbild abgeleitet."],
      },
    ],
  },
  {
    id: "temu-606997-120-160",
    name: "Temu · Eiche mit Stauraum",
    shortName: "Temu 120 → 160",
    catalogId: "dining-table-temu-606997-120-160",
    sourceUrl: TEMU_STORAGE_URL,
    canonicalUrl: "https://www.temu.com/at/ausziehbarer-runder-esstisch-eichenende-erweiterbare-tischplatte-mit-aufbewahrungsschrank-und-schiebeturen-und-verstellbaren-regalen-esszimmer-wohnzimmer-120-160x120x75-5cm-g-606997911062061.html",
    sourceStatus: "mirror",
    sourceLabel: "Temu g-606997911062061 · Canonical-Slug und dimensionsgleicher Mirror",
    sourceNotes: [
      "Die Live-Seite ist durch Login/Captcha geschützt; der Canonical-Slug und der dimensionsgleiche Mirror nennen 120–160 × 120 × 75,5 cm.",
      "Stauraum unter der Platte mit Schiebetüren und verstellbaren Regalböden ist als Produktmerkmal dokumentiert.",
    ],
    imageUrls: [
      "https://m.media-amazon.com/images/I/512a-E4UDpL._AC_.jpg",
      "https://m.media-amazon.com/images/I/91ZoI9Z++PL._AC_SY355_.jpg",
      "https://media.reshift.nl/catalog/284CDF47AC16C2CFB50687190C6BE52E35516992?h=336",
    ],
    materialId: "oak-natural",
    variants: [
      {
        id: "closed",
        label: "geschlossen · rund",
        shape: "round",
        sizeCm: { width: 120, depth: 120, height: 75.5 },
        seatCount: 6,
        confidence: "estimated",
        notes: ["Runde Platte Ø120 cm mit Stauraumkorpus."],
      },
      {
        id: "extended",
        label: "1 Auszug · oval",
        shape: "oval",
        sizeCm: { width: 160, depth: 120, height: 75.5 },
        seatCount: 8,
        confidence: "estimated",
        notes: ["Ausgezogen 160 × 120 cm; zwei bis drei zusätzliche Plätze gegenüber der runden Stellung."],
      },
    ],
  },
  {
    id: "kaufland-567080013-120-160",
    name: "Kaufland · Flieks Strukturfuß",
    shortName: "Kaufland 120 → 160",
    catalogId: "dining-table-kaufland-567080013-120-160",
    sourceUrl: KAUFLAND_URL,
    sourceStatus: "confirmed",
    sourceLabel: "Kaufland.at Produkt 567080013 · Maßgrafik und Galerie",
    sourceNotes: [
      "Die Galerie nennt 120–160 × 80 × 75,5 cm, 1,8 cm Plattenstärke, 60-cm-Endstücke und ein 40-cm-Mittelblatt.",
      "Das Produkt ist ein ovaler MDF-/Holzdekor-Tisch mit vertikal strukturierter Sockelform und 60 kg Belastbarkeit.",
    ],
    imageUrls: [
      "https://media.cdn.kaufland.de/product-images/1024x1024/2c09f4a51cf7bed6ced460303926ce94.webp",
      "https://media.cdn.kaufland.de/product-images/1024x1024/61cf380b40ec7435a6a8ad6bc9438b0a.webp",
      "https://media.cdn.kaufland.de/product-images/1024x1024/1ba5bfb0650b9ba6cf1c37211f406643.webp",
    ],
    materialId: "walnut",
    variants: [
      {
        id: "closed",
        label: "geschlossen · oval",
        shape: "oval",
        sizeCm: { width: 120, depth: 80, height: 75.5 },
        seatCount: 4,
        confidence: "confirmed",
        notes: ["Geschlossene Stellung mit 120 × 80 cm."],
      },
      {
        id: "extended",
        label: "1 Auszug · oval",
        shape: "oval",
        sizeCm: { width: 160, depth: 80, height: 75.5 },
        seatCount: 6,
        confidence: "confirmed",
        notes: ["40-cm-Mittelblatt zwischen zwei 60-cm-Endstücken; ausgezogen 160 × 80 cm."],
      },
    ],
  },
  {
    id: "temu-609726-unknown",
    name: "Temu · Quelle noch ungeklärt",
    shortName: "Temu 609726 · offen",
    sourceUrl: TEMU_UNKNOWN_URL,
    sourceStatus: "blocked",
    sourceLabel: "Temu g-609726356120319 · keine belastbare Maßquelle",
    sourceNotes: [
      "Die Seite liefert nur eine Login-/Sicherheitsseite; es gibt keinen belastbaren, dimensionsgleichen Spiegel.",
      "Der Reiter bleibt sichtbar, damit die Quelle später nachgetragen werden kann, wird aber nicht als Platzierung angeboten.",
    ],
    imageUrls: [],
    materialId: "oak-natural",
    variants: [],
  },
];

export function getTableModel(id: string | undefined) {
  return TABLE_MODELS.find((model) => model.id === id);
}

export function getTableModelForCatalogId(catalogId: string | undefined) {
  return TABLE_MODELS.find((model) => model.catalogId === catalogId);
}

export function getTableVariant(model: TableModel, id: string | undefined) {
  return model.variants.find((variant) => variant.id === id);
}

export function tableModelHasGeometry(model: TableModel) {
  return model.variants.length > 0 && Boolean(model.catalogId);
}

export function metresFromCentimetres(sizeCm: { width: number; depth: number; height: number }): Size3 {
  return {
    width: Number((sizeCm.width / 100).toFixed(4)),
    depth: Number((sizeCm.depth / 100).toFixed(4)),
    height: Number((sizeCm.height / 100).toFixed(4)),
  };
}
