import { useEffect, useMemo } from "react";
import { BoxGeometry } from "three";
import { TILE_TEXTURES } from "../materials/recipes.ts";
import { SHARED_BOX } from "./architecture-primitives.ts";

export function isTileMaterial(materialId: string): boolean {
  return Object.hasOwn(TILE_TEXTURES, materialId);
}

/** Convert normalized box UVs to metres on tiled faces only. */
export function useTileBoxGeometry(size: readonly [number, number, number], faceMask = 63) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => {
    if (!faceMask) return SHARED_BOX;
    const result = new BoxGeometry(1, 1, 1);
    const uv = result.getAttribute("uv");
    const sizes = [[depth, height], [depth, height], [width, depth],
      [width, depth], [width, height], [width, height]] as const;
    result.groups.forEach((group, face) => {
      if (!(faceMask & (1 << face))) return;
      const [uSize, vSize] = sizes[face];
      const vertices = new Set<number>();
      for (let i = group.start; i < group.start + group.count; i++) vertices.add(result.index!.getX(i));
      for (const vertex of vertices) uv.setXY(vertex, uv.getX(vertex) * uSize, uv.getY(vertex) * vSize);
    });
    uv.needsUpdate = true;
    return result;
  }, [width, height, depth, faceMask]);
  useEffect(() => () => { if (geometry !== SHARED_BOX) geometry.dispose(); }, [geometry]);
  return geometry;
}
