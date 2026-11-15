import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import React, { act } from "react";
import { useGLTF } from "@react-three/drei";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, BufferAttribute, ExtrudeGeometry, Group, Material, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry, type Object3D, type Texture, type WebGLRenderer } from "three";
import { GLTFLoader, type GLTF } from "three-stdlib";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { PLANNER_ASSET_MANIFEST } from "../app/planner/catalog/asset-manifest.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import type { PlannerAssetRecord } from "../app/planner/domain/types.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { plannerAssetUrl } from "../app/planner/scene-3d/asset-url.ts";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";
import type { SceneModel } from "../app/planner/scene-3d/scene-model.ts";

const parsed = vi.hoisted(() => new Map<string, GLTF>());
vi.mock("@react-three/drei", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/drei")>();
  const useLocalGLTF = ((path: string) => original.useGLTF(path, false, false, (loader) => {
    // Keep the real loader output, drei cache and R3F tree; replace file transport only.
    loader.load = (url, onLoad, _onProgress, onError) => {
      const source = String(url).startsWith("/planner-assets/") ? new URL(String(url), "https://test.invalid").pathname : String(url);
      const gltf = parsed.get(source);
      queueMicrotask(() => {
        if (gltf) onLoad(gltf);
        else onError?.(new ErrorEvent("error", { error: new Error(`Missing original GLB fixture: ${String(url)}`) }));
      });
    };
  })) as typeof original.useGLTF;
  Object.assign(useLocalGLTF, original.useGLTF);
  return { ...original, useGLTF: useLocalGLTF };
});

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Independently specified approved source-material indices, not renderer implementation data.
const ASSETS = [
  { name: "bed", ids: ["bed-120", "bed-160"], selected: [2] },
  { name: "chair", ids: ["chair-dining"], selected: [0, 1] },
  { name: "plant", ids: ["plant-medium"], selected: [0] },
  { name: "sofa", ids: ["sofa-3seat"], selected: [0, 1, 2, 3, 4, 5] },
  { name: "storage", ids: ["nightstand", "wardrobe-200", "dresser", "lowboard"], selected: [0] },
  { name: "table", ids: ["desk-standard", "dining-table"], selected: [0] },
];
// chair-office/shelf now have their own actual component material and imported
// model regression cases in planner-catalog-model-geometry.test.tsx.
const CASES = ASSETS.flatMap((asset) => asset.ids.map((catalogId) => ({ ...asset, catalogId })));
const originals = new Map<string, GLTF>();
const sourceSnapshots = new Map<string, ReturnType<typeof sourceSnapshot>>();
const plannerSnapshots = new Map<string, string>();
const assetPath = (name: string) => `/planner-assets/models/${name}.glb`;
const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

function meshes(object: Object3D) {
  const result: Mesh[] = [];
  object.traverse((child) => { if (child instanceof Mesh) result.push(child); });
  return result;
}

function materialFingerprint(material: Material) {
  const json = material.toJSON();
  delete (json as { uuid?: string }).uuid;
  return digest(JSON.stringify(json));
}

function sourceSnapshot(object: Object3D) {
  object.updateMatrixWorld(true);
  const nodes: unknown[] = [];
  object.traverse((child) => nodes.push({
    position: child.position.toArray(), quaternion: child.quaternion.toArray(), scale: child.scale.toArray(),
    matrix: child.matrix.toArray(), matrixWorld: child.matrixWorld.toArray(),
  }));
  return {
    nodes,
    meshes: meshes(object).map((mesh) => ({
      geometry: mesh.geometry.uuid,
      attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]) => {
        const array = (attribute as BufferAttribute).array;
        return [name, digest(new Uint8Array(array.buffer, array.byteOffset, array.byteLength))];
      })),
      index: mesh.geometry.index ? digest(new Uint8Array(mesh.geometry.index.array.buffer, mesh.geometry.index.array.byteOffset, mesh.geometry.index.array.byteLength)) : null,
      materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => material.toJSON()),
    })),
  };
}

function vertexBounds(object: Object3D) {
  object.updateMatrixWorld(true);
  const bounds = new Box3();
  const vertex = new Vector3();
  for (const mesh of meshes(object)) {
    for (let index = 0; index < mesh.geometry.getAttribute("position").count; index += 1) {
      mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld);
      bounds.expandByPoint(vertex);
    }
  }
  return bounds;
}

function expectPlacementBounds(object: Object3D, catalogId: string, rotated = false) {
  const { width, height, depth } = getFurnitureCatalogItem(catalogId)!.defaultSize;
  const bounds = vertexBounds(object);
  const size = bounds.getSize(new Vector3());
  expect(size.x).toBeCloseTo(rotated ? depth : width, 6);
  expect(size.y).toBeCloseTo(height, 6);
  expect(size.z).toBeCloseTo(rotated ? width : depth, 6);
  expect(bounds.min.y).toBeCloseTo(0, 6);
}

function expectRoles(object: Object3D, name: string, selected: readonly number[], materialId: string) {
  const original = originals.get(assetPath(name))!;
  const sourceMeshes = meshes(original.scene);
  const actualMeshes = meshes(object);
  expect(actualMeshes).toHaveLength(sourceMeshes.length);
  const luminance = (index: number) => {
    const rgb: number[] = original.parser.json.materials[index].pbrMetallicRoughness.baseColorFactor;
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const mesh of actualMeshes) {
    // Geometry identity locates the original primitive, independent of scene order.
    const source = sourceMeshes.find((entry) => entry.geometry === mesh.geometry)!;
    expect(source).toBeDefined();
    const sourceMaterials = Array.isArray(source.material) ? source.material : [source.material];
    const actualMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    expect(actualMaterials).toHaveLength(sourceMaterials.length);
    actualMaterials.forEach((actual, offset) => {
      const authored = sourceMaterials[offset];
      const materialIndex = original.parser.associations.get(authored)!.materials!;
      expect(actual).not.toBe(authored);
      if (selected.includes(materialIndex)) {
        const recipe = getPlannerMaterial(materialId);
        const expected = recipe.clone();
        if (name === "sofa") expected.color.multiplyScalar(luminance(materialIndex) / Math.max(...selected.map(luminance)));
        expect(actual.name, `${name} material ${materialIndex}`).toBe(`planner-material-${materialId}`);
        expect(materialFingerprint(actual), `${name} material ${materialIndex}`).toBe(materialFingerprint(expected));
        expect(actual).not.toBe(recipe);
      } else {
        expect(materialFingerprint(actual), `${name} preserved material ${materialIndex}`).toBe(materialFingerprint(authored));
      }
    });
  }
}

function withMaterial(scene: SceneModel, variants: Record<string, string> | undefined, rotated = false): SceneModel {
  return {
    ...scene,
    placements: scene.placements.map((item) => ({
      ...item, materialId: "object-neutral", rotationY: rotated ? Math.PI / 2 : 0,
      source: { ...item.source, materialVariants: variants },
    })),
  };
}

beforeAll(async () => {
  for (const asset of PLANNER_ASSET_MANIFEST.assets.filter((entry) => entry.type === "model")) {
    const bytes = await readFile(resolve(process.cwd(), "public", asset.path.slice(1)));
    expect(bytes.length).toBe(asset.byteLength);
    expect(digest(bytes)).toBe(asset.sha256);
    const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, "");
    parsed.set(asset.path, gltf);
    originals.set(asset.path, gltf);
    sourceSnapshots.set(asset.path, sourceSnapshot(gltf.scene));
  }
  for (const { catalogId } of CASES) {
    for (const option of getFurnitureCatalogItem(catalogId)!.materials) {
      plannerSnapshots.set(option.id, materialFingerprint(getPlannerMaterial(option.id)));
    }
  }
});

afterAll(() => {
  for (const path of parsed.keys()) useGLTF.clear(plannerAssetUrl(path));
});

async function renderedFurniture(scene: SceneModel, assetOrigins = new Set<string>()) {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  const update = async (next: SceneModel) => {
    const input = JSON.stringify(next);
    await act(async () => {
      state = root.render(<Furniture3D scene={next} selectionId={null} onSelect={() => {}} assetOrigins={assetOrigins} />).getState();
    });
    expect(JSON.stringify(next)).toBe(input);
  };
  await update(scene);
  return { scene: state!.scene, update, async dispose() { await act(async () => root.unmount()); } };
}

test.each(CASES)("$catalogId applies its displayed default, selection, undo and legacy colour only to approved $name slots", async ({ catalogId, name, selected }) => {
  const [first, second] = getFurnitureCatalogItem(catalogId)!.materials;
  const scene = withMaterial(createReviewScene(catalogId).scene, undefined);
  expect(scene.placements[0].source.materialVariants).toBeUndefined();
  const model = await renderedFurniture(scene);
  try {
    expectRoles(model.scene, name, selected, first.id);
    expectPlacementBounds(model.scene, catalogId);
    await model.update(withMaterial(scene, { main: second.id }, true));
    expectRoles(model.scene, name, selected, second.id);
    expectPlacementBounds(model.scene, catalogId, true);
    // The placement key stays the same; updating material props must update useMemo.
    await model.update(withMaterial(scene, { main: first.id, color: second.id }));
    expectRoles(model.scene, name, selected, first.id);
    expectPlacementBounds(model.scene, catalogId);
    await model.update(withMaterial(scene, { color: second.id }));
    expectRoles(model.scene, name, selected, second.id);
  } finally { await model.dispose(); }
});

test.each(ASSETS)("two $name instances keep private materials while one selection changes", async ({ name, ids, selected }) => {
  const [first, second] = getFurnitureCatalogItem(ids[0])!.materials;
  const scene = withMaterial(createReviewScene(ids[0]).scene, { main: first.id });
  const initial = scene.placements[0];
  scene.placements = [initial, {
    ...initial, id: "second-instance", position: [3, initial.position[1], 0],
    source: { ...initial.source, id: "second-instance", materialVariants: { main: second.id } },
  }];
  const model = await renderedFurniture(scene);
  try {
    const [left, right] = model.scene.children[0].children;
    expectRoles(left, name, selected, first.id);
    expectRoles(right, name, selected, second.id);
    const rightMaterials = meshes(right).map((mesh) => mesh.material);
    meshes(left).forEach((mesh, index) => expect(mesh.material).not.toBe(rightMaterials[index]));
    const changed = { ...scene, placements: [
      { ...initial, source: { ...initial.source, materialVariants: { main: second.id } } },
      scene.placements[1],
    ] };
    await model.update(changed);
    expectRoles(left, name, selected, second.id);
    expectRoles(right, name, selected, second.id);
    meshes(right).forEach((mesh, index) => expect(mesh.material).toBe(rightMaterials[index]));
    meshes(left).forEach((mesh, index) => expect(mesh.material).not.toBe(rightMaterials[index]));
  } finally { await model.dispose(); }
});

test("material replacement and unmount dispose only their own private clones", async () => {
  const scene = withMaterial(createReviewScene("dining-table").scene, { main: "oak-natural" });
  const initial = scene.placements[0];
  scene.placements = [initial, {
    ...initial, id: "second-lifecycle-instance", position: [3, initial.position[1], 0],
    source: { ...initial.source, id: "second-lifecycle-instance", materialVariants: { main: "walnut" } },
  }];
  const materials = (object: Object3D) => meshes(object).flatMap((mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
  const recipeMaterials = [getPlannerMaterial("oak-natural"), getPlannerMaterial("walnut")];
  const sharedResources = new Set<Material | BufferGeometry | Texture>([
    ...materials(originals.get(assetPath("table"))!.scene),
    ...meshes(originals.get(assetPath("table"))!.scene).map((mesh) => mesh.geometry),
    ...recipeMaterials,
    ...recipeMaterials.flatMap((material) => [material.map!, material.bumpMap!]),
  ]);
  const sharedDispose = vi.fn();
  for (const resource of sharedResources) resource.addEventListener("dispose", sharedDispose);
  const removeObservations: (() => void)[] = [];
  const watch = (object: Object3D) => materials(object).map((resource) => {
    const event = vi.fn();
    resource.addEventListener("dispose", event);
    removeObservations.push(() => resource.removeEventListener("dispose", event));
    return event;
  });
  const model = await renderedFurniture(scene);
  let unmounted = false;
  try {
    const [left, right] = model.scene.children[0].children;
    const oldLeft = watch(left);
    const activeRight = watch(right);
    const changed = { ...scene, placements: [
      { ...initial, source: { ...initial.source, materialVariants: { main: "walnut" } } },
      scene.placements[1],
    ] };
    await model.update(changed);
    for (const event of oldLeft) expect(event).toHaveBeenCalledTimes(1);
    for (const event of activeRight) expect(event).not.toHaveBeenCalled();
    const activeLeft = watch(left);
    // Re-rendering an unchanged selection must retain its live private materials.
    await model.update(changed);
    for (const event of [...activeLeft, ...activeRight]) expect(event).not.toHaveBeenCalled();
    expect(sharedDispose).not.toHaveBeenCalled();
    await model.dispose();
    unmounted = true;
    for (const event of [...oldLeft, ...activeLeft, ...activeRight]) expect(event).toHaveBeenCalledTimes(1);
    expect(sharedDispose).not.toHaveBeenCalled();
  } finally {
    if (!unmounted) await model.dispose();
    for (const remove of removeObservations) remove();
    for (const resource of sharedResources) resource.removeEventListener("dispose", sharedDispose);
  }
});

test.each(ASSETS)("imported $name keeps every authored material despite a catalog selection", async ({ name, ids }) => {
  const path = `https://assets.example.test/imported-${name}.glb`;
  parsed.set(path, originals.get(assetPath(name))!);
  useGLTF.clear(plannerAssetUrl(path));
  const scene = withMaterial(createReviewScene(ids[0]).scene, { main: getFurnitureCatalogItem(ids[0])!.materials[1].id });
  const manifest = PLANNER_ASSET_MANIFEST.assets.find((asset) => asset.path === assetPath(name))!;
  const asset: PlannerAssetRecord = {
    assetId: `imported-${name}`, name, category: "Schlafen", mediaType: "model/gltf-binary",
    byteLength: manifest.byteLength, sha256: manifest.sha256,
    normalizedSize: { width: 2, height: 0.5, depth: 4 }, meterScale: 0.25, floorOffset: 0.07, pivot: "center",
    materialId: "object-neutral", license: "MIT", source: "Verified original GLB fixture", confidence: "confirmed",
    notes: [], createdAt: "2026-11-15T00:00:00.000Z", assetUrl: path,
  };
  scene.placements = [{ ...scene.placements[0], asset, assetTransform: {
    normalizedSize: asset.normalizedSize, meterScale: asset.meterScale!, floorOffset: asset.floorOffset!, pivot: "center",
  } }];
  const model = await renderedFurniture(scene, new Set(["https://assets.example.test"]));
  try {
    expectRoles(model.scene, name, [], "unused");
    const sourceSize = vertexBounds(originals.get(assetPath(name))!.scene).getSize(new Vector3());
    const actualSize = vertexBounds(model.scene).getSize(new Vector3());
    const [width, height, depth] = scene.placements[0].size;
    expect(actualSize.x).toBeCloseTo(sourceSize.x * width / 2 * 0.25, 6);
    expect(actualSize.y).toBeCloseTo(sourceSize.y * height / 0.5 * 0.25, 6);
    expect(actualSize.z).toBeCloseTo(sourceSize.z * depth / 4 * 0.25, 6);
  } finally { await model.dispose(); }
});

test.each(ASSETS)("$name roles use GLTF associations even when scene traversal order is reversed", async ({ name, ids, selected }) => {
  const path = assetPath(name);
  const original = originals.get(path)!;
  const reordered = original.scene.clone(true);
  reordered.traverse((object) => object.children.reverse());
  parsed.set(path, { ...original, scene: reordered });
  useGLTF.clear(plannerAssetUrl(path));
  const model = await renderedFurniture(createReviewScene(ids[0]).scene);
  try {
    expectRoles(model.scene, name, selected, getFurnitureCatalogItem(ids[0])!.materials[0].id);
  } finally {
    await model.dispose();
    parsed.set(path, original);
    useGLTF.clear(plannerAssetUrl(path));
  }
});

test("a missing source-material association preserves authored material instead of guessing", async () => {
  const path = assetPath("table");
  const original = originals.get(path)!;
  const associations = new Map(original.parser.associations);
  for (const [object, reference] of associations) if (reference.materials === 0) associations.delete(object);
  const parser = Object.assign(Object.create(Object.getPrototypeOf(original.parser)), original.parser, { associations });
  parsed.set(path, { ...original, parser });
  useGLTF.clear(plannerAssetUrl(path));
  const model = await renderedFurniture(createReviewScene("dining-table").scene);
  try {
    expectRoles(model.scene, "table", [], "unused");
  } finally {
    await model.dispose();
    parsed.set(path, original);
    useGLTF.clear(plannerAssetUrl(path));
  }
});

test("all source scenes, attributes, indices and shared planner materials remain unchanged", () => {
  for (const [path, expected] of sourceSnapshots) expect(sourceSnapshot(originals.get(path)!.scene), path).toEqual(expected);
  for (const [id, expected] of plannerSnapshots) expect(materialFingerprint(getPlannerMaterial(id)), id).toBe(expected);
  // The original GLB has two linear-lightness groups; this is source evidence,
  // not a hand-picked tint for the replacement material.
  const sofaMaterials = meshes(originals.get(assetPath("sofa"))!.scene).map((mesh) => mesh.material as MeshStandardMaterial);
  const luminance = (material: MeshStandardMaterial) => material.color.r * 0.2126 + material.color.g * 0.7152 + material.color.b * 0.0722;
  expect(luminance(sofaMaterials[1]) / luminance(sofaMaterials[0])).toBeCloseTo(0.7197855210026475, 12);
});
