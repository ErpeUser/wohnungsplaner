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
      // Tile atlases contain two cells across their 0..1 UV range.  A 0.64 m
      // UV repeat therefore produces the photographed 32 cm floor modules;
      // the previous 0.32 m repeat made the grout read as tiny mosaic.
      const scale = isWood ? 0.42 : isTile ? 0.64 : null;
      clone.map = clone.map.clone();
      if (scale) clone.map.repeat.set(Math.max(1, width / scale), Math.max(1, depth / scale));
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
