import { TILE_ATLAS_METRES } from "../../domain/tile-dimensions.ts";
import { useMemo } from "react";
import { DoubleSide, Shape } from "three";
import { getPlannerMaterial } from "../materials.ts";
import type { SceneFloor } from "../scene-model.ts";



export function Floor({ floor }: { floor: SceneFloor }) {
  const shape = useMemo(() => {
    const next = new Shape();
    floor.points.forEach((point, index) => {
      if (index === 0) next.moveTo(point.x, -point.z);
      else next.lineTo(point.x, -point.z);
    });
    next.closePath();
    return next;
  }, [floor.points]);
  const floorMaterial = useMemo(() => {
    const base = getPlannerMaterial(floor.materialId);
    const clone = base.clone();
    clone.name = `${base.name}-${floor.id}`;
    if (clone.map) {
      const width = Math.max(...floor.points.map((point) => point.x)) - Math.min(...floor.points.map((point) => point.x));
      const depth = Math.max(...floor.points.map((point) => point.z)) - Math.min(...floor.points.map((point) => point.z));
      const isWood = floor.materialId.includes("parquet") || floor.materialId.includes("oak");
      const isTile = floor.materialId.includes("tile") || floor.materialId.includes("porcelain");
      // ShapeGeometry uses metre coordinates; the tile atlas spans two 20 cm cells.
      clone.map = clone.map.clone();
      if (isTile) clone.map.repeat.set(1 / TILE_ATLAS_METRES, 1 / TILE_ATLAS_METRES);
      else if (isWood) clone.map.repeat.set(Math.max(1, width / 0.42), Math.max(1, depth / 0.42));
      clone.map.needsUpdate = true;
      if (clone.bumpMap) {
        clone.bumpMap = clone.map;
        clone.bumpScale = isTile ? 0.022 : isWood ? 0.018 : 0.006;
      }
      clone.needsUpdate = true;
    }
    return clone;
  }, [floor]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <primitive object={floorMaterial} attach="material" side={DoubleSide} />
    </mesh>
  );
}
