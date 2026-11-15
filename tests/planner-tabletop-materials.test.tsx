import { createHash } from "node:crypto";
import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import {
  Box3, DataTexture, ExtrudeGeometry, Group, Material, Mesh, MeshPhysicalMaterial,
  MeshStandardMaterial, NoColorSpace, Raycaster, SRGBColorSpace, Texture, Vector3,
  type BufferAttribute, type Scene, type WebGLRenderer,
} from "three";
import { expect, test, vi } from "vitest";

import { createReviewScene } from "../app/planner/review/review-models.ts";
import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";

extend({ Group, Mesh, ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TABLES = [
  ["dining-table-kaufland-567080013-120-160", "walnut"],
  ["dining-table-aliexpress-100-140", "oak-artisan"],
  ["dining-table-temu-606997-120-160", "oak-natural"],
] as const;
const sharedIds = ["walnut", "oak-artisan", "oak-natural", "oak-artisan-edge", "oak-bozan-directional", "oak-backsplash"];
const sharedBefore = sharedIds.map((id) => {
  const material = getPlannerMaterial(id);
  return { id, material, map: material.map, bump: material.bumpMap, pixels: pixelHash(dataTexture(material)) };
});

function dataTexture(material: MeshStandardMaterial) {
  if (!(material.map instanceof DataTexture)) throw new Error("Expected actual procedural texture pixels");
  return material.map;
}

function pixels(texture: DataTexture) {
  if (!(texture.image.data instanceof Uint8Array)) throw new Error("Expected encoded RGBA bytes");
  return texture.image.data;
}

function pixelHash(texture: DataTexture) {
  return createHash("sha256").update(pixels(texture)).digest("hex");
}

function pixelMetrics(texture: DataTexture) {
  const data = pixels(texture);
  const { width, height } = texture.image;
  const red = (x: number, y: number) => data[(y * width + x) * 4];
  const mean = [0, 0, 0];
  let dxSquared = 0;
  let dySquared = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let channel = 0; channel < 3; channel++) mean[channel] += data[(y * width + x) * 4 + channel] / (width * height);
      dxSquared += (red((x + 1) % width, y) - red(x, y)) ** 2;
      dySquared += (red(x, (y + 1) % height) - red(x, y)) ** 2;
    }
  }
  // Measure the dominant frequency from the emitted pixels, independently of
  // the generator formula. These are display-detail limits, not product pore measurements.
  const rows = [Math.floor(height / 8), Math.floor(height / 2), Math.floor(height * 7 / 8)];
  let peakPower = 0;
  let peakCycles = 0;
  for (let cycles = 1; cycles < Math.min(width / 2, 128); cycles++) {
    let power = 0;
    for (const y of rows) {
      let real = 0;
      let imaginary = 0;
      for (let x = 0; x < width; x++) {
        const phase = x / width * Math.PI * 2 * cycles;
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
    let boundary = 0;
    let interior = 0;
    for (let line = 0; line < lines; line++) {
      boundary += Math.abs(value(0, line) - value(length - 1, line));
      for (let offset = 1; offset < length; offset++) interior += Math.abs(value(offset, line) - value(offset - 1, line));
    }
    return { axis, channel, boundary: boundary / lines, interior: interior / (lines * (length - 1)) };
  }));
  return { mean, wavelengthMetres: 1 / (peakCycles * texture.repeat.x), directionRatio: Math.sqrt(dxSquared / Math.max(dySquared, 1)), wrap };
}

async function renderedTable(catalogId: string, materialId: string, variant = "closed") {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  async function update(id: string, finish: string, stateId = "closed") {
    const review = createReviewScene(id, finish, stateId);
    await act(async () => { state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState(); });
    state!.scene.updateMatrixWorld(true);
  }
  await update(catalogId, materialId, variant);
  return { scene: state!.scene, update, async dispose() { await act(async () => root.unmount()); } };
}

function surface(scene: Scene, x = 0.13, z = 0.17) {
  const hit = new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0)).intersectObjects(scene.children, true)[0];
  if (!hit || !(hit.object instanceof Mesh) || !(hit.object.material instanceof MeshStandardMaterial)) throw new Error("Missing actual tabletop surface");
  return { hit, mesh: hit.object, material: hit.object.material };
}

function geometrySnapshot(scene: Scene) {
  const result: unknown[] = [];
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    result.push({
      transform: object.matrixWorld.toArray(),
      attributes: Object.fromEntries(Object.entries(object.geometry.attributes).map(([name, attribute]) => {
        const array = (attribute as BufferAttribute).array;
        return [name, createHash("sha256").update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength)).digest("hex")];
      })),
    });
  });
  return result;
}

test.each(TABLES)("%s emits fine directional, seamless pixels without changing the %s finish", async (catalogId, materialId) => {
  const model = await renderedTable(catalogId, materialId);
  try {
    const { material } = surface(model.scene);
    const map = dataTexture(material);
    const metrics = pixelMetrics(map);
    expect.soft(metrics.wavelengthMetres, "dominant broad bands must not span centimetres across the whole top").toBeLessThan(0.025);
    expect.soft(metrics.wavelengthMetres).toBeGreaterThan(0.0025);
    expect.soft(metrics.directionRatio, "grain must remain directional rather than broadly mottled").toBeGreaterThan(8);
    for (const edge of metrics.wrap) {
      expect.soft(edge.boundary, `${edge.axis} wrap must not add a sharp RGB-${edge.channel} seam`).toBeLessThanOrEqual(edge.interior * 3 + 0.5);
    }
    const original = getPlannerMaterial(materialId);
    const originalMeans = pixelMetrics(dataTexture(original)).mean;
    for (let channel = 0; channel < 3; channel++) expect(Math.abs(metrics.mean[channel] - originalMeans[channel])).toBeLessThan(0.25);
    expect(material.color.toArray()).toEqual(original.color.toArray());
    expect(material.roughness).toBe(original.roughness);
    expect(material.metalness).toBe(original.metalness);
    expect(material.bumpScale).toBe(original.bumpScale);
    if (original instanceof MeshPhysicalMaterial) {
      expect(material).toBeInstanceOf(MeshPhysicalMaterial);
      expect((material as MeshPhysicalMaterial).clearcoat).toBe(original.clearcoat);
      expect((material as MeshPhysicalMaterial).clearcoatRoughness).toBe(original.clearcoatRoughness);
    }
    expect(map.colorSpace).toBe(SRGBColorSpace);
    expect(material.bumpMap).not.toBe(map);
    expect(material.bumpMap?.colorSpace).toBe(NoColorSpace);
    expect(material.bumpMap?.image).toBe(map.image);
    expect(material.bumpMap?.repeat.toArray()).toEqual(map.repeat.toArray());
    expect(map.repeat.toArray()).toEqual(original.map?.repeat.toArray());
  } finally { await model.dispose(); }
});

test.each(TABLES.flatMap(([id, material]) => (["closed", "extended"] as const).map((variant) => [id, material, variant] as const)))("%s %s %s routes only its top through the new profile at unchanged metric UV scale", async (catalogId, materialId, variant) => {
  const model = await renderedTable(catalogId, materialId, variant);
  try {
    const { mesh: top, material, hit } = surface(model.scene);
    expect(material).not.toBe(getPlannerMaterial(materialId));
    expect(material.map).not.toBe(getPlannerMaterial(materialId).map);
    model.scene.traverse((object) => {
      if (!(object instanceof Mesh) || object === top) return;
      const other = object.material;
      if (!(other instanceof MeshStandardMaterial)) throw new Error("Unexpected comparison support material");
      expect(other.name).toMatch(/^planner-material-/);
      expect(other).toBe(getPlannerMaterial(other.name.replace(/^planner-material-/, "")));
    });
    const alongX = surface(model.scene, 0.23, 0.17).hit;
    const alongZ = surface(model.scene, 0.13, 0.27).hit;
    expect((alongX.uv!.x - hit.uv!.x) / 0.1).toBeCloseTo(1, 6);
    expect((alongZ.uv!.y - hit.uv!.y) / 0.1).toBeCloseTo(-1, 6);
    expect(hit.normal?.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(0.000001);
    const bounds = new Box3().setFromObject(top);
    const size = bounds.getSize(new Vector3());
    const expected = createReviewScene(catalogId, materialId, variant).size;
    expect(size.x).toBeCloseTo(expected.width, 5);
    expect(size.z).toBeCloseTo(expected.depth, 5);
    expect(bounds.max.y).toBeCloseTo(expected.height, 5);
  } finally { await model.dispose(); }
});

test.each([
  ["dining-table-bozan-110", "oak-artisan", "default", "oak-bozan-directional"],
  ["dining-table-temu-609726-110-150", "oak-natural", "closed", "oak-natural"],
  ["dining-table-temu-609726-110-150", "oak-natural", "extended", "oak-natural"],
])("%s %s %s retains its original tabletop recipe", async (catalogId, materialId, variant, expectedId) => {
  const model = await renderedTable(catalogId, materialId, variant);
  try { expect(surface(model.scene).material).toBe(getPlannerMaterial(expectedId)); }
  finally { await model.dispose(); }
});

test("finish changes reuse bounded profile resources, preserve geometry and never mutate or dispose shared recipes", async () => {
  const profiles = new Map<string, MeshStandardMaterial>();
  for (const [id, finish] of TABLES) {
    const model = await renderedTable(id, finish);
    profiles.set(finish, surface(model.scene).material);
    await model.dispose();
  }
  const resources = [...profiles.values()].flatMap((material) => [material, material.map!, material.bumpMap!]);
  const disposed = vi.fn();
  for (const resource of resources) resource.addEventListener("dispose", disposed);
  const materialClone = vi.spyOn(Material.prototype, "clone");
  const textureClone = vi.spyOn(Texture.prototype, "clone");
  const model = await renderedTable(TABLES[0][0], "walnut");
  try {
    const geometry = geometrySnapshot(model.scene);
    for (const finish of ["oak-natural", "walnut", "oak-natural", "walnut"]) {
      await model.update(TABLES[0][0], finish);
      expect(surface(model.scene).material).toBe(profiles.get(finish));
      expect(geometrySnapshot(model.scene)).toEqual(geometry);
    }
    expect(materialClone).not.toHaveBeenCalled();
    expect(textureClone).not.toHaveBeenCalled();
    for (const original of sharedBefore) {
      const current = getPlannerMaterial(original.id);
      expect(current).toBe(original.material);
      expect(current.map).toBe(original.map);
      expect(current.bumpMap).toBe(original.bump);
      expect(pixelHash(dataTexture(current))).toBe(original.pixels);
    }
  } finally {
    await model.dispose();
    materialClone.mockRestore();
    textureClone.mockRestore();
    for (const resource of resources) resource.removeEventListener("dispose", disposed);
  }
  expect(disposed).not.toHaveBeenCalled();
});
