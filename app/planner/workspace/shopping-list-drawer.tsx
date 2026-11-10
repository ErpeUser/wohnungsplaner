type ShoppingItem = {
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
  type: "washer" | "basin" | "bed" | "rug" | "camel-rug" | "hallway-rug" | "sofa" | "hallway" | "table" | "chair" | "vinyl" | "mirror" | "appliance" | "decor";
  retailer: string;
};

const SHOPPING_ITEMS: ShoppingItem[] = [
  {
    id: "kitchen-fridge-60cm",
    name: "Einbaukühlschrank / Kühl-Gefrier-Kombination",
    room: "Wohnküche",
    dimensions: "Nische 60 × 65 × 204 cm · schwarzes Frontbild · genaue Gerätehöhe vor Bestellung prüfen",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · Nischenmaß aus dem Wohnungsplan",
    searchHint: "Einbaukühlschrank schwarz 60 cm Nische 204 cm energieeffizient",
    generic: true,
    type: "appliance",
    retailer: "frei wählbar",
  },
  {
    id: "kitchen-oven-60cm",
    name: "Einbaubackofen 60 cm",
    room: "Wohnküche",
    dimensions: "Frontmaß ca. 60 × 59 cm · schwarzes Glas · unter dem Induktionsfeld",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · vorhandene Planung: Gorenje 60 cm",
    searchHint: "Gorenje Einbaubackofen 60 cm schwarz Glas Energieklasse",
    generic: true,
    type: "appliance",
    retailer: "frei wählbar",
  },
  {
    id: "kitchen-induction-hob-60cm",
    name: "Induktionskochfeld 60 cm",
    room: "Wohnküche",
    dimensions: "ca. 58 × 52 cm · 4 Kochzonen · schwarze Glasfläche · über dem Backofen",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · Ausschnitt und Anschluss vor Bestellung prüfen",
    searchHint: "Induktionskochfeld 60 cm 4 Zonen schwarz flächenbündig",
    generic: true,
    type: "appliance",
    retailer: "frei wählbar",
  },
  {
    id: "kitchen-hood-60cm",
    name: "Schräghaube / Dunstabzug 60 cm",
    room: "Wohnküche",
    dimensions: "ca. 60 × 34 × 66 cm · schwarzes Glas · Umluft oder Abluft nach Anschluss klären",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · vorhandene Planung: 60-cm-Schräghaube",
    searchHint: "Dunstabzug Schräghaube 60 cm schwarz Glas leise",
    generic: true,
    type: "appliance",
    retailer: "frei wählbar",
  },
  {
    id: "kitchen-sink-60cm",
    name: "Edelstahlspüle 60 cm",
    room: "Wohnküche",
    dimensions: "ca. 52 × 42 × 16 cm · ein Becken · Armaturloch und Unterschrankmaß prüfen",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · Spülenposition unter der Mikrowelle",
    searchHint: "Edelstahlspüle 60 cm Einbauspüle ein Becken gebürstet",
    generic: true,
    type: "appliance",
    retailer: "frei wählbar",
  },
  {
    id: "184900692R",
    name: "Waschmaschinenschrank Scout",
    room: "Bad",
    dimensions: "63 × 191 × 24 cm",
    price: 129,
    url: "https://www.moebelix.at/p/mid-you-waschmaschinenschrank-scout-kaschmir-naturfarben-b-63-cm-00184900692R",
    type: "washer" as const,
    retailer: "Möbelix",
  },
  {
    id: "184900692G",
    name: "Waschbeckenunterschrank Scout",
    room: "Bad",
    dimensions: "60 × 56 × 34 cm",
    price: 79,
    url: "https://www.moebelix.at/p/mid-you-waschbeckenunterschrank-scout-kaschmir-naturfarben-b-60-cm-00184900692G",
    type: "basin" as const,
    retailer: "Möbelix",
  },
  {
    id: "1005012515662602",
    name: "A Type LED-Badspiegel 60 cm",
    room: "Bad",
    dimensions: "Ø 60 cm · rahmenlos · LED-Backlight · dimmbar · Beschlagfrei-Funktion · Touch-Steuerung",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · Variante A Type 60cm · Preis bei AliExpress prüfen",
    url: "https://de.aliexpress.com/item/1005012515662602.html?spm=a2g0o.detail.similar_items.3.6059MHazMHazbh&utparam-url=scene%3Aimage_search%7Cquery_from%3Adetail_bigimg%7Cx_object_id%3A1005012515662602%7C_p_origin_prod%3A&algo_pvid=cf144832-235d-49c3-814e-a8e448c36cff&algo_exp_id=cf144832-235d-49c3-814e-a8e448c36cff&pdp_ext_f=%7B%22order%22%3A%2263%22%2C%22fromPage%22%3A%22search%22%7D&pdp_npi=6%40dis%21EUR%2162.91%2148.93%21%21%21457.20%21355.60%21%400b15831117942592706467732e106e%2112000058604492129%21sea%21AT%210%21X%211%210%21n_tag%3A-29919%3Bd%3A1f788ea8%3Bm03_new_user%3A-29895",
    imageUrl: "https://ae-pic-a1.aliexpress-media.com/kf/Scfe7b24134d34aba9a97d3855fcf9cd81.jpg",
    type: "mirror",
    retailer: "AliExpress",
  },
  {
    id: "601104051124011",
    name: "Verstellbare Duschvorhangstange Brilliant Silber",
    room: "Bad",
    dimensions: "171–210 cm · ausziehbar · Metall · Spannhalterungen",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · eingestellt auf ca. 205 cm · Preis bei Temu prüfen",
    url: "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601104051124011&sku_id=17612894696580&_oak_page_source=501&page_source=10037",
    type: "decor" as const,
    retailer: "Temu",
  },
  {
    id: "601101209862086",
    name: "Duschvorhang Nordic Leinenoptik Beige",
    room: "Bad",
    dimensions: "180 × 200 cm · Leinenoptik · 12 Haken · Quasten · rostfreie Ösen",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · Variante Beige · 180 × 200 cm · Preis bei Temu prüfen",
    url: "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601101209862086&sku_id=17605169678866&_oak_page_source=501&page_source=10037",
    type: "decor" as const,
    retailer: "Temu",
  },
  {
    id: "800001233737",
    name: "Polsterbett Bliss",
    room: "Zimmer 1",
    dimensions: "147 × 222 × 108 cm · Liegefläche 120 × 200 cm",
    price: 545.29,
    url: "https://www.xxxlutz.at/p/homesy-polsterbett-bliss-120-x-200-cm-mit-bettkasten-und-lattenrost-ohne-matratze-beige-800001233737",
    type: "bed" as const,
    retailer: "XXXLutz",
  },
  {
      id: "601099532250952",
      name: "Kunstkaninchen-Plüschteppich Elfenbein",
    room: "Zimmer 1",
      dimensions: "100 × 180 cm · einfarbig · dichter Kunstkaninchen-Plüsch · Elfenbein",
      price: null,
    quantity: 1,
      amountLabel: "1 Stück · verlinkte SKU 17592283638116",
      url: "https://www.temu.com/at/kunstkaninchen-pluschteppich-fur-wohnzimmer-couchtisch-schlafzimmer-nachttisch-grossflachig-vollstandige-abdeckung-verdickt-g-601099532250952.html?sku_id=17592283638116",
    type: "camel-rug" as const,
    retailer: "Temu",
  },
  {
    id: "607246280935328",
    name: "Vorraumteppich Taupe-Kreisbögen",
    room: "Vorraum",
    dimensions: "120 × 180 cm · Samt · Creme/Salbei/Beige",
    price: 39.46,
    quantity: 1,
    amountLabel: "1 Stück · gewählte SKU 105780749538479",
    url: "https://www.temu.com/goods.html?_bg_fs=1&goods_id=607246280935328&sku_id=105780749538479&_oak_page_source=501&page_source=10037&_x_sessn_id=tmjb4ij7s3&refer_page_name=shopping_cart&refer_page_id=10037_1794234578952_0mbqxxhree&refer_page_sn=10037",
    type: "hallway-rug" as const,
    retailer: "Temu",
  },
  {
    id: "606296522765554",
    name: "Cremefarbener Chefsessel mit Fußstütze",
    room: "Zimmer 1",
    dimensions: "64 × 51 × 105–114 cm · Sitzhöhe 47–56 cm · Sitzbreite 52 cm · Fußstütze 20 cm · bis 200 kg",
    price: null,
    quantity: 1,
    amountLabel: "1 Stück · Maße laut Produktabbildung bestätigt",
    url: "https://share.temu.com/FzWfw3FpnHB",
    type: "chair" as const,
    retailer: "Temu",
  },
  {
    id: "2424010201",
    name: "Sofa Chicago Chenille Beige",
    room: "Wohnküche",
    dimensions: "206 × 78 × 107 cm · Sitzhöhe 50 cm",
    price: 899,
    url: "https://www.moebelix.at/p/sofa-chicago-chenille-beige-b-206cm-002424010201",
    type: "sofa" as const,
    retailer: "Möbelix",
  },
  {
    id: "2778003504",
    name: "Garderobe Tejo Beige/Kaschmir",
    room: "Vorraum",
    dimensions: "115 × 231,9 × 37,5 cm · Spiegel 35 × 140 cm",
    price: 399.2,
    url: "https://www.moebelix.at/p/p-b-garderobe-tejo-beig-kaschmir-b-115-cm-002778003504",
    type: "hallway" as const,
    retailer: "Möbelix",
  },
  {
    id: "2858001801",
    name: "Ausziehtisch Bozan AZ 110",
    room: "Wohnküche",
    dimensions: "Ø 110 × 76 cm · ausgezogen 150 × 110 cm",
    price: 159.2,
    url: "https://www.moebelix.at/p/mid-you-esstisch-ausziehbar-bozan-az-110-150x110cm-eiche-002858001801",
    type: "table" as const,
    retailer: "Möbelix",
  },
  {
    id: "1634004202",
    name: "Armlehnstuhl Kaleo Chenille Beige",
    room: "Wohnküche",
    dimensions: "63 × 87 × 64 cm · Sitzhöhe 50 cm · Armlehne 66 cm",
    price: 55.92,
    quantity: 3,
    url: "https://www.moebelix.at/p/livetastic-armlehnstuhl-kaleo-chenille-beige-b-63-cm-001634004202",
    type: "chair" as const,
    retailer: "Möbelix",
  },
  {
    id: "601099691023748",
    name: "Selbstklebende Möbelfolie Kaschmir/Creme",
    room: "Zimmer 1",
    dimensions: "4 Fronten à 41,9 × 30,8 cm · netto 0,52 m² · mit 15 % Reserve 0,60 m² · empfohlen mindestens 45 × 150 cm",
    price: null,
    quantity: 1,
    amountLabel: "1 Rolle / mindestens 0,60 m²",
    url: "https://www.temu.com/at/selbstklebende-abziehbare-vinyl-tapete-fur-schranke-kleiderschranke--strukturierte-peel-stick-paneele-wasserdichte-feuchtigkeitsbestandige-abdeckung-diy--mit-einfacher-installation-kein-kleber-werkzeug-erforderlich-renovierung-dachdeckung-g-601099691023748.html",
    type: "vinyl" as const,
    retailer: "Temu",
  },
  {
    id: "601099526356869",
    name: "Selbstklebende Tapete in warmbeiger Stoffstruktur",
    room: "Zimmer 1",
    dimensions: "Bettwand 333 × 254 cm · netto 8,46 m² · 6 raumhohe Bahnen bei 60 cm Rollenbreite · inklusive einer vollständigen Reservebahn",
    price: null,
    quantity: 3,
    amountLabel: "2 Rollen 60 × 1.000 cm + 1 Reserve-Rolle 60 × 500 cm",
    url: "https://www.temu.com/at/-vintage-braun-stoffmuster-selbstklebende-entfernbare-tapete-wasserdicht-abziehen-und-aufkleben-elektrische--heimdekoration-raum-hintergrund-kuchenrenovierung-tapete-wandaufkleber-g-601099526356869.html",
    type: "vinyl" as const,
    retailer: "Temu",
  },
  {
    id: "z1-deko-bilder",
    name: "Botanisch-abstraktes Bilderpaar mit Eiche-Rahmen",
    room: "Zimmer 1",
    dimensions: "2 Motive à 50 × 70 cm · heller Eiche-Rahmen · ca. 10 cm Abstand",
    price: null,
    quantity: 2,
    searchHint: "botanische Poster beige taupe 50x70 Rahmen Eiche hell",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-vorhang",
    name: "Doppellagiger, bodenlanger Vorhang",
    room: "Zimmer 1",
    dimensions: "Ecru transparent + Taupe verdunkelnd · ca. 245 cm hoch · Gesamtstoffbreite 400–440 cm",
    price: null,
    quantity: 1,
    amountLabel: "2 transparente + 2 taupefarbene Schals",
    searchHint: "Vorhang Ecru transparent Taupe verdunkelnd 245 cm deckenhoch",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-licht",
    name: "Dimmbares indirektes LED-Licht",
    room: "Zimmer 1",
    dimensions: "2700–3000 K · Niedervolt/USB · Kopfteil ca. 130 cm + Nische ca. 180 cm",
    price: null,
    quantity: 2,
    searchHint: "dimmbar LED warmweiß USB 2700K indirekt Klebestreifen",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-wandregal-set-schminkecke",
    name: "Wandregal-Set für die Schminkecke · helle Natur-Eiche",
    room: "Zimmer 1",
    dimensions: "1 × ca. 112 × 19 × 4–5 cm + 1 × ca. 36 × 16 × 4 cm + 1 × ca. 32 × 16 × 4 cm · verdeckte Befestigung",
    price: null,
    quantity: 1,
    amountLabel: "3 Regalböden als Set oder einzeln",
    searchHint: "schwebendes Wandregal Natur Eiche hell 110 cm 35 cm 30 cm 16 cm tief verdeckte Halterung",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-nische",
    name: "Sehr schmale beleuchtete Eiche-Nische",
    room: "Zimmer 1",
    dimensions: "max. 22 cm breit · 13 cm tief · ca. 188 cm hoch · 3 Ablagen",
    price: null,
    quantity: 1,
    searchHint: "schmales Wandregal Eiche 20 cm beleuchtet flache Ablagen",
    generic: true,
    type: "decor",
    retailer: "frei wählbar / Maßanfertigung",
  },
  {
    id: "z1-deko-wandleuchten",
    name: "Kompakte Wandleuchten in Messing/Taupe",
    room: "Zimmer 1",
    dimensions: "max. 12 cm tief · Schirm ca. Ø 16–20 cm · warmweiß 2700 K",
    price: null,
    quantity: 2,
    searchHint: "kleine Wandleuchte Schlafzimmer Messing Taupe warmweiß flach",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-schrankboxen",
    name: "Niedrige Flechtboxen für den Schrank",
    room: "Zimmer 1",
    dimensions: "je ca. 42–45 × 35–40 × 22–25 cm · Ecru/Taupe · mit Griff",
    price: null,
    quantity: 3,
    searchHint: "Aufbewahrungsbox geflochten beige 45x38x24 Kleiderschrank oben",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-pflanze",
    name: "Eine schlanke Zimmerpflanze mit Beigetopf",
    room: "Zimmer 1",
    dimensions: "90–120 cm hoch · Topf Ø 24–28 cm · gesamte Stellfläche maximal 42 cm",
    price: null,
    quantity: 1,
    searchHint: "schlanke Zimmerpflanze 110 cm Olivenbaum Zamioculcas Topf beige matt",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-textilien",
    name: "Ruhiges Betttextilien-Set in Creme/Taupe",
    room: "Zimmer 1",
    dimensions: "2 helle Kissen · Lendenkissen ca. 35 × 50 cm · strukturierte Decke ca. 130 × 170 cm",
    price: null,
    quantity: 1,
    searchHint: "Bettdecke Tagesdecke Creme Taupe strukturiert Lendenkissen",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-kleinteile",
    name: "Nachttisch- und Schreibtischdeko",
    room: "Zimmer 1",
    dimensions: "Kugelleuchte Ø 15–18 cm · Tablett 20–24 × 12–16 cm · Holz-Organizer 25–35 cm",
    price: null,
    quantity: 1,
    searchHint: "kleine Kugellampe warmweiß Tablett beige Holz Schreibtisch Organizer",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
  {
    id: "z1-deko-pendelleuchte",
    name: "Leichte Pendelleuchte in Flecht-/Rattanoptik",
    room: "Zimmer 1",
    dimensions: "Schirm Ø ca. 35–40 cm · warmweißes Leuchtmittel · kurze Abhängung",
    price: null,
    quantity: 1,
    searchHint: "Pendelleuchte Rattan hell 40 cm Schlafzimmer geprüft",
    generic: true,
    type: "decor",
    retailer: "frei wählbar",
  },
];

export function ShoppingListDrawer({ onClose }: { onClose(): void }) {
  const total = SHOPPING_ITEMS.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
  return (
    <aside id="planner-shopping-list" className="planner-details planner-shopping" role="dialog" aria-modal="true" aria-labelledby="planner-shopping-title" tabIndex={-1}>
      <header>
        <div><span className="planner-kicker">Ausstattung</span><h2 id="planner-shopping-title">Einkaufsliste</h2></div>
        <button type="button" aria-label="Einkaufsliste schließen" onClick={onClose}>×</button>
      </header>
      <p className="planner-shopping__intro">Maßgetreu eingeplante Produkte plus maßlich abgestimmte, herstellerneutrale Deko-Suchliste</p>
      <div className="planner-shopping__items">
        {SHOPPING_ITEMS.map((item) => (
          <article key={item.id} className="planner-shopping__item">
            <div className={`planner-shopping__preview planner-shopping__preview--${item.type}`} aria-hidden="true">
              {/* Product hosts are user-provided/external; next/image cannot safely optimize an open host list. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
              <i /><i /><i />
            </div>
            <div className="planner-shopping__copy">
              <span>{item.room}{item.generic ? " · Deko-Vormerkung" : ` · Art. ${item.id}`}</span>
              <h3>{item.name}</h3>
              <p>{item.dimensions}</p>
              <div><strong>{item.generic ? "Budget offen" : item.price === null ? `Preis bei ${item.retailer} prüfen` : (item.price * (item.quantity ?? 1)).toLocaleString("de-AT", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: Number.isInteger(item.price) ? 0 : 2,
                maximumFractionDigits: 2,
              })}</strong><small>{item.amountLabel ?? `${item.quantity ?? 1} Stück`}</small></div>
              {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Produkt bei {item.retailer} öffnen ↗</a> : <em className="planner-shopping__search">Suchbegriff: {item.searchHint}</em>}
            </div>
          </article>
        ))}
      </div>
      <footer className="planner-shopping__total">
        <span>Zwischensumme</span>
        <strong>{total.toLocaleString("de-AT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        <small>Produktpreise können sich ändern. Die Deko-Vormerkungen sind bewusst herstellerneutral und nicht in der Summe enthalten.</small>
      </footer>
    </aside>
  );
}
