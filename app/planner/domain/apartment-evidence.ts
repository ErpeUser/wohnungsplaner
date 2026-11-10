import type { PlannerDocumentV3 } from "./types.ts";
import { deriveRoomPolygon } from "./wall-graph.ts";

export const OFFICIAL_ROOM_AREAS = {
  wohnkueche: 21.82,
  zimmer1: 12.36,
  zimmer2: 10.15,
  vorraum: 5.2,
  abstellraum: 2,
  bad: 4.31,
  wc: 1.42,
  balkon: 6.03,
} as const;

export const OFFICIAL_WNF_AREA = 59.49;
export const OUTDOOR_ROOM_IDS = ["balkon"] as const;

export function getDocumentWnfArea(document: PlannerDocumentV3) {
  return Number(document.rooms
    .filter((room) => room.includedInWnf)
    .reduce((sum, room) => sum + (room.wnfArea ?? room.area), 0)
    .toFixed(2));
}

export type RoomAreaAudit = {
  roomId: string;
  declaredArea: number;
  polygonArea: number;
  difference: number;
  differencePercent: number;
};

export function getRoomAreaAudit(document: PlannerDocumentV3): RoomAreaAudit[] {
  return document.rooms.map((room) => {
    const polygonArea = areaOfPolygon(deriveRoomPolygon(document, room.id));
    const difference = polygonArea - room.area;
    return {
      roomId: room.id,
      declaredArea: room.area,
      polygonArea: round(polygonArea, 4),
      difference: round(difference, 4),
      differencePercent: round(difference / room.area * 100, 2),
    };
  });
}

function areaOfPolygon(points: Array<{ x: number; z: number }>) {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0)) / 2;
}

function round(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}
