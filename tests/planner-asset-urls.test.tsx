import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import React, { act, Suspense, type ReactNode } from "react";
import { useEnvironment, useGLTF } from "@react-three/drei";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { AmbientLight, DataTexture, DataUtils, DirectionalLight, ExtrudeGeometry, FileLoader, Group, HemisphereLight, ImageLoader, Mesh, PointLight, type WebGLRenderer } from "three";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

import { PLANNER_ASSET_MANIFEST } from "../app/planner/catalog/asset-manifest.ts";
import type { PlannerAssetRecord } from "../app/planner/domain/types.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { PlannerLighting } from "../app/planner/scene-3d/lighting.tsx";
import { getPlannerMaterial, PLANNER_TEXTURE_READY_EVENT } from "../app/planner/scene-3d/materials.ts";
import { qualitySettings } from "../app/planner/scene-3d/quality.ts";

extend({ Group, Mesh, ExtrudeGeometry, AmbientLight, HemisphereLight, DirectionalLight, PointLight });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bytesByPath = new Map<string, ArrayBuffer>();
const expectedUrls = new Map<string, string>();
const fileRequests: string[] = [];
const imageRequests: string[] = [];
const remotePath = "https://assets.example.test/imported-bed.glb?token=kept";
const environmentPath = "/planner-assets/environment/studio-soft.hdr";
const colorblockPath = "/planner-assets/textures/fabric/temu-easy-line-colorblock-rug.svg";
const weavePath = "/planner-assets/textures/fabric/weave.svg";
const CASES = [
  ["bed-120", "bed", 5], ["chair-dining", "chair", 6], ["plant-medium", "plant", 6],
  ["sofa-3seat", "sofa", 6], ["wardrobe-200", "storage", 8], ["dining-table", "table", 5],
] as const;

beforeAll(async () => {
  for (const path of [...PLANNER_ASSET_MANIFEST.assets.map((asset) => asset.path), colorblockPath]) {
    const bytes = await readFile(resolve(process.cwd(), "public", path.slice(1)));
    bytesByPath.set(path, Uint8Array.from(bytes).buffer);
    expectedUrls.set(path, `${path}?v=${createHash("sha256").update(bytes).digest("hex")}`);
  }
  bytesByPath.set(remotePath, bytesByPath.get("/planner-assets/models/bed.glb")!);
  // Exercise real GLTF/RGBE decoders and drei caches. Only the final transport
  // resolves request query strings back to local fixture filenames.
  vi.spyOn(FileLoader.prototype, "load").mockImplementation((url, onLoad, _progress, onError) => {
    const request = String(url);
    fileRequests.push(request);
    const source = request.startsWith("/planner-assets/") ? new URL(request, "https://test.invalid").pathname : request;
    const bytes = bytesByPath.get(source);
    queueMicrotask(() => {
      if (bytes) onLoad?.(bytes);
      else onError?.(new Error(`Missing local transport fixture: ${request}`));
    });
    return undefined;
  });
  vi.spyOn(ImageLoader.prototype, "load").mockImplementation((url, onLoad) => {
    imageRequests.push(String(url));
    const image = document.createElement("img");
    queueMicrotask(() => onLoad?.(image));
    return image;
  });
});

afterAll(() => {
  for (const path of fileRequests) {
    if (path.includes(".glb")) useGLTF.clear(path);
    if (path.includes(".hdr")) useEnvironment.clear({ files: path });
  }
  vi.restoreAllMocks();
});

async function rendered(content: ReactNode) {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => { state = root.render(<Suspense fallback={null}>{content}</Suspense>).getState(); });
  return { scene: state!.scene, async dispose() { await act(async () => root.unmount()); } };
}

test.each(CASES)("%s passes the current %s content hash through the real GLTF loader and cache", async (catalogId, name, meshCount) => {
  const path = `/planner-assets/models/${name}.glb`;
  const scene = createReviewScene(catalogId).scene;
  const first = await rendered(<Furniture3D scene={scene} selectionId={null} onSelect={() => {}} />);
  try {
    const meshes: Mesh[] = [];
    first.scene.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
    expect(meshes).toHaveLength(meshCount);
    expect(fileRequests.filter((url) => url.startsWith(path))).toEqual([expectedUrls.get(path)]);
  } finally { await first.dispose(); }
  const second = await rendered(<Furniture3D scene={scene} selectionId={null} onSelect={() => {}} />);
  try {
    expect(fileRequests.filter((url) => url.startsWith(path))).toEqual([expectedUrls.get(path)]);
  } finally { await second.dispose(); }
});

test("the versioned HDR URL still selects RGBELoader and supplies the actual scene environment", async () => {
  const scene = createReviewScene("bed-120").scene;
  const model = await rendered(<PlannerLighting quality={qualitySettings("low")} scene={scene} />);
  try {
    expect(fileRequests.filter((url) => url.startsWith(environmentPath))).toEqual([expectedUrls.get(environmentPath)]);
    expect(model.scene.environment).toBeInstanceOf(DataTexture);
    const environment = model.scene.environment as DataTexture;
    expect(environment.image.width).toBe(4);
    expect(environment.image.height).toBe(2);
    const pixels = environment.image.data;
    if (!pixels) throw new Error("RGBELoader must supply decoded environment pixels");
    expect(pixels).toHaveLength(32);
    for (const half of pixels) {
      const value = DataUtils.fromHalfFloat(half);
      expect(Number.isFinite(value) && value > 0 && value < 2).toBe(true);
    }
  } finally { await model.dispose(); }
});

test("the corrected colorblock SVG reaches ImageLoader with its hash while texture identity and repeat stay stable", async () => {
  const ready: string[] = [];
  const receive = (event: Event) => ready.push((event as CustomEvent<string>).detail);
  window.addEventListener(PLANNER_TEXTURE_READY_EVENT, receive);
  try {
    const material = getPlannerMaterial("rug-temu-easy-line-colorblock");
    await Promise.resolve();
    expect(imageRequests.filter((url) => url.startsWith(colorblockPath))).toEqual([expectedUrls.get(colorblockPath)]);
    expect(getPlannerMaterial("rug-temu-easy-line-colorblock").map).toBe(material.map);
    expect(material.map!.name).toBe("planner-texture-temu-easy-line-colorblock-rug.svg");
    expect(material.map!.repeat.toArray()).toEqual([1, 1]);
    expect(ready).toContain(colorblockPath);
  } finally { window.removeEventListener(PLANNER_TEXTURE_READY_EVENT, receive); }
});

test("manifest textures share one versioned request across different material recipes", () => {
  const sand = getPlannerMaterial("fabric-sand");
  const sage = getPlannerMaterial("fabric-sage");
  expect(sand.map).toBe(sage.map);
  expect(imageRequests.filter((url) => url.startsWith(weavePath))).toEqual([expectedUrls.get(weavePath)]);
  expect(sand.map!.repeat.toArray()).toEqual([2.4, 2.4]);
});

test("imported GLBs retain their exact approved URL including its existing query", async () => {
  const scene = createReviewScene("bed-120").scene;
  const asset: PlannerAssetRecord = {
    assetId: "import-url-check", name: "Imported bed", category: "Schlafen", mediaType: "model/gltf-binary",
    byteLength: 287200, sha256: "44818d8d0447e5ff9ff9b9f2d16fe7f296768c339bd2a1196d78d34fc92ecc1a",
    normalizedSize: { width: 2, height: 0.5, depth: 4 }, meterScale: 0.25, floorOffset: 0.07, pivot: "center",
    materialId: "object-neutral", license: "MIT", source: "Local GLB test fixture", confidence: "confirmed",
    notes: [], createdAt: "2026-11-15T00:00:00.000Z", assetUrl: remotePath,
  };
  scene.placements = [{
    ...scene.placements[0], catalogId: asset.assetId, asset,
    assetTransform: { normalizedSize: asset.normalizedSize, meterScale: asset.meterScale!, floorOffset: asset.floorOffset!, pivot: "center" },
  }];
  const model = await rendered(<Furniture3D scene={scene} selectionId={null} onSelect={() => {}} assetOrigins={new Set(["https://assets.example.test"])} />);
  try { expect(fileRequests.filter((url) => url.startsWith("https://assets.example.test/"))).toEqual([remotePath]); }
  finally { await model.dispose(); }
});
