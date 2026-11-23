import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { upgradeZimmer1Chair, createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { SHOPPING_ITEMS } from "../app/planner/workspace/shopping-items.ts";

extend({ Group: THREE.Group, Mesh: THREE.Mesh, ExtrudeGeometry: THREE.ExtrudeGeometry, MeshBasicMaterial: THREE.MeshBasicMaterial });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ID = "chair-aliexpress-xuegw-1005012445521181";

describe("Zimmer-1 AliExpress XUEGW replacement", () => {
  test("has a distinct source-linked, honest estimated-size catalog entry and room placement", () => {
    const item = getFurnitureCatalogItem(ID)!;
    expect(item).toBeDefined();
    expect(item.renderMode).toBe("parametric");
    expect(item.realism?.confidence).toBe("estimated");
    expect(item.sourceUrl).toBe("https://de.aliexpress.com/item/1005012445521181.html");
    expect(item.realism?.sourceLabel).toMatch(/Originalgalerie/);
    expect(item.realism?.construction.join(" ")).toMatch(/Schmetterlings-Lendenkissen/);
    expect(item.defaultSize).toEqual({ width: 0.62, depth: 0.53, height: 0.92 });
    const placed = DEFAULT_APARTMENT_DOCUMENT.placements.find((p) => p.id === "zimmer1-chair")!;
    expect(placed.catalogId).toBe(ID);
    expect(placed.position).toEqual({ x: 2.96, z: 0.92 });
    expect(placed.rotation).toBe(180);
    expect(placed.materialVariants?.main).toBe("fabric-ecru");
    expect(placed.metadata?.confidence).toBe("estimated");
    expect(getFurnitureCatalogItem("chair-temu-executive-ivory")).toBeDefined();
  });

  test("replaces the former Temu shopping row with exactly one AliExpress source link", () => {
    const entries = SHOPPING_ITEMS.filter((p) => p.room === "Zimmer 1" && p.type === "chair");
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("1005012445521181");
    expect(entries[0].retailer).toBe("AliExpress");
    expect(entries[0].url).toBe("https://de.aliexpress.com/item/1005012445521181.html");
    expect(entries[0].quantity).toBe(1);
    expect(entries[0].price).toBeNull();
    expect(entries[0].dimensions).toMatch(/geschätzt/i);
    expect(SHOPPING_ITEMS.some((p) => p.id === "606296522765554")).toBe(false);
  });

  test("migrates existing default chair without losing its coordinates or overwriting another product", () => {
    const legacy = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    const chair = legacy.placements.find((p) => p.id === "zimmer1-chair")!;
    chair.catalogId = "chair-temu-executive-ivory";
    chair.materialVariants = { main: "leather-ivory" };
    chair.size = { width: 0.64, depth: 0.51, height: 1.14 };
    chair.position = { x: 2.90, z: 1.02 };
    chair.rotation = 175;
    const upgraded = upgradeZimmer1Chair(legacy);
    const actual = upgraded.placements.find((p) => p.id === "zimmer1-chair")!;
    expect(actual.catalogId).toBe(ID);
    expect(actual.position).toEqual({ x: 2.90, z: 1.02 });
    expect(actual.rotation).toBe(175);
    expect(actual.size).toEqual({ width: 0.62, depth: 0.53, height: 0.92 });
    expect(upgradeZimmer1Chair(upgraded)).toBe(upgraded);

    const custom = structuredClone(legacy);
    custom.placements.find((p) => p.id === "zimmer1-chair")!.catalogId = "chair-office";
    expect(upgradeZimmer1Chair(custom)).toBe(custom);
  });

  test("upgrades a locally stored previous chair on reload", () => {
    const stale = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    const chair = stale.placements.find((p) => p.id === "zimmer1-chair")!;
    chair.catalogId = "chair-temu-executive-ivory";
    chair.materialVariants = { main: "leather-ivory" };
    chair.size = { width: 0.64, depth: 0.51, height: 1.14 };
    const backing = new Map([[PLANNER_STORAGE_KEY, JSON.stringify(stale)]]);
    const storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => { backing.set(key, value); },
      removeItem: (key: string) => { backing.delete(key); },
    };
    const loaded = createLocalStoragePlannerRepository(storage).load().document;
    expect(loaded.placements.find((p) => p.id === "zimmer1-chair")?.catalogId).toBe(ID);
    assert.equal(stale.placements.find((p) => p.id === "zimmer1-chair")?.catalogId, "chair-temu-executive-ivory");
  });

  test("renders padded seat and back, telescopic column, five rolling feet and handles true metric size", async () => {
    const review = createReviewScene(ID, "fabric-ecru");
    const canvas = document.createElement("canvas");
    const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as THREE.WebGLRenderer;
    const root = createRoot(canvas);
    await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
    let state: RootState | undefined;
    try {
      await act(async () => { state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState(); });
      state!.scene.updateMatrixWorld(true);
      const scene = state!.scene;
      expect(scene.getObjectByName("xuegw-adjustable-desk-chair")).toBeDefined();
      expect(scene.getObjectByName("xuegw-gas-lift")).toBeDefined();
      for (let i = 0; i < 5; i++) expect(scene.getObjectByName("xuegw-caster-" + i)).toBeDefined();
      for (const detail of [
        "xuegw-petal-back",
        "xuegw-back-center-petal",
        "xuegw-butterfly-lumbar",
        "xuegw-pillow-cinch",
        "xuegw-wraparound-arm-left",
        "xuegw-wraparound-arm-right",
        "xuegw-seat-piping",
        "xuegw-height-lever",
      ]) expect(scene.getObjectByName(detail), detail).toBeDefined();
      const ray = (y: number) => new THREE.Raycaster(new THREE.Vector3(0, y, 1), new THREE.Vector3(0, 0, -1))
        .intersectObjects(scene.children, true);
      expect(ray(0.49).length).toBeGreaterThan(0);
      expect(ray(0.72).length).toBeGreaterThan(0);
      const bounds = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
      expect(bounds.x).toBeLessThanOrEqual(0.63);
      expect(bounds.y).toBeGreaterThan(0.7);
      expect(bounds.y).toBeLessThan(0.94);
      expect(bounds.z).toBeLessThanOrEqual(0.54);
    } finally { await act(async () => { root.unmount(); }); }
  });
  test("updates obsolete gallery evidence for an already selected XUEGW without moving it", () => {
    const legacy = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    const chair = legacy.placements.find((p) => p.id === "zimmer1-chair")!;
    chair.metadata = {
      ...chair.metadata!,
      source: "Nutzerlink zu AliExpress · Art. 1005012445521181 · Produktname verfügbar, Galerie und Maßblatt nicht verifiziert",
      notes: ["Geplant als kompakter gepolsterter Drehstuhl mit Rückenlehne", "Eigene Notiz bleibt erhalten"],
    };
    chair.position = { x: 3.04, z: 1.02 };
    const upgraded = upgradeZimmer1Chair(legacy);
    const actual = upgraded.placements.find((p) => p.id === chair.id)!;
    expect(actual.position).toEqual({ x: 3.04, z: 1.02 });
    expect(actual.metadata?.source).toContain("Produktgaleriebilder geprüft");
    expect(actual.metadata?.notes).toContain("Eigene Notiz bleibt erhalten");
    expect(upgradeZimmer1Chair(upgraded)).toBe(upgraded);
  });
});
