import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, BufferAttribute, BufferGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, Vector3, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({ Group, Mesh, ExtrudeGeometry, MeshBasicMaterial, BufferAttribute, BufferGeometry, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("renders the user-selected oak board, pale-tiled shaft, ventilation, foliage and ceramic wall toilet in production 3D", async () => {
  const source = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wc");
  const scene = {
    ...source, floors: [], doors: [], windows: [], placements: [], fixtures: [],
  };
  const canvas = document.createElement("canvas");
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  try {
    await act(async () => {
      state = root.render(<PlannerArchitecture scene={scene} selectionId={null} onSelect={() => {}} />).getState();
    });
    state!.scene.updateMatrixWorld(true);
    const rootObject = state!.scene;
    const wood = rootObject.getObjectByName("wc-wallboard-simple-80");
    expect(wood).toBeDefined();
    expect(rootObject.getObjectByName("wc-wallboard-mdf-top")).toBeDefined();
    const bounds = new Box3().setFromObject(wood!).getSize(new Vector3());
    expect(bounds.x).toBeCloseTo(0.8, 2);
    expect(bounds.y).toBeCloseTo(0.038, 2);
    expect(bounds.z).toBeCloseTo(0.235, 2);
    for (const name of [
      "wc-photo-shelf-styling", "wc-shelf-plant-pot", "wc-pothos-vine-0",
      "wc-wall-air-vent", "wc-vent-louver-0", "wc-wall-hung-ceramic-pan",
      "wc-bowl-interior", "wc-seat-contoured-rim", "wc-service-hatch-door",
    ]) expect(rootObject.getObjectByName(name), name).toBeDefined();

    const tiles: Mesh[] = [];
    rootObject.traverse(object => {
      if (object instanceof Mesh && object.name === "wc-ivory-ceramic-tiles") tiles.push(object);
    });
    expect(tiles.length).toBeGreaterThanOrEqual(4);
    for (const mesh of tiles) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      expect(materials.some(m => m instanceof MeshPhysicalMaterial)).toBe(true);
      const geom = mesh.geometry as BufferGeometry;
      expect(geom.getAttribute("color")).toBeDefined();
    }
    expect(rootObject.getObjectByName("wc-celadon-onyx-marble")).toBeUndefined();
  } finally { await act(async () => root.unmount()); }
});
