import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, Raycaster, Vector3, type Object3D, type WebGLRenderer } from "three";
import { expect, test } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { createSceneModel, type SceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({
  Group, Mesh, ExtrudeGeometry, MeshBasicMaterial,
  BufferAttribute, BufferGeometry, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderPanels(scene: SceneModel, selectedId: string | null = null) {
  const canvas = document.createElement("canvas");
  // Only the GPU boundary is stubbed; wall, panels, selection and rays use
  // production meshes, transforms and depth-tested materials.
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  await act(async () => {
    state = root.render(<PlannerArchitecture scene={scene} selectionId={selectedId} onSelect={() => {}} />).getState();
  });
  state!.scene.updateMatrixWorld(true);
  return {
    scene: state!.scene,
    async dispose() { await act(async () => root.unmount()); },
  };
}

function wcPanels() {
  const source = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wc");
  return {
    ...source, floors: [], windows: [], doors: [], placements: [], fixtures: [],
    walls: source.walls.filter((wall) => wall.id === "wall-wc-1-1"),
    builtIns: source.builtIns.filter((item) => ["wc-flush-plate", "wc-revision-panel"].includes(item.catalogId)),
  };
}

function isInside(object: Object3D, ancestor: Object3D): boolean {
  return object === ancestor || Boolean(object.parent && isInside(object.parent, ancestor));
}

function extentAlong(mesh: Mesh, direction: Vector3) {
  const vertices = mesh.geometry.getAttribute("position");
  const point = new Vector3();
  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < vertices.count; index += 1) {
    point.fromBufferAttribute(vertices, index).applyMatrix4(mesh.matrixWorld);
    const value = point.dot(direction);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max, size: max - min };
}

test("shows both estimated WC panels in front of the actual tiled wall without a floating gap or stored-data changes", async () => {
  const scene = wcPanels();
  const before = JSON.stringify(scene);
  const model = await renderPanels(scene);
  try {
    for (const item of scene.builtIns) {
      const panel = model.scene.getObjectByName(`${item.catalogId}-${item.id}`)!;
      const x = item.position[0] + (item.catalogId === "wc-flush-plate" ? -0.04 : 0);
      const hits = new Raycaster(new Vector3(x, item.position[1], 4.8), new Vector3(0, 0, -1)).intersectObject(model.scene, true);
      expect(isInside(hits[0].object, panel), `${item.id} must be visible before the tiles`).toBe(true);
      const borderX = item.position[0] - item.size[0] / 2 + 0.01;
      const border = new Raycaster(new Vector3(borderX, item.position[1], 4.8), new Vector3(0, 0, -1)).intersectObject(panel, true)[0];
      const body = border.object as Mesh;
      const front = extentAlong(body, new Vector3(0, 0, 1));
      const wallFront = scene.walls[0].start.z + scene.walls[0].thickness / 2;
      expect(front.max - wallFront).toBeCloseTo(0.001, 6);
      expect(front.min).toBeLessThan(wallFront);
      expect(front.size).toBeCloseTo(item.size[2], 6);
      // Drei's existing rounded body expands x/y by roughly 0.01 mm.
      expect(extentAlong(body, new Vector3(1, 0, 0)).size).toBeCloseTo(item.size[0], 4);
      expect(extentAlong(body, new Vector3(0, 1, 0)).min).toBeCloseTo(item.source.elevation!, 4);
      expect(extentAlong(body, new Vector3(0, 1, 0)).size).toBeCloseTo(item.size[1], 4);
      expect((body.material as MeshBasicMaterial).depthTest).toBe(true);
    }
    expect(JSON.stringify(scene)).toBe(before);
  } finally { await model.dispose(); }
});

test("moves the selected WC outline with its panel while preserving normal depth testing", async () => {
  const scene = wcPanels();
  for (const item of scene.builtIns) {
    const model = await renderPanels(scene, item.id);
    try {
      const panel = model.scene.getObjectByName(`${item.catalogId}-${item.id}`)!;
      const outline = panel.parent!.children.find((object) => object instanceof Mesh && !Array.isArray(object.material) && object.material.wireframe) as Mesh;
      expect(outline).toBeDefined();
      expect(extentAlong(outline, new Vector3(0, 0, 1)).max).toBeGreaterThan(scene.walls[0].start.z + scene.walls[0].thickness / 2);
      expect((outline.material as MeshBasicMaterial).depthTest).toBe(true);
    } finally { await model.dispose(); }
  }
});

test("mounts the WC panels along a rotated wall normal instead of a fixed world z offset", async () => {
  const scene = wcPanels();
  const radians = 37 * Math.PI / 180;
  const rotate = ({ x, z }: { x: number; z: number }) => ({
    x: x * Math.cos(radians) - z * Math.sin(radians),
    z: x * Math.sin(radians) + z * Math.cos(radians),
  });
  for (const wall of scene.walls) {
    wall.start = rotate(wall.start);
    wall.end = rotate(wall.end);
    wall.angle += radians;
    for (const segment of wall.segments) {
      const position = rotate({ x: segment.position[0], z: segment.position[2] });
      segment.position = [position.x, segment.position[1], position.z];
      segment.rotationY -= radians;
    }
  }
  for (const item of scene.builtIns) {
    const position = rotate({ x: item.position[0], z: item.position[2] });
    item.position = [position.x, item.position[1], position.z];
    item.rotationY -= radians;
  }
  const normal = new Vector3(-Math.sin(radians), 0, Math.cos(radians));
  const model = await renderPanels(scene);
  try {
    for (const item of scene.builtIns) {
      const panel = model.scene.getObjectByName(`${item.catalogId}-${item.id}`)!;
      const origin = new Vector3(...item.position).addScaledVector(normal, 0.8);
      const hit = new Raycaster(origin, normal.clone().negate()).intersectObject(model.scene, true)[0];
      expect(isInside(hit.object, panel)).toBe(true);
      expect(hit.face!.normal.clone().transformDirection(hit.object.matrixWorld).dot(normal)).toBeCloseTo(1, 5);
      const borderOrigin = origin.clone().add(new Vector3(Math.cos(radians), 0, Math.sin(radians)).multiplyScalar(-item.size[0] / 2 + 0.01));
      const body = new Raycaster(borderOrigin, normal.clone().negate()).intersectObject(panel, true)[0].object as Mesh;
      const extent = extentAlong(body, normal);
      const wall = scene.walls[0];
      const wallFront = new Vector3(wall.start.x, 0, wall.start.z).dot(normal) + wall.thickness / 2;
      expect(extent.max - wallFront).toBeCloseTo(0.001, 6);
      expect(extent.min).toBeLessThan(wallFront);
    }
  } finally { await model.dispose(); }
});

test("preserves confirmed mounting positions, already visible panels and isolated gallery geometry", async () => {
  for (const scenario of ["gallery", "confirmed", "already-visible"]) {
    const scene = wcPanels();
    if (scenario === "confirmed") {
      scene.builtIns = scene.builtIns.map((item) => ({
        ...item, source: { ...item.source, metadata: { ...item.source.metadata, confidence: "confirmed" } },
      }));
    } else if (scenario === "gallery") scene.walls = [];
    else scene.builtIns = scene.builtIns.map((item) => ({ ...item, position: [item.position[0], item.position[1], 4.2] }));
    const model = await renderPanels(scene);
    try {
      for (const item of scene.builtIns) {
        const panel = model.scene.getObjectByName(`${item.catalogId}-${item.id}`)!;
        expect(panel.getWorldPosition(new Vector3()).toArray()).toEqual(item.position);
      }
    } finally { await model.dispose(); }
  }
});
