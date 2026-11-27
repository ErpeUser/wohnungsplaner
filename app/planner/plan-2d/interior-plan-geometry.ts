import { TILE_SIZE_METRES, TILE_ATLAS_METRES } from '../domain/tile-dimensions.ts';
import { createKitchenTiles } from '../scene-3d/interior-geometry.ts';

type Point = { x: number; z: number };
export type PlanTileFace = { x: number; z: number; width: number; depth: number; shade: number; fill: string };

/** ShapeGeometry's default UVs already contain metre coordinates. */
export function floorTextureRepeat(materialId: string): [number, number] | null {
  const atlas = materialId.includes('parquet') || materialId.includes('oak') ? .42
    : materialId.includes('tile') || materialId.includes('porcelain') ? TILE_ATLAS_METRES : null;
  return atlas === null ? null : [1 / atlas, 1 / atlas];
}

const srgb = (linear: number) => Math.round(255 * (linear <= .0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - .055));

/** Uses the exact same clipped world-coordinate cells as the 3D kitchen floor. */
export function kitchenTileFaces(points: readonly Point[], pitch = TILE_SIZE_METRES, grout = .002): PlanTileFace[] {
  if (points.length < 3 || points.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.z))) return [];
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minZ = Math.min(...points.map(p => p.z)), maxZ = Math.max(...points.map(p => p.z));
  const width = maxX - minX, depth = maxZ - minZ;
  if (width <= 0 || depth <= 0) return [];
  const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
  const mesh = createKitchenTiles(width, depth, x, z, pitch, grout);
  const faces: PlanTileFace[] = [];
  for (let i = 0; i < mesh.positions.length; i += 12) {
    const shade = mesh.colors?.[i] ?? .76;
    const channels = [shade, mesh.colors?.[i + 1] ?? .77, mesh.colors?.[i + 2] ?? .745].map(srgb);
    faces.push({
      x: x + mesh.positions[i], z: z + mesh.positions[i + 2],
      width: mesh.positions[i + 3] - mesh.positions[i], depth: mesh.positions[i + 8] - mesh.positions[i + 2],
      shade, fill: `rgb(${channels.join(',')})`,
    });
  }
  return faces;
}

/** Keep appliances in the object layer above the floor, not under its tiles. */
export function partitionInteriorPlan<T extends { catalogId?: string }>(items: readonly T[]): { floor: T[]; objects: T[] } {
  return {
    floor: items.filter(item => item.catalogId === 'floor-zone-kitchen'),
    objects: items.filter(item => item.catalogId !== 'floor-zone-kitchen'),
  };
}

/** BalconyArchitecture also reads the balcony floor to build its railings/roof. */
export function partitionFloorRendering<T extends { roomId: string }>(items: readonly T[]): { base: T[]; metric: T[] } {
  return {
    base: items.filter(item => item.roomId === 'balkon'),
    metric: items.filter(item => item.roomId !== 'balkon'),
  };
}
