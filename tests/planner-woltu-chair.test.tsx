import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";

extend({ Group: THREE.Group, Mesh: THREE.Mesh, ExtrudeGeometry: THREE.ExtrudeGeometry, MeshBasicMaterial: THREE.MeshBasicMaterial });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("WOLTU estimated chenille chair in production 3D", () => {
  test("mounts a padded shell, 360-degree swivel unit and four independent splayed metal legs within the model envelope", async () => {
    const review = createReviewScene("chair-aliexpress-woltu-1005013095870024", "fabric-woltu-chenille-cream");
    const canvas = document.createElement("canvas");
    const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as THREE.WebGLRenderer;
    const root = createRoot(canvas);
    await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
    let state: RootState | undefined;
    try {
      await act(async () => { state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState(); });
      const scene = state!.scene;
      scene.updateMatrixWorld(true);
      expect(scene.getObjectByName("woltu-chenille-dining-chair")).toBeDefined();
      expect(scene.getObjectByName("woltu-swivel-base")).toBeDefined();
      expect(scene.getObjectByName("woltu-swivel-housing")).toBeDefined();
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        expect(scene.getObjectByName("woltu-leg-" + x + "-" + z)).toBeDefined();
      }
      const material = scene.getObjectByName("woltu-chenille-dining-chair")?.getObjectByProperty("type", "Mesh") as THREE.Mesh | undefined;
      expect(material).toBeDefined();
      const bounds = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      expect(bounds.x).toBeLessThanOrEqual(0.59);
      expect(bounds.y).toBeGreaterThan(0.76);
      expect(bounds.y).toBeLessThan(0.87);
      expect(bounds.z).toBeLessThanOrEqual(0.61);
    } finally {
      await act(async () => { root.unmount(); });
    }
  });
});
