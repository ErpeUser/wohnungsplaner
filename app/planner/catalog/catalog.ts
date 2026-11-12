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
  resize: FurnitureResizeRule;
  symbol: "bed" | "storage" | "desk" | "chair" | "sofa" | "table" | "rug" | "light" | "plant";
  fallback3d: string;
  renderMode: FurnitureRenderMode;
  materials: FurnitureMaterial[];
  realism?: ProductRealismSpec;
};

const WOOD = [
  { id: "oak-natural", label: "Eiche natur", color: "#b98a5e" },
  { id: "walnut", label: "Nussbaum", color: "#704c35" },
  { id: "white-matte", label: "Weiß matt", color: "#e8e5de" },
];
const FABRIC = [
  { id: "fabric-sand", label: "Stoff Sand", color: "#c4aa8e" },
  { id: "fabric-light-grey", label: "Stoff Hellgrau", color: "#767a79" },
  { id: "fabric-sage", label: "Stoff Salbei", color: "#82938a" },
  { id: "fabric-anthracite", label: "Stoff Anthrazit", color: "#4c5252" },
];
const BLISS_BEIGE = [
  { id: "fabric-bliss-beige", label: "Polsterstoff Beige", color: "#d8c9af" },
];
const ALI_SOFA_IVORY = [{ id: "fabric-ali-ivory", label: "Beige / warmes Elfenbein", color: "#d8c8b6" }];
const CHICAGO_BEIGE = [
  { id: "fabric-chicago-beige", label: "Chenille Beige", color: "#d8d5cc" },
];
const TEJO_CASHMERE = [
  { id: "tejo-cashmere", label: "Kaschmir Beige", color: "#cbc2b6" },
];
const BOZAN_ARTISAN = [
  { id: "oak-artisan", label: "Artisan Eiche hell", color: "#d0a66b" },
];
const TABLE_KAUFLAND_WALNUT = [
  { id: "walnut", label: "Walnussbraun", color: "#76513b" },
];
const TABLE_TEMU_OAK = [
  { id: "oak-natural", label: "Eiche natur", color: "#b98a5e" },
];
const TABLE_ALI_OAK = [
  { id: "oak-artisan", label: "Artisan Eiche hell", color: "#d0a66b" },
];
const KALEO_BEIGE = [
  { id: "fabric-kaleo-beige", label: "Chenille Beige in Leinenoptik", color: "#ddd2c2" },
];
const TEMU_SWIVEL_SAND = [
  { id: "fabric-temu-sand", label: "Polsterstoff Sand", color: "#d5c7b6" },
];
const TEMU_LEATHER_CREAM = [
  { id: "leather-temu-cream", label: "Kunstleder Creme", color: "#e9dfd2" },
];
const TEMU_VELVET_BEIGE = [
  { id: "velvet-temu-beige", label: "Samt Beige", color: "#cdbba9" },
];
const AMBER_BEIGE = [
  { id: "fabric-amber-beige", label: "Chenille Amber Beige", color: "#d6c4ad" },
];
const LED_NIGHTSTAND_WHITE = [
  { id: "white-matte", label: "Weiß matt", color: "#f4f2ec" },
];
const SHERRY_WHITE_GOLD = [
  { id: "white-matte", label: "Weiß matt / Gold", color: "#f4f2ec" },
];
const ZIMMER1_RUG = [
  { id: "rug-gala-beige-taupe", label: "Beige/Taupe gestreift", color: "#e8e0d3" },
];
const TEMU_SHAGGY_WHITE = [
  { id: "rug-temu-shaggy-white", label: "Weiß / warmes Ivory", color: "#f1ede4" },
];
const TEMU_EASY_LINE_COLORBLOCK = [
  { id: "rug-hall-overlap-taupe", label: "1 · Taupe Kreisbögen", color: "#b9aa98" },
  { id: "rug-temu-easy-line-colorblock", label: "2 · Salbei / Sand organisch", color: "#ded5bd" },
  { id: "rug-hall-soft-abstract", label: "3 · Salbei / Terrakotta soft", color: "#d8d0bd" },
  { id: "rug-hall-beige-patchwork", label: "4 · Beige Geometrie", color: "#cfc2aa" },
  { id: "rug-hall-olive-lineart", label: "5 · Creme / Oliv Line-Art", color: "#d8d2b8" },
];
const TEMU_RABBIT_IVORY = [
  { id: "rug-temu-rabbit-ivory", label: "Elfenbein", color: "#eee7da" },
];
const LIVING_RUG_IVORY_GREIGE = [
  { id: "rug-temu-vintage-cream", label: "Vintage-Beige/Taupe · florales Ornament", color: "#d8c7ae" },
];
const ZIMMER1_PLANT = [
  { id: "leaf-olive", label: "Olivgrün mit mattem Beigetopf", color: "#667358" },
];
const TEMU_EXECUTIVE_IVORY = [
  { id: "leather-ivory", label: "Cremefarbenes Kunstleder / Chrom", color: "#e5ded4" },
];

const PRODUCT_REALISM: Record<string, ProductRealismSpec> = {
  "bed-bliss-120": {
    sourceLabel: "XXXLutz / Homesy Art. 800001233737",
    dimensions: "Liegefläche 120 × 200 cm · Gesamt ca. 120 × 200 × 108 cm · Füße ca. 4,5 cm",
    confidence: "verified",
    construction: ["beiger Polsterstoff", "vierteiliger gepolsterter Kopfteil", "Bettkasten mit Lattenrost", "Holz-/Metallrahmen"],
  },
  "sofa-aliexpress-142": {
    sourceLabel: "AliExpress Art. 1005013379584796 · Maßgrafik vom Nutzer",
    dimensions: "geschlossen 142 × 90 × 86,5 cm, ausgezogen 142 × 172 cm, Sitzhöhe 42 cm, 150 kg pro Sitz",
    confidence: "verified",
    construction: ["cremefarbener Stoffbezug", "zwei gerundete Rückenpolster mit Lendenkissen", "breite gepolsterte Armlehnen", "zwei ausziehbare Beinauflagen mit dunklem Gestänge", "seitliche Aufbewahrungstasche und Bedienknopf"],
  },
  "sofa-aliexpress-142-open": {
    sourceLabel: "AliExpress Art. 1005013379584796 · Maßgrafik vom Nutzer",
    dimensions: "ausgezogen 142 × 172 × 86,5 cm · Gesamttiefe 172 cm, geschlossen 142 × 90 cm, Sitzhöhe 42 cm",
    confidence: "verified",
    construction: ["cremefarbener Stoffbezug", "zwei gerundete Rückenpolster mit Lendenkissen", "zwei ausgezogene Beinauflagen", "schwarze ausziehbare Scherenmechanik"],
  },
  "sofa-chicago-206": {
    sourceLabel: "Möbelix / Chicago Art. 2424010201",
    dimensions: "ca. 206 × 107 × 78 cm · Sitzhöhe 50 cm · Sitztiefe 56 cm",
    confidence: "verified",
    construction: ["beiger Polyester-Chenillebezug", "zwei Relaxsitze", "Taschenfederkern und Wellenunterfederung", "konische schwarze Metallfüße, ca. 13,5 cm"],
  },
  "sofa-sectional-photo": {
    sourceLabel: "Wohnküchen-Fotoreferenz / vorhandenes Ecksofa",
    dimensions: "ca. 235 × 142 × 84 cm",
    confidence: "estimated",
    construction: ["grauer Bezugsstoff nach Fotoreferenz", "L-förmige Eckanordnung", "gepolsterte Sitz- und Rückenelemente", "Detailmaße proportional aus den Bestandsfotos geschätzt"],
  },
  "rug-temu-shaggy-white-120x200": {
    sourceLabel: "Temu Produktbild / gewählte 120 × 200 cm Ausführung",
    dimensions: "120 × 200 cm · Florhöhe im Modell ca. 4 cm",
    confidence: "estimated",
    construction: ["weißer Zottel-Hochflor", "dichte weiche Florbüschel", "flache textile Kante", "Maße aus der gewählten Variante übernommen"],
  },
  "rug-temu-easy-line-140x200": {
    sourceLabel: "Temu Produktbild / Easy-Line Color-Block-Teppich",
    dimensions: "140 × 200 cm · flacher Samtflor",
    confidence: "estimated",
    construction: ["abstrakte Color-Block-Flächen", "Creme, Salbei und warmes Beige", "feine helle Konturlinien", "größere Vergleichsgröße desselben Dekors"],
  },
  "hallway-tejo-115": {
    sourceLabel: "Möbelix / Tejo Art. 2778003504",
    dimensions: "ca. 115 × 37,5 × 231,9 cm · Spiegel ca. 35 × 140 cm",
    confidence: "verified",
    construction: ["Kaschmir-/Eiche-Nachbildung", "raumhoher Korpus", "Spiegel, Sitzbank, Hakenleiste", "fünf Einlegeböden und seitenverkehrt montierbar"],
  },
  "dining-table-bozan-110": {
    sourceLabel: "Möbelix / Bozan AZ Art. 2858001801",
    dimensions: "geschlossen Ø 110 × 76 cm · ausgezogen 150 × 110 cm",
    confidence: "verified",
    construction: ["Artisan-Eiche-Melaminoberfläche", "25-mm-Platte", "schwarzes pulverbeschichtetes Metall-Sterngestell", "mittige Auszugfuge"],
  },
  "dining-table-aliexpress-100-140": {
    sourceLabel: "AliExpress Art. 1005013489223528 · OG-Titel und Maßbild-Spiegel",
    dimensions: "geschlossen rund 100 × 100 × 75 cm · ausgezogen oval 140 × 100 × 75 cm",
    confidence: "estimated",
    construction: ["ausziehbare runde/ovale Tischplatte", "glatte Holzdekoroberfläche", "schwarze Metallstütze", "Höhe aus dem gespeicherten Maßbild geschätzt"],
  },
  "dining-table-temu-606997-120-160": {
    sourceLabel: "Temu g-606997911062061 · Canonical-Slug und dimensionsgleicher Mirror",
    dimensions: "geschlossen rund 120 × 120 × 75,5 cm · ausgezogen oval 160 × 120 × 75,5 cm",
    confidence: "estimated",
    construction: ["Eiche-Dekor/MDF", "Stauraum unter der Platte", "Schiebetüren und verstellbare Regalböden", "ausziehbare Mittelplatte"],
  },
  "dining-table-kaufland-567080013-120-160": {
    sourceLabel: "Kaufland.at Produkt 567080013 · Maßgrafik und Galerie",
    dimensions: "geschlossen oval 120 × 80 × 75,5 cm · ausgezogen oval 160 × 80 × 75,5 cm",
    confidence: "verified",
    construction: ["MDF/Holzdekor in Braun", "vertikal strukturierter Sockel", "1,8 cm starke Tischplatte", "40-cm-Mittelblatt und 60-cm-Endstücke"],
  },
  "dining-table-temu-609726-110-150": {
    sourceLabel: "Temu g-609726356120319 · sichtbare Produkt- und Maßgrafik",
    dimensions: "geschlossen rund 110 × 110 × 75 cm · ausgezogen oval 150 × 110 × 75 cm",
    confidence: "verified",
    construction: ["geriffelter zylindrischer Mittelsockel", "versteckte Auszugsplatten", "warme Holzdekoroberfläche", "50 kg Belastbarkeit laut Produktgrafik"],
  },
  "chair-kaleo-chenille-beige": {
    sourceLabel: "Möbelix / Kaleo Art. 1634004202",
    dimensions: "ca. 63 × 64 × 87 cm · Sitzhöhe 50 cm · Armlehne 66 cm",
    confidence: "verified",
    construction: ["beiger Chenillebezug in Leinenoptik", "Sitzfläche 360° drehbar", "Sitzfläche ca. 46 × 46 cm", "schwarzer pulverbeschichteter Rundfuß, ca. 50 cm"],
  },
  "chair-temu-swivel-upholstered": {
    sourceLabel: "Temu goods_id 606097863765202",
    dimensions: "56 × 55 × 81,5 cm · Sitz 42 × 41 × 40 cm · Armlehnenhöhe unbekannt",
    confidence: "estimated",
    construction: ["gepolsterte Kunstleder-Sitzschale", "360°-Drehfunktion laut Artikeltitel", "kompakte verdeckte Drehplatte", "schwarze mehrarmige Metall-Spreizbasis mit Fußpads", "aktuelle WOLTU/Kaufland-Maße als indirekter Mirrorbeleg"],
  },
  "chair-temu-faux-leather-metal": {
    sourceLabel: "Temu goods_id 601105793166093",
    dimensions: "58 × 50,98 × 79,99 cm · Sitz 50,98 × 44 × 46,99 cm · Armlehnenhöhe unbekannt",
    confidence: "estimated",
    construction: ["Kunstlederbezug", "gepolsterte Rückenlehne", "schlanke schwarze Metallbeine", "armloses Seitenstuhl-Design", "Wayfair-Maße als indirekter Mirrorbeleg"],
  },
  "chair-temu-velvet-swivel-arm": {
    sourceLabel: "Temu goods_id 601105624026260",
    dimensions: "58 × 63,5 × 86 cm · Sitz 41 × 45 × 47 cm · Armlehnenhöhe unbekannt",
    confidence: "estimated",
    construction: ["Samtbezug", "gepolsterte Armlehnen", "360°-Drehfunktion laut Artikeltitel", "vier pyramidenförmige Metallbeine mit Drehplatte", "WOLTU W0ATT0178-Maße als indirekter Mirrorbeleg"],
  },
  "chair-amber-chenille-beige": {
    sourceLabel: "Möbelix / Livetastic Amber Art. 001125032251",
    dimensions: "56 × 61 × 90 cm · Sitzhöhe 49 cm · Sitzfläche 42 × 43 cm · Armlehne 66 cm · Sternfuß 65 × 65 cm",
    confidence: "verified",
    construction: ["Chenillebezug Lappi-03", "Schaumstoffpolsterung", "drehbare Sitzfläche", "schwarzer pulverbeschichteter Eisen-Sternfuß"],
  },
  "vanity-vicco-sherry-120": {
    sourceLabel: "Vicco Sherry / vorhandene Nutzerreferenz",
    dimensions: "Tisch ca. 120 × 55 × 75 cm · integrierter LED-Spiegel ca. 110 × 70 cm",
    confidence: "estimated",
    construction: ["mattweißer Korpus", "fünf Schubladen", "goldfarbene Griffe und Rahmen", "LED-Rahmen am Spiegel"],
  },
  "chair-temu-executive-ivory": {
    sourceLabel: "Temu Produktbild / goods_id 606296522765554",
    dimensions: "ca. 64 × 51 × 105–114 cm · Sitzhöhe 47–56 cm",
    confidence: "estimated",
    construction: ["cremefarbenes Kunstleder", "hohe Rückenlehne und Kopfstütze", "gepolsterte Armlehnen", "ausziehbare Fußstütze und verchromtes Fünfsternuntergestell"],
  },
  "nightstand-led-2drawer-white": {
    sourceLabel: "Temu Produktbild / Art. 601100375290552",
    dimensions: "ca. 39,6 × 30 × 60,4 cm",
    confidence: "estimated",
    construction: ["weißer Korpus", "zwei Schubladen", "beleuchtetes offenes Ablagefach", "Steckdosen und USB-Ladeflächen"],
  },
  "wardrobe-225": {
    sourceLabel: "Zimmer-1-Fotoreferenz / vorhandener Kleiderschrank",
    dimensions: "ca. 225 × 62 × 220 cm",
    confidence: "estimated",
    construction: ["fünf Frontmodule", "mittiges Spiegelmodul", "zwei Schubladenmodule", "weiße matte Fronten und Metallprofile"],
  },
  "rug-temu-rabbit-ivory-100x180": {
    sourceLabel: "Temu Produktbild / Art. 601099532250952",
    dimensions: "100 × 180 cm · Florhöhe im Modell ca. 4 cm",
    confidence: "estimated",
    construction: ["einfarbiger elfenbeinfarbener Kunstkaninchen-Plüsch", "dichte weiche Florbüschel", "gerundete Kanten"],
  },
  "rug-temu-easy-line-120x180": {
    sourceLabel: "Temu Produktbild / Art. 607246280935328",
    dimensions: "120 × 180 cm · flacher Samtflor",
    confidence: "estimated",
    construction: ["abstrakte Color-Block-Flächen", "Creme, Salbei und warmes Beige", "feine helle Konturlinien"],
  },
  "rug-gala-shaggy-2505-100x200": {
    sourceLabel: "Zimmer-1-Referenz / Gala Shaggy 2505",
    dimensions: "100 × 200 cm · Florhöhe ca. 30 mm",
    confidence: "estimated",
    construction: ["beige-taupe Streifen", "Hochflorstruktur", "weicher textile Kantenabschluss"],
  },
  "rug-living-concept-240x240": {
    sourceLabel: "Temu Art. 607199740937372 · SKU 106769800014188 · Variante A8447 / 180 × 250 cm",
    dimensions: "180 × 250 cm · 850 g/m² laut Händler · tatsächliche Florhöhe unbekannt",
    confidence: "verified",
    construction: ["cremefarbener Samt-Kurzflor", "verblasste florale Ranken in warmem Taupe", "umlaufende mehrfach gerahmte Ornamentbordüre", "Nutzerreferenz vom 11.11.2026; das 2D/3D-Muster ist eine fotoähnliche Rekonstruktion"],
  },
  "plant-zimmer1-olive": {
    sourceLabel: "Zimmer-1-Fotoreferenz / vorhandene Deko",
    dimensions: "Stellfläche ca. 42 × 42 cm · Höhe ca. 110 cm",
    confidence: "estimated",
    construction: ["schlanker Stamm", "olivgrüne Blätter", "matter beigefarbener Keramiktopf"],
  },
};

// Product-specific entries have hand-authored parametric geometry until a
// normalized product GLB with matching dimensions and materials is approved.
// Generic catalog items stay on the local GLB path automatically.
export const PHOTO_FIRST_IDS: ReadonlySet<string> = new Set([
  "bed-bliss-120", "wardrobe-225", "vanity-vicco-sherry-120",
  "chair-temu-executive-ivory", "chair-kaleo-chenille-beige", "chair-temu-swivel-upholstered", "chair-temu-faux-leather-metal", "chair-temu-velvet-swivel-arm", "chair-amber-chenille-beige", "sofa-sectional-photo",
  "sofa-chicago-206", "sofa-aliexpress-142", "sofa-aliexpress-142-open", "dining-table-bozan-110", "nightstand-led-2drawer-white",
  "hallway-tejo-115", "dining-table-aliexpress-100-140", "dining-table-temu-606997-120-160", "dining-table-kaufland-567080013-120-160", "rug-gala-shaggy-2505-100x200", "rug-temu-shaggy-white-120x200",
  "rug-temu-easy-line-120x180", "rug-temu-easy-line-140x200", "rug-temu-rabbit-ivory-100x180",
  "rug-living-concept-240x240", "plant-zimmer1-olive",
]);

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  item("bed-bliss-120", "Polsterbett Bliss 120", "Schlafen", "Beiges Polsterbett mit vierteilig gepolstertem Kopfteil, Bettkasten und Lattenrost", [1.47, 2.22, 1.08], "fixed", "bed", "bed", BLISS_BEIGE),
  item("bed-120", "Bett 120", "Schlafen", "Kompaktes Bett mit Kopfteil", [1.2, 2, 0.55], "free", "bed", "bed", FABRIC),
  item("bed-160", "Doppelbett 160", "Schlafen", "Doppelbett mit gepolstertem Kopfteil", [1.6, 2, 0.62], "free", "bed", "bed", FABRIC),
  item("nightstand", "Nachttisch", "Schlafen", "Kompakter Nachttisch", [0.45, 0.4, 0.52], "fixed", "storage", "cabinet", WOOD),
  item("nightstand-led-2drawer-white", "LED-Nachttisch mit Ladestation", "Schlafen", "Kompakter weißer Nachttisch mit zwei Schubladen, beleuchtetem Ablagefach, zwei Steckdosen und USB-Ladeanschlüssen", [0.396, 0.3, 0.604], "fixed", "storage", "cabinet", LED_NIGHTSTAND_WHITE),
  item("sofa-3seat", "Sofa", "Sitzen", "Dreisitzer mit realer Sitztiefe", [2.2, 0.92, 0.82], "uniform", "sofa", "sofa", FABRIC),
  item("sofa-aliexpress-142", "Creme-Relaxsofa AliExpress · 142 cm", "Sitzen", "Zweisitzer mit Lendenkissen, breiten Armlehnen und zwei ausziehbaren Fußstützen", [1.42, 0.9, 0.865], "fixed", "sofa", "sofa", ALI_SOFA_IVORY),
  item("sofa-aliexpress-142-open", "Creme-Relaxsofa · ausgezogen 172 cm", "Sitzen", "Dasselbe Sofa mit ausgefahrenen Fußstützen und 172 cm Tiefenbedarf", [1.42, 1.72, 0.865], "fixed", "sofa", "sofa", ALI_SOFA_IVORY),
  item("sofa-chicago-206", "Sofa Chicago 206", "Sitzen", "Beiger Chenille-Zweisitzer mit zwei elektrischen Relaxplätzen, Taschenfederkern und schwarzen Metallfüßen", [2.06, 1.07, 0.78], "fixed", "sofa", "sofa", CHICAGO_BEIGE),
  item("sofa-sectional-photo", "Ecksofa Grau", "Sitzen", "Fotobelegtes graues Ecksofa der Wohnküche", [2.35, 1.42, 0.84], "free", "sofa", "sofa", FABRIC),
  item("chair-dining", "Stuhl", "Sitzen", "Esszimmerstuhl", [0.5, 0.55, 0.84], "fixed", "chair", "chair", [...WOOD, ...FABRIC]),
  item("chair-kaleo-chenille-beige", "Armlehnstuhl Kaleo", "Sitzen", "Drehbarer Chenille-Armlehnstuhl in Beige mit schwarzem 50-cm-Rundfuß", [0.63, 0.64, 0.87], "fixed", "chair", "chair", KALEO_BEIGE),
  item("chair-temu-swivel-upholstered", "Temu Drehstuhl gepolstert", "Sitzen", "Gepolsterter 360°-Drehstuhl mit kompakter Sitzschale", [0.56, 0.55, 0.815], "fixed", "chair", "chair", TEMU_SWIVEL_SAND),
  item("chair-temu-faux-leather-metal", "Temu Kunstlederstuhl", "Sitzen", "Kunstlederstuhl mit Rückenlehne und Metallbeinen", [0.58, 0.5098, 0.7999], "fixed", "chair", "chair", TEMU_LEATHER_CREAM),
  item("chair-temu-velvet-swivel-arm", "Temu Samt-Drehstuhl", "Sitzen", "Samtbezogener Drehstuhl mit Armlehnen und Metallbasis", [0.58, 0.635, 0.86], "fixed", "chair", "chair", TEMU_VELVET_BEIGE),
  item("chair-amber-chenille-beige", "Armlehnstuhl Amber", "Sitzen", "Drehbarer Chenille-Armlehnstuhl mit schwarzem Sternfuß", [0.56, 0.61, 0.9], "fixed", "chair", "chair", AMBER_BEIGE),
  item("desk-standard", "Schreibtisch", "Arbeiten", "Gerader Arbeitstisch", [1.3, 0.65, 0.75], "free", "desk", "desk", WOOD),
  item("vanity-vicco-sherry-120", "Schminktisch Sherry mit LED-Spiegel", "Arbeiten", "Vorhandener Vicco Sherry in Weiß/Gold mit fünf Schubladen und 110 × 70 cm LED-Spiegel", [1.2, 0.55, 1.45], "fixed", "desk", "desk", SHERRY_WHITE_GOLD),
  item("chair-temu-executive-ivory", "Chefsessel Creme mit Fußstütze", "Arbeiten", "Hoch gepolsterter cremefarbener Drehstuhl mit Kopfstütze, ausziehbarer Fußstütze, gepolsterten Armlehnen und verchromtem Fünfsternfuß", [0.64, 0.51, 1.14], "fixed", "chair", "office-chair", TEMU_EXECUTIVE_IVORY),
  item("chair-office", "Bürostuhl", "Arbeiten", "Drehstuhl mit Armlehnen", [0.62, 0.62, 1.05], "fixed", "chair", "office-chair", FABRIC),
  item("wardrobe-200", "Kleiderschrank", "Aufbewahren", "Vier Türen, 60 cm tief", [2, 0.6, 2.2], "free", "storage", "wardrobe", WOOD),
  item("wardrobe-225", "Kleiderschrank 225", "Aufbewahren", "Fotobelegter Schrank, 225 cm breit", [2.25, 0.62, 2.2], "free", "storage", "wardrobe", WOOD),
  item("hallway-tejo-115", "Garderobe Tejo Beige/Kaschmir", "Aufbewahren", "Raumhohe Garderobenkombination mit Spiegel, Sitzbank, Hakenleiste und fünf Einlegeböden", [1.15, 0.375, 2.319], "fixed", "storage", "wardrobe", TEJO_CASHMERE),
  item("dresser", "Kommode", "Aufbewahren", "Breite Kommode mit Schubladen", [1.2, 0.45, 0.82], "free", "storage", "cabinet", WOOD),
  item("shelf", "Regal", "Aufbewahren", "Offenes Bücherregal", [0.9, 0.35, 1.9], "free", "storage", "shelf", WOOD),
  item("lowboard", "Lowboard", "Aufbewahren", "Niedriges Medienmöbel", [1.8, 0.42, 0.5], "free", "storage", "cabinet", WOOD),
  item("dining-table", "Esstisch", "Tische", "Tisch für vier bis sechs Personen", [1.6, 0.9, 0.75], "free", "table", "table", WOOD),
  item("dining-table-bozan-110", "Ausziehtisch Bozan 110", "Tische", "Runder Esstisch in Artisan-Eiche mit schwarzem Sternfuß, ausziehbar auf 150 × 110 cm", [1.1, 1.1, 0.76], "fixed", "table", "table", BOZAN_ARTISAN),
  item("dining-table-aliexpress-100-140", "AliExpress Tisch 100 → 140", "Tische", "Runder Ausziehtisch mit ovaler 140-cm-Auszugstellung", [1, 1, 0.75], "fixed", "table", "table", TABLE_ALI_OAK),
  item("dining-table-temu-606997-120-160", "Temu Tisch 120 → 160 mit Stauraum", "Tische", "Runder Eiche-Dekor-Tisch mit Stauraumkorpus und ovaler 160-cm-Auszugstellung", [1.2, 1.2, 0.755], "fixed", "table", "table", TABLE_TEMU_OAK),
  item("dining-table-kaufland-567080013-120-160", "Flieks Tisch 120 → 160", "Tische", "Ovaler MDF-Tisch mit strukturiertem Sockel und 40-cm-Mittelblatt", [1.2, 0.8, 0.755], "fixed", "table", "table", TABLE_KAUFLAND_WALNUT),
  item("dining-table-temu-609726-110-150", "Temu Tisch 110 → 150 mit Riffsockel", "Tische", "Runder FAUMRTA-Tisch mit versteckten Auszugsplatten und geriffeltem Mittelsockel", [1.1, 1.1, 0.75], "fixed", "table", "table", TABLE_TEMU_OAK),
  item("rug-200", "Teppich", "Licht/Deko", "Flach gewebter Teppich", [2, 1.4, 0.02], "free", "rug", "rug", FABRIC),
  item("rug-gala-shaggy-2505-100x200", "Hochflor-Teppich Gala Shaggy 2505", "Licht/Deko", "Beige-taupe gestreifter Hochflor-Teppich mit 30-mm-Flor", [2, 1, 0.03], "fixed", "rug", "rug", ZIMMER1_RUG),
  item("rug-temu-shaggy-white-120x200", "Flauschiger Zottelteppich Weiß", "Licht/Deko", "Weißer, weicher Hochflor-Teppich in der gewählten Temu-Ausführung", [1.2, 2, 0.04], "fixed", "rug", "rug", TEMU_SHAGGY_WHITE),
  item("rug-temu-easy-line-120x180", "Easy-Line Color-Block-Teppich", "Licht/Deko", "Flacher Samtteppich mit abstrakten Color-Block-Flächen in Creme, Salbeigrün und warmem Beige", [1.2, 1.8, 0.025], "fixed", "rug", "rug", TEMU_EASY_LINE_COLORBLOCK),
  item("rug-temu-easy-line-140x200", "Vorraumteppich Taupe-Kreisbögen 140 × 200", "Licht/Deko", "Derselbe gewählte Vorraumteppich als größere Vergleichsgröße", [1.4, 2, 0.025], "fixed", "rug", "rug", TEMU_EASY_LINE_COLORBLOCK),
  item("rug-temu-rabbit-ivory-100x180", "Kunstkaninchen-Plüschteppich Elfenbein", "Licht/Deko", "Einfarbiger elfenbeinfarbener Teppich mit dichter, weicher Kunstkaninchen-Plüschoberfläche", [1, 1.8, 0.04], "fixed", "rug", "rug", TEMU_RABBIT_IVORY),
  item("rug-living-concept-240x240", "Temu Vintage-Samtteppich A8447 · 180 × 250", "Licht/Deko", "Cremefarbener flacher Samtteppich mit zartem Blumenornament in Taupe und breiter antiker Bordüre", [2.5, 1.8, 0.02], "fixed", "rug", "rug", LIVING_RUG_IVORY_GREIGE),
  item("floor-lamp", "Stehleuchte", "Licht/Deko", "Schlanke Leselampe", [0.38, 0.38, 1.65], "fixed", "light", "lamp", WOOD),
  item("plant-medium", "Pflanze", "Licht/Deko", "Mittelgroße Zimmerpflanze", [0.55, 0.55, 1.15], "uniform", "plant", "plant", WOOD),
  item("plant-zimmer1-olive", "Olivpflanze Zimmer 1", "Licht/Deko", "Schlanke 110-cm-Pflanze im matten beigefarbenen Topf", [0.42, 0.42, 1.1], "fixed", "plant", "plant", ZIMMER1_PLANT),
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
    renderMode: PHOTO_FIRST_IDS.has(id) ? "parametric" : "auto",
    materials,
    realism: PRODUCT_REALISM[id],
  };
}

export function getProductRealismSpec(id: string) {
  return PRODUCT_REALISM[id];
}
