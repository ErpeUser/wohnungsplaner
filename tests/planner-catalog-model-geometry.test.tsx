import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import React, { act, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three-stdlib";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { PLANNER_ASSET_MANIFEST } from "../app/planner/catalog/asset-manifest.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";
import { plannerAssetUrl } from "../app/planner/scene-3d/asset-url.ts";
import { CatalogModelGeometry } from "../app/planner/scene-3d/catalog-model-geometry.tsx";
import type { SceneModel } from "../app/planner/scene-3d/scene-model.ts";
import type { PlannerAssetRecord } from "../app/planner/domain/types.ts";

const parsed = vi.hoisted(() => new Map<string, GLTF>());
vi.mock("@react-three/drei", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/drei")>();
  const useLocalGLTF = ((path: string) => original.useGLTF(path, false, false, (loader) => {
    // Replace file transport only. The real loader output, hook/cache, production
    // wrapper, transforms, materials and raycasting remain active.
    loader.load = (url, onLoad, _onProgress, onError) => {
      const source = String(url).startsWith("/planner-assets/") ? new URL(String(url), "https://test.invalid").pathname : String(url);
      const gltf = parsed.get(source);
      queueMicrotask(() => {
        if (gltf) onLoad(gltf);
        else onError?.(new ErrorEvent("error", { error: new Error(`Missing local GLB fixture: ${String(url)}`) }));
      });
    };
  })) as typeof original.useGLTF;
  Object.assign(useLocalGLTF, original.useGLTF);
  return { ...original, useGLTF: useLocalGLTF };
});

extend({ Group: THREE.Group, Mesh: THREE.Mesh, ExtrudeGeometry: THREE.ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CASES = [
  { id: "chair-office", asset: "chair", size: [0.62, 1.05, 0.62] as [number, number, number] },
  { id: "shelf", asset: "storage", size: [0.9, 1.9, 0.35] as [number, number, number] },
] as const;

function meshes(object: THREE.Object3D) {
  const result: THREE.Mesh[] = [];
  object.traverse((child) => { if (child instanceof THREE.Mesh) result.push(child); });
  return result;
}

function bounds(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  const result = new THREE.Box3();
  const vertex = new THREE.Vector3();
  for (const mesh of meshes(object)) {
    for (let i = 0; i < mesh.geometry.getAttribute("position").count; i++) {
      mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
      result.expandByPoint(vertex);
    }
  }
  return result;
}

function ray(object: THREE.Object3D, origin: [number, number, number], direction: [number, number, number]) {
  object.updateMatrixWorld(true);
  return new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObject(object, true)[0];
}

function expectOfficeFeatures(object: THREE.Object3D, [width, height, depth]: readonly number[]) {
  for (const side of [-1, 1]) {
    const arm = ray(object, [side * width * 0.44, height * 0.65, depth], [0, 0, -1]);
    expect.soft(arm, "each side has an arm surface above and forward of the seat back").toBeDefined();
    if (arm) expect.soft(arm.point.z).toBeGreaterThan(-depth * 0.1);
  }
  const support = ray(object, [0, height * 0.24, depth], [0, 0, -1]);
  expect.soft(support, "a central under-seat support distinguishes the swivel structure from four dining-chair legs").toBeDefined();
  if (support) expect.soft(Math.abs(support.point.z)).toBeLessThan(depth * 0.15);
}

function expectOpenShelf(object: THREE.Object3D, [width, height, depth]: readonly number[]) {
  let openLevels = 0;
  for (const level of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
    const first = ray(object, [width * 0.1, height * level, depth], [0, 0, -1]);
    if (!first || first.point.z < -depth * 0.35) openLevels++;
  }
  expect(openLevels, "front rays enter several genuinely empty shelf bays instead of a closed storage body").toBeGreaterThanOrEqual(5);
  const board = ray(object, [0, height * 0.91, 0], [0, -1, 0]);
  expect(board, "open storage still has a usable interior horizontal board").toBeDefined();
  if (board) expect(board.point.y).toBeGreaterThan(height * 0.15);
}

function expectBounds(object: THREE.Object3D, size: readonly number[]) {
  const box = bounds(object);
  const actual = box.getSize(new THREE.Vector3());
  size.forEach((value, axis) => expect(actual.getComponent(axis)).toBeCloseTo(value, 6));
  expect(box.min.y).toBeCloseTo(0, 6);
  expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(0, 6);
  expect(box.getCenter(new THREE.Vector3()).z).toBeCloseTo(0, 6);
}

async function rendered(element: ReactNode) {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as THREE.WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  const update = async (next: ReactNode) => {
    await act(async () => { state = root.render(next).getState(); });
    state!.scene.updateMatrixWorld(true);
  };
  await update(element);
  return { scene: state!.scene, update, async dispose() { await act(async () => root.unmount()); } };
}

const furniture = (scene: SceneModel, assetOrigins = new Set<string>()) => <Furniture3D scene={scene} selectionId={null} onSelect={() => {}} assetOrigins={assetOrigins} />;

beforeAll(async () => {
  for (const name of ["chair", "storage"]) {
    const path = `/planner-assets/models/${name}.glb`;
    const asset = PLANNER_ASSET_MANIFEST.assets.find((entry) => entry.path === path)!;
    const bytes = await readFile(resolve(process.cwd(), "public", path.slice(1)));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    parsed.set(path, await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, ""));
  }
});

afterAll(() => { for (const path of parsed.keys()) useGLTF.clear(plannerAssetUrl(path)); });

test.each(CASES)("wrapper $id provides its declared construction rather than the incompatible shared mesh", async ({ id, size }) => {
  const scene = createReviewScene(id).scene;
  const source = JSON.stringify(scene);
  const model = await rendered(furniture(scene));
  try {
    if (id === "chair-office") expectOfficeFeatures(model.scene, size);
    else expectOpenShelf(model.scene, size);
    expect(JSON.stringify(scene)).toBe(source);
  } finally { await model.dispose(); }
});

test.each(CASES)("wrapper $id keeps the recorded envelope and floor contact", async ({ id, size }) => {
  const model = await rendered(furniture(createReviewScene(id).scene));
  try { expectBounds(model.scene, size); } finally { await model.dispose(); }
});

test.each(CASES)("wrapper $id retains default, selected and legacy material choices", async ({ id }) => {
  const scene = createReviewScene(id).scene;
  const materials = getFurnitureCatalogItem(id)!.materials;
  const update = (variants?: Record<string, string>) => ({ ...scene, placements: scene.placements.map((item) => ({ ...item, materialId: "object-neutral", source: { ...item.source, materialVariants: variants } })) });
  const model = await rendered(furniture(update()));
  const expectFinish = (materialId: string) => {
    const recipe = getPlannerMaterial(materialId);
    const actual = meshes(model.scene).flatMap((mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
    expect(actual.some((m) => m instanceof THREE.MeshStandardMaterial && m.color.equals(recipe.color) && m.map === recipe.map && m.roughness === recipe.roughness)).toBe(true);
  };
  try {
    expectFinish(materials[0].id);
    for (const option of materials) { await model.update(furniture(update({ main: option.id }))); expectFinish(option.id); }
    await model.update(furniture(update({ main: materials[0].id, color: materials[1].id }))); expectFinish(materials[0].id);
    await model.update(furniture(update({ color: materials[1].id }))); expectFinish(materials[1].id);
    await model.update(furniture(update())); expectFinish(materials[0].id);
  } finally { await model.dispose(); }
});

test.each(CASES)("wrapper $id preserves an explicitly imported model and authored materials", async ({ id, asset: name }) => {
  const source = parsed.get(`/planner-assets/models/${name}.glb`)!;
  const path = `https://assets.example.test/generic-protected-${name}.glb`;
  parsed.set(path, source);
  const scene = createReviewScene(id).scene;
  const manifest = PLANNER_ASSET_MANIFEST.assets.find((entry) => entry.path === `/planner-assets/models/${name}.glb`)!;
  const asset: PlannerAssetRecord = {
    assetId: `protected-${name}`, name, category: "Arbeiten", mediaType: "model/gltf-binary", byteLength: manifest.byteLength, sha256: manifest.sha256,
    normalizedSize: { width: 2, height: 0.5, depth: 4 }, meterScale: 0.25, floorOffset: 0.07, pivot: "center",
    materialId: "object-neutral", license: "MIT", source: "Local original GLB fixture", confidence: "confirmed", notes: [], createdAt: "2026-11-15T00:00:00.000Z", assetUrl: path,
  };
  scene.placements = [{ ...scene.placements[0], asset, assetTransform: { normalizedSize: asset.normalizedSize, meterScale: 0.25, floorOffset: 0.07, pivot: "center" } }];
  const model = await rendered(furniture(scene, new Set(["https://assets.example.test"])));
  try {
    const originalMeshes = meshes(source.scene), actualMeshes = meshes(model.scene);
    expect(actualMeshes.map((mesh) => mesh.geometry)).toEqual(originalMeshes.map((mesh) => mesh.geometry));
    actualMeshes.forEach((mesh, i) => {
      const actual = mesh.material as THREE.MeshStandardMaterial, original = originalMeshes[i].material as THREE.MeshStandardMaterial;
      expect(actual.color.toArray()).toEqual(original.color.toArray());
      expect(actual.map).toBe(original.map);
      expect(actual.roughness).toBe(original.roughness);
    });
    const original = bounds(source.scene), result = bounds(model.scene), size = scene.placements[0].size;
    const scale = [size[0] / 2 * 0.25, size[1] / 0.5 * 0.25, size[2] / 4 * 0.25];
    scale.forEach((factor, axis) => expect(result.getSize(new THREE.Vector3()).getComponent(axis)).toBeCloseTo(original.getSize(new THREE.Vector3()).getComponent(axis) * factor, 6));
    expect(result.min.y).toBeCloseTo(original.min.y * scale[1] + 0.07, 6);
  } finally { await model.dispose(); }
});

function component(id: "chair-office" | "shelf", size: [number, number, number], materialId: string, position: [number, number, number] = [0, 0, 0], rotationY = 0) {
  return <group position={position} rotation={[0, rotationY, 0]} scale={size}>
    <CatalogModelGeometry catalogId={id} materialId={materialId} size={size} />
  </group>;
}

function expectConnectedGeometry(object: THREE.Object3D) {
  const parts = meshes(object);
  const boxes = parts.map((mesh) => bounds(mesh).expandByScalar(1e-6));
  const reachable = new Set([0]);
  for (let pass = 0; pass < parts.length; pass++) {
    boxes.forEach((box, index) => {
      if ([...reachable].some((known) => box.intersectsBox(boxes[known]))) reachable.add(index);
    });
  }
  expect(reachable.size, "every visible part remains connected to the assembly").toBe(parts.length);
  for (const mesh of parts) {
    for (const attribute of Object.values(mesh.geometry.attributes)) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    const normals = mesh.geometry.getAttribute("normal");
    for (let i = 0; i < normals.count; i++) {
      expect(new THREE.Vector3().fromBufferAttribute(normals, i).length()).toBeCloseTo(1, 5);
    }
  }
}

test.each(CASES)("component $id supplies connected declared construction inside its envelope", async ({ id, size }) => {
  const model = await rendered(component(id, size, getFurnitureCatalogItem(id)!.materials[0].id));
  try {
    if (id === "chair-office") expectOfficeFeatures(model.scene, size);
    else expectOpenShelf(model.scene, size);
    expectBounds(model.scene, size);
    expectConnectedGeometry(model.scene);
  } finally { await model.dispose(); }
});

test.each([
  { id: "chair-office" as const, size: [0.62, 1.05, 0.62] as [number, number, number] },
  { id: "shelf" as const, size: [0.9, 1.9, 0.35] as [number, number, number] },
  { id: "shelf" as const, size: [1.2, 2.25, 0.4] as [number, number, number] },
])("component $id preserves translated, rotated and resized visible bounds at $size", async ({ id, size }) => {
  const model = await rendered(component(id, size, getFurnitureCatalogItem(id)!.materials[0].id, [2.1, 0.37, -1.3], Math.PI / 2));
  try {
    const box = bounds(model.scene), extent = box.getSize(new THREE.Vector3());
    [size[2], size[1], size[0]].forEach((value, axis) => expect(extent.getComponent(axis)).toBeCloseTo(value, 6));
    expect(box.min.y).toBeCloseTo(0.37, 6);
    expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(2.1, 6);
    expect(box.getCenter(new THREE.Vector3()).z).toBeCloseTo(-1.3, 6);
  } finally { await model.dispose(); }
});

test.each(CASES)("component $id updates the real selected surfaces while retaining shared recipes and geometry", async ({ id, size }) => {
  const options = getFurnitureCatalogItem(id)!.materials;
  const recipes = options.map((option) => getPlannerMaterial(option.id));
  const before = recipes.map((material) => JSON.stringify(material.toJSON()));
  const model = await rendered(component(id, size, options[0].id));
  const geometries = meshes(model.scene).map((mesh) => mesh.geometry);
  try {
    for (const option of [...options, options[0]]) {
      await model.update(component(id, size, option.id));
      const material = getPlannerMaterial(option.id);
      if (id === "shelf") {
        meshes(model.scene).forEach((mesh) => expect(mesh.material).toBe(material));
      } else {
        const surfaceRays = [
          ray(model.scene, [0, size[1] * 0.8, size[2] * 0.15], [0, -1, 0]),
          ray(model.scene, [0, size[1] * 0.82, size[2]], [0, 0, -1]),
          ...[-1, 1].map((side) => ray(model.scene, [side * size[0] * 0.44, size[1] * 0.65, size[2]], [0, 0, -1])),
        ];
        surfaceRays.forEach((hit) => {
          expect(hit).toBeDefined();
          if (hit?.object instanceof THREE.Mesh) expect(hit.object.material).toBe(material);
        });
        const support = ray(model.scene, [0, size[1] * 0.24, size[2]], [0, 0, -1]);
        expect((support.object as THREE.Mesh).material).toBe(getPlannerMaterial("metal-dark"));
      }
      expect(meshes(model.scene).map((mesh) => mesh.geometry)).toEqual(geometries);
      expectBounds(model.scene, size);
    }
    expect(recipes.map((material) => JSON.stringify(material.toJSON()))).toEqual(before);
  } finally { await model.dispose(); }
});

test.each(CASES)("component $id disposes owned geometry once and keeps cached materials/textures alive", async ({ id, size }) => {
  const options = getFurnitureCatalogItem(id)!.materials;
  const shared = new Set<THREE.Material | THREE.Texture>();
  for (const key of [...options.map((option) => option.id), "metal-dark"]) {
    const material = getPlannerMaterial(key);
    shared.add(material);
    for (const texture of [material.map, material.bumpMap, material.normalMap, material.roughnessMap]) if (texture) shared.add(texture);
  }
  const sharedDisposed = vi.fn();
  shared.forEach((resource) => resource.addEventListener("dispose", sharedDisposed));
  const model = await rendered(component(id, size, options[0].id));
  const geometries = [...new Set(meshes(model.scene).map((mesh) => mesh.geometry))];
  const events = geometries.map((geometry) => { const disposed = vi.fn(); geometry.addEventListener("dispose", disposed); return { geometry, disposed }; });
  let unmounted = false;
  try {
    await model.update(component(id, size, options[1].id));
    events.forEach(({ disposed }) => expect(disposed).not.toHaveBeenCalled());
    expect(sharedDisposed).not.toHaveBeenCalled();
    await model.dispose(); unmounted = true;
    events.forEach(({ disposed }) => expect(disposed).toHaveBeenCalledTimes(1));
    expect(sharedDisposed).not.toHaveBeenCalled();
  } finally {
    if (!unmounted) await model.dispose();
    events.forEach(({ geometry, disposed }) => geometry.removeEventListener("dispose", disposed));
    shared.forEach((resource) => resource.removeEventListener("dispose", sharedDisposed));
  }
});
