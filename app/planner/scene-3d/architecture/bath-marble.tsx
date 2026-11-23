import { useMemo } from "react";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { loadPlannerTexture } from "../materials/texture-factory.ts";
import type { SceneObject, SceneWall, SceneWallSegment } from "../scene-model.ts";

const TILE_WIDTH = 0.6;
const TILE_HEIGHT = 0.3;
const JOINT = 0.0015;
const ATLAS_PATH = "/planner-assets/textures/stone/temu-white-gold-601100207687761.webp";

export function bathMarbleWallBounds(
  wall: SceneWall,
  segment: SceneWallSegment,
  tub: SceneObject<PlannerBuiltIn>,
) {
  const [tubX, tubY, tubZ] = tub.position;
  const [tubWidth, tubHeight, tubLength] = tub.size;
  const tubBack = tubX - tubWidth / 2;
  const wallFace = wall.start.x + wall.thickness / 2;
  if (!wall.roomIds.includes(tub.roomId)
    || Math.abs(wall.start.x - wall.end.x) > 0.001
    || Math.abs(wall.start.x - tubBack) > wall.thickness / 2 + 0.002) return null;

  const [, y, z] = segment.position;
  const [length, height] = segment.size;
  const start = Math.max(z - length / 2, tubZ - tubLength / 2);
  const end = Math.min(z + length / 2, tubZ + tubLength / 2);
  const bottom = Math.max(y - height / 2, tubY + tubHeight / 2);
  const top = y + height / 2;
  if (end - start < 0.001 || top - bottom < 0.001) return null;
  return {
    width: end - start,
    height: top - bottom,
    position: [wallFace + 0.002, (top + bottom) / 2, (start + end) / 2] as const,
  };
}

export function bathMarbleTileBuffers(width: number, height: number, patternOffset = 0) {
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row * TILE_HEIGHT < height; row++) {
    const y = row * TILE_HEIGHT;
    const shift = row % 2 ? TILE_WIDTH / 2 : 0;
    for (let column = 0; column * TILE_WIDTH - shift < width; column++) {
      const x = column * TILE_WIDTH - shift;
      const left = Math.max(0, x + JOINT / 2);
      const right = Math.min(width, x + TILE_WIDTH - JOINT / 2);
      const bottom = Math.max(0, y + JOINT / 2);
      const top = Math.min(height, y + TILE_HEIGHT - JOINT / 2);
      if (left >= right || bottom >= top) continue;

      const variant = (row * 3 + column * 5 + Math.floor(row / 2) + patternOffset) % 8;
      const atlasX = (variant % 2) * 0.5;
      const atlasY = (Math.floor(variant / 2) % 2) * 0.5;
      for (const [px, py] of [[left, bottom], [right, bottom], [right, top], [left, bottom], [right, top], [left, top]]) {
        positions.push(px - width / 2, py - height / 2, 0);
        const u = (px - x) / TILE_WIDTH;
        const v = (py - y) / TILE_HEIGHT;
        // Inset each atlas cell to exclude the printed seam. Rotate alternate
        // faces by 180° while letting cropped edges keep their original scale.
        uvs.push(atlasX + 0.009 + (variant >= 4 ? 1 - u : u) * 0.482,
          atlasY + 0.009 + (variant >= 4 ? 1 - v : v) * 0.482);
      }
    }
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs) };
}

export function BathMarbleSurface({ width, height, patternOffset = 0 }: {
  width: number;
  height: number;
  patternOffset?: number;
}) {
  const { positions, uvs, normals } = useMemo(() => {
    const tiles = bathMarbleTileBuffers(width, height, patternOffset);
    const normals = new Float32Array(tiles.positions.length);
    for (let i = 2; i < normals.length; i += 3) normals[i] = 1;
    return { ...tiles, normals };
  }, [width, height, patternOffset]);
  const texture = typeof document === "undefined" ? null : loadPlannerTexture(ATLAS_PATH);
  return (
    <group>
      <mesh position={[0, 0, -0.0008]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#d0c8bc" roughness={0.85} />
      </mesh>
      <mesh name="bath-white-gold-marble" receiveShadow>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-normal" args={[normals, 3]} />
          <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
        </bufferGeometry>
        <meshPhysicalMaterial color="#ffffff" map={texture} roughness={0.34}
          clearcoat={0.22} clearcoatRoughness={0.31} metalness={0} />
      </mesh>
    </group>
  );
}
