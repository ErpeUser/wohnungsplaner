import { roomContainsPlacement } from "../domain/geometry.ts";
import type { PlannerDocumentV3, PlannerPlacement, PlannerRoom, Point2, Size3 } from "../domain/types.ts";
import { deriveRoomPolygon } from "../domain/wall-graph.ts";

export type DecorSlot = "wall-art" | "lighting" | "rug" | "greenery" | "textile" | "storage";

export type DecorRecommendation = {
  id: string;
  roomId: string;
  slot: DecorSlot;
  title: string;
  rationale: string;
  palette: string[];
  size: Size3;
  position: Point2;
  rotation: number;
  placementHint: string;
  productSearchQuery: string;
  status: "placeholder" | "catalog-ready";
  sourceConfidence: "estimated";
};

export type DecorRoomAnalysis = {
  roomId: string;
  roomName: string;
  floorMaterial: string;
  wallMaterial: string;
  palette: string[];
  occupiedAreaRatio: number;
  availableSlots: DecorSlot[];
  recommendations: DecorRecommendation[];
};

const SLOT_ORDER: DecorSlot[] = ["wall-art", "lighting", "rug", "greenery", "textile", "storage"];

/**
 * Produce deterministic, measure-aware decoration placeholders. The pipeline
 * deliberately separates room analysis from product search so AI or Firecrawl
 * can later replace a placeholder with a sourced product without moving it.
 */
export function recommendDecor(document: PlannerDocumentV3, roomId: string): DecorRoomAnalysis {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  if (!room) throw new Error(`Der Raum ${roomId} wurde nicht gefunden.`);

  const roomPolygon = deriveRoomPolygon(document, roomId);
  const placements = document.placements.filter((item) => item.roomId === roomId);
  const builtIns = document.builtIns.filter((item) => item.roomId === roomId);
  const fixtures = document.fixtures.filter((item) => item.roomId === roomId);
  const occupiedArea = [...placements, ...builtIns]
    .reduce((sum, item) => sum + item.size.width * item.size.depth, 0);
  const roomArea = Math.max(room.area, polygonArea(roomPolygon));
  const occupiedAreaRatio = Math.min(1, occupiedArea / Math.max(0.1, roomArea));
  const palette = inferPalette(room, [...builtIns, ...placements]);
  const availableSlots = SLOT_ORDER.filter((slot) => isSlotAvailable(slot, document, room));
  const recommendations = availableSlots
    .map((slot) => buildRecommendation(slot, document, room, roomPolygon, palette, placements, builtIns, fixtures))
    .filter((recommendation): recommendation is DecorRecommendation => recommendation !== null);

  return {
    roomId,
    roomName: room.name,
    floorMaterial: room.surfaces.floor,
    wallMaterial: room.surfaces.walls,
    palette,
    occupiedAreaRatio: Number(occupiedAreaRatio.toFixed(3)),
    availableSlots,
    recommendations,
  };
}

function buildRecommendation(
  slot: DecorSlot,
  document: PlannerDocumentV3,
  room: PlannerRoom,
  roomPolygon: Point2[],
  palette: string[],
  placements: PlannerPlacement[],
  builtIns: PlannerDocumentV3["builtIns"],
  fixtures: PlannerDocumentV3["fixtures"],
): DecorRecommendation | null {
  const candidate = candidateForSlot(slot, room, roomPolygon, placements, builtIns, fixtures);
  if (!candidate) return null;
  const placeholder: PlannerPlacement = {
    id: `recommendation-${room.id}-${slot}`,
    roomId: room.id,
    catalogId: `decor-placeholder-${slot}`,
    position: candidate.position,
    rotation: candidate.rotation,
    size: candidate.size,
    metadata: { source: "Lokale Deko-Analyse", confidence: "estimated" },
  };
  if (!roomContainsPlacement(document, room.id, placeholder)) return null;

  const copy = recommendationCopy(slot, room, palette);
  return {
    id: placeholder.id,
    roomId: room.id,
    slot,
    title: copy.title,
    rationale: copy.rationale,
    palette,
    size: candidate.size,
    position: candidate.position,
    rotation: candidate.rotation,
    placementHint: copy.placementHint,
    productSearchQuery: copy.productSearchQuery,
    status: "placeholder",
    sourceConfidence: "estimated",
  };
}

function candidateForSlot(
  slot: DecorSlot,
  room: PlannerRoom,
  polygon: Point2[],
  placements: PlannerPlacement[],
  builtIns: PlannerDocumentV3["builtIns"],
  fixtures: PlannerDocumentV3["fixtures"],
) {
  const bounds = polygonBounds(polygon);
  const center = { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  const hasCeilingLight = fixtures.some((fixture) => /light|lamp/i.test(fixture.kind));
  const freeEdge = Math.max(bounds.minX + 0.35, Math.min(bounds.maxX - 0.35, center.x));
  switch (slot) {
    case "wall-art":
      return { position: { x: freeEdge, z: bounds.minZ + 0.08 }, rotation: 0, size: { width: 0.9, depth: 0.045, height: 0.65 } };
    case "lighting":
      if (hasCeilingLight) return null;
      return { position: { x: freeEdge, z: center.z }, rotation: 0, size: { width: 0.28, depth: 0.28, height: 1.4 } };
    case "rug":
      if (placements.some((item) => /(^|[-_])rug([-_]|$)/i.test(item.catalogId))) return null;
      return { position: center, rotation: 0, size: { width: 1.6, depth: 2.3, height: 0.025 } };
    case "greenery":
      if (placements.some((item) => /plant|olive|green/i.test(item.catalogId))) return null;
      return { position: { x: bounds.maxX - 0.32, z: bounds.maxZ - 0.32 }, rotation: 0, size: { width: 0.38, depth: 0.38, height: 1.1 } };
    case "textile":
      return { position: { x: bounds.minX + 0.28, z: bounds.maxZ - 0.28 }, rotation: 0, size: { width: 0.55, depth: 0.55, height: 0.08 } };
    case "storage":
      if (builtIns.some((item) => item.kind === "storage") || placements.some((item) => /wardrobe|storage|shelf|dresser/i.test(item.catalogId))) return null;
      return { position: { x: bounds.maxX - 0.35, z: center.z }, rotation: 0, size: { width: 0.6, depth: 0.32, height: 1.8 } };
  }
}

function recommendationCopy(slot: DecorSlot, room: PlannerRoom, palette: string[]) {
  const paletteText = palette.slice(0, 3).join(", ");
  const roomText = room.name.toLowerCase();
  switch (slot) {
    case "wall-art":
      return { title: "Ruhige Bildgruppe", rationale: `Eine vertikale Bildgruppe gibt ${roomText} Höhe, ohne den Grundriss zu verstellen.`, placementHint: "Mittig auf einer freien Wandfläche, Unterkante ca. 1,25 m über Fertigfußboden.", productSearchQuery: `Bilderset ${paletteText} 60x80 cm Eiche Rahmen ruhig abstrakt` };
    case "lighting":
      return { title: "Warmes Akzentlicht", rationale: `Eine kompakte Leuchte ergänzt die vorhandene Grundbeleuchtung in ${roomText}.`, placementHint: "Nicht vor Schaltern, Steckdosen oder Türen platzieren; 2700–3000 K bevorzugen.", productSearchQuery: `Wandleuchte ${paletteText} 2700K dimmbar blendfrei` };
    case "rug":
      return { title: "Proportionaler Teppich", rationale: "Ein niedriger Teppich verbindet die Möbelzone und bleibt unter Türen und Laufwegen." , placementHint: "Mindestens 60 cm Durchgang an der Hauptbewegung lassen; Vorderfüße großer Sitzmöbel auf den Teppich setzen.", productSearchQuery: `Teppich 160x230 cm ${paletteText} waschbar flach gewebt` };
    case "greenery":
      return { title: "Eine ruhige Pflanze", rationale: "Eine einzelne vertikale Pflanze bringt Kontrast und Maßstab in die freie Ecke.", placementHint: "Fenster- und Heizkörperabstand einhalten; Stellfläche 38 cm freihalten.", productSearchQuery: `Zimmerpflanze 110 cm Topf beige pflegeleicht ${paletteText}` };
    case "textile":
      return { title: "Weiches Textil-Detail", rationale: "Ein kleines Textilobjekt macht harte Boden- und Möbelkanten wohnlicher.", placementHint: "Nur in einer Randzone, niemals vor Türschwenk oder Steckdosen.", productSearchQuery: `Pouf oder Korb 55 cm ${paletteText} Naturfaser` };
    case "storage":
      return { title: "Schmale Zusatzablage", rationale: "Eine niedrige, schmale Ablage nutzt die freie Wand ohne die Raumtiefe zu verkleinern.", placementHint: "Rückwand parallel zur Wand, mindestens 80 cm Durchgang davor.", productSearchQuery: `schmales Wandregal 60 cm ${paletteText} Eiche` };
  }
}

function isSlotAvailable(slot: DecorSlot, document: PlannerDocumentV3, room: PlannerRoom) {
  if (slot === "lighting") return document.fixtures.filter((item) => item.roomId === room.id).every((item) => !/light|lamp/i.test(item.kind));
  if (slot === "rug") return document.placements.filter((item) => item.roomId === room.id).every((item) => !/(^|[-_])rug([-_]|$)/i.test(item.catalogId));
  return true;
}

function inferPalette(room: PlannerRoom, items: Array<PlannerDocumentV3["builtIns"][number] | PlannerPlacement>) {
  const values = [room.surfaces.floor, room.surfaces.walls, ...items.map((item) => Object.values(item.materialVariants ?? {}))].flat();
  const palette = values.some((value) => /oak|wood|parquet/i.test(value)) ? ["helle Eiche", "warmes Greige", "Creme"] : ["Warmes Weiß", "Sand", "Taupe"];
  if (values.some((value) => /green|olive|moss/i.test(value))) palette.push("gedämpftes Olivgrün");
  return [...new Set(palette)].slice(0, 4);
}

function polygonBounds(points: Point2[]) {
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

function polygonArea(points: Point2[]) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0) / 2);
}
