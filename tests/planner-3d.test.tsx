import assert from "node:assert/strict";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { DataTexture, NoColorSpace, PerspectiveCamera, SRGBColorSpace, Texture, TextureLoader } from "three";
import { describe, expect, test, vi } from "vitest";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ frameloop, dpr, shadows }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="r3f-canvas" data-frameloop={String(frameloop)} data-dpr={JSON.stringify(dpr)} data-shadows={String(shadows)}>
      <canvas />
    </div>
  ),
  useFrame: vi.fn(),
  useThree: () => ({
    camera: new PerspectiveCamera(),
    gl: { domElement: document.createElement("canvas") },
    invalidate: vi.fn(),
  }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: (props: { enableRotate?: boolean; enablePan?: boolean; enableZoom?: boolean }) => (
    <div
      data-testid="mock-orbit-controls"
      data-enable-rotate={String(props.enableRotate)}
      data-enable-pan={String(props.enablePan)}
      data-enable-zoom={String(props.enableZoom)}
    />
  ),
  PointerLockControls: (props: { domElement?: HTMLElement }) => (
    <div data-testid="mock-pointer-lock-controls" data-has-dom-element={String(Boolean(props.domElement))} />
  ),
}));

vi.mock("../app/planner/scene-3d/architecture.tsx", () => ({
  PlannerArchitecture: () => <div data-testid="mock-3d-architecture" />,
}));

vi.mock("../app/planner/scene-3d/lighting.tsx", () => ({
  PlannerLighting: () => <div data-testid="mock-3d-lighting" />,
}));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { doorPose } from "../app/planner/domain/geometry.ts";
import {
  attachTouchLookControls,
  clampTouchPitch,
  CameraController,
  createOrbitPose,
  orbitFovForRoom,
  rotateWalkCameraForTouch,
  TOUCH_PITCH_LIMIT,
} from "../app/planner/scene-3d/camera-controller.tsx";
import { Planner3D } from "../app/planner/scene-3d/planner-3d.tsx";
import { getPlannerMaterial, PLANNER_TEXTURE_READY_EVENT } from "../app/planner/scene-3d/materials.ts";
import { qualitySettings, detectThreeSupport } from "../app/planner/scene-3d/quality.ts";
import { createSceneModel, furnitureRenderTransform, furnitureWorldPosition } from "../app/planner/scene-3d/scene-model.ts";
import * as sceneModelModule from "../app/planner/scene-3d/scene-model.ts";

describe("createSceneModel", () => {
  test("binds pointer lock to the rendered canvas", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);

    render(
      <CameraController
        document={DEFAULT_APARTMENT_DOCUMENT}
        scene={scene}
        mode="walk"
        activeRoomId="wohnkueche"
        reducedMotion={false}
      />,
    );

    expect(screen.getByTestId("mock-pointer-lock-controls").getAttribute("data-has-dom-element")).toBe("true");
  });

  test("uses touch pointer capture for first-person look and releases cancelled gestures", () => {
    const canvas = document.createElement("canvas");
    const setPointerCapture = vi.fn();
    const hasPointerCapture = vi.fn(() => true);
    const releasePointerCapture = vi.fn();
    Object.defineProperties(canvas, {
      setPointerCapture: { value: setPointerCapture },
      hasPointerCapture: { value: hasPointerCapture },
      releasePointerCapture: { value: releasePointerCapture },
    });
    const camera = new PerspectiveCamera();
    const invalidate = vi.fn();
    const cleanup = attachTouchLookControls(canvas, camera, invalidate);
    const pointer = (type: string, pointerType: string, pointerId: number, clientX: number, clientY: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        pointerType: { value: pointerType },
        pointerId: { value: pointerId },
        clientX: { value: clientX },
        clientY: { value: clientY },
      });
      return event;
    };

    canvas.dispatchEvent(pointer("pointerdown", "touch", 7, 100, 100));
    canvas.dispatchEvent(pointer("pointermove", "mouse", 7, 200, 200));
    expect(invalidate).not.toHaveBeenCalled();
    canvas.dispatchEvent(pointer("pointermove", "touch", 7, 180, 40));
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(invalidate).toHaveBeenCalledOnce();
    expect(camera.rotation.y).toBeCloseTo(-0.32);
    expect(camera.rotation.x).toBeCloseTo(0.24);
    expect(camera.rotation.x).toBeLessThanOrEqual(TOUCH_PITCH_LIMIT);

    canvas.dispatchEvent(pointer("pointercancel", "touch", 7, 180, 40));
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    canvas.dispatchEvent(pointer("pointermove", "touch", 7, 200, 20));
    expect(invalidate).toHaveBeenCalledOnce();
    canvas.dispatchEvent(pointer("pointerdown", "touch", 8, 20, 20));
    canvas.dispatchEvent(pointer("lostpointercapture", "touch", 8, 20, 20));
    expect(releasePointerCapture).toHaveBeenCalledWith(8);
    cleanup();
  });

  test("clamps touch pitch in both directions", () => {
    const canvas = document.createElement("canvas");
    const camera = new PerspectiveCamera();
    const cleanup = attachTouchLookControls(canvas, camera, vi.fn());
    const pointer = (type: string, pointerId: number, clientY: number) => {
      const event = new Event(type, { cancelable: true });
      Object.defineProperties(event, {
        pointerType: { value: "touch" },
        pointerId: { value: pointerId },
        clientX: { value: 0 },
        clientY: { value: clientY },
      });
      return event;
    };

    canvas.dispatchEvent(pointer("pointerdown", 1, 0));
    canvas.dispatchEvent(pointer("pointermove", 1, -10000));
    expect(camera.rotation.x).toBeCloseTo(TOUCH_PITCH_LIMIT);
    canvas.dispatchEvent(pointer("pointerup", 1, -10000));
    canvas.dispatchEvent(pointer("pointerdown", 2, 0));
    canvas.dispatchEvent(pointer("pointermove", 2, 10000));
    expect(camera.rotation.x).toBeCloseTo(-TOUCH_PITCH_LIMIT);
    cleanup();
  });

  test("keeps the touch camera helper in YXZ order with bounded pitch", () => {
    expect(clampTouchPitch(TOUCH_PITCH_LIMIT * 2)).toBe(TOUCH_PITCH_LIMIT);
    expect(clampTouchPitch(-TOUCH_PITCH_LIMIT * 2)).toBe(-TOUCH_PITCH_LIMIT);
    const camera = new PerspectiveCamera();
    rotateWalkCameraForTouch(camera, 50, -25);
    expect(camera.rotation.order).toBe("YXZ");
    expect(camera.rotation.y).toBeCloseTo(-0.2);
    expect(camera.rotation.x).toBeCloseTo(0.1);
    expect(camera.rotation.x).toBeGreaterThanOrEqual(-TOUCH_PITCH_LIMIT);
    expect(camera.rotation.x).toBeLessThanOrEqual(TOUCH_PITCH_LIMIT);
  });

  test("allows direct mouse rotation in the overview", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);

    render(
      <CameraController
        document={DEFAULT_APARTMENT_DOCUMENT}
        scene={scene}
        mode="orbit"
        activeRoomId={null}
        reducedMotion={false}
      />,
    );

    const controls = screen.getByTestId("mock-orbit-controls");
    expect(controls.getAttribute("data-enable-rotate")).toBe("true");
    expect(controls.getAttribute("data-enable-pan")).toBe("false");
    expect(controls.getAttribute("data-enable-zoom")).toBe("false");
  });

  test("uses deterministic data textures for light bathroom tiles", () => {
    const square = getPlannerMaterial("tile-white-square");
    const rectangular = getPlannerMaterial("tile-white-rect");
    const taupe = getPlannerMaterial("porcelain-light-taupe");

    expect(square.map).toBeInstanceOf(DataTexture);
    expect(rectangular.map).toBeInstanceOf(DataTexture);
    expect(taupe.map).toBeInstanceOf(DataTexture);
    expect(square.color.getHexString()).toBe("efeeea");
  });
  test("keeps generated outdoor surfaces in sRGB with linear bump relief", () => {
    const concrete = getPlannerMaterial("outdoor-concrete");
    const balcony = getPlannerMaterial("balcony-floor-beige");

    expect(concrete.map).toBeInstanceOf(DataTexture);
    expect(concrete.bumpMap).toBeInstanceOf(Texture);
    expect(concrete.map?.colorSpace).toBe(SRGBColorSpace);
    expect(concrete.bumpMap?.colorSpace).toBe(NoColorSpace);
    expect(concrete.bumpScale).toBeCloseTo(0.012);

    expect(balcony.map).toBeInstanceOf(DataTexture);
    expect(balcony.bumpMap).toBeInstanceOf(Texture);
    expect(balcony.map?.colorSpace).toBe(SRGBColorSpace);
    expect(balcony.bumpMap?.colorSpace).toBe(NoColorSpace);
    expect(balcony.bumpScale).toBeCloseTo(0.01);
  });

  test("redraws demand-rendered 3D after a newly selected rug texture finishes loading", async () => {
    const texture = new Texture(document.createElement("img"));
    const load = vi.spyOn(TextureLoader.prototype, "load").mockImplementation((_url, onLoad) => {
      queueMicrotask(() => onLoad?.(texture));
      return texture;
    });
    const ready = new Promise<Event>((resolve) => {
      window.addEventListener(PLANNER_TEXTURE_READY_EVENT, resolve, { once: true });
    });

    const material = getPlannerMaterial("rug-hall-overlap-taupe");
    await ready;

    expect(material.map).toBe(texture);
    expect(load).toHaveBeenCalledOnce();
    load.mockRestore();
  });
  test("keeps the WC door in a WC-only 3D scene", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wc");
    expect(scene.doors.some((door) => door.id === "hall-wc-door")).toBe(true);
  });
  test("does not render adjacent parallel wall faces in a room-only 3D scene", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "vorraum");

    expect(scene.walls.every((wall) => wall.roomIds.includes("vorraum"))).toBe(true);
    expect(scene.walls.map((wall) => wall.id)).not.toContain("wall-wohnkueche-12-1");
    expect(scene.walls.map((wall) => wall.id)).not.toContain("wall-abstellraum-3-1");
    expect(scene.walls.map((wall) => wall.id)).not.toContain("wall-wc-3-1");
  });
  test("does not leak endpoint-touching Zimmer 2 geometry into the Loggia scene", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "balkon");

    expect(scene.doors.some((door) => door.id === "living-zimmer2-door")).toBe(false);
    expect(scene.walls.some((wall) => wall.id === "wall-wohnkueche-11-1")).toBe(false);
    expect(scene.doors.some((door) => door.id === "living-loggia-door")).toBe(true);
  });
  test("keeps different finishes on the two sides of a shared wall", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    const shared = scene.walls.find((wall) => wall.roomIds.includes("vorraum") && wall.roomIds.includes("bad"));

    expect(shared?.sideMaterialIds.toSorted()).toEqual(["paint-warm-white", "tile-white-square"]);
  });
  test("marks the wall-hung WC for a dedicated sanitary 3D model", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wc");
    const wc = scene.builtIns.find((item) => item.catalogId === "sanitary-wall-wc");

    expect(wc?.renderProfile).toBe("wall-wc");
  });
  test("derives floors and unique wall sources for all eight selectable areas", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    assert.equal(scene.floors.length, 8);
    assert.equal(scene.walls.length, DEFAULT_APARTMENT_DOCUMENT.walls.length);
    assert.equal(new Set(scene.walls.map((wall) => wall.id)).size, scene.walls.length);
    assert.ok(scene.walls.some((wall) => Math.abs(wall.angle) > 0.01 && Math.abs(wall.angle - Math.PI / 2) > 0.01));
  });

  test("cuts openings into wall segments and keeps current door states", () => {
    const document = {
      ...DEFAULT_APARTMENT_DOCUMENT,
      doorStates: { ...DEFAULT_APARTMENT_DOCUMENT.doorStates, "zimmer1-door": "open" as const },
    };
    const scene = createSceneModel(document, "zimmer1");
    const wallWithWindow = scene.walls.find((wall) => wall.openingIds.includes("zimmer1-window"));
    assert.ok(wallWithWindow);
    assert.ok(wallWithWindow.segments.length >= 3);
    assert.equal(scene.doors.find((door) => door.id === "zimmer1-door")?.state, "open");
    assert.equal(scene.floors.length, 1);
  });

  test("cuts current apartment doors across every atomic collinear wall segment", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    for (const openingId of ["zimmer1-door", "zimmer2-balcony-door"]) {
      const supportingWalls = scene.walls.filter((wall) => wall.openingIds.includes(openingId));
      const source = DEFAULT_APARTMENT_DOCUMENT.openings.find((opening) => opening.id === openingId)!;
      assert.ok(supportingWalls.length >= 1, `${openingId} should cut a supporting atomic wall`);
      if (openingId === "zimmer1-door") {
        assert.ok(supportingWalls.some((wall) => wall.id !== source.wallId), `${openingId} should continue beyond its anchor wall`);
      }
      const openWidth = supportingWalls.reduce((sum, wall) => sum + wall.length - wall.segments
        .filter((segment) => Math.abs(segment.size[1] - wall.height) <= 0.001)
        .reduce((wallSum, segment) => wallSum + segment.size[0], 0), 0);
      assert.ok(openWidth >= source.width - 0.001, `${openingId} remains blocked across atomic walls`);
    }
  });

  test("renders only the photographed hall-to-living door as clear glass", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);

    expect(scene.doors.find((door) => door.id === "hall-living-door")?.visualStyle).toBe("glass-clear");
    expect(scene.doors.find((door) => door.id === "zimmer1-door")?.visualStyle).toBe("solid-white");
  });

  test("assigns the photographed hall door details to the correct leaves", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "vorraum");

    expect(scene.doors.every((door) => door.handleSides === "both")).toBe(true);
    expect(scene.doors.find((door) => door.id === "apartment-entry-door")?.detailProfile).toBe("entry-security");
    expect(scene.doors.find((door) => door.id === "hall-wc-door")?.detailProfile).toBe("vented");
    expect(scene.doors.find((door) => door.id === "hall-bath-door")?.detailProfile).toBe("standard");
    expect(scene.fixtures.find((fixture) => fixture.id === "fixture-hall-panel")?.detailProfile).toBe("hall-distribution");
    expect(scene.fixtures.find((fixture) => fixture.id === "fixture-hall-floor-heating-panel")?.detailProfile).toBe("hall-revision");
    expect(scene.fixtures.find((fixture) => fixture.id === "fixture-hall-panel")?.mountingDepth).toBeLessThanOrEqual(0.006);
    expect(scene.fixtures.find((fixture) => fixture.id === "fixture-hall-floor-heating-panel")?.mountingDepth).toBeLessThanOrEqual(0.006);
    expect(scene.fixtures.find((fixture) => fixture.id === "fixture-hall-panel")?.surfaceOffset).toBeGreaterThanOrEqual(0.03);
    expect(scene.fixtures.find((fixture) => fixture.id === "fixture-hall-floor-heating-panel")?.surfaceOffset).toBeGreaterThanOrEqual(0.03);
    expect(scene.doors.every((door) => door.leafOutlineSides === "both")).toBe(true);
  });

  test("frames the compact hall overview tightly enough to fill the viewport", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "vorraum");
    const pose = createOrbitPose(scene, "vorraum");

    expect(pose.position[1]).toBeGreaterThanOrEqual(3.15);
    expect(pose.position[1]).toBeGreaterThan(scene.doors[0]!.height * 1.4);
    expect(Math.hypot(pose.position[0] - pose.target[0], pose.position[2] - pose.target[2]))
      .toBeLessThan(scene.bounds.maxX - scene.bounds.minX + 2.4);
    expect(orbitFovForRoom("vorraum")).toBeGreaterThan(orbitFovForRoom("wohnkueche"));
  });

  test("shows the hall bathroom door fully open with its 90 degree swing", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "vorraum");
    const door = scene.doors.find((candidate) => candidate.id === "hall-bath-door");

    expect(DEFAULT_APARTMENT_DOCUMENT.doorStates["hall-bath-door"]).toBe("open");
    expect(door?.state).toBe("open");
    const fullDelta = (door?.openAngle ?? 0) - (door?.baseAngle ?? 0);
    expect(Math.abs(Math.atan2(Math.sin(fullDelta), Math.cos(fullDelta)))).toBeCloseTo(Math.PI / 2, 5);
    const displayDelta = (door?.displayOpenAngle ?? 0) - (door?.baseAngle ?? 0);
    expect(Math.abs(Math.atan2(Math.sin(displayDelta), Math.cos(displayDelta)))).toBeCloseTo(Math.PI / 2, 5);
  });

  test("keeps the photographed clock wall visible through the hall glass door", () => {
    const hall = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "vorraum");
    const visibleIds = new Set(hall.builtIns.map((item) => item.source.id));

    expect(visibleIds.has("builtin-living-slats")).toBe(true);
    expect(visibleIds.has("builtin-living-moss")).toBe(true);
    expect(visibleIds.has("builtin-living-clock")).toBe(true);
  });

  test("switches the dollhouse cutaway to the camera side and removes tall foreground blockers", () => {
    const derivePerspectiveCutaway = (sceneModelModule as unknown as {
      derivePerspectiveCutaway?: (
        scene: ReturnType<typeof createSceneModel>,
        camera: { x: number; z: number },
      ) => { hiddenWallIds: string[]; hiddenOpeningIds: string[]; hiddenObjectIds: string[] };
    }).derivePerspectiveCutaway;

    expect(derivePerspectiveCutaway).toBeTypeOf("function");
    if (!derivePerspectiveCutaway) return;

    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "zimmer1");
    const [centerX, , centerZ] = scene.center;
    const fromSouth = derivePerspectiveCutaway(scene, { x: centerX, z: centerZ + 6 });
    const fromNorth = derivePerspectiveCutaway(scene, { x: centerX, z: centerZ - 6 });

    expect(fromSouth.hiddenWallIds).toContain("wall-zimmer1-3-1");
    expect(fromSouth.hiddenWallIds).not.toContain("wall-zimmer1-1-1");
    expect(fromSouth.hiddenOpeningIds).toContain("zimmer1-door");
    expect(fromSouth.hiddenObjectIds).toContain("zimmer1-wardrobe");

    expect(fromNorth.hiddenWallIds).toContain("wall-zimmer1-1-1");
    expect(fromNorth.hiddenWallIds).not.toContain("wall-zimmer1-3-1");
    expect(fromNorth.hiddenObjectIds).not.toContain("zimmer1-wardrobe");
  });

  test("keeps an opened door leaf visible when its wall is cut away", () => {
    const document = {
      ...DEFAULT_APARTMENT_DOCUMENT,
      doorStates: { ...DEFAULT_APARTMENT_DOCUMENT.doorStates, "hall-living-door": "open" as const },
    };
    const scene = createSceneModel(document, "vorraum");
    const [centerX, , centerZ] = scene.center;
    const cutaway = sceneModelModule.derivePerspectiveCutaway(scene, { x: centerX + 6, z: centerZ });

    expect(cutaway.hiddenWallIds).toContain("wall-vorraum-2-1");
    expect(cutaway.hiddenOpeningIds).not.toContain("hall-living-door");
  });

  test("hides a foreground open door but keeps the hall wardrobe visible", () => {
    const document = {
      ...DEFAULT_APARTMENT_DOCUMENT,
      doorStates: { ...DEFAULT_APARTMENT_DOCUMENT.doorStates, "hall-bath-door": "open" as const },
    };
    const scene = createSceneModel(document, "vorraum");
    const [centerX, , centerZ] = scene.center;
    const cutaway = sceneModelModule.derivePerspectiveCutaway(scene, {
      x: centerX + 6,
      z: centerZ + 6,
    });

    expect(cutaway.hiddenOpeningIds).toContain("hall-bath-door");
    expect(cutaway.hiddenObjectIds).not.toContain("hall-tejo-wardrobe");
  });

  test("cuts each interior door through every nearby parallel wall face", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    const expectedWallFaces: Record<string, string[]> = {
      "zimmer1-door": ["wall-wohnkueche-3-1", "wall-zimmer1-3-1"],
      "hall-living-door": ["wall-vorraum-2-1", "wall-wohnkueche-12-1"],
      "hall-wc-door": ["wall-vorraum-1-1", "wall-wc-3-1"],
      "hall-store-door": ["wall-vorraum-1-1", "wall-abstellraum-3-1"],
    };

    for (const [openingId, wallIds] of Object.entries(expectedWallFaces)) {
      for (const wallId of wallIds) {
        const wall = scene.walls.find((candidate) => candidate.id === wallId);
        assert.ok(wall, `${wallId} should be present in the complete scene`);
        assert.ok(wall.openingIds.includes(openingId), `${wallId} still blocks ${openingId}`);
      }
    }
  });

  test("omits the removed Zimmer 1 wall pad and retains the moved WC paper holder", () => {
    const zimmer1 = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "zimmer1");
    const wc = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wc");

    expect(zimmer1.builtIns.some((item) => item.catalogId === "zimmer1-wall-panel")).toBe(false);
    expect(wc.builtIns.some((item) => item.catalogId === "wc-paper-holder")).toBe(true);
  });

  test("includes built-ins and movable furniture without a second document model", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    assert.equal(scene.builtIns.length, DEFAULT_APARTMENT_DOCUMENT.builtIns.length);
    assert.equal(scene.placements.length, DEFAULT_APARTMENT_DOCUMENT.placements.length);
    assert.equal(scene.placements[0].source, DEFAULT_APARTMENT_DOCUMENT.placements[0]);
    assert.equal(scene.fixtures.length, DEFAULT_APARTMENT_DOCUMENT.fixtures.length);
  });

  test("carries imported asset metadata into the shared 3D object descriptor", () => {
    const source = DEFAULT_APARTMENT_DOCUMENT.placements[0]!;
    const asset = {
      assetId: "import-shared-aaaaaaaaaaaa",
      name: "Imported chair",
      category: "Sitzen" as const,
      mediaType: "model/gltf-binary" as const,
      byteLength: 4,
      sha256: "a".repeat(64),
      normalizedSize: source.size,
      floorOffset: 0.06,
      pivot: "center" as const,
      materialId: "object-neutral",
      license: "CC0-1.0" as const,
      source: "test",
      confidence: "confirmed" as const,
      notes: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const document = {
      ...DEFAULT_APARTMENT_DOCUMENT,
      assets: [asset],
      placements: [{ ...source, catalogId: asset.assetId }],
    };
    const scene = createSceneModel(document, null);
    expect(scene.placements[0]?.asset).toBe(asset);
    expect(scene.placements[0]?.position[1]).toBeCloseTo(source.size.height / 2);
  });

  test("applies meterScale to real models while placeholders keep the requested footprint", () => {
    const source = DEFAULT_APARTMENT_DOCUMENT.placements[0]!;
    const asset = {
      assetId: "import-transform-aaaaaaaaaaaa",
      name: "Imported chair",
      category: "Sitzen" as const,
      mediaType: "model/gltf-binary" as const,
      byteLength: 4,
      sha256: "a".repeat(64),
      normalizedSize: {
        width: source.size.width * 2,
        depth: source.size.depth * 2,
        height: source.size.height * 2,
      },
      meterScale: 0.01,
      floorOffset: 0.06,
      pivot: "center" as const,
      materialId: "object-neutral",
      license: "CC0-1.0" as const,
      source: "test",
      confidence: "confirmed" as const,
      notes: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const document = {
      ...DEFAULT_APARTMENT_DOCUMENT,
      assets: [asset],
      placements: [{ ...source, catalogId: asset.assetId }],
    };
    const item = createSceneModel(document, null).placements[0]!;

    expect(furnitureRenderTransform(item).scale).toEqual([0.005, 0.005, 0.005]);
    expect(furnitureRenderTransform(item).floorOffset).toBe(0.06);
    expect(furnitureWorldPosition(item)).toEqual([source.position.x, 0.06, source.position.z]);
    expect(furnitureRenderTransform(item, { meterScale: 1, useAssetDimensions: false }).scale)
      .toEqual([item.size[0], item.size[1], item.size[2]]);
  });

  test("uses the same explicit door pose as collision and 2D geometry", () => {
    const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
    for (const sceneDoor of scene.doors) {
      const pose = doorPose(DEFAULT_APARTMENT_DOCUMENT, sceneDoor.id);
      assert.deepEqual(sceneDoor.hinge, pose.hinge);
      assert.ok(Math.abs(Math.cos(sceneDoor.openAngle) * sceneDoor.width + pose.hinge.x - pose.openEnd.x) < 0.002);
      assert.ok(Math.abs(Math.sin(sceneDoor.openAngle) * sceneDoor.width + pose.hinge.z - pose.openEnd.z) < 0.002);
    }
  });
});

describe("3D quality and resilience", () => {
  test("quality tiers change rendering cost only", () => {
    assert.deepEqual(qualitySettings("low"), { dpr: [1, 1.25], shadows: false, shadowMapSize: 512, effects: false });
    assert.equal(qualitySettings("balanced").shadows, true);
    assert.equal(qualitySettings("high").effects, true);
  });

  test("reports missing WebGL2 support without throwing", () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as typeof original;
    expect(detectThreeSupport()).toEqual({ supported: false, webgl2: false, reason: "WebGL 2 ist auf diesem Gerät nicht verfügbar." });
    HTMLCanvasElement.prototype.getContext = original;
  });

  test("uses demand rendering and falls back on context loss", async () => {
    const user = userEvent.setup();
    const onReturn2D = vi.fn();
    const documentBefore = JSON.stringify(DEFAULT_APARTMENT_DOCUMENT);
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        selectionId={null}
        onSelect={vi.fn()}
        onReturn2D={onReturn2D}
        quality="balanced"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );

    expect(screen.getByTestId("r3f-canvas").getAttribute("data-frameloop")).toBe("demand");
    fireEvent(screen.getByTestId("r3f-canvas").querySelector("canvas")!, new Event("webglcontextlost", { cancelable: true }));
    assert.match((await screen.findByRole("alert")).textContent ?? "", /3D-Kontext wurde unterbrochen/);
    await user.click(screen.getByRole("button", { name: "Zu 2D" }));
    expect(onReturn2D).toHaveBeenCalledOnce();
    assert.equal(JSON.stringify(DEFAULT_APARTMENT_DOCUMENT), documentBefore);
  });

  test("offers a user-triggered fullscreen control for the 3D canvas", async () => {
    const user = userEvent.setup();
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        selectionId={null}
        onSelect={vi.fn()}
        onReturn2D={vi.fn()}
        quality="low"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );
    const host = screen.getByTestId("r3f-canvas").parentElement as HTMLDivElement;
    const requestFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(host, "requestFullscreen", { value: requestFullscreen, configurable: true });
    const button = screen.getByRole("button", { name: "3D-Vollbild öffnen" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await user.click(button);
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  test("shows the same stable fallback when WebGL2 is unavailable", async () => {
    const user = userEvent.setup();
    const onReturn2D = vi.fn();
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        selectionId={null}
        onSelect={vi.fn()}
        onReturn2D={onReturn2D}
        quality="low"
        supportOverride={{ supported: false, webgl2: false, reason: "WebGL 2 fehlt." }}
      />,
    );
    assert.match(screen.getByRole("alert").textContent ?? "", /WebGL 2 fehlt/);
    await user.click(screen.getByRole("button", { name: "Zu 2D" }));
    expect(onReturn2D).toHaveBeenCalledOnce();
  });

  test("exposes a visible walk controller without changing planner data", () => {
    const before = JSON.stringify(DEFAULT_APARTMENT_DOCUMENT);
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId="wohnkueche"
        selectionId={DEFAULT_APARTMENT_DOCUMENT.placements[0]?.id ?? null}
        cameraMode="walk"
        onSelect={vi.fn()}
        onReturn2D={vi.fn()}
        quality="low"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );
    assert.ok(screen.getByLabelText("Rundgangsteuerung"));
    assert.ok(screen.getByRole("button", { name: "Vorwärts" }));
    assert.ok(screen.getByRole("button", { name: "Start" }));
    assert.equal(JSON.stringify(DEFAULT_APARTMENT_DOCUMENT), before);
  });

  test("offers visible orbit zoom and reset controls", async () => {
    const user = userEvent.setup();
    const commands: string[] = [];
    const listener = (event: Event) => commands.push((event as CustomEvent<string>).detail);
    window.addEventListener("planner:walk-command", listener);
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId={null}
        selectionId={null}
        cameraMode="orbit"
        onSelect={vi.fn()}
        onReturn2D={vi.fn()}
        quality="low"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "3D vergrößern" }));
    await user.click(screen.getByRole("button", { name: "3D verkleinern" }));
    await user.click(screen.getByRole("button", { name: "3D-Ansicht zurücksetzen" }));
    assert.deepEqual(commands, ["zoom-in", "zoom-out", "reset"]);
    window.removeEventListener("planner:walk-command", listener);
  });

  test("offers the same plus and minus zoom controls while walking", async () => {
    const user = userEvent.setup();
    const commands: string[] = [];
    const listener = (event: Event) => commands.push((event as CustomEvent<string>).detail);
    window.addEventListener("planner:walk-command", listener);
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId="wohnkueche"
        selectionId={null}
        cameraMode="walk"
        onSelect={vi.fn()}
        onReturn2D={vi.fn()}
        quality="low"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "3D vergrößern" }));
    await user.click(screen.getByRole("button", { name: "3D verkleinern" }));
    assert.deepEqual(commands, ["zoom-in", "zoom-out"]);
    assert.match(screen.getByLabelText("Rundgangsteuerung").textContent ?? "", /[+].*Zoomen|Zoomen.*[+]/);
    window.removeEventListener("planner:walk-command", listener);
  });

  test("lets the user temporarily show every wall instead of the automatic perspective cutaway", async () => {
    const user = userEvent.setup();
    render(
      <Planner3D
        document={DEFAULT_APARTMENT_DOCUMENT}
        activeRoomId="zimmer1"
        selectionId={null}
        cameraMode="orbit"
        onSelect={vi.fn()}
        onReturn2D={vi.fn()}
        quality="low"
        supportOverride={{ supported: true, webgl2: true }}
      />,
    );

    const disable = screen.getByRole("button", { name: "Automatischen Wandschnitt ausschalten" });
    expect(disable.getAttribute("aria-pressed")).toBe("true");
    await user.click(disable);
    expect(screen.getByRole("button", { name: "Automatischen Wandschnitt einschalten" }).getAttribute("aria-pressed")).toBe("false");
  });

});
