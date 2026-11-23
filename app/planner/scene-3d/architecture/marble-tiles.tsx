import { useMemo } from "react";
import type { PlannerBuiltIn } from "../../domain/types.ts";
import { loadPlannerTexture } from "../materials/texture-factory.ts";
import type { SceneObject, SceneWall, SceneWallSegment } from "../scene-model.ts";

const TILE_WIDTH = 0.6;
const TILE_HEIGHT = 0.3;
const FINISHES = {
  bath: {
    atlas: "/planner-assets/textures/stone/temu-white-gold-601100207687761.webp",
    name: "bath-white-gold-marble",
    joint: 0.0015,
    jointColor: "#d0c8bc",
  },
  wc: {
    // The supplied WC photograph shows ivory/cream ceramic on every wall.
    // Do not reuse the previously chosen celadon marble artwork here.
    atlas: null,
    name: "wc-ivory-ceramic-tiles",
    joint: 0.0015,
    jointColor: "#d6c9b9",
  },
};
type MarbleFinish = keyof typeof FINISHES;

export function bathMarbleWallBounds(
  wall: SceneWall,
  segment: SceneWallSegment,
  tub: SceneObject<PlannerBuiltIn>,
) {
  const [tubX] = tub.position;
  const [tubWidth] = tub.size;
  const tubBack = tubX - tubWidth / 2;
  const wallFace = wall.start.x + wall.thickness / 2;
  if (!wall.roomIds.includes(tub.roomId)
    || Math.abs(wall.start.x - wall.end.x) > 0.001
    || Math.abs(wall.start.x - tubBack) > wall.thickness / 2 + 0.002) return null;

  const [, y, z] = segment.position;
  const [length, height] = segment.size;
  if (length <= 0.001 || height <= 0.001) return null;
  // Tile the complete solid bathroom wall segment rather than cropping it to
  // the 160-cm tub and the space above its rim. Segment geometry already
  // excludes openings, so the finish stops at the wall corners and door cuts.
  return {
    width: length,
    height,
    position: [wallFace + 0.002, y, z] as const,
  };
}

export function wcMarbleWallBounds(wall: SceneWall, segment: SceneWallSegment) {
  if (!wall.roomIds.includes("wc")) return null;
  const [x, y, z] = segment.position;
  const [width, height, depth] = segment.size;
  if (width <= 0.001 || height <= 0.001) return null;
  // The actual measured WC sits around X -1.875, Z 4.91. Every shared wall
  // gets the ceramic face ONLY on the WC side, never in the adjacent store
  // room or hall. Opening-specific segments keep the 80-cm door unobstructed.
  const normalX = Math.sin(segment.rotationY);
  const normalZ = Math.cos(segment.rotationY);
  const towardRoom = (-1.875 - x) * normalX + (4.91 - z) * normalZ;
  const faceSign = towardRoom >= 0 ? 1 : -1;
  const faceOffset = depth / 2 + 0.0008;
  return {
    width,
    height,
    position: [x + normalX * faceSign * faceOffset, y, z + normalZ * faceSign * faceOffset] as const,
    rotationY: segment.rotationY + (faceSign === 1 ? 0 : Math.PI),
  };
}

export function marbleTileBuffers(width: number, height: number, patternOffset = 0, finish: MarbleFinish = "bath") {
  const joint = FINISHES[finish].joint;
  const alignment = finish === "wc" ? (TILE_WIDTH - width % TILE_WIDTH) / 2 : 0;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row * TILE_HEIGHT < height; row++) {
    const y = row * TILE_HEIGHT;
    const shift = (alignment + (row % 2 ? TILE_WIDTH / 2 : 0)) % TILE_WIDTH;
    for (let column = 0; column * TILE_WIDTH - shift < width; column++) {
      const x = column * TILE_WIDTH - shift;
      // Leave joints between tiles, never a grout-colored slit at the
      // outer wall perimeter (including its cropped final row/column).
      const left = x <= 0 ? 0 : x + joint / 2;
      const right = x + TILE_WIDTH >= width ? width : x + TILE_WIDTH - joint / 2;
      const bottom = y === 0 ? 0 : y + joint / 2;
      const top = y + TILE_HEIGHT >= height ? height : y + TILE_HEIGHT - joint / 2;
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

export function MarbleTileSurface({ width, height, patternOffset = 0, finish = "bath" }: {
  width: number;
  height: number;
  patternOffset?: number;
  finish?: MarbleFinish;
}) {
  const { atlas, name, jointColor } = FINISHES[finish];
  const { positions, uvs, normals, colors } = useMemo(() => {
    const tiles = marbleTileBuffers(width, height, patternOffset, finish);
    const normals = new Float32Array(tiles.positions.length);
    for (let i = 2; i < normals.length; i += 3) normals[i] = 1;
    // Slightly varied warm-ivory fired-ceramic panels, without any uploaded
    // photograph being stored in this public application.
    const tones = [
      [0.942, 0.882, 0.826], [0.950, 0.895, 0.845],
      [0.925, 0.870, 0.812], [0.944, 0.888, 0.834],
    ];
    const colors = finish === "wc" ? new Float32Array(tiles.positions.length) : null;
    if (colors) {
      for (let vertex = 0; vertex < tiles.positions.length / 3; vertex++) {
        const tone = tones[(Math.floor(vertex / 6) + patternOffset) % tones.length];
        colors[vertex * 3] = tone[0];
        colors[vertex * 3 + 1] = tone[1];
        colors[vertex * 3 + 2] = tone[2];
      }
    }
    return { ...tiles, normals, colors };
  }, [width, height, patternOffset, finish]);
  const texture = atlas !== null && typeof document !== "undefined" ? loadPlannerTexture(atlas) : null;
  return (
    <group>
      <mesh position={[0, 0, finish === "wc" ? -0.0002 : -0.0008]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={jointColor} roughness={0.85} />
      </mesh>
      <mesh name={name} receiveShadow>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-normal" args={[normals, 3]} />
          <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          {colors ? <bufferAttribute attach="attributes-color" args={[colors, 3]} /> : null}
        </bufferGeometry>
        <meshPhysicalMaterial color="#ffffff" map={texture} vertexColors={Boolean(colors)}
          roughness={finish === "wc" ? 0.41 : 0.34}
          clearcoat={finish === "wc" ? 0.16 : 0.22} clearcoatRoughness={0.31} metalness={0} />
      </mesh>
    </group>
  );
}
