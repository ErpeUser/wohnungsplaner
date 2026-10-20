export type Point = { x: number; y: number };
export type RoomId = "zimmer1" | "vorraum";
export type Opening = {
  kind: "door" | "window";
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  swing?: {
    hinge: "start" | "end";
    openX: number;
    openY: number;
    sweep: 0 | 1;
  };
};
export type Measurement = {
  id: string;
  label: string;
  centimeters: number;
  source: "hand" | "plan" | "derived";
  confidence: "confirmed" | "plan-scaled" | "limited";
  note: string;
};
export type Room = {
  id: RoomId;
  name: string;
  area: string;
  subtitle: string;
  width: number;
  height: number;
  outline: Point[];
  openings: Opening[];
  measurements: Measurement[];
  facts: string[];
};

export type EvidenceFurniturePlacement = {
  key: "desk" | "wardrobe";
  name: string;
  w: number;
  d: number;
  h: number;
  x: number;
  y: number;
  rotation: number;
  confidence: "estimated";
  evidence: string;
  fixed: true;
};

export type DesignFurniturePlacement = {
  key: string;
  name: string;
  w: number;
  d: number;
  h: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  mountHeight?: number;
  nonBlocking?: boolean;
  role: string;
  evidence: string;
  fixed?: boolean;
  wall?: string;
  productId?: string;
  evidenceStatus?: "belegt" | "geschätzt" | "offen";
};

/** Keep plan-confirmed inventory immutable while leaving optional furniture editable. */
export const patchUnlockedFurniture = <T extends { id: string; fixed?: boolean }>(
  items: readonly T[],
  id: string,
  patch: Partial<T>,
) => items.map((item) => (item.id === id && !item.fixed ? { ...item, ...patch } : item));

export const removeUnlockedFurniture = <T extends { id: string; fixed?: boolean }>(
  items: readonly T[],
  id: string,
) => items.filter((item) => item.id !== id || item.fixed);

export function refreshZimmer1StableFurniture<T extends { id: string }>(
  stored: T[],
  fixed: T[],
  design: T[],
) {
  return [
    ...stored.filter(
      (item) =>
        !item.id.startsWith("zimmer1-evidence-") &&
        !item.id.startsWith("zimmer1-base-") &&
        !item.id.startsWith("zimmer1-design-"),
    ),
    ...fixed,
    ...design,
  ];
}

export type ObservedFixture = {
  id: string;
  kind: "ceiling-light" | "smoke-detector" | "light-switch" | "blind-control" | "vent-cover" | "outlet" | "multi-outlet" | "intercom" | "distribution-panel";
  label: string;
  x: number;
  y: number;
  elevation: number;
  surface: "ceiling" | "north" | "east" | "south" | "west";
  confidence: "visible" | "plan-confirmed" | "visible-and-plan";
  source: "photo" | "plan" | "photo+plan";
  note: string;
};

export const formatCentimeters = (meters: number) => `${Math.round(meters * 100)} cm`;

export const orderFloorPlanItems = <T extends { type: string }>(items: readonly T[]) =>
  [...items].sort(
    (left, right) => Number(left.type !== "rug") - Number(right.type !== "rug"),
  );

export const ZIMMER1_BED_AND_DECOR_TYPES = [
  "singleBed",
  "bed120",
  "doubleBed",
  "rug",
  "pouf",
  "nightstand",
  "plant",
  "curtain",
  "curtainRod",
  "hangingPlant",
  "smallPlant",
  "wallPanel",
  "wallShelf",
  "wallArt",
  "wallDecor",
  "ledStrip",
  "wallLamp",
  "wallClock",
] as const;

/**
 * Step 1: the selected Action window treatment for the 131 cm east-wall window.
 * The rod extends 22 cm past the opening on both sides, so the opened curtains
 * can stack outside the glass instead of stealing daylight.
 */
export const ZIMMER1_WINDOW_TREATMENT = {
  windowWidthCm: 131,
  wallBeforeWindowCm: 129,
  wallAfterWindowCm: 137,
  rodLengthCm: 175,
  extensionEachSideCm: 22,
  rodDiameterCm: 1.9,
  rodCenterHeightCm: 252,
  ceilingGapCm: 8,
  curtainCount: 2,
  curtainFlatWidthCm: 140,
  curtainProductHeightCm: 260,
  curtainFinishedHeightCm: 250,
  hemCm: 10,
  rodColor: "Schwarz",
  curtainColor: "Beige",
  rodProduct: "Studio Home Vorhangstange",
  curtainProduct: "Vorhang in Leinenoptik Lorris",
} as const;

export const ZIMMER1_WINDOW_TREATMENT_PRESET: DesignFurniturePlacement[] = [
  {
    key: "curtainRod",
    name: "Studio Home Vorhangstange · schwarz",
    w: 1.75,
    d: 0.04,
    h: 0.019,
    x: 3.51,
    y: 1.945,
    rotation: 90,
    color: "#242728",
    mountHeight: 2.52,
    nonBlocking: true,
    fixed: true,
    role: "Fensterstange · Schritt 1",
    evidence: "Action Studio Home, Ø 19 mm, von 120 bis 210 cm verstellbar. Für das 131-cm-Fenster auf 175 cm eingestellt: exakt 22 cm Überstand links und rechts.",
  },
  {
    key: "curtain",
    name: "Lorris Leinenoptik · links",
    w: 0.22,
    d: 0.08,
    h: 2.5,
    x: 3.50,
    y: 1.18,
    rotation: 90,
    color: "#d9cbb8",
    mountHeight: 0.02,
    nonBlocking: true,
    fixed: true,
    role: "geöffneter Vorhang · linkes Stoffpaket",
    evidence: "Ein Action Lorris Vorhang 140 × 260 cm in Beige; auf ca. 250 cm Fertighöhe gekürzt und geöffnet in der 22-cm-Zone neben dem Fenster gesammelt.",
  },
  {
    key: "curtain",
    name: "Lorris Leinenoptik · rechts",
    w: 0.22,
    d: 0.08,
    h: 2.5,
    x: 3.50,
    y: 2.71,
    rotation: 90,
    color: "#d9cbb8",
    mountHeight: 0.02,
    nonBlocking: true,
    fixed: true,
    role: "geöffneter Vorhang · rechtes Stoffpaket",
    evidence: "Zweiter Action Lorris Vorhang 140 × 260 cm in Beige; symmetrisch zur Gegenseite und außerhalb der 131-cm-Glasfläche gesammelt.",
  },
];

/** Step 2: three CARLO wall boards in the short desk/window corner. */
export const ZIMMER1_DESK_SHELF_PRESET: DesignFurniturePlacement[] = [
  {
    key: "wallShelf",
    name: "CARLO Wandboard 60 cm",
    w: 0.6,
    d: 0.12,
    h: 0.12,
    x: 3.49,
    y: 0.68,
    rotation: 90,
    color: "#f4f2ed",
    mountHeight: 1.06,
    nonBlocking: true,
    fixed: true,
    role: "unteres Wandboard in der Schreibtisch-/Fensterecke",
    evidence: "Möbelix CARLO 3er-Set: 60 × 12 × 12 cm. Unterkante rund 25 cm über der 75-cm-Tischplatte; endet 2 cm vor dem geöffneten Vorhangpaket.",
  },
  {
    key: "wallShelf",
    name: "CARLO Wandboard 50 cm",
    w: 0.5,
    d: 0.12,
    h: 0.105,
    x: 3.49,
    y: 0.82,
    rotation: 90,
    color: "#f4f2ed",
    mountHeight: 1.41,
    nonBlocking: true,
    fixed: true,
    role: "mittleres Wandboard in der Schreibtisch-/Fensterecke",
    evidence: "Möbelix CARLO 3er-Set: 50 × 10,5 × 12 cm; gegenüber dem unteren Board leicht zum Fenster versetzt.",
  },
  {
    key: "wallShelf",
    name: "CARLO Wandboard 40 cm",
    w: 0.4,
    d: 0.12,
    h: 0.09,
    x: 3.49,
    y: 0.64,
    rotation: 90,
    color: "#f4f2ed",
    mountHeight: 1.75,
    nonBlocking: true,
    fixed: true,
    role: "oberes Wandboard mit Hängepflanze",
    evidence: "Möbelix CARLO 3er-Set: 40 × 9 × 12 cm. Die leichte Staffelung hält Fensterbedienung und Lüftungsdeckel sichtbar und erreichbar.",
  },
  {
    key: "hangingPlant",
    name: "Action Kunst-Hängepflanze 48 cm",
    w: 0.22,
    d: 0.18,
    h: 0.48,
    x: 3.41,
    y: 0.75,
    rotation: 90,
    color: "#60785f",
    mountHeight: 1.73,
    nonBlocking: true,
    fixed: true,
    role: "hängender grüner Akzent auf dem oberen CARLO-Board",
    evidence: "Action Kunst-Hängepflanze im schwarzen Topf, Gesamtlänge 48 cm. Rechts auf dem oberen Board platziert, damit die Triebe frei neben den Boards fallen.",
  },
  {
    key: "smallPlant",
    name: "Action Mini-Sukkulente",
    w: 0.12,
    d: 0.12,
    h: 0.16,
    x: 3.41,
    y: 0.5,
    rotation: 90,
    color: "#71856e",
    mountHeight: 1.025,
    nonBlocking: true,
    fixed: true,
    role: "kleine Kunstpflanze auf dem unteren CARLO-Board",
    evidence: "Action Home Accents Kunst-Sukkulente im Topf; bewusst klein gewählt, damit Arbeitsplatz und Fensterwand ruhig bleiben.",
  },
];

/** Remove the bed and all proposal/decor objects while keeping the evidence-based room shell. */
export const removeZimmer1BedAndDecor = <T extends { id: string; type: string; fixed?: boolean }>(items: readonly T[]) =>
  items.filter(
    (item) =>
      !ZIMMER1_BED_AND_DECOR_TYPES.includes(item.type as (typeof ZIMMER1_BED_AND_DECOR_TYPES)[number]) &&
      !item.id.startsWith("zimmer1-design-") &&
      !item.id.startsWith("zimmer1-decor-"),
  );

export const openingLength = (opening: Opening) =>
  Math.hypot(opening.x2 - opening.x1, opening.y2 - opening.y1);

export const openingPlanLabelPlacement = (
  opening: Pick<Opening, "kind" | "x1" | "y1" | "x2" | "y2">,
  room: Pick<Room, "width" | "height">,
) => {
  const midX = (opening.x1 + opening.x2) / 2;
  const midY = (opening.y1 + opening.y2) / 2;
  const vertical = opening.x1 === opening.x2;
  const onRight = vertical && Math.abs(opening.x1 - room.width) < 0.01;
  const onBottom = !vertical && Math.abs(opening.y1 - room.height) < 0.01;
  const outsideVerticalDoor = opening.kind === "door" && vertical;

  return {
    x: midX + (vertical ? (onRight ? (outsideVerticalDoor ? 0.18 : -0.13) : outsideVerticalDoor ? -0.18 : 0.13) : 0),
    y: midY + (vertical ? 0 : onBottom ? -0.12 : -0.13),
    anchor: vertical ? (onRight ? (outsideVerticalDoor ? "start" : "end") : outsideVerticalDoor ? "end" : "start") : "middle",
  };
};

export const windowVerticalPlacement = () => ({
  sill: 0.62,
  head: 2.42,
  center: 1.52,
  height: 1.8,
  wallHeight: 2.6,
  verticalMullionRatio: 0.67,
  lowerRailRatio: 0.22,
});

export const planPointToWorld = (point: Point) => ({ x: point.x, z: point.y });

export const centeredCameraLookTarget = (
  position: readonly [number, number, number],
  yaw: number,
  pitch: number,
) => {
  const horizontal = Math.cos(pitch);
  return [
    position[0] + Math.cos(yaw) * horizontal,
    position[1] + Math.sin(pitch),
    position[2] + Math.sin(yaw) * horizontal,
  ] as const;
};

export const centeredRoomCameraPose = (room: Pick<Room, "id" | "width" | "height">) => {
  const position = [room.width / 2, 1.58, room.height / 2] as const;
  const yaw = room.id === "zimmer1" ? 0 : -Math.PI / 2;
  return {
    position,
    target: centeredCameraLookTarget(position, yaw, 0),
    up: [0, 1, 0] as const,
    yaw,
    pitch: 0,
  };
};

/** A restrained zoom range that reveals the room edges without an extreme fisheye view. */
export const cameraFieldOfViewForZoom = (requestedLevel: number) => {
  const level = Math.max(-5, Math.min(4, Math.round(requestedLevel)));
  return 66 - level * 6;
};

export type RoomCornerCameraView = {
  id: "north-west" | "north-east" | "entrance" | "wardrobe-gap";
  title: string;
  dimensions: string;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  walls: readonly ["north" | "east" | "south" | "west", "north" | "east" | "south" | "west"];
  fieldOfView: number;
};

/** Four printable eye-level views, each standing inside a corner and looking across two adjacent walls. */
export const roomCornerCameraViews = (room: Pick<Room, "id" | "width" | "height">): RoomCornerCameraView[] => {
  if (room.id === "zimmer1") {
    return [
      {
        id: "north-west",
        title: "Fensterwand",
        dimensions: "Ostwand · 129 cm Wand + 131 cm Fenster + 137 cm Restwand",
        position: [0.48, 1.58, 1.9],
        target: [3.56, 1.35, 1.9],
        walls: ["east", "east"],
        fieldOfView: 70,
      },
      {
        id: "north-east",
        title: "Obere Wand",
        dimensions: "Nordwand · 356 cm · Bett-Längsseite und leichte Leinwände",
        position: [2.78, 1.58, 2.35],
        target: [1.35, 1.42, 0],
        walls: ["north", "north"],
        fieldOfView: 76,
      },
      {
        id: "entrance",
        title: "Schrank / Eingang",
        dimensions: "Südseite · Schrank 225 × 62 cm · 25 cm Abstand · Tür 80 cm",
        position: [1.78, 1.58, 0.55],
        target: [1.95, 1.3, 3.48],
        walls: ["south", "south"],
        fieldOfView: 76,
      },
      {
        id: "wardrobe-gap",
        title: "Linke Wand",
        dimensions: "Westwand · Kopfteilpaneele, Leselicht und freie Wandzone",
        position: [3.05, 1.58, 1.9],
        target: [0, 1.4, 1.9],
        walls: ["west", "west"],
        fieldOfView: 70,
      },
    ];
  }

  const inset = 0.2;
  const eye = 1.58;
  const lowX = inset;
  const highX = Number((room.width - inset).toFixed(3));
  const lowZ = inset;
  const highZ = Number((room.height - inset).toFixed(3));
  return [
    { id: "north-west", title: "Nordwest-Ecke", dimensions: "Blick auf Ost- und Südwand", position: [lowX, eye, lowZ], target: [highX, 1.25, highZ], walls: ["east", "south"], fieldOfView: 80 },
    { id: "north-east", title: "Nordost-Ecke", dimensions: "Blick auf Süd- und Westwand", position: [highX, eye, lowZ], target: [lowX, 1.25, highZ], walls: ["south", "west"], fieldOfView: 80 },
    { id: "entrance", title: "Südost-Ecke", dimensions: "Blick auf West- und Nordwand", position: [highX, eye, highZ], target: [lowX, 1.25, lowZ], walls: ["west", "north"], fieldOfView: 80 },
    { id: "wardrobe-gap", title: "Südwest-Ecke", dimensions: "Blick auf Nord- und Ostwand", position: [lowX, eye, highZ], target: [highX, 1.25, lowZ], walls: ["north", "east"], fieldOfView: 80 },
  ];
};

/** One deliberate walking step from the room center toward Zimmer 1's east/window wall. */
export const zimmer1CameraStepPose = (room: Pick<Room, "id" | "width" | "height">, requestedStep: number) => {
  const center = centeredRoomCameraPose(room);
  const step = Math.max(-2, Math.min(2, Math.round(requestedStep)));
  const steppedX = Math.max(0.45, Math.min(room.width - 0.45, center.position[0] + step * 0.5));
  const position = [Number(steppedX.toFixed(3)), center.position[1], center.position[2]] as const;
  return {
    position,
    target: centeredCameraLookTarget(position, center.yaw, center.pitch),
    up: center.up,
    yaw: center.yaw,
    pitch: center.pitch,
  };
};

export const zimmer1WindowStepCameraPose = (room: Pick<Room, "id" | "width" | "height">) =>
  zimmer1CameraStepPose(room, 1);

export const EVIDENCE_FURNITURE_APPEARANCE = {
  desk: {
    kind: "drawer-desk",
    drawerCount: 4,
    hasMonitor: false,
  },
  wardrobe: {
    panels: ["white", "white", "mirror", "white", "white"] as const,
    drawerPanels: [1, 3] as const,
    doorsClosed: true,
  },
} as const;

export const ZIMMER1_OBSERVED_FIXTURES: ObservedFixture[] = [
  {
    id: "ceiling-light",
    kind: "ceiling-light",
    label: "Deckenanschluss",
    x: 1.78,
    y: 1.7,
    elevation: 2.56,
    surface: "ceiling",
    confidence: "visible-and-plan",
    source: "photo+plan",
    note: "Hängende Fassung in Foto und Video; Lage zusätzlich aus dem Deckensymbol des Vermietungsplans skaliert.",
  },
  {
    id: "smoke-detector",
    kind: "smoke-detector",
    label: "Rauchmelder",
    x: 1.78,
    y: 1.08,
    elevation: 2.57,
    surface: "ceiling",
    confidence: "visible-and-plan",
    source: "photo+plan",
    note: "Zweiter Deckenpunkt oberhalb des Schrankbereichs; in den Aufnahmen blau abgedeckt und im Plan als Rauchmelder markiert.",
  },
  {
    id: "entrance-switch",
    kind: "light-switch",
    label: "Lichtschalter",
    x: 3.53,
    y: 3.62,
    elevation: 1.05,
    surface: "east",
    confidence: "plan-confirmed",
    source: "plan",
    note: "Schalter an der Ost-/Fensterwand neben der Zimmertür; Wandzuordnung belegt, exakte Koordinate und Höhe aus Plan/Fotos angenähert.",
  },
  {
    id: "blind-control",
    kind: "blind-control",
    label: "Fensterbedienung",
    x: 3.53,
    y: 1.25,
    elevation: 1.2,
    surface: "east",
    confidence: "visible",
    source: "photo",
    note: "Kleines weißes Bedienelement an der Wand links neben dem Fenster.",
  },
  {
    id: "vent-cover",
    kind: "vent-cover",
    label: "Lüftungsdeckel",
    x: 3.53,
    y: 0.61,
    elevation: 2.02,
    surface: "east",
    confidence: "visible",
    source: "photo",
    note: "Quadratischer weißer Deckel oberhalb des Schreibtischbereichs.",
  },
  {
    id: "free-wall-outlet",
    kind: "outlet",
    label: "Steckdose",
    x: 0.03,
    y: 2.18,
    elevation: 0.3,
    surface: "west",
    confidence: "visible",
    source: "photo",
    note: "Niedrige Steckdose an der freien Wand, in den Aufnahmen teilweise von der Matratze verdeckt.",
  },
  {
    id: "north-triple-outlet",
    kind: "multi-outlet",
    label: "3-fach-Steckdose",
    x: 0.5,
    y: 0.03,
    elevation: 0.3,
    surface: "north",
    confidence: "plan-confirmed",
    source: "plan",
    note: "Dreifach-Steckdose an der freien Stirnwand; direkt aus dem Elektrosymbol im Vermietungsplan übernommen.",
  },
  {
    id: "south-media-outlets",
    kind: "multi-outlet",
    label: "Strom / TV / Internet",
    x: 1.82,
    y: 3.3,
    elevation: 0.3,
    surface: "south",
    confidence: "plan-confirmed",
    source: "plan",
    note: "Anschlussgruppe an der Schrankwand; im Bestand durch den Kleiderschrank verdeckt.",
  },
];

export const VORRAUM_OBSERVED_FIXTURES: ObservedFixture[] = [
  {
    id: "hall-ceiling-light",
    kind: "ceiling-light",
    label: "Deckenanschluss",
    x: 1.15,
    y: 1.13,
    elevation: 2.56,
    surface: "ceiling",
    confidence: "visible-and-plan",
    source: "photo+plan",
    note: "Hängende Fassung im Foto und zentrales Deckensymbol im Vermietungsplan.",
  },
  {
    id: "hall-smoke-detector",
    kind: "smoke-detector",
    label: "Rauchmelder",
    x: 0.72,
    y: 1.55,
    elevation: 2.57,
    surface: "ceiling",
    confidence: "visible",
    source: "photo",
    note: "Blau abgedeckter runder Deckenpunkt in den Vorraumaufnahmen.",
  },
  {
    id: "hall-intercom",
    kind: "intercom",
    label: "Gegensprechanlage",
    x: 0.03,
    y: 1.08,
    elevation: 1.42,
    surface: "west",
    confidence: "visible-and-plan",
    source: "photo+plan",
    note: "Schwarzes Bedienfeld neben der Wohnungseingangstür; auch im Plan verzeichnet.",
  },
  {
    id: "hall-entrance-switch",
    kind: "light-switch",
    label: "Lichtschalter Eingang",
    x: 0.03,
    y: 1.14,
    elevation: 1.05,
    surface: "west",
    confidence: "visible",
    source: "photo",
    note: "Weißer Schalter unterhalb der Gegensprechanlage.",
  },
  {
    id: "hall-distribution-panel",
    kind: "distribution-panel",
    label: "Elektroverteiler",
    x: 2.23,
    y: 1.78,
    elevation: 1.45,
    surface: "east",
    confidence: "visible-and-plan",
    source: "photo+plan",
    note: "Große flächenbündige weiße Abdeckung an der Wand zum Wohnraum.",
  },
  {
    id: "hall-low-outlet",
    kind: "outlet",
    label: "Steckdose Eingang",
    x: 0.03,
    y: 1.12,
    elevation: 0.3,
    surface: "west",
    confidence: "visible",
    source: "photo",
    note: "Niedrige Steckdose im Eingangsbereich.",
  },
];

export const ROOM_FIXTURES: Record<RoomId, ObservedFixture[]> = {
  zimmer1: ZIMMER1_OBSERVED_FIXTURES,
  vorraum: VORRAUM_OBSERVED_FIXTURES,
};

export const ZIMMER1_PC_AND_WARDROBE_PRESET: EvidenceFurniturePlacement[] = [
  {
    key: "desk",
    name: "Schreibtisch (Bestand)",
    w: 1.29,
    d: 0.55,
    h: 0.75,
    x: 3.285,
    y: 0.645,
    rotation: 90,
    confidence: "estimated",
    fixed: true,
    evidence: "129 × 55 × ca. 75 cm; Fotos, Video, Handskizze und das ältere Grundbestands-PDF belegen den Tisch parallel an der Fenster-/Ostwand im 129-cm-Abschnitt vor dem Fenster. Fußfläche x=301–356 cm und y=0–129 cm.",
  },
  {
    key: "wardrobe",
    name: "Kleiderschrank (Bestand)",
    w: 2.25,
    d: 0.62,
    h: 2.2,
    x: 1.125,
    y: 3.02,
    rotation: 180,
    confidence: "estimated",
    fixed: true,
    evidence: "225 × 62 × ca. 220 cm; 225 × 62 cm sind ausschließlich das Möbelmaß. Der Schrank steht auf der vom Eingang abgewandten Seite bündig; nur zur Eingangsseite bleiben die handschriftlich markierten 25 cm. Foto und Video zeigen fünf geschlossene, flächenbündige Fronten: mittig Spiegel, schwarze Doppelschubladen in den beiden Nachbarfeldern. Nur die Höhe bleibt geschätzt.",
  },
];

export type Zimmer1LayoutComparison = {
  id: "door-none" | "door-nightstand" | "door-lack-vertical" | "door-lack-horizontal";
  title: string;
  bedside: "none" | "nightstand" | "lack-vertical" | "lack-horizontal";
  desk: Pick<DesignFurniturePlacement, "x" | "y" | "w" | "d" | "rotation">;
  deskToBedCm: number;
  openWardrobeDoorClearanceCm: number;
  recommended: boolean;
};

const deskAtWindowWall = { x: 3.285, y: 0.645, w: 1.29, d: 0.55, rotation: 90 };

/**
 * Four like-for-like bedside studies with the confirmed desk direction fixed.
 * Clearance values come from the same coordinates as the interactive plan:
 * open wardrobe-door edge 226 cm, nightstand edge 171.5 cm and upright LACK
 * edge 172 cm. The horizontal LACK is wall-mounted above the bed zone.
 */
export const ZIMMER1_LAYOUT_COMPARISONS: Zimmer1LayoutComparison[] = [
  {
    id: "door-none",
    title: "Ohne Ablage",
    bedside: "none",
    desk: deskAtWindowWall,
    deskToBedCm: 81,
    openWardrobeDoorClearanceCm: 84,
    recommended: false,
  },
  {
    id: "door-nightstand",
    title: "Action-Nachttisch",
    bedside: "nightstand",
    desk: deskAtWindowWall,
    deskToBedCm: 81,
    openWardrobeDoorClearanceCm: 54.5,
    recommended: true,
  },
  {
    id: "door-lack-vertical",
    title: "LACK hochkant",
    bedside: "lack-vertical",
    desk: deskAtWindowWall,
    deskToBedCm: 81,
    openWardrobeDoorClearanceCm: 54,
    recommended: false,
  },
  {
    id: "door-lack-horizontal",
    title: "LACK waagerecht",
    bedside: "lack-horizontal",
    desk: deskAtWindowWall,
    deskToBedCm: 81,
    openWardrobeDoorClearanceCm: 84,
    recommended: false,
  },
];

/**
 * Maßhaltiger Einrichtungsvorschlag für Zimmer 1. Die drei Bestandselemente
 * bleiben separat in ZIMMER1_PC_AND_WARDROBE_PRESET; diese Liste ergänzt nur
 * Bett, Textilien, Deko und Wandobjekte.
 */
export const ZIMMER1_DESIGN_PRESET: DesignFurniturePlacement[] = [
  {
    key: "bed120",
    name: "Polsterbett BERO 120 x 200",
    w: 1.42,
    d: 2.2,
    h: 1.3,
    x: 1.1,
    y: 0.71,
    rotation: 270,
    color: "#ded4c9",
    fixed: true,
    role: "Kopfteil an der linken Wand",
    evidence: "Möbelix BERO, geprüft 20.10.2026: Liegefläche 120 × 200 cm, Außenmaß 142 × 220 × 130 cm. Das Kopfteil liegt an der linken Wand; die 220-cm-Längsachse folgt der oberen Wand. Die Shopfarbe ist widersprüchlich als Grau/Creme bezeichnet und bleibt offen.",
  },
  {
    key: "rug",
    name: "Teppich 140 x 200",
    w: 1.4,
    d: 2,
    h: 0.02,
    x: 1.05,
    y: 0.72,
    rotation: 90,
    color: "#e7ddd0",
    nonBlocking: true,
    role: "weicher Mittelpunkt",
    evidence: "Zielmaß 140 x 200 cm; um 90 Grad parallel unter dem Bett und an der Tischseite leicht überstehend.",
  },
  {
    key: "chair",
    name: "PC-Stuhl",
    w: 0.55,
    d: 0.55,
    h: 0.82,
    x: 2.7,
    y: 0.94,
    rotation: 90,
    color: "#879b99",
    role: "Arbeitsplatz",
    evidence: "Freiraum vor dem 129 x 55 cm Bestandstisch; nicht vor Fenster oder Tür stellen.",
  },
  {
    key: "wallMirror",
    name: "Spiegel über PC-Tisch",
    w: 1.1,
    d: 0.04,
    h: 0.7,
    x: 2.915,
    y: 0.04,
    rotation: 0,
    mountHeight: 1.28,
    nonBlocking: true,
    role: "Spiegel über dem Tisch",
    evidence: "Ca. 110 x 70 cm, mittig über dem zur Tür ausgerichteten Bestandstisch an der oberen Wand; Unterkante ca. 12 cm über der Tischplatte.",
  },
  {
    key: "nightstand",
    name: "Action Nachttisch 27,5 x 37,5",
    w: 0.275,
    d: 0.375,
    h: 0.505,
    x: 0.1875,
    y: 1.5775,
    rotation: 90,
    color: "#ded4c9",
    fixed: false,
    role: "kompakte Ablage an der freien Längsseite",
    evidence: "Action Nachttisch 27,5 x 37,5 x 50,5 cm, beige/grau, gepolsterte Seiten und zwei Schubladen. Im empfohlenen Plan steht er mit 2 cm Abstand rechts/südlich neben dem Kopfende.",
  },
  {
    key: "plant",
    name: "Pflanze im Korb",
    w: 0.34,
    d: 0.34,
    h: 1.25,
    x: 0.26,
    y: 2.38,
    rotation: 0,
    color: "#8fa18b",
    nonBlocking: true,
    role: "grüner Akzent",
    evidence: "Schmale Pflanze in der freien Ecke; Steckdose an der Westwand bleibt zugänglich.",
  },
  {
    key: "wallArt",
    name: "Wandbild Bett-Ecke A",
    w: 0.3,
    d: 0.03,
    h: 0.4,
    x: 0.78,
    y: 0.04,
    rotation: 0,
    mountHeight: 1.32,
    nonBlocking: true,
    role: "ruhiges Diptychon über der langen Bettseite",
    evidence: "30 x 40 cm großer Rahmen an der oberen Wand, mit abstraktem beige/olivfarbenem Druck. Leichtes Bild statt Ablage; das gewendete Kopfteil an der linken Stirnseite bleibt frei.",
  },
  {
    key: "wallArt",
    name: "Wandbild Bett-Ecke B",
    w: 0.3,
    d: 0.03,
    h: 0.4,
    x: 1.22,
    y: 0.04,
    rotation: 0,
    mountHeight: 1.32,
    nonBlocking: true,
    role: "ruhiges Diptychon über der langen Bettseite",
    evidence: "Zweiter 30 x 40 cm großer Rahmen an derselben Wand. 14 cm Abstand zwischen den Rahmen hält das Paar ruhig und maßhaltig.",
  },
  {
    key: "ledStrip",
    name: "Spiegel-Hinterleuchtung",
    w: 1.02,
    d: 0.02,
    h: 0.62,
    x: 3.545,
    y: 0.645,
    rotation: 90,
    mountHeight: 1.28,
    nonBlocking: true,
    role: "indirektes Licht am Arbeitsplatz",
    evidence: "2700-K-COB-Licht als umlaufende, dimmbare Hinterleuchtung innerhalb des 110 x 70 cm großen Spiegels. Dadurch bleibt die Bett-Ecke ruhig und der bestehende Deckenanschluss unangetastet.",
  },
  {
    key: "wallDecor",
    name: "Reliefbild Eingang",
    w: 0.3,
    d: 0.03,
    h: 0.4,
    x: 3.52,
    y: 3.05,
    rotation: 90,
    mountHeight: 1.48,
    nonBlocking: true,
    role: "ruhiger Eingangs-Akzent",
    evidence: "30 x 40 cm großes Reliefbild in Beige mit Holzrahmen an der Restwand nach dem Fenster. Es sitzt mittig im freien Wandfeld und hält Abstand zu Fenster, Lichtschalter und Türschwenk.",
  },
  {
    key: "wallPanel",
    name: "Lamellenpaneel hinter dem Kopfteil",
    w: 0.6,
    d: 0.02,
    h: 1.2,
    x: 0.08,
    y: 0.62,
    rotation: 90,
    mountHeight: 1.06,
    color: "#c9b29b",
    nonBlocking: true,
    role: "ruhige Akzentwand hinter dem Bett",
    evidence: "60 x 120 x 2 cm Lamellen-/Akustikpaneel an der linken Wand hinter dem Kopfteil. Es bleibt oberhalb und hinter dem Polsterkopfteil sichtbar, ersetzt kein Regal und verstellt weder Steckdose noch Laufweg.",
  },
  {
    key: "wallShelf",
    name: "Schmale Bilderleiste freie Wand",
    w: 0.77,
    d: 0.1,
    h: 0.04,
    x: 0.08,
    y: 2.15,
    rotation: 90,
    mountHeight: 1.38,
    color: "#b99b78",
    nonBlocking: true,
    role: "kleine Deko-Zone an der freien Westwand",
    evidence: "77 x 10 x 4 cm schmale Bilderleiste an der freien Wand hinter der Bettzone, nicht über dem Bett. Sie nimmt zwei kleine Rahmen, ein Buchset und eine kleine Vase auf und lässt Steckdose sowie Laufweg frei.",
  },
];

/**
 * Separate, source-corrected decor variant. Every item below has complete
 * exterior dimensions from an Austrian Action or Möbelix product page.
 */
export const ZIMMER1_DECORATED_PRESET: DesignFurniturePlacement[] = [
  ...[0.26, 0.56, 0.86, 1.16].map((y, index) => ({
    key: "wallPanel",
    name: `Action Holz-Wandpaneel ${index + 1}/4`,
    w: 0.3,
    d: 0.01,
    h: 0.6,
    x: 0.015,
    y,
    rotation: 90,
    color: "#8f725d",
    mountHeight: 1.45,
    nonBlocking: true,
    fixed: true,
    wall: "Linke Wand · hinter dem Kopfteil",
    productId: "action-holzpaneele",
    evidenceStatus: "belegt" as const,
    role: "vier leichte Paneele als 120 × 60 cm großes Kopfteilfeld",
    evidence: "Action Wandpaneele aus Holz, Art. 3206937: je 60 × 30 × 1 cm. Vier Paneele hochkant ergeben exakt 120 × 60 cm; Feld mittig zur 120-cm-Liegefläche, Unterkante 115 cm, Oberkante 175 cm.",
  })),
  {
    key: "wallLamp",
    name: "Action LED-Wandlampe · Leselicht",
    w: 0.08,
    d: 0.1,
    h: 0.1,
    x: 0.055,
    y: 1.56,
    rotation: 90,
    color: "#292d2d",
    mountHeight: 1.48,
    nonBlocking: true,
    fixed: true,
    wall: "Linke Wand · offene Bettseite",
    productId: "action-led-wandlampe",
    evidenceStatus: "belegt",
    role: "aufladbares Leselicht neben dem Kopfteil",
    evidence: "Action aufladbare LED-Wandlampe, Art. 3015581: 8 × 10 × 10 cm, warmweiß, Montage mit 3M-Klebeband oder mitgelieferter Schraube. 14 cm Abstand zum äußeren Kopfteilrand; keine Leitung und kein schwerer Gegenstand über dem Bett.",
  },
  {
    key: "wallArt",
    name: "Möbelix Geometry Grün/Beige",
    w: 0.4,
    d: 0.012,
    h: 0.6,
    x: 0.72,
    y: 0.025,
    rotation: 0,
    color: "#889078",
    mountHeight: 1.65,
    nonBlocking: true,
    fixed: true,
    wall: "Obere Wand · leichte Bildzone",
    productId: "moebelix-geometry",
    evidenceStatus: "belegt",
    role: "leichte Leinwand über der langen Bettseite",
    evidence: "Möbelix Artgeist Geometry Grün/Beige, Art. 4875015401: 40 × 60 × 1,2 cm. Unterkante 135 cm, Oberkante 195 cm; flacher Keilrahmen, fest an der Wand montieren.",
  },
  {
    key: "wallArt",
    name: "Möbelix Abstraction Beige/Oliv/Cognac",
    w: 0.4,
    d: 0.012,
    h: 0.6,
    x: 1.32,
    y: 0.025,
    rotation: 0,
    color: "#b68f70",
    mountHeight: 1.65,
    nonBlocking: true,
    fixed: true,
    wall: "Obere Wand · leichte Bildzone",
    productId: "moebelix-abstraction",
    evidenceStatus: "belegt",
    role: "zweite leichte Leinwand über der langen Bettseite",
    evidence: "Möbelix Artgeist Abstraction Beige/Olivgrün/Cognac, Art. 4875003701: 40 × 60 × 1,2 cm. 20 cm Abstand zum ersten Bild; keine Ablage und kein Glas über dem Bett.",
  },
  {
    key: "wallArt",
    name: "Möbelix Leinwandbild 41-807",
    w: 1,
    d: 0.03,
    h: 0.4,
    x: 0.035,
    y: 2.18,
    rotation: 90,
    color: "#b9a589",
    mountHeight: 1.5,
    nonBlocking: true,
    fixed: true,
    wall: "Linke Wand · freie Wandzone",
    productId: "moebelix-41-807",
    evidenceStatus: "belegt",
    role: "ruhiger horizontaler Anker außerhalb der Bettzone",
    evidence: "Möbelix Leinwandbild 41-807, Art. 5749037501: 100 × 40 × 3 cm. Unterkante 130 cm; seitlich außerhalb des Kopfteils und 100 cm oberhalb der niedrigen Steckdose.",
  },
  {
    key: "plant",
    name: "Möbelix Kunstpflanze Miscanthusgras",
    w: 0.2,
    d: 0.2,
    h: 0.9,
    x: 3.42,
    y: 2.75,
    rotation: 0,
    color: "#71856e",
    nonBlocking: true,
    fixed: true,
    wall: "Fensterwand · freie Ecke nach dem Fenster",
    productId: "moebelix-miscanthus",
    evidenceStatus: "belegt",
    role: "schmaler grüner Akzent außerhalb von Fenster und Türschwenk",
    evidence: "Möbelix Kunstpflanze Miscanthusgras, Art. 4297205201: 20 × 90 × 20 cm. Fußfläche y=265–285 cm; 5 cm nach Fensterende und 32 cm vor der Türschwenkzone.",
  },
  {
    key: "wallClock",
    name: "Action Wanduhr · Beige",
    w: 0.2,
    d: 0.04,
    h: 0.2,
    x: 3.52,
    y: 2.92,
    rotation: 90,
    color: "#d7c7ad",
    mountHeight: 1.58,
    nonBlocking: true,
    fixed: true,
    wall: "Fensterwand · Restwand zum Eingang",
    productId: "action-wanduhr",
    evidenceStatus: "belegt",
    role: "flacher funktionaler Akzent über der Pflanze",
    evidence: "Action Wanduhr, Art. 3204371: Ø 20 × 4 cm. Mittelpunkt 158 cm; 22 cm Abstand zum Fensterende und 15 cm vor Beginn der Türschwenkzone.",
  },
];

export type Zimmer1ComparisonPlacement = {
  key: "desk" | "wardrobe" | "wallMirror" | "bed120" | "nightstand" | "shelf";
  x: number;
  y: number;
  rotation: number;
  w?: number;
  d?: number;
  h?: number;
  mountHeight?: number;
};

/** Furniture coordinates shared by the interactive 3D comparison and its 2D plans. */
export function buildZimmer1ComparisonPlacements(comparisonId: string): Zimmer1ComparisonPlacement[] {
  const variant = ZIMMER1_LAYOUT_COMPARISONS.find((candidate) => candidate.id === comparisonId)
    ?? ZIMMER1_LAYOUT_COMPARISONS[0];
  const placements: Zimmer1ComparisonPlacement[] = [
    { key: "desk", x: variant.desk.x, y: variant.desk.y, rotation: variant.desk.rotation },
    { key: "wardrobe", x: 1.125, y: 3.02, rotation: 180 },
    { key: "wallMirror", x: 3.52, y: 0.645, rotation: 90 },
    { key: "bed120", x: 1.1, y: 0.71, rotation: 270 },
  ];
  if (variant.bedside === "nightstand") {
    placements.push({ key: "nightstand", x: 0.1875, y: 1.5775, rotation: 90 });
  }
  if (variant.bedside === "lack-vertical") {
    placements.push({ key: "shelf", x: 0.14, y: 1.57, rotation: 270, w: 0.3, d: 0.28, h: 1.9 });
  }
  if (variant.bedside === "lack-horizontal") {
    placements.push({ key: "shelf", x: 0.14, y: 1.1, rotation: 270, w: 1.9, d: 0.28, h: 0.3, mountHeight: 1.55 });
  }
  return placements;
}

export const zimmer1ComparisonCamera = () => ({
  position: [1.78, 1.58, 1.985] as const,
  yaw: -3.1,
  fieldOfView: 82,
});

/** Fixed export view from the entrance corner toward the bed and desk walls. */
export const zimmer1AnnotatedCornerCamera = () => ({
  position: [3.25, 1.65, 2.92] as const,
  yaw: -2.05,
  pitch: -0.16,
  fieldOfView: 82,
});

export const ZIMMER1_ANNOTATED_MEASURES = [
  { label: "Raum", value: "356 × 397 cm" },
  { label: "Bett außen", value: "142 × 220 cm" },
  { label: "Schreibtisch", value: "129 × 55 cm" },
  { label: "Spiegel", value: "110 × 70 cm" },
  { label: "Bett–Tisch", value: "81 cm" },
  { label: "vor offener Schranktür", value: "84 cm" },
  { label: "Eingangsspalt", value: "25 cm" },
] as const;

export const ROOM_DEFINITIONS: Record<RoomId, Room> = {
  zimmer1: {
    id: "zimmer1",
    name: "Zimmer 1",
    area: "12,36 m²",
    subtitle: "Schlaf- / Arbeitszimmer",
    width: 3.56,
    height: 3.97,
    outline: [
      { x: 0, y: 0 },
      { x: 3.56, y: 0 },
      { x: 3.56, y: 3.97 },
      { x: 2.5, y: 3.97 },
      { x: 2.5, y: 3.33 },
      { x: 0, y: 3.33 },
    ],
    openings: [
      { kind: "window", label: "Fenster", x1: 3.56, y1: 1.29, x2: 3.56, y2: 2.6 },
      { kind: "door", label: "Tür", x1: 2.7, y1: 3.97, x2: 3.5, y2: 3.97, swing: { hinge: "end", openX: 3.5, openY: 3.17, sweep: 1 } },
    ],
    measurements: [
      { id: "overall-width", label: "Gesamtbreite", centimeters: 356, source: "hand", confidence: "confirmed", note: "Direkt in der Handskizze eingetragen." },
      { id: "window-wall", label: "Fensterwand gesamt", centimeters: 397, source: "hand", confidence: "confirmed", note: "Maßkette 129 + 131 + 137 cm." },
      { id: "window-start", label: "Wandabschnitt vor Fenster", centimeters: 129, source: "hand", confidence: "confirmed", note: "Erster Abschnitt der Fensterwand. Der 129-cm-Schreibtisch steht hier parallel zur Fenster-/Ostwand; Fotos, Video, Handskizze und Grundbestands-PDF stimmen überein." },
      { id: "window-width", label: "Fensteröffnung", centimeters: 131, source: "hand", confidence: "confirmed", note: "Nicht mit der 80-cm-Tür verwechseln." },
      { id: "window-end", label: "Wand nach Fenster", centimeters: 137, source: "hand", confidence: "confirmed", note: "Letzter Abschnitt der Fensterwand." },
      { id: "door-width", label: "Türöffnung", centimeters: 80, source: "plan", confidence: "confirmed", note: "Im Vermietungsplan mit 80/200 cm bemaßt." },
      { id: "door-wall-return", label: "Hinter geöffnetem Türblatt", centimeters: 6, source: "plan", confidence: "plan-scaled", note: "Kurzer Wandrücksprung zwischen rechtem Türanschlag und Fensterwand; aus dem Vermietungsplan maßstäblich abgeleitet." },
      { id: "wardrobe-width", label: "Schrankbreite (Bestand)", centimeters: 225, source: "hand", confidence: "confirmed", note: "Direkt an der Schrankfront eingetragen; das Video zeigt denselben fünftürigen Schrank." },
      { id: "clear-depth-to-wardrobe", label: "Freie Tiefe bis Schrankfront", centimeters: 270, source: "hand", confidence: "limited", note: "Bis zur Vorderkante des vorhandenen Schranks gemessen, nicht bis zur dahinterliegenden Wand." },
      { id: "desk-size", label: "Schreibtisch (Bestand)", centimeters: 129, source: "hand", confidence: "confirmed", note: "Handschriftliches Möbelmaß 129 × 55 cm; parallel an der Fenster-/Ostwand im 129-cm-Abschnitt." },
      { id: "desk-depth", label: "Schreibtischtiefe", centimeters: 55, source: "hand", confidence: "confirmed", note: "Zweites handschriftliches Möbelmaß; die Tischplatte ist 55 cm tief." },
      { id: "wardrobe-depth", label: "Schranktiefe (Bestand)", centimeters: 62, source: "hand", confidence: "confirmed", note: "225 × 62 cm ist das Möbelmaß des vorhandenen Schranks, keine Raumwand." },
      { id: "wardrobe-gap", label: "Abstand zur Eingangsseite", centimeters: 25, source: "hand", confidence: "confirmed", note: "Der Abstand liegt nur auf der Eingangsseite; die gegenüberliegende Schrankseite steht bündig." },
    ],
    facts: ["Breite 356 cm", "Fensterwand 397 cm", "Wand 129 cm + Fenster 131 cm + Restwand 137 cm", "Tür 80 cm", "Schreibtisch 129 × 55 cm · parallel an der Fensterwand", "Schrank 225 × 62 cm", "Links bündig · rechts exakt 25 cm bis zur Eingangswand", "Freie Tiefe bis Schrankfront ca. 270 cm", "Stabparkett · weiße Wände"],
  },
  vorraum: {
    id: "vorraum",
    name: "Vorraum",
    area: "5,20 m²",
    subtitle: "Eingang und Verteiler",
    width: 2.26,
    height: 2.33,
    outline: [
      { x: 0, y: 0 },
      { x: 2.26, y: 0 },
      { x: 2.26, y: 2.33 },
      { x: 0, y: 2.33 },
    ],
    openings: [
      { kind: "door", label: "WC", x1: 0.08, y1: 0, x2: 0.88, y2: 0, swing: { hinge: "end", openX: 0.88, openY: 0.8, sweep: 0 } },
      { kind: "door", label: "Abstellraum", x1: 1.38, y1: 0, x2: 2.18, y2: 0, swing: { hinge: "start", openX: 1.38, openY: 0.8, sweep: 1 } },
      { kind: "door", label: "Wohnküche", x1: 2.26, y1: 0.02, x2: 2.26, y2: 0.82, swing: { hinge: "end", openX: 3.06, openY: 0.82, sweep: 0 } },
      { kind: "door", label: "Bad", x1: 1.35, y1: 2.33, x2: 2.15, y2: 2.33, swing: { hinge: "end", openX: 2.15, openY: 3.13, sweep: 0 } },
      { kind: "door", label: "Eingang", x1: 0, y1: 0.1, x2: 0, y2: 0.9, swing: { hinge: "end", openX: 0.8, openY: 0.9, sweep: 1 } },
    ],
    measurements: [
      { id: "hall-width", label: "Breite", centimeters: 226, source: "hand", confidence: "confirmed", note: "Direkt in der Handskizze eingetragen." },
      { id: "hall-depth", label: "Tiefe", centimeters: 233, source: "plan", confidence: "plan-scaled", note: "Aus dem Vermietungsplan M 1:50 skaliert." },
      { id: "hall-doors", label: "Türöffnungen", centimeters: 80, source: "plan", confidence: "confirmed", note: "Im Vermietungsplan jeweils mit 80/200 cm bemaßt." },
    ],
    facts: ["Breite 226 cm", "Tiefe 233 cm", "Alle Türöffnungen 80 cm", "Eingang links oben, Wohnküche rechts oben", "WC und Abstellraum an der oberen Wand", "Bad an der unteren Wand", "Helles quadratisches Feinsteinzeug", "Gegensprechanlage und Elektroverteiler sichtbar"],
  },
};
