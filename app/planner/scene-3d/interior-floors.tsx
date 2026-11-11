'use client';
import { useEffect, useMemo } from 'react';
import { DoubleSide, Shape } from 'three';
import { floorTextureRepeat } from '../plan-2d/interior-plan-geometry.ts';
import { getPlannerMaterial, PLANNER_TEXTURE_READY_EVENT } from './materials.ts';
import type { SceneFloor } from './scene-model.ts';

/** Floor UVs are metre coordinates; do not multiply by the room size again. */
export function InteriorFloor({ floor }: { floor: SceneFloor }) {
  const shape = useMemo(() => {
    const result = new Shape();
    floor.points.forEach((p, i) => i === 0 ? result.moveTo(p.x, -p.z) : result.lineTo(p.x, -p.z));
    result.closePath();
    return result;
  }, [floor.points]);
  const material = useMemo(() => {
    const source = getPlannerMaterial(floor.materialId);
    const result = source.clone();
    result.name = `${source.name}-${floor.id}-metre-uv`;
    const repeat = floorTextureRepeat(floor.materialId);
    if (source.map) {
      result.map = source.map.clone();
      if (repeat) result.map.repeat.set(...repeat);
      result.map.needsUpdate = true;
    }
    if (source.bumpMap) {
      result.bumpMap = source.bumpMap === source.map ? result.map : source.bumpMap.clone();
      if (result.bumpMap) {
        if (repeat) result.bumpMap.repeat.set(...repeat);
        result.bumpMap.needsUpdate = true;
      }
    }
    result.side = DoubleSide;
    return result;
  }, [floor.id, floor.materialId]);
  useEffect(() => {
    const ready = () => {
      if (material.map) material.map.needsUpdate = true;
      if (material.bumpMap) material.bumpMap.needsUpdate = true;
    };
    window.addEventListener(PLANNER_TEXTURE_READY_EVENT, ready);
    return () => {
      window.removeEventListener(PLANNER_TEXTURE_READY_EVENT, ready);
      material.map?.dispose();
      if (material.bumpMap !== material.map) material.bumpMap?.dispose();
      material.dispose();
    };
  }, [material]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]} receiveShadow>
    <shapeGeometry args={[shape]} />
    <primitive object={material} attach="material" />
  </mesh>;
}
