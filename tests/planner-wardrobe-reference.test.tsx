import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { ExtrudeGeometry, Group, Mesh, Raycaster, Vector3, type Material, type Scene, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderedWardrobe() {
  const review = createReviewScene("wardrobe-225", "white-matte");
  const canvas = document.createElement("canvas");
  // R3F builds the production meshes, materials and world transforms. Only
  // the GPU boundary is omitted; the assertions intersect real front faces.
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => {
    state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState();
  });
  state!.scene.updateMatrixWorld(true);
  return {
    scene: state!.scene,
    async dispose() { await act(async () => root.unmount()); },
  };
}

function frontMaterial(scene: Scene, x: number, y: number) {
  const surface = new Raycaster(new Vector3(x, y, 2), new Vector3(0, 0, -1))
    .intersectObjects(scene.children, true)[0];
  expect(surface, `front surface at x=${x}, y=${y}`).toBeDefined();
  return ((surface.object as Mesh).material as Material).name;
}

test("wardrobe front centres expose uninterrupted white surfaces and mirror", async () => {
  const model = await renderedWardrobe();
  try {
    for (const [x, material] of [
      [0, "mirror-glass"],
      [-0.9, "white-matte"],
      [-0.45, "white-lacquer"],
      [0.45, "white-lacquer"],
      [0.9, "white-matte"],
    ] as const) {
      expect(frontMaterial(model.scene, x, 1.65)).toBe(`planner-material-${material}`);
    }
  } finally { await model.dispose(); }
});

test("wardrobe drawer faces keep their cashmere finish through the bay centre", async () => {
  const model = await renderedWardrobe();
  try {
    for (const x of [-0.45, 0.45]) {
      for (const y of [0.34, 0.67]) {
        expect(frontMaterial(model.scene, x, y)).toBe("planner-material-vinyl-cashmere-cream");
      }
    }
  } finally { await model.dispose(); }
});

test("wardrobe retains four vertical seams between its five bays", async () => {
  const model = await renderedWardrobe();
  try {
    for (const x of [-0.675, -0.225, 0.225, 0.675]) {
      expect(frontMaterial(model.scene, x, 1.65)).toBe("planner-material-wardrobe-frame-silver");
    }
  } finally { await model.dispose(); }
});
