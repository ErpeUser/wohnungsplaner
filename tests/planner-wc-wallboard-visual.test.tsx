import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { Box3, ExtrudeGeometry, Group, Mesh, Vector3, type WebGLRenderer } from "three";
import { describe, expect, test } from "vitest";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { WC_WALLBOARD_BUILTIN_ID, WC_WALLBOARD_OPTIONS } from "../app/planner/domain/wc-wallboards.ts";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";
import { WcArtisanWallboard, createWcAcaciaBoardGeometry } from "../app/planner/scene-3d/architecture/wc-reference.tsx";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("WC shelf merchant-reference render", () => {
  test("natural acacia bevel is actual sloped 3D geometry inside the measured 90 × 3.5 × 20 cm envelope", () => {
    const geometry = createWcAcaciaBoardGeometry(0.9, 0.035, 0.2);
    try {
      const all = new Box3();
      for (const piece of [geometry.top, geometry.bevel, geometry.front, geometry.ends]) {
        piece.computeBoundingBox();
        all.union(piece.boundingBox!);
      }
      const size = all.getSize(new Vector3());
      expect(size.x).toBeCloseTo(0.9, 6);
      expect(size.y).toBeCloseTo(0.035, 6);
      expect(size.z).toBeCloseTo(0.2, 6);
      expect(geometry.topFront).toHaveLength(5);
      expect(geometry.slopeFront).toHaveLength(5);
      // The top starts 13–20 mm behind the front rim, and the front
      // lies 7–12 mm lower. A flat cuboid would have neither offset.
      for (let i = 0; i < 5; i++) {
        expect(geometry.slopeFront[i][2] - geometry.topFront[i][2]).toBeGreaterThan(0.012);
        expect(geometry.topFront[i][1] - geometry.slopeFront[i][1]).toBeGreaterThan(0.006);
      }
      expect(new Set(geometry.topFront.map((point) => point[2].toFixed(4))).size).toBeGreaterThan(2);
      expect(geometry.bevel.getAttribute("position").count).toBeGreaterThan(0);
      expect(geometry.bevel.getAttribute("normal").count).toBe(16);
    } finally {
      geometry.top.dispose(); geometry.bevel.dispose(); geometry.front.dispose(); geometry.ends.dispose();
    }
  });

  test("separate model identities and assigned materials match each selected source", async () => {
    const canvas = document.createElement("canvas");
    const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
    const root = createRoot(canvas);
    await root.configure({ gl: gpu, frameloop: "never", size: { width: 600, height: 400, top: 0, left: 0 } });
    try {
      for (const option of WC_WALLBOARD_OPTIONS) {
        const document = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, { type: "setWcWallboard", optionId: option.id }).document;
        const item = createSceneModel(document, "wc").builtIns.find((entry) => entry.id === WC_WALLBOARD_BUILTIN_ID)!;
        expect(item.size).toEqual([option.widthCm / 100, option.heightCm / 100, option.depthCm / 100]);
        let renderedState: RootState | undefined;
        await act(async () => { renderedState = root.render(<WcArtisanWallboard item={item} />).getState(); });
        const scene = renderedState!.scene;
        scene.updateMatrixWorld(true);
        if (option.id === "livetastic-90") {
          expect(scene.getObjectByName("wc-acacia-sloped-live-edge")).toBeDefined();
          expect(scene.getObjectByName("wc-acacia-exposed-endgrain")).toBeDefined();
          const material = (scene.getObjectByName("wc-acacia-sloped-live-edge") as Mesh).material;
          expect(material).toBe(getPlannerMaterial(option.edgeMaterialId));
        } else {
          expect(scene.getObjectByName("wc-wallboard-mdf-core")).toBeDefined();
          expect(scene.getObjectByName("wc-acacia-sloped-live-edge")).toBeUndefined();
          const material = (scene.getObjectByName("wc-wallboard-mdf-front") as Mesh).material;
          expect(material).toBe(getPlannerMaterial(option.edgeMaterialId));
        }
        expect(getPlannerMaterial(option.materialId).map).not.toBeNull();
        expect(getPlannerMaterial(option.edgeMaterialId).map).not.toBeNull();
      }
    } finally { await act(async () => root.unmount()); }
  });
});
