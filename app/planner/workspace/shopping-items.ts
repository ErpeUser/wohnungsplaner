import type { PlannerBuiltIn, PlannerDocumentV3 } from "../domain/types.ts";
import { getSelectedWcWallboardOption, wallboardDimensionLabel, WC_WALLBOARD_BUILTIN_ID } from "../domain/wc-wallboards.ts";
import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import { getChairModelForCatalogId } from "../chairs/chair-models.ts";
import { getTableModelForCatalogId } from "../tables/table-models.ts";

/** Supplied articles retained; unpriced hall entries are planning placeholders. */
export type ShoppingItem = {
  id: string;
  name: string;
  room: string;
  dimensions: string;
  price: number | null;
  quantity?: number;
  amountLabel?: string;
  url?: string;
  imageUrl?: string;
  searchHint?: string;
  generic?: boolean;
  /** Alternative catalogue choice: shown but excluded from the planned purchase subtotal. */
  alternative?: boolean;
  /** Existing furniture and unconfirmed model references are listed without increasing the purchase budget. */
  existing?: boolean;
  reference?: boolean;
  type: "washer" | "basin" | "bed" | "rug" | "camel-rug" | "hallway-rug" | "sofa" | "hallway" | "table" | "chair" | "vinyl" | "mirror" | "appliance" | "decor" | "wallboard";
  retailer: string;
};

export const SHOPPING_ITEMS: ShoppingItem[] = [
  {"id":"001787045908","name":"Kleiderschrank 225 · MID.YOU FLY","room":"Zimmer 1","dimensions":"225 × 210 × 58 cm (B/H/T) · vorhandene Kaschmir-/Creme-Ausführung; Händlerlink zeigt die Referenz Weiß/Graphit","price":null,"quantity":1,"amountLabel":"Vorhandenes Möbel · Anschaffungspreis nicht hinterlegt","existing":true,"url":"https://www.moebelix.at/p/mid-you-drehtuerenschrank-mit-spiegel-laden-225cm-fly-weiss-graphit-001787045908","type":"hallway","retailer":"Möbelix"},
  {"id":"800000829847","name":"Schminktisch Vicco Sherry · Weiß/Gold","room":"Zimmer 1","dimensions":"120 × 145 × 55 cm (B/H/T) · fünf Schubladen · LED-Spiegel","price":null,"quantity":1,"amountLabel":"Vorhandenes Möbel · Anschaffungspreis nicht hinterlegt","existing":true,"url":"https://www.xxxlutz.at/p/vicco-schminktisch-sherry-weiss-gold-120-cm-mit-led-spiegel-800000829847","type":"table","retailer":"XXXLutz"},
  {"id": "kitchen-fridge-60cm", "name": "Einbaukühlschrank / Kühl-Gefrier-Kombination", "room": "Wohnküche", "dimensions": "Nische 60 × 65 × 204 cm · schwarzes Frontbild · genaue Gerätehöhe vor Bestellung prüfen", "price": null, "quantity": 1, "amountLabel": "1 Stück · Nischenmaß aus dem Wohnungsplan", "searchHint": "Einbaukühlschrank schwarz 60 cm Nische 204 cm energieeffizient", "generic": true, "type": "appliance", "retailer": "frei wählbar"},
  {"id": "kitchen-oven-60cm", "name": "Einbaubackofen 60 cm", "room": "Wohnküche", "dimensions": "Frontmaß ca. 60 × 59 cm · schwarzes Glas · unter dem Induktionsfeld", "price": null, "quantity": 1, "amountLabel": "1 Stück · vorhandene Planung: Gorenje 60 cm", "searchHint": "Gorenje Einbaubackofen 60 cm schwarz Glas Energieklasse", "generic": true, "type": "appliance", "retailer": "frei wählbar"},
  {"id": "kitchen-induction-hob-60cm", "name": "Induktionskochfeld 60 cm", "room": "Wohnküche", "dimensions": "ca. 58 × 52 cm · 4 Kochzonen · schwarze Glasfläche · über dem Backofen", "price": null, "quantity": 1, "amountLabel": "1 Stück · Ausschnitt und Anschluss vor Bestellung prüfen", "searchHint": "Induktionskochfeld 60 cm 4 Zonen schwarz flächenbündig", "generic": true, "type": "appliance", "retailer": "frei wählbar"},
  {"id": "kitchen-hood-60cm", "name": "Schräghaube / Dunstabzug 60 cm", "room": "Wohnküche", "dimensions": "ca. 60 × 34 × 66 cm · schwarzes Glas · Umluft oder Abluft nach Anschluss klären", "price": null, "quantity": 1, "amountLabel": "1 Stück · vorhandene Planung: 60-cm-Schräghaube", "searchHint": "Dunstabzug Schräghaube 60 cm schwarz Glas leise", "generic": true, "type": "appliance", "retailer": "frei wählbar"},
  {"id": "kitchen-sink-60cm", "name": "Edelstahlspüle 60 cm", "room": "Wohnküche", "dimensions": "ca. 52 × 42 × 16 cm · ein Becken · Armaturloch und Unterschrankmaß prüfen", "price": null, "quantity": 1, "amountLabel": "1 Stück · im 115-cm-Eckschrank, links von der Geschirrspülerfront", "searchHint": "Edelstahlspüle 60 cm Einbauspüle ein Becken gebürstet", "generic": true, "type": "appliance", "retailer": "frei wählbar"},
  {"id": "184900692R", "name": "Waschmaschinenschrank Scout", "room": "Bad", "dimensions": "63 × 191 × 24 cm", "price": 129, "url": "https://www.moebelix.at/p/mid-you-waschmaschinenschrank-scout-kaschmir-naturfarben-b-63-cm-00184900692R", "type": "washer", "retailer": "Möbelix"},
  {"id": "184900692G", "name": "Waschbeckenunterschrank Scout", "room": "Bad", "dimensions": "60 × 56 × 34 cm", "price": 79, "url": "https://www.moebelix.at/p/mid-you-waschbeckenunterschrank-scout-kaschmir-naturfarben-b-60-cm-00184900692G", "type": "basin", "retailer": "Möbelix"},
  {"id": "1005012515662602", "name": "A Type LED-Badspiegel 60 cm", "room": "Bad", "dimensions": "Ø 60 cm · rahmenlos · LED-Backlight · dimmbar · Beschlagfrei-Funktion · Touch-Steuerung", "price": null, "quantity": 1, "amountLabel": "1 Stück · Variante A Type 60cm · Preis bei AliExpress prüfen", "url": "https://de.aliexpress.com/item/1005012515662602.html?spm=a2g0o.detail.similar_items.3.6059MHazMHazbh&utparam-url=scene%3Aimage_search%7Cquery_from%3Adetail_bigimg%7Cx_object_id%3A1005012515662602%7C_p_origin_prod%3A&algo_pvid=cf144832-235d-49c3-814e-a8e448c36cff&algo_exp_id=cf144832-235d-49c3-814e-a8e448c36cff&pdp_ext_f=%7B%22order%22%3A%2263%22%2C%22fromPage%22%3A%22search%22%7D&pdp_npi=6%40dis%21EUR%2162.91%2148.93%21%21%21457.20%21355.60%21%400b15831117942592706467732e106e%2112000058604492129%21sea%21AT%210%21X%211%210%21n_tag%3A-29919%3Bd%3A1f788ea8%3Bm03_new_user%3A-29895", "imageUrl": "https://ae-pic-a1.aliexpress-media.com/kf/Scfe7b24134d34aba9a97d3855fcf9cd81.jpg", "type": "mirror", "retailer": "AliExpress"},
  {"id": "601104051124011", "name": "Verstellbare Duschvorhangstange Brilliant Silber", "room": "Bad", "dimensions": "171–210 cm · ausziehbar · Metall · Spannhalterungen", "price": null, "quantity": 1, "amountLabel": "1 Stück · Variante Brilliant Silber · 171–210 cm · im Plan auf 205 cm eingestellt", "imageUrl": "https://img.kwcdn.com/product/open/ea6eba656ec54de9b4573e862fd03670-goods.jpeg", "url": "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601104051124011&sku_id=17612894696580&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Fopen%2Fea6eba656ec54de9b4573e862fd03670-goods.jpeg", "type": "decor", "retailer": "Temu"},
  {"id": "601100062257123", "name": "Duschvorhang Stoff Beige · 180 × 200 cm", "room": "Bad", "dimensions": "180 × 200 cm · robuster waschbarer Stoff · 12 Metallhaken", "price": 21.09, "quantity": 1, "amountLabel": "1 Stück · Beige · 180 × 200 cm · 21,09 €", "imageUrl": "/planner-assets/products/temu-shower-curtain-601100062257123.png", "url": "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601100062257123&sku_id=17594540656721&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2Ffaf94fab-a0c4-456e-91b6-5d4ea67b9522.jpg", "type": "decor", "retailer": "Temu"},
  {"id": "607039887632432", "name": "4 runde Kleider- und Handtuchhaken · Naturholz / Schwarz", "room": "Bad", "dimensions": "4er-Pack · runde Holzplatten in Naturfarbe · matte schwarze Haken · im Plan nebeneinander auf einer Höhe; 20 cm Achsabstand als Planungsmaß, Einzelmaße vom Händler nicht bestätigt", "price": 6.36, "quantity": 1, "amountLabel": "1 Packung = 4 Haken · Natürliche Holzfarbe · SKU 118446205486445", "imageUrl": "/planner-assets/products/temu-oak-black-hooks-607039887632432.svg", "url": "https://www.temu.com/goods.html?_bg_fs=1&goods_id=607039887632432&sku_id=118446205486445&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F6787632d-a0de-4321-aab9-a892ea3e71d7.jpg", "type": "decor", "retailer": "Temu"},
  {"id": "800001233737", "name": "Polsterbett Bliss", "room": "Zimmer 1", "dimensions": "147 × 222 × 108 cm · Liegefläche 120 × 200 cm", "price": 545.29, "url": "https://www.xxxlutz.at/p/homesy-polsterbett-bliss-120-x-200-cm-mit-bettkasten-und-lattenrost-ohne-matratze-beige-800001233737", "type": "bed", "retailer": "XXXLutz"},
  {"id": "601099532250952", "name": "Kunstkaninchen-Plüschteppich Elfenbein", "room": "Zimmer 1", "dimensions": "100 × 180 cm · einfarbig · dichter Kunstkaninchen-Plüsch · Elfenbein", "price": null, "quantity": 1, "amountLabel": "1 Stück · Variante 100 × 180 cm / Elfenbein · SKU 17592283638107", "imageUrl": "https://img.kwcdn.com/product/fancy/24fbeb33-a33d-452e-a545-2a62168e7da4.jpg", "url": "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601099532250952&sku_id=17592283638107&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F24fbeb33-a33d-452e-a545-2a62168e7da4.jpg", "type": "camel-rug", "retailer": "Temu"},
  {"id": "607246280935328", "name": "Vorraumteppich Taupe-Kreisbögen", "room": "Vorraum", "dimensions": "120 × 180 cm · Samt · warmes Taupe/Creme · geometrische Kreisbögen", "price": 39.46, "quantity": 1, "amountLabel": "1 Stück · gewählte SKU 105780749538479", "imageUrl": "https://img.kwcdn.com/product/open/ef8fa5769f22493ea60088b637079477-goods.jpeg", "url": "https://www.temu.com/goods.html?_bg_fs=1&goods_id=607246280935328&sku_id=105780749538479&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Fopen%2Fef8fa5769f22493ea60088b637079477-goods.jpeg", "type": "hallway-rug", "retailer": "Temu"},
  {"id": "1005013624521211", "name": "Dunklere Holz-Doppelablage mit schwarzem Toilettenpapierhalter", "room": "WC", "dimensions": "2 Holzablagen je 16,99 × 13,97 cm · Papierarm 14,98 cm · Verbindungssteg 9,39 cm · Gesamtmaß vor Montage prüfen", "price": 12.21, "quantity": 1, "amountLabel": "1 Stück · dunkleres Naturholz / mattschwarzes Eisen · angegebener Preis 12,21 € (vor Kauf prüfen)", "imageUrl": "/planner-assets/products/aliexpress-wc-paper-holder-1005013624521211.svg", "url": "https://de.aliexpress.com/item/1005013624521211.html", "type": "decor", "retailer": "AliExpress"},
  {"id":"007326000408","name":"Wandboard Simple · 80 cm Eiche Artisan Dekor","room":"WC","dimensions":"80 × 3,8 × 23,5 cm (B/H/T) · foliertes MDF · Eiche Artisan Dekor · bis ca. 10 kg · Befestigungsmaterial enthalten","price":14.99,"quantity":1,"amountLabel":"1 Stück · Möbelix Art. 007326000408 · oberhalb der WC-Spülung · Preis vor Kauf prüfen","url":"https://www.moebelix.at/p/wandboard-simple-b-80-cm-eiche-artisan-dekor-007326000408","type":"wallboard","retailer":"Möbelix"},
  {"id":"1005013137520536-wc","name":"WC-Teppich · Beige mit Fransen","room":"WC","dimensions":"61 × 92 cm · einschließlich Fransen · Waffelgewebe","price":21.84,"quantity":1,"amountLabel":"1 Stück · Beige · Nutzerpreis 21,84 €","imageUrl":"/planner-assets/products/aliexpress-bath-mat-1005013137520536.png","url":"https://de.aliexpress.com/item/1005013137520536.html","type":"rug","retailer":"AliExpress"},
  {"id":"1005013137520536-bad","name":"Badteppich · Beige mit Fransen","room":"Bad","dimensions":"61 × 122 cm · einschließlich Fransen · Waffelgewebe","price":27.2,"quantity":1,"amountLabel":"1 Stück · Beige · Nutzerpreis 27,20 €","imageUrl":"/planner-assets/products/aliexpress-bath-mat-1005013137520536.png","url":"https://de.aliexpress.com/item/1005013137520536.html","type":"rug","retailer":"AliExpress"},
  {"id": "1005012793801128", "name": "WOLTU LED-Nachttisch · Weiß · 2 Schubladen", "room": "Zimmer 1", "dimensions": "ca. 39,6 × 30 × 60,4 cm · weißer Korpus · LED-Fach · USB-Ladefunktion · ausziehbare Ablage", "price": 60.31, "quantity": 1, "amountLabel": "1 Stück · weiße Variante · Produktvariante und Maße vor Bestellung prüfen", "imageUrl": "https://ae-pic-a1.aliexpress-media.com/kf/Sc8ef7db1cae4450aa593c8f968a4cebf8.jpg", "url": "https://de.aliexpress.com/item/1005012793801128.html", "type": "decor", "retailer": "AliExpress"},
  {"id": "601100207687761", "name": "3D-Marmor-Wandfliesen Weißgold · 30 × 60 cm", "room": "Bad", "dimensions": "30 × 60 cm · weißer Marmor mit grau-goldener Maserung · selbstklebende Schaumstoff-Wandpaneele", "price": null, "quantity": 30, "amountLabel": "30 Stück · für Wannenwand und sichtbare Wannenfront", "imageUrl": "https://img.kwcdn.com/product/fancy/54501dd0-0728-435f-9693-eb7b2a6e8239.jpg", "url": "https://www.temu.com/at/20-30-50-stuck-3d-marmor-wandfliesen-tapete-selbstklebende-schaumstoff-wandpaneele-verdicktes-design-heimdekoration-wandaufkleber-abziehen-und-aufkleben-leicht-zu-reinigen-und-zuschneiden--fur-die-renovierung-von-badezimmern-wohnzimmern-kuchen-schlafzimmern-g-601100207687761.html", "type": "vinyl", "retailer": "Temu"},
  {"id": "601099584128261", "name": "3D-Marmor-Wandfliesen · heller Grünbeige-Onyx · 30 × 60 cm", "room": "WC", "dimensions": "30 × 60 cm · grünbeige Onyx-Optik · selbstklebende Vinyl-Schaumstoffpaneele", "price": null, "quantity": 20, "amountLabel": "20 Stück · bisherige Onyx-Alternative für die mittlere WC-Rückwand (nicht im cremefarbenen Fotoentwurf)", "imageUrl": "https://img.kwcdn.com/product/fancy/42b065cf-c201-422c-bbb6-21b975ac58bf.jpg", "url": "https://www.temu.com/at/10-stuck-20-stuck-schaumstoff-fliesen-in-kunstmarmor-optik-selbstklebende-wandaufkleber-vinyl-material-waschbar-direkt-verbindungs-muster-wischdicht-fur-wohnzimmer-kuchenruckwand-badezimmer-haushalt-wasserfeste-wandaufkleber-zu-hause-zuschneidbare-kreative-wasserfeste-tapete--g-601099584128261.html", "type": "vinyl", "retailer": "Temu"},
  {"id": "1005012445521181", "name": "XUEGW gepolsterter Drehstuhl mit Rückenlehne und Rollen", "room": "Zimmer 1", "dimensions": "Planmaß ca. 62 × 53 × 92 cm (geschätzt) · höhenverstellbar · Originalmaße und Farbvariante bei AliExpress prüfen", "price": null, "quantity": 1, "amountLabel": "1 Stück · Artikel 1005012445521181 · Preis, Farbe und Maße nicht verifiziert", "url": "https://de.aliexpress.com/item/1005012445521181.html", "type": "chair", "retailer": "AliExpress"},
  {"id": "607199740937372", "name": "Vintage-Samtteppich Creme/Taupe A8447 · florales Ornament", "room": "Wohnküche", "dimensions": "180 × 250 cm · 850 g/m² laut Temu · kurzer Samtflor · cremefarbene Grundfläche mit blass taupefarbenen Blumenornamenten und mehrstufiger Bordüre", "price": 68.63, "quantity": 1, "amountLabel": "1 Stück · A8447 / 180 × 250 cm · SKU 106769800014188 · Preisangabe 68,63 € · Vorbestellung / Lieferung laut Nutzer 5–13 Werktage; vor Bestellung prüfen", "url": "https://www.temu.com/goods.html?goods_id=607199740937372&sku_id=106769800014188", "imageUrl": "/planner-assets/textures/fabric/temu-vintage-rug-607199740937372.svg", "type": "rug", "retailer": "Temu"},
  {"id": "1005013379584796", "name": "Creme-Relaxsofa · 2-Sitzer mit ausziehbaren Beinauflagen", "room": "Wohnküche", "dimensions": "geschlossen 142 × 90 × 86,5 cm · ausgezogen 142 × 172 cm · Sitzhöhe 42 cm · bis 150 kg je Sitz", "price": 437.49, "quantity": 1, "amountLabel": "1 Sofa · 437,49 € war der verlinkte Angebotspreis; Lieferkosten, Variante und Endpreis beim Kauf prüfen", "url": "https://de.aliexpress.com/item/1005013379584796.html", "imageUrl": "/planner-assets/products/aliexpress-sofa-1005013379584796.webp", "type": "sofa", "retailer": "AliExpress"},
  {"id": "2778003504", "name": "Garderobe Tejo Beige/Kaschmir", "room": "Vorraum", "dimensions": "115 × 231,9 × 37,5 cm · Spiegel 35 × 140 cm", "price": 399.2, "url": "https://www.universal.at/p/AKLBB1960169298?sku=4744664566-0-1960169298&nav-c=112013", "type": "hallway", "retailer": "Universal"},
  {"id": "2858001801", "name": "Ausziehtisch Bozan AZ 110", "room": "Wohnküche", "dimensions": "Ø 110 × 76 cm · ausgezogen 150 × 110 cm", "price": 159.2, "url": "https://www.moebelix.at/p/mid-you-esstisch-ausziehbar-bozan-az-110-150x110cm-eiche-002858001801", "type": "table", "retailer": "Möbelix"},
  {"id": "1005013095870024", "name": "WOLTU Chenille-Drehstuhl · Hauptstuhl (2er-Set)", "room": "Wohnküche", "dimensions": "Chenille, 360° drehbar, Metallbeine · Planungsmaß je Stuhl ca. 58 × 60 × 85 cm (nicht bestätigt)", "price": null, "quantity": 2, "amountLabel": "2 × 2er-Set = 4 Esszimmerstühle · Variante und Endpreis bei AliExpress prüfen", "url": "https://de.aliexpress.com/item/1005013095870024.html", "type": "chair", "retailer": "AliExpress"},
  {"id": "1634004202", "name": "Armlehnstuhl Kaleo Chenille Beige", "room": "Wohnküche", "dimensions": "63 × 87 × 64 cm · Sitzhöhe 50 cm · Armlehne 66 cm", "price": 55.92, "quantity": 4, "alternative": true, "amountLabel": "Backup-Variante · 4 Stück · nicht in der Zwischensumme", "url": "https://www.moebelix.at/p/livetastic-armlehnstuhl-kaleo-chenille-beige-b-63-cm-001634004202", "type": "chair", "retailer": "Möbelix"},
  {"id": "601099691023748", "name": "Selbstklebende Möbelfolie Kaschmir/Creme", "room": "Zimmer 1", "dimensions": "4 Fronten à 41,9 × 30,8 cm · netto 0,52 m² · mit 15 % Reserve 0,60 m² · empfohlen mindestens 45 × 150 cm", "price": null, "quantity": 1, "amountLabel": "1 Rolle / mindestens 0,60 m²", "url": "https://www.temu.com/at/selbstklebende-abziehbare-vinyl-tapete-fur-schranke-kleiderschranke--strukturierte-peel-stick-paneele-wasserdichte-feuchtigkeitsbestandige-abdeckung-diy--mit-einfacher-installation-kein-kleber-werkzeug-erforderlich-renovierung-dachdeckung-g-601099691023748.html", "type": "vinyl", "retailer": "Temu"},
  {"id": "601104781298502", "name": "Selbstklebende Tapete Macaron Milchkaffee", "room": "Zimmer 1", "dimensions": "600 × 40 cm · Milchkaffee · matte, abziehbare Stoffoptik", "price": 13.65, "quantity": 1, "amountLabel": "1 Rolle · 6,0 m × 40 cm · Produktalternative für die bestehende Akzentwand", "imageUrl": "https://img.kwcdn.com/product/fancy/59d4ac36-1c9c-4498-b39f-6fdac2fe25c4.jpg", "url": "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601104781298502&sku_id=17616436648710&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F59d4ac36-1c9c-4498-b39f-6fdac2fe25c4.jpg", "type": "vinyl", "retailer": "Temu"},
  {"id": "601099526356869", "name": "Selbstklebende Tapete in warmbeiger Stoffstruktur", "room": "Zimmer 1", "dimensions": "Rolle 10,0 m × 44,96 cm · warmbraune Stoffstruktur · Bettwand 333 × 254 cm", "price": null, "quantity": 3, "amountLabel": "3 Rollen · je 10,0 m × 44,96 cm · ausreichend für 8 Bahnen plus Reserve an der 333-cm-Wand", "imageUrl": "https://img.kwcdn.com/product/fancy/096428a6-7815-47e1-8e90-66928505c704.jpg", "url": "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601099526356869&sku_id=17600044072934&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F096428a6-7815-47e1-8e90-66928505c704.jpg", "type": "vinyl", "retailer": "Temu"},
  {"id": "z1-deko-bilder", "name": "Botanisch-abstraktes Bilderpaar mit Eiche-Rahmen", "room": "Zimmer 1", "dimensions": "2 Motive à 50 × 70 cm · heller Eiche-Rahmen · ca. 10 cm Abstand", "price": null, "quantity": 2, "searchHint": "botanische Poster beige taupe 50x70 Rahmen Eiche hell", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "z1-deko-vorhang", "name": "Doppellagiger, bodenlanger Vorhang", "room": "Zimmer 1", "dimensions": "Ecru transparent + Taupe verdunkelnd · ca. 245 cm hoch · Gesamtstoffbreite 400–440 cm", "price": null, "quantity": 1, "searchHint": "Vorhang Ecru transparent Taupe verdunkelnd 245 cm deckenhoch", "generic": true, "amountLabel": "2 transparente + 2 taupefarbene Schals", "type": "decor", "retailer": "frei wählbar"},
  {"id": "z1-deko-licht", "name": "Dimmbares indirektes LED-Licht", "room": "Zimmer 1", "dimensions": "2700–3000 K · Niedervolt/USB · Kopfteil ca. 130 cm + Nische ca. 180 cm", "price": null, "quantity": 2, "searchHint": "dimmbar LED warmweiß USB 2700K indirekt Klebestreifen", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "001555006211", "name": "Wandboard Skate · 120 cm Wotan Eiche Dekor", "room": "Zimmer 1", "dimensions": "120 × 1,8 × 20 cm (B/H/T) · melaminharzbeschichteter Holzwerkstoff · Wotan Eiche Dekor · max. 15 kg", "price": 9.99, "quantity": 1, "amountLabel": "1 Stück · über dem Schminkspiegel · Händlerpreis als Richtwert, Versand extra · Befestigungsmaterial/Träger separat erforderlich", "url": "https://www.moebelix.at/p/wandboard-skate-b-120cm-wotan-eiche-dekor-001555006211", "type": "decor", "retailer": "Möbelix"},
  {"id": "007326000308", "name": "Wandboard Simple · Eiche Artisan Dekor · 2 kleine Eckregale", "room": "Zimmer 1", "dimensions": "je 23,5 × 3,8 × 23,5 cm (B/H/T) · foliertes MDF · Eiche Artisan Dekor · max. 10 kg pro Board", "price": 6.99, "quantity": 2, "amountLabel": "2 Stück · seitliche Schminkecke oben/unten · Händlerpreis als Richtwert, Versand extra · Befestigungsmaterial enthalten", "url": "https://www.moebelix.at/p/wandboard-simple-007326000308", "type": "decor", "retailer": "Möbelix"},
  {"id": "z1-deko-nische", "name": "Sehr schmale beleuchtete Eiche-Nische", "room": "Zimmer 1", "dimensions": "max. 22 cm breit · 13 cm tief · ca. 188 cm hoch · 3 Ablagen", "price": null, "quantity": 1, "searchHint": "schmales Wandregal Eiche 20 cm beleuchtet flache Ablagen", "generic": true, "type": "decor", "retailer": "frei wählbar / Maßanfertigung"},
  {"id": "z1-deko-wandleuchten", "name": "Kompakte Wandleuchten in Messing/Taupe", "room": "Zimmer 1", "dimensions": "max. 12 cm tief · Schirm ca. Ø 16–20 cm · warmweiß 2700 K", "price": null, "quantity": 2, "searchHint": "kleine Wandleuchte Schlafzimmer Messing Taupe warmweiß flach", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "z1-deko-schrankboxen", "name": "Niedrige Flechtboxen für den Schrank", "room": "Zimmer 1", "dimensions": "je ca. 42–45 × 35–40 × 22–25 cm · Ecru/Taupe · mit Griff", "price": null, "quantity": 3, "searchHint": "Aufbewahrungsbox geflochten beige 45x38x24 Kleiderschrank oben", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "z1-deko-pflanze", "name": "Eine schlanke Zimmerpflanze mit Beigetopf", "room": "Zimmer 1", "dimensions": "90–120 cm hoch · Topf Ø 24–28 cm · gesamte Stellfläche maximal 42 cm", "price": null, "quantity": 1, "searchHint": "schlanke Zimmerpflanze 110 cm Olivenbaum Zamioculcas Topf beige matt", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "z1-deko-textilien", "name": "Ruhiges Betttextilien-Set in Creme/Taupe", "room": "Zimmer 1", "dimensions": "2 helle Kissen · Lendenkissen ca. 35 × 50 cm · strukturierte Decke ca. 130 × 170 cm", "price": null, "quantity": 1, "searchHint": "Bettdecke Tagesdecke Creme Taupe strukturiert Lendenkissen", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "z1-deko-kleinteile", "name": "Nachttisch- und Schreibtischdeko", "room": "Zimmer 1", "dimensions": "Kugelleuchte Ø 15–18 cm · Tablett 20–24 × 12–16 cm · Holz-Organizer 25–35 cm", "price": null, "quantity": 1, "searchHint": "kleine Kugellampe warmweiß Tablett beige Holz Schreibtisch Organizer", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "z1-deko-pendelleuchte", "name": "Leichte Pendelleuchte in Flecht-/Rattanoptik", "room": "Zimmer 1", "dimensions": "Schirm Ø ca. 35–40 cm · warmweißes Leuchtmittel · kurze Abhängung", "price": null, "quantity": 1, "searchHint": "Pendelleuchte Rattan hell 40 cm Schlafzimmer geprüft", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "hall-decor-tejo-print", "name": "Gerahmtes Naturmotiv neben der Garderobe", "room": "Vorraum", "dimensions": "Planungsmaß 36 × 50 cm · heller Holzrahmen", "price": null, "quantity": 1, "searchHint": "Poster Pampas beige Holzrahmen 36x50", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "hall-decor-three-plates", "name": "Drei dekorative Wandteller", "room": "Vorraum", "dimensions": "Planungsmaße Ø 18 / 14 / 11 cm · Creme, Sand und Naturbraun", "price": null, "quantity": 1, "searchHint": "Wandteller Set Naturfaser beige braun 18 14 11 cm", "generic": true, "amountLabel": "1 Set = 3 Wandteller", "type": "decor", "retailer": "frei wählbar"},
  {"id": "hall-decor-between-doors-print", "name": "Gerahmtes Bogenmotiv zwischen den Türen", "room": "Vorraum", "dimensions": "Planungsmaß 32 × 45 cm · passt in das ca. 38-cm-Wandfeld", "price": null, "quantity": 1, "searchHint": "Poster Bogen beige Holzrahmen 32x45", "generic": true, "type": "decor", "retailer": "frei wählbar"},
  {"id": "hall-decor-planter", "name": "Rundes Wandpflanzgefäß", "room": "Vorraum", "dimensions": "Ø 25 cm laut Nutzerangabe · Pflanzen und Steine als Deko-Platzhalter", "price": null, "quantity": 1, "searchHint": "Wandpflanzgefaess rund 25 cm beige", "generic": true, "type": "decor", "retailer": "frei wählbar"}
];

/** Only selected products enter the planned subtotal; backup chairs remain browsable. */
export const shoppingSubtotal = shoppingSubtotalForItems(SHOPPING_ITEMS);

/** One selected WC board; non-selected alternatives are excluded from the list and subtotal. */
type ShoppingDocument = Pick<PlannerDocumentV3, "builtIns"> & Partial<Pick<PlannerDocumentV3, "placements" | "rooms">>;

export function shoppingItemsForDocument(document: ShoppingDocument): ShoppingItem[] {
  const option = getSelectedWcWallboardOption(document);
  const base = option.id === "simple-80"
    ? SHOPPING_ITEMS.map((item) => item.id === option.articleId ? { ...item, price: option.price, url: option.sourceUrl, retailer: option.retailer } : item)
    : SHOPPING_ITEMS.map((item) => item.id === "007326000408" ? {
    ...item,
    id: option.articleId,
    name: option.name,
    retailer: option.retailer,
    url: option.sourceUrl,
    price: option.price,
    type: "wallboard" as const,
    quantity: 1,
    dimensions: `${wallboardDimensionLabel(option)} (B/H/T) · ${option.finish} · Belastbarkeit bis ${option.loadKg} kg`,
    amountLabel: `1 Stück · ${option.retailer} Art. ${option.articleId} · oberhalb der WC-Spülung · Preis vor Kauf prüfen`,
  } : item);
  return [...base, ...additionalModelReferences(document, base)];
}

export function shoppingSubtotalForItems(items: readonly ShoppingItem[]): number {
  return Math.round(items.reduce(
    (sum, item) => sum + (item.alternative || item.existing || item.reference ? 0 : (item.price ?? 0) * (item.quantity ?? 1)), 0,
  ) * 100) / 100;
}

export function shoppingSubtotalForDocument(document: ShoppingDocument): number {
  return shoppingSubtotalForItems(shoppingItemsForDocument(document));
}

/** Use exact room labels, including a shared article explicitly assigned to multiple rooms. */
export function shoppingItemsForRoom(items: readonly ShoppingItem[], roomName: string): ShoppingItem[] {
  return items.filter((item) => item.room === roomName || item.room.split(/\s+\/\s+/).includes(roomName));
}

export function formatShoppingPrice(amount: number, minimumFractionDigits = 2): string {
  return amount.toLocaleString("de-AT", { style: "currency", currency: "EUR", minimumFractionDigits, maximumFractionDigits: 2 });
}

/** Both the drawer and the selected object's properties use the same line total. */
export function shoppingPriceLabel(item: ShoppingItem): string {
  if (item.existing && item.price === null) return "Bestand · Preis nicht erfasst";
  if (item.reference && item.price === null) return "Preis offen";
  if (item.generic) return "Budget offen";
  if (item.price === null) return "Preis bei " + item.retailer + " prüfen";
  return formatShoppingPrice(item.price * (item.quantity ?? 1), Number.isInteger(item.price) ? 0 : 2);
}

/** Link stable model identities, not display labels or shared merchant URLs.
 * Fixed composite decorations may correspond to several purchasing rows.
 * Prices and URLs deliberately live only in the purchase data above.
 */
const builtInShoppingIds: Readonly<Record<string, readonly string[]>> = {
  "builtin-kitchen-fridge": ["kitchen-fridge-60cm"],
  "builtin-kitchen-oven": ["kitchen-oven-60cm"],
  "builtin-kitchen-hob": ["kitchen-induction-hob-60cm"],
  "builtin-kitchen-hood": ["kitchen-hood-60cm"],
  "builtin-kitchen-sink": ["kitchen-sink-60cm"],
  "builtin-bath-washer-cabinet-scout": ["184900692R"],
  "builtin-bath-basin-cabinet-scout": ["184900692G"],
  "builtin-bath-round-mirror": ["1005012515662602"],
  "builtin-bath-shower-rod": ["601104051124011"],
  "builtin-bath-shower-curtain": ["601100062257123"],
  "builtin-bath-towel-hook-rail": ["607039887632432"],
  "builtin-wc-paper-holder": ["1005013624521211"],
  "builtin-wc-mat": ["1005013137520536-wc"],
  "builtin-bath-mat": ["1005013137520536-bad"],
  "builtin-z1-bed-accent-wall": ["601099526356869"],
  "builtin-z1-entry-wallpaper-return": ["601099526356869"],
  "builtin-z1-entry-wallpaper-door-strip": ["601099526356869"],
  "builtin-z1-wall-art-pair": ["z1-deko-bilder"],
  "builtin-z1-headboard-led": ["z1-deko-licht"],
  "builtin-z1-headboard-sconces": ["z1-deko-wandleuchten"],
  "builtin-z1-layered-curtain": ["z1-deko-vorhang"],
  "builtin-z1-vanity-shelf-main": ["001555006211"],
  "builtin-z1-vanity-shelf-side-upper": ["007326000308"],
  "builtin-z1-vanity-shelf-side-lower": ["007326000308"],
  "builtin-z1-entry-niche": ["z1-deko-nische"],
  "builtin-z1-wardrobe-top-decor": ["z1-deko-schrankboxen"],
  "builtin-z1-nightstand-decor": ["z1-deko-kleinteile"],
  "builtin-hall-tejo-art-plates": ["hall-decor-tejo-print", "hall-decor-three-plates"],
  "builtin-hall-between-door-decor": ["hall-decor-between-doors-print", "hall-decor-planter"],
};

const catalogShoppingIds: Readonly<Record<string, readonly string[]>> = {
  "bed-bliss-120": ["800001233737"],
  "wardrobe-225": ["001787045908"],
  "vanity-vicco-sherry-120": ["800000829847"],
  "rug-temu-rabbit-ivory-100x180": ["601099532250952"],
  "rug-temu-easy-line-120x180": ["607246280935328"],
  "nightstand-aliexpress-woltu-1005012793801128": ["1005012793801128"],
  "chair-aliexpress-xuegw-1005012445521181": ["1005012445521181"],
  "rug-living-concept-240x240": ["607199740937372"],
  "sofa-aliexpress-142": ["1005013379584796"],
  "sofa-aliexpress-142-open": ["1005013379584796"],
  "hallway-tejo-115": ["2778003504"],
  // The user selected the Tejo shopping article while retaining the brown photo-based model.
  "hallway-brown-mirror-bench-115": ["2778003504"],
  "dining-table-bozan-110": ["2858001801"],
  "chair-aliexpress-woltu-1005013095870024": ["1005013095870024"],
  "chair-kaleo-chenille-beige": ["1634004202"],
  "plant-zimmer1-olive": ["z1-deko-pflanze"],
};

const modelReferenceId = (roomId: string, catalogId: string) => "model:" + roomId + ":" + catalogId;

function retailerForUrl(url: string): string {
  const host = new URL(url).hostname.toLowerCase();
  if (host.endsWith("aliexpress.com")) return "AliExpress";
  if (host.endsWith("temu.com")) return "Temu";
  if (host.endsWith("moebelix.at")) return "Möbelix";
  if (host.endsWith("xxxlutz.at")) return "XXXLutz";
  if (host.endsWith("kaufland.de") || host.endsWith("kaufland.at")) return "Kaufland";
  return host.replace(/^www\./, "");
}

/** Explicitly linked placements not yet in the planned purchase list appear once per
 * room and model. No price or purchase decision is inferred from a reference URL.
 * The user's planned products and backups retain their existing budget semantics.
 */
function additionalModelReferences(document: ShoppingDocument, base: readonly ShoppingItem[]): ShoppingItem[] {
  const references = new Map<string, ShoppingItem>();
  for (const placement of document.placements ?? []) {
    const room = document.rooms?.find((candidate) => candidate.id === placement.roomId);
    if (!room) continue;
    const mapped = base.filter((item) => (catalogShoppingIds[placement.catalogId] ?? []).includes(item.id));
    if (shoppingItemsForRoom(mapped, room.name).length) continue;
    const catalog = getFurnitureCatalogItem(placement.catalogId);
    const chair = getChairModelForCatalogId(placement.catalogId);
    const table = getTableModelForCatalogId(placement.catalogId);
    const sourceUrl = mapped.find((item) => item.url)?.url ?? catalog?.sourceUrl ?? chair?.sourceUrl ?? table?.sourceUrl;
    if (!sourceUrl || !/^https:\/\//i.test(sourceUrl)) continue;
    const id = modelReferenceId(room.id, placement.catalogId);
    const existing = references.get(id);
    if (existing) { existing.quantity = (existing.quantity ?? 1) + 1; continue; }
    const type: ShoppingItem["type"] = chair ? "chair" : table ? "table"
      : catalog?.symbol === "storage" ? "hallway"
      : catalog?.symbol === "desk" ? "table"
      : catalog?.symbol === "chair" || catalog?.symbol === "bed" || catalog?.symbol === "sofa" || catalog?.symbol === "rug" || catalog?.symbol === "table" ? catalog.symbol : "decor";
    const size = catalog?.defaultSize ?? placement.size;
    const cm = (value: number) => Number((value * 100).toFixed(1)).toLocaleString("de-AT");
    references.set(id, {
      id, room: room.name, name: chair?.name ?? table?.name ?? catalog?.name ?? mapped[0]?.name ?? placement.catalogId,
      dimensions: [size.width, size.depth, size.height].map(cm).join(" × ") + " cm (B/T/H, Modellmaß)",
      price: null, quantity: 1, url: sourceUrl, retailer: mapped.find((item) => item.url)?.retailer ?? retailerForUrl(sourceUrl),
      reference: true, type,
      imageUrl: chair?.imageUrls[0] ?? table?.imageUrls[0],
    });
  }
  return [...references.values()];
}

export function shoppingItemsForSelection(
  document: ShoppingDocument,
  selection: Pick<PlannerBuiltIn, "id" | "catalogId" | "roomId">,
): ShoppingItem[] {
  const ids = selection.id === WC_WALLBOARD_BUILTIN_ID
    ? [getSelectedWcWallboardOption(document).articleId]
    : builtInShoppingIds[selection.id] ?? (selection.catalogId ? catalogShoppingIds[selection.catalogId] : undefined) ?? [];
  const all = shoppingItemsForDocument(document);
  const room = document.rooms?.find((candidate) => candidate.id === selection.roomId);
  const mapped = all.filter((item) => ids.includes(item.id));
  const references = selection.catalogId ? all.filter((item) => item.id === modelReferenceId(selection.roomId, selection.catalogId!)) : [];
  return room ? [...shoppingItemsForRoom(mapped, room.name), ...references] : [...mapped, ...references];
}
