import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { ExtrudeGeometry, Group, Mesh, Raycaster, Vector3, type Material, type Scene, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { createReviewScene } from "../app/planner/review/review-models.ts";
import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { upgradeZimmer1WardrobeToFly, createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { SHOPPING_ITEMS } from "../app/planner/workspace/shopping-items.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderedWardrobe() {
  const review = createReviewScene("wardrobe-225", "white-matte");
  const canvas = document.createElement("canvas");
  // R3F builds the production meshes, materials and world transforms. Only
  // the GPU boundary is omitted; the assertions intersect real front faces.
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => {
    state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState();
  });
  state!.scene.updateMatrixWorld(true);
  return {
    scene: state!.scene,
    async dispose() { await act(async () => root.unmount()); },
  };
}

function frontMaterial(scene: Scene, x: number, y: number) {
  const surface = new Raycaster(new Vector3(x, y, 2), new Vector3(0, 0, -1))
    .intersectObjects(scene.children, true)[0];
  expect(surface, `front surface at x=${x}, y=${y}`).toBeDefined();
  return ((surface.object as Mesh).material as Material).name;
}

test("wardrobe front centres expose uninterrupted white surfaces and mirror", async () => {
  const model = await renderedWardrobe();
  try {
    for (const [x, material] of [
      [0, "mirror-glass"],
      [-0.9, "white-matte"],
      [-0.45, "white-lacquer"],
      [0.45, "white-lacquer"],
      [0.9, "white-matte"],
    ] as const) {
      expect(frontMaterial(model.scene, x, 1.65)).toBe(`planner-material-${material}`);
    }
  } finally { await model.dispose(); }
});

test("wardrobe drawer faces keep their cashmere finish through the bay centre", async () => {
  const model = await renderedWardrobe();
  try {
    for (const x of [-0.45, 0.45]) {
      for (const y of [0.34, 0.67]) {
        expect(frontMaterial(model.scene, x, y)).toBe("planner-material-vinyl-cashmere-cream");
      }
    }
  } finally { await model.dispose(); }
});

test("wardrobe retains four vertical seams between its five bays", async () => {
  const model = await renderedWardrobe();
  try {
    for (const x of [-0.675, -0.225, 0.225, 0.675]) {
      expect(frontMaterial(model.scene, x, 1.65)).toBe("planner-material-wardrobe-frame-silver");
    }
  } finally { await model.dispose(); }
});

test("MID.YOU FLY dimensions, source and cashmere customization do not add a wardrobe shopping row", () => {
  const item = getFurnitureCatalogItem("wardrobe-225")!;
  expect(item.defaultSize).toEqual({ width: 2.25, height: 2.1, depth: 0.58 });
  expect(item.realism?.confidence).toBe("verified");
  expect(item.sourceUrl).toContain("001787045908");
  const placed = DEFAULT_APARTMENT_DOCUMENT.placements.find((p) => p.id === "zimmer1-wardrobe")!;
  expect(placed.size).toEqual(item.defaultSize);
  expect(placed.position).toEqual({ x: 1.19, z: 2.98 });
  expect(placed.rotation).toBe(180);
  expect(placed.materialVariants?.main).toBe("white-matte");
  expect(placed.metadata?.notes?.join(" ")).toMatch(/vier.*Kaschmir|vier.*kaschmir/i);
  expect(SHOPPING_ITEMS.some((p) => p.url?.includes("001787045908") || /MID.YOU FLY/i.test(p.name))).toBe(false);
  expect(DEFAULT_APARTMENT_DOCUMENT.builtIns.find((p) => p.id === "builtin-z1-wardrobe-top-decor")?.elevation).toBe(2.1);
});

test("five silver bow handles and four cashmere drawer handles surround one tall mirrored door", async () => {
  const model = await renderedWardrobe();
  try {
    const objects: string[] = [];
    model.scene.traverse((object) => { if (object.name) objects.push(object.name); });
    expect(objects).toContain("wardrobe-full-height-center-mirror");
    expect(objects.filter((name) => /^wardrobe-door-bow-handle-[0-9]$/.test(name))).toHaveLength(5);
    expect(objects.filter((name) => /^wardrobe-drawer-bow-handle-[0-9]-[0-9]$/.test(name))).toHaveLength(4);
    expect(objects.filter((name) => /^wardrobe-cashmere-drawer-[0-9]-[0-9]$/.test(name))).toHaveLength(4);
  } finally { await model.dispose(); }
});

test("stored former wardrobe size upgrades without moving a user-positioned wardrobe or any other furniture", () => {
  const legacy = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const old = legacy.placements.find((p) => p.id === "zimmer1-wardrobe")!;
  old.size = { width: 2.25, depth: 0.62, height: 2.2 };
  old.position = { x: 1.31, z: 2.86 };
  old.rotation = 172;
  const decor = legacy.builtIns.find((p) => p.id === "builtin-z1-wardrobe-top-decor")!;
  decor.elevation = 2.2;
  const changed = upgradeZimmer1WardrobeToFly(legacy);
  const current = changed.placements.find((p) => p.id === old.id)!;
  expect(current.size).toEqual({ width: 2.25, depth: 0.58, height: 2.1 });
  expect(current.position).toEqual({ x: 1.31, z: 2.86 });
  expect(current.rotation).toBe(172);
  expect(changed.builtIns.find((p) => p.id === decor.id)?.elevation).toBe(2.1);
  expect(changed.placements.find((p) => p.id === "zimmer1-chair")).toEqual(legacy.placements.find((p) => p.id === "zimmer1-chair"));
  expect(upgradeZimmer1WardrobeToFly(changed)).toBe(changed);

  const backing = new Map([[PLANNER_STORAGE_KEY, JSON.stringify(legacy)]]);
  const storage = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => { backing.set(key, value); },
    removeItem: (key: string) => { backing.delete(key); },
  };
  const loaded = createLocalStoragePlannerRepository(storage).load().document;
  expect(loaded.placements.find((p) => p.id === old.id)?.position).toEqual({ x: 1.31, z: 2.86 });
  expect(loaded.placements.find((p) => p.id === old.id)?.size.depth).toBe(0.58);
  const alternative = structuredClone(legacy);
  alternative.placements.find((p) => p.id === old.id)!.catalogId = "wardrobe-200";
  expect(upgradeZimmer1WardrobeToFly(alternative)).toBe(alternative);
});

test("older default cupboard centre shifts 2 cm to keep the back flush with the wall", () => {
  const legacy = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const placed = legacy.placements.find((p) => p.id === "zimmer1-wardrobe")!;
  placed.size = { width: 2.25, depth: 0.62, height: 2.2 };
  placed.position.z = 2.96;
  const upgraded = upgradeZimmer1WardrobeToFly(legacy);
  expect(upgraded.placements.find((p) => p.id === placed.id)?.position.z).toBe(2.98);
});
