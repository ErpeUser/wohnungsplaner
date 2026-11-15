import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, ExtrudeGeometry, Group, Mesh, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("the measured hall intercom occupies 125 by 165 mm with its lower edge 133 cm above the floor", async () => {
  const source = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "vorraum");
  const intercom = source.fixtures.find((fixture) => fixture.id === "fixture-hall-intercom")!;
  const scene = {
    ...source,
    floors: [], walls: [], doors: [], windows: [], builtIns: [], placements: [],
    fixtures: [intercom],
  };
  const canvas = document.createElement("canvas");
  // Omit only the GPU boundary: R3F constructs the actual production meshes,
  // materials and world transforms at the recorded apartment mounting point.
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  try {
    await act(async () => {
      state = root.render(<PlannerArchitecture scene={scene} selectionId={null} onSelect={() => {}} />).getState();
    });
    state!.scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(state!.scene);
    // Independent user measurements recorded in apartment-v3.ts. Width lies
    // along world Z because this fixture is mounted on the west hall wall.
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(0.125, 4);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(0.165, 4);
    expect(bounds.min.y).toBeCloseTo(1.33, 4);
    expect(bounds.max.y).toBeCloseTo(1.495, 4);

    // Include every detail mesh in the measured front envelope, so shrinking
    // only the housing cannot leave the screen or controls protruding sideways.
    let detailMeshes = 0;
    state!.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      detailMeshes += 1;
      const detail = new Box3().setFromObject(object);
      expect(detail.min.z).toBeGreaterThanOrEqual(7.2375 - 0.00001);
      expect(detail.max.z).toBeLessThanOrEqual(7.3625 + 0.00001);
      expect(detail.min.y).toBeGreaterThanOrEqual(1.33 - 0.00001);
      expect(detail.max.y).toBeLessThanOrEqual(1.495 + 0.00001);
    });
    expect(detailMeshes).toBeGreaterThan(1);
  } finally {
    await act(async () => root.unmount());
  }
});
