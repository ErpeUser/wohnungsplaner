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
  room("wohnkueche", "Wohnküche", 21.82, true, "parquet-oak", [
    point(0, 3.47), point(2.5, 3.47), point(2.5, 4.08), point(3.56, 4.08),
    point(3.56, 3.17), point(3.74, 3.17), point(3.74, 3.97), point(3.82, 4.6),
    point(4.48, 6.67), point(5.12, 8.86), point(3.58, 8.95), point(0, 8.95),
  ]),
  room("zimmer1", "Zimmer 1", 12.36, true, "parquet-oak", [
    point(0, 0), point(3.56, 0), point(3.56, 3.97), point(2.5, 3.97),
    point(2.5, 3.33), point(0, 3.33),
  ]),
  room("zimmer2", "Zimmer 2", 10.15, true, "parquet-oak", [
    point(0, 8.95), point(3.58, 8.95), point(3.58, 11.78), point(0, 11.78),
  ]),
  room("vorraum", "Vorraum", 5.2, true, "porcelain-light", [
    point(-2.42, 5.87), point(-0.16, 5.87), point(-0.16, 8.2), point(-2.42, 8.2),
  ]),
  room("abstellraum", "Abstellraum", 2, true, "porcelain-light", [
    point(-1.33, 4.1), point(-0.16, 4.1), point(-0.16, 5.81), point(-1.33, 5.81),
  ]),
  room("bad", "Bad", 4.31, true, "porcelain-light", [
    point(-2.42, 8.2), point(-0.09, 8.2), point(-0.09, 10.05), point(-2.42, 10.05),
  ]),
  room("wc", "WC", 1.42, true, "porcelain-light", [
    point(-2.42, 4.1), point(-1.52, 4.1), point(-1.52, 5.68), point(-2.42, 5.68),
  ]),
  room("loggia", "Loggia", 2.23, true, "epoxy-grey", [
    point(5.12, 8.86), point(5.2, 8.6), point(5.643, 10.07), point(3.58, 10.07),
    point(3.58, 8.95),
  ]),
  room("balkon", "Balkon", 3.8, false, "outdoor-concrete", [
    point(3.58, 10.07), point(5.643, 10.07), point(6.12, 11.65), point(3.58, 11.78),
  ]),
];

const wallGraph = buildWallGraph(roomOutlines);

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
  confidence: "confirmed" | "plan-scaled";
};

const sourceOpenings: LegacyOpening[] = [
  opening("zimmer1-window", "Fenster Zimmer 1", ["zimmer1"], "window", 3.56, 1.29, 3.56, 2.6, 2.42, 0.62, undefined, "confirmed"),
  opening("zimmer1-door", "Zimmer 1", ["zimmer1", "wohnkueche"], "door", 3.56, 3.17, 3.56, 3.97, 2.04, 0, "end", "confirmed"),
  opening("hall-living-door", "Wohnküche", ["vorraum", "wohnkueche"], "door", -0.16, 5.89, -0.16, 6.69, 2, 0, "start", "confirmed"),
  opening("apartment-entry-door", "Wohnungseingang", ["vorraum"], "door", -2.42, 5.97, -2.42, 6.77, 2, 0, "start", "plan-scaled"),
  opening("hall-bath-door", "Bad", ["vorraum", "bad"], "door", -1.14, 8.2, -0.34, 8.2, 2, 0, "end", "confirmed"),
  opening("hall-wc-door", "WC", ["vorraum", "wc"], "door", -2.34, 5.87, -1.54, 5.87, 2, 0, "end", "confirmed"),
  opening("hall-store-door", "Abstellraum", ["vorraum", "abstellraum"], "door", -1.04, 5.87, -0.24, 5.87, 2, 0, "start", "confirmed"),
  opening("living-zimmer2-door", "Zimmer 2", ["wohnkueche", "zimmer2"], "door", 2.78, 8.95, 3.58, 8.95, 2, 0, "end", "confirmed"),
  opening("living-east-window", "Fenster links der Dekowand", ["wohnkueche"], "window", 3.94, 4.98, 4.27, 6.02, 2.42, 0.62, undefined, "plan-scaled"),
  opening("living-feature-window", "Fenster rechts der Dekowand", ["wohnkueche"], "window", 4.6, 7.05, 4.899, 8.091, 2.35, 0.68, undefined, "plan-scaled"),
  opening("living-loggia-door", "Loggia / Balkon", ["wohnkueche", "loggia"], "door", 3.76, 8.939, 4.558, 8.893, 2.35, 0, "end", "plan-scaled"),
  opening("zimmer2-balcony-door", "Balkon", ["zimmer2", "balkon"], "door", 3.58, 10.02, 3.58, 10.82, 2.42, 0, "end", "plan-scaled"),
];

const openings: PlannerOpening[] = [
  ...sourceOpenings.map((source) => toPlannerOpening(source)),
  toPlannerOpening({
    id: "loggia-balcony-open-transition",
    label: "Offener Übergang Loggia / Balkon",
    rooms: ["loggia", "balkon"],
    kind: "door",
    start: point(3.58, 10.07),
    end: point(5.643, 10.07),
    headHeight: 2.6,
    sillHeight: 0,
    confidence: "plan-scaled",
  }, "passage"),
];

const builtIns: PlannerBuiltIn[] = [
  builtIn("kitchen-base-north", "Küchenzeile Nord", "wohnkueche", "kitchen", "kitchen-base", 1.53, 3.77, 1.86, 0.6, 0.92, 0, "#f4f3ef"),
  builtIn("kitchen-base-west", "Küchenzeile West", "wohnkueche", "kitchen", "kitchen-base", 0.3, 4.945, 1.75, 0.6, 0.92, 90, "#f4f3ef"),
  builtIn("kitchen-fridge", "Schwarzer Standkühlschrank", "wohnkueche", "kitchen", "kitchen-fridge", 2.17, 3.8, 0.62, 0.68, 2.04, 0, "#141718"),
  builtIn("kitchen-sink", "Einbauspüle", "wohnkueche", "kitchen", "kitchen-sink", 0.96, 3.77, 0.52, 0.42, 0.2, 0, "#aeb4b4", 0.83),
  builtIn("kitchen-hob", "Elektrokochfeld", "wohnkueche", "kitchen", "kitchen-hob", 0.3, 5.02, 0.58, 0.52, 0.04, 90, "#17191a", 0.89),
  builtIn("kitchen-oven", "Einbaubackofen", "wohnkueche", "kitchen", "kitchen-oven", 0.3, 5.02, 0.56, 0.55, 0.59, 90, "#202324", 0.18),
  builtIn("bath-tub", "Badewanne", "bad", "sanitary", "sanitary-bathtub", -2.06, 9.19, 0.72, 1.6, 0.56, 0, "#f3f2ee"),
  builtIn("bath-basin", "Wandwaschbecken", "bad", "sanitary", "sanitary-washbasin", -1.22, 9.79, 0.6, 0.42, 0.18, 0, "#f5f4f0", 0.77),
  builtIn("bath-washer", "Waschmaschine", "bad", "sanitary", "appliance-washer", -0.42, 9.72, 0.6, 0.6, 0.86, 0, "#f4f4f1"),
  builtIn("wc-pan", "Wand-WC", "wc", "sanitary", "sanitary-wall-wc", -1.97, 4.4, 0.38, 0.58, 0.42, 0, "#f5f4f0", 0.18),
];

const fixtures: PlannerFixture[] = [
  fixture("z1-light", "Lichtauslass Decke", "zimmer1", "ceiling-light", 1.78, 1.7, 2.56),
  fixture("z1-outlets", "Anschlussgruppe", "zimmer1", "multi-outlet", 1.74, 3.28, 0.3),
  fixture("hall-light", "Deckenanschluss", "vorraum", "ceiling-light", -1.27, 7, 2.56),
  fixture("hall-intercom", "Gegensprechanlage", "vorraum", "intercom", -2.39, 7.42, 1.45),
  fixture("living-light-north", "Lichtauslass Decke", "wohnkueche", "ceiling-light", 2.25, 5.35, 2.56),
  fixture("living-light-south", "Lichtauslass Decke", "wohnkueche", "ceiling-light", 2.25, 7.85, 2.56),
  fixture("z2-light", "Lichtauslass Decke", "zimmer2", "ceiling-light", 1.8, 10.45, 2.56),
  fixture("bath-light", "Lichtauslass Decke", "bad", "ceiling-light", -1.32, 8.92, 2.56),
  fixture("wc-light", "Lichtauslass Decke", "wc", "ceiling-light", -1.97, 5.08, 2.56),
  fixture("store-light", "Lichtauslass Decke", "abstellraum", "ceiling-light", -0.76, 5.08, 2.56),
  fixture("loggia-outlet", "Außensteckdose", "loggia", "outlet", 5.18, 8.08, 0.3),
  fixture("balcony-outlet", "Außensteckdose", "balkon", "outlet", 4.24, 10.95, 0.3),
];

const placements: PlannerPlacement[] = [
  placement("zimmer1-bed", "zimmer1", "bed-120", 1.1, 0.71, 2.2, 1.42, 1.3, 270),
  placement("zimmer1-wardrobe", "zimmer1", "wardrobe-225", 1.125, 3.02, 2.25, 0.62, 2.2, 0),
  placement("zimmer1-desk", "zimmer1", "desk-standard", 2.915, 0.315, 1.29, 0.55, 0.75, 0),
  placement("zimmer1-chair", "zimmer1", "chair-office", 2.7, 0.94, 0.55, 0.55, 0.82, 90),
];

export const DEFAULT_APARTMENT_DOCUMENT = parsePlannerDocument({
  schemaVersion: 3,
  id: "wohnung-v3",
  name: "Wohnungsplanung",
  updatedAt: "2026-10-24T08:00:00.000Z",
  walls: wallGraph.walls,
  rooms: wallGraph.rooms,
  openings,
  builtIns,
  fixtures,
  placements,
  doorStates: Object.fromEntries(
    openings.filter((candidate) => candidate.kind === "door").map((candidate) => [candidate.id, "closed"]),
  ),
  viewPreferences: {
    activeRoomId: null,
    overlays: { dimensions: false, fixtures: false, evidence: false },
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
): RoomOutlineInput {
  return {
    id,
    name,
    area,
    includedInWnf,
    outline,
    surfaces: { floor, walls: "paint-warm-white", ceiling: "paint-white" },
    metadata: { source: "Vermietungsplan M 1:50", confidence: "confirmed" },
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
): LegacyOpening {
  return { id, label, rooms, kind, start: point(x1, z1), end: point(x2, z2), headHeight, sillHeight, hinge, confidence };
}

function toPlannerOpening(source: LegacyOpening, forcedKind?: "passage"): PlannerOpening {
  const wall = findOpeningWall(source);
  const width = Math.hypot(source.end.x - source.start.x, source.end.z - source.start.z);
  const startDistance = distance(wall.start, source.start);
  const endDistance = distance(wall.start, source.end);
  const hingePoint = source.hinge === "end" ? source.end : source.start;

  return {
    id: source.id,
    label: source.label,
    wallId: wall.id,
    offset: Number(Math.min(startDistance, endDistance).toFixed(4)),
    width: Number(width.toFixed(4)),
    height: source.headHeight - (source.sillHeight ?? 0),
    sill: source.sillHeight ?? 0,
    kind: forcedKind ?? source.kind,
    hinge: source.kind === "door" && !forcedKind
      ? distance(wall.start, hingePoint) <= distance(wall.end, hingePoint) ? "start" : "end"
      : "none",
    swingDegrees: source.kind === "door" && !forcedKind ? 90 : 0,
    metadata: {
      source: "Bestätigtes Wohnungsmodell",
      confidence: source.confidence === "confirmed" ? "confirmed" : "estimated",
    },
  };
}

function findOpeningWall(source: LegacyOpening): PlannerWall {
  const candidates = wallGraph.walls
    .filter((wall) => wall.roomIds.some((roomId) => source.rooms.includes(roomId)))
    .filter((wall) => pointOnWall(source.start, wall) && pointOnWall(source.end, wall))
    .sort((left, right) => deriveWallLength(left) - deriveWallLength(right));
  const wall = candidates[0];
  if (!wall) throw new Error(`No wall found for opening ${source.id}`);
  return wall;
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
  kind: "kitchen" | "sanitary",
  catalogId: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  rotation: number,
  color: string,
  elevation = 0,
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
    materialVariants: { color },
    metadata: { source: "Lokaler Plan und Bildabgleich", confidence: "confirmed" },
  };
}

function fixture(id: string, label: string, roomId: string, kind: string, x: number, z: number, height: number): PlannerFixture {
  return {
    id: `fixture-${id}`,
    label,
    roomId,
    kind,
    position: point(x, z),
    height,
    metadata: { source: "Lokaler Plan und Bildabgleich", confidence: "confirmed" },
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
): PlannerPlacement {
  return {
    id,
    roomId,
    catalogId,
    position: point(x, z),
    rotation,
    size: { width, depth, height },
    metadata: { source: "Gesicherter Vorzustand", confidence: "confirmed" },
  };
}
