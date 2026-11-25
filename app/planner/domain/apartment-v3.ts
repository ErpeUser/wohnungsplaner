import { parsePlannerDocument } from "./schema.ts";
import type {
  PlannerBuiltIn,
  PlannerFixture,
  PlannerOpening,
  PlannerPlacement,
  PlannerWall,
  Point2,
} from "./types.ts";
import { buildWallGraph, deriveWallLength, type RoomOutlineInput } from "./wall-graph.ts";

const roomOutlines: RoomOutlineInput[] = [
  room("wohnkueche", "Wohnküche", 21.82, true, "parquet-oak-narrow", [
    point(0, 3.47), point(2.5, 3.47), point(2.5, 4.08), point(3.56, 4.08),
    point(3.56, 3.17), point(3.74, 3.17), point(3.74, 3.97), point(3.82, 4.6),
    point(4.48, 6.67), point(5.12, 8.86), point(3.58, 8.95), point(0, 8.95),
  ]),
  room("zimmer1", "Zimmer 1", 12.36, true, "parquet-oak-narrow", [
    point(0, 0), point(3.56, 0), point(3.56, 3.97), point(2.5, 3.97),
    point(2.5, 3.33), point(0, 3.33),
  ]),
  room("zimmer2", "Zimmer 2", 10.15, true, "parquet-oak-narrow", [
    point(0, 8.95), point(3.58, 8.95), point(3.58, 11.78), point(0, 11.78),
  ]),
  room("vorraum", "Vorraum", 5.2, true, "porcelain-light-taupe", [
    point(-2.42, 5.87), point(-0.16, 5.87), point(-0.16, 8.2), point(-2.42, 8.2),
  ]),
  room("abstellraum", "Abstellraum", 2, true, "porcelain-light-taupe", [
    point(-1.33, 4.1), point(-0.16, 4.1), point(-0.16, 5.81), point(-1.33, 5.81),
  ]),
  room("bad", "Bad", 4.31, true, "porcelain-light-taupe", [
    point(-2.42, 8.2), point(-0.09, 8.2), point(-0.09, 10.05), point(-2.42, 10.05),
  ]),
  room("wc", "WC", 1.42, true, "porcelain-light-taupe", [
    // Wall centerlines. Clear dimensions are 0.98 m between the finished
    // side walls and approximately 1.42 m to the inside entrance plane.
    point(-2.42, 4.14), point(-1.33, 4.14), point(-1.33, 5.68), point(-2.42, 5.68),
  ]),
  // The Vermietungsplan labels the 2.23 m² loggia as epoxy resin and the
  // adjoining 3.80 m² balcony as the same hard-wearing exterior finish.  The
  // single room polygon keeps the existing plan topology while using the
  // measured grey epoxy surface instead of the previous beige placeholder.
  room("balkon", "Balkon / Loggia", 6.03, true, "epoxy-grey", [
    point(5.12, 8.86), point(5.2, 8.6), point(5.643, 10.07),
    point(6.12, 11.65), point(3.58, 11.78), point(3.58, 8.95),
  ], 2.23),
];

const wallGraph = buildWallGraph(roomOutlines);

// The Vermietungsplan and the installed ceiling fixtures use a 2.56 m clear
// room height.  `buildWallGraph` keeps a generic 2.60 m fallback for older
// documents, so pin this measured apartment to its documented height here.
// This keeps wall tops, ceiling lights and the room-finish references on the
// same datum without changing the generic graph builder.
for (const wall of wallGraph.walls) {
  wall.height = 2.56;
  // The WC and storage room share one 10 cm partition.
  if (wall.roomIds.includes("wc") && wall.roomIds.includes("abstellraum")) wall.thickness = 0.10;
}

type LegacyOpening = {
  id: string;
  label: string;
  rooms: string[];
  kind: "door" | "window";
  start: Point2;
  end: Point2;
  headHeight: number;
  sillHeight?: number;
  hinge?: "start" | "end";
  swingDirection?: 1 | -1;
  visualStyle?: PlannerOpening["visualStyle"];
  confidence: "confirmed" | "plan-scaled";
};

const sourceOpenings: LegacyOpening[] = [
  opening("zimmer1-window", "Fenster Zimmer 1", ["zimmer1"], "window", 3.56, 1.29, 3.56, 2.6, 2.42, 0.62, undefined, "confirmed"),
  opening("zimmer1-door", "Zimmer 1", ["zimmer1", "wohnkueche"], "door", 2.5, 3.97, 3.3, 3.97, 2, 0, "end", "confirmed", 1),
  opening("hall-living-door", "Wohnküche", ["vorraum", "wohnkueche"], "door", -0.16, 6.125, -0.16, 6.975, 2, 0, "start", "confirmed", 1, "glass-clear"),
  opening("apartment-entry-door", "Wohnungseingang", ["vorraum"], "door", -2.42, 6.11, -2.42, 7.22, 2, 0, "start", "confirmed", -1),
  opening("hall-bath-door", "Bad", ["vorraum", "bad"], "door", -1.13, 8.2, -0.28, 8.2, 2, 0, "end", "confirmed", 1),
  // Planmaß: je 80 cm lichte Türbreite, 38 cm Abstand zwischen den
  // gegenüberliegenden Türrahmen im Vorraum.
  opening("hall-wc-door", "WC", ["vorraum", "wc"], "door", -2.34, 5.87, -1.54, 5.87, 2, 0, "end", "confirmed", -1),
  opening("hall-store-door", "Abstellraum", ["vorraum", "abstellraum"], "door", -1.06, 5.87, -0.26, 5.87, 2, 0, "start", "confirmed", 1),
  opening("living-zimmer2-door", "Zimmer 2", ["wohnkueche", "zimmer2"], "door", 2.78, 8.95, 3.58, 8.95, 2, 0, "end", "confirmed", -1),
  opening("living-east-window", "Fenster links der Dekowand", ["wohnkueche"], "window", 3.94, 4.98, 4.27, 6.02, 2.42, 0.62, undefined, "plan-scaled"),
  opening("living-feature-window", "Fenster rechts der Dekowand", ["wohnkueche"], "window", 4.6, 7.05, 4.899, 8.091, 2.35, 0.68, undefined, "plan-scaled"),
  opening("living-loggia-door", "Balkon / Loggia", ["wohnkueche", "balkon"], "door", 3.76, 8.939, 4.558, 8.893, 2.35, 0, "end", "plan-scaled", 1),
  opening("zimmer2-balcony-door", "Balkontür Zimmer 2", ["zimmer2", "balkon"], "door", 3.58, 10.02, 3.58, 10.82, 2.42, 0, "end", "confirmed", -1),
];

const openings: PlannerOpening[] = sourceOpenings.map((source) => {
  const result = toPlannerOpening(source);
  return result.id === "hall-bath-door" ? { ...result, visualOpenFraction: 1 } : result;
});

const defaultOpenDoorIds = new Set<string>(["hall-bath-door"]);

const builtIns: PlannerBuiltIn[] = [
  builtIn("kitchen-tile-north", "L-förmige lichtgraue Fliesenzone vor Spüle und Kühlschrank", "wohnkueche", "other", "floor-zone-kitchen", 1.225, 4.185, 2.45, 1.43, 0.018, 0, "tile-kitchen-grey-square", 0.012),
  builtIn("kitchen-tile-west", "Fortsetzung der Fliesenzone vor der 256,2-cm-Gerätezeile", "wohnkueche", "other", "floor-zone-kitchen", 0.725, 5.466, 1.45, 1.132, 0.018, 0, "tile-kitchen-grey-square", 0.012),
  builtIn("kitchen-base-north", "111,8-cm-Spülenzeile bis zum Kühlschrank", "wohnkueche", "kitchen", "kitchen-base", 1.209, 3.77, 1.118, 0.6, 0.92, 0, "kitchen-white-gloss"),
  builtIn("kitchen-base-west", "191,2-cm-Gerätezeile plus 65-cm-Ecke gemäß Küchenplan", "wohnkueche", "kitchen", "kitchen-base", 0.3, 5.076, 1.912, 0.6, 0.92, -90, "kitchen-white-gloss"),
  builtIn("kitchen-corner-base", "65-cm-Kücheneckschrank gemäß Küchenplan", "wohnkueche", "kitchen", "kitchen-corner-base", 0.325, 3.795, 0.65, 0.65, 0.92, 0, "kitchen-white-gloss"),
  builtIn("kitchen-worktop-north", "Mattschwarze Arbeitsplatte der Spülenzeile", "wohnkueche", "kitchen", "kitchen-worktop", 1.209, 3.77, 1.158, 0.62, 0.045, 0, "kitchen-worktop-black", 0.92),
  builtIn("kitchen-worktop-west", "Mattschwarze Arbeitsplatte der Gerätezeile", "wohnkueche", "kitchen", "kitchen-worktop", 0.3, 5.076, 1.952, 0.62, 0.045, 90, "kitchen-worktop-black", 0.92),
  builtIn("kitchen-worktop-corner", "Durchgehende mattschwarze Eckarbeitsplatte", "wohnkueche", "kitchen", "kitchen-worktop", 0.325, 3.795, 0.67, 0.67, 0.045, 0, "kitchen-worktop-black", 0.92),
  builtIn("kitchen-upper-north", "Hochglanz-Hängeschränke mit Mikrowellennische über der Spüle", "wohnkueche", "kitchen", "kitchen-upper", 1.209, 3.54, 1.118, 0.36, 0.7, 0, "kitchen-white-gloss", 1.58),
  builtIn("kitchen-upper-west", "Hochglanz-Hängeschränke zwischen Ecke und Dunstabzug", "wohnkueche", "kitchen", "kitchen-upper", 0.08, 4.476, 0.712, 0.36, 0.7, -90, "kitchen-white-gloss", 1.58),
  builtIn("kitchen-upper-west-end", "45-cm-Hängeschrank am Ende der Gerätezeile", "wohnkueche", "kitchen", "kitchen-upper", 0.08, 5.807, 0.45, 0.36, 0.7, -90, "kitchen-white-gloss", 1.58),
  builtIn("kitchen-corner-shelf", "Geschlossener Hochglanz-Eckhängeschrank", "wohnkueche", "kitchen", "kitchen-corner-upper", 0.31, 3.72, 0.62, 0.44, 0.7, 0, "kitchen-white-gloss", 1.58),
  // The wall axes run through the centre of each 12-cm wall. Keep the panels
  // just in front of the room-side faces; the old values placed them inside
  // the wall, which made the photographed walnut backsplash vanish in 3D.
  builtIn("kitchen-backsplash", "Warme Holzrückwand bis zum Kühlschrank", "wohnkueche", "other", "kitchen-backsplash-oak", 1.035, 3.545, 1.47, 0.014, 0.61, 0, "oak-backsplash", 0.965),
  builtIn("kitchen-backsplash-west", "Durchgehende warme Holzrückwand der Gerätezeile", "wohnkueche", "other", "kitchen-backsplash-oak", 0.135, 4.91, 2.24, 0.014, 0.61, -90, "oak-backsplash", 0.965),
  builtIn("kitchen-backsplash-corner", "Nahtlose Holzrückwand in der Küchenecke", "wohnkueche", "other", "kitchen-backsplash-oak", 0.35, 3.80, 0.72, 0.014, 0.61, 0, "oak-backsplash", 0.965),
  builtIn("kitchen-sink", "Edelstahlspüle im 60-cm-Spülenschrank unter der Mikrowelle", "wohnkueche", "kitchen", "kitchen-sink", 1.468, 3.77, 0.52, 0.42, 0.16, 0, "metal-satin", 0.89),
  builtIn("kitchen-hob", "60-cm-Induktionskochfeld über dem Backofen", "wohnkueche", "kitchen", "kitchen-hob", 0.3, 5.132, 0.58, 0.52, 0.04, 90, "screen-black", 0.89),
  builtIn("kitchen-oven", "Gorenje 60-cm-Einbaubackofen gemäß Küchenplan", "wohnkueche", "kitchen", "kitchen-oven", 0.3, 5.132, 0.56, 0.55, 0.59, -90, "#202324", 0.18),
  builtIn("kitchen-hood", "Schwarzer 60-cm-Schräghauben-Dunstabzug gemäß Küchenplan", "wohnkueche", "kitchen", "kitchen-hood", 0.25, 5.132, 0.58, 0.34, 0.66, -90, "cabinet-black", 1.43),
  builtIn("kitchen-microwave", "Integrierte Mikrowelle über der Spüle", "wohnkueche", "kitchen", "kitchen-microwave", 1.468, 3.73, 0.5, 0.08, 0.32, 0, "metal-satin", 1.73),
  builtIn("kitchen-fridge", "Schwarzer 60-cm-Kühlschrank in der 65,9-cm-Nische", "wohnkueche", "kitchen", "kitchen-fridge", 2.068, 3.795, 0.6, 0.65, 2.04, 0, "cabinet-black"),
  builtIn("bath-tub", "Badewanne", "bad", "sanitary", "sanitary-bathtub", -2.06, 9.19, 0.72, 1.6, 0.56, 0, "#f3f2ee"),
  builtIn("bath-tub-apron", "Geflieste Wannenverkleidung", "bad", "sanitary", "bath-tub-apron", -1.685, 9.19, 1.6, 0.035, 0.548, 90, "tile-white-square", 0.012),
  builtIn("bath-tub-end-ledge", "Gefliester Wannenkopf mit Ablage", "bad", "sanitary", "bath-tub-end-ledge", -2.06, 9.99, 0.74, 0.14, 0.548, 0, "tile-white-square", 0.012),
  builtIn("bath-tub-side-apron", "Vollständig gefliester Wandabschluss neben der Badewanne", "bad", "sanitary", "bath-tub-side-apron", -2.06, 8.305, 0.74, 0.21, 0.55, 0, "tile-white-square", 0.01),
  builtIn("bath-basin", "Wandwaschbecken", "bad", "sanitary", "sanitary-washbasin", -1.22, 9.79, 0.6, 0.42, 0.18, 0, "#f5f4f0", 0.77),
  builtIn("bath-basin-cabinet-scout", "Scout Waschbeckenunterschrank · 60 × 56 × 34 cm", "bad", "storage", "bath-basin-cabinet-scout", -1.22, 9.88, 0.6, 0.34, 0.56, 180, "cashmere-matte", 0.02),
  builtIn("bath-washer", "Waschmaschine", "bad", "sanitary", "appliance-washer", -0.42, 9.72, 0.6, 0.6, 0.86, 180, "#f4f4f1"),
  builtIn("bath-washer-cabinet-scout", "Scout Waschmaschinenschrank · 63 × 191 × 24 cm", "bad", "storage", "bath-washer-cabinet-scout", -0.42, 9.92, 0.63, 0.24, 1.91, 180, "cashmere-matte"),
  builtIn("bath-shower-set", "Chrom-Wannenarmatur und Handbrause · mittig über der Wanne an der Spiegelwand", "bad", "sanitary", "bath-shower-set", -2.06, 9.975, 0.12, 0.12, 1.18, 180, "metal-satin", 0.82),
  // Neutrale, maßstäbliche Bad-Dekoplatzhalter; später direkt durch Nutzerdateien ersetzbar.
  builtIn("bath-round-mirror", "Runder Spiegel über dem Waschtisch · Ø 60 cm", "bad", "other", "bath-round-mirror", -1.22, 9.91, 0.6, 0.045, 0.6, 0, "mirror-glass", 1.34, {
    source: "Bad-Inspirationsbild und vorhandene 60-cm-Waschtischposition",
    confidence: "estimated",
    notes: ["Festgelegt: Ø 60 cm, mittig über dem 60-cm-Waschtisch; rundum ausreichend Wandabstand für Beleuchtung und Reinigung."],
  }),
  builtIn("bath-mat", "Badteppich · beige Waffelstruktur mit Fransen · 122 × 61 cm", "bad", "other", "bath-mat", -1.25, 8.8, 1.22, 0.61, 0.01, 90, "aliexpress-bath-rug-woven", 0.0125, {
    source: "Nutzerfoto und bestätigte Außenmaße · AliExpress Art. 1005013137520536",
    confidence: "confirmed",
    notes: ["122 × 61 cm inklusive Fransen; Beige und Webstruktur aus dem Nutzerfoto. Modellhöhe 1 cm und Webpitch sind bildbasierte Darstellungsmaße."],
  }),
  builtIn("bath-shower-rod", "Duschvorhangstange · Brilliant Silber · 171–210 cm", "bad", "other", "bath-shower-rod", -1.64, 9.19, 2.05, 0.03, 0.03, -90, "chrome-polished", 2.18, {
    source: "Badewannenmaß und Inspirationsbild",
    confidence: "estimated",
    notes: ["Temu-Variante Brilliant Silber, verstellbar 171–210 cm; im Bad auf 205 cm eingestellt und über die vollständige Wannenbreite geführt."],
  }),
  builtIn("bath-shower-curtain", "Duschvorhang Stoff Beige · 180 × 200 cm", "bad", "other", "bath-shower-curtain", -1.64, 9.19, 1.8, 0.018, 2.0, -90, "temu-shower-curtain-beige", 0.16, {
    source: "Vom Nutzer bereitgestelltes Temu-Produktbild · Art. 601100062257123",
    confidence: "confirmed",
    notes: ["Temu Art. 601100062257123 · SKU 17594540656721 · 12 Metallhaken · waschbarer, blickdichter beiger Stoff 180 × 200 cm ohne Quasten; im 3D halb geöffnet (ca. 90 cm Vorhangpaket links, ca. 90 cm Einstieg frei); glatte Saumabschlüsse und weiche Falten, Unterkante ca. 16 cm über dem Boden."],
  }),
  builtIn("bath-towel-hook-rail", "4 einzelne Rundhaken · Eiche natur / Schwarz · 2 × 2", "bad", "other", "bath-towel-hooks-wood-black", -0.16, 8.72, 0.36, 0.09, 0.34, 90, "bath-hook-oak-natural", 1.3, {
    source: "Nutzerwahl und AliExpress Produktfoto · Art. 1005013057225398 · Style2 · 4er-Pack (4PCS)",
    confidence: "estimated",
    notes: ["Vier einzelne runde Naturholz-Wandplatten mit senkrechter Holzmaserung und mattschwarzen ovalen Haken (Style2) in einer 2×2-Anordnung auf der bestehenden freien Badezimmerwand. Anordnung ca. 36 × 34 cm; reale Hakendurchmesser und die Eignung der Klebemontage auf den Fliesen vor Montage prüfen."],
  }),
  builtIn("wc-pan", "Wand-WC", "wc", "sanitary", "sanitary-wall-wc", -1.87, 4.44, 0.38, 0.58, 0.42, 0, "#f5f4f0", 0.18),
  builtIn("wc-flush", "WC-Betätigungsplatte", "wc", "sanitary", "wc-flush-plate", -1.87, 4.155, 0.24, 0.035, 0.16, 0, "metal-satin", 1.02),
  builtIn("wc-revision", "Gefliester Installationsschacht mit Revisionsklappe", "wc", "sanitary", "wc-revision-panel", -1.87, 4.15, 0.42, 0.03, 0.3, 0, "tile-white-rect", 1.48, {
    source: "Nutzerreferenzbild WC · Revisionsöffnung an der Rückwand",
    confidence: "estimated",
    notes: ["42 × 30 cm als bisheriges Planungsmaß; Unterkante ca. 148 cm und Oberkante ca. 178 cm.", "Revisionsklappe wandbündig, unter dem neuen Wandboard. Echtes Schacht- und Leitungsmaß nicht bekannt."],
  }),
  {
    ...builtIn("wc-wallboard-artisan-80", "Wandboard Simple · 80 cm Eiche Artisan", "wc", "other", "wc-artisan-wallboard-80", -1.87, 4.3245, 0.8, 0.235, 0.038, 0, "oak-artisan", 2.015, {
      source: "Möbelix Art. 007326000408 · vom Nutzer gewählte Variante · Händlermaße",
      confidence: "confirmed",
      notes: ["80 × 3,8 × 23,5 cm B/H/T · foliertes MDF · Eiche Artisan Dekor · bis ca. 10 kg Traglast · inkl. Befestigungsmaterial.",
        "Mittig an der 98-cm-Rückwand montiert, beidseitig je 9 cm frei. Unterkante ca. 201,5 cm als Einbauannahme.",
        "Rückkante liegt ca. 7 mm vor der Wandoberfläche. Die 23,5 cm Tiefe ragt waagerecht in den Raum."],
    }),
    collision: "decorative" as const,
  },
  {
    ...builtIn("wc-shelf-styling", "Foto-Deko auf dem Wandboard (Visualisierung)", "wc", "other", "wc-shelf-styling", -1.87, 4.3245, 0.77, 0.2, 0.27, 0, "ceramic-beige", 2.053, {
      source: "Nutzerreferenzbild WC · dekorative 3D-Annäherung",
      confidence: "estimated",
      notes: ["Links Efeutute, mittig Duftstäbchen, rechts Keramikvase und Korb als Beispielgestaltung.", "Deko ist nicht Bestandteil des Möbelix-Angebots und nicht automatisch Teil der Einkaufsliste."],
    }),
    collision: "decorative" as const,
  },
  {
    ...builtIn("wc-ventilation", "Wandbündige WC-Lüftungsabdeckung · warmweiß", "wc", "other", "wc-wall-ventilation", -1.87, 4.207, 0.23, 0.024, 0.15, 0, "tile-white-rect", 2.35, {
      source: "Nutzerreferenzbild WC · Lüftungsabdeckung nahe Decke",
      confidence: "estimated",
      notes: ["23 × 15 cm Sichtfläche als Schätzung; Montage nahe Decke über dem Regal, bündig zur Rückwand.", "Nur Lüftungsabdeckung visualisiert, keine bestätigte Lufttechnik oder Durchbruch-Maße."],
    }),
    collision: "decorative" as const,
  },
  builtIn("wc-mat", "WC-Teppich · beige Waffelstruktur mit Fransen · 92 × 61 cm", "wc", "other", "wc-mat", -1.87, 5.15, 0.92, 0.61, 0.01, 90, "aliexpress-bath-rug-woven", 0.0125, {
    source: "Nutzerfoto und bestätigte Außenmaße · AliExpress Art. 1005013137520536",
    confidence: "confirmed",
    notes: ["92 × 61 cm inklusive Fransen, längs vor dem Wand-WC; Beige und Webstruktur aus dem Nutzerfoto. Modellhöhe 1 cm, nicht vom Händler bestätigt."],
  }),
  builtIn("wc-paper-holder", "Dunklere Massivholz-Doppelablage mit Toilettenpapierhalter · AliExpress", "wc", "other", "wc-paper-holder", -1.455, 4.8, 0.33, 0.15, 0.25, 90, "wc-holder-solid-oak", 0.68, {
    source: "Nutzerfotos, AliExpress Art. 1005013624521211",
    confidence: "estimated",
    notes: ["Produktbild-Maße: zwei versetzte Holzablagen je 16,99 × 13,97 cm; schwarzer Papierarm 14,98 cm; senkrechter Eisensteg 9,39 cm. Dunklerer Holzton als bisher.", "Bestehende rechte WC-Seitenwand, oberes Ablageniveau ca. 92 cm. 33 × 15 × 25 cm Gesamt-Bounding-Box und Montagehöhe geschätzt, vor Bestellung und Montage an Wand und WC-Abständen prüfen.", "Kein zweiter Papierhalter und keine zusätzlichen Dekoartikel aus dem Werbefoto."],
  }),
  builtIn("living-slats", "Holzlamellen auf dunklem Träger", "wohnkueche", "other", "living-slat-wall", 4.3636, 6.5579, 1.052, 0.035, 2.54, 72.23, "slat-oak-dark", 0),
  builtIn("living-moss", "Moosfeld an Lamellenwand", "wohnkueche", "other", "living-moss-panel", 4.3208, 6.5716, 1.01, 0.055, 0.78, 72.23, "moss-green", 0.99),
  builtIn("living-clock", "Silberne Wanduhr mit profiliertem Rahmen", "wohnkueche", "other", "living-clock", 4.2827, 6.5838, 0.36, 0.08, 0.5, 72.23, "metal-satin", 1.17),
  builtIn("living-panel-light", "Wandleuchte über Moosfeld", "wohnkueche", "other", "living-wall-light", 4.316, 6.573, 0.23, 0.12, 0.24, 72.23, "white-matte", 2.13),
  builtIn("living-tv-slats", "Holzlamellenwand auf dem exakt 195 cm breiten Wandfeld", "wohnkueche", "other", "living-slat-wall", 0.2, 7.975, 1.95, 0.06, 2.54, 270, "slat-oak-dark", 0, {
    source: "Nutzermessung der Wand zwischen Vorraumtür und Zimmer-2-Wand · 02.11.2026",
    confidence: "confirmed",
    notes: ["Das Wandfeld beginnt bei z = 7,00 m direkt nach der 4-cm-Türzarge und endet bei z = 8,95 m; Breite exakt 195 cm."],
  }),
  builtIn("living-tv", "Fernseher · Wunschplanung", "wohnkueche", "other", "living-tv", 0.25, 7.975, 1.28, 0.07, 0.74, 270, "screen-black", 1.12, assumptionMetadata("TV mit 128 cm Breite mittig auf dem exakt 195 cm breiten Lamellenfeld; seitlich jeweils 33,5 cm Luft.")),
  builtIn("living-floating-cabinet", "Schwarzer Hängeschrank · Wunschplanung", "wohnkueche", "storage", "living-floating-cabinet", 0.29, 7.975, 1.72, 0.36, 0.31, 270, "cabinet-black", 0.5, assumptionMetadata("Hängeschrank mit 172 cm Breite mittig unter dem TV; seitlich jeweils 11,5 cm Abstand zum Rand des 195-cm-Lamellenfelds.")),
  builtIn("z1-bed-accent-wall", "Tapetenwand hinter dem Bett · Vintage-Braun Stoffmuster", "zimmer1", "other", "wall-finish-vintage-fabric-wallpaper", 0.068, 1.665, 3.33, 0.008, 2.54, 90, "wallpaper-vintage-brown-fabric", 0, {
    source: "Nutzerwahl und Temu-Produktbild · Art. 601099526356869 · 31.10.2026",
    confidence: "confirmed",
    notes: ["Die gesamte 333 × 254 cm große Wandfläche unmittelbar hinter dem Bett wird mit der gewählten warmbeigen, textilartig strukturierten selbstklebenden Tapete belegt."],
  }),
  builtIn("z1-entry-wallpaper-return", "Tapetenwand direkt neben der Zimmer-1-Tür", "zimmer1", "other", "wall-finish-vintage-fabric-wallpaper", 2.565, 3.65, 0.64, 0.008, 2.54, 270, "wallpaper-vintage-brown-fabric", 0, {
    source: "Nutzerwunsch · Fortsetzung der gewählten Bettwand-Tapete · 31.10.2026",
    confidence: "confirmed",
    notes: ["Die 64 cm breite Rücksprungwand direkt rechts neben der Zimmer-1-Tür erhält durchgehend dieselbe warmbeige Stofftapete wie die Wand hinter dem Bett; die Tapete läuft über die Ecke bis an die Türzarge weiter."],
  }),
  builtIn("z1-entry-wallpaper-door-strip", "Tapetenstreifen rechts an der Zimmer-1-Tür", "zimmer1", "other", "wall-finish-vintage-fabric-wallpaper", 3.43, 3.962, 0.26, 0.008, 2.54, 0, "wallpaper-vintage-brown-fabric", 0, {
    source: "Nutzerwunsch · markierte Wandfläche rechts neben der Zimmer-1-Tür · 01.11.2026",
    confidence: "confirmed",
    notes: ["Die Tapete wird um die Ecke auf dem 26 cm breiten Wandstreifen zwischen Türzarge und Außenwand fortgeführt, sodass sie aus der frontalen Türperspektive sichtbar bleibt."],
  }),
  builtIn("z1-entry-slim-art", "Neutrales Bild direkt neben der Zimmer-1-Tür · ca. 40 × 60 cm", "zimmer1", "other", "zimmer1-entry-slim-art", 2.592, 3.65, 0.4, 0.04, 0.6, 270, "oak-light", 1.36, assumptionMetadata("Herstellerneutrale Größen- und Stilplanung: Hochformat 40 × 60 cm, mittig auf der 64 cm breiten Tapetenfläche direkt neben der Tür; ruhige creme-, taupe- und sandfarbene abstrakte Komposition ohne festgelegtes Motiv.")),
  builtIn("z1-wall-art-pair", "Zwei botanisch-abstrakte Bilder über dem Kopfteil · je 60 × 80 cm", "zimmer1", "other", "zimmer1-wall-art-pair", 0.052, 0.735, 1.3, 0.045, 0.8, 270, "oak-light", 1.32, assumptionMetadata("Zwei ruhige Hochformat-Motive mit jeweils 60 × 80 cm und 10 cm Abstand; Gesamtgruppe 130 × 80 cm. Mittig über dem 147 cm breiten Kopfteil ausgerichtet, Unterkante 132 cm, Oberkante 212 cm und 44 cm Abstand zur 256 cm hohen Decke.")),
  builtIn("z1-headboard-led", "Indirektes warmweißes Licht hinter dem Kopfteil", "zimmer1", "other", "zimmer1-headboard-led", 0.045, 0.735, 1.28, 0.025, 0.025, 270, "led-warm", 1.13, assumptionMetadata("Dimmbares Niedervolt-/USB-Licht mit 2700–3000 K; nur als indirekte Kontur hinter dem Kopfteil.")),
  builtIn("z1-headboard-sconces", "Zwei kompakte warme Wandleuchten am Bett", "zimmer1", "other", "zimmer1-headboard-sconces", 0.043, 0.735, 1.72, 0.12, 0.24, 270, "metal-satin", 1.18, assumptionMetadata("Zwei kleine warmweiße Wandleuchten rahmen Bilder und Kopfteil symmetrisch; geringe Tiefe, damit die Bettseite frei bleibt.")),
  builtIn("z1-layered-curtain", "Deckenhoher Vorhang · Ecru transparent + Taupe", "zimmer1", "other", "zimmer1-layered-curtain", 3.49, 1.945, 2.06, 0.16, 2.38, 90, "fabric-ecru-sheer", 0.09, assumptionMetadata("Vorhangschiene deckennah; breiter transparenter Ecru-Layer und vollere seitliche taupefarbene Dekoschals wie in den Referenzen, Saum ca. 1 cm über Boden.")),
  builtIn("z1-vanity-shelf-main", "Wandboard Skate · 120 cm Wotan Eiche", "zimmer1", "storage", "zimmer1-desk-shelf-main", 2.92, 0.1, 1.2, 0.2, 0.018, 0, "oak-wotan", 1.65, {
    source: "Möbelix Art. 001555006211 · Wandboard Skate Wotan Eiche",
    confidence: "confirmed",
    notes: ["B/H/T 120 × 1,8 × 20 cm · melaminharzbeschichteter Holzwerkstoff · Wotan Eiche Dekor · max. 15 kg.", "Über dem LED-Spiegel positioniert; exakte Wandposition ist eine Planungsannahme.", "Befestigungsmaterial und geeignete Träger sind nicht im Lieferumfang enthalten."],
  }),
  builtIn("z1-vanity-shelf-side-upper", "Wandboard Simple · Eiche Artisan · Ecke oben", "zimmer1", "storage", "zimmer1-desk-shelf-side-upper", 3.4375, 0.49, 0.235, 0.235, 0.038, 90, "oak-artisan", 1.54, {
    source: "Möbelix Art. 007326000308 · Wandboard Simple Eiche Artisan",
    confidence: "confirmed",
    notes: ["B/H/T 23,5 × 3,8 × 23,5 cm · foliertes MDF · Eiche Artisan Dekor · max. 10 kg.", "Oberes von zwei identischen quadratischen Wandboards an der seitlichen Wand; Position ist eine Planungsannahme.", "Befestigungsmaterial enthalten."],
  }),
  builtIn("z1-vanity-shelf-side-lower", "Wandboard Simple · Eiche Artisan · Ecke unten", "zimmer1", "storage", "zimmer1-desk-shelf-side-lower", 3.4375, 0.84, 0.235, 0.235, 0.038, 90, "oak-artisan", 1.17, {
    source: "Möbelix Art. 007326000308 · Wandboard Simple Eiche Artisan",
    confidence: "confirmed",
    notes: ["B/H/T 23,5 × 3,8 × 23,5 cm · foliertes MDF · Eiche Artisan Dekor · max. 10 kg.", "Unteres von zwei identischen quadratischen Wandboards an der seitlichen Wand; Position ist eine Planungsannahme.", "Befestigungsmaterial enthalten."],
  }),
  builtIn("z1-entry-niche", "Schmale beleuchtete Eiche-Nische neben dem Schrank", "zimmer1", "storage", "zimmer1-entry-niche", 2.37, 3.255, 0.22, 0.13, 1.88, 180, "oak-light", 0.08, assumptionMetadata("Nur 22 cm breit und 13 cm tief, damit der Zugang frei bleibt; drei flache Ablagen und verdeckte warmweiße LED-Linie.")),
  builtIn("z1-wardrobe-top-decor", "Geflochtene Aufbewahrungsboxen auf dem Schrank", "zimmer1", "storage", "zimmer1-wardrobe-top-decor", 1.125, 3.02, 1.46, 0.42, 0.25, 180, "fabric-taupe", 2.1, assumptionMetadata("Drei niedrige, helle Flechtboxen stehen auf der nun 210 cm hohen Schrankoberseite und bleiben unter der 2,56-m-Decke.")),
  builtIn("z1-nightstand-decor", "Kompakte Deko auf dem Nachttisch", "zimmer1", "other", "zimmer1-nightstand-decor", 0.22, 1.69, 0.3, 0.18, 0.22, 270, "ceramic-beige", 0.61, assumptionMetadata("Schmales Tablett als einzige Deko; die integrierte Nachttischbeleuchtung bleibt frei und wird nicht durch eine zusätzliche Lampe ergänzt.")),
  builtIn(
    "hall-wall-decor",
    "Vorraum-Deko: größeres Bild und rundes Wandpflanzgefäß",
    "vorraum",
    "other",
    "vorraum-wall-decor",
    // Wall inner face is about x=-2.33 m; keep the decorative group 5 cm
    // into the room so the frame never z-fights with the wall.
    -2.31,
    7.78,
    0.72,
    0.045,
    0.86,
    -90,
    "oak-light",
    1.125,
    assumptionMetadata("Auf dem freien 99-cm-Wandfeld oberhalb der Eingangstür: gerahmtes Bild ca. 36 × 50 cm links, drei runde Wandteller mit 18/14/11 cm Durchmesser rechts. Unterkante der Gruppe ca. 122 cm, Oberkante ca. 204 cm; Gegensprechanlage, Türgriff und Türschwenk bleiben frei."),
  ),
];

// Keep the bath mat on the opposite free walking side of the bathroom.
// The 60 x 90 cm footprint uses the free area while clearing the door swing and sanitary units.
const DECORATIVE_BUILT_IN_IDS = new Set([
  "builtin-kitchen-tile-north",
  "builtin-kitchen-tile-west",
  "builtin-kitchen-backsplash",
  "builtin-kitchen-backsplash-west",
  "builtin-kitchen-backsplash-corner",
  "builtin-bath-round-mirror",
  "builtin-bath-towel-hook-rail",
  "builtin-bath-mat",
  "builtin-wc-mat",
  "builtin-wc-paper-holder",
  "builtin-wc-wallboard-artisan-80",
  "builtin-wc-shelf-styling",
  "builtin-wc-ventilation",
  "builtin-bath-shower-rod",
  "builtin-bath-shower-curtain",
  "builtin-living-slats",
  "builtin-living-moss",
  "builtin-living-clock",
  "builtin-living-panel-light",
  "builtin-living-tv-slats",
  "builtin-living-tv",
  "builtin-z1-bed-accent-wall",
  "builtin-z1-entry-wallpaper-return",
  "builtin-z1-entry-wallpaper-door-strip",
  "builtin-z1-entry-slim-art",
  "builtin-z1-wall-art-pair",
  "builtin-z1-headboard-led",
  "builtin-z1-headboard-sconces",
  "builtin-z1-layered-curtain",
  "builtin-z1-vanity-shelf-main",
  "builtin-z1-vanity-shelf-side-upper",
  "builtin-z1-vanity-shelf-side-lower",
  "builtin-z1-entry-niche",
  "builtin-z1-wardrobe-top-decor",
  "builtin-z1-nightstand-decor",
  "builtin-hall-wall-decor",
]);

const finalBuiltIns = builtIns.map((item) => item.id === "builtin-bath-mat"
  ? { ...item, position: { x: -1.25, z: 8.8 }, rotation: 90, materialVariants: { ...item.materialVariants, main: "aliexpress-bath-rug-woven" }, collision: "decorative" as const }
  : item.id === "builtin-wc-mat"
    ? { ...item, position: { x: -1.87, z: 5.15 }, rotation: 90, materialVariants: { ...item.materialVariants, main: "aliexpress-bath-rug-woven" }, collision: "decorative" as const }
  : item.id === "builtin-bath-basin-cabinet-scout"
    ? { ...item, position: { ...item.position, z: 9.8 } }
    : item.id === "builtin-bath-washer-cabinet-scout"
      ? { ...item, position: { ...item.position, x: -0.5, z: 9.84 } }
      : item.id === "builtin-bath-washer"
        ? { ...item, position: { ...item.position, x: -0.5, z: 9.68 }, size: { ...item.size, width: 0.6, depth: 0.6, height: 0.85 } }
        : item.id === "builtin-bath-shower-rod"
          ? { ...item, label: "Duschvorhangstange · Brilliant Silber · 171–210 cm", position: { ...item.position, z: 9.15 }, size: { ...item.size, width: 2.05 }, materialVariants: { ...item.materialVariants, main: "chrome-polished" } }
          : item.id === "builtin-bath-shower-curtain"
            ? { ...item, label: "Duschvorhang Stoff Beige · 180 × 200 cm", position: { ...item.position, z: 9.15 }, size: { ...item.size, width: 1.8, height: 2.0 }, materialVariants: { ...item.materialVariants, main: "temu-shower-curtain-beige" } }
  : { ...item, collision: DECORATIVE_BUILT_IN_IDS.has(item.id) ? "decorative" as const : "blocking" as const });

const fixtures: PlannerFixture[] = [
  fixture("z1-light", "Lichtauslass Decke", "zimmer1", "ceiling-light", 1.78, 1.7, 2.56),
  fixture("z1-smoke", "Rauchwarnmelder", "zimmer1", "smoke-detector", 1.15, 1.12, 2.52),
  fixture("z1-switch", "Lichtschalter Eingang", "zimmer1", "switch", 3.52, 3.42, 1.05, 90),
  fixture("z1-blind", "Beschattungssteuerung", "zimmer1", "blind-control", 3.52, 1.08, 1.1, 90),
  fixture("z1-outlet-west", "Steckdose Westwand", "zimmer1", "outlet", 0.04, 1.72, 0.3, -90),
  fixture("z1-outlet-north", "Dreifachsteckdose Nordwand", "zimmer1", "outlet", 1.78, 0.04, 0.3),
  fixture("z1-outlets", "Medien-Anschlussgruppe Südwand", "zimmer1", "outlet", 1.74, 3.28, 0.3),
  fixture("hall-light", "Deckenanschluss", "vorraum", "ceiling-light", -1.27, 7, 2.56),
  fixture("hall-smoke", "Rauchwarnmelder", "vorraum", "smoke-detector", -0.74, 7.34, 2.52),
  // Exakte Nutzermaße: Unterkante 133 cm, 16,5 cm hoch, 12,5 cm breit;
  // 8 cm Abstand vom Türrahmen entlang der 99-cm-Wand.
  fixture("hall-intercom", "Gegensprechanlage neben der Eingangstür", "vorraum", "intercom", -2.39, 7.30, 1.4125, -90),
  fixture("hall-switch", "Lichtschalter Wohnungseingang", "vorraum", "switch", -2.39, 7.5, 1.05, -90),
  fixture("hall-outlet", "Steckdose Eingangswand", "vorraum", "outlet", -2.39, 7.78, 0.3, -90),
  fixture("hall-panel", "Elektroverteiler mit zwei Abdeckfeldern", "vorraum", "distribution-panel", -0.19, 7.45, 1.56, 90),
  fixture("hall-floor-heating-panel", "Fußbodenheizungsverteiler / untere Revisionsklappe", "vorraum", "floor-heating-panel", -0.19, 7.45, 0.43, 90),
  fixture("living-light-north", "Lichtauslass Decke", "wohnkueche", "ceiling-light", 2.25, 5.35, 2.56),
  fixture("living-light-south", "Lichtauslass Decke", "wohnkueche", "ceiling-light", 2.25, 7.85, 2.56),
  fixture("living-light-kitchen", "Lichtauslass Küche", "wohnkueche", "ceiling-light", 1.15, 4.35, 2.56),
  fixture("living-smoke", "Rauchwarnmelder", "wohnkueche", "smoke-detector", 1.72, 6.52, 2.52),
  fixture("living-outlet-west", "Steckdose TV-Wand", "wohnkueche", "outlet", 0.06, 7.55, 0.3, -90),
  fixture("z2-light", "Lichtauslass Decke", "zimmer2", "ceiling-light", 1.8, 10.45, 2.56),
  fixture("z2-smoke", "Rauchwarnmelder", "zimmer2", "smoke-detector", 1.12, 10.46, 2.52),
  fixture("z2-outlet", "Steckdose Südwand", "zimmer2", "outlet", 1.8, 11.74, 0.3),
  fixture("bath-light", "Lichtauslass Decke", "bad", "ceiling-light", -1.32, 8.92, 2.56),
  fixture("bath-outlet", "Feuchtraum-Steckdose Waschtisch", "bad", "outlet", -1.22, 9.98, 1.12),
  fixture("wc-light", "Lichtauslass Decke", "wc", "ceiling-light", -1.87, 5.08, 2.56),
  fixture("wc-switch", "Lichtschalter WC", "wc", "switch", -1.40, 5.62, 1.05, 90),
  fixture("store-light", "Lichtauslass Decke", "abstellraum", "ceiling-light", -0.76, 5.08, 2.56),
  fixture("store-switch", "Lichtschalter Abstellraum", "abstellraum", "switch", -0.22, 5.62, 1.05, 90),
  fixture("balcony-outlet", "Außensteckdose an der Fassadenwand", "balkon", "outlet", 3.64, 11.15, 0.3, -90),
];

const placements: PlannerPlacement[] = [
  placement(
    "zimmer1-bliss-bed",
    "zimmer1",
    "bed-bliss-120",
    1.17,
    0.81,
    1.47,
    2.22,
    1.08,
    270,
    "fabric-bliss-beige",
    {
      source: "XXXLutz Produktseite · Art. 800001233737",
      confidence: "confirmed",
      notes: [
        "Gesamtmaß laut Maßzeichnung 147 × 222 × 108 cm; Liegefläche 120 × 200 cm",
        "Mit rund 1,5–2 cm Wandluft positioniert; kein Polsterteil überschreitet mehr die bestätigte Außenbreite.",
        "Fußteil 30 cm hoch; Füße 4,5 cm hoch",
        "Beiger Polsterstoff, vierteilig gepolstertes Kopfteil und Bettkasten laut Produktabbildung",
        "Lattenrost enthalten; Matratze nicht enthalten",
        "Anbieterhinweis: Produktbilder sind KI-generiert oder bearbeitet",
      ],
    },
  ),
  placement("zimmer1-wardrobe", "zimmer1", "wardrobe-225", 1.19, 2.98, 2.25, 0.58, 2.10, 180, "white-matte", {
    source: "Möbelix · MID.YOU FLY · Art. 001787045908 · Form und Maße bestätigt, Bestandsfarbe beibehalten",
    confidence: "confirmed",
    notes: [
      "B/H/T 225 × 210 × 58 cm laut Möbelix; die Rückkante bleibt trotz geringerer Tiefe an ihrer bisherigen Wandposition.",
      "Fünf Drehtüren mit mittigem langem Spiegel und silberfarbenen Bügelgriffen.",
      "Zwei Schubladenmodule mit je zwei Fronten: alle vier behalten die vorhandene kaschmir-/cremefarbene Folie statt des grauen Graphits.",
      "Bestehender Schrank: keine Aufnahme in die Einkaufsliste.",
    ],
  }),
  placement(
    "zimmer1-temu-shaggy-rug",
    "zimmer1",
    "rug-temu-rabbit-ivory-100x180",
    1.125,
    2.0975,
    1,
    1.8,
    0.04,
    90,
    "rug-temu-rabbit-ivory",
    {
      source: "Temu Produktseite und Originalabbildung · Art. 601099532250952 · SKU 17592283638107 · 10.11.2026",
      confidence: "confirmed",
      notes: [
        "Nutzerwahl: einfarbiger Kunstkaninchen-Plüschteppich in Elfenbein.",
        "Gewählte Variante: 100 × 180 cm; die 180-cm-Seite liegt parallel zum Bett.",
        "Zentriert im freien Streifen zwischen Bett und Kleiderschrank platziert.",
        "Maßlich bleiben rund 11 cm Luft zum Bettfuß und zur Schrankfront sowie rund 22 cm seitlicher Rand.",
      ],
    },
  ),
  placement(
    "zimmer1-desk",
    "zimmer1",
    "vanity-vicco-sherry-120",
    2.90,
    0.375,
    1.2,
    0.55,
    1.55,
    0,
    "white-matte",
    {
      source: "XXXLutz Produktseite · Vicco Sherry · Art. 800000829847",
      confidence: "confirmed",
      notes: [
        "Vorhandener Schminktisch; bewusst nicht in der Einkaufsliste geführt.",
        "Produktmaße 120 × 55 cm; Tischhöhe 75 cm; LED-Spiegel 110 × 70 cm.",
        "Ergonomisch montiert: 10 cm Abstand zwischen Tischplatte und Spiegel; Spiegelunterkante 85 cm, Oberkante 155 cm.",
        "Mattweißer 16-mm-Holzwerkstoff, goldfarbene Akzente und fünf Schubladen gemäß Produktseite.",
        "Der frühere separate Spiegel wurde vollständig durch den integrierten Sherry-LED-Spiegel ersetzt.",
      ],
    },
  ),
  placement(
    "zimmer1-chair",
    "zimmer1",
    "chair-aliexpress-xuegw-1005012445521181",
    2.96,
    0.92,
    0.62,
    0.53,
    0.92,
    180,
    "fabric-ecru",
    {
      source: "AliExpress · XUEGW Art. 1005012445521181 · drei Produktgaleriebilder geprüft, Außenmaße nicht verifiziert",
      confidence: "estimated",
      notes: [
        "Originalgalerie: geschwungene dreiteilige Blütenrückenlehne, dicke durchgehende Polsterarmlehnen, separates Schmetterlings-Lendenkissen und weicher cremefarbener Sitz.",
        "Originalgalerie: weißes Fünfstern-Rollkreuz mit schwarzen Rollen, Gasdrucksäule und Bedienhebel; 360° drehbar und laut Bild 10 cm Hub. Breite 62 cm, Tiefe 53 cm, Höhe 92 cm sind weiterhin unbestätigte Planungsmaße.",
        "Ecru/Creme entspricht der gezeigten hellen Variante; Materialien und Weißton bleiben bis zu einem Muster nur näherungsweise rekonstruiert.",
        "Die bisherige Platzierung bei X 2,96 m / Z 0,92 m und die Blickrichtung zum Schminktisch bleiben erhalten.",
      ],
    },
  ),
  placement(
    "zimmer1-led-nightstand",
    "zimmer1",
    "nightstand-aliexpress-woltu-1005012793801128",
    0.22,
    1.76,
    0.396,
    0.3,
    0.604,
    270,
    "white-matte",
    {
      source: "AliExpress Produktseite · Art. 1005012793801128",
      confidence: "estimated",
      notes: [
        "WOLTU-Ausführung mit zwei Schubladen, offenem blauem LED-Fach, ausziehbarer Ablage und integrierter USB-/Ladefunktion.",
        "Die Produktseite bestätigt die Bauform; 39,6 × 30 × 60,4 cm bleiben als realistische Planungsmaße geschätzt, bis das Maßblatt vorliegt.",
        "An die Wand hinter dem Kopfteil geschoben und nach Nutzerkorrektur um 180° gewendet. Weiße Variante wie vom Nutzer gewünscht, schwarze Lade- und Detailflächen bleiben als Kontrast.",
      ],
    },
  ),
  placement(
    "zimmer1-olive-plant",
    "zimmer1",
    "plant-zimmer1-olive",
    3.28,
    2.82,
    0.42,
    0.42,
    1.1,
    0,
    "leaf-olive",
    {
      source: "Deko-Wunschplanung nach Nutzerreferenzen vom 30.10.2026",
      confidence: "estimated",
      notes: [
        "Nur eine größere Pflanze in der Fensterecke, damit der Raum ruhig bleibt.",
        "42-cm-Stellfläche und 110 cm Höhe; außerhalb von Türschwenkbereich und direktem Durchgang.",
      ],
    },
  ),
  placement(
    "living-rug-concept",
    "wohnkueche",
    "rug-living-concept-240x240",
    1.55,
    7.99,
    2.5,
    1.8,
    0.02,
    0,
    "rug-temu-vintage-cream",
    {
      source: "Temu Art. 607199740937372 · SKU 106769800014188 · Variante A8447 / 180 × 250 cm",
      confidence: "confirmed",
      notes: [
        "Gewählter Vintage-Samtteppich 180 × 250 cm. Die lange Seite 250 cm bleibt entlang der bisherigen Wohnzimmerachse.",
        "Cremefarbenes Grundfeld, stark verblasste florale Ranken in warmen Taupe- und Sandtönen.",
        "Mehrlagige ornamentale Randbordüre mit feinen Innen- und Außenlinien gemäß Referenzfotos.",
        "Position X 155 cm / Z 799 cm; die Südseite liegt an der inneren Kante der 358-cm-Wand und bleibt mit dem Sofa gekoppelt.",
        "Kurzer Samtflor und 850 g/m² sind Produktangaben; die 2 cm im 3D-Modell sind nur eine Visualisierungsdicke.",
        "Muster ist aus Nutzerfotos rekonstruiert, nicht die originalen Texturdateien des Herstellers.",
      ],
    },
  ),
  placement(
    "living-chicago-sofa",
    "wohnkueche",
    "sofa-aliexpress-142",
    1.55,
    7.99,
    1.42,
    0.9,
    0.865,
    90,
    "fabric-ali-ivory",
    {
      source: "AliExpress Art. 1005013379584796 · vom Nutzer bereitgestellte Fotos und Maßgrafik",
      confidence: "confirmed",
      notes: [
        "Außenmaße geschlossen: Breite 142, Tiefe 90, Höhe 86,5 cm.",
        "Ausgezogen: 172 cm Gesamttiefe, 82 cm zusätzliche Freifläche vor dem Sofa.",
        "Sitzhöhe 42 cm, Belastbarkeit 150 kg pro Sitz laut Maßgrafik.",
        "Beigefarbenes Sofa mit zwei getrennten Sitzen, zwei Lendenkissen, breiten Armlehnen, Seitentasche und zwei ausziehbaren Fußteilen.",
        "Sofa-Mittelpunkt ist auf den Teppich-Mittelpunkt X 155 cm / Z 799 cm zentriert; die Teppichposition bleibt unverändert.",
      ],
    },
  ),
  placement(
    "living-bozan-table",
    "wohnkueche",
    "dining-table-bozan-110",
    2.2,
    5.7,
    1.1,
    1.1,
    0.76,
    180,
    "oak-artisan",
    {
      source: "Möbelix Produktseite · Art. 2858001801",
      confidence: "confirmed",
      notes: [
        "Geschlossen rund Ø 110 cm und 76 cm hoch; 150 × 110 cm ausgezogen",
        "25-mm-MDF-Platte mit Melaminoberfläche in Artisan-Eiche",
        "Schwarzes pulverbeschichtetes Metall-Sterngestell gemäß Produktabbildung",
        "Gerade statt schräg positioniert: Die 150-cm-Auszugslänge bleibt in Ost-West-Richtung, damit ihre Hüllfläche Küche und Sofa nicht unnötig einengt",
        "Aktuelle Nutzerposition dauerhaft gespeichert: Tischmittelpunkt X 220 cm / Z 570 cm, Drehung 180°.",
        "Vier WOLTU Chenille-Drehstühle (zwei 2er-Sets) sind die Hauptstühle; die Kaleo-, Amber- und Temu-Modelle bleiben im Vergleich als Backup auswählbar.",
        "Die vier Hauptstühle sind teilweise eingeschoben (Mittelpunktabstand 62 cm). Der Bozan-Tisch bleibt unverändert; die WOLTU-Maße sind weiterhin geschätzt.",
      ],
    },
    "living-dining-group",
  ),
  placement(
    "living-kaleo-chair-west",
    "wohnkueche",
    "chair-aliexpress-woltu-1005013095870024",
    2.2,
    5.08,
    0.58,
    0.60,
    0.85,
    0,
    "fabric-woltu-chenille-cream",
    {
      source: "AliExpress WOLTU · Art. 1005013095870024 · 2er-Set; Titel belegt, Maße geschätzt",
      confidence: "estimated",
      notes: [
        "Hauptmodell: WOLTU 2er-Set AliExpress 1005013095870024; vier Essplätze = zwei Sets.",
        "Planungsmaß ca. 58 × 60 × 85 cm, Sitzhöhe 48 cm, Armlehnenhöhe 65 cm; Händlermaße und Farbvariante unbestätigt.",
        "Cremebeige Chenille-Polsterung als Planungsfarbe, 360°-Drehteller und ausgestellte Metallbeine als Modellannahme.",
        "Stuhlplatz west: X 220 / Z 508 cm, 0°; Tisch und übrige Möbel bleiben unverändert.",
      ],
    },
    "living-dining-group",
  ),
  placement(
    "living-kaleo-chair-east",
    "wohnkueche",
    "chair-aliexpress-woltu-1005013095870024",
    2.82,
    5.7,
    0.58,
    0.60,
    0.85,
    90,
    "fabric-woltu-chenille-cream",
    {
      source: "AliExpress WOLTU · Art. 1005013095870024 · 2er-Set; Titel belegt, Maße geschätzt",
      confidence: "estimated",
      notes: [
        "Hauptmodell: WOLTU 2er-Set AliExpress 1005013095870024; vier Essplätze = zwei Sets.",
        "Planungsmaß ca. 58 × 60 × 85 cm, Sitzhöhe 48 cm, Armlehnenhöhe 65 cm; Händlermaße und Farbvariante unbestätigt.",
        "Cremebeige Chenille-Polsterung als Planungsfarbe, 360°-Drehteller und ausgestellte Metallbeine als Modellannahme.",
        "Stuhlplatz east: X 282 / Z 570 cm, 90°; Tisch und übrige Möbel bleiben unverändert.",
      ],
    },
    "living-dining-group",
  ),
  placement(
    "living-kaleo-chair-south",
    "wohnkueche",
    "chair-aliexpress-woltu-1005013095870024",
    1.58,
    5.7,
    0.58,
    0.60,
    0.85,
    270,
    "fabric-woltu-chenille-cream",
    {
      source: "AliExpress WOLTU · Art. 1005013095870024 · 2er-Set; Titel belegt, Maße geschätzt",
      confidence: "estimated",
      notes: [
        "Hauptmodell: WOLTU 2er-Set AliExpress 1005013095870024; vier Essplätze = zwei Sets.",
        "Planungsmaß ca. 58 × 60 × 85 cm, Sitzhöhe 48 cm, Armlehnenhöhe 65 cm; Händlermaße und Farbvariante unbestätigt.",
        "Cremebeige Chenille-Polsterung als Planungsfarbe, 360°-Drehteller und ausgestellte Metallbeine als Modellannahme.",
        "Stuhlplatz south: X 158 / Z 570 cm, 270°; Tisch und übrige Möbel bleiben unverändert.",
      ],
    },
    "living-dining-group",
  ),
  placement(
    "living-kaleo-chair-north",
    "wohnkueche",
    "chair-aliexpress-woltu-1005013095870024",
    2.2,
    6.32,
    0.58,
    0.60,
    0.85,
    180,
    "fabric-woltu-chenille-cream",
    {
      source: "AliExpress WOLTU · Art. 1005013095870024 · 2er-Set; Titel belegt, Maße geschätzt",
      confidence: "estimated",
      notes: [
        "Hauptmodell: WOLTU 2er-Set AliExpress 1005013095870024; vier Essplätze = zwei Sets.",
        "Planungsmaß ca. 58 × 60 × 85 cm, Sitzhöhe 48 cm, Armlehnenhöhe 65 cm; Händlermaße und Farbvariante unbestätigt.",
        "Cremebeige Chenille-Polsterung als Planungsfarbe, 360°-Drehteller und ausgestellte Metallbeine als Modellannahme.",
        "Stuhlplatz north: X 220 / Z 632 cm, 180°; Tisch und übrige Möbel bleiben unverändert.",
      ],
    },
    "living-dining-group",
  ),
  placement(
    "vorraum-temu-rabbit-rug",
    "vorraum",
    "rug-temu-easy-line-120x180",
    -1.29,
    7.04,
    1.2,
    1.8,
    0.025,
    90,
    "rug-hall-overlap-taupe",
    {
      source: "Temu Produktseite und Originalabbildung · Art. 607246280935328 · SKU 105780749538479 · 09.11.2026",
      confidence: "confirmed",
      notes: [
        "Nutzerwahl: 120 × 180 cm; die 140 × 200 cm-Variante bleibt im Katalog verfügbar.",
        "Originalmuster: abstrakte Easy-Line-Color-Blocks in Creme, hellem Salbei, dunklem Grün und warmem Beige mit feinen weißen Konturlinien.",
        "Um 90° gedreht und mittig im Vorraum platziert; die Türbereiche bleiben frei.",
      ],
    },
  ),
  placement(
    "hall-tejo-wardrobe",
    "vorraum",
    "hallway-brown-mirror-bench-115",
    -1.78,
    7.93,
    1.15,
    0.375,
    2.319,
    180,
    "hallway-walnut-brown",
    {
      source: "Vom Nutzer bereitgestellte Vorraum-Fotoreferenz (braune Garderobe)",
      confidence: "estimated",
      notes: [
        "Fotoreferenz: warmbraune Holzfronten, hohe Spiegeltür, schwarze Griff- und Hakenleiste und helle Polsterbank.",
        "Maße 115 × 37,5 × 231,9 cm entsprechen dem vorhandenen Stellplatz, nicht einer Fotomessung.",
        "Bestehende Vorraumposition und 180°-Ausrichtung bleiben unverändert.",
      ],
    },
  ),
];

export const DEFAULT_APARTMENT_DOCUMENT = parsePlannerDocument({
  schemaVersion: 3,
  id: "wohnung-v3",
  name: "Wohnungsplanung",
  updatedAt: "2026-10-30T18:30:00.000Z",
  walls: wallGraph.walls,
  rooms: wallGraph.rooms,
  openings,
  builtIns: finalBuiltIns,
  fixtures,
  placements,
  doorStates: Object.fromEntries(
    openings
      .filter((candidate) => candidate.kind === "door")
      .map((candidate) => [candidate.id, defaultOpenDoorIds.has(candidate.id) ? "open" : "closed"]),
  ),
  viewPreferences: {
    activeRoomId: null,
    overlays: { dimensions: true, fixtures: false, evidence: false },
  },
});

function point(x: number, z: number): Point2 {
  return { x, z };
}

function room(
  id: string,
  name: string,
  area: number,
  includedInWnf: boolean,
  floor: string,
  outline: Point2[],
  wnfArea?: number,
): RoomOutlineInput {
  return {
    id,
    name,
    area,
    includedInWnf,
    wnfArea,
    outline,
    surfaces: {
      floor,
      walls: id === "wc"
        ? "tile-white-rect"
        : id === "bad"
          ? "tile-white-square"
          : id === "balkon"
            ? "balcony-facade-grey"
            : "paint-warm-white",
      ceiling: "paint-white",
    },
    metadata: {
      source: "Vermietungsplan M 1:50",
      confidence: "estimated",
      notes: [
        `Planfläche ${area.toLocaleString("de-AT", { minimumFractionDigits: 2 })} m² bestätigt`,
        "Kontur planmaßstäblich abgeleitet; keine vollständige Maßkette im Vermietungsplan",
      ],
    },
  };
}

function opening(
  id: string,
  label: string,
  rooms: string[],
  kind: "door" | "window",
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  headHeight: number,
  sillHeight: number,
  hinge: "start" | "end" | undefined,
  confidence: "confirmed" | "plan-scaled",
  swingDirection?: 1 | -1,
  visualStyle?: PlannerOpening["visualStyle"],
): LegacyOpening {
  return { id, label, rooms, kind, start: point(x1, z1), end: point(x2, z2), headHeight, sillHeight, hinge, confidence, swingDirection, visualStyle };
}

function toPlannerOpening(source: LegacyOpening, forcedKind?: "passage"): PlannerOpening {
  const wall = findOpeningWall(source);
  const width = Math.hypot(source.end.x - source.start.x, source.end.z - source.start.z);
  const startDistance = distance(wall.start, source.start);
  const endDistance = distance(wall.start, source.end);
  const hingePoint = source.hinge === "end" ? source.end : source.start;
  const tangent = {
    x: (wall.end.x - wall.start.x) / deriveWallLength(wall),
    z: (wall.end.z - wall.start.z) / deriveWallLength(wall),
  };
  const offset = Math.min(startDistance, endDistance);
  const segmentStart = point(wall.start.x + tangent.x * offset, wall.start.z + tangent.z * offset);
  const segmentEnd = point(segmentStart.x + tangent.x * width, segmentStart.z + tangent.z * width);

  return {
    id: source.id,
    label: source.label,
    roomIds: source.rooms,
    wallId: wall.id,
    offset: Number(offset.toFixed(4)),
    width: Number(width.toFixed(4)),
    height: source.headHeight - (source.sillHeight ?? 0),
    sill: source.sillHeight ?? 0,
    kind: forcedKind ?? source.kind,
    hinge: source.kind === "door" && !forcedKind
      ? distance(segmentStart, hingePoint) <= distance(segmentEnd, hingePoint) ? "start" : "end"
      : "none",
    swingDirection: source.swingDirection ?? 1,
    swingDegrees: source.kind === "door" && !forcedKind ? 90 : 0,
    visualStyle: source.visualStyle,
    metadata: {
      source: "Bestätigtes Wohnungsmodell",
      confidence: source.confidence === "confirmed" ? "confirmed" : "estimated",
    },
  };
}

function findOpeningWall(source: LegacyOpening): PlannerWall {
  const candidates = wallGraph.walls
    .filter((wall) => wall.roomIds.some((roomId) => source.rooms.includes(roomId)))
    .filter((wall) => pointOnWall(source.start, wall) || pointOnWall(source.end, wall))
    .filter((wall) => openingCollinearWithWall(source, wall))
    .sort((left, right) => candidateOpeningScore(source, left) - candidateOpeningScore(source, right));
  const wall = candidates[0];
  if (!wall) throw new Error(`No wall found for opening ${source.id}`);
  return wall;
}

function openingCollinearWithWall(source: LegacyOpening, wall: PlannerWall) {
  const length = deriveWallLength(wall);
  return [source.start, source.end].every((candidate) => Math.abs(
    (candidate.x - wall.start.x) * (wall.end.z - wall.start.z)
      - (candidate.z - wall.start.z) * (wall.end.x - wall.start.x),
  ) / length <= 0.012);
}

function candidateOpeningScore(source: LegacyOpening, wall: PlannerWall) {
  const tangent = {
    x: (wall.end.x - wall.start.x) / deriveWallLength(wall),
    z: (wall.end.z - wall.start.z) / deriveWallLength(wall),
  };
  const projected = [source.start, source.end].map((point) => (
    (point.x - wall.start.x) * tangent.x + (point.z - wall.start.z) * tangent.z
  ));
  const beginsOnWall = Math.min(...projected) >= -0.012 && Math.min(...projected) <= deriveWallLength(wall) + 0.012;
  return (beginsOnWall ? 0 : 1000) + deriveWallLength(wall);
}

function pointOnWall(candidate: Point2, wall: PlannerWall) {
  const length = deriveWallLength(wall);
  const cross = Math.abs(
    (candidate.x - wall.start.x) * (wall.end.z - wall.start.z)
      - (candidate.z - wall.start.z) * (wall.end.x - wall.start.x),
  ) / length;
  return cross <= 0.012
    && distance(wall.start, candidate) <= length + 0.012
    && distance(wall.end, candidate) <= length + 0.012;
}

function distance(left: Point2, right: Point2) {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function builtIn(
  id: string,
  label: string,
  roomId: string,
  kind: "kitchen" | "sanitary" | "storage" | "other",
  catalogId: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  rotation: number,
  color: string,
  elevation = 0,
  metadata: PlannerBuiltIn["metadata"] = {
    source: "Lokaler Plan und Bildabgleich",
    confidence: "estimated",
    notes: ["Position plan- bzw. bildgerecht; Detailmaße aus Planmaßstab oder Bildproportion geschätzt"],
  },
): PlannerBuiltIn {
  return {
    id: `builtin-${id}`,
    label,
    roomId,
    kind,
    catalogId,
    position: point(x, z),
    elevation,
    rotation,
    size: { width, depth, height },
    locked: true,
    materialVariants: { main: color },
    metadata,
  };
}

function assumptionMetadata(note: string): NonNullable<PlannerBuiltIn["metadata"]> {
  return {
    source: "Nutzerwunsch und lokales Rendering",
    confidence: "estimated",
    notes: [`Annahme/Wunschplanung: ${note}`],
  };
}

function fixture(id: string, label: string, roomId: string, kind: string, x: number, z: number, height: number, rotation = 0): PlannerFixture {
  return {
    id: `fixture-${id}`,
    label,
    roomId,
    kind,
    position: point(x, z),
    height,
    rotation,
    metadata: {
      source: "Lokaler Plan, Elektroplan und Bildabgleich",
      confidence: "estimated",
      notes: ["Element belegt; genaue Achse/Höhe teilweise planmaßstäblich geschätzt"],
    },
  };
}

function placement(
  id: string,
  roomId: string,
  catalogId: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  rotation: number,
  materialId?: string,
  metadata: PlannerPlacement["metadata"] = {
    source: "Lokale Bestandsfotos und Handmaßskizze",
    confidence: "estimated",
    notes: ["Möbel und Material fotografisch belegt; genaue Position aus Handmaßskizze nur ca."],
  },
  groupId?: string,
): PlannerPlacement {
  return {
    id,
    roomId,
    catalogId,
    groupId,
    position: point(x, z),
    rotation,
    size: { width, depth, height },
    materialVariants: materialId ? { main: materialId } : undefined,
    metadata,
  };
}
