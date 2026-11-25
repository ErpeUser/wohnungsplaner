import { createHash } from "node:crypto";
import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import {
  Box3, BoxGeometry, CapsuleGeometry, CircleGeometry, CylinderGeometry, DataTexture,
  ExtrudeGeometry, Group, LatheGeometry, Material, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, PlaneGeometry, Raycaster, RingGeometry, ShapeGeometry,
  SphereGeometry, SRGBColorSpace, Texture, TorusGeometry, Vector3,
  type BufferAttribute, type Scene, type WebGLRenderer,
} from "three";
import { expect, test, vi } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { INTERIOR_REVISION, refineRoomLayout } from "../app/planner/domain/room-refinement.ts";
import { PlannerArchitecture } from "../app/planner/scene-3d/architecture.tsx";
import { getInteriorMaterial } from "../app/planner/scene-3d/interior-materials.ts";
import { hasRefinedInteriorModel } from "../app/planner/scene-3d/interior-models.tsx";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";
import { createSceneModel, type SceneModel } from "../app/planner/scene-3d/scene-model.ts";

extend({ Group, Mesh, BoxGeometry, ExtrudeGeometry, CapsuleGeometry, CircleGeometry,
  CylinderGeometry, LatheGeometry, PlaneGeometry, RingGeometry, ShapeGeometry,
  SphereGeometry, TorusGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Item = SceneModel["builtIns"][number];
const source = createSceneModel(refineRoomLayout(DEFAULT_APARTMENT_DOCUMENT), null);
const panels = source.builtIns.filter((item) => item.catalogId === "kitchen-backsplash-oak");
const shared = getInteriorMaterial("wood");
const sharedMap = shared.map;
const SHARED_WOOD_HASH = "91e04f050db19f02776cd202375c7e0a9309ecd49eefef7edb1d81e66ff05ede";

function dataTexture(material: MeshStandardMaterial) {
  if (!(material.map instanceof DataTexture) || !(material.map.image.data instanceof Uint8Array)) {
    throw new Error("Expected actual procedural RGBA pixels");
  }
  return material.map;
}

function pixelHash(texture: DataTexture) {
  return createHash("sha256").update(pixels(texture)).digest("hex");
}

function pixels(texture: DataTexture) {
  const data = texture.image.data;
  if (!(data instanceof Uint8Array)) throw new Error("Expected encoded RGBA bytes");
  return data;
}

function pixelMetrics(texture: DataTexture) {
  const data = pixels(texture);
  const { width, height } = texture.image;
  const red = (x: number, y: number) => data[(y * width + x) * 4];
  const mean = [0, 0, 0];
  let dxSquared = 0;
  let dySquared = 0;
  let opaque = true;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    for (let channel = 0; channel < 3; channel++) mean[channel] += data[(y * width + x) * 4 + channel] / (width * height);
    dxSquared += (red((x + 1) % width, y) - red(x, y)) ** 2;
    dySquared += (red(x, (y + 1) % height) - red(x, y)) ** 2;
    opaque &&= data[(y * width + x) * 4 + 3] === 255;
  }
  // Read spatial frequency from the emitted pixels, not generator constants.
  // These are rendering limits; the private photographs do not measure grain pitch.
  let peakPower = 0;
  let peakCycles = 0;
  for (let cycles = 1; cycles <= Math.min(128, height / 2); cycles++) {
    let power = 0;
    for (const x of [Math.floor(width / 8), Math.floor(width / 2), Math.floor(width * 7 / 8)]) {
      let real = 0;
      let imaginary = 0;
      for (let y = 0; y < height; y++) {
        const phase = y / height * Math.PI * 2 * cycles;
        real += (red(x, y) - mean[0]) * Math.cos(phase);
        imaginary += (red(x, y) - mean[0]) * Math.sin(phase);
      }
      power += real ** 2 + imaginary ** 2;
    }
    if (power > peakPower) { peakPower = power; peakCycles = cycles; }
  }
  const wrap = (["x", "y"] as const).flatMap((axis) => [0, 1, 2].map((channel) => {
    const length = axis === "x" ? width : height;
    const lines = axis === "x" ? height : width;
    const value = (offset: number, line: number) => data[((axis === "x" ? line * width + offset : offset * width + line) * 4) + channel];
    let boundaryMaximum = 0;
    let interiorMaximum = 0;
    for (let line = 0; line < lines; line++) {
      boundaryMaximum = Math.max(boundaryMaximum, Math.abs(value(0, line) - value(length - 1, line)));
      for (let offset = 1; offset < length; offset++) {
        interiorMaximum = Math.max(interiorMaximum, Math.abs(value(offset, line) - value(offset - 1, line)));
      }
    }
    return { axis, channel, boundaryMaximum, interiorMaximum };
  }));
  return { mean, peakCycles, directionRatio: Math.sqrt(dySquared / Math.max(dxSquared, 1)), wrap, opaque };
}

async function renderObjects(items: Item[]) {
  const canvas = document.createElement("canvas");
  // Stub only the GPU boundary. The production wrapper chooses the refined
  // renderer; its actual mesh, UVs, transforms, materials and raycasting run.
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

function panelSurface(scene: Scene, item: Item, x = 0, y = 0) {
  const axis = new Vector3(0, 1, 0);
  const normal = new Vector3(0, 0, 1).applyAxisAngle(axis, item.rotationY);
  const origin = new Vector3(x, y, 0.1).applyAxisAngle(axis, item.rotationY).add(new Vector3(...item.position));
  const hit = new Raycaster(origin, normal.clone().negate()).intersectObject(scene, true)[0];
  if (!hit?.uv || !(hit.object instanceof Mesh) || !(hit.object.material instanceof MeshStandardMaterial)) {
    throw new Error(`Missing actual panel surface: ${item.id}`);
  }
  return { hit, mesh: hit.object, material: hit.object.material, normal };
}

function geometrySnapshot(scene: Scene) {
  const meshes: unknown[] = [];
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const hash = (attribute: BufferAttribute) => {
      const array = attribute.array;
      return createHash("sha256").update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).digest("hex");
    };
    const bounds = new Box3().setFromObject(object);
    meshes.push({
      transform: object.matrixWorld.toArray(),
      bounds: [bounds.min.toArray(), bounds.max.toArray()],
      attributes: Object.fromEntries(Object.entries(object.geometry.attributes).map(([name, attribute]) => [name, hash(attribute as BufferAttribute)])),
      index: object.geometry.index ? hash(object.geometry.index) : null,
    });
  });
  return meshes;
}

test.each(panels)("$id shows fine horizontal wood at the existing metre scale through the active wrapper", async (item) => {
  expect(hasRefinedInteriorModel(item)).toBe(true);
  const before = JSON.stringify(item);
  const model = await renderObjects([item]);
  try {
    const { mesh, material, hit, normal } = panelSurface(model.scene, item);
    const horizontal = panelSurface(model.scene, item, 0.1, 0).hit;
    const vertical = panelSurface(model.scene, item, 0, 0.1).hit;
    const du = (horizontal.uv!.x - hit.uv!.x) / horizontal.point.distanceTo(hit.point);
    const dv = (vertical.uv!.y - hit.uv!.y) / vertical.point.distanceTo(hit.point);
    expect(du).toBeCloseTo(1, 6);
    expect(dv).toBeCloseTo(1, 6);
    expect(horizontal.uv!.y).toBeCloseTo(hit.uv!.y, 6);
    expect(vertical.uv!.x).toBeCloseTo(hit.uv!.x, 6);
    expect(hit.face!.normal.clone().transformDirection(mesh.matrixWorld).dot(normal)).toBeCloseTo(1, 6);
    expect(mesh.geometry.type).toBe("ExtrudeGeometry");
    mesh.geometry.computeBoundingBox();
    const size = mesh.geometry.boundingBox!.getSize(new Vector3());
    item.size.forEach((dimension, axis) => expect(size.getComponent(axis)).toBeCloseTo(dimension, 4));
    const map = dataTexture(material);
    const metrics = pixelMetrics(map);
    const wavelength = 1 / (metrics.peakCycles * map.repeat.y * dv);
    expect.soft(metrics.directionRatio, "elongated markings must run horizontally on each panel").toBeGreaterThan(8);
    expect.soft(wavelength, "the dominant wood field must no longer span broad upright centimetre bands").toBeLessThan(0.025);
    expect.soft(wavelength).toBeGreaterThan(0.005);
    for (const edge of metrics.wrap) {
      expect.soft(edge.boundaryMaximum, `${edge.axis} RGB-${edge.channel} wrap must be an ordinary pixel step`).toBeLessThanOrEqual(edge.interiorMaximum);
    }
    const originalMeans = pixelMetrics(dataTexture(shared)).mean;
    metrics.mean.forEach((mean, channel) => expect(Math.abs(mean - originalMeans[channel])).toBeLessThan(0.1));
    expect(metrics.opaque).toBe(true);
    expect(material).not.toBe(shared);
    expect(material).toBeInstanceOf(MeshPhysicalMaterial);
    expect(material.color.toArray()).toEqual(shared.color.toArray());
    expect(material.roughness).toBe(shared.roughness);
    expect(material.metalness).toBe(shared.metalness);
    expect((material as MeshPhysicalMaterial).clearcoat).toBe((shared as MeshPhysicalMaterial).clearcoat);
    expect((material as MeshPhysicalMaterial).clearcoatRoughness).toBe((shared as MeshPhysicalMaterial).clearcoatRoughness);
    expect(material.bumpMap).toBeNull();
    expect(material.normalMap).toBeNull();
    expect(map.colorSpace).toBe(SRGBColorSpace);
    expect(map.repeat.toArray()).toEqual([1, 1]);
    for (const property of ["minFilter", "magFilter", "generateMipmaps", "anisotropy", "wrapS", "wrapT", "flipY"] as const) {
      expect(map[property]).toBe(sharedMap![property]);
    }
    expect(JSON.stringify(item)).toBe(before);
  } finally { await model.dispose(); }
});

test.each([
  ["bath-towel-hooks-wood-black", 4],
  ["hall-tejo-art-plates", 5],
  ["hall-between-door-decor", 5],
] as const)("%s retains its existing %i shared wooden surfaces", async (catalogId, count) => {
  const item = source.builtIns.find((candidate) => candidate.catalogId === catalogId)!;
  expect(item).toBeDefined();
  const model = await renderObjects([item]);
  try {
    const woods: MeshStandardMaterial[] = [];
    model.scene.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof MeshStandardMaterial && object.material.name === "interior-wood") woods.push(object.material);
    });
    expect(woods).toHaveLength(count);
    woods.forEach((material) => {
      expect(material).toBe(shared);
      expect(material.map).toBe(sharedMap);
      expect(pixelHash(dataTexture(material))).toBe(SHARED_WOOD_HASH);
    });
  } finally { await model.dispose(); }
});

test("WC holder renders two darker staggered shelves without recolouring shared wood", async () => {
  const item = source.builtIns.find((candidate) => candidate.catalogId === "wc-paper-holder")!;
  expect(item).toBeDefined();
  expect(hasRefinedInteriorModel(item)).toBe(true);
  const model = await renderObjects([item]);
  const darkWood = getInteriorMaterial("wc-paper-holder-wood");
  const darkTexture = dataTexture(darkWood);
  try {
    const shelves: Mesh[] = [];
    model.scene.traverse((object) => {
      if (object instanceof Mesh && Array.isArray(object.material) && object.material[0] === darkWood) shelves.push(object);
    });
    expect(shelves).toHaveLength(2);
    expect(shelves.map((object) => Number(object.position.x.toFixed(3))).sort((a,b)=>a-b)).toEqual([-.075,.075]);
    expect(shelves.map((object) => Number(object.position.y.toFixed(3))).sort((a,b)=>a-b)).toEqual([-.058,.058]);
    expect(pixelMetrics(darkTexture).mean[0]).toBeGreaterThan(150);
    expect(pixelMetrics(darkTexture).mean[0]).toBeLessThan(180);
    expect(darkTexture.name).toContain("1005013624521211");
    expect(pixelMetrics(darkTexture).directionRatio).toBeGreaterThan(1.1);
    const edge=getInteriorMaterial("wc-paper-holder-edge");
    expect(pixelMetrics(dataTexture(edge)).mean[0]).toBeLessThan(125);
    expect(edge.map?.name).toContain("1005013624521211");
    expect(shelves.every(s=>Array.isArray(s.material)&&s.material[1]===edge)).toBe(true);
    expect(shelves.every(s=>s.geometry.groups.filter(g=>g.materialIndex===0).length===2)).toBe(true);
    expect(pixelMetrics(darkTexture).mean[0]).toBeLessThan(pixelMetrics(dataTexture(shared)).mean[0]-15);
    expect(pixelHash(darkTexture)).not.toBe(SHARED_WOOD_HASH);
    expect(darkWood.map).not.toBe(sharedMap);
    expect(getInteriorMaterial("wood")).toBe(shared);
    expect(pixelHash(dataTexture(shared))).toBe(SHARED_WOOD_HASH);
  } finally { await model.dispose(); }
});

test("both panel widths reuse one bounded profile without changing geometry or disposing shared resources", async () => {
  expect(panels).toHaveLength(2);
  const model = await renderObjects(panels);
  const material = panelSurface(model.scene, panels[0]).material;
  const resources = [...new Set([material, material.map!, shared, sharedMap!])];
  const disposed = vi.fn();
  resources.forEach((resource) => resource.addEventListener("dispose", disposed));
  const materialClone = vi.spyOn(Material.prototype, "clone");
  const textureClone = vi.spyOn(Texture.prototype, "clone");
  try {
    expect(material).not.toBe(shared);
    expect(panelSurface(model.scene, panels[1]).material).toBe(material);
    const geometry = geometrySnapshot(model.scene);
    for (let index = 0; index < 3; index++) {
      await model.update([panels[index % 2]]);
      expect(panelSurface(model.scene, panels[index % 2]).material).toBe(material);
      await model.update(panels);
      panels.forEach((panel) => expect(panelSurface(model.scene, panel).material).toBe(material));
      expect(geometrySnapshot(model.scene)).toEqual(geometry);
    }
    expect(materialClone).not.toHaveBeenCalled();
    expect(textureClone).not.toHaveBeenCalled();
    expect(getInteriorMaterial("wood")).toBe(shared);
    expect(shared.map).toBe(sharedMap);
    expect(pixelHash(dataTexture(shared))).toBe(SHARED_WOOD_HASH);
  } finally {
    await model.dispose();
    materialClone.mockRestore();
    textureClone.mockRestore();
    resources.forEach((resource) => resource.removeEventListener("dispose", disposed));
  }
  expect(disposed).not.toHaveBeenCalled();
});

test("the wrapper preserves the legacy backsplash material for unrefined documents", async () => {
  const item = panels[0];
  const legacy = { ...item, source: { ...item.source, metadata: { ...item.source.metadata,
    notes: item.source.metadata?.notes?.filter((note) => note !== INTERIOR_REVISION) } } };
  expect(hasRefinedInteriorModel(legacy)).toBe(false);
  const model = await renderObjects([legacy]);
  try { expect(panelSurface(model.scene, legacy).material).toBe(getPlannerMaterial("oak-backsplash")); }
  finally { await model.dispose(); }
});
