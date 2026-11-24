import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({ Group, Mesh, BufferAttribute, BufferGeometry, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("bath marble apron continues across the tiled side cap to the wall end", async () => {
  const source = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "bad");
  const apron = source.builtIns.find(item => item.catalogId === "bath-tub-apron")!;
  const side = source.builtIns.find(item => item.catalogId === "bath-tub-side-apron")!;
  const scene = {
    ...source,
    floors: [], walls: [], doors: [], windows: [], placements: [], fixtures: [],
    builtIns: [apron, side],
  };
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  try {
    await act(async () => {
      state = root.render(<PlannerArchitecture scene={scene} selectionId={null} onSelect={() => {}} />).getState();
    });
    state!.scene.updateMatrixWorld(true);
    const front = state!.scene.getObjectByName("bath-white-gold-marble");
    expect(front).toBeDefined();
    const bounds = new Box3().setFromObject(front!);
    const wallEnd = side.position[2] - side.size[2] / 2;
    const farEnd = apron.position[2] + apron.size[0] / 2;
    expect(bounds.min.z).toBeCloseTo(wallEnd, 3);
    expect(bounds.max.z).toBeCloseTo(farEnd, 3);
    expect(bounds.max.y).toBeCloseTo(apron.position[1] + apron.size[1] / 2, 3);
  } finally {
    await act(async () => root.unmount());
  }
});
