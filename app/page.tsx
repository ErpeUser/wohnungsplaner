"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import * as THREE from "three";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import {
  cameraFieldOfViewForZoom,
  centeredCameraLookTarget,
  centeredRoomCameraPose,
  roomCornerCameraViews,
  zimmer1CameraStepPose,
  buildZimmer1ComparisonPlacements,
  EVIDENCE_FURNITURE_APPEARANCE,
  ROOM_FIXTURES,
  ROOM_DEFINITIONS as rooms,
  ZIMMER1_DECORATED_PRESET,
  ZIMMER1_DESIGN_PRESET,
  ZIMMER1_LAYOUT_COMPARISONS,
  ZIMMER1_PC_AND_WARDROBE_PRESET,
  ZIMMER1_DESK_SHELF_PRESET,
  ZIMMER1_WINDOW_TREATMENT,
  ZIMMER1_WINDOW_TREATMENT_PRESET,
  formatCentimeters,
  openingLength,
  openingPlanLabelPlacement,
  orderFloorPlanItems,
  patchUnlockedFurniture,
  planPointToWorld,
  removeUnlockedFurniture,
  windowVerticalPlacement,
  zimmer1AnnotatedCornerCamera,
  zimmer1ComparisonCamera,
  ZIMMER1_ANNOTATED_MEASURES,
  type EvidenceFurniturePlacement,
  type DesignFurniturePlacement,
  type Point,
  type Room,
  type RoomId,
  type Zimmer1LayoutComparison,
} from "./room-model";

const catalog = {
  singleBed: { name: "Bett 90", w: 0.9, d: 2, h: 0.48, color: "#d9b99b" },
  bed120: { name: "Polsterbett BERO 120", w: 1.42, d: 2.2, h: 1.3, color: "#ded4c9" },
  doubleBed: { name: "Bett 160", w: 1.6, d: 2, h: 0.52, color: "#caa98e" },
  wardrobe: { name: "Kleiderschrank", w: 2.25, d: 0.62, h: 2.2, color: "#f0eee9" },
  desk: { name: "Schreibtisch", w: 1.29, d: 0.55, h: 0.75, color: "#eeeae2" },
  chair: { name: "Stuhl", w: 0.55, d: 0.55, h: 0.82, color: "#78928c" },
  dresser: { name: "Kommode", w: 0.9, d: 0.45, h: 0.82, color: "#c6a782" },
  tv: { name: "TV / Lowboard", w: 1.2, d: 0.4, h: 0.52, color: "#596166" },
  shelf: { name: "Regal", w: 0.8, d: 0.32, h: 1.9, color: "#b89b79" },
  shoe: { name: "Schuhschrank", w: 0.9, d: 0.28, h: 1.05, color: "#9ca7a0" },
  bench: { name: "Sitzbank", w: 1, d: 0.38, h: 0.46, color: "#bb8e67" },
  rug: { name: "Teppich 140 x 200", w: 1.4, d: 2, h: 0.02, color: "#e7ddd0" },
  pouf: { name: "Boucle-Pouf", w: 0.55, d: 0.55, h: 0.42, color: "#eee4d8" },
  nightstand: { name: "Action Nachttisch", w: 0.275, d: 0.375, h: 0.505, color: "#ded4c9" },
  plant: { name: "Pflanze im Korb", w: 0.34, d: 0.34, h: 1.25, color: "#8fa18b" },
  curtain: { name: "Vorhang", w: 1.31, d: 0.04, h: 1.8, color: "#e5ddd1" },
  curtainRod: { name: "Vorhangstange", w: 1.75, d: 0.04, h: 0.019, color: "#242728" },
  hangingPlant: { name: "Kunst-Hängepflanze", w: 0.22, d: 0.18, h: 0.48, color: "#60785f" },
  smallPlant: { name: "Mini-Kunstpflanze", w: 0.12, d: 0.12, h: 0.16, color: "#71856e" },
  wallMirror: { name: "Spiegel 110 x 70", w: 1.1, d: 0.04, h: 0.7, color: "#e8ebeb" },
  wallPanel: { name: "Lamellenpaneel 60 x 120", w: 0.6, d: 0.02, h: 1.2, color: "#c9b29b" },
  wallShelf: { name: "Wandregal", w: 0.65, d: 0.16, h: 0.05, color: "#b99b78" },
  wallArt: { name: "Rahmen 30 × 40", w: 0.3, d: 0.03, h: 0.4, color: "#c7ad92" },
  wallDecor: { name: "Reliefbild 30 × 40", w: 0.3, d: 0.03, h: 0.4, color: "#d0b092" },
  ledStrip: { name: "Spiegellicht 102 × 62", w: 1.02, d: 0.02, h: 0.62, color: "#f4d28d" },
  wallLamp: { name: "LED-Wandlampe 8 × 10", w: 0.08, d: 0.1, h: 0.1, color: "#292d2d" },
  wallClock: { name: "Wanduhr Ø 20", w: 0.2, d: 0.04, h: 0.2, color: "#d7c7ad" },
  custom: { name: "Freies Möbel", w: 1, d: 0.6, h: 0.75, color: "#a79bbb" },
} as const;

type FurnitureKey = keyof typeof catalog;
const optionalDecorTypes = new Set<FurnitureKey>(["rug", "pouf", "plant", "curtain", "curtainRod", "hangingPlant", "smallPlant", "wallPanel", "wallShelf", "wallArt", "wallDecor", "ledStrip", "wallLamp", "wallClock"]);
const hiddenZimmer1LibraryItems = new Set<FurnitureKey>([
  "singleBed", "bed120", "doubleBed", "desk", "wardrobe", "wallMirror", "nightstand",
  ...optionalDecorTypes,
]);
type Furniture = {
  id: string;
  type: FurnitureKey;
  name: string;
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  rotation: number;
  color: string;
  confidence?: "estimated";
  evidence?: string;
  mountHeight?: number;
  nonBlocking?: boolean;
  role?: string;
  wall?: string;
  productId?: string;
  evidenceStatus?: "belegt" | "geschätzt" | "offen";
  fixed?: boolean;
};

type WallSurface = "north" | "east" | "south" | "west";
type WallSnapshot = {
  id: string;
  title: string;
  dimensions: string;
  image: string;
};

type ReferenceKind = "plan" | "detail" | "hand";
type ReferenceAsset = {
  label: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  rotation?: 90;
};

const referenceSets: Record<RoomId, Record<ReferenceKind, ReferenceAsset>> = {
  zimmer1: {
    plan: { label: "Gesamtplan", src: "/reference-plan.png", alt: "Vermietungsplan der gesamten Wohnung", width: 3308, height: 2339 },
    detail: { label: "Planausschnitt", src: "/zimmer1-plan-detail.png", alt: "Vergrößerter Ausschnitt von Zimmer 1 im Vermietungsplan", width: 1350, height: 1500 },
    hand: { label: "Handskizze · planrichtig", src: "/zimmer1-handplan.png", alt: "Planrichtig gedrehte Handskizze von Zimmer 1 mit Wand-, Fenster- und Schrankmaßen", width: 1400, height: 1043, rotation: 90 },
  },
  vorraum: {
    plan: { label: "Gesamtplan", src: "/reference-plan.png", alt: "Vermietungsplan der gesamten Wohnung", width: 3308, height: 2339 },
    detail: { label: "Planausschnitt", src: "/vorraum-plan-detail.png", alt: "Vergrößerter Ausschnitt des Vorraums im Vermietungsplan", width: 1725, height: 1470 },
    hand: { label: "Handskizze", src: "/vorraum-handplan.png", alt: "Handskizze des Vorraums mit Wand- und Türmaßen", width: 1400, height: 1372 },
  },
};

const sourceLabel = {
  hand: "Handmaß",
  plan: "Vermietungsplan",
  derived: "Abgeleitet",
} as const;

const confidenceLabel = {
  confirmed: "direkt ablesbar",
  "plan-scaled": "maßstäblich ermittelt",
  limited: "durch Möbel eingeschränkt",
} as const;

const fixtureSourceLabel = {
  photo: "Foto / Video",
  plan: "Vermietungsplan",
  "photo+plan": "Foto + Plan",
} as const;

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const makeFurniture = (type: FurnitureKey, room: Room, offset = 0): Furniture => {
  const item = catalog[type];
  return {
    id: createId(),
    type,
    name: item.name,
    w: item.w,
    d: item.d,
    h: item.h,
    color: item.color,
    x: Math.min(room.width - item.w / 2 - 0.08, room.width / 2 + offset),
    y: Math.min(room.height - item.d / 2 - 0.08, Math.min(1.65, room.height / 2) + offset),
    rotation: 0,
  };
};

const makeEvidenceFurniture = (placement: EvidenceFurniturePlacement, room: Room): Furniture => ({
  ...makeFurniture(placement.key, room),
  type: placement.key,
  name: placement.name,
  w: placement.w,
  d: placement.d,
  h: placement.h,
  x: placement.x,
  y: placement.y,
  rotation: placement.rotation,
  confidence: placement.confidence,
  evidence: placement.evidence,
  fixed: placement.fixed,
});

const createPcAndWardrobe = (stableIds = false) => ZIMMER1_PC_AND_WARDROBE_PRESET.map((placement) => {
  const item = makeEvidenceFurniture(placement, rooms.zimmer1);
  if (stableIds) item.id = `zimmer1-evidence-${placement.key}`;
  return item;
});

const makeDesignFurniture = (placement: DesignFurniturePlacement, stableIds = false): Furniture => ({
  id: stableIds ? `zimmer1-design-${placement.key}-${placement.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.round(placement.x * 100)}` : createId(),
  type: placement.key as FurnitureKey,
  name: placement.name,
  w: placement.w,
  d: placement.d,
  h: placement.h,
  x: placement.x,
  y: placement.y,
  rotation: placement.rotation,
  color: placement.color,
  mountHeight: placement.mountHeight,
  nonBlocking: placement.nonBlocking,
  role: placement.role,
  wall: placement.wall,
  productId: placement.productId,
  evidenceStatus: placement.evidenceStatus,
  evidence: placement.evidence,
  fixed: placement.fixed,
});

const createBaseMirror = (stableIds = false): Furniture => {
  return {
    id: stableIds ? "zimmer1-base-wallMirror" : createId(),
    type: "wallMirror",
    name: "Spiegel 110 × 70 · Grundausstattung",
    w: 1.1,
    d: 0.04,
    h: 0.7,
    x: 3.52,
    y: 0.645,
    rotation: 90,
    color: catalog.wallMirror.color,
    mountHeight: 1.22,
    nonBlocking: true,
    role: "Grundausstattung über dem PC-Tisch an der Fensterwand",
    wall: "Fensterwand · 129-cm-Abschnitt",
    evidenceStatus: "belegt",
    evidence: "110 × 70 cm laut Auftrag; mittig über dem quellenbestätigten Schreibtisch an der Ost-/Fensterwand. Bei 75 cm Tischhöhe und 12 cm Abstand liegt die Spiegelunterkante bei 87 cm und der Mittelpunkt bei 122 cm. Die Montagehöhe bleibt vor Ort zu bestätigen.",
    fixed: true,
  };
};

const createVariantABed = (stableIds = false): Furniture => {
  const placement = ZIMMER1_DESIGN_PRESET.find((candidate) => candidate.key === "bed120");
  if (!placement) throw new Error("Variante-A-Bett fehlt");
  const item = makeDesignFurniture(placement, false);
  item.id = stableIds ? "zimmer1-decor-bed120" : createId();
  item.name = "Polsterbett BERO · Liegefläche 120 × 200";
  item.role = "Bett + Deko: Kopfteil links, lange Seite an der oberen Wand";
  item.wall = "Bettzone · Nordwest-Ecke";
  item.productId = "moebelix-bero";
  item.evidenceStatus = "belegt";
  item.fixed = true;
  return item;
};

const createVariantANightstand = (stableIds = false): Furniture => {
  const placement = ZIMMER1_DESIGN_PRESET.find((candidate) => candidate.key === "nightstand");
  if (!placement) throw new Error("Variante-A-Nachttisch fehlt");
  const item = makeDesignFurniture(placement, false);
  item.id = stableIds ? "zimmer1-base-nightstand" : createId();
  item.role = "Variante A · bewusst verschieb- und löschbar";
  item.fixed = false;
  return item;
};

const createWindowTreatment = (stableIds = false): Furniture[] =>
  ZIMMER1_WINDOW_TREATMENT_PRESET.map((placement, index) => {
    const item = makeDesignFurniture(placement, false);
    item.id = stableIds ? `zimmer1-base-window-treatment-${index + 1}` : createId();
    return item;
  });

const createDeskShelfSet = (stableIds = false): Furniture[] =>
  ZIMMER1_DESK_SHELF_PRESET.map((placement, index) => {
    const item = makeDesignFurniture(placement, false);
    item.id = stableIds ? `zimmer1-base-desk-shelf-${index + 1}` : createId();
    return item;
  });

const createBaseFurniture = (stableIds = false) => [
  ...createPcAndWardrobe(stableIds),
  createBaseMirror(stableIds),
];

const createDecoratedFurniture = (stableIds = false) => [
  ...createBaseFurniture(stableIds),
  createVariantABed(stableIds),
  ...ZIMMER1_DECORATED_PRESET.map((placement, index) => {
    const item = makeDesignFurniture(placement, false);
    item.id = stableIds ? `zimmer1-decor-${placement.productId ?? placement.key}-${index + 1}` : createId();
    return item;
  }),
];

/** Exact in-app model that was active immediately before this correction pass. */
const createSavedPreDecorSnapshot = (stableIds = false): Furniture[] => {
  const [desk, wardrobe] = createPcAndWardrobe(false);
  Object.assign(desk, {
    id: stableIds ? "zimmer1-snapshot-desk" : createId(),
    x: 2.915,
    y: 0.275,
    rotation: 180,
    evidenceStatus: "offen" as const,
    evidence: "Gesicherter Vorzustand: Tisch war an der oberen Wand modelliert. Die spätere Quellenprüfung hat diese Lage als Regression erkannt.",
  });
  wardrobe.id = stableIds ? "zimmer1-snapshot-wardrobe" : createId();
  const mirrorPlacement = ZIMMER1_DESIGN_PRESET.find((candidate) => candidate.key === "wallMirror");
  if (!mirrorPlacement) throw new Error("Gesicherter Spiegel fehlt");
  const mirror = makeDesignFurniture(mirrorPlacement, false);
  mirror.id = stableIds ? "zimmer1-snapshot-mirror" : createId();
  const bed = createVariantABed(false);
  bed.id = stableIds ? "zimmer1-snapshot-bed" : createId();
  const nightstand = createVariantANightstand(false);
  nightstand.id = stableIds ? "zimmer1-snapshot-nightstand" : createId();
  return [
    desk,
    wardrobe,
    mirror,
    bed,
    nightstand,
    ...createWindowTreatment(false).map((item, index) => ({ ...item, id: stableIds ? `zimmer1-snapshot-window-${index + 1}` : createId() })),
    ...createDeskShelfSet(false).map((item, index) => ({ ...item, id: stableIds ? `zimmer1-snapshot-shelf-${index + 1}` : createId() })),
  ];
};

const purchaseSuggestions = [
  {
    shop: "Action",
    name: "Wandpaneele aus Holz · Art. 3206937",
    role: "Kopfteilfeld an der linken Wand",
    quantity: "1 Packung · 4 Paneele",
    dimensions: "je 60 × 30 × 1 cm · Gesamtfeld 120 × 60 cm",
    material: "Braunes MDF mit Filz",
    mount: "Wandmontage; Befestigung passend zum Wandaufbau wählen",
    price: "9,95 € Aktionspreis · regulär 14,99 €",
    availability: "Online gelistet; Filialbestand offen",
    href: "https://www.action.com/de-at/p/3206937/wandpaneele-aus-holz/",
    position: "Westwand y 11–131 cm; Unterkante 115 cm, Oberkante 175 cm",
    note: "Vier leichte Paneele hochkant, mittig zur 120-cm-Liegefläche. Kein schweres Objekt über dem Bett.",
  },
  {
    shop: "Möbelix",
    name: "Polsterbett BERO · Art. 2314000206",
    role: "Bett der dekorierten Variante",
    quantity: "1 Stück",
    dimensions: "Außenmaß 142 × 220 cm · Liegefläche 120 × 200 cm · Höhe 130 cm",
    material: "Bouclé-Bezug; Shopfarbe widersprüchlich Grau/Creme",
    mount: "Bodenstehend; Kopfteil an der Westwand",
    price: "599,00 € · Lieferung 59,00 €",
    availability: "Online Deal · ca. 8–9 Wochen · nicht in Filiale",
    href: "https://www.moebelix.at/p/polsterbett-bero-boucle-grau-lf-120x200-cm-002314000206",
    position: "Nordwest-Ecke; Außenfläche x 0–220 cm / y 0–142 cm",
    note: "Im Modell sind Liegefläche und Außenmaß getrennt ausgewiesen; neutral creme dargestellt, bis die Farbe vor Kauf bestätigt ist.",
  },
  {
    shop: "Action",
    name: "Aufladbare LED-Wandlampe · Art. 3015581",
    role: "Leselicht an der offenen Bettseite",
    quantity: "1 Stück",
    dimensions: "8 × 10 × 10 cm",
    material: "Schwarz; warmweiß 100 lm",
    mount: "3M-Klebeband oder mitgelieferte Schraube",
    price: "3,96 €",
    availability: "Online gelistet; Filialbestand offen",
    href: "https://www.action.com/de-at/p/3015581/aufladbare-led-wandlampe/",
    position: "Westwand y 156 cm; Mittelpunkt 148 cm über Boden",
    note: "14 cm neben dem äußeren Kopfteilrand; keine Leitung im Laufweg.",
  },
  {
    shop: "Möbelix",
    name: "Artgeist Leinwandbild Geometry Grün/Beige",
    role: "Linkes Bild an der oberen Wand",
    quantity: "1 Stück",
    dimensions: "40 × 60 × 1,2 cm",
    material: "Leinwand auf Keilrahmen",
    mount: "Wandmontage",
    price: "45,90 €",
    availability: "Online gelistet; Lieferstatus im Shop prüfen",
    href: "https://www.moebelix.at/p/artgeist-leinwandbild-geometry-gruen-beige-b-40-cm-004875015401",
    position: "Nordwand x 52–92 cm; Unterkante 135 cm",
    note: "Leichtes Bild ohne Glas; 20 cm Abstand zum zweiten Motiv.",
  },
  {
    shop: "Möbelix",
    name: "Artgeist Leinwandbild Abstraction Beige/Oliv/Cognac",
    role: "Rechtes Bild an der oberen Wand",
    quantity: "1 Stück",
    dimensions: "40 × 60 × 1,2 cm",
    material: "Leinwand auf Keilrahmen",
    mount: "Wandmontage",
    price: "45,90 €",
    availability: "Online gelistet; Lieferstatus im Shop prüfen",
    href: "https://www.moebelix.at/p/artgeist-leinwandbild-abstraction-beige-olivgruen-cognac-b-40-cm-004875003701",
    position: "Nordwand x 112–152 cm; Unterkante 135 cm",
    note: "Zweites leichtes Bild ohne Glas; keine Ablage über dem Bett.",
  },
  {
    shop: "Möbelix",
    name: "Leinwandbild 41-807 · Art. 5749037501",
    role: "Freie Westwand",
    quantity: "1 Stück",
    dimensions: "100 × 40 × 3 cm",
    material: "Leinwand auf Holzrahmen",
    mount: "Wandmontage",
    price: "49,99 €",
    availability: "Online gelistet; Lieferstatus im Shop prüfen",
    href: "https://www.moebelix.at/p/leinwandbild-41-807-005749037501",
    position: "Westwand y 168–268 cm; Unterkante 130 cm",
    note: "Außerhalb der Bettzone und 100 cm oberhalb der niedrigen Steckdose.",
  },
  {
    shop: "Möbelix",
    name: "Kunstpflanze Miscanthusgras · Art. 4297205201",
    role: "Schmale grüne Ecke nach dem Fenster",
    quantity: "1 Stück",
    dimensions: "20 × 90 × 20 cm",
    material: "Kunststoff / Topf",
    mount: "Bodenstehend",
    price: "22,00 €",
    availability: "Online gelistet; Lieferstatus im Shop prüfen",
    href: "https://www.moebelix.at/p/kunstpflanze-gruen-20-cm-004297205201",
    position: "Ostwand-Freifläche x 332–352 / y 265–285 cm",
    note: "5 cm nach Fensterende und 32 cm vor der Türschwenkzone.",
  },
  {
    shop: "Action",
    name: "Wanduhr Beige · Art. 3204371",
    role: "Funktionaler Akzent auf der Ost-Restwand",
    quantity: "1 Stück",
    dimensions: "Ø 20 × 4 cm",
    material: "Beige; Material laut Shop nicht näher ausgewiesen",
    mount: "Wandmontage",
    price: "2,19 €",
    availability: "Online gelistet; Filialbestand offen",
    href: "https://www.action.com/de-at/p/3204371/wanduhr/",
    position: "Ostwand y 292 cm; Mittelpunkt 158 cm über Boden",
    note: "Über der Pflanze; Fenster, Schalter und Türschwenk bleiben frei.",
  },
] as const;

const createDefaultItemsByRoom = (): Record<RoomId, Furniture[]> => ({
  zimmer1: createDecoratedFurniture(true),
  vorraum: [],
});

const createComparisonFurniture = (comparisonId: string): Furniture[] => {
  const placements = buildZimmer1ComparisonPlacements(comparisonId);
  const baseByType = new Map(createBaseFurniture(true).map((item) => [item.type, item]));
  return placements.map((placement) => {
    const base = baseByType.get(placement.key) ?? makeFurniture(placement.key, rooms.zimmer1);
    return {
      ...base,
      id: `zimmer1-comparison-${placement.key}`,
      name: placement.key === "shelf" ? "IKEA LACK 30 × 28 × 190" : base.name,
      x: placement.x,
      y: placement.y,
      rotation: placement.rotation,
      w: placement.w ?? base.w,
      d: placement.d ?? base.d,
      h: placement.h ?? base.h,
      mountHeight: placement.mountHeight,
      fixed: true,
    };
  });
};
const comparisonCamera = zimmer1ComparisonCamera();
const annotatedCornerCamera = zimmer1AnnotatedCornerCamera();

const STORAGE_KEY = "wohnung-plan-v7";
const LEGACY_STORAGE_KEYS = ["wohnung-plan-v6", "wohnung-plan-v5", "wohnung-plan-v4", "wohnung-plan-v3", "wohnung-plan-v2", "wohnung-plan-v1"];

function pointInPolygon(point: Point, polygon: Point[]) {
  const onBoundary = polygon.some((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    const cross = (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
    const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
    const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
    return Math.abs(cross) < 0.0001 && dot >= -0.0001 && dot <= lengthSquared + 0.0001;
  });
  if (onBoundary) return true;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function itemCorners(item: Furniture) {
  const angle = (item.rotation * Math.PI) / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [-item.w / 2, -item.d / 2],
    [item.w / 2, -item.d / 2],
    [item.w / 2, item.d / 2],
    [-item.w / 2, item.d / 2],
  ].map(([x, y]) => ({ x: item.x + x * c - y * s, y: item.y + x * s + y * c }));
}

function isOutside(item: Furniture, room: Room) {
  return itemCorners(item).some((corner) => !pointInPolygon(corner, room.outline));
}

function furniturePlanDimensions(item: Pick<Furniture, "type" | "w" | "d" | "h">) {
  const wallMounted = new Set<FurnitureKey>(["wallMirror", "wallPanel", "wallShelf", "wallArt", "wallDecor", "ledStrip", "wallLamp", "wallClock"]);
  const centimeters = (meters: number) => Number((meters * 100).toFixed(2)).toString().replace(".", ",");
  if (item.type === "wallShelf") return `${centimeters(item.w)} × ${centimeters(item.d)} × ${centimeters(item.h)} cm`;
  if (item.type === "wallClock") return `Ø ${centimeters(item.w)} × T ${centimeters(item.d)} cm`;
  return wallMounted.has(item.type) ? `${centimeters(item.w)} × ${centimeters(item.h)} cm` : `${centimeters(item.w)} × ${centimeters(item.d)} cm`;
}

function aabb(item: Furniture) {
  const corners = itemCorners(item);
  return {
    left: Math.min(...corners.map((p) => p.x)),
    right: Math.max(...corners.map((p) => p.x)),
    top: Math.min(...corners.map((p) => p.y)),
    bottom: Math.max(...corners.map((p) => p.y)),
  };
}

function isNonBlocking(item: Furniture) {
  return Boolean(item.nonBlocking) || ["rug", "curtain", "wallMirror", "wallPanel", "wallShelf", "wallDecor", "wallArt", "ledStrip", "wallLamp", "wallClock", "plant"].includes(item.type);
}

function collides(item: Furniture, all: Furniture[]) {
  if (isNonBlocking(item)) return false;
  const a = aabb(item);
  return all.some((other) => {
    if (other.id === item.id) return false;
    if (isNonBlocking(other)) return false;
    const b = aabb(other);
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  });
}

function blocksDoor(item: Furniture, room: Room) {
  if (isNonBlocking(item)) return false;
  const box = aabb(item);
  return room.openings.filter((opening) => opening.kind === "door").some((opening) => {
    const vertical = opening.x1 === opening.x2;
    const clearance = vertical
      ? {
          left: opening.x1 === 0 ? 0 : room.width - 0.86,
          right: opening.x1 === 0 ? 0.86 : room.width,
          top: Math.min(opening.y1, opening.y2),
          bottom: Math.max(opening.y1, opening.y2),
        }
      : {
          left: Math.min(opening.x1, opening.x2),
          right: Math.max(opening.x1, opening.x2),
          top: opening.y1 === 0 ? 0 : room.height - 0.86,
          bottom: opening.y1 === 0 ? 0.86 : room.height,
        };
    return box.left < clearance.right && box.right > clearance.left && box.top < clearance.bottom && box.bottom > clearance.top;
  });
}

function ThreeRoom({
  room,
  items,
  selectedId,
  onSelect,
  captureOnly = false,
  onWallSnapshots,
  initialView,
}: {
  room: Room;
  items: Furniture[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  captureOnly?: boolean;
  onWallSnapshots?: (snapshots: WallSnapshot[]) => void;
  initialView?: { position: readonly [number, number, number]; yaw: number; pitch?: number; fieldOfView: number };
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f1eb);
    const camera = new THREE.PerspectiveCamera(initialView?.fieldOfView ?? 66, 1, 0.08, 100);
    const cameraPose = centeredRoomCameraPose(room);
    const cameraPosition = initialView?.position ?? cameraPose.position;
    camera.position.set(...cameraPosition);
    camera.up.set(...cameraPose.up);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: captureOnly });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("aria-label", `Zentrierte 3D-Innenansicht von ${room.name}; ziehen zum Umschauen`);
    renderer.domElement.dataset.cameraMode = "center-look";
    renderer.domElement.dataset.cameraPosition = cameraPosition.join(",");
    mount.appendChild(renderer.domElement);

    let yaw = initialView?.yaw ?? cameraPose.yaw;
    let pitch = initialView?.pitch ?? cameraPose.pitch;
    const applyCameraLook = () => {
      const target = centeredCameraLookTarget(cameraPosition, yaw, pitch);
      camera.position.set(...cameraPosition);
      camera.lookAt(...target);
    };
    applyCameraLook();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x7d766b, 2.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-2, 7, 4);
    sun.castShadow = true;
    scene.add(sun);

    const shape = new THREE.Shape();
    room.outline.forEach((point, index) => (index === 0 ? shape.moveTo(point.x, -point.y) : shape.lineTo(point.x, -point.y)));
    shape.closePath();
    let floorMaterial: THREE.MeshStandardMaterial;
    if (room.id === "zimmer1") {
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = 512;
      textureCanvas.height = 512;
      const context = textureCanvas.getContext("2d");
      if (context) {
        context.fillStyle = "#b98250";
        context.fillRect(0, 0, 512, 512);
        const tones = ["#c6945f", "#b9804d", "#d0a06d", "#a97143", "#c18b55"];
        const boardWidth = 64;
        const boardLength = 176;
        for (let column = -1; column < 9; column += 1) {
          for (let row = -1; row < 5; row += 1) {
            const x = column * boardWidth;
            const y = row * boardLength + (column % 2 === 0 ? 0 : -88);
            context.fillStyle = tones[Math.abs(column * 3 + row) % tones.length];
            context.fillRect(x + 1, y + 1, boardWidth - 2, boardLength - 2);
            context.strokeStyle = "rgba(74,43,24,.22)";
            context.strokeRect(x + 1, y + 1, boardWidth - 2, boardLength - 2);
            context.strokeStyle = "rgba(255,255,255,.08)";
            context.beginPath();
            context.moveTo(x + 9, y + 8);
            context.lineTo(x + 9, y + boardLength - 8);
            context.stroke();
          }
        }
      }
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.8, 3.8);
      texture.colorSpace = THREE.SRGBColorSpace;
      floorMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.72, side: THREE.DoubleSide });
    } else {
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = 256;
      tileCanvas.height = 256;
      const tileContext = tileCanvas.getContext("2d");
      if (tileContext) {
        tileContext.fillStyle = "#d7d3c8";
        tileContext.fillRect(0, 0, 256, 256);
        tileContext.strokeStyle = "#aaa79f";
        tileContext.lineWidth = 3;
        for (let coordinate = 0; coordinate <= 256; coordinate += 64) {
          tileContext.beginPath();
          tileContext.moveTo(coordinate, 0);
          tileContext.lineTo(coordinate, 256);
          tileContext.stroke();
          tileContext.beginPath();
          tileContext.moveTo(0, coordinate);
          tileContext.lineTo(256, coordinate);
          tileContext.stroke();
        }
      }
      const tileTexture = new THREE.CanvasTexture(tileCanvas);
      tileTexture.wrapS = THREE.RepeatWrapping;
      tileTexture.wrapT = THREE.RepeatWrapping;
      tileTexture.repeat.set(room.width / 1.2, room.height / 1.2);
      tileTexture.colorSpace = THREE.SRGBColorSpace;
      floorMaterial = new THREE.MeshStandardMaterial({ map: tileTexture, roughness: 0.84, side: THREE.DoubleSide });
    }
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(Math.max(room.width, room.height) + 1, Math.round((Math.max(room.width, room.height) + 1) * 2), 0x8e918e, 0xc8c9c5);
    grid.position.set(room.width / 2, 0.006, room.height / 2);
    (grid.material as THREE.Material).opacity = 0.24;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.9 });
    const roomWallHeight = windowVerticalPlacement().wallHeight;
    const surfaceObjects: Record<WallSurface, THREE.Object3D[]> = { north: [], east: [], south: [], west: [] };
    const surfaceForSegment = (start: Point, end: Point): WallSurface => {
      if (Math.abs(start.y) < 0.01 && Math.abs(end.y) < 0.01) return "north";
      if (Math.abs(start.x - room.width) < 0.01 && Math.abs(end.x - room.width) < 0.01) return "east";
      if (Math.abs(start.x) < 0.01 && Math.abs(end.x) < 0.01) return "west";
      return "south";
    };
    const trackSurfaceObject = <T extends THREE.Object3D>(object: T, surface: WallSurface) => {
      surfaceObjects[surface].push(object);
      return object;
    };
    const addWallBlock = (start: Point, end: Point, height: number, centerY: number, surface: WallSurface) => {
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length <= 0.002 || height <= 0.002) return;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(length, height, 0.1), wallMaterial);
      wall.position.set((start.x + end.x) / 2, centerY, (start.y + end.y) / 2);
      wall.rotation.y = -Math.atan2(end.y - start.y, end.x - start.x);
      wall.castShadow = true;
      wall.receiveShadow = true;
      trackSurfaceObject(wall, surface);
      scene.add(wall);
    };
    const pointOnEdge = (point: Point, start: Point, end: Point) => {
      const cross = (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
      const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
      const lengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
      return Math.abs(cross) < 0.01 && dot >= -0.01 && dot <= lengthSquared + 0.01;
    };
    room.outline.forEach((point, index) => {
      const next = room.outline[(index + 1) % room.outline.length];
      const surface = surfaceForSegment(point, next);
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const lengthSquared = dx * dx + dy * dy;
      if (lengthSquared <= 0.0001) return;
      const project = (x: number, y: number) => ((x - point.x) * dx + (y - point.y) * dy) / lengthSquared;
      const at = (t: number) => ({ x: point.x + dx * t, y: point.y + dy * t });
      const edgeOpenings = room.openings
        .filter((opening) => pointOnEdge({ x: opening.x1, y: opening.y1 }, point, next) && pointOnEdge({ x: opening.x2, y: opening.y2 }, point, next))
        .map((opening) => ({
          opening,
          low: Math.max(0, Math.min(project(opening.x1, opening.y1), project(opening.x2, opening.y2))),
          high: Math.min(1, Math.max(project(opening.x1, opening.y1), project(opening.x2, opening.y2))),
        }))
        .sort((a, b) => a.low - b.low);

      let cursor = 0;
      edgeOpenings.forEach(({ opening, low, high }) => {
        addWallBlock(at(cursor), at(low), roomWallHeight, roomWallHeight / 2, surface);
        if (opening.kind === "window") {
          const placement = windowVerticalPlacement();
          addWallBlock(at(low), at(high), placement.sill, placement.sill / 2, surface);
          addWallBlock(at(low), at(high), placement.wallHeight - placement.head, placement.head + (placement.wallHeight - placement.head) / 2, surface);
        }
        cursor = Math.max(cursor, high);
      });
      addWallBlock(at(cursor), next, roomWallHeight, roomWallHeight / 2, surface);
    });

    room.openings.filter((opening) => opening.kind === "window").forEach((opening) => {
      const length = Math.hypot(opening.x2 - opening.x1, opening.y2 - opening.y1);
      const surface = room.outline.reduce<WallSurface | null>((matched, point, index) => {
        if (matched) return matched;
        const next = room.outline[(index + 1) % room.outline.length];
        return pointOnEdge({ x: opening.x1, y: opening.y1 }, point, next) && pointOnEdge({ x: opening.x2, y: opening.y2 }, point, next)
          ? surfaceForSegment(point, next)
          : null;
      }, null) ?? "east";
      const placement = windowVerticalPlacement();
      const angle = -Math.atan2(opening.y2 - opening.y1, opening.x2 - opening.x1);
      const unitX = (opening.x2 - opening.x1) / length;
      const unitY = (opening.y2 - opening.y1) / length;
      const windowCenter = (along: number) => ({
        x: opening.x1 + unitX * along,
        z: opening.y1 + unitY * along,
      });
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(length, placement.height, 0.035),
        new THREE.MeshPhysicalMaterial({ color: 0x9fd7e6, transparent: true, opacity: 0.32, roughness: 0.08, transmission: 0.42 }),
      );
      glass.position.set((opening.x1 + opening.x2) / 2, placement.center, (opening.y1 + opening.y2) / 2);
      glass.rotation.y = angle;
      trackSurfaceObject(glass, surface);
      scene.add(glass);

      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.48, metalness: 0.04 });
      const addFramePart = (partLength: number, partHeight: number, along: number, centerY: number, depth = 0.09) => {
        const center = windowCenter(along);
        const part = new THREE.Mesh(new THREE.BoxGeometry(partLength, partHeight, depth), frameMaterial);
        part.position.set(center.x, centerY, center.z);
        part.rotation.y = angle;
        part.castShadow = true;
        trackSurfaceObject(part, surface);
        scene.add(part);
      };
      const frame = 0.055;
      addFramePart(length + frame, frame, length / 2, placement.sill);
      addFramePart(length + frame, frame, length / 2, placement.head);
      addFramePart(frame, placement.height + frame, 0, placement.center);
      addFramePart(frame, placement.height + frame, length, placement.center);
      addFramePart(frame, placement.height, length * placement.verticalMullionRatio, placement.center, 0.075);
      addFramePart(length, 0.045, length / 2, placement.sill + placement.height * placement.lowerRailRatio, 0.075);
    });

    room.openings.filter((opening) => opening.kind === "door").forEach((opening) => {
      const doorLength = openingLength(opening);
      const surface = room.outline.reduce<WallSurface | null>((matched, point, index) => {
        if (matched) return matched;
        const next = room.outline[(index + 1) % room.outline.length];
        return pointOnEdge({ x: opening.x1, y: opening.y1 }, point, next) && pointOnEdge({ x: opening.x2, y: opening.y2 }, point, next)
          ? surfaceForSegment(point, next)
          : null;
      }, null) ?? "south";
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.62 });
      const doorMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.74 });
      [
        { x: opening.x1, z: opening.y1 },
        { x: opening.x2, z: opening.y2 },
      ].forEach((postPosition) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.065, 2.06, 0.065), frameMaterial);
        post.position.set(postPosition.x, 1.03, postPosition.z);
        post.castShadow = true;
        trackSurfaceObject(post, surface);
        scene.add(post);
      });

      const hinge = opening.swing?.hinge === "end"
        ? { x: opening.x2, z: opening.y2 }
        : { x: opening.x1, z: opening.y1 };
      const openEnd = opening.swing
        ? { x: opening.swing.openX, z: opening.swing.openY }
        : { x: opening.x2, z: opening.y2 };
      const angle = -Math.atan2(openEnd.z - hinge.z, openEnd.x - hinge.x);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorLength * 0.97, 1.98, 0.035), doorMaterial);
      leaf.position.set((hinge.x + openEnd.x) / 2, 0.99, (hinge.z + openEnd.z) / 2);
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      trackSurfaceObject(leaf, surface);
      scene.add(leaf);

      const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0x8e9290, metalness: 0.65, roughness: 0.25 }),
      );
      handle.position.set(
        hinge.x + (openEnd.x - hinge.x) * 0.86,
        0.98,
        hinge.z + (openEnd.z - hinge.z) * 0.86,
      );
      trackSurfaceObject(handle, surface);
      scene.add(handle);
    });

    if (room.id === "zimmer1") {
      const skirtingMaterial = new THREE.MeshStandardMaterial({ color: 0x9a673d, roughness: 0.72 });
      room.outline.forEach((point, index) => {
        const next = room.outline[(index + 1) % room.outline.length];
        const isDoorOpening = point.y === 3.97 && next.y === 3.97;
        if (isDoorOpening) return;
        const length = Math.hypot(next.x - point.x, next.y - point.y);
        const skirting = new THREE.Mesh(new THREE.BoxGeometry(length, 0.075, 0.035), skirtingMaterial);
        skirting.position.set((point.x + next.x) / 2, 0.04, (point.y + next.y) / 2);
        skirting.rotation.y = -Math.atan2(next.y - point.y, next.x - point.x);
        skirting.castShadow = true;
        trackSurfaceObject(skirting, surfaceForSegment(point, next));
        scene.add(skirting);
      });
    }

    const plateMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.42 });
    const detailMaterial = new THREE.MeshStandardMaterial({ color: 0x777d7c, roughness: 0.38, metalness: 0.12 });
    const ceilingObjects: THREE.Object3D[] = [];
    ROOM_FIXTURES[room.id].forEach((fixture) => {
      if (fixture.kind === "ceiling-light") {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.7 }));
        cable.position.set(fixture.x, fixture.elevation - 0.07, fixture.y);
        ceilingObjects.push(cable);
        scene.add(cable);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), new THREE.MeshPhysicalMaterial({ color: 0xfff1cf, emissive: 0xffd993, emissiveIntensity: 0.55, roughness: 0.18 }));
        bulb.position.set(fixture.x, fixture.elevation - 0.17, fixture.y);
        ceilingObjects.push(bulb);
        scene.add(bulb);
        const light = new THREE.PointLight(0xffefd2, 0.7, 5.5, 1.8);
        light.position.set(fixture.x, fixture.elevation - 0.22, fixture.y);
        ceilingObjects.push(light);
        scene.add(light);
        return;
      }
      if (fixture.kind === "smoke-detector") {
        const detector = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20),
          new THREE.MeshStandardMaterial({ color: fixture.source === "photo" ? 0x5eb1c7 : 0xe9e9e5, roughness: 0.58 }),
        );
        detector.position.set(fixture.x, fixture.elevation - 0.015, fixture.y);
        ceilingObjects.push(detector);
        scene.add(detector);
        return;
      }

      const dimensions = fixture.kind === "distribution-panel"
        ? { width: 0.42, height: 0.58 }
        : fixture.kind === "vent-cover"
          ? { width: 0.2, height: 0.2 }
          : fixture.kind === "multi-outlet"
            ? { width: 0.28, height: 0.11 }
            : fixture.kind === "intercom"
              ? { width: 0.16, height: 0.12 }
              : { width: 0.115, height: 0.115 };
      const depth = 0.025;
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(
          fixture.surface === "east" || fixture.surface === "west" ? depth : dimensions.width,
          dimensions.height,
          fixture.surface === "east" || fixture.surface === "west" ? dimensions.width : depth,
        ),
        fixture.kind === "intercom" ? new THREE.MeshStandardMaterial({ color: 0x303535, roughness: 0.45 }) : plateMaterial,
      );
      plate.position.set(fixture.x, fixture.elevation, fixture.y);
      if (fixture.surface === "north") plate.position.z += 0.035;
      if (fixture.surface === "south") plate.position.z -= 0.035;
      if (fixture.surface === "east") plate.position.x -= 0.035;
      if (fixture.surface === "west") plate.position.x += 0.035;
      const snapshotSurface = fixture.id === "entrance-switch" ? "south" : fixture.surface;
      if (snapshotSurface !== "ceiling") trackSurfaceObject(plate, snapshotSurface);
      scene.add(plate);

      if (fixture.kind === "outlet" || fixture.kind === "multi-outlet") {
        const count = fixture.kind === "multi-outlet" ? 3 : 2;
        for (let index = 0; index < count; index += 1) {
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), detailMaterial);
          socket.position.copy(plate.position);
          socket.position.y += (index - (count - 1) / 2) * 0.03;
          if (fixture.surface === "west") socket.position.x += 0.018;
          if (fixture.surface === "east") socket.position.x -= 0.018;
          if (fixture.surface === "north") socket.position.z += 0.018;
          if (fixture.surface === "south") socket.position.z -= 0.018;
          if (snapshotSurface !== "ceiling") trackSurfaceObject(socket, snapshotSurface);
          scene.add(socket);
        }
      }
    });

    const furnitureMeshes: THREE.Object3D[] = [];
    const furnitureSurfaceObjects: Record<WallSurface, THREE.Object3D[]> = { north: [], east: [], south: [], west: [] };
    items.forEach((item) => {
      const group = new THREE.Group();
      const worldPosition = planPointToWorld({ x: item.x, y: item.y });
      group.position.set(worldPosition.x, 0, worldPosition.z);
      group.rotation.y = -(item.rotation * Math.PI) / 180;
      group.userData.itemId = item.id;
      const southWallY = item.x <= 2.5 ? 3.33 : room.height;
      const nearestSurface = ([
        ["north", item.y],
        ["east", room.width - item.x],
        ["south", Math.abs(southWallY - item.y)],
        ["west", item.x],
      ] as Array<[WallSurface, number]>).sort((left, right) => left[1] - right[1])[0][0];
      furnitureSurfaceObjects[nearestSurface].push(group);

      const addPart = (
        width: number,
        height: number,
        depth: number,
        x: number,
        y: number,
        z: number,
        color: THREE.ColorRepresentation,
        roughness = 0.68,
        metalness = 0,
      ) => {
        const part = new THREE.Mesh(
          new THREE.BoxGeometry(width, Math.max(0.012, height), depth),
          new THREE.MeshStandardMaterial({
            color: item.id === selectedId ? 0x274c52 : color,
            roughness,
            metalness,
            emissive: item.id === selectedId ? 0x10282c : 0x000000,
            emissiveIntensity: item.id === selectedId ? 0.2 : 0,
          }),
        );
        part.position.set(x, y, z);
        part.castShadow = true;
        part.receiveShadow = true;
        part.userData.itemId = item.id;
        group.add(part);
        return part;
      };

      const addCylinder = (
        radiusTop: number,
        radiusBottom: number,
        height: number,
        x: number,
        y: number,
        z: number,
        color: THREE.ColorRepresentation,
        radialSegments = 24,
        roughness = 0.68,
      ) => {
        const part = new THREE.Mesh(
          new THREE.CylinderGeometry(radiusTop, radiusBottom, Math.max(0.012, height), radialSegments),
          new THREE.MeshStandardMaterial({
            color: item.id === selectedId ? 0x274c52 : color,
            roughness,
            emissive: item.id === selectedId ? 0x10282c : 0x000000,
            emissiveIntensity: item.id === selectedId ? 0.2 : 0,
          }),
        );
        part.position.set(x, y, z);
        part.castShadow = true;
        part.receiveShadow = true;
        part.userData.itemId = item.id;
        group.add(part);
        return part;
      };

      const addBouclePanel = (
        width: number,
        height: number,
        depth: number,
        x: number,
        y: number,
        z: number,
        color: THREE.ColorRepresentation,
      ) => {
        const shape = new THREE.Shape();
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const shoulder = Math.min(width * 0.28, height * 0.22);
        shape.moveTo(-halfWidth, -halfHeight);
        shape.lineTo(halfWidth, -halfHeight);
        shape.lineTo(halfWidth, halfHeight - shoulder);
        shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - shoulder, halfHeight);
        shape.quadraticCurveTo(0, halfHeight + shoulder * 0.16, -halfWidth + shoulder, halfHeight);
        shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - shoulder);
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSegments: 3,
          bevelSize: 0.016,
          bevelThickness: 0.012,
          curveSegments: 18,
        });
        geometry.center();
        const panel = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: item.id === selectedId ? 0x274c52 : color,
            roughness: 0.94,
            emissive: item.id === selectedId ? 0x10282c : 0x000000,
            emissiveIntensity: item.id === selectedId ? 0.2 : 0,
          }),
        );
        panel.position.set(x, y, z);
        panel.castShadow = true;
        panel.receiveShadow = true;
        panel.userData.itemId = item.id;
        group.add(panel);
        return panel;
      };

      const addWallPanel = (width: number, height: number, depth: number, y: number, color: THREE.ColorRepresentation, metalness = 0) => {
        const panel = addPart(width, height, depth, 0, y, 0, color, 0.34, metalness);
        panel.castShadow = false;
        return panel;
      };

      if (item.mountHeight !== undefined) group.position.y = item.mountHeight;

      if (item.type === "desk") {
        const topThickness = 0.065;
        addPart(item.w, topThickness, item.d, 0, item.h - topThickness / 2, 0, item.color);
        const bodyHeight = item.h - topThickness;
        const drawerWidth = Math.min(0.34, item.w * 0.31);
        const drawerCenterX = item.w / 2 - drawerWidth / 2 - 0.02;
        addPart(drawerWidth, bodyHeight, item.d - 0.05, drawerCenterX, bodyHeight / 2, 0, 0xe5e1d9);
        for (let index = 0; index < EVIDENCE_FURNITURE_APPEARANCE.desk.drawerCount; index += 1) {
          const faceHeight = bodyHeight / EVIDENCE_FURNITURE_APPEARANCE.desk.drawerCount;
          addPart(drawerWidth - 0.018, faceHeight - 0.014, 0.025, drawerCenterX, faceHeight * (index + 0.5), item.d / 2 + 0.006, 0xf4f1eb);
        }
        addPart(0.055, bodyHeight, item.d - 0.045, -item.w / 2 + 0.045, bodyHeight / 2, 0, 0xe5e1d9);
        const kneeWidth = item.w - drawerWidth - 0.12;
        addPart(kneeWidth, 0.11, item.d - 0.06, -drawerWidth / 2 + 0.015, item.h - topThickness - 0.075, 0, 0xebe7df);
      } else if (item.type === "wardrobe") {
        group.userData.doorsClosed = EVIDENCE_FURNITURE_APPEARANCE.wardrobe.doorsClosed;
        addPart(item.w, item.h, Math.max(0.1, item.d - 0.045), 0, item.h / 2, -0.02, item.color);
        const panels = EVIDENCE_FURNITURE_APPEARANCE.wardrobe.panels;
        const panelWidth = item.w / panels.length;
        const lowerHeight = Math.min(0.38, item.h * 0.19);
        const closedFrontZ = item.d / 2 + 0.014;
        panels.forEach((panel, index) => {
          const x = -item.w / 2 + panelWidth * (index + 0.5);
          const isMirror = panel === "mirror";
          const hasDrawers = EVIDENCE_FURNITURE_APPEARANCE.wardrobe.drawerPanels.includes(index as 1 | 3);
          const doorBottom = hasDrawers ? lowerHeight : 0.025;
          const doorHeight = item.h - doorBottom - 0.045;
          // Every front stays on the same plane: the photographed wardrobe is fully closed.
          addPart(panelWidth - 0.012, doorHeight, 0.026, x, doorBottom + doorHeight / 2, closedFrontZ, isMirror ? 0xb9c8cb : 0xf0eee9, isMirror ? 0.18 : 0.62, isMirror ? 0.28 : 0);
          if (hasDrawers) {
            [0.25, 0.75].forEach((ratio) => {
              addPart(panelWidth - 0.018, lowerHeight / 2 - 0.012, 0.03, x, lowerHeight * ratio, item.d / 2 + 0.018, 0x34383a, 0.6, 0.04);
              addPart(0.16, 0.014, 0.025, x, lowerHeight * ratio, item.d / 2 + 0.041, 0xa9acad, 0.25, 0.78);
            });
          }
          if (!isMirror) addPart(0.018, 0.17, 0.028, x + panelWidth * 0.27, doorBottom + doorHeight * 0.48, item.d / 2 + 0.036, 0x9aa0a0, 0.28, 0.75);
        });
      } else if (item.type === "bed120") {
        const bodyHeight = 0.34;
        const boucle = 0xd8cec3;
        const panelWidth = (item.w - 0.1) / 3;
        addPart(item.w - 0.08, bodyHeight, item.d - 0.16, 0, bodyHeight / 2 + 0.11, 0, boucle, 0.94);
        addPart(0.11, 0.35, item.d - 0.2, -item.w / 2 + 0.055, 0.285, 0, 0xd1c5b9, 0.94);
        addPart(0.11, 0.35, item.d - 0.2, item.w / 2 - 0.055, 0.285, 0, 0xd1c5b9, 0.94);
        [-1, 0, 1].forEach((panel) => {
          const panelX = panel * (panelWidth + 0.018);
          addBouclePanel(panelWidth, 0.92, 0.13, panelX, 0.82, -item.d / 2 + 0.065, boucle);
          addBouclePanel(panelWidth, 0.38, 0.14, panelX, 0.33, item.d / 2 - 0.07, 0xd1c5b9);
        });
        addPart(item.w - 0.12, 0.19, item.d - 0.22, 0, 0.53, 0, 0xf6f0e8, 0.99);
        addPart(item.w - 0.16, 0.08, item.d * 0.67, 0, 0.665, 0.15, 0xdfd2c5, 0.99);
        addPart(0.44, 0.14, 0.35, -0.25, 0.71, -item.d * 0.31, 0xf8f3ed, 0.99);
        addPart(0.44, 0.14, 0.35, 0.25, 0.71, -item.d * 0.31, 0xf8f3ed, 0.99);
        addPart(item.w - 0.12, 0.045, 0.36, 0, 0.725, item.d * 0.34, 0x8b9580, 0.98);
        addPart(item.w - 0.2, 0.018, 0.06, 0, 0.706, item.d * 0.22, 0xb9a892, 0.94);
        addPart(0.34, 0.12, 0.26, -0.27, 0.69, -0.40, 0xe9dfd5, 0.92);
        addPart(0.34, 0.12, 0.26, 0.27, 0.69, -0.40, 0xd9c8b8, 0.92);
      } else if (item.type === "rug") {
        addPart(item.w, item.h, item.d, 0, 0.015, 0, 0xe7ddd0, 0.96);
      } else if (item.type === "nightstand") {
        addPart(item.w, 0.035, item.d, 0, item.h - 0.0175, 0, 0xf2eee8, 0.72);
        addPart(0.025, item.h - 0.04, item.d - 0.025, -item.w / 2 + 0.0125, item.h / 2, 0, 0xe2ddd5, 0.8);
        addPart(0.025, item.h - 0.04, item.d - 0.025, item.w / 2 - 0.0125, item.h / 2, 0, 0xe2ddd5, 0.8);
        addPart(item.w - 0.05, 0.025, item.d - 0.035, 0, item.h * 0.52, 0, 0xe8e2da, 0.8);
        addPart(item.w - 0.045, item.h * 0.18, 0.028, 0, item.h * 0.16, item.d / 2 + 0.008, 0xd5c9bb, 0.88);
        addPart(item.w - 0.045, item.h * 0.18, 0.028, 0, item.h * 0.36, item.d / 2 + 0.008, 0xd5c9bb, 0.88);
        addPart(0.07, 0.012, 0.018, 0, item.h * 0.16, item.d / 2 + 0.03, 0x9c866f, 0.34, 0.3);
        addPart(0.07, 0.012, 0.018, 0, item.h * 0.36, item.d / 2 + 0.03, 0x9c866f, 0.34, 0.3);
        addCylinder(0.05, 0.055, 0.022, 0, item.h + 0.011, 0, 0xb9a184, 18, 0.45);
        addCylinder(0.01, 0.01, 0.18, 0, item.h + 0.11, 0, 0x9b8c7a, 12, 0.32);
        addCylinder(0.055, 0.085, 0.12, 0, item.h + 0.26, 0, 0xeadfce, 20, 0.92);
      } else if (item.type === "shelf") {
        const wallMounted = item.mountHeight !== undefined;
        const centerY = wallMounted ? 0 : item.h / 2;
        const white = 0xf2f1ed;
        const edge = 0.035;
        addPart(item.w, item.h, edge, 0, centerY, -item.d / 2 + edge / 2, white, 0.62);
        addPart(edge, item.h, item.d, -item.w / 2 + edge / 2, centerY, 0, white, 0.58);
        addPart(edge, item.h, item.d, item.w / 2 - edge / 2, centerY, 0, white, 0.58);
        addPart(item.w, edge, item.d, 0, centerY - item.h / 2 + edge / 2, 0, white, 0.58);
        addPart(item.w, edge, item.d, 0, centerY + item.h / 2 - edge / 2, 0, white, 0.58);
        if (item.h > item.w) {
          for (let shelf = 1; shelf < 7; shelf += 1) {
            addPart(item.w - edge * 2, edge, item.d, 0, centerY - item.h / 2 + (item.h / 7) * shelf, 0, white, 0.58);
          }
        } else {
          for (let divider = 1; divider < 7; divider += 1) {
            addPart(edge, item.h - edge * 2, item.d, -item.w / 2 + (item.w / 7) * divider, centerY, 0, white, 0.58);
          }
        }
      } else if (item.type === "pouf") {
        addCylinder(item.w * 0.47, item.w * 0.5, item.h, 0, item.h / 2, 0, 0xeee4d8, 32, 0.9);
        addPart(item.w * 0.74, 0.045, item.d * 0.74, 0, item.h + 0.016, 0, 0xf5eee7, 0.92);
      } else if (item.type === "plant") {
        addCylinder(0.12, 0.16, 0.28, 0, 0.14, 0, 0xb98d68, 20, 0.86);
        for (let leaf = 0; leaf < 7; leaf += 1) {
          const angle = (leaf / 7) * Math.PI * 2;
          const leafPart = addPart(0.08, 0.34, 0.035, Math.cos(angle) * 0.08, 0.49 + (leaf % 2) * 0.08, Math.sin(angle) * 0.08, 0x708e70, 0.88);
          leafPart.rotation.z = (leaf % 2 === 0 ? 1 : -1) * 0.35;
        }
      } else if (item.type === "wallMirror") {
        addWallPanel(item.w + 0.06, item.h + 0.06, 0.035, 0, 0xa9aaa5, 0.3);
        const mirrorSurface = new THREE.Mesh(
          new THREE.BoxGeometry(item.w, item.h, 0.022),
          new THREE.MeshPhysicalMaterial({
            color: 0xe8ebeb,
            roughness: 0.08,
            metalness: 0.78,
            clearcoat: 1,
            clearcoatRoughness: 0.06,
          }),
        );
        mirrorSurface.userData.itemId = item.id;
        mirrorSurface.castShadow = false;
        mirrorSurface.receiveShadow = true;
        group.add(mirrorSurface);
      } else if (item.type === "wallPanel") {
        addWallPanel(item.w, item.h, item.d, 0, item.color, 0.1);
        for (let slat = -item.w / 2 + 0.025; slat <= item.w / 2 - 0.025; slat += 0.05) {
          addPart(0.018, item.h - 0.025, 0.012, slat, 0, item.d / 2 + 0.008, 0x6e5544, 0.76);
        }
      } else if (item.type === "wallLamp") {
        addWallPanel(item.w, item.h, 0.025, 0, 0x292d2d, 0.32);
        const lamp = addCylinder(item.w * 0.42, item.w * 0.42, item.d * 0.72, 0, 0, item.d * 0.34, 0xd8c090, 24, 0.42);
        lamp.rotation.x = Math.PI / 2;
        const glow = new THREE.PointLight(0xffd69b, 0.22, 1.15, 2);
        glow.position.set(0, 0, 0.12);
        group.add(glow);
      } else if (item.type === "wallClock") {
        const clock = addCylinder(item.w / 2, item.w / 2, item.d, 0, 0, 0, item.color, 36, 0.72);
        clock.rotation.x = Math.PI / 2;
        addPart(0.006, item.h * 0.27, 0.009, 0, item.h * 0.06, item.d / 2 + 0.01, 0x4f4941, 0.35);
        const minute = addPart(item.w * 0.22, 0.006, 0.009, item.w * 0.09, 0, item.d / 2 + 0.012, 0x4f4941, 0.35);
        minute.rotation.z = -0.45;
      } else if (item.type === "curtain") {
        addPart(item.w, item.h, 0.035, 0, item.h / 2, 0, item.color, 0.96);
        const foldCount = 5;
        for (let fold = 0; fold < foldCount; fold += 1) {
          const foldX = -item.w / 2 + (item.w / (foldCount - 1)) * fold;
          addPart(0.015, item.h * 0.96, 0.048, foldX, item.h / 2, 0.025, 0xc5b49f, 0.98);
        }
      } else if (item.type === "curtainRod") {
        const rod = addCylinder(item.h / 2, item.h / 2, item.w, 0, 0, 0, item.color, 18, 0.34);
        rod.rotation.z = Math.PI / 2;
        [-item.w / 2, item.w / 2].forEach((end) => {
          const finial = addCylinder(0.028, 0.028, 0.055, end, 0, 0, item.color, 18, 0.32);
          finial.rotation.z = Math.PI / 2;
        });
        [-item.w * 0.39, item.w * 0.39].forEach((supportX) => {
          addPart(0.025, 0.025, 0.11, supportX, -0.025, -0.045, item.color, 0.34, 0.35);
          addPart(0.07, 0.07, 0.018, supportX, -0.025, -0.105, item.color, 0.34, 0.35);
        });
      } else if (item.type === "wallShelf") {
        if (item.name.startsWith("CARLO")) {
          addPart(item.w, 0.025, item.d, 0, -item.h / 2 + 0.0125, 0, 0xf4f2ed, 0.58);
          addPart(item.w, item.h, 0.025, 0, 0, -item.d / 2 + 0.0125, 0xf4f2ed, 0.58);
          addPart(0.025, item.h, item.d, -item.w / 2 + 0.0125, 0, 0, 0xf4f2ed, 0.58);
          addPart(0.025, item.h, item.d, item.w / 2 - 0.0125, 0, 0, 0xf4f2ed, 0.58);
        } else {
          addPart(item.w, item.h, item.d, 0, 0, 0, 0xb99b78, 0.72);
          addPart(item.w * 0.8, 0.18, 0.08, -item.w * 0.1, 0.12, 0, 0x9a836a, 0.8);
          addPart(item.w * 0.28, 0.05, 0.16, -item.w * 0.22, 0.08, 0, 0xede5db, 0.9);
          addPart(item.w * 0.22, 0.07, 0.12, item.w * 0.05, 0.08, 0, 0x70806f, 0.9);
          addCylinder(0.04, 0.055, 0.12, item.w * 0.27, 0.12, 0, 0xd2b28c, 18, 0.75);
        }
      } else if (item.type === "hangingPlant") {
        addCylinder(0.07, 0.065, 0.11, 0, 0.055, 0, 0x292d2d, 20, 0.72);
        [-0.065, -0.025, 0.025, 0.07].forEach((vineX, index) => {
          const length = 0.25 + index * 0.055;
          addCylinder(0.006, 0.006, length, vineX, -length / 2 + 0.02, index % 2 ? 0.02 : -0.01, 0x4e6f50, 9, 0.9);
          for (let leaf = 0; leaf < 4; leaf += 1) {
            const leafPart = addPart(0.055, 0.028, 0.012, vineX + (leaf % 2 ? 0.025 : -0.025), -0.055 - leaf * (length / 4), 0.015, 0x668663, 0.92);
            leafPart.rotation.z = leaf % 2 ? 0.35 : -0.35;
          }
        });
      } else if (item.type === "smallPlant") {
        addCylinder(0.055, 0.065, 0.085, 0, 0.0425, 0, 0xd8c8b3, 18, 0.82);
        [-0.045, -0.015, 0.018, 0.05].forEach((leafX, index) => {
          const leaf = addPart(0.035, 0.105 + index * 0.01, 0.018, leafX, 0.12, 0, 0x71856e, 0.92);
          leaf.rotation.z = (index - 1.5) * 0.2;
        });
      } else if (item.type === "wallArt") {
        addWallPanel(item.w + 0.035, item.h + 0.035, 0.03, 0, 0x8d735c, 0.18);
        addWallPanel(item.w - 0.018, item.h - 0.018, 0.019, 0, 0xf1e8dc, 0.04);
        addPart(item.w * 0.24, item.h * 0.48, 0.012, -item.w * 0.18, 0.015, 0.022, 0x889078, 0.92);
        addPart(item.w * 0.31, item.h * 0.18, 0.013, item.w * 0.12, -item.h * 0.17, 0.024, 0xc9aa88, 0.9);
        addCylinder(item.w * 0.11, item.w * 0.11, 0.013, item.w * 0.13, item.h * 0.12, 0.024, 0xb9a589, 28, 0.94).rotation.x = Math.PI / 2;
      } else if (item.type === "wallDecor") {
        addWallPanel(item.w + 0.045, item.h + 0.045, 0.034, 0, 0xa77e5b, 0.12);
        addWallPanel(item.w - 0.018, item.h - 0.018, 0.019, 0, 0xeee3d5, 0.05);
        addPart(item.w * 0.48, item.h * 0.18, 0.012, 0, item.h * 0.22, 0.024, 0x87927b, 0.9);
        addPart(item.w * 0.22, item.h * 0.36, 0.013, -item.w * 0.16, -item.h * 0.08, 0.025, 0xc7a27f, 0.9);
        addPart(item.w * 0.22, item.h * 0.27, 0.013, item.w * 0.16, -item.h * 0.13, 0.025, 0xb8aa93, 0.94);
      } else if (item.type === "ledStrip") {
        const glowParts = [
          addPart(item.w, 0.018, 0.018, 0, item.h / 2, 0, 0xf2cc83, 0),
          addPart(item.w, 0.018, 0.018, 0, -item.h / 2, 0, 0xf2cc83, 0),
          addPart(0.018, item.h, 0.018, -item.w / 2, 0, 0, 0xf2cc83, 0),
          addPart(0.018, item.h, 0.018, item.w / 2, 0, 0, 0xf2cc83, 0),
        ];
        glowParts.forEach((glow) => {
          (glow.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xffbd67);
          (glow.material as THREE.MeshStandardMaterial).emissiveIntensity = item.id === selectedId ? 1.35 : 0.92;
          glow.castShadow = false;
        });
        const mirrorGlow = new THREE.PointLight(0xffc982, item.id === selectedId ? 0.32 : 0.18, 1.6, 2);
        mirrorGlow.position.set(0, 0, 0.18);
        group.add(mirrorGlow);
      } else if (item.type === "chair") {
        addPart(item.w * 0.9, 0.08, item.d * 0.9, 0, 0.48, 0, item.color);
        addPart(item.w * 0.78, 0.5, 0.08, 0, 0.73, -item.d * 0.36, item.color);
        addCylinder(0.035, 0.045, 0.42, 0, 0.25, 0, 0x687574, 14, 0.35);
      } else {
        addPart(item.w, Math.max(0.12, item.h), item.d, 0, Math.max(0.12, item.h) / 2, 0, item.color);
      }

      furnitureMeshes.push(group);
      scene.add(group);
    });

    const disposeScene = () => {
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };

    if (captureOnly && onWallSnapshots) {
      const captureWidth = 1200;
      const captureHeight = 800;
      renderer.setSize(captureWidth, captureHeight, false);
      renderer.setPixelRatio(1);
      camera.aspect = captureWidth / captureHeight;
      camera.fov = 46;
      camera.near = 0.05;
      camera.far = 50;
      grid.visible = false;
      ceilingObjects.forEach((object) => { object.visible = false; });

      const views = roomCornerCameraViews(room);
      const snapshots = views.map((view) => {
        (Object.keys(surfaceObjects) as WallSurface[]).forEach((surface) => {
          surfaceObjects[surface].forEach((object) => { object.visible = true; });
          furnitureSurfaceObjects[surface].forEach((object) => { object.visible = true; });
        });
        camera.fov = view.fieldOfView;
        camera.position.set(...view.position);
        camera.lookAt(...view.target);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        return { id: view.id, title: view.title, dimensions: view.dimensions, image: renderer.domElement.toDataURL("image/png") };
      });
      onWallSnapshots(snapshots);
      return disposeScene;
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const chooseItem = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(furnitureMeshes, true)[0];
      let target: THREE.Object3D | null = hit?.object ?? null;
      while (target && !target.userData.itemId) target = target.parent;
      if (target?.userData.itemId) onSelect(target.userData.itemId);
    };

    let activePointerId: number | null = null;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let lookDragDistance = 0;
    const beginLook = (event: PointerEvent) => {
      if (activePointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      activePointerId = event.pointerId;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      lookDragDistance = 0;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const updateLook = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      const deltaX = event.clientX - previousPointerX;
      const deltaY = event.clientY - previousPointerY;
      previousPointerX = event.clientX;
      previousPointerY = event.clientY;
      lookDragDistance += Math.hypot(deltaX, deltaY);
      yaw += deltaX * 0.0055;
      pitch = Math.max(-1.15, Math.min(1.15, pitch - deltaY * 0.0045));
      applyCameraLook();
    };
    const finishLook = (event: PointerEvent, selectOnTap: boolean) => {
      if (event.pointerId !== activePointerId) return;
      if (selectOnTap && lookDragDistance < 5) chooseItem(event);
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      activePointerId = null;
    };
    const endLook = (event: PointerEvent) => finishLook(event, true);
    const cancelLook = (event: PointerEvent) => finishLook(event, false);
    renderer.domElement.addEventListener("pointerdown", beginLook);
    renderer.domElement.addEventListener("pointermove", updateLook);
    renderer.domElement.addEventListener("pointerup", endLook);
    renderer.domElement.addEventListener("pointercancel", cancelLook);

    const resize = () => {
      const width = Math.max(320, mount.clientWidth);
      const height = Math.max(430, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let animationId = 0;
    const animate = () => {
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", beginLook);
      renderer.domElement.removeEventListener("pointermove", updateLook);
      renderer.domElement.removeEventListener("pointerup", endLook);
      renderer.domElement.removeEventListener("pointercancel", cancelLook);
      disposeScene();
    };
  }, [room, items, selectedId, onSelect, captureOnly, onWallSnapshots, initialView]);

  return <div ref={mountRef} className={captureOnly ? "three-stage capture-stage" : "three-stage"} />;
}

function FloorPlan({ room, items, selectedId, showPlanOverlay, overlayOpacity, onSelect, onMove, idPrefix = "interactive", showProposalDimensions = true }: { room: Room; items: Furniture[]; selectedId: string | null; showPlanOverlay: boolean; overlayOpacity: number; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void; idPrefix?: string; showProposalDimensions?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const viewBox = `-0.55 -0.58 ${room.width + 1.55} ${room.height + 1.2}`;
  const polygon = room.outline.map((point) => `${point.x},${point.y}`).join(" ");

  const toSvgPoint = (event: ReactPointerEvent<SVGSVGElement | SVGGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    return matrix ? point.matrixTransform(matrix) : null;
  };

  const startDrag = (event: ReactPointerEvent<SVGGElement>, item: Furniture) => {
    const point = toSvgPoint(event);
    if (!point) return;
    onSelect(item.id);
    if (item.fixed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: item.id, dx: point.x - item.x, dy: point.y - item.y };
  };

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const point = toSvgPoint(event);
    if (!point) return;
    onMove(drag.current.id, point.x - drag.current.dx, point.y - drag.current.dy);
  };

  return (
    <svg
      ref={svgRef}
      className="floor-svg"
      viewBox={viewBox}
      role="img"
      aria-label={`Möblierbarer Grundriss ${room.name}, ${room.area}`}
      onPointerMove={moveDrag}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <defs>
          <pattern id={`grid-${idPrefix}-${room.id}`} width="0.5" height="0.5" patternUnits="userSpaceOnUse">
          <path d="M .5 0 L 0 0 0 .5" fill="none" className="grid-line" strokeWidth="0.008" />
        </pattern>
          <pattern id={`parquet-${idPrefix}-${room.id}`} width="0.48" height="1.12" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width=".24" height=".56" className="parquet-board tone-a" />
          <rect x=".24" y="-.28" width=".24" height=".56" className="parquet-board tone-b" />
          <rect x="0" y=".56" width=".24" height=".56" className="parquet-board tone-c" />
          <rect x=".24" y=".28" width=".24" height=".56" className="parquet-board tone-d" />
          <rect x=".24" y=".84" width=".24" height=".56" className="parquet-board tone-b" />
        </pattern>
          <pattern id={`tile-${idPrefix}-${room.id}`} width="0.3" height="0.3" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="0.3" height="0.3" className="hall-tile" />
          <path d="M .3 0 L 0 0 0 .3" className="hall-grout" />
        </pattern>
          <filter id={`item-shadow-${idPrefix}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.025" stdDeviation="0.025" floodOpacity="0.18" />
        </filter>
          <clipPath id={`room-clip-${idPrefix}-${room.id}`}>
          <polygon points={polygon} />
        </clipPath>
      </defs>
      <polygon points={polygon} className={`room-floor ${room.id}`} />
      {room.id === "zimmer1" && <polygon points={polygon} fill={`url(#parquet-${idPrefix}-${room.id})`} className="parquet-floor" />}
      {room.id === "vorraum" && <polygon points={polygon} fill={`url(#tile-${idPrefix}-${room.id})`} className="tile-floor" />}
      {showPlanOverlay && room.id === "zimmer1" && (
        <image
          href="/reference-plan.png"
          x="-9.138"
          y="-0.794"
          width="21.005"
          height="14.853"
          preserveAspectRatio="none"
          opacity={overlayOpacity}
          clipPath={`url(#room-clip-${idPrefix}-${room.id})`}
          className="plan-underlay"
        />
      )}
      <polygon points={polygon} fill={`url(#grid-${idPrefix}-${room.id})`} className="grid-fill" />
      <polygon points={polygon} className="room-wall" />

      {room.id === "zimmer1" && (
        <g className="entrance-gap" aria-label="Exakt 25 cm freier Streifen zwischen Schrank und Eingangswand">
          <rect x="2.25" y="2.71" width="0.25" height="0.62" rx="0.025" />
          <text x="2.375" y="3.02" textAnchor="middle" transform="rotate(-90 2.375 3.02)">25 cm frei</text>
        </g>
      )}

      {room.openings.map((opening, index) => {
        const vertical = opening.x1 === opening.x2;
        const label = openingPlanLabelPlacement(opening, room);
        const hinge = opening.swing?.hinge === "end"
          ? { x: opening.x2, y: opening.y2 }
          : { x: opening.x1, y: opening.y1 };
        const closedEnd = opening.swing?.hinge === "end"
          ? { x: opening.x1, y: opening.y1 }
          : { x: opening.x2, y: opening.y2 };
        return (
          <g key={`${opening.label}-${index}`}>
            <line x1={opening.x1} y1={opening.y1} x2={opening.x2} y2={opening.y2} className={`opening ${opening.kind}`} />
            {opening.kind === "window" && vertical && (
              <>
                <line x1={opening.x1 - 0.045} y1={opening.y1} x2={opening.x2 - 0.045} y2={opening.y2} className="window-frame-inner" />
                <line
                  x1={opening.x1 - 0.09}
                  y1={opening.y1 + (opening.y2 - opening.y1) * windowVerticalPlacement().verticalMullionRatio}
                  x2={opening.x1 + 0.025}
                  y2={opening.y1 + (opening.y2 - opening.y1) * windowVerticalPlacement().verticalMullionRatio}
                  className="window-mullion"
                />
              </>
            )}
            {opening.kind === "door" && opening.swing && (
              <>
                <line x1={hinge.x} y1={hinge.y} x2={opening.swing.openX} y2={opening.swing.openY} className="door-leaf" />
                <path
                  d={`M ${closedEnd.x} ${closedEnd.y} A ${openingLength(opening)} ${openingLength(opening)} 0 0 ${opening.swing.sweep} ${opening.swing.openX} ${opening.swing.openY}`}
                  className="door-swing"
                />
              </>
            )}
            <text
              x={label.x}
              y={label.y}
              className="opening-label"
              textAnchor={label.anchor}
              transform={opening.kind === "door" && vertical ? `rotate(${opening.x1 === room.width ? 90 : -90} ${label.x} ${label.y})` : undefined}
            >
              {opening.label} · {formatCentimeters(openingLength(opening))}
            </text>
          </g>
        );
      })}

      <g className="fixture-layer" aria-label="Installationen aus Vermietungsplan, Fotos und Video">
          {ROOM_FIXTURES[room.id].map((fixture) => (
            <g
              key={fixture.id}
              transform={`translate(${fixture.x} ${fixture.y})`}
              className={`fixture-symbol ${fixture.kind}`}
              role="img"
              aria-label={`${fixture.label}: ${fixture.note}`}
            >
              {fixture.kind === "ceiling-light" ? (
                <>
                  <circle r=".09" />
                  <line x1="-.055" y1="0" x2=".055" y2="0" />
                  <line x1="0" y1="-.055" x2="0" y2=".055" />
                </>
              ) : fixture.kind === "smoke-detector" ? (
                <>
                  <circle r=".075" />
                  <circle r=".025" />
                </>
              ) : fixture.kind === "outlet" || fixture.kind === "multi-outlet" ? (
                <>
                  <rect x={fixture.kind === "multi-outlet" ? "-.105" : "-.055"} y="-.045" width={fixture.kind === "multi-outlet" ? ".21" : ".11"} height=".09" rx=".018" />
                  {(fixture.kind === "multi-outlet" ? [-0.065, 0, 0.065] : [-0.022, 0.022]).map((offset) => <circle key={offset} cx={offset} cy="0" r=".009" />)}
                </>
              ) : fixture.kind === "distribution-panel" ? (
                <rect x="-.14" y="-.2" width=".28" height=".4" rx=".018" />
              ) : fixture.kind === "intercom" ? (
                <rect x="-.06" y="-.045" width=".12" height=".09" rx=".012" />
              ) : (
                <rect x={fixture.kind === "vent-cover" ? "-.07" : "-.045"} y={fixture.kind === "vent-cover" ? "-.07" : "-.045"} width={fixture.kind === "vent-cover" ? ".14" : ".09"} height={fixture.kind === "vent-cover" ? ".14" : ".09"} rx=".012" />
              )}
            </g>
          ))}
        </g>

      <g className="dimension dim-width">
        <line x1="0" y1="-0.28" x2={room.width} y2="-0.28" />
        <line x1="0" y1="-0.36" x2="0" y2="-0.2" />
        <line x1={room.width} y1="-0.36" x2={room.width} y2="-0.2" />
        <text x={room.width / 2} y="-0.36" textAnchor="middle">{formatCentimeters(room.width)}</text>
      </g>
      {room.id === "zimmer1" ? (
        <g className="dimension dim-height">
          <line x1="-0.26" y1="0" x2="-0.26" y2="2.7" />
          <line x1="-0.34" y1="0" x2="-0.18" y2="0" />
          <line x1="-0.34" y1="2.7" x2="-0.18" y2="2.7" />
          <text x="-0.34" y="1.35" textAnchor="middle" transform="rotate(-90 -.34 1.35)">270 cm · bis Schrankfront</text>
        </g>
      ) : (
        <g className="dimension dim-height">
          <line x1="-0.26" y1="0" x2="-0.26" y2={room.height} />
          <line x1="-0.34" y1="0" x2="-0.18" y2="0" />
          <line x1="-0.34" y1={room.height} x2="-0.18" y2={room.height} />
          <text x="-0.34" y={room.height / 2} textAnchor="middle" transform={`rotate(-90 -.34 ${room.height / 2})`}>{formatCentimeters(room.height)}</text>
        </g>
      )}
      {room.id === "zimmer1" && (
        <g className="dimension secondary">
          <line x1={room.width + 0.46} y1="0" x2={room.width + 0.46} y2="3.97" />
          {[0, 1.29, 2.6, 3.97].map((y) => (
            <line key={`window-chain-tick-${y}`} x1={room.width + 0.39} y1={y} x2={room.width + 0.53} y2={y} />
          ))}
          <text x={room.width + 0.57} y="0.645" transform={`rotate(-90 ${room.width + 0.57} .645)`} textAnchor="middle">129 cm · Tisch</text>
          <text x={room.width + 0.57} y="1.945" transform={`rotate(-90 ${room.width + 0.57} 1.945)`} textAnchor="middle">131 cm · Fenster</text>
          <text x={room.width + 0.57} y="3.285" transform={`rotate(-90 ${room.width + 0.57} 3.285)`} textAnchor="middle">137 cm · Handmaß</text>

          <line x1="0" y1="3.58" x2="2.5" y2="3.58" />
          <line x1="0" y1="3.51" x2="0" y2="3.65" />
          <line x1="2.25" y1="3.51" x2="2.25" y2="3.65" />
          <line x1="2.5" y1="3.51" x2="2.5" y2="3.65" />
          <text x="1.25" y="3.76" textAnchor="middle" className="dimension-detail">225 + 25 = 250 cm bis Eingang</text>

          <line x1="2.7" y1="4.22" x2="3.5" y2="4.22" />
          <line x1="2.7" y1="4.15" x2="2.7" y2="4.29" />
          <line x1="3.5" y1="4.15" x2="3.5" y2="4.29" />
          <text x="3.1" y="4.16" textAnchor="middle">80 cm lichte Türöffnung · Anschlag rechts</text>

          <line x1="3.5" y1="3.08" x2="3.56" y2="3.08" />
          <line x1="3.5" y1="3.03" x2="3.5" y2="3.13" />
          <line x1="3.56" y1="3.03" x2="3.56" y2="3.13" />
          <text x="3.53" y="2.98" textAnchor="middle" className="dimension-detail">6 cm hinter Tür</text>
        </g>
      )}

      {orderFloorPlanItems(items).map((item) => {
        const outside = isOutside(item, room);
        const overlap = collides(item, items);
        const doorConflict = blocksDoor(item, room);
        const showPlanLabel = !["bed120", "rug", "plant", "curtain", "curtainRod", "hangingPlant", "smallPlant", "wallMirror", "wallPanel", "wallShelf", "wallArt", "wallDecor", "ledStrip", "wallLamp", "wallClock", "nightstand"].includes(item.type);
        return (
          <g
            key={item.id}
            transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
            className={`furniture ${item.type} ${item.fixed ? "fixed" : "editable"} ${item.id === selectedId ? "selected" : ""} ${outside || overlap || doorConflict ? "invalid" : ""}`}
            onPointerDown={(event) => startDrag(event, item)}
            role="button"
            aria-label={`${item.name}, ${furniturePlanDimensions(item)}`}
          >
            <rect x={-item.w / 2} y={-item.d / 2} width={item.w} height={item.d} rx="0.06" fill={item.color} filter={`url(#item-shadow-${idPrefix})`} />
            {item.type === "wardrobe" && (
              <g className="wardrobe-detail" aria-hidden="true">
                {EVIDENCE_FURNITURE_APPEARANCE.wardrobe.panels.map((panel, index) => (
                  <rect
                    key={`wardrobe-panel-fill-${index}`}
                    className={panel === "mirror" ? "mirror-panel" : "white-panel"}
                    x={-item.w / 2 + (item.w / 5) * index + 0.012}
                    y={-item.d / 2 + 0.025}
                    width={item.w / 5 - 0.024}
                    height={item.d - 0.05}
                    rx="0.018"
                  />
                ))}
                {[1, 2, 3, 4].map((panel) => (
                  <line key={`wardrobe-panel-${panel}`} x1={-item.w / 2 + (item.w / 5) * panel} y1={-item.d / 2 + 0.02} x2={-item.w / 2 + (item.w / 5) * panel} y2={item.d / 2 - 0.02} />
                ))}
                {[-0.47, -0.41, 0.41, 0.47].map((x, index) => (
                  <line key={`wardrobe-handle-${index}`} x1={x} y1={0.09} x2={x} y2={0.21} className="furniture-handle" />
                ))}
              </g>
            )}
            {item.type === "desk" && (
              <g className="desk-detail" aria-hidden="true">
                <rect x={item.w / 2 - 0.375} y={-item.d / 2 + 0.035} width="0.34" height={item.d - 0.07} rx="0.022" className="drawer-bank" />
                {[1, 2, 3].map((drawer) => (
                  <line key={`desk-drawer-${drawer}`} x1={item.w / 2 - 0.36} y1={-item.d / 2 + (item.d / 4) * drawer} x2={item.w / 2 - 0.05} y2={-item.d / 2 + (item.d / 4) * drawer} />
                ))}
                <line x1={-item.w / 2 + 0.06} y1={-item.d / 2 + 0.04} x2={-item.w / 2 + 0.06} y2={item.d / 2 - 0.04} className="side-panel" />
              </g>
            )}
            {item.type === "bed120" && (
              <g className="bed-detail" aria-hidden="true">
                {[-1, 0, 1].map((panel) => (
                  <rect key={`head-${panel}`} className="bero-panel bero-head" x={panel * 0.44 - 0.205} y={-item.d / 2 + 0.025} width="0.41" height="0.19" rx=".075" />
                ))}
                <rect x={-item.w / 2 + 0.08} y={-item.d / 2 + 0.24} width={item.w - 0.16} height={item.d - 0.3} rx=".04" />
                <rect x={-item.w / 2 + 0.16} y={-item.d / 2 + 0.34} width=".42" height=".24" rx=".04" />
                <rect x={item.w / 2 - 0.58} y={-item.d / 2 + 0.34} width=".42" height=".24" rx=".04" />
                <path d={`M ${-item.w / 2 + 0.08} ${item.d * 0.08} Q 0 ${item.d * 0.14} ${item.w / 2 - 0.08} ${item.d * 0.08}`} />
                <rect className="bed-throw" x={-item.w / 2 + 0.08} y={item.d / 2 - 0.43} width={item.w - 0.16} height=".27" rx=".025" />
                {[-1, 0, 1].map((panel) => (
                  <rect key={`foot-${panel}`} className="bero-panel bero-foot" x={panel * 0.44 - 0.205} y={item.d / 2 - 0.19} width="0.41" height="0.165" rx=".065" />
                ))}
              </g>
            )}
            {item.type === "rug" && <rect className="rug-detail" x={-item.w / 2 + 0.035} y={-item.d / 2 + 0.035} width={item.w - 0.07} height={item.d - 0.07} rx=".08" />}
            {item.type === "nightstand" && <g className="nightstand-detail" aria-hidden="true"><rect x={-item.w / 2 + 0.018} y={-item.d / 2 + 0.018} width={item.w - 0.036} height={item.d - 0.036} rx=".02" /><line x1={-item.w / 2 + 0.035} y1={item.d / 2 - 0.055} x2={item.w / 2 - 0.035} y2={item.d / 2 - 0.055} /><circle cx="0" cy="-.018" r=".05" /><line x1="0" y1=".032" x2="0" y2=".095" /></g>}
            {item.type === "pouf" && <circle className="pouf-detail" r={item.w * 0.38} />}
            {item.type === "plant" && <g className="plant-detail"><circle r=".12" /><path d="M 0 -.08 C -.16 -.2 -.17 -.35 -.05 -.42 M 0 -.08 C .16 -.2 .17 -.35 .05 -.42 M 0 -.06 C -.03 -.25 .03 -.43 0 -.52" /></g>}
            {item.type === "wallMirror" && <rect className="wall-mirror-detail" x={-item.w / 2 + 0.03} y={-item.d / 2 + 0.01} width={item.w - 0.06} height={item.d - 0.02} rx=".018" />}
            {item.type === "wallPanel" && <g className="wall-panel-detail" aria-hidden="true">{[-0.1, -0.05, 0, 0.05, 0.1].map((offset) => <line key={offset} x1={offset} y1={-item.d / 2} x2={offset} y2={item.d / 2} />)}</g>}
            {item.type === "curtain" && <g className="curtain-detail"><line x1={-item.w / 2} y1="0" x2={item.w / 2} y2="0" /><path d={`M ${-item.w / 2} 0 Q ${-item.w / 4} ${item.d / 2} 0 0 T ${item.w / 2} 0`} /></g>}
            {item.type === "curtainRod" && <g className="curtain-rod-detail"><line x1={-item.w / 2} y1="0" x2={item.w / 2} y2="0" /><circle cx={-item.w / 2} cy="0" r=".025" /><circle cx={item.w / 2} cy="0" r=".025" /></g>}
            {item.type === "wallShelf" && <line className="wall-shelf-detail" x1={-item.w / 2} y1="0" x2={item.w / 2} y2="0" />}
            {(item.type === "hangingPlant" || item.type === "smallPlant") && <g className="plant-detail"><circle r={item.type === "hangingPlant" ? ".07" : ".045"} /><path d="M 0 0 C -.05 -.06 -.07 -.12 -.02 -.17 M 0 0 C .05 -.06 .07 -.12 .02 -.17" /></g>}
            {(item.type === "wallArt" || item.type === "wallDecor") && <rect className="wall-art-detail" x={-item.w / 2 + 0.02} y={-item.d / 2 + 0.008} width={item.w - 0.04} height={item.d - 0.016} rx=".012" />}
            {item.type === "ledStrip" && <line className="led-detail" x1={-item.w / 2} y1="0" x2={item.w / 2} y2="0" />}
            {item.type === "wallLamp" && <g className="wall-lamp-detail"><circle r=".04" /><path d="M -.03 .01 L 0 -.04 L .03 .01" /></g>}
            {item.type === "wallClock" && <g className="wall-clock-detail"><circle r={item.w / 2} /><line x1="0" y1="0" x2="0" y2={-item.w * 0.28} /><line x1="0" y1="0" x2={item.w * 0.22} y2="0" /></g>}
            <line x1="0" y1={-item.d / 2} x2="0" y2={-item.d / 2 + Math.min(0.16, item.d / 3)} className="orientation-mark" />
            {showPlanLabel && <g transform={`rotate(${-item.rotation})`} className="furniture-copy">
              <text className="furniture-label" textAnchor="middle" y="-0.055" dominantBaseline="middle">{item.name}</text>
              <text className="furniture-size" textAnchor="middle" y="0.12">{furniturePlanDimensions(item)}</text>
              {item.fixed && <text className="furniture-lock" textAnchor="middle" y="0.23">FIXIERT</text>}
            </g>}
          </g>
        );
      })}
      {room.id === "zimmer1" && (
        <g className="dimension furniture-dimensions" aria-label="Möbelmaße aus der Handskizze">
          <line x1="3.01" y1="0.14" x2="3.56" y2="0.14" />
          <line x1="3.01" y1="0.07" x2="3.01" y2="0.21" />
          <line x1="3.56" y1="0.07" x2="3.56" y2="0.21" />
          <text x="3.285" y="0.1" textAnchor="middle">55 cm Tiefe</text>

          <line x1="0.16" y1="2.71" x2="0.16" y2="3.33" />
          <line x1="0.09" y1="2.71" x2="0.23" y2="2.71" />
          <line x1="0.09" y1="3.33" x2="0.23" y2="3.33" />
          <text x="0.22" y="3.02" textAnchor="middle" transform="rotate(-90 .22 3.02)">62 cm Tiefe</text>
        </g>
      )}
      {room.id === "zimmer1" && showProposalDimensions && (
        <g className="dimension proposal-dimensions" aria-label="Maße und Orientierung des Einrichtungsvorschlags">
          <line x1="0" y1="1.53" x2="2.2" y2="1.53" />
          <line x1="0" y1="1.46" x2="0" y2="1.6" />
          <line x1="2.2" y1="1.46" x2="2.2" y2="1.6" />
          <text x="1.1" y="1.47" textAnchor="middle">BERO außen 220 cm · Kopfteil links</text>

          <line x1="2.32" y1="0" x2="2.32" y2="1.42" />
          <line x1="2.25" y1="0" x2="2.39" y2="0" />
          <line x1="2.25" y1="1.42" x2="2.39" y2="1.42" />
          <text x="2.38" y="0.71" textAnchor="middle" transform="rotate(-90 2.38 .71)">142 cm außen · kurze Seite zum Tisch</text>

          <text x="2.605" y="1.67" textAnchor="middle" className="dimension-detail">81 cm Bett–Tisch</text>
          <text x="1.83" y="2.63" textAnchor="middle" className="dimension-detail">84 cm vor offener Schranktür</text>
        </g>
      )}
    </svg>
  );
}

function PrintWallSnapshots({ snapshots }: { snapshots: WallSnapshot[] }) {
  if (snapshots.length !== 4) {
    return <p className="wall-snapshot-loading">Die vier 3D-Wandaufnahmen werden vorbereitet …</p>;
  }
  return (
    <div className="print-wall-snapshot-grid" aria-label="Vier wandweise Aufnahmen aus dem 3D-Raummodell">
      {snapshots.map((snapshot, index) => (
        <figure key={snapshot.id}>
          <Image
            src={snapshot.image}
            alt={`${snapshot.title}; wandweise Ansicht aus dem 3D-Modell`}
            width={1200}
            height={800}
            loading="eager"
            unoptimized
          />
          <figcaption>
            <strong>{index + 1} · {snapshot.title}</strong>
            <span>{snapshot.dimensions}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function LayoutComparisonSketch({ variant }: { variant: Zimmer1LayoutComparison }) {
  const scale = 86;
  const originX = 34;
  const originY = 24;
  const x = (meters: number) => originX + meters * scale;
  const y = (meters: number) => originY + meters * scale;
  const deskRotated = Math.abs(variant.desk.rotation) % 180 === 90;
  const deskWidth = deskRotated ? variant.desk.d : variant.desk.w;
  const deskDepth = deskRotated ? variant.desk.w : variant.desk.d;
  const deskLeft = variant.desk.x - deskWidth / 2;
  const deskTop = variant.desk.y - deskDepth / 2;
  const obstacleSouth = variant.bedside === "nightstand" ? 1.715 : variant.bedside === "lack-vertical" ? 1.72 : 1.42;
  const clearanceLabel = variant.openWardrobeDoorClearanceCm.toString().replace(".", ",");
  const roomOutline = rooms.zimmer1.outline.map((point) => `${x(point.x)},${y(point.y)}`).join(" ");

  return (
    <article className={`comparison-card ${variant.recommended ? "recommended" : ""}`}>
      <div className="comparison-card-heading">
        <div>
          <span className="comparison-kicker">Tisch + Spiegel fix zur Tür</span>
          <h3>{variant.title}</h3>
        </div>
        {variant.recommended && <span className="recommendation-badge">Empfehlung</span>}
      </div>
      <svg className="comparison-sketch" viewBox="0 0 390 405" role="img" aria-label={`Maßstäbliche Skizze: ${variant.title}`}>
        <defs>
          <marker id={`comparison-arrow-${variant.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#274c52" />
          </marker>
        </defs>
        <polygon className="comparison-room" points={roomOutline} />

        <line className="comparison-window" x1={x(3.56)} y1={y(1.29)} x2={x(3.56)} y2={y(2.6)} />
        <text className="comparison-wall-label" x={x(3.43)} y={y(1.95)} textAnchor="middle" transform={`rotate(-90 ${x(3.43)} ${y(1.95)})`}>Fenster 131</text>

        <rect className="comparison-bed" x={x(0)} y={y(0)} width={2.2 * scale} height={1.42 * scale} rx="5" />
        <rect className="comparison-bed-end" x={x(0)} y={y(0)} width={0.16 * scale} height={1.42 * scale} rx="3" />
        <rect className="comparison-bed-end" x={x(2.03)} y={y(0)} width={0.17 * scale} height={1.42 * scale} rx="3" />
        <text className="comparison-item-label" x={x(1.1)} y={y(0.64)} textAnchor="middle">BERO 142 × 220</text>
        <text className="comparison-item-note" x={x(1.1)} y={y(0.86)} textAnchor="middle">kurze Seite → Tisch</text>

        {variant.bedside === "nightstand" && (
          <>
            <rect className="comparison-nightstand" x={x(0)} y={y(1.44)} width={0.375 * scale} height={0.275 * scale} rx="2" />
            <text className="comparison-tiny-label" x={x(0.1875)} y={y(1.585)} textAnchor="middle">NT</text>
          </>
        )}
        {variant.bedside === "lack-vertical" && (
          <>
            <rect className="comparison-lack" x={x(0)} y={y(1.42)} width={0.28 * scale} height={0.3 * scale} rx="2" />
            <text className="comparison-tiny-label" x={x(0.14)} y={y(1.585)} textAnchor="middle">LACK</text>
          </>
        )}
        {variant.bedside === "lack-horizontal" && (
          <>
            <rect className="comparison-lack mounted" x={x(0)} y={y(0.15)} width={0.28 * scale} height={1.9 * scale} rx="2" />
            <text className="comparison-tiny-label" x={x(0.14)} y={y(1.1)} textAnchor="middle" transform={`rotate(-90 ${x(0.14)} ${y(1.1)})`}>LACK an Wand · über Boden</text>
          </>
        )}

        <rect className="comparison-desk" x={x(deskLeft)} y={y(deskTop)} width={deskWidth * scale} height={deskDepth * scale} rx="3" />
        <line
          className="comparison-facing-arrow"
          x1={x(2.915)}
          y1={y(0.57)}
          x2={x(2.915)}
          y2={y(1.0)}
          markerEnd={`url(#comparison-arrow-${variant.id})`}
        />
        <text className="comparison-tiny-label" x={x(variant.desk.x)} y={y(variant.desk.y) + 3} textAnchor="middle">Tisch</text>

        <rect className="comparison-wardrobe" x={x(0)} y={y(2.71)} width={2.25 * scale} height={0.62 * scale} />
        {[0.45, 0.9, 1.35, 1.8].map((panel) => <line key={panel} className="comparison-wardrobe-panel" x1={x(panel)} y1={y(2.71)} x2={x(panel)} y2={y(3.33)} />)}
        <text className="comparison-item-label" x={x(1.125)} y={y(3.08)} textAnchor="middle">Schrank 225 × 62</text>

        <path className="comparison-swing" d={`M ${x(0)},${y(2.71)} A ${0.45 * scale},${0.45 * scale} 0 0 1 ${x(0.45)},${y(2.26)}`} />
        <line className="comparison-open-door" x1={x(0.45)} y1={y(2.71)} x2={x(0.45)} y2={y(2.26)} />
        <text className="comparison-tiny-label" x={x(0.73)} y={y(2.39)} textAnchor="start">45-cm-Tür offen</text>

        <line className="comparison-measure" x1={x(0.62)} y1={y(obstacleSouth)} x2={x(0.62)} y2={y(2.26)} />
        <line className="comparison-measure-cap" x1={x(0.56)} y1={y(obstacleSouth)} x2={x(0.68)} y2={y(obstacleSouth)} />
        <line className="comparison-measure-cap" x1={x(0.56)} y1={y(2.26)} x2={x(0.68)} y2={y(2.26)} />
        <text className="comparison-measure-label" x={x(0.7)} y={y((obstacleSouth + 2.26) / 2)}>{clearanceLabel} cm</text>

        <rect className="comparison-gap" x={x(2.25)} y={y(2.71)} width={0.25 * scale} height={0.62 * scale} />
        <text className="comparison-tiny-label" x={x(2.375)} y={y(3.04)} textAnchor="middle" transform={`rotate(-90 ${x(2.375)} ${y(3.04)})`}>25 cm</text>

        <line className="comparison-entry-door" x1={x(2.7)} y1={y(3.97)} x2={x(3.5)} y2={y(3.97)} />
        <line className="comparison-open-door entry" x1={x(3.5)} y1={y(3.97)} x2={x(3.5)} y2={y(3.17)} />
        <path className="comparison-swing entry" d={`M ${x(2.7)},${y(3.97)} A ${0.8 * scale},${0.8 * scale} 0 0 1 ${x(3.5)},${y(3.17)}`} />
        <text className="comparison-wall-label" x={x(2.9)} y={y(3.86)} textAnchor="middle">Tür 80</text>
      </svg>
      <div className="comparison-metrics" aria-label="Freiraummaße">
        <span aria-label={`${variant.deskToBedCm} cm Tischabstand`} className={variant.deskToBedCm < 60 ? "critical" : "good"}><strong>{variant.deskToBedCm} cm</strong> Tischabstand</span>
        <span aria-label={`${clearanceLabel} cm vor offener Schranktür`} className={variant.openWardrobeDoorClearanceCm < 60 ? "critical" : "good"}><strong>{clearanceLabel} cm</strong> vor offener Schranktür</span>
      </div>
      <p className="comparison-verdict">
        {variant.bedside === "none" && "Die ruhigste und luftigste Lösung; dafür fehlt direkt am Bett eine Ablage für Handy, Wasser oder Buch."}
        {variant.bedside === "nightstand" && "Beste Alltagslösung: kompakte Ablage und Schubladen. Die Schranktür öffnet vollständig, der Durchgang dahinter ist mit 54,5 cm jedoch knapp."}
        {variant.bedside === "lack-vertical" && "Viel Stauraum, aber das 190 cm hohe Regal wirkt zwischen Bett und Schrank deutlich schwerer; der Durchgang misst nur 54 cm."}
        {variant.bedside === "lack-horizontal" && "Der Boden bleibt frei, doch das 190 cm lange und 28 cm tiefe Regal dominiert die Bettwand und ragt weit über die Liegezone."}
      </p>
    </article>
  );
}

// Historical comparison sheet retained for archived exports; not rendered in the corrected final variant.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LayoutComparisonSection() {
  const initialComparison = ZIMMER1_LAYOUT_COMPARISONS.find((variant) => variant.recommended) ?? ZIMMER1_LAYOUT_COMPARISONS[0];
  const [activeComparisonId, setActiveComparisonId] = useState(initialComparison.id);
  const activeComparison = ZIMMER1_LAYOUT_COMPARISONS.find((variant) => variant.id === activeComparisonId) ?? ZIMMER1_LAYOUT_COMPARISONS[0];
  const comparisonItems = useMemo(() => createComparisonFurniture(activeComparison.id), [activeComparison.id]);
  const ignoreComparisonSelection = useCallback(() => undefined, []);
  const activeClearance = activeComparison.openWardrobeDoorClearanceCm.toString().replace(".", ",");

  return (
    <section className="layout-comparison-panel" aria-labelledby="layout-comparison-heading">
      <div className="layout-comparison-heading">
        <div>
          <span className="eyebrow">Vier maßstäbliche Varianten</span>
          <h2 id="layout-comparison-heading">Vier Ablagelösungen direkt in 3D vergleichen</h2>
        </div>
        <p><strong>Festgelegt:</strong> Tisch zur Tür, Spiegel mittig darüber. <strong>Empfehlung:</strong> der kleine Action-Nachttisch – praktischer als ganz ohne Ablage und wesentlich ruhiger als das 190-cm-LACK.</p>
      </div>
      <div className="comparison-3d-shell" aria-labelledby="comparison-3d-heading">
        <div className="comparison-3d-head">
          <div>
            <span className="eyebrow">Interaktiver 3D-Vergleich</span>
            <h3 id="comparison-3d-heading">{activeComparison.title}</h3>
          </div>
          <div className="comparison-3d-measures" aria-label="Aktive Abstände">
            <span><strong>{activeComparison.deskToBedCm} cm</strong> zum Tisch</span>
            <span className={activeComparison.openWardrobeDoorClearanceCm < 60 ? "critical" : ""}><strong>{activeClearance} cm</strong> vor Schranktür</span>
          </div>
        </div>
        <div className="comparison-3d-tabs" role="tablist" aria-label="3D-Variante wählen">
          {ZIMMER1_LAYOUT_COMPARISONS.map((variant, index) => (
            <button
              key={variant.id}
              type="button"
              role="tab"
              aria-selected={variant.id === activeComparison.id}
              className={variant.id === activeComparison.id ? "active" : ""}
              onClick={() => setActiveComparisonId(variant.id)}
            >
              <b>{String.fromCharCode(65 + index)}</b>
              <span>{variant.title}<small>{variant.bedside === "none" ? "84 cm frei" : variant.bedside === "nightstand" ? "27,5 × 37,5 cm" : "IKEA · 30 × 28 × 190 cm"}</small></span>
            </button>
          ))}
        </div>
        <div className="comparison-3d-stage">
          <ThreeRoom key={activeComparison.id} room={rooms.zimmer1} items={comparisonItems} selectedId={null} onSelect={ignoreComparisonSelection} initialView={comparisonCamera} />
          <div className="comparison-3d-instruction"><strong>Im Raum drehen</strong><span>Ziehen, um Bett, Tisch und Schrank aus jeder Richtung zu prüfen.</span></div>
        </div>
        <p className="comparison-3d-proof">3D zeigt exakt dieselben Möbelpositionen wie die Maßskizzen. Bett, Schrank, Tisch, Spiegel, Fenster und Tür bleiben unverändert; nur die Ablage auf der Schrankseite wechselt.</p>
      </div>
      <div className="comparison-2d-heading"><span className="eyebrow">Technische Kontrolle</span><h3>Alle vier Varianten als 2D-Maßskizze</h3></div>
      <div className="layout-comparison-grid">
        {ZIMMER1_LAYOUT_COMPARISONS.map((variant) => <LayoutComparisonSketch key={variant.id} variant={variant} />)}
      </div>
      <div className="comparison-expert-note">
        <strong>Schrankprüfung</strong>
        <span>Die dargestellte 45-cm-Schranktür lässt sich in allen vier Fällen um 90° öffnen. Der Nachttisch lässt 54,5 cm, das hochkante LACK 54 cm und die freie beziehungsweise wandmontierte Variante am Boden 84 cm. Das LACK ist laut IKEA 30 × 28 × 190 cm groß.</span>
      </div>
    </section>
  );
}

// Historical comparison sheet retained for archived exports; not rendered in the corrected final variant.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AnnotatedCornerSketch() {
  const items = useMemo(
    () => createComparisonFurniture("door-nightstand").filter((item) => item.type !== "wardrobe"),
    [],
  );
  const ignoreSelection = useCallback(() => undefined, []);

  return (
    <section className="annotated-corner-sheet" aria-labelledby="annotated-corner-title" data-testid="annotated-corner-sheet">
      <header className="annotated-corner-head">
        <div>
          <span className="eyebrow">Fixierte Endvariante · Action-Nachttisch</span>
          <h2 id="annotated-corner-title">Bemaßte 3D-Eckansicht</h2>
          <p>Blick von der Eingangsecke auf Bettwand und Schreibtischwand</p>
        </div>
      </header>

      <div className="annotated-corner-stage" aria-label="3D-Eckansicht mit Zentimetermaßen">
        <ThreeRoom
          room={rooms.zimmer1}
          items={items}
          selectedId={null}
          onSelect={ignoreSelection}
          initialView={annotatedCornerCamera}
        />
        <svg className="annotated-leaders" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="annotated-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7">
              <circle cx="5" cy="5" r="3.3" fill="#c97d46" />
            </marker>
          </defs>
          <path d="M 270 694 L 440 618" markerEnd="url(#annotated-dot)" />
          <path d="M 244 430 L 365 505" markerEnd="url(#annotated-dot)" />
          <path d="M 1308 626 L 1125 560" markerEnd="url(#annotated-dot)" />
          <path d="M 1275 250 L 1085 295" markerEnd="url(#annotated-dot)" />
          <path d="M 900 760 L 940 665" markerEnd="url(#annotated-dot)" />
        </svg>
        <div className="annotated-callout bed"><strong>142 × 220 cm</strong><span>Bett · Außenmaß</span></div>
        <div className="annotated-callout nightstand"><strong>27,5 × 37,5 × 50,5 cm</strong><span>Action-Nachttisch</span></div>
        <div className="annotated-callout desk"><strong>129 × 55 cm</strong><span>Schreibtisch · Blickrichtung Tür</span></div>
        <div className="annotated-callout mirror"><strong>110 × 70 cm</strong><span>Spiegel über dem Tisch</span></div>
        <div className="annotated-callout desk-gap"><strong>7 cm</strong><span>Bett bis Tischkante</span></div>
        <div className="annotated-orientation"><span>STANDPUNKT</span><strong>Eingangsecke</strong><small>Schrank für freie Sicht ausgeblendet</small></div>
      </div>

      <div className="annotated-bottom-row">
        <div className="annotated-measure-grid" aria-label="Maßlegende">
          {ZIMMER1_ANNOTATED_MEASURES.slice(0, 6).map((measure) => (
            <div key={measure.label}><span>{measure.label}</span><strong>{measure.value}</strong></div>
          ))}
        </div>
        <aside className="wardrobe-clearance-detail" aria-label="Detail der Schranköffnung">
          <div className="wardrobe-detail-copy"><span>Schranköffnung · Draufsicht</span><strong>Tür öffnet vollständig</strong></div>
          <svg viewBox="0 0 440 142" role="img" aria-label="54,5 cm vor offener Schranktür und 25 cm Eingangsspalt">
            <defs>
              <marker id="detail-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            <rect className="wardrobe-detail-cabinet" x="20" y="77" width="225" height="52" rx="3" />
            <line className="wardrobe-detail-door" x1="65" y1="77" x2="65" y2="32" />
            <path className="wardrobe-detail-swing" d="M 20 77 A 45 45 0 0 1 65 32" />
            <rect className="wardrobe-detail-nightstand" x="20" y="5" width="38" height="28" rx="3" />
            <line className="wardrobe-detail-measure" x1="78" y1="33" x2="78" y2="76" markerStart="url(#detail-arrow)" markerEnd="url(#detail-arrow)" />
            <text x="88" y="58">54,5 cm frei</text>
            <line className="wardrobe-detail-measure" x1="246" y1="104" x2="271" y2="104" markerStart="url(#detail-arrow)" markerEnd="url(#detail-arrow)" />
            <text x="258" y="91" textAnchor="middle">25 cm</text>
            <path className="wardrobe-detail-entry" d="M 271 129 L 351 129 M 351 129 L 351 49" />
            <text x="312" y="119" textAnchor="middle">Tür 80</text>
            <text x="132" y="110" textAnchor="middle">Schrank 225 × 62 cm</text>
            <text x="20" y="18">Nachttisch</text>
          </svg>
          <div className="wardrobe-detail-values"><strong>54,5 cm vor offener Schranktür</strong><strong>25 cm Eingangsspalt</strong></div>
        </aside>
      </div>
    </section>
  );
}

// Historical source record retained for the saved pre-decoration snapshot only.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function WindowTreatmentStep() {
  const items = useMemo(() => createBaseFurniture(true), []);
  const ignoreSelection = useCallback(() => undefined, []);
  const camera = useMemo(() => ({ position: [0.62, 1.46, 1.945] as const, yaw: 0, pitch: 0.02, fieldOfView: 58 }), []);

  return (
    <section className="window-step-sheet" aria-labelledby="window-step-title" data-testid="window-treatment-step">
      <header className="window-step-head">
        <div>
          <span className="eyebrow">Einrichtung · Schritt 1</span>
          <h2 id="window-step-title">Vorhang am 131-cm-Fenster</h2>
          <p>Schwarze Studio-Home-Stange + zwei beige Lorris-Vorhänge in Leinenoptik</p>
        </div>
        <div className="window-step-choice"><strong>Beste Kombination</strong><span>Schwarz setzt eine klare Linie; Beige verbindet Bouclébett, weiße Möbel und Parkett.</span></div>
      </header>

      <div className="window-step-grid">
        <figure className="window-elevation">
          <svg viewBox="0 0 780 400" role="img" aria-label="Maßzeichnung der Fensterwand mit 22 Zentimeter Stangenüberstand links und rechts">
            <defs>
              <marker id="window-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            <rect className="window-wall-elevation" x="70" y="38" width="635.2" height="312" />
            <rect className="window-glass-elevation" x="276.4" y="59.6" width="209.6" height="216" />
            <line className="window-frame-elevation" x1="416.8" y1="59.6" x2="416.8" y2="275.6" />
            <line className="window-frame-elevation" x1="276.4" y1="228.1" x2="486" y2="228.1" />
            <line className="window-rod-elevation" x1="241.2" y1="47.6" x2="521.2" y2="47.6" />
            <circle className="window-rod-elevation" cx="239" cy="47.6" r="4" />
            <circle className="window-rod-elevation" cx="523.4" cy="47.6" r="4" />
            <path className="window-curtain-elevation" d="M 241.2 50 C 248 72 244 93 251 116 C 244 139 251 163 245 186 C 252 211 246 236 251 260 C 245 286 251 321 241.2 347 L 276.4 347 C 270 320 276 292 269 266 C 277 237 270 212 276 185 C 269 158 276 131 270 105 C 276 80 270 62 276.4 50 Z" />
            <path className="window-curtain-elevation" d="M 486 50 C 493 73 487 96 494 119 C 487 143 494 166 488 190 C 495 214 489 239 495 263 C 489 289 495 322 486 347 L 521.2 347 C 515 320 521 294 514 267 C 522 240 515 214 521 188 C 514 160 521 134 515 107 C 521 81 515 63 521.2 50 Z" />

            <g className="window-dimension">
              <line x1="241.2" y1="18" x2="521.2" y2="18" markerStart="url(#window-arrow)" markerEnd="url(#window-arrow)" />
              <text x="381.2" y="13" textAnchor="middle">175 cm Stange</text>
              <line x1="241.2" y1="31" x2="276.4" y2="31" markerStart="url(#window-arrow)" markerEnd="url(#window-arrow)" />
              <text x="258.8" y="27" textAnchor="middle">22</text>
              <line x1="486" y1="31" x2="521.2" y2="31" markerStart="url(#window-arrow)" markerEnd="url(#window-arrow)" />
              <text x="503.6" y="27" textAnchor="middle">22</text>
              <line x1="276.4" y1="292" x2="486" y2="292" markerStart="url(#window-arrow)" markerEnd="url(#window-arrow)" />
              <text x="381.2" y="307" textAnchor="middle">131 cm Fenster</text>
              <line x1="548" y1="38" x2="548" y2="47.6" markerStart="url(#window-arrow)" markerEnd="url(#window-arrow)" />
              <text x="558" y="45">8 cm zur Decke</text>
              <line x1="566" y1="47.6" x2="566" y2="59.6" markerStart="url(#window-arrow)" markerEnd="url(#window-arrow)" />
              <text x="576" y="58">10 cm über Fenster</text>
              <line x1="614" y1="47.6" x2="614" y2="347" markerStart="url(#window-arrow)" markerEnd="url(#window-arrow)" />
              <text x="628" y="200" transform="rotate(90 628 200)" textAnchor="middle">250 cm Fertighöhe · 2 cm Bodenabstand</text>
            </g>
            <text className="window-wall-chain" x="173.2" y="370" textAnchor="middle">129 cm Wand</text>
            <text className="window-wall-chain" x="381.2" y="370" textAnchor="middle">131 cm Fenster</text>
            <text className="window-wall-chain" x="595.6" y="370" textAnchor="middle">137 cm Wand</text>
            <text className="window-clearance-note" x="70" y="390">107 cm linke Ecke → Stangenende</text>
            <text className="window-clearance-note" x="705.2" y="390" textAnchor="end">Stangenende → rechte Ecke 115 cm</text>
          </svg>
          <figcaption>Frontansicht · beide Stoffpakete liegen geöffnet außerhalb der Glasfläche</figcaption>
        </figure>

        <div className="window-step-3d">
          <ThreeRoom room={rooms.zimmer1} items={items} selectedId={null} onSelect={ignoreSelection} initialView={camera} />
          <div className="window-step-overlay"><strong>22 cm links · 131 cm Fenster · 22 cm rechts</strong><span>Stangenmitte 252 cm · Vorhang endet 2 cm über Boden</span></div>
        </div>
      </div>

      <div className="window-step-specs">
        <div><span>Stange</span><strong>{ZIMMER1_WINDOW_TREATMENT.rodLengthCm} cm · Ø {ZIMMER1_WINDOW_TREATMENT.rodDiameterCm} cm</strong><small>Action Studio Home · Schwarz</small></div>
        <div><span>Vorhang</span><strong>2 × 140 × 260 cm</strong><small>Action Lorris · Beige · Leinenoptik</small></div>
        <div><span>Kürzen</span><strong>je ca. 10 cm</strong><small>Fertighöhe 250 cm · 2 cm bodenfrei</small></div>
        <div><span>Montage</span><strong>22 cm je Seite</strong><small>10 cm über Fenster · 8 cm unter Decke</small></div>
        <div><span>Links der Stange</span><strong>107 cm bis Raumecke</strong><small>129 cm Wand minus 22 cm Überstand</small></div>
        <div><span>Rechts der Stange</span><strong>115 cm bis Raumecke</strong><small>davon 35 cm frei bis zum geöffneten Türblatt</small></div>
        <div><span>Hinter geöffneter Tür</span><strong>ca. 6 cm</strong><small>rechter Anschlag laut Original-Vermietungsplan</small></div>
      </div>

      <div className="window-step-links">
        <a href="https://www.action.com/de-at/p/2566914/studio-home-vorhangstange/" target="_blank" rel="noreferrer">Action · Studio Home Vorhangstange</a>
        <a href="https://www.action.com/de-at/p/3222401/vorhang-in-leinenoptik-lorris/" target="_blank" rel="noreferrer">Action · 2× Lorris Leinenoptik Beige</a>
      </div>
    </section>
  );
}

function ReferenceViewer({ roomId, active, onChange }: { roomId: RoomId; active: ReferenceKind; onChange: (kind: ReferenceKind) => void }) {
  const references = referenceSets[roomId];
  const reference = references[active];
  const isAlignedZimmerSketch = roomId === "zimmer1" && active === "hand";

  return (
    <div className="reference-viewer">
      <div className="reference-tabs" role="tablist" aria-label="Referenz auswählen">
        {(Object.keys(references) as ReferenceKind[]).map((kind) => (
          <button key={kind} role="tab" aria-selected={active === kind} className={active === kind ? "active" : ""} onClick={() => onChange(kind)}>
            {references[kind].label}
          </button>
        ))}
      </div>
      <TransformWrapper key={`${roomId}-${active}`} initialScale={0.65} minScale={0.45} maxScale={6} centerOnInit limitToBounds={false}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="zoom-actions" aria-label="Referenz vergrößern">
              <button onClick={() => zoomOut()} aria-label="Verkleinern">−</button>
              <button onClick={() => resetTransform()} aria-label="Ansicht zurücksetzen">Einpassen</button>
              <button onClick={() => zoomIn()} aria-label="Vergrößern">+</button>
            </div>
            <TransformComponent wrapperClass="reference-zoom" contentClass="reference-content">
              <div className={`reference-image-frame ${reference.rotation === 90 ? "rotated-clockwise" : ""}`}>
                <Image src={reference.src} alt={reference.alt} width={reference.width} height={reference.height} draggable="false" unoptimized />
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      {isAlignedZimmerSketch && (
        <div className="orientation-proof">
          <strong>Planrichtig ausgerichtet · nicht gespiegelt</strong>
          <span>oben: 356 cm</span>
          <span>rechts: Tisch 129 + Fenster 131 + Restwand 137 cm</span>
          <span>unten: Schrank 225 × 62 cm · bündig + 25 cm zur Eingangsseite</span>
        </div>
      )}
      <p className="reference-hint">
        Scrollen oder ziehen zum Prüfen. Bei Zimmer 1 sind 225 × 62 cm das Schrankmaß, 25 cm nur der Abstand zur Eingangsseite und 270 cm die freie Tiefe bis zur Schrankfront – keine zusätzlichen Raumwände.
      </p>
    </div>
  );
}

export default function Home() {
  const [roomId, setRoomId] = useState<RoomId>("zimmer1");
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [itemsByRoom, setItemsByRoom] = useState<Record<RoomId, Furniture[]>>(() => createDefaultItemsByRoom());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [referenceKind, setReferenceKind] = useState<ReferenceKind>("hand");
  const [showPlanOverlay, setShowPlanOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.28);
  const [importError, setImportError] = useState<string | null>(null);
  const [wallSnapshots, setWallSnapshots] = useState<WallSnapshot[]>([]);
  const [printPreparing, setPrintPreparing] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [is3dFullscreen, setIs3dFullscreen] = useState(false);
  const [cameraStep, setCameraStep] = useState(0);
  const [cameraZoomLevel, setCameraZoomLevel] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const threeViewRef = useRef<HTMLDivElement>(null);
  const room = rooms[roomId];
  const items = itemsByRoom[roomId];
  const mainThreeView = useMemo(() => {
    const pose = room.id === "zimmer1"
      ? zimmer1CameraStepPose(room, cameraStep)
      : centeredRoomCameraPose(room);
    return { position: pose.position, yaw: pose.yaw, pitch: pose.pitch, fieldOfView: cameraFieldOfViewForZoom(cameraZoomLevel) };
  }, [cameraStep, cameraZoomLevel, room]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const roomVariant = roomId !== "zimmer1"
    ? "vorraum"
    : items.some((item) => item.id.startsWith("zimmer1-snapshot-"))
      ? "snapshot"
      : items.some((item) => item.id.startsWith("zimmer1-decor-"))
        ? "decorated"
        : "ground";
  const hasZimmer1Design = roomVariant === "decorated";
  const variantLabel = roomVariant === "decorated"
    ? "Bett + Deko · aktiv"
    : roomVariant === "snapshot"
      ? "Gesicherter Vorzustand · unverändert"
      : roomVariant === "ground"
        ? "Korrigierter Grundbestand"
        : "Vorraum";
  const placementItems = roomId === "zimmer1"
    ? createDecoratedFurniture(true).filter((item) => item.id.startsWith("zimmer1-decor-") && item.type !== "bed120")
    : [];
  const receiveWallSnapshots = useCallback((snapshots: WallSnapshot[]) => {
    setWallSnapshots(snapshots);
  }, []);
  const ignoreThreeSelection = useCallback(() => undefined, []);

  useEffect(() => {
    const syncFullscreen = () => setIs3dFullscreen(document.fullscreenElement === threeViewRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggle3dFullscreen = async () => {
    if (!threeViewRef.current) return;
    if (document.fullscreenElement === threeViewRef.current) await document.exitFullscreen();
    else await threeViewRef.current.requestFullscreen();
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const current = JSON.parse(saved) as Partial<Record<RoomId, Furniture[]>>;
          setItemsByRoom({
            zimmer1: Array.isArray(current.zimmer1) ? current.zimmer1 : createDecoratedFurniture(true),
            vorraum: Array.isArray(current.vorraum) ? current.vorraum : [],
          });
        } else {
          const legacyKey = LEGACY_STORAGE_KEYS.find((key) => localStorage.getItem(key));
          const legacy = legacyKey ? localStorage.getItem(legacyKey) : null;
          if (legacy) {
            const previous = JSON.parse(legacy) as Partial<Record<RoomId, Furniture[]>>;
            setItemsByRoom({
              zimmer1: createDecoratedFurniture(true),
              vorraum: Array.isArray(previous.vorraum) ? previous.vorraum : [],
            });
          }
        }
      } catch {
        // An invalid old draft should never block the planner.
      }
      const requestedRoom = new URLSearchParams(window.location.search).get("room");
      if (requestedRoom === "vorraum" || requestedRoom === "zimmer1") setRoomId(requestedRoom);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsByRoom));
    } catch {
      // Private browsing or blocked storage must not interrupt active planning.
    }
  }, [itemsByRoom, hydrated]);

  const selectRoom = (nextRoomId: RoomId) => {
    setRoomId(nextRoomId);
    setCameraStep(0);
    setCameraZoomLevel(0);
    setWallSnapshots([]);
    setSelectedId(null);
    setShowPlanOverlay(false);
  };

  const updateRoomItems = (recipe: (current: Furniture[]) => Furniture[]) => {
    setItemsByRoom((current) => ({ ...current, [roomId]: recipe(current[roomId]) }));
  };

  const addFurniture = (type: FurnitureKey) => {
    const created = makeFurniture(type, room, ((items.length % 3) - 1) * 0.18);
    updateRoomItems((current) => [...current, created]);
    setSelectedId(created.id);
  };

  const patchSelected = (patch: Partial<Furniture>) => {
    if (!selectedId) return;
    updateRoomItems((current) => patchUnlockedFurniture(current, selectedId, patch));
  };

  const moveItem = (id: string, x: number, y: number) => {
    updateRoomItems((current) => patchUnlockedFurniture(current, id, { x, y }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    if (selected?.fixed) return;
    updateRoomItems((current) => removeUnlockedFurniture(current, selectedId));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected || selected.fixed) return;
    const copy = { ...selected, id: createId(), name: `${selected.name} Kopie`, x: selected.x + 0.18, y: selected.y + 0.18 };
    updateRoomItems((current) => [...current, copy]);
    setSelectedId(copy.id);
  };

  const loadCorrectedGround = () => {
    if (roomId !== "zimmer1") return;
    updateRoomItems(() => createBaseFurniture(true));
    setSelectedId(null);
  };

  const loadDecoratedVariant = () => {
    if (roomId !== "zimmer1") return;
    updateRoomItems(() => createDecoratedFurniture(true));
    setSelectedId(null);
  };

  const loadSavedSnapshot = () => {
    if (roomId !== "zimmer1") return;
    updateRoomItems(() => createSavedPreDecorSnapshot(true));
    setSelectedId(null);
  };

  const loadPhotoEstimate = () => {
    if (roomId === "zimmer1") {
      const evidenceItems = createBaseFurniture(true);
      updateRoomItems(() => evidenceItems);
    } else {
      const shoe = makeFurniture("shoe", room);
      const bench = makeFurniture("bench", room);
      shoe.x = 0.22; shoe.y = 0.65; shoe.rotation = 90;
      bench.x = 1.35; bench.y = 2.07;
      updateRoomItems(() => [shoe, bench]);
    }
    setSelectedId(null);
  };

  const exportPlan = () => {
    const data = JSON.stringify({ version: 1, apartment: "Wohnung", rooms: itemsByRoom }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wohnung-moeblierung.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printPlan = async () => {
    if (printPreparing) return;
    setPrintPreparing(true);
    setPrintError(null);
    try {
      const deadline = Date.now() + 10000;
      let wallImages: HTMLImageElement[] = [];
      while (wallImages.length !== 4 && Date.now() < deadline) {
        wallImages = Array.from(document.querySelectorAll<HTMLImageElement>(".print-wall-snapshot-grid img"));
        if (wallImages.length !== 4) {
          await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        }
      }
      if (wallImages.length !== 4) throw new Error("Wandansichten fehlen");
      await Promise.all(wallImages.map(async (image) => {
        if (!image.complete || image.naturalWidth === 0) await image.decode();
        if (image.naturalWidth === 0) throw new Error("Wandansicht nicht geladen");
      }));
      window.print();
    } catch {
      setPrintError("Die Wandansichten konnten noch nicht geladen werden. Bitte kurz warten und erneut drucken.");
    } finally {
      setPrintPreparing(false);
    }
  };

  const importPlan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed.rooms?.zimmer1 || !parsed.rooms?.vorraum) throw new Error("missing rooms");
      setItemsByRoom(parsed.rooms);
      setImportError(null);
    } catch {
      setImportError("Diese Datei ist kein gültiger Wohnungsmodell-Plan. Der vorhandene Entwurf wurde nicht verändert.");
    }
    event.target.value = "";
  };

  const status = useMemo(() => {
    if (!selected) return null;
    if (isOutside(selected, room)) return "Möbel ragt über die Raumgrenze.";
    if (blocksDoor(selected, room)) return "Möbel blockiert den Türbereich.";
    if (collides(selected, items)) return "Möbel überschneiden sich.";
    return "Position ist innerhalb der Raumgrenze.";
  }, [selected, room, items]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="eyebrow">Wohnungsplanung</span>
          <h1>Raumplaner</h1>
        </div>
        <div className="top-actions">
          <button className="button quiet" onClick={() => setReferencesOpen(true)}>Referenzen vergleichen</button>
          <button className="button" onClick={printPlan} disabled={printPreparing}>{printPreparing ? "PDF wird vorbereitet …" : "Drucken / PDF"}</button>
          <button className="button quiet" onClick={exportPlan}>Plan sichern</button>
          <button className="button quiet" onClick={() => importRef.current?.click()}>Plan laden</button>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={importPlan} />
          {importError && <p className="import-error" role="status">{importError}</p>}
          {printError && <p className="import-error" role="status">{printError}</p>}
        </div>
      </header>

      <section className="room-strip" aria-label="Raum wählen">
        {(Object.values(rooms) as Room[]).map((choice) => (
          <button key={choice.id} className={`room-tab ${choice.id === roomId ? "active" : ""}`} onClick={() => selectRoom(choice.id)}>
            <span>{choice.name}</span>
            <strong>{choice.area}</strong>
          </button>
        ))}
        <div className="context-chip"><span>Gesamtwohnung</span><strong>59,49 m²</strong></div>
      </section>

      <section className="workspace">
        <aside className="sidebar library-panel">
          <div className="panel-heading">
            <span className="eyebrow">Möbelbibliothek</span>
            <h2>Einfügen</h2>
          </div>
          <div className="furniture-grid">
            {(Object.entries(catalog) as [FurnitureKey, (typeof catalog)[FurnitureKey]][]).filter(([key]) => roomId !== "zimmer1" || !hiddenZimmer1LibraryItems.has(key)).map(([key, value]) => (
              <button key={key} className="furniture-choice" onClick={() => addFurniture(key)}>
                <span className="furniture-swatch" style={{ backgroundColor: value.color }} />
                <span><strong>{value.name}</strong><small>{furniturePlanDimensions({ type: key, w: value.w, d: value.d, h: value.h })}</small></span>
                <b aria-hidden="true">+</b>
              </button>
            ))}
          </div>
          <div className="preset-actions">
            {roomId === "zimmer1" && <button className="button" onClick={loadDecoratedVariant}>Bett + Deko laden</button>}
            {roomId === "zimmer1" && <button className="button secondary" onClick={loadCorrectedGround}>Bett + Deko entfernen</button>}
            {roomId === "zimmer1" && <button className="button text-button" onClick={loadSavedSnapshot}>Gesicherten Vorzustand laden</button>}
            {roomId === "vorraum" && <button className="button secondary" onClick={loadPhotoEstimate}>Bestand aus Fotos</button>}
            {roomId === "vorraum" && <button className="button text-button" onClick={() => { updateRoomItems(() => []); setSelectedId(null); }}>Raum leeren</button>}
          </div>
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <span className="eyebrow">{room.subtitle}</span>
              <h2>{room.name} <em>{room.area}</em></h2>
              {room.id === "zimmer1" && <p className="orientation-path">Fensterwand: Wand 129 → Fenster 131 → Restwand 137 cm · Tisch parallel zur Fensterwand</p>}
              {room.id === "zimmer1" && <span className={`variant-badge ${roomVariant}`}>{variantLabel}</span>}
            </div>
            <div className="canvas-actions">
              <button className="button quiet print-inline" onClick={printPlan} disabled={printPreparing}>{printPreparing ? "PDF wird vorbereitet …" : "Drucken / PDF"}</button>
              <span className="pdf-hint">{hasZimmer1Design ? "PDF-Bericht · Maßplan + 4 Wandansichten" : "PDF-Bericht · Maßplan der Grundform"}</span>
              <div className="view-toggle" role="group" aria-label="Ansicht">
                <button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}>2D Plan</button>
                <button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}>3D Raum</button>
              </div>
              {view === "2d" && room.id === "zimmer1" && (
                <div className="overlay-control">
                  <button className={showPlanOverlay ? "active" : ""} onClick={() => setShowPlanOverlay((shown) => !shown)} aria-pressed={showPlanOverlay}>Plan-Unterlage</button>
                  {showPlanOverlay && <label>Deckkraft <input type="range" min="10" max="65" value={Math.round(overlayOpacity * 100)} onChange={(event) => setOverlayOpacity(Number(event.target.value) / 100)} /></label>}
                </div>
              )}
            </div>
          </div>
          {room.id === "zimmer1" && (
            <div className="final-plan-strip" aria-label="Festgelegte Endplanung">
              <div><span>Grundausstattung</span><strong>Tisch Fensterwand · Spiegel 110 × 70</strong><small>Schrank 225 × 62 · Türen geschlossen</small></div>
              <div><span>Bettzone</span><strong>Liegefläche 120 × 200 · außen 142 × 220</strong><small>81 cm bis Tisch · 84 cm vor offener Schranktür</small></div>
              <div><span>Kopfteil + Nordwand</span><strong>4 Paneele · 2 leichte Leinwände</strong><small>Keine schwere Ablage über dem Bett</small></div>
              <div><span>Freie Zonen</span><strong>Westbild · Pflanze · Uhr</strong><small>Eingang beidseits bewusst frei</small></div>
            </div>
          )}
          <div className={`plan-stage ${view}`}>
            {view === "2d" ? (
              <FloorPlan room={room} items={items} selectedId={selectedId} showPlanOverlay={showPlanOverlay} overlayOpacity={overlayOpacity} onSelect={setSelectedId} onMove={moveItem} showProposalDimensions={hasZimmer1Design} />
            ) : (
              <div ref={threeViewRef} className="three-view-shell" data-testid="three-view-shell">
                <ThreeRoom room={room} items={items} selectedId={selectedId} onSelect={setSelectedId} initialView={mainThreeView} />
                <div className="three-view-controls" aria-label="3D-Ansicht steuern">
                  {room.id === "zimmer1" && (
                    <>
                      <button type="button" disabled={cameraStep <= -2} onClick={() => setCameraStep((step) => Math.max(-2, step - 1))}>Schritt vom Fenster weg</button>
                      <button type="button" disabled={cameraStep === 0 && cameraZoomLevel === 0} onClick={() => { setCameraStep(0); setCameraZoomLevel(0); }}>Zur Raummitte</button>
                      <button type="button" disabled={cameraStep >= 2} onClick={() => setCameraStep((step) => Math.min(2, step + 1))}>Schritt zum Fenster</button>
                    </>
                  )}
                  <button type="button" aria-label="Herauszoomen" title="Herauszoomen" disabled={cameraZoomLevel <= -5} onClick={() => setCameraZoomLevel((level) => Math.max(-5, level - 1))}>−</button>
                  <button type="button" aria-label="Hineinzoomen" title="Hineinzoomen" disabled={cameraZoomLevel >= 4} onClick={() => setCameraZoomLevel((level) => Math.min(4, level + 1))}>+</button>
                  <button type="button" aria-pressed={is3dFullscreen} onClick={toggle3dFullscreen}>
                    {is3dFullscreen ? "Vollbild schließen" : "Vollbild"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="stage-footer">
            <span className="unit-note">Alle Maße in cm</span>
            <span><i className="dot valid" /> innerhalb</span>
            <span><i className="dot invalid" /> Kollision / außerhalb</span>
            <p>{view === "2d" ? "Möbel direkt ziehen · Raster 50 cm" : "Kamera in 50-cm-Schritten bewegen · Ziehen zum Umschauen · kurz klicken für Möbel"}</p>
          </div>
        </section>

        <aside className="sidebar detail-panel">
          {selected ? (
            <>
              <div className="panel-heading">
                <span className="eyebrow">{selected.fixed ? "Fixer Grundbestand" : "Auswahl bearbeiten"}</span>
                <input className="name-input" value={selected.name} disabled={selected.fixed} onChange={(event) => patchSelected({ name: event.target.value })} aria-label="Möbelname" />
              </div>
              {selected.fixed && <div className="fixed-notice"><strong>Fixiert</strong><span>Position, Ausrichtung, Maße und Löschen sind gesperrt, damit der bestätigte Grundplan erhalten bleibt.</span></div>}
              <div className="field-grid">
                <label>X-Position <span>cm</span><input disabled={selected.fixed} type="number" min="0" max={Math.round(room.width * 100)} step="0.25" value={Number((selected.x * 100).toFixed(2))} onChange={(event) => patchSelected({ x: Number(event.target.value) / 100 })} /></label>
                <label>Y-Position <span>cm</span><input disabled={selected.fixed} type="number" min="0" max={Math.round(room.height * 100)} step="0.25" value={Number((selected.y * 100).toFixed(2))} onChange={(event) => patchSelected({ y: Number(event.target.value) / 100 })} /></label>
                <label>Breite <span>cm</span><input disabled={selected.fixed} type="number" min="20" max="400" step="0.5" value={Number((selected.w * 100).toFixed(2))} onChange={(event) => patchSelected({ w: Number(event.target.value) / 100 })} /></label>
                <label>Tiefe <span>cm</span><input disabled={selected.fixed} type="number" min="20" max="400" step="0.5" value={Number((selected.d * 100).toFixed(2))} onChange={(event) => patchSelected({ d: Number(event.target.value) / 100 })} /></label>
                <label>Höhe <span>cm</span><input disabled={selected.fixed} type="number" min="10" max="300" step="0.5" value={Number((selected.h * 100).toFixed(2))} onChange={(event) => patchSelected({ h: Number(event.target.value) / 100 })} /></label>
                <label>Drehung <span>°</span><input disabled={selected.fixed} type="number" min="-360" max="360" step="5" value={selected.rotation} onChange={(event) => patchSelected({ rotation: Number(event.target.value) })} /></label>
              </div>
              <label className="color-field">Farbe <input disabled={selected.fixed} type="color" value={selected.color} onChange={(event) => patchSelected({ color: event.target.value })} /></label>
              <div className="rotation-row">
                <button disabled={selected.fixed} className="button secondary" onClick={() => patchSelected({ rotation: selected.rotation - 45 })}>↶ 45°</button>
                <button disabled={selected.fixed} className="button secondary" onClick={() => patchSelected({ rotation: selected.rotation + 45 })}>45° ↷</button>
              </div>
              <div className={`placement-status ${status?.includes("innerhalb") ? "ok" : "warning"}`}>{status}</div>
              {selected.evidence && (
                <div className="furniture-evidence">
                  <strong>Maßgrundlage · aus Video und Skizze abgeleitet</strong>
                  <p>{selected.evidence}</p>
                </div>
              )}
              <div className="item-actions">
                <button disabled={selected.fixed} className="button secondary" onClick={duplicateSelected}>Duplizieren</button>
                <button disabled={selected.fixed} className="button danger" onClick={deleteSelected}>Entfernen</button>
              </div>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <span className="eyebrow">Planbasis</span>
                <h2>{room.name}</h2>
              </div>
              <ul className="facts">
                {room.facts.map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
              <section className="measurement-panel" aria-labelledby="measurement-heading">
                <div className="measurement-heading-row">
                  <h3 id="measurement-heading">Messquellen</h3>
                  <button className="text-link" onClick={() => setReferencesOpen(true)}>Bilder prüfen</button>
                </div>
                <ul className="measurement-list">
                  {room.measurements.map((measurement) => (
                    <li key={measurement.id} className={measurement.confidence === "limited" ? "limited" : ""}>
                      <div><strong>{measurement.label}</strong><b>{measurement.centimeters} cm</b></div>
                      <span>{sourceLabel[measurement.source]} · {confidenceLabel[measurement.confidence]}</span>
                      <p>{measurement.note}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <div className="analysis-note">
                <strong>Aus Plan + Medien rekonstruiert</strong>
                <p>Grundfläche und Raumform folgen dem Vermietungsplan; Tür- und Fensterlage wurde mit Fotos und Videos abgeglichen.</p>
              </div>
              <div className="video-note">
                <strong>{room.id === "zimmer1" ? "8 Fotos + vollständiges 8,94-s-Video abgeglichen" : "9 Fotos + vollständiges 7,23-s-Video abgeglichen"}</strong>
                <p>{room.id === "zimmer1" ? "Die Kamerafahrt läuft von Tür und Schrank über Fenster und Schreibtisch zur freien Wand zurück zum Schrank. Damit sind Tisch, Fenster und Schrankseite eindeutig verknüpft; der Schrank steht links bündig und endet 25 cm vor der Eingangswand." : "Die Kamerafahrt bestätigt die Folge Eingangstür → Innentüren → weißer Verteiler → Glastür zur Wohnküche. Türseiten und Einbauten wurden deshalb nicht aus der Handskizze allein abgeleitet."}</p>
              </div>
              <div className="fixture-note">
                <strong>Installationen · mit Quelle</strong>
                <p>{room.id === "zimmer1" ? "Licht, Rauchmelder, Schalter, Fensterbedienung sowie sichtbare und planverzeichnete Anschlussgruppen sind in 2D und 3D markiert." : "Deckenlicht, Rauchmelder, Gegensprechanlage, Eingangsschalter, Steckdose und Elektroverteiler sind in 2D und 3D markiert."}</p>
                <ul className="fixture-list">
                  {ROOM_FIXTURES[room.id].map((fixture) => (
                    <li key={fixture.id}><span>{fixture.label}<small>{fixtureSourceLabel[fixture.source]}</small></span><b>{Math.round(fixture.elevation * 100)} cm Höhe</b></li>
                  ))}
                </ul>
                <small>Höhen ohne Planmaß sind aus den Bildern angenähert; Lage und Quelle stehen direkt beim jeweiligen Element.</small>
              </div>
              <div className="assumption-note">
                <strong>Vor Ort prüfen</strong>
                <p>Wandstärken, Leibungen und Raumhöhe sind für die 3D-Vorschau angenähert. Vor Möbelkauf lichte Maße nachmessen.</p>
              </div>
            </>
          )}
        </aside>
      </section>

      {roomId === "zimmer1" && (
        <>
          <section className="wall-view-panel" aria-labelledby="wall-view-heading">
            <div className="section-copy">
              <span className="eyebrow">Vier Ansichten · aus demselben Raummodell</span>
              <h2 id="wall-view-heading">Fensterwand, obere Wand, Schrank/Eingang und linke Wand</h2>
              <p>Die Aufnahmen werden direkt aus dem aktiven 3D-Modell erzeugt. Private Raumfotos sind weder hier noch in der Druckansicht enthalten.</p>
            </div>
            <PrintWallSnapshots snapshots={wallSnapshots} />
          </section>

          <section className="placement-panel" aria-labelledby="placement-heading">
            <div className="section-copy">
              <span className="eyebrow">Maßgetreuer Einbau</span>
              <h2 id="placement-heading">Platzierungsprotokoll · Variante Bett + Deko</h2>
              <p>Planpositionen sind ab der Nordwest-Ecke gemessen; Montagehöhe bezeichnet jeweils die Objektmitte über Fertigfußboden.</p>
            </div>
            <div className="placement-table-wrap">
              <table className="placement-table">
                <thead><tr><th>Objekt</th><th>Wand / Zone</th><th>Planposition</th><th>Außenmaß</th><th>Montage</th><th>Status</th></tr></thead>
                <tbody>
                  {placementItems.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong><small>{item.role}</small></td>
                      <td>{item.wall ?? "Raumzone"}</td>
                      <td>x {Math.round(item.x * 100)} · y {Math.round(item.y * 100)} cm</td>
                      <td>{furniturePlanDimensions(item)}</td>
                      <td>{item.mountHeight !== undefined ? `Mitte ${Math.round(item.mountHeight * 100)} cm` : "bodenstehend"}</td>
                      <td><span className={`evidence-pill ${item.evidenceStatus ?? "geschätzt"}`}>{item.evidenceStatus ?? "geschätzt"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="purchase-panel" aria-labelledby="purchase-heading">
            <div className="purchase-heading">
              <div><span className="eyebrow">Action + Möbelix Österreich</span><h2 id="purchase-heading">Verifizierte Produktliste</h2></div>
              <p>Produktseiten, Maße und veröffentlichte Preise wurden am 20.10.2026 geprüft. Es wurde nichts bestellt; lokalen Filialbestand vor dem Kauf erneut prüfen.</p>
            </div>
            <div className="purchase-grid">
              {purchaseSuggestions.map((product) => (
                <article className="purchase-card" key={product.href}>
                  <div className="purchase-card-top"><span className="shop-pill">{product.shop}</span><span className="purchase-price">{product.price}</span></div>
                  <strong>{product.name}</strong>
                  <span className="purchase-role">{product.role}</span>
                  <dl>
                    <div><dt>Menge</dt><dd>{product.quantity}</dd></div>
                    <div><dt>Maß</dt><dd>{product.dimensions}</dd></div>
                    <div><dt>Material</dt><dd>{product.material}</dd></div>
                    <div><dt>Montage</dt><dd>{product.mount}</dd></div>
                    <div><dt>Platzierung</dt><dd>{product.position}</dd></div>
                    <div><dt>Verfügbarkeit</dt><dd>{product.availability}</dd></div>
                  </dl>
                  <small>{product.note}</small>
                  <a href={product.href} target="_blank" rel="noreferrer">Offizielle Produktseite ↗</a>
                </article>
              ))}
            </div>
          </section>

          <section className="evidence-panel" aria-labelledby="evidence-heading">
            <div className="section-copy"><span className="eyebrow">Quellenstatus + Änderungsprotokoll</span><h2 id="evidence-heading">Belegt, geschätzt und offen</h2></div>
            <div className="evidence-grid">
              <article><span className="evidence-pill belegt">belegt</span><h3>Korrigiert und eingebaut</h3><p>Tisch und Spiegel liegen wieder an der Fensterwand. Schrankfronten bleiben geschlossen. Bett, sieben Dekoelement-Gruppen und alle vier Wandansichten nutzen dasselbe Modell.</p></article>
              <article><span className="evidence-pill geschätzt">geschätzt</span><h3>Vor Ort kontrollieren</h3><p>Raumhöhe 260 cm sowie einzelne Installations- und Montagehöhen stammen aus Foto-/Planableitungen. Vor dem Bohren Wandaufbau, Leitungen und Höhen messen.</p></article>
              <article><span className="evidence-pill offen">offen</span><h3>Nicht vorgetäuscht</h3><p>Die Planfläche 12,36 m² weicht von ca. 12,53 m² aus Handmaßen ab. BERO-Farbe ist im Shop widersprüchlich; Action-Filialbestand ist offen.</p></article>
              <article><span className="evidence-pill belegt">frei gehalten</span><h3>Eingang und Fenster</h3><p>Die 20-cm- und 6-cm-Bereiche beidseits der Tür bleiben wegen Schalter, Leibung und Türschwenk leer. Jalousie, Fensterbedienung und Lüftungsdeckel bleiben frei; Vorhang und CARLO-Regale wurden deshalb nicht übernommen.</p></article>
            </div>
          </section>
        </>
      )}

      <div className="capture-render-host" aria-hidden="true">
        <ThreeRoom room={room} items={items} selectedId={null} onSelect={ignoreThreeSelection} captureOnly onWallSnapshots={receiveWallSnapshots} />
      </div>

      <section className="print-report" aria-labelledby="print-report-heading">
          <div className="print-report-heading">
            <span className="eyebrow">PDF-Bericht · Wohnung</span>
            <h2 id="print-report-heading">{room.name} · 2D-Gesamtplan + 4 Wandansichten</h2>
            <p>Die Ausgabe wird unabhängig von der aktuell geöffneten 2D- oder 3D-Ansicht erzeugt. Private Referenzfotos erscheinen weder auf der Seite noch im PDF.</p>
          </div>
          <div className="print-plan-sheet" aria-labelledby="print-plan-heading">
            <div className="print-section-heading">
              <div><span>Maßstabsgerechte Arbeitsgrundlage</span><h3 id="print-plan-heading">{roomId === "zimmer1" ? `Druckgrundriss · ${variantLabel}` : "Druckgrundriss · Vorraum mit allen bekannten Maßen"}</h3></div>
              <p>{roomId === "zimmer1" ? "356 × 397 cm · BERO außen 142 × 220 cm · Tisch 129 × 55 cm · Schrank 225 × 62 cm · 25 cm frei" : "226 × 233 cm · fünf Türöffnungen je 80 cm · Installationen nach Plan, Fotos und Video"}</p>
            </div>
            <div className="print-floor-plan">
              <FloorPlan room={room} items={items} selectedId={null} showPlanOverlay={false} overlayOpacity={0} onSelect={() => undefined} onMove={() => undefined} idPrefix="print" showProposalDimensions={roomId === "zimmer1" && hasZimmer1Design} />
            </div>
            <p className="print-dimension-key"><strong>Alle Maße:</strong> {roomId === "zimmer1" ? "Raum 356 × 397 cm · Fensterwand 129 + 131 + 137 = 397 cm · Schrankwand 225 + 25 = 250 cm · Tür 80 cm · Tisch 129 × 55 cm · Schrank 225 × 62 cm · Bett außen 142 × 220 cm / Liegefläche 120 × 200 cm · Spiegel 110 × 70 cm." : "Raum 226 × 233 cm · Eingang 80 cm · WC 80 cm · Abstellraum 80 cm · Wohnküche 80 cm · Bad 80 cm · geschätzte Raumhöhe ca. 260 cm."}</p>
            <p className="print-orientation-note"><strong>Ausrichtung:</strong> {roomId === "zimmer1" ? "Das BERO steht in der Nordwest-Ecke: Kopfteil an der linken Wand, 220-cm-Längsachse entlang der oberen Wand. Der Tisch steht parallel zur Fensterwand im 129-cm-Abschnitt; davor bleiben 81 cm zum Bett. Nach dem 25-cm-Abstand rechts vom geschlossenen Schrank folgt der kurze Wandvorsprung und danach die 80-cm-Tür. Vor einer geöffneten 45-cm-Schranktür bleiben 84 cm. Fensterseite und Schrank-/Eingangsseite sind planrichtig, nicht gespiegelt." : "Eingang links, Wohnküche rechts, WC und Abstellraum an der oberen Wand, Bad an der unteren Wand. Alle fünf lichten Türöffnungen sind mit 80 cm eingetragen."}</p>
          </div>
          <div className="print-elevations-sheet">
            <div className="print-section-heading"><div><span>Vier Wände des Raums</span><h3>Automatische 3D-Wandansichten</h3></div><p>Fensterwand, obere Wand, Schrank/Eingang und linke Wand werden aus demselben aktiven Modell erzeugt. Keine privaten Fotos.</p></div>
            <PrintWallSnapshots snapshots={wallSnapshots} />
          </div>
          {roomId === "zimmer1" && hasZimmer1Design ? (
            <>
              <div className="print-design-summary">
                <strong>Bett + Deko</strong>
                <span>BERO außen 142 × 220 cm; Liegefläche 120 × 200 cm; 81 cm zum quellenrichtig ausgerichteten Tisch</span>
                <span>Westwand: 4 Holzpaneele als 120 × 60 cm Feld, LED-Leselicht und Leinwandbild 100 × 40 cm</span>
                <span>Nordwand: 2 leichte Leinwände je 40 × 60 × 1,2 cm; keine schwere Ablage über dem Bett</span>
                <span>Ostwand: Miscanthus 20 × 90 × 20 cm und Uhr Ø 20 × 4 cm; Fensterfunktion bleibt frei</span>
                <span>Eingang links/rechts wegen 20-/6-cm-Restflächen, Schalter und Türschwenk bewusst frei</span>
                <span>84 cm vor offener 45-cm-Schranktür; geschlossene Fronten und 25-cm-Eingangsabstand bleiben erhalten</span>
              </div>
            </>
          ) : roomId === "zimmer1" ? (
            <div className="print-design-summary">
              <strong>Grundform gespeichert</strong>
              <span>Bett und sämtliche Deko-Elemente sind aus dem aktuellen Plan entfernt.</span>
              <span>Übrig bleiben der neutral-weiße Bestandstisch 129 × 55 cm, der Spiegel 110 × 70 cm und die planbestätigten Installationen; die Tischlampe ist entfernt.</span>
              <span>Der vollständige Schrank 225 × 62 cm erscheint mit fünf geschlossenen Fronten, mittigem Spiegel und zwei schwarzen Doppelschubladen.</span>
              <span>Die Schaltfläche „Bett + Deko laden“ stellt die dekorierte Variante wieder her, ohne den Grundbestand zu überschreiben.</span>
            </div>
          ) : (
            <div className="print-design-summary">
              <strong>Vorraum · Bestandsgrundlage</strong>
              <span>Raum 226 × 233 cm; alle fünf Türöffnungen sind mit jeweils 80 cm eingezeichnet.</span>
              <span>Gegensprechanlage ca. 142 cm, Lichtschalter ca. 105 cm und Steckdose ca. 30 cm über Fertigfußboden.</span>
              <span>Elektroverteiler ca. 145 cm hoch; Deckenanschluss und Rauchmelder liegen bei ca. 256–257 cm.</span>
              <span>Helles quadratisches Feinsteinzeug; keine privaten Raumfotos im PDF.</span>
            </div>
          )}
          {roomId === "zimmer1" && (
            <div className="print-products-sheet">
              <div className="print-section-heading"><div><span>Action + Möbelix Österreich</span><h3>Produkt- und Platzierungsliste</h3></div><p>Prüfstand 20.10.2026 · keine Bestellung ausgelöst · Filialbestand vor Kauf kontrollieren.</p></div>
              <table className="print-product-table">
                <thead><tr><th>Produkt</th><th>Menge / Außenmaß</th><th>Montage</th><th>Position</th><th>Preis / Status</th></tr></thead>
                <tbody>{purchaseSuggestions.map((product) => <tr key={`print-${product.href}`}><td><strong>{product.shop} · {product.name}</strong><span>{product.href}</span></td><td>{product.quantity}<br />{product.dimensions}</td><td>{product.mount}</td><td>{product.position}</td><td>{product.price}<br />{product.availability}</td></tr>)}</tbody>
              </table>
              <div className="print-open-issues"><strong>Offen / vor Ort prüfen:</strong><span>Planfläche 12,36 m² vs. ca. 12,53 m² aus Handmaßen; BERO-Farbe Grau/Creme widersprüchlich; Raum-/Installationshöhen teilweise geschätzt; Wandaufbau und Leitungen vor Bohrung prüfen.</span></div>
            </div>
          )}
        </section>

      {referencesOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setReferencesOpen(false)}>
          <div className="plan-modal reference-modal" role="dialog" aria-modal="true" aria-label={`Plan- und Handskizzen für ${room.name}`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><span className="eyebrow">Maßquellen</span><h2>{room.name} genau prüfen</h2></div><button className="close-button" onClick={() => setReferencesOpen(false)} aria-label="Schließen">×</button></div>
            <ReferenceViewer roomId={room.id} active={referenceKind} onChange={setReferenceKind} />
          </div>
        </div>
      )}
    </main>
  );
}
