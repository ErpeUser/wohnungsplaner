import type { Point2 } from "./types.ts";

export type SnapGuide = {
  axis: "x" | "z";
  value: number;
  kind: "wall" | "object" | "grid";
  sourceId?: string;
};

export type SnapInput = {
  position: Point2;
  size: { width: number; depth: number };
  rotation?: number;
  guides?: SnapGuide[];
  disableGrid?: boolean;
  threshold?: number;
  gridSize?: number;
};

export type SnapResult = {
  position: Point2;
  guides: SnapGuide[];
};

export function snapPlacement(input: SnapInput): SnapResult {
  const threshold = input.threshold ?? 0.04;
  const gridSize = input.gridSize ?? 0.05;
  const bounds = rotatedBounds(input.size.width, input.size.depth, input.rotation ?? 0);
  const position = { ...input.position };
  const visibleGuides: SnapGuide[] = [];

  for (const axis of ["x", "z"] as const) {
    const extent = axis === "x" ? bounds.width / 2 : bounds.depth / 2;
    const center = position[axis];
    const anchors = [center - extent, center, center + extent];
    const match = (input.guides ?? [])
      .filter((guide) => guide.axis === axis && guide.kind !== "grid")
      .flatMap((guide) => anchors.map((anchor) => ({ guide, delta: guide.value - anchor })))
      .filter((candidate) => Math.abs(candidate.delta) <= threshold)
      .sort((left, right) => (
        Math.abs(left.delta) - Math.abs(right.delta)
        || guidePriority(left.guide) - guidePriority(right.guide)
      ))[0];

    if (match) {
      position[axis] = normalize(position[axis] + match.delta);
      visibleGuides.push(match.guide);
    } else if (!input.disableGrid) {
      position[axis] = normalize(Math.round(position[axis] / gridSize) * gridSize);
      visibleGuides.push({ axis, value: position[axis], kind: "grid" });
    }
  }

  return { position, guides: visibleGuides };
}

function rotatedBounds(width: number, depth: number, rotation: number) {
  const radians = rotation * Math.PI / 180;
  return {
    width: Math.abs(width * Math.cos(radians)) + Math.abs(depth * Math.sin(radians)),
    depth: Math.abs(width * Math.sin(radians)) + Math.abs(depth * Math.cos(radians)),
  };
}

function guidePriority(guide: SnapGuide) {
  return guide.kind === "wall" ? 0 : guide.kind === "object" ? 1 : 2;
}

function normalize(value: number) {
  return Number(value.toFixed(4));
}
