import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { ExtrudeGeometry, Group, Mesh, Raycaster, Vector3, type Material, type Scene, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderedTejo() {
  const review = createReviewScene("hallway-tejo-115");
  const canvas = document.createElement("canvas");
  // Keep the production meshes, materials and world transforms. Only the GPU
  // boundary is omitted; the rays below intersect the actual visible faces.
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

test("Tejo exposes an uninterrupted mirror across its centre height", async () => {
  const model = await renderedTejo();
  try {
    // Samples span the mirror face at, above and below the unwanted division.
    for (const x of [-0.49, -0.43, -0.376, -0.32, -0.26]) {
      for (const y of [1.20, 1.22907, 1.26]) {
        expect(frontMaterial(model.scene, x, y), `mirror at x=${x}, y=${y}`)
          .toBe("planner-material-mirror-glass");
      }
    }
  } finally { await model.dispose(); }
});

test("Tejo preserves the mirror perimeter and surrounding cashmere front", async () => {
  const model = await renderedTejo();
  try {
    for (const x of [-0.5405, -0.2116]) {
      for (const y of [0.9, 1.22907, 1.6]) {
        expect(frontMaterial(model.scene, x, y)).toBe("planner-material-metal-satin");
      }
    }
    for (const y of [0.64, 1.82]) {
      expect(frontMaterial(model.scene, -0.376, y)).toBe("planner-material-mirror-glass");
    }
    for (const y of [0.60, 1.92]) {
      expect(frontMaterial(model.scene, -0.376, y)).toBe("planner-material-tejo-cashmere-grain");
    }
  } finally { await model.dispose(); }
});
