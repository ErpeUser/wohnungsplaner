import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";

extend({ Group: THREE.Group, Mesh: THREE.Mesh, ExtrudeGeometry: THREE.ExtrudeGeometry, MeshBasicMaterial: THREE.MeshBasicMaterial });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// R3F still creates the real Three scene, meshes, materials and transforms.
// Only the GPU boundary is omitted; assertions raycast the resulting geometry.
async function renderedScene(children: React.ReactNode) {
  const canvas = document.createElement("canvas");
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as THREE.WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => {
    state = root.render(children).getState();
  });
  state!.scene.updateMatrixWorld(true);
  return {
    scene: state!.scene,
    async dispose() { await act(async () => root.unmount()); },
  };
}

async function furnitureScene(modelId: string, materialId: string, variant?: string) {
  const review = createReviewScene(modelId, materialId, variant);
  return renderedScene(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />);
}

async function architectureScene(kind: "clock" | "intercom") {
  if (kind === "clock") {
    const review = createReviewScene("builtin:living-clock");
    return renderedScene(<PlannerArchitecture scene={review.scene} selectionId={null} onSelect={() => {}} />);
  }
  const source = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
  const intercom = source.fixtures.find((fixture) => fixture.id === "fixture-hall-intercom")!;
  const scene = { ...source, floors: [], walls: [], doors: [], windows: [], builtIns: [], placements: [], fixtures: [{ ...intercom, position: [0, 0, 0] as [number, number, number], rotationY: 0 }] };
  return renderedScene(<PlannerArchitecture scene={scene} selectionId={null} onSelect={() => {}} />);
}

function ray(scene: THREE.Scene, origin: [number, number, number], direction: [number, number, number]) {
  return new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObjects(scene.children, true);
}

describe("source-backed furniture geometry", () => {
  test("AliExpress table leaves the floor centre open between its four metal legs", async () => {
    const model = await furnitureScene("dining-table-aliexpress-100-140", "oak-artisan");
    try {
      expect(ray(model.scene, [0, 0.06, 1], [0, 0, -1])).toHaveLength(0);
    } finally { await model.dispose(); }
  });

  test("Kaufland has clear legroom between two transverse supports", async () => {
    const model = await furnitureScene("dining-table-kaufland-567080013-120-160", "walnut", "extended");
    try {
      expect(ray(model.scene, [0, 0.35, 1], [0, 0, -1])).toHaveLength(0);
      expect(ray(model.scene, [-0.53, 0.35, 1], [0, 0, -1]).length).toBeGreaterThan(0);
      expect(ray(model.scene, [0.53, 0.35, 1], [0, 0, -1]).length).toBeGreaterThan(0);
    } finally { await model.dispose(); }
  });

  test("Kaufland keeps the measured 18 mm tabletop and capsule outline", async () => {
    const model = await furnitureScene("dining-table-kaufland-567080013-120-160", "walnut", "extended");
    try {
      const surface = ray(model.scene, [0.4, 2, 0.1], [0, -1, 0])[0];
      expect(surface).toBeDefined();
      const bounds = new THREE.Box3().setFromObject(surface.object);
      expect(bounds.max.y - bounds.min.y).toBeCloseTo(0.018, 3);
      expect(bounds.max.y).toBeCloseTo(0.755, 3);
      expect(ray(model.scene, [0.73, 2, 0.3], [0, -1, 0])).toHaveLength(0);
    } finally { await model.dispose(); }
  });

  test("Temu storage table has a circular closed top and cabinet resting at floor level", async () => {
    const model = await furnitureScene("dining-table-temu-606997-120-160", "oak-natural");
    try {
      expect(ray(model.scene, [0.5, 2, 0.5], [0, -1, 0])).toHaveLength(0);
      expect(new THREE.Box3().setFromObject(model.scene).min.y).toBeLessThan(0.015);
    } finally { await model.dispose(); }
  });

  test.each([
    ["chair-kaleo-chenille-beige", "fabric-kaleo-beige", 0.50],
    ["chair-amber-chenille-beige", "fabric-amber-beige", 0.49],
    ["chair-temu-swivel-upholstered", "fabric-temu-sand", 0.40],
    ["chair-temu-velvet-swivel-arm", "velvet-temu-beige", 0.47],
  ] as const)("%s places the seat at the documented height", async (id, material, height) => {
    const model = await furnitureScene(id, material);
    try {
      const seat = ray(model.scene, [0, 2, 0.1], [0, -1, 0])[0];
      expect(seat).toBeDefined();
      expect(seat.point.y).toBeCloseTo(height, 2);
    } finally { await model.dispose(); }
  });

  test("Amber's four cross feet leave open floor between the spokes", async () => {
    const model = await furnitureScene("chair-amber-chenille-beige", "fabric-amber-beige");
    try {
      expect(ray(model.scene, [0.18, 0.08, 0.08], [0, -1, 0])).toHaveLength(0);
    } finally { await model.dispose(); }
  });

  test("upholstered Temu uses four legs with open space below its swivel mount", async () => {
    const model = await furnitureScene("chair-temu-swivel-upholstered", "fabric-temu-sand");
    try {
      expect(ray(model.scene, [0, 0.035, 1], [0, 0, -1])).toHaveLength(0);
      expect(ray(model.scene, [0.235, 0.52, 1], [0, 0, -1]).length).toBeGreaterThan(0);
    } finally { await model.dispose(); }
  });

  test("Tejo hooks sit on the backing rail instead of floating at the cabinet front", async () => {
    const model = await furnitureScene("hallway-tejo-115", "tejo-cashmere");
    try {
      const hook = ray(model.scene, [0.03 * 1.15, 0.69 * 2.319, 1], [0, 0, -1])[0];
      const backing = ray(model.scene, [0.1 * 1.15, 0.69 * 2.319, 1], [0, 0, -1])[0];
      expect(hook).toBeDefined();
      expect(backing).toBeDefined();
      expect(((hook.object as THREE.Mesh).material as THREE.Material).name).toBe("planner-material-metal-dark");
      expect(hook.point.z - backing.point.z).toBeLessThan(0.025);
    } finally { await model.dispose(); }
  });

  test.each([
    ["arm", 0.61, 0.49],
    ["back", 0.33, 0.65],
  ] as const)("extending the AliExpress sofa preserves the %s while its footrests move forward", async (_part, x, y) => {
    const closed = await furnitureScene("sofa-aliexpress-142", "fabric-ali-ivory");
    const open = await furnitureScene("sofa-aliexpress-142-open", "fabric-ali-ivory");
    try {
      const closedPart = ray(closed.scene, [x, y, 2], [0, 0, -1])[0];
      const openPart = ray(open.scene, [x, y, 2], [0, 0, -1])[0];
      expect(closedPart).toBeDefined();
      expect(openPart).toBeDefined();
      const closedBounds = new THREE.Box3().setFromObject(closedPart.object);
      const openBounds = new THREE.Box3().setFromObject(openPart.object);
      const closedSize = closedBounds.getSize(new THREE.Vector3());
      const openSize = openBounds.getSize(new THREE.Vector3());
      for (const axis of ["x", "y", "z"] as const) expect(openSize[axis]).toBeCloseTo(closedSize[axis], 4);
      // The wider plan footprint is centred on the full open sofa, so the
      // unchanged body shifts back by half the additional 82 cm footprint.
      expect(openBounds.min.z - closedBounds.min.z).toBeCloseTo(-0.41, 4);
      const footrest = ray(open.scene, [0.33, 0.38, 2], [0, 0, -1])[0];
      expect(footrest.point.z).toBeGreaterThan(0.8);
      expect(footrest.point.z).toBeLessThan(0.86);
    } finally { await closed.dispose(); await open.dispose(); }
  });
});

describe("authored procedural surface colours", () => {
  test("comparison wood keeps its texture colour without a second brown multiplier", () => {
    for (const id of ["oak-artisan", "oak-natural", "walnut"]) {
      const material = getPlannerMaterial(id);
      expect(material.map).toBeInstanceOf(THREE.DataTexture);
      expect(material.color.getHexString()).toBe("ffffff");
      expect(material.bumpMap?.colorSpace).toBe(THREE.NoColorSpace);
    }
  });

  test("authored chenille texture is not darkened by a second beige tint", () => {
    for (const id of ["fabric-kaleo-chenille", "fabric-amber-beige", "velvet-temu-beige"]) {
      const material = getPlannerMaterial(id);
      expect(material.map).toBeInstanceOf(THREE.DataTexture);
      expect(material.color.getHexString()).toBe("ffffff");
    }
  });
});

describe("photographed fixed fixture silhouettes", () => {
  test("the living-room clock retains its configured size and has solid square frame corners", async () => {
    const model = await architectureScene("clock");
    try {
      const bounds = new THREE.Box3().setFromObject(model.scene);
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(0.52, 4);
      expect(bounds.max.y - bounds.min.y).toBeCloseTo(0.52, 4);
      expect(bounds.max.z - bounds.min.z).toBeCloseTo(0.065, 4);
      for (const x of [-0.22, 0.22]) for (const y of [0.04, 0.48]) {
        expect(ray(model.scene, [x, y, 1], [0, 0, -1]).length).toBeGreaterThan(0);
      }
    } finally { await model.dispose(); }
  });

  test("the clock has a light square dial behind its hands", async () => {
    const model = await architectureScene("clock");
    try {
      const dial = ray(model.scene, [0.16, 0.42, 1], [0, 0, -1])[0];
      expect(dial).toBeDefined();
      expect(((dial.object as THREE.Mesh).material as THREE.Material).name).toBe("planner-material-white-matte");
    } finally { await model.dispose(); }
  });

  test("the hall video intercom has a broad upper screen inside its existing envelope", async () => {
    const model = await architectureScene("intercom");
    try {
      const bounds = new THREE.Box3().setFromObject(model.scene);
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(0.145, 4);
      expect(bounds.max.y - bounds.min.y).toBeCloseTo(0.185, 4);
      const screen = ray(model.scene, [-0.04, 0.035, 1], [0, 0, -1])[0];
      expect(screen).toBeDefined();
      expect(((screen.object as THREE.Mesh).material as THREE.Material).name).toBe("planner-material-screen-black");
    } finally { await model.dispose(); }
  });

  test("the flat hall intercom has no projecting handset beside the screen", async () => {
    const model = await architectureScene("intercom");
    try {
      const face = ray(model.scene, [-0.04, -0.005, 1], [0, 0, -1])[0];
      expect(face).toBeDefined();
      expect(face.point.z).toBeLessThanOrEqual(0.04);
    } finally { await model.dispose(); }
  });
});
