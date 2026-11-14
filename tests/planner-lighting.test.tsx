import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { expect, test, vi } from "vitest";

// Keep the actual ContactShadows implementation and omit only the external HDR load.
vi.mock("@react-three/drei", async (importOriginal) => ({
  ...await importOriginal<typeof import("@react-three/drei")>(),
  Environment: () => null,
}));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { PlannerLighting } from "../app/planner/scene-3d/lighting.tsx";
import { qualitySettings } from "../app/planner/scene-3d/quality.ts";
import { createSceneModel, type SceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({
  Group: THREE.Group, Mesh: THREE.Mesh, BoxGeometry: THREE.BoxGeometry,
  MeshBasicMaterial: THREE.MeshBasicMaterial, OrthographicCamera: THREE.OrthographicCamera,
  AmbientLight: THREE.AmbientLight, HemisphereLight: THREE.HemisphereLight,
  DirectionalLight: THREE.DirectionalLight, PointLight: THREE.PointLight,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("one-frame contact shadows recapture moved furniture and then stop drawing until another scene update", async () => {
  const canvas = document.createElement("canvas");
  const capturedPositions: number[] = [];
  const renderer = {
    render(scene: THREE.Scene) {
      if (scene.isScene && scene.overrideMaterial?.type === "MeshDepthMaterial") {
        capturedPositions.push(scene.getObjectByName("moving-chair")!.position.x);
      }
    },
    setRenderTarget() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as THREE.WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: renderer, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState;
  const renderScene = async (scene: SceneModel) => {
    const chair = scene.placements.find((item) => item.id === "living-kaleo-chair-west")!;
    await act(async () => {
      state = root.render(<>
        <mesh name="moving-chair" position={chair.position}>
          <boxGeometry args={chair.size} />
          <meshBasicMaterial />
        </mesh>
        <PlannerLighting quality={qualitySettings("high")} scene={scene} />
      </>).getState();
    });
  };

  try {
    await renderScene(createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wohnkueche"));
    state!.advance(1);
    state!.advance(2);
    expect(capturedPositions).toEqual([2.2]);

    const moved = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
      type: "movePlacement", placementId: "living-kaleo-chair-west", position: { x: 2.1, z: 5 },
    });
    expect(moved.error).toBeUndefined();
    await renderScene(createSceneModel(moved.document, "wohnkueche"));
    state!.advance(3);
    state!.advance(4);
    expect(capturedPositions).toEqual([2.2, 2.1]);
  } finally {
    await act(async () => root.unmount());
  }
});
