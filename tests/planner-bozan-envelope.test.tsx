import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3, type Scene, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderedTable() {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  const review = createReviewScene("dining-table-bozan-110");
  const input = JSON.stringify(review.scene);
  let state: RootState | undefined;
  await act(async () => { state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState(); });
  state!.scene.updateMatrixWorld(true);
  return { scene: state!.scene, inputUnchanged: () => JSON.stringify(review.scene) === input,
    async dispose() { await act(async () => root.unmount()); } };
}

function meshes(scene: Scene) {
  const result: Mesh[] = [];
  scene.traverse((object) => { if (object instanceof Mesh) result.push(object); });
  return result;
}

test("Bozan's visible vertices fit its unchanged 110 × 110 × 76 cm catalogue envelope and reach the floor", async () => {
  const model = await renderedTable();
  try {
    const bounds = new Box3().setFromObject(model.scene);
    const size = bounds.getSize(new Vector3());
    expect.soft(bounds.min.y).toBeCloseTo(0, 6);
    expect.soft(bounds.max.y).toBeCloseTo(0.76, 6);
    expect.soft(size.x).toBeCloseTo(1.1, 6);
    expect.soft(size.z).toBeCloseTo(1.1, 6);
    expect(model.inputUnchanged()).toBe(true);
  } finally { await model.dispose(); }
});

test("Bozan has a flush central joint and no tangential rail outside its circular slab", async () => {
  const model = await renderedTable();
  try {
    const shared = getPlannerMaterial("oak-artisan-edge");
    const details = meshes(model.scene).filter((mesh) => mesh.material instanceof MeshStandardMaterial && mesh.material.name === shared.name);
    expect.soft(details).toHaveLength(1);
    for (const detail of details) {
      const material = detail.material as MeshStandardMaterial;
      expect(material).not.toBe(shared);
      expect(material.polygonOffset).toBe(true);
      expect(material.polygonOffsetFactor).toBeLessThan(0);
      expect(material.polygonOffsetUnits).toBeLessThan(0);
      expect(material.color.toArray()).toEqual(shared.color.toArray());
      expect(material.roughness).toBe(shared.roughness);
      expect(material.map).toBe(shared.map);
      const positions = detail.geometry.getAttribute("position");
      for (let index = 0; index < positions.count; index++) {
        const point = new Vector3().fromBufferAttribute(positions, index).applyMatrix4(detail.matrixWorld);
        expect.soft(Math.hypot(point.x, point.z)).toBeLessThanOrEqual(0.550001);
        expect.soft(point.y).toBeLessThanOrEqual(0.760001);
      }
    }
    expect(shared.polygonOffset).toBe(false);
    const ray = new Raycaster(new Vector3(0.3, 1, 0.55), new Vector3(0, -1, 0));
    expect(ray.intersectObjects(model.scene.children, true).filter((hit) => hit.point.y > 0.7)).toHaveLength(0);
  } finally { await model.dispose(); }
});

test("the private flush-joint material is released while shared edge resources remain alive", async () => {
  const model = await renderedTable();
  const shared = getPlannerMaterial("oak-artisan-edge");
  const detail = meshes(model.scene).find((mesh) => mesh.material instanceof MeshStandardMaterial && mesh.material.name === shared.name)!;
  const material = detail.material as MeshStandardMaterial;
  let privateDisposals = 0;
  let sharedDisposals = 0;
  const disposed = () => { sharedDisposals += 1; };
  material.addEventListener("dispose", () => { privateDisposals += 1; });
  const resources = [shared, shared.map, shared.bumpMap].filter((resource) => resource !== null);
  resources.forEach((resource) => resource.addEventListener("dispose", disposed));
  try {
    await model.dispose();
    expect(privateDisposals).toBe(1);
    expect(sharedDisposals).toBe(0);
  } finally { resources.forEach((resource) => resource.removeEventListener("dispose", disposed)); }
});

test("all four existing star legs contact the floor while retaining their upper attachment height", async () => {
  const model = await renderedTable();
  try {
    const legs = meshes(model.scene).filter((mesh) => mesh.geometry.type === "BoxGeometry" && mesh.material === getPlannerMaterial("metal-black"));
    expect(legs).toHaveLength(4);
    // The existing upper end is retained; this is the old renderer's contact,
    // not an additional manufacturer dimension.
    const originalUpperContact = (0.46 + 0.44 * Math.cos(0.54) + 0.0325 * Math.sin(0.54)) * 0.76;
    for (const leg of legs) {
      const bounds = new Box3().setFromObject(leg);
      expect.soft(bounds.min.y).toBeCloseTo(0, 6);
      expect.soft(bounds.max.y).toBeCloseTo(originalUpperContact, 6);
    }
  } finally { await model.dispose(); }
});

test("the recorded 25 mm Bozan slab rests on its existing apron without an air gap", async () => {
  const model = await renderedTable();
  try {
    const objects = meshes(model.scene);
    const top = objects.find((mesh) => mesh.material === getPlannerMaterial("oak-bozan-directional"))!;
    const apron = objects.find((mesh) => mesh.material === getPlannerMaterial("oak-bozan-edge"))!;
    expect(top).toBeDefined();
    expect(apron).toBeDefined();
    const slabBounds = new Box3().setFromObject(top);
    const apronBounds = new Box3().setFromObject(apron);
    expect.soft(slabBounds.max.y - slabBounds.min.y).toBeCloseTo(0.025, 6);
    expect.soft(Math.abs(apronBounds.max.y - slabBounds.min.y)).toBeLessThan(0.00001);
  } finally { await model.dispose(); }
});
