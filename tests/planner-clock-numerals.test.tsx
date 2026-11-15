import { createHash } from "node:crypto";
import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import {
  Box3, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3,
  type BufferAttribute, type Scene, type WebGLRenderer,
} from "three";
import { expect, test, vi } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { refineRoomLayout } from "../app/planner/domain/room-refinement.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";
import { createSceneModel, type SceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({ Group, Mesh });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
type Item = SceneModel["builtIns"][number];
const source = createSceneModel(refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT), null);
const clock = source.builtIns.find((item) => item.id === "builtin-living-clock")!;
const NUMERAL_PREFIX = "clock-roman-numerals-";

async function renderClocks(items: Item[]) {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  async function update(next: Item[]) {
    const scene = { ...source, floors: [], walls: [], doors: [], windows: [], fixtures: [], placements: [], builtIns: next };
    await act(async () => { state = root.render(<PlannerArchitecture scene={scene} selectionId={null} onSelect={() => {}} />).getState(); });
    state!.scene.updateMatrixWorld(true);
  }
  await update(items);
  return { scene: state!.scene, update, async dispose() { await act(async () => root.unmount()); } };
}

function surface(scene: Scene, item: Item, x: number, y: number) {
  const axis = new Vector3(0, 1, 0);
  const normal = new Vector3(0, 0, 1).applyAxisAngle(axis, item.rotationY);
  const origin = new Vector3(x * item.size[0], y * item.size[1], 0.1)
    .applyAxisAngle(axis, item.rotationY).add(new Vector3(...item.position));
  const hit = new Raycaster(origin, normal.clone().negate()).intersectObject(scene, true)[0];
  if (!hit || !(hit.object instanceof Mesh)) throw new Error("Missing clock surface");
  return hit;
}

function bodySnapshot(scene: Scene) {
  const body: unknown[] = [];
  scene.traverse((object) => {
    if (!(object instanceof Mesh) || object.name.startsWith(NUMERAL_PREFIX)) return;
    if (!(object.material instanceof MeshStandardMaterial)) throw new Error("Unexpected clock material");
    const g = object.geometry;
    const m = object.material;
    const attribute = (a: BufferAttribute) => ({
      count: a.count, itemSize: a.itemSize, normalized: a.normalized,
      sha256: createHash("sha256").update(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength)).digest("hex"),
    });
    body.push({
      name: object.name, type: g.type, matrixWorld: object.matrixWorld.toArray(),
      position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(),
      attributes: Object.fromEntries(Object.entries(g.attributes).map(([name, a]) => [name, attribute(a as BufferAttribute)])),
      index: g.index ? attribute(g.index) : null,
      material: { name: m.name, type: m.type, color: m.color.toArray(), roughness: m.roughness,
        metalness: m.metalness, transparent: m.transparent, opacity: m.opacity,
        depthTest: m.depthTest, depthWrite: m.depthWrite, map: m.map?.name ?? null },
      castShadow: object.castShadow, receiveShadow: object.receiveShadow,
    });
  });
  return body;
}

test.each([clock.rotationY, 0, Math.PI / 2])("the active clock shows Roman marks in front of its dial at rotation %s", async (rotationY) => {
  const item = { ...clock, rotationY };
  const before = JSON.stringify(item);
  const model = await renderClocks([item]);
  try {
    // Cardinal groups are directly visible in source036. Probe their actual
    // ink, then the white gaps; merely adding a dark filled face must not pass.
    for (const [x, y] of [[0, 0.265], [0.265, 0], [0.014, -0.225], [-0.265, -0.014]]) {
      const hit = surface(model.scene, item, x, y);
      expect(hit.object.name).toBe(`${NUMERAL_PREFIX}${item.id}`);
      expect((hit.object as Mesh).material).toBe(getPlannerMaterial("metal-dark"));
      const local = hit.point.clone().sub(new Vector3(...item.position))
        .applyAxisAngle(new Vector3(0, 1, 0), -rotationY);
      expect(local.z).toBeGreaterThan(item.size[2] * 0.44);
      expect(local.z).toBeLessThan(item.size[2] * 0.4575);
    }
    const samples = Array.from({ length: 121 }, (_, index) => {
      const y = -0.06 + index * 0.001;
      return surface(model.scene, item, 0.265, y).object.name.startsWith(NUMERAL_PREFIX);
    });
    const strokes = samples.filter((ink, index) => ink && !samples[index - 1]).length;
    expect(strokes, "the right cardinal is III, with three separate strokes").toBe(3);
    for (const [x, y] of [[0.265, 0.014], [0.014, -0.265], [0, 0.2]]) {
      expect((surface(model.scene, item, x, y).object as Mesh).material).toBe(getPlannerMaterial("white-matte"));
    }
    expect(JSON.stringify(item)).toBe(before);
  } finally { await model.dispose(); }
});

test("preserves all twelve original frame, dial and hand meshes, their materials and the exact bounds", async () => {
  const before = JSON.stringify(clock);
  const model = await renderClocks([clock]);
  try {
    const body = bodySnapshot(model.scene);
    expect(body).toHaveLength(12);
    // Recorded from the real active wrapper before the numeral patch. Includes
    // every geometry attribute/index, local/world transform and material colour.
    expect(createHash("sha256").update(JSON.stringify(body)).digest("hex"))
      .toBe("4606fed6c64d356242f2da2381a2a625f42e2e1c33df9aa15f02057ab6efacda");
    const bounds = new Box3().setFromObject(model.scene);
    expect(bounds.min.toArray()).toEqual([4.172399447355671, 1.17, 6.326285882082172]);
    expect(bounds.max.toArray()).toEqual([4.393000552644329, 1.69, 6.841314117917829]);
    expect(JSON.stringify(clock)).toBe(before);
  } finally { await model.dispose(); }
});

test("reuses one bounded numeral mesh source across clock instances and remounts", async () => {
  const model = await renderClocks([clock]);
  const disposed = vi.fn();
  let geometry: Mesh["geometry"] | undefined;
  try {
    const numeral = model.scene.getObjectByName(`${NUMERAL_PREFIX}${clock.id}`);
    expect(numeral).toBeInstanceOf(Mesh);
    geometry = (numeral as Mesh).geometry;
    geometry.addEventListener("dispose", disposed);
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    for (let index = 0; index < positions.count; index++) {
      expect(Math.abs(positions.getX(index))).toBeLessThan(0.35);
      expect(Math.abs(positions.getY(index))).toBeLessThan(0.35);
      expect(positions.getZ(index)).toBe(0);
      expect(normals.getZ(index)).toBe(1);
    }
    const copy: Item = { ...clock, id: "second-clock", position: [clock.position[0] + 1, ...clock.position.slice(1)] as [number, number, number] };
    for (let index = 0; index < 3; index++) {
      await model.update([]);
      await model.update([clock, copy]);
      for (const item of [clock, copy]) {
        const actual = model.scene.getObjectByName(`${NUMERAL_PREFIX}${item.id}`) as Mesh;
        expect(actual.geometry).toBe(geometry);
        expect(actual.material).toBe(getPlannerMaterial("metal-dark"));
      }
    }
  } finally {
    await model.dispose();
    geometry?.removeEventListener("dispose", disposed);
  }
  expect(disposed).not.toHaveBeenCalled();
});
