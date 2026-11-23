import type { FurnitureCatalogItem, FurnitureMaterial } from "./catalog-types.ts";

type DekoSeed = {
  id: string;
  name: string;
  description: string;
  defaultSize: [number, number, number];
  sourceUrl: string;
  sourceLabel: string;
  symbol: FurnitureCatalogItem["symbol"];
  fallback3d: string;
  material: FurnitureMaterial;
};

const OAK: FurnitureMaterial = { id: "oak-natural", label: "Eiche natur", color: "#b98a5e" };
const METAL: FurnitureMaterial = { id: "metal-satin", label: "Metall satiniert", color: "#b6bbb5" };
const BLACK: FurnitureMaterial = { id: "metal-dark", label: "Mattschwarz", color: "#2f3636" };
const GREEN: FurnitureMaterial = { id: "leaf-green", label: "Blattgrün", color: "#687a55" };
const CREAM: FurnitureMaterial = { id: "white-matte", label: "Warmweiß", color: "#e8e5de" };
const TAUPE: FurnitureMaterial = { id: "fabric-taupe", label: "Taupe", color: "#b8a693" };

const DEKO_ELEVATIONS: Record<string, number> = {
  "deko-aliexpress-01": 1.25,
  "deko-aliexpress-02": 1.2,
  "deko-aliexpress-03": 1.15,
  "deko-aliexpress-04": 1.15,
  "deko-aliexpress-05": 0,
  "deko-aliexpress-06": 1.25,
  "deko-aliexpress-07": 1.5,
  "deko-aliexpress-08": 1.15,
  "deko-aliexpress-09": 1.25,
  "deko-aliexpress-10": 0.8,
  "deko-aliexpress-11": 1.45,
  "deko-aliexpress-12": 1.8,
  "deko-aliexpress-13": 1.55,
  "deko-aliexpress-14": 1.25,
  "deko-aliexpress-15": 1.7,
  "deko-aliexpress-16": 1.15,
  "deko-aliexpress-17": 1.2,
  "deko-aliexpress-18": 1.1,
  "deko-aliexpress-19": 1.25,
  "deko-aliexpress-20": 0.95,
  "deko-aliexpress-21": 1.55,
  "deko-aliexpress-22": 1.2,
  "deko-temu-01": 1.2,
  "deko-temu-02": 1.1,
  "deko-temu-03": 1.25,
  "deko-temu-04": 1.2,
  "deko-temu-05": 1.35,
  "deko-temu-06": 1.3,
  "deko-temu-07": 1.3,
  "deko-temu-08": 1.1,
  "deko-temu-09": 1.15,
  "deko-temu-10": 1.65,
  "deko-temu-11": 1.3,
  "deko-temu-12": 0.75,
  "deko-temu-13": 0.42,
  "deko-temu-14": 1.35,
  "deko-temu-15": 1.55,
  "deko-temu-16": 1.15,
  "deko-temu-17": 1.15,
  "deko-temu-18": 1.15,
  "deko-temu-19": 0.42,
  "deko-temu-20": 1.55,
};

/**
 * Product references collected from the user's Desktop/Deko folder.
 *
 * The folders contain catalogue images, not production-ready 3D models. The
 * dimensions below are deliberately labelled as estimates in the generated
 * catalogue records; they are useful for a first proxy only and must not be
 * read as verified product measurements.
 */
const DEKO_SEEDS: readonly DekoSeed[] = [
  { id: "deko-aliexpress-01", name: "Motion-Sensor LED-Nachtlicht", description: "Wiederaufladbares LED-Licht für Schrank, Garderobe oder Treppe", defaultSize: [0.32, 0.04, 0.06], sourceUrl: "https://de.aliexpress.com/item/1005005588986583.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 1", symbol: "light", fallback3d: "lamp", material: CREAM },
  { id: "deko-aliexpress-02", name: "Dreieckiges Wandregal", description: "Schwebendes 1/2/3-Etagen-Regal für Ecke oder Wand", defaultSize: [0.55, 0.18, 0.55], sourceUrl: "https://de.aliexpress.com/item/1005006126645121.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 2", symbol: "storage", fallback3d: "shelf", material: OAK },
  { id: "deko-aliexpress-03", name: "3D-Ziegel-/Mosaik-Wandaufkleber", description: "Vinyl-Wandfliesen mit Ziegel- und Marmorstruktur", defaultSize: [1.2, 0.015, 0.6], sourceUrl: "https://de.aliexpress.com/item/1005010230216182.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 3", symbol: "rug", fallback3d: "decor", material: CREAM },
  { id: "deko-aliexpress-04", name: "Weiches sechseckiges Kopfteil-Paneel", description: "Weicher Wandaufkleber als Stoßschutz und Kopfteil-Dekor", defaultSize: [0.28, 0.05, 0.25], sourceUrl: "https://de.aliexpress.com/item/1005009648089268.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 4", symbol: "rug", fallback3d: "decor", material: TAUPE },
  { id: "deko-aliexpress-05", name: "Eiffelturm-Figur Bronze", description: "Kleine Metallfigur als Tisch- oder Regalobjekt", defaultSize: [0.12, 0.12, 0.32], sourceUrl: "https://de.aliexpress.com/item/32700107534.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 5", symbol: "storage", fallback3d: "decor", material: METAL },
  { id: "deko-aliexpress-06", name: "Hexagon-Spiegelaufkleber Roségold", description: "Sechseckige 3D-Spiegelflächen für eine modulare Wandgruppe", defaultSize: [0.48, 0.01, 0.42], sourceUrl: "https://de.aliexpress.com/item/1005006113050325.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 6", symbol: "storage", fallback3d: "decor", material: METAL },
  { id: "deko-aliexpress-07", name: "Blätter-Lichterkette", description: "Künstliche grüne Rebe mit warmen Lichtpunkten", defaultSize: [1.5, 0.08, 0.35], sourceUrl: "https://de.aliexpress.com/item/1005006872754298.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 7", symbol: "light", fallback3d: "plant", material: GREEN },
  { id: "deko-aliexpress-08", name: "Grüne Ziegel-Wandaufkleber", description: "Selbstklebende grüne Fliesenoptik für Küche oder Wohnzimmer", defaultSize: [1.2, 0.015, 0.6], sourceUrl: "https://de.aliexpress.com/item/1005006863493374.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 8", symbol: "rug", fallback3d: "decor", material: GREEN },
  { id: "deko-aliexpress-09", name: "Geometrische Boho-Blattbilder", description: "Abstrakte Blatt- und Regenbogenmotive als Leinwanddrucke", defaultSize: [0.5, 0.035, 0.7], sourceUrl: "https://de.aliexpress.com/item/1005006173293772.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 9", symbol: "storage", fallback3d: "decor", material: TAUPE },
  { id: "deko-aliexpress-10", name: "Fenster-Sichtschutzfolie", description: "Tagsüber blickdichte, selbstklebende Fensterfolie", defaultSize: [1, 0.002, 1], sourceUrl: "https://de.aliexpress.com/item/1005013266078069.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 10", symbol: "rug", fallback3d: "decor", material: CREAM },
  { id: "deko-aliexpress-11", name: "Spiral-LED-Wandleuchte", description: "Gebogene LED-Leuchte für Flur, Wohnzimmer oder Schlafzimmer", defaultSize: [0.18, 0.12, 0.68], sourceUrl: "https://de.aliexpress.com/item/1005008625708863.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 11", symbol: "light", fallback3d: "lamp", material: METAL },
  { id: "deko-aliexpress-12", name: "COB-LED-Band für Lamellenwand", description: "Dimmbares schwarzes LED-Band für Holzlamellen und TV-Wand", defaultSize: [2, 0.015, 0.012], sourceUrl: "https://de.aliexpress.com/item/1005010698999267.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 12", symbol: "light", fallback3d: "lamp", material: BLACK },
  { id: "deko-aliexpress-13", name: "Toilettenschild Schwarz/Gold", description: "Kompaktes Acrylschild für WC oder Gästebad", defaultSize: [0.18, 0.02, 0.11], sourceUrl: "https://de.aliexpress.com/item/1005006270704939.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 13", symbol: "storage", fallback3d: "decor", material: BLACK },
  { id: "deko-aliexpress-14", name: "Wabi-Sabi-Bergbilder", description: "Japanische Retro-Berge als minimalistisches Poster-Set", defaultSize: [0.5, 0.035, 0.7], sourceUrl: "https://de.aliexpress.com/item/1005011654010244.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 14", symbol: "storage", fallback3d: "decor", material: TAUPE },
  { id: "deko-aliexpress-15", name: "RGB/IC-Neon-Lichtstreifen", description: "USB-Lichtstreifen mit Fernbedienung und Farbwechsel", defaultSize: [3, 0.012, 0.012], sourceUrl: "https://de.aliexpress.com/item/1005007590713821.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 15", symbol: "light", fallback3d: "lamp", material: METAL },
  { id: "deko-aliexpress-16", name: "Heißluftballon-Wandaufkleber", description: "Verspieltes Motiv für Kinderzimmer und kleine Nischen", defaultSize: [0.8, 0.01, 0.65], sourceUrl: "https://de.aliexpress.com/item/1005006896748103.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 16", symbol: "storage", fallback3d: "decor", material: CREAM },
  { id: "deko-aliexpress-17", name: "Baum-des-Lebens-Wandteppich", description: "Bunter Wandteppich mit Baum-, Sonnen- und Sternmotiv", defaultSize: [0.75, 0.025, 0.58], sourceUrl: "https://de.aliexpress.com/item/1005007291148389.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 17", symbol: "rug", fallback3d: "decor", material: TAUPE },
  { id: "deko-aliexpress-18", name: "Aquarell-Pflanzen-Wandaufkleber", description: "Realistische Rankenblätter als 2D-Wanddekoration", defaultSize: [0.8, 0.01, 0.8], sourceUrl: "https://de.aliexpress.com/item/1005009696065050.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 18", symbol: "plant", fallback3d: "plant", material: GREEN },
  { id: "deko-aliexpress-19", name: "Magic-School-Poster", description: "Poster für Party-, Bar- oder Themenraum-Dekoration", defaultSize: [0.5, 0.03, 0.7], sourceUrl: "https://de.aliexpress.com/item/1005012221830170.html", sourceLabel: "AliExpress 19", symbol: "storage", fallback3d: "decor", material: TAUPE },
  { id: "deko-aliexpress-20", name: "PVC-Holzmaserungsfolie", description: "Selbstklebende Vinylfolie für Möbel, Schränke und Paneele", defaultSize: [1.2, 0.002, 0.6], sourceUrl: "https://de.aliexpress.com/item/1005012173011488.html?gatewayAdapt=glo2deu", sourceLabel: "AliExpress 20", symbol: "rug", fallback3d: "decor", material: OAK },
  { id: "deko-aliexpress-21", name: "Hängendes Holzregal mit Pflanztablett", description: "Wandregal mit Hanfseilen für Pflanze und kleine Objekte", defaultSize: [0.55, 0.22, 0.28], sourceUrl: "https://de.aliexpress.com/item/1005013108173493.html", sourceLabel: "AliExpress 21", symbol: "storage", fallback3d: "shelf", material: OAK },
  { id: "deko-aliexpress-22", name: "Lotus-Holzregal für Kerzen", description: "Hohles Eck- und Wandregal für Aromatherapie oder Kerzen", defaultSize: [0.42, 0.18, 0.42], sourceUrl: "https://de.aliexpress.com/item/1005007345174714.html", sourceLabel: "AliExpress 22", symbol: "storage", fallback3d: "shelf", material: OAK },
  { id: "deko-temu-01", name: "Boho-Wanddeko-Set · 6-teilig", description: "Hängende Wandkunst im Bohemian-Stil", defaultSize: [1.2, 0.05, 0.7], sourceUrl: "https://www.temu.com/at/6er-set--wanddeko-hangende-dekoration-wandkunst-handwerk-im-bohemian-stil--fur-schlafzimmer-wohnzimmer-arbeitszimmer-g-606343096317516.html", sourceLabel: "Temu 1", symbol: "storage", fallback3d: "decor", material: TAUPE },
  { id: "deko-temu-02", name: "Pusteblumen-/Schmetterling-Wandsticker", description: "Abziehbare PVC-Wandaufkleber für Wohn- und Schlafzimmer", defaultSize: [0.9, 0.01, 0.7], sourceUrl: "https://www.temu.com/at/pusteblumen-schmetterling-wandaufkleber-dekorativ-fur-wohnzimmer-esszimmer-badezimmer-schlafzimmer-abziehbarer-pvc-wandaufkleber-g-605552939756211.html", sourceLabel: "Temu 2", symbol: "plant", fallback3d: "decor", material: GREEN },
  { id: "deko-temu-03", name: "Acryl-Tropfen-Wandaufkleber · 12-teilig", description: "Reflektierende, ablösbare Tropfenformen für die Wand", defaultSize: [0.7, 0.01, 0.45], sourceUrl: "https://www.temu.com/at/12-stuck-acryl-wandaufkleber-in-tropfenform-dies-sind-2d-aufkleber-reflektierende-dekorationen-ablosbare-wanddekorationen--fur-wohnzimmer-schlafzimmer-badezimmer-und-wanddekorationen-fur-zuhause-g-605674423575207.html", sourceLabel: "Temu 3", symbol: "storage", fallback3d: "decor", material: METAL },
  { id: "deko-temu-04", name: "Schwarze Wandregale aus Holz · 2er-Pack", description: "Leicht gebrannte, gerahmte Schweberegale", defaultSize: [0.6, 0.2, 0.22], sourceUrl: "https://www.temu.com/at/2-neue-schwarz-gerahmte-leicht-gebrannte-holz-wandregale-schwebendes-holz-wandregal-im-minimalistischen-stil--fur-halloween-vintage-holz-wandregal--schwebendes---fur-schlafzimmer-wohnzimmer-badezimmer-platzsparendes-aufbewahrungsregal-fur-dekorationen-g-606517965213072.html", sourceLabel: "Temu 4", symbol: "storage", fallback3d: "shelf", material: BLACK },
  { id: "deko-temu-05", name: "Touch-Hexagon-LED-Nachtlicht", description: "Dekoratives, berührungsgesteuertes Hexagon-Licht", defaultSize: [0.24, 0.06, 0.21], sourceUrl: "https://www.temu.com/at/-touch-sechseckige--led-nachtlicht-kreative-dekorative--fur-zuhause-und-aussendekoration-ohne-batterie-g-601099559546012.html", sourceLabel: "Temu 5", symbol: "light", fallback3d: "lamp", material: CREAM },
  { id: "deko-temu-06", name: "Gestreifte Filz-Pinnwand", description: "Weiche Filztafeln als Pinn- und Fotowand", defaultSize: [0.65, 0.04, 0.45], sourceUrl: "https://www.temu.com/at/2er-pack-gestreiftes-filz-dekoratives--pinnwand-kreative-wanddekoration-filztafel-fotowand-hintergrund-nachrichtenbrett-heimzimmer-dekor-aufbewahrung--geometrisches-design-stilvolles-aussehen-filztafel-wandaufkleber-filz-pinnwand-klassenzimmer-arbeitsanzeige-weiche-tafel-g-601104284242715.html", sourceLabel: "Temu 6", symbol: "storage", fallback3d: "decor", material: TAUPE },
  { id: "deko-temu-07", name: "Lotusblatt-Wandskulptur Metall", description: "Große 3D-Lotusblatt-Wanddekoration", defaultSize: [1.35, 0.06, 0.64], sourceUrl: "https://www.temu.com/at/metall-wanddeko-135x64cm-3d-lotusblatt-design-einfache-installation-moderner-stil-wanddekoration-fur-wohnzimmer-schlafzimmer--g-607111828317242.html", sourceLabel: "Temu 7", symbol: "storage", fallback3d: "decor", material: METAL },
  { id: "deko-temu-08", name: "Boho-Wandkörbe · 5-teilig", description: "Gewebte Körbe für Wandmontage oder Tischgebrauch", defaultSize: [0.8, 0.18, 0.6], sourceUrl: "https://www.temu.com/at/5-stk-boho-gewebte-aufbewahrungskorbe-handgefertigt--fur-wandmontage-oder-tischgebrauch-bohmische-landhausstil-hangekorbe-mit-offenem-geflecht-mehrzweck-papierkorb-fur-wohnzimmer-schlafzimmer-deko-textur-regalkorbe-g-605773593718180.html", sourceLabel: "Temu 8", symbol: "storage", fallback3d: "shelf", material: TAUPE },
  { id: "deko-temu-09", name: "Weiße Marmor-Wandaufkleber", description: "Selbstklebende, glänzende Fliesenoptik für Bad und Wohnraum", defaultSize: [0.6, 0.015, 0.3], sourceUrl: "https://www.temu.com/at/20-40-stuck-weisse-marmor-wandaufkleber-selbstklebende-abzieh-aufklebe--wiederverwendbare-glanzende-moderne-dekorative-fliesen-fur--badezimmer-wohnzimmer-studentenwohnheim-23-6x11-8-inch-60x30cm-wandaufkleber-g-601103413878236.html", sourceLabel: "Temu 9", symbol: "rug", fallback3d: "decor", material: CREAM },
  { id: "deko-temu-10", name: "Personalisiertes LED-Neonschild", description: "Dimmbares Namensschild mit Acryl-Rückwand", defaultSize: [0.6, 0.04, 0.22], sourceUrl: "https://www.temu.com/at/namen-neon-schild-personalisiertes-led-neon-licht-schild-mit-acryl-ruckwand-dimmbar-individuelles-text-neon-schild-fur-hochzeitshintergrund-geburtstagsfeier-schlafzimmer-wanddeko-individuelles-geschenk-fur-sie-g-607513139332916.html", sourceLabel: "Temu 10", symbol: "light", fallback3d: "lamp", material: CREAM },
  { id: "deko-temu-11", name: "Gerillte Filz-Bogenplatte", description: "Archförmige Filztafeln und Buchstabensticker", defaultSize: [0.6, 0.04, 0.8], sourceUrl: "https://www.temu.com/at/dickere-multi-rillen-bodenvliese-in-arch-stil-fur-grosse-grossen-60-cm-80-cm-inklusive-exquisiten-anstecknadeln-und-hochwertigem-klebeband-und-home-buchstaben-aufklebern-zur-dekoration-von-pinnwanden-g-601102575966483.html", sourceLabel: "Temu 11", symbol: "storage", fallback3d: "decor", material: TAUPE },
  { id: "deko-temu-12", name: "Weidenranken-Wandlampe · 160 cm", description: "Biegsame Zweiglampe mit warmen Lichtpunkten", defaultSize: [0.4, 0.12, 1.6], sourceUrl: "https://www.temu.com/at/160-cm-62-99-zoll-ultra--neue-verbesserte-weihnachtsdeko-weidenranken-wandlampe-8--von-blinkenden-valentinstagsdekoration-strombetriebene-weidenzweiglampe-thanksgiving-weidenranken-lichterkette-mit-flexiblem-biegbarem-zweigdesign-g-607487235304318.html", sourceLabel: "Temu 12", symbol: "light", fallback3d: "lamp", material: OAK },
  { id: "deko-temu-13", name: "Stretch-Sofabezug", description: "Elastischer, rutschfester Schutzbezug für das Sofa", defaultSize: [2.1, 0.95, 0.85], sourceUrl: "https://www.temu.com/at/-multifunktionaler-stretch-sofabezug-in-unifarben-elastischer-rutschfester-sofabezug-mobelschutz-fur-schlafzimmer--wohnzimmer--mit--passendem-kissenbezug-g-601099523535844.html", sourceLabel: "Temu 13", symbol: "sofa", fallback3d: "sofa", material: TAUPE },
  { id: "deko-temu-14", name: "Blatt-Wandskulptur Metall", description: "Detaillierte Metall-Silhouette als Wandkunst", defaultSize: [0.75, 0.05, 0.5], sourceUrl: "https://www.temu.com/at/1-stuck-detaillierte-blatt-metallwandskulptur--silhouette-kunst-fur-terrasse-weihnachten--geschenk-zum-einzug-vatertag-g-601100896764994.html", sourceLabel: "Temu 14", symbol: "storage", fallback3d: "decor", material: METAL },
  { id: "deko-temu-15", name: "Personalisiertes Namensschild", description: "Mehrschichtige, unregelmäßige Tafel als Hängeschild", defaultSize: [0.45, 0.04, 0.24], sourceUrl: "https://www.temu.com/at/personalisiertes-namensschild-wanddeko-mehrschichtig-unregelmassig--fur-herzstuck-mit-namen-initialen-tafel-fur-weihnachten-halloween-geburtstage-zur-dekoration-hangeschild-fur-wohnung-g-607158133449507.html", sourceLabel: "Temu 15", symbol: "storage", fallback3d: "decor", material: OAK },
  { id: "deko-temu-16", name: "3D-Fliesenimitat-Wandaufkleber", description: "Wasserdichte, abziehbare Fliesenstruktur für Raumdeko", defaultSize: [0.8, 0.015, 0.4], sourceUrl: "https://www.temu.com/at/-30-stuck-3d-selbstklebende-wandaufkleber-als-fliesen-imitat-abziehbar-selbstklebend-wasserdicht-fur-schlafzimmer-wohnzimmer-dekor--raumdeko-aufkleber-sets-marke--weihnachten-g-601099543351853.html", sourceLabel: "Temu 16", symbol: "rug", fallback3d: "decor", material: CREAM },
  { id: "deko-temu-17", name: "3D-Marmor-Wandfliesen", description: "Dicke, leicht zu reinigende Marmor-Schaumstoffpaneele", defaultSize: [0.6, 0.025, 0.3], sourceUrl: "https://www.temu.com/at/-50-stuck-3d-marmor-wandfliesen-tapete-selbstklebende-schaumstoff-wandaufkleber-verdicktes-design-heimdekoration-wandpaneele-abziehen-und-aufkleben-leicht-zu-reinigen-und-zuschneiden-fur-die-renovierung-von-badezimmern-wohnzimmern-kuchen-schlafzimmern-weihnachten-g-601099679816185.html", sourceLabel: "Temu 17", symbol: "rug", fallback3d: "decor", material: CREAM },
  { id: "deko-temu-18", name: "Marmor-PVC-Wandpaneele", description: "Wasserfeste PVC-Paneele für Bad, Küche und TV-Wand", defaultSize: [1.2, 0.02, 0.6], sourceUrl: "https://www.temu.com/at/10-stuck-1-8-m2-marmor-selbstklebende-wasserdichte-wandpaneele-19-4-sq-ft-abdeckung-hitzebestandige-spritzschutzfliesen-pvc-wandpaneele-fur--badezimmer-wohnzimmer-schlafzimmer-und-tv--g-601099714935732.html", sourceLabel: "Temu 18", symbol: "rug", fallback3d: "decor", material: CREAM },
  { id: "deko-temu-19", name: "Karierter Sofabezug", description: "Warmer, dicker und haustierfreundlicher Sofaschutz", defaultSize: [2.1, 0.95, 0.85], sourceUrl: "https://www.temu.com/at/-karierter--sofabezug-winterlich-warmer-verdickter-weicher-sofaschoner--der-haustiere-kratzfester-haustierfreundlicher-sofabezug-fur-katzen-hunde-dicker-flor-kissenschoner-rutschfester-sofabezug-mobelschoner-fur-schlafzimmer--wohnzimmer-dekor-langlebige-g-601099694960509.html", sourceLabel: "Temu 19", symbol: "sofa", fallback3d: "sofa", material: TAUPE },
  { id: "deko-temu-20", name: "Kirschblüten-Lichterkette", description: "Hellrosa LED-Ranken für Wand, Nachttisch oder Wohnzimmer", defaultSize: [1.48, 0.1, 0.35], sourceUrl: "https://www.temu.com/at/hellrosa-kirschbluten-ranken-lichterkette-bestehend-aus-140-kirschbluten-rankenzweigen-70-kirschbluten-70-leds-148-cm-58-27-zoll-lang--fur-schlafzimmer-nachttisch-wohnzimmer-wanddekoration-diy-bastelarbeiten-weihnachten-valentinstag-verlobungen-hochzeiten-geburtstagsfeiern-g-606295851633432.html", sourceLabel: "Temu 20", symbol: "light", fallback3d: "plant", material: GREEN },
];

export const DEKO_CATALOG: FurnitureCatalogItem[] = DEKO_SEEDS.map((entry) => ({
  id: entry.id,
  name: entry.name,
  category: "Licht/Deko",
  description: entry.description,
  defaultSize: { width: entry.defaultSize[0], depth: entry.defaultSize[1], height: entry.defaultSize[2] },
  defaultElevation: DEKO_ELEVATIONS[entry.id],
  resize: "fixed",
  symbol: entry.symbol,
  fallback3d: entry.fallback3d,
  renderMode: "parametric",
  materials: [entry.material],
  sourceUrl: entry.sourceUrl,
  realism: {
    sourceLabel: `${entry.sourceLabel} · Nutzerordner C:\\Users\\User\\Desktop\\Deko`,
    dimensions: "3D-Proportion geschätzt; die Quelldatei enthält kein verifiziertes Maßbild",
    confidence: "estimated",
    construction: [entry.description, "Produktbild als visuelle Referenz", "Kein lokales GLB/GLTF im Quelldatensatz"],
  },
}));
