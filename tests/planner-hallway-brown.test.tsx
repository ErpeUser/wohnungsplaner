import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { ExtrudeGeometry, Group, Mesh, Raycaster, Scene, Vector3, type Material, type WebGLRenderer } from "three";
import { describe, expect, test } from "vitest";

import { FURNITURE_CATALOG, getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { restoreHallTejoCashmere } from "../app/planner/store/persistence.ts";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const ID = "hallway-brown-mirror-bench-115";

async function renderedBrownHallway() {
  const review = createReviewScene(ID);
  const canvas = document.createElement("canvas");
  const gl = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => {
    state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState();
  });
  state!.scene.updateMatrixWorld(true);
  return { scene: state!.scene, dispose: async () => { await act(async () => root.unmount()); } };
}

function frontMaterial(scene: Scene, x: number, y: number): string {
  const hit = new Raycaster(new Vector3(x, y, 2), new Vector3(0, 0, -1))
    .intersectObjects(scene.children, true)[0];
  expect(hit, "Front surface should exist").toBeDefined();
  return ((hit.object as Mesh).material as Material).name;
}

describe("brown entry wardrobe photo reference", () => {
  test("adds a separate parametric model without altering the verified Tejo", () => {
    const item = getFurnitureCatalogItem(ID)!;
    expect(item.renderMode).toBe("parametric");
    expect(item.defaultSize).toEqual({ width: 1.15, depth: 0.375, height: 2.319 });
    expect(item.realism?.confidence).toBe("estimated");
    expect(item.materials[0].id).toBe("hallway-walnut-brown");
    expect(getFurnitureCatalogItem("hallway-tejo-115")?.realism?.confidence).toBe("verified");
    expect(FURNITURE_CATALOG.filter((entry) => entry.id === ID)).toHaveLength(1);
    const placed = DEFAULT_APARTMENT_DOCUMENT.placements.find((entry) => entry.id === "hall-tejo-wardrobe")!;
    expect(placed.catalogId).toBe("hallway-tejo-115");
    expect(placed.roomId).toBe("vorraum");
    expect(placed.position).toEqual({ x: -1.78, z: 7.93 });
    expect(placed.rotation).toBe(180);
    expect(placed.materialVariants?.main).toBe("tejo-cashmere");
  });

  test("renders the uninterrupted tall mirror, brown surfaces and padded seat", async () => {
    const model = await renderedBrownHallway();
    try {
      expect(frontMaterial(model.scene, -0.36, 1.25)).toBe("planner-material-mirror-glass");
      expect(frontMaterial(model.scene, 0.24, 0.67)).toBe("planner-material-fabric-ecru");
      const names = new Set<string>();
      model.scene.traverse((obj) => {
        if (obj instanceof Mesh) {
          const mat = obj.material;
          for (const value of Array.isArray(mat) ? mat : [mat]) names.add(value.name);
        }
      });
      for (const material of [
        "planner-material-hallway-walnut-brown",
        "planner-material-hallway-brown-groove",
        "planner-material-metal-dark",
        "planner-material-hallway-sand-back",
      ]) expect(names.has(material), material).toBe(true);
    } finally { await model.dispose(); }
  });

  test("restores the cashmere Tejo after the brown photo substitution without changing its layout", () => {
    const old = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    const wardrobe = old.placements.find((entry) => entry.id === "hall-tejo-wardrobe")!;
    wardrobe.catalogId = ID;
    wardrobe.materialVariants = { main: "hallway-walnut-brown" };
    wardrobe.metadata = { ...wardrobe.metadata, notes: ["Fotoreferenz: warmbraune Holzfronten", "My personal note"] };
    wardrobe.position = { x: -1.75, z: 7.88 };
    wardrobe.rotation = 175;
    const updated = restoreHallTejoCashmere(old);
    const actual = updated.placements.find((entry) => entry.id === wardrobe.id)!;
    expect(actual.catalogId).toBe("hallway-tejo-115");
    expect(actual.materialVariants?.main).toBe("tejo-cashmere");
    expect(actual.metadata?.notes).toContain("My personal note");
    expect(actual.metadata?.notes).not.toContain("Fotoreferenz: warmbraune Holzfronten");
    expect(actual.position).toEqual({ x: -1.75, z: 7.88 });
    expect(actual.rotation).toBe(175);
    expect(actual.size).toEqual(wardrobe.size);
    expect(restoreHallTejoCashmere(updated)).toBe(updated);
  });

  test("leaves a correctly selected cashmere Tejo unchanged", () => {
    const current = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    expect(restoreHallTejoCashmere(current)).toBe(current);
  });

  test("does not replace a manually selected alternative wardrobe", () => {
    const custom = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    custom.placements.find((entry) => entry.id === "hall-tejo-wardrobe")!.catalogId = "wardrobe-225";
    expect(restoreHallTejoCashmere(custom)).toBe(custom);
  });
});
