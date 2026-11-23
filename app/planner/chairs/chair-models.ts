import type { PlannerPlacement, Point2, Size3 } from "../domain/types.ts";

export type ChairModelId =
  | "temu-swivel-upholstered"
  | "temu-faux-leather-metal"
  | "temu-velvet-swivel-arm"
  | "moebelix-amber-chenille"
  | "chair-kaleo-chenille-beige"
  | "aliexpress-woltu-chenille-1005013095870024";

export type ChairSourceStatus = "confirmed" | "estimated";
export type ChairBaseStyle = "swivel-disc" | "metal-legs" | "swivel-metal-legs" | "star-base";

export type ChairModel = {
  id: ChairModelId;
  name: string;
  shortName: string;
  catalogId: string;
  sourceUrl: string;
  mirrorUrl?: string;
  sourceLabel: string;
  sourceStatus: ChairSourceStatus;
  confidence: "confirmed" | "estimated";
  imageUrls: readonly string[];
  sizeCm: { width: number; depth: number; height: number };
  seatCm: { width: number; depth: number; height: number };
  armHeightCm?: number;
  baseStyle: ChairBaseStyle;
  swivel: boolean;
  materialId: string;
  sourceNotes: readonly string[];
};

export const CHAIR_MODELS: readonly ChairModel[] = [
  {
    id: "aliexpress-woltu-chenille-1005013095870024",
    name: "WOLTU Chenille 360°-Drehstuhl · 2er-Set · AliExpress",
    shortName: "WOLTU Chenille · Hauptstuhl",
    catalogId: "chair-aliexpress-woltu-1005013095870024",
    sourceUrl: "https://de.aliexpress.com/item/1005013095870024.html",
    sourceLabel: "WOLTU / AliExpress Art. 1005013095870024 · Titel aus Nutzer-Tab, Händlergalerie nicht auslesbar",
    sourceStatus: "estimated",
    confidence: "estimated",
    imageUrls: [],
    // Planning envelope, not an independently verified manufacturer drawing.
    sizeCm: { width: 58, depth: 60, height: 85 },
    seatCm: { width: 44, depth: 44, height: 48 },
    armHeightCm: 65,
    baseStyle: "swivel-metal-legs",
    swivel: true,
    materialId: "fabric-woltu-chenille-cream",
    sourceNotes: [
      "Titel im Nutzer-Tab: WOLTU 2-teiliges Set, Chenille-Esszimmerstühle, 360° drehbar, Metallbeine. Produktgalerie und Maßzeichnung nicht zugänglich.",
      "3D-Planungsmaß geschätzt: ca. 58 × 60 × 85 cm, Sitzhöhe 48 cm, Armhöhe 65 cm; keine bestätigten Herstellermaße.",
      "Cremebeiger Chenillebezug als Planungsfarbe, gerundete Armlehnen und vier ausgestellte Metallbeine mit mittigem Drehteller als Modellannahmen.",
      "Vier Essplätze erfordern zwei 2er-Sets; Variante und Endpreis vor Kauf bestätigen.",
    ],
  },
  {
    id: "temu-swivel-upholstered",
    name: "Temu · gepolsterter 360°-Drehstuhl",
    shortName: "Temu Drehstuhl",
    catalogId: "chair-temu-swivel-upholstered",
    sourceUrl: "https://www.temu.com/goods.html?_bg_fs=1&goods_id=606097863765202&sku_id=93416948027298&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F53b253e1-a9b1-4517-b392-efa473b51af4.jpg",
    mirrorUrl: "https://www.woltu.eu/en/p/woltu-swivel-dining-chairs-set-of-2-with-armrests-backrest-with-faux-leather-cover",
    sourceLabel: "Temu goods_id 606097863765202 · WOLTU-Mirror, SKU-Zuordnung unbestätigt",
    sourceStatus: "estimated",
    confidence: "estimated",
    imageUrls: [
      "https://img.kwcdn.com/product/fancy/53b253e1-a9b1-4517-b392-efa473b51af4.jpg?imageView2/2/w/300/q/70/format/avif",
      "https://www.woltu.eu/media/image/1b/81/0b/Esszimmerst-hle-drehbar-2er-Set-mit-Armlehnen-R-ckenlehne-mit-Kunstlederbezug-BH366br-2-Braun1_600x600.jpg",
      "https://www.woltu.eu/media/image/5b/a0/b4/BH366br-9_1280x1280.jpg",
    ],
    sizeCm: { width: 56, depth: 55, height: 81.5 },
    seatCm: { width: 42, depth: 41, height: 40 },
    armHeightCm: undefined,
    baseStyle: "swivel-metal-legs",
    swivel: true,
    materialId: "fabric-temu-sand",
    sourceNotes: [
      "Der überlieferte Temu-Artikeltitel nennt die 360°-Drehfunktion; der gespeicherte Temu-Auszug enthält keine auswertbaren Produktdaten. Der WOLTU-Bildbeleg zeigt vier ausgestellte Metallbeine mit Diagonalstreben, keinen Rundfuß.",
      "Der verwendete WOLTU-Mirror-Datensatz nennt 56 × 55 × 81,5 cm, Sitz 42 × 41 cm und Sitzhöhe 40 cm. Die Zuordnung dieses Händlerprodukts zur Temu-SKU ist nicht unabhängig bestätigt; Maße, Bezug und Konstruktion bleiben daher als geschätzt markiert.",
      "Ältere Händler-Mirrors nennen abweichend 58,5 × 54,5 × 82,5 cm, Sitzhöhe 48 cm und Armlehne 62,5 cm. Dieser Datenkonflikt bleibt offen; die Planung verwendet die Maße des gespeicherten WOLTU-Datensatzes.",
    ],
  },
  {
    id: "temu-faux-leather-metal",
    name: "Temu · Kunstlederstuhl mit Metallbeinen",
    shortName: "Temu Kunstleder",
    catalogId: "chair-temu-faux-leather-metal",
    sourceUrl: "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601105793166093&sku_id=17621190185196&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2Fbd83d8ec-4435-40da-a864-c9030213bed8.jpg",
    mirrorUrl: "https://www.wayfair.com/furniture/pdp/george-oliver-unfinished-side-chair-w100836954.html",
    sourceLabel: "Temu goods_id 601105793166093 · Wayfair-Mirror, SKU-Zuordnung unbestätigt",
    sourceStatus: "estimated",
    confidence: "estimated",
    imageUrls: [
      "https://img.kwcdn.com/product/fancy/bd83d8ec-4435-40da-a864-c9030213bed8.jpg?imageView2/2/w/300/q/70/format/avif",
      "https://assets.wfcdn.com/im/96790214/resize-h800-w800%5Ecompr-r85/2602/260299784/Joviah+18.5+%22+H+Faux+Leather+Upholstered+Side+Chair.jpg",
      "https://assets.wfcdn.com/im/93235194/resize-h600-w600%5Ecompr-r85/2602/260299784/default_name.jpg",
    ],
    sizeCm: { width: 58, depth: 50.98, height: 79.99 },
    seatCm: { width: 50.98, depth: 44, height: 46.99 },
    armHeightCm: undefined,
    baseStyle: "metal-legs",
    swivel: false,
    materialId: "leather-temu-cream",
    sourceNotes: [
      "Der überlieferte Artikeltitel nennt Kunstlederbezug, Rückenlehne und Metallbeine; der gespeicherte Temu-Auszug enthält keine auswertbaren Produktdaten.",
      "Der verwendete Wayfair-Mirror-Datensatz nennt 58 × 50,98 × 79,99 cm gesamt, Sitzhöhe 46,99 cm, Sitzbreite 50,98 cm und Sitztiefe 44 cm. Die Zuordnung zur Temu-SKU und ihrer Farbvariante ist nicht unabhängig bestätigt; der Mirror ersetzt keinen direkten Produktbeleg.",
    ],
  },
  {
    id: "temu-velvet-swivel-arm",
    name: "Temu · Samt-Drehstuhl mit Armlehnen",
    shortName: "Temu Samt-Drehstuhl",
    catalogId: "chair-temu-velvet-swivel-arm",
    sourceUrl: "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601105624026260&sku_id=17620367356026&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F83234f53-a1c7-491b-98fd-79d55723b961.jpg",
    sourceLabel: "Temu goods_id 601105624026260 · WOLTU-Mirror W0ATT0178, SKU-Zuordnung unbestätigt",
    mirrorUrl: "https://www.woltu.eu/p/woltu-esszimmerstuhl-drehbar-2er-set-polsterstuhl-mit-armlehnen-samt-metallbeine",
    sourceStatus: "estimated",
    confidence: "estimated",
    imageUrls: [
      "https://img.kwcdn.com/product/fancy/83234f53-a1c7-491b-98fd-79d55723b961.jpg?imageView2/2/w/300/q/70/format/avif",
      "https://www.woltu.eu/media/image/3d/07/ec/Esszimmerstuhl-drehbar-2er-Set-Polsterstuhl-Armlehnen-Samt-Metallbeine-W0ATT0178-2-Creme5.jpg",
      "https://www.woltu.eu/media/image/53/ab/18/Esszimmerstuhl-drehbar-4er-Set-Polsterstuhl-Armlehnen-Samt-Metallbeine-W0ATT0178-4-Creme9.jpg",
    ],
    sizeCm: { width: 58, depth: 63.5, height: 86 },
    seatCm: { width: 41, depth: 45, height: 47 },
    armHeightCm: undefined,
    baseStyle: "swivel-metal-legs",
    swivel: true,
    materialId: "velvet-temu-beige",
    sourceNotes: [
      "Der überlieferte Artikeltitel nennt Samtbezug, Armlehnen, Metallbeine und Drehfunktion; der gespeicherte Temu-Auszug enthält keine auswertbaren Produktdaten.",
      "Der gespeicherte WOLTU-Mirror W0ATT0178 nennt 58 × 63,5 × 86 cm, Sitz 41 × 45 cm und Sitzhöhe 47 cm und zeigt vier ausgestellte Metallbeine mit Drehplatte. Das ähnliche Motiv bestätigt keine Identität mit der Temu-SKU; Zuordnung und Maße bleiben geschätzt.",
    ],
  },
  {
    id: "chair-kaleo-chenille-beige",
    name: "Möbelix · Kaleo Chenille Beige",
    shortName: "Möbelix Kaleo",
    catalogId: "chair-kaleo-chenille-beige",
    sourceUrl: "https://www.moebelix.at/p/livetastic-armlehnstuhl-kaleo-chenille-beige-b-63-cm-001634004202",
    sourceLabel: "Möbelix / Kaleo Art. 1634004202",
    sourceStatus: "confirmed",
    confidence: "confirmed",
    imageUrls: [
      "https://media.moebelix.com/i/moebelix/PIQghM0TEt8Rkf_BHvYMmetg/?fmt=auto&%24hq%24=&w=1200",
      "https://media.moebelix.com/i/moebelix/PImnOsAgav9T4GaqxVL4bRDA/?fmt=auto&%24hq%24=&w=1000",
      "https://media.moebelix.com/i/moebelix/PInY2WmCYwWZne-9WABrgt0g/?fmt=auto&%24dq%24=&w=200&h=200",
    ],
    sizeCm: { width: 63, depth: 64, height: 87 },
    seatCm: { width: 46, depth: 46, height: 50 },
    armHeightCm: 66,
    baseStyle: "swivel-disc",
    swivel: true,
    materialId: "fabric-kaleo-beige",
    sourceNotes: [
      "Möbelix-Maße: 63 × 64 × 87 cm, Sitzhöhe 50 cm, Armlehnenoberkante 66 cm.",
      "Chenille in Beige/Leinenoptik, 360° drehbar, schwarzer Rundfuß.",
    ],
  },
  {
    id: "moebelix-amber-chenille",
    name: "Möbelix · Amber Chenille Beige",
    shortName: "Möbelix Amber",
    catalogId: "chair-amber-chenille-beige",
    sourceUrl: "https://www.moebelix.at/p/livetastic-armlehnstuhl-amber-chenille-beige-b-56-cm-001125032251",
    sourceLabel: "Möbelix / Livetastic Amber Art. 001125032251",
    sourceStatus: "confirmed",
    confidence: "confirmed",
    imageUrls: [
      "https://media.moebelix.com/i/moebelix/PIhgrtLSTrngcIuajEUkHINw/?fmt=auto&%24hq%24=&w=1200",
      "https://media.moebelix.com/i/moebelix/PInY2WmCYwWZne-9WABrgt0g/?fmt=auto&%24hq%24=&w=1200",
      "https://media.moebelix.com/i/moebelix/PI-d4kSew-SCFF_b-PIZtphw/?fmt=auto&%24hq%24=&w=1200",
    ],
    sizeCm: { width: 56, depth: 61, height: 90 },
    seatCm: { width: 42, depth: 43, height: 49 },
    armHeightCm: 66,
    baseStyle: "star-base",
    swivel: true,
    materialId: "fabric-amber-beige",
    sourceNotes: [
      "Möbelix-Maßblatt: B × H × T 56 × 90 × 61 cm, Sitzhöhe 49 cm, Sitztiefe 43 cm, Sitzbreite 42 cm, Armlehnenoberkante 66 cm.",
      "Drehbare Sitzfläche und schwarzer vierarmiger Kreuzfuß laut gespeichertem Produktbild. Separate Fußabmessungen sind in den gespeicherten Maßangaben nicht bestätigt.",
    ],
  },
];

export function getChairModel(id: string | undefined) {
  return CHAIR_MODELS.find((model) => model.id === id);
}

export function getChairModelForCatalogId(catalogId: string | undefined) {
  return CHAIR_MODELS.find((model) => model.catalogId === catalogId);
}

export function metresFromCentimetres(sizeCm: ChairModel["sizeCm"]): Size3 {
  return {
    width: Number((sizeCm.width / 100).toFixed(4)),
    depth: Number((sizeCm.depth / 100).toFixed(4)),
    height: Number((sizeCm.height / 100).toFixed(4)),
  };
}

export function chairModelHasGeometry(model: ChairModel) {
  return Boolean(model.catalogId && model.sizeCm.width > 0 && model.sizeCm.depth > 0 && model.sizeCm.height > 0);
}

export type ChairSeatLayout = {
  id: string;
  position: Point2;
  rotation: number;
};

/**
 * Places the four seats around the currently selected dining table.  The
 * perpendicular offset uses the largest real footprint (chair depth or a
 * star/swivel base), so changing models never hides a foot under the table.
 */
export function chairSeatLayout(table: PlannerPlacement, model: ChairModel): ChairSeatLayout[] {
  const baseDepth = model.baseStyle === "star-base" ? Math.max(model.sizeCm.depth / 100, 0.65) : model.sizeCm.depth / 100;
  const sideOffset = table.size.width / 2 + baseDepth / 2 + 0.04;
  const endOffset = table.size.depth / 2 + model.sizeCm.depth / 200 + 0.04;
  const radians = (table.rotation * Math.PI) / 180;
  const rotateOffset = (dx: number, dz: number): Point2 => ({
    x: table.position.x + dx * Math.cos(radians) - dz * Math.sin(radians),
    z: table.position.z + dx * Math.sin(radians) + dz * Math.cos(radians),
  });
  const localSeats = [
    { id: "living-kaleo-chair-west", dx: 0, dz: -endOffset, rotation: 0 },
    { id: "living-kaleo-chair-east", dx: sideOffset, dz: 0, rotation: 90 },
    { id: "living-kaleo-chair-south", dx: -sideOffset, dz: 0, rotation: 270 },
    { id: "living-kaleo-chair-north", dx: 0, dz: endOffset, rotation: 180 },
  ];
  return localSeats.map((seat) => ({
    id: seat.id,
    position: rotateOffset(seat.dx, seat.dz),
    rotation: (seat.rotation + table.rotation + 360) % 360,
  }));
}
