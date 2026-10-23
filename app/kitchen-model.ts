import type { Point } from "./room-model";

export type KitchenEvidenceStatus = "plan-scaled" | "visually-confirmed" | "estimated";

export type KitchenElementKind =
  | "base-cabinet"
  | "wall-cabinet"
  | "worktop"
  | "backsplash"
  | "sink"
  | "hob"
  | "oven"
  | "microwave";

export type KitchenElement = {
  id: string;
  kind: KitchenElementKind;
  label: string;
  /** Global apartment X coordinate in metres. */
  x: number;
  /** Global apartment Y coordinate in metres. */
  y: number;
  /** Vertical centre above the finished floor in metres. */
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: 0 | 90;
  color: string;
  evidence: KitchenEvidenceStatus;
  sourceNote: string;
};

export type KitchenLayout = {
  roomId: "wohnkueche";
  name: string;
  elements: readonly KitchenElement[];
  fixed: true;
};

const WHITE_FRONT = "#f4f3ef";
const BLACK_WORKTOP = "#17191a";
const LIGHT_OAK = "#d7b98d";
const METAL = "#aeb4b4";

/**
 * Fixed L-shaped kitchen reconstructed from the local 1:50 apartment plan
 * and the four local perspective drawings. The global footprint is plan
 * scaled; module splits and vertical mounting heights remain estimates.
 */
export const KITCHEN_LAYOUT: KitchenLayout = {
  roomId: "wohnkueche",
  name: "L-Küche · plan- und perspektivbasiert",
  fixed: true,
  elements: [
    {
      id: "kitchen-base-north",
      kind: "base-cabinet",
      label: "Unterschränke · oberer Lauf",
      x: 1.53,
      y: 3.77,
      z: 0.435,
      width: 1.86,
      depth: 0.6,
      height: 0.87,
      rotation: 0,
      color: WHITE_FRONT,
      evidence: "plan-scaled",
      sourceNote: "Lage und Tiefe aus dem lokalen Wohnungsplan skaliert; einzelne Korpusbreiten und Höhe bleiben angenähert.",
    },
    {
      id: "kitchen-base-west",
      kind: "base-cabinet",
      label: "Unterschränke · linker Lauf",
      x: 0.3,
      y: 4.945,
      z: 0.435,
      width: 1.75,
      depth: 0.6,
      height: 0.87,
      rotation: 90,
      color: WHITE_FRONT,
      evidence: "plan-scaled",
      sourceNote: "Lage und Tiefe aus dem lokalen Wohnungsplan skaliert; der Lauf endet vor dem Vorraumdurchgang.",
    },
    {
      id: "kitchen-worktop-north",
      kind: "worktop",
      label: "Schwarze Arbeitsplatte · oberer Lauf",
      x: 1.53,
      y: 3.77,
      z: 0.895,
      width: 1.86,
      depth: 0.62,
      height: 0.05,
      rotation: 0,
      color: BLACK_WORKTOP,
      evidence: "visually-confirmed",
      sourceNote: "Schwarze Oberfläche in allen lokalen Küchenperspektiven sichtbar; Außenmaß folgt dem Grundriss.",
    },
    {
      id: "kitchen-worktop-west",
      kind: "worktop",
      label: "Schwarze Arbeitsplatte · linker Lauf",
      x: 0.3,
      y: 4.945,
      z: 0.895,
      width: 1.75,
      depth: 0.62,
      height: 0.05,
      rotation: 90,
      color: BLACK_WORKTOP,
      evidence: "visually-confirmed",
      sourceNote: "Schwarze Oberfläche in allen lokalen Küchenperspektiven sichtbar; Außenmaß folgt dem Grundriss.",
    },
    {
      id: "kitchen-backsplash-north",
      kind: "backsplash",
      label: "Helle Holzrückwand · oberer Lauf",
      x: 1.53,
      y: 3.495,
      z: 1.22,
      width: 1.86,
      depth: 0.03,
      height: 0.6,
      rotation: 0,
      color: LIGHT_OAK,
      evidence: "visually-confirmed",
      sourceNote: "Helle Holzoptik aus den lokalen Küchenperspektiven; Montagehöhe angenähert.",
    },
    {
      id: "kitchen-backsplash-west",
      kind: "backsplash",
      label: "Helle Holzrückwand · linker Lauf",
      x: 0.025,
      y: 4.945,
      z: 1.22,
      width: 1.75,
      depth: 0.03,
      height: 0.6,
      rotation: 90,
      color: LIGHT_OAK,
      evidence: "visually-confirmed",
      sourceNote: "Helle Holzoptik aus den lokalen Küchenperspektiven; Montagehöhe angenähert.",
    },
    {
      id: "kitchen-wall-north-left",
      kind: "wall-cabinet",
      label: "Hängeschrank · Spülenseite",
      x: 0.95,
      y: 3.66,
      z: 1.92,
      width: 0.7,
      depth: 0.36,
      height: 0.72,
      rotation: 0,
      color: WHITE_FRONT,
      evidence: "estimated",
      sourceNote: "Weiße Hängeschränke sind sichtbar; Einzelbreite und Montagehöhe sind in den Perspektiven nicht bemaßt.",
    },
    {
      id: "kitchen-wall-north-center",
      kind: "wall-cabinet",
      label: "Hängeschrank · Mitte",
      x: 1.61,
      y: 3.66,
      z: 1.92,
      width: 0.62,
      depth: 0.36,
      height: 0.72,
      rotation: 0,
      color: WHITE_FRONT,
      evidence: "estimated",
      sourceNote: "Weiße Hängeschränke sind sichtbar; Einzelbreite und Montagehöhe sind in den Perspektiven nicht bemaßt.",
    },
    {
      id: "kitchen-wall-north-microwave",
      kind: "wall-cabinet",
      label: "Hängeschrank · Mikrowellenseite",
      x: 2.16,
      y: 3.66,
      z: 1.92,
      width: 0.48,
      depth: 0.36,
      height: 0.72,
      rotation: 0,
      color: WHITE_FRONT,
      evidence: "estimated",
      sourceNote: "Korpusaufteilung proportional aus den Perspektiven; genaue Breite offen.",
    },
    {
      id: "kitchen-wall-west-upper",
      kind: "wall-cabinet",
      label: "Hängeschränke · linker Lauf",
      x: 0.18,
      y: 4.79,
      z: 1.92,
      width: 1.38,
      depth: 0.36,
      height: 0.72,
      rotation: 90,
      color: WHITE_FRONT,
      evidence: "estimated",
      sourceNote: "Anzahl und weiße Fronten sichtbar; Laufteilung und Montagehöhe nicht bemaßt.",
    },
    {
      id: "kitchen-sink",
      kind: "sink",
      label: "Einbauspüle",
      x: 0.96,
      y: 3.77,
      z: 0.93,
      width: 0.52,
      depth: 0.42,
      height: 0.04,
      rotation: 0,
      color: METAL,
      evidence: "plan-scaled",
      sourceNote: "Spülenlage im Wohnungsplan direkt eingezeichnet; Beckenform aus den Perspektiven.",
    },
    {
      id: "kitchen-hob",
      kind: "hob",
      label: "Elektrokochfeld",
      x: 0.3,
      y: 5.02,
      z: 0.93,
      width: 0.58,
      depth: 0.52,
      height: 0.025,
      rotation: 90,
      color: BLACK_WORKTOP,
      evidence: "plan-scaled",
      sourceNote: "Kochfeld und EH-Anschluss im Wohnungsplan eingezeichnet; Außenmaß angenähert.",
    },
    {
      id: "kitchen-oven",
      kind: "oven",
      label: "Einbaubackofen",
      x: 0.3,
      y: 5.02,
      z: 0.47,
      width: 0.56,
      depth: 0.05,
      height: 0.59,
      rotation: 90,
      color: "#202324",
      evidence: "visually-confirmed",
      sourceNote: "Backofen unter dem Kochfeld in den lokalen Küchenperspektiven sichtbar; Gerätedetails nicht produktbezogen.",
    },
    {
      id: "kitchen-microwave",
      kind: "microwave",
      label: "Integrierte Mikrowelle",
      x: 2.16,
      y: 3.455,
      z: 1.83,
      width: 0.42,
      depth: 0.05,
      height: 0.32,
      rotation: 0,
      color: "#252829",
      evidence: "visually-confirmed",
      sourceNote: "Mikrowelle im rechten Hängeschrank der lokalen Perspektiven sichtbar; Gerätemaß offen.",
    },
  ],
};

export function kitchenBaseFootprints(): Array<{ id: string; polygon: Point[] }> {
  return [
    {
      id: "kitchen-base-north",
      polygon: [
        { x: 0.6, y: 3.47 },
        { x: 2.46, y: 3.47 },
        { x: 2.46, y: 4.07 },
        { x: 0.6, y: 4.07 },
      ],
    },
    {
      id: "kitchen-base-west",
      polygon: [
        { x: 0, y: 3.47 },
        { x: 0.6, y: 3.47 },
        { x: 0.6, y: 5.82 },
        { x: 0, y: 5.82 },
      ],
    },
  ];
}

export function kitchenPlanBounds() {
  return { minX: 0, minY: 3.47, maxX: 2.46, maxY: 5.82 } as const;
}
