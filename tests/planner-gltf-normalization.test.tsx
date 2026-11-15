import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import React, { act } from "react";
import { useGLTF } from "@react-three/drei";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, BufferAttribute, ExtrudeGeometry, Group, Mesh, Vector3, type Object3D, type WebGLRenderer } from "three";
import { GLTFLoader, type GLTF } from "three-stdlib";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { PLANNER_ASSET_MANIFEST } from "../app/planner/catalog/asset-manifest.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import type { PlannerAssetRecord } from "../app/planner/domain/types.ts";
import type { SceneModel } from "../app/planner/scene-3d/scene-model.ts";

const parsed = vi.hoisted(() => new Map<string, GLTF>());
vi.mock("@react-three/drei", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/drei")>();
  const useLocalGLTF = ((path: string) => original.useGLTF(path, false, false, (loader) => {
    // Replace transport on the actual loader instance used by drei. The real
    // hook/cache and the GLTFLoader-parsed original scene are retained.
    loader.load = (url, onLoad, _onProgress, onError) => {
      const gltf = parsed.get(String(url));
      queueMicrotask(() => {
        if (gltf) onLoad(gltf);
        else onError?.(new ErrorEvent("error", { error: new Error(`Missing local test fixture: ${String(url)}`) }));
      });
    };
  })) as typeof original.useGLTF;
  Object.assign(useLocalGLTF, original.useGLTF);
  return { ...original, useGLTF: useLocalGLTF };
});

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CASES = [
  ["bed-120", "bed", 1.2, 0.55, 2],
  ["bed-160", "bed", 1.6, 0.62, 2],
  ["chair-dining", "chair", 0.5, 0.84, 0.55],
  ["chair-office", "chair", 0.62, 1.05, 0.62],
  ["plant-medium", "plant", 0.55, 1.15, 0.55],
  ["sofa-3seat", "sofa", 2.2, 0.82, 0.92],
  ["nightstand", "storage", 0.45, 0.52, 0.4],
  ["wardrobe-200", "storage", 2, 2.2, 0.6],
  ["dresser", "storage", 1.2, 0.82, 0.45],
  ["shelf", "storage", 0.9, 1.9, 0.35],
  ["lowboard", "storage", 1.8, 0.5, 0.42],
  ["desk-standard", "table", 1.3, 0.75, 0.65],
  ["dining-table", "table", 1.6, 0.75, 0.9],
] as const;
const snapshots = new Map<string, ReturnType<typeof sourceSnapshot>>();
const remotePath = "https://assets.example.test/imported-bed.glb";

function assetPath(name: string) {
  return `/planner-assets/models/${name}.glb`;
}

function meshes(object: Object3D) {
  const result: Mesh[] = [];
  object.traverse((child) => { if (child instanceof Mesh) result.push(child); });
  return result;
}

function vertexBounds(object: Object3D) {
  object.updateMatrixWorld(true);
  const bounds = new Box3();
  const vertex = new Vector3();
  for (const mesh of meshes(object)) {
    const position = mesh.geometry.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld);
      bounds.expandByPoint(vertex);
    }
  }
  return bounds;
}

function sourceSnapshot(object: Object3D) {
  object.updateMatrixWorld(true);
  const nodes: unknown[] = [];
  object.traverse((child) => {
    nodes.push({
      position: child.position.toArray(), quaternion: child.quaternion.toArray(), scale: child.scale.toArray(),
      matrix: child.matrix.toArray(), matrixWorld: child.matrixWorld.toArray(),
    });
  });
  return {
    nodes,
    meshes: meshes(object).map((mesh) => ({
      geometry: mesh.geometry.uuid,
      attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]) => {
        const array = (attribute as BufferAttribute).array;
        return [name, createHash("sha256").update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).digest("hex")];
      })),
      materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => material.toJSON()),
    })),
  };
}

beforeAll(async () => {
  for (const asset of PLANNER_ASSET_MANIFEST.assets.filter((entry) => entry.type === "model")) {
    const bytes = await readFile(resolve(process.cwd(), "public", asset.path.slice(1)));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, "");
    parsed.set(asset.path, gltf);
    snapshots.set(asset.path, sourceSnapshot(gltf.scene));
  }
});

afterAll(() => {
  for (const path of parsed.keys()) useGLTF.clear(path);
});

async function renderedFurniture(scene: SceneModel, assetOrigins = new Set<string>()) {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => {
    state = root.render(<Furniture3D scene={scene} selectionId={null} onSelect={() => {}} assetOrigins={assetOrigins} />).getState();
  });
  return { scene: state!.scene, async dispose() { await act(async () => root.unmount()); } };
}

test.each(CASES)("%s renders the real %s GLB at its recorded dimensions and on the floor", async (catalogId, name, width, height, depth) => {
  const original = parsed.get(assetPath(name))!.scene;
  const model = await renderedFurniture(createReviewScene(catalogId).scene);
  try {
    const bounds = vertexBounds(model.scene);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    expect(size.x).toBeCloseTo(width, 6);
    expect(size.y).toBeCloseTo(height, 6);
    expect(size.z).toBeCloseTo(depth, 6);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.z).toBeCloseTo(0, 6);
    // Normalization must retain every source mesh and its exact buffers/materials.
    const renderedMeshes = meshes(model.scene);
    expect(renderedMeshes.map((mesh) => mesh.geometry)).toEqual(meshes(original).map((mesh) => mesh.geometry));
    renderedMeshes.forEach((mesh, index) => {
      const sourceMaterial = meshes(original)[index].material;
      const actual = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const source = Array.isArray(sourceMaterial) ? sourceMaterial : [sourceMaterial];
      expect(actual.map((material) => material.type)).toEqual(source.map((material) => material.type));
    });
  } finally { await model.dispose(); }
});

test("normalizing differently sized instances does not mutate the cached GLB scenes or original buffers", async () => {
  const scene = createReviewScene("bed-120").scene;
  const first = scene.placements[0];
  scene.placements = [
    first,
    { ...first, id: "second-bed", size: [1.6, 0.62, 2], position: [3, 0.31, 0] },
  ];
  const model = await renderedFurniture(scene);
  try {
    for (const [path, expected] of snapshots) expect(sourceSnapshot(parsed.get(path)!.scene), path).toEqual(expected);
    const sourceGeometries = meshes(parsed.get(assetPath("bed"))!.scene).map((mesh) => mesh.geometry);
    for (const geometry of sourceGeometries) expect(meshes(model.scene).filter((mesh) => mesh.geometry === geometry)).toHaveLength(2);
  } finally { await model.dispose(); }
});

test.each([
  [0.25, 0.07, 0.144, 0.209, 0.12375, 0.12225],
  [0.5, 0.11, 0.288, 0.418, 0.2475, 0.2145],
] as const)("imported GLBs retain explicit sizing, the center pivot, meterScale %s and floorOffset %s", async (meterScale, floorOffset, width, height, depth, minimumY) => {
  parsed.set(remotePath, parsed.get(assetPath("bed"))!);
  useGLTF.clear(remotePath);
  const scene = createReviewScene("bed-120").scene;
  const source = scene.placements[0];
  const asset: PlannerAssetRecord = {
    assetId: "import-normalization-check", name: "Imported bed", category: "Schlafen", mediaType: "model/gltf-binary",
    byteLength: 287200, sha256: "44818d8d0447e5ff9ff9b9f2d16fe7f296768c339bd2a1196d78d34fc92ecc1a",
    normalizedSize: { width: 2, height: 0.5, depth: 4 }, meterScale, floorOffset, pivot: "center",
    materialId: "object-neutral", license: "MIT", source: "Original local GLB test fixture", confidence: "confirmed",
    notes: [], createdAt: "2026-11-15T00:00:00.000Z", assetUrl: remotePath,
  };
  scene.placements = [{
    ...source, catalogId: asset.assetId, asset,
    assetTransform: { normalizedSize: asset.normalizedSize, meterScale, floorOffset, pivot: "center" },
  }];
  const model = await renderedFurniture(scene, new Set(["https://assets.example.test"]));
  try {
    const bounds = vertexBounds(model.scene);
    const size = bounds.getSize(new Vector3());
    expect(size.x).toBeCloseTo(width, 6);
    expect(size.y).toBeCloseTo(height, 6);
    expect(size.z).toBeCloseTo(depth, 6);
    expect(bounds.min.y).toBeCloseTo(minimumY, 6);
  } finally { await model.dispose(); }
});

test.each(["empty", "flat", "non-finite"] as const)("a local GLB with %s bounds uses the existing parametric fallback", async (kind) => {
  const path = assetPath("table");
  const original = parsed.get(path)!;
  const invalid = kind === "empty" ? new Group() : original.scene.clone(true);
  if (kind === "flat") invalid.scale.y = 0;
  if (kind === "non-finite") invalid.position.x = Infinity;
  parsed.set(path, { ...original, scene: invalid });
  useGLTF.clear(path);
  // React reports caught boundary errors to the console; assert the actual
  // fallback geometry below rather than asserting that logging occurred.
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const model = await renderedFurniture(createReviewScene("dining-table").scene);
  try {
    const bounds = vertexBounds(model.scene);
    expect(bounds.isEmpty()).toBe(false);
    expect([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)).toBe(true);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(0.5);
    expect(meshes(model.scene).some((mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      .some((material) => material.name.startsWith("planner-material-")))).toBe(true);
  } finally {
    await model.dispose();
    consoleError.mockRestore();
    parsed.set(path, original);
    useGLTF.clear(path);
  }
});
