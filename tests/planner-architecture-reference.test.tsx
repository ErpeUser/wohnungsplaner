import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, ExtrudeGeometry, Group, Mesh, Raycaster, Vector3, type MeshPhysicalMaterial, type Object3D, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { createSceneModel, type SceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderedArchitecture(scene: SceneModel) {
  const canvas = document.createElement("canvas");
  // Only the GPU boundary is omitted. Rays hit the production meshes and
  // materials after R3F applies the real apartment transforms.
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => {
    state = root.render(<PlannerArchitecture scene={scene} selectionId={null} onSelect={() => {}} />).getState();
  });
  state!.scene.updateMatrixWorld(true);
  return {
    scene: state!.scene,
    async dispose() { await act(async () => root.unmount()); },
  };
}

function localRay(object: Object3D, x: number, y: number, side = 1) {
  const origin = object.localToWorld(new Vector3(x, y, side));
  const direction = new Vector3(0, 0, -side).transformDirection(object.matrixWorld);
  return new Raycaster(origin, direction).intersectObject(object, true);
}

function surfaceMaterial(object: Object3D) {
  expect(object).toBeInstanceOf(Mesh);
  const material = (object as Mesh).material;
  expect(Array.isArray(material)).toBe(false);
  return material as MeshPhysicalMaterial;
}

test("the hall glazed leaf has an opaque lower field on both faces and retains clear upper glazing", async () => {
  const source = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "vorraum");
  const door = source.doors.find((candidate) => candidate.id === "hall-living-door")!;
  const model = await renderedArchitecture({
    ...source, floors: [], walls: [], windows: [], builtIns: [], placements: [], fixtures: [], doors: [door],
  });
  try {
    const leaf = model.scene.getObjectByName("door-hall-living-door")!;
    expect(leaf).toBeDefined();
    // Broad sample areas distinguish an infilled panel from a thin crossrail.
    // These are model-space probes, not new measurements from a photograph.
    for (const side of [-1, 1]) {
      for (const x of [-0.2, 0, 0.2]) {
        for (const y of [-0.75, -0.55]) {
          const hit = localRay(leaf, x, y, side)[0];
          expect(hit).toBeDefined();
          const material = surfaceMaterial(hit.object);
          expect(material.opacity).toBe(1);
          expect(material.transmission ?? 0).toBe(0);
          expect(Math.min(material.color.r, material.color.g, material.color.b)).toBeGreaterThan(0.75);
        }
      }
      const upper = localRay(leaf, 0, 0.4, side)[0];
      expect(upper).toBeDefined();
      expect(surfaceMaterial(upper.object).transmission).toBeGreaterThan(0.8);

      // The existing 85 × 200 cm leaf edges still contain the new infill.
      for (const x of [-0.42, 0.42]) expect(localRay(leaf, x, -0.65, side).length).toBeGreaterThan(0);
      for (const x of [-0.43, 0.43]) expect(localRay(leaf, x, -0.65, side)).toHaveLength(0);
      for (const y of [-0.99, 0.99]) expect(localRay(leaf, 0, y, side).length).toBeGreaterThan(0);
      for (const y of [-1.01, 1.01]) expect(localRay(leaf, 0, y, side)).toHaveLength(0);
    }
  } finally { await model.dispose(); }
});

test("the WC plate has two broad light rockers separated by a recessed vertical seam inside its existing envelope", async () => {
  const source = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wc");
  const flush = source.builtIns.find((item) => item.catalogId === "wc-flush-plate")!;
  const model = await renderedArchitecture({
    ...source, floors: [], walls: [], windows: [], doors: [], placements: [], fixtures: [], builtIns: [flush],
  });
  try {
    const plate = model.scene.getObjectByName(`wc-flush-plate-${flush.source.id}`)!;
    expect(plate).toBeDefined();
    const left = localRay(plate, -0.04, 0.03)[0];
    const right = localRay(plate, 0.06, 0.03)[0];
    expect(left).toBeDefined();
    expect(right).toBeDefined();
    expect(left.object).not.toBe(right.object);
    for (const x of [-0.04, 0.06]) {
      for (const y of [-0.03, 0, 0.03]) {
        const hit = localRay(plate, x, y)[0];
        const localHit = plate.worldToLocal(hit.point.clone());
        // A broad raised control must cover these points, not the backing plate.
        expect(localHit.z).toBeGreaterThan(0.0225);
        const material = surfaceMaterial(hit.object);
        expect(material.opacity).toBe(1);
        expect(Math.min(material.color.r, material.color.g, material.color.b)).toBeGreaterThan(0.75);
      }
    }
    for (const y of [-0.03, 0, 0.03]) {
      const seam = localRay(plate, 0.0264, y)[0];
      expect(seam.object).not.toBe(left.object);
      expect(seam.object).not.toBe(right.object);
      expect(plate.worldToLocal(seam.point.clone()).z).toBeLessThan(0.02);
    }

    // A border ray locates the actual outer plate, independent of child order.
    const body = localRay(plate, -0.11, 0)[0].object;
    const bounds = new Box3().setFromObject(body);
    expect(bounds.getSize(new Vector3()).x).toBeCloseTo(0.24, 4);
    expect(bounds.getSize(new Vector3()).y).toBeCloseTo(0.16, 4);
    expect(bounds.getSize(new Vector3()).z).toBeCloseTo(0.035, 4);
    expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(-1.97, 4);
    expect(bounds.getCenter(new Vector3()).z).toBeCloseTo(4.115, 4);
    expect(bounds.min.y).toBeCloseTo(1.02, 4);
  } finally { await model.dispose(); }
});
