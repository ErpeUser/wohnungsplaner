import React, { act } from "react";
import { createHash } from "node:crypto";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";

extend({ Group: THREE.Group, Mesh: THREE.Mesh, ExtrudeGeometry: THREE.ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TARGETS = [
  { id: "chair-kaleo-chenille-beige", fabric: "fabric-kaleo-chenille", roughness: 0.99,
    mean: [221.273193359375, 210.265380859375, 194.26727294921875],
    geometry: "c8033ad8ff25e3dfdd6d2cd4b01fda6bd68da4bc5488863d01c97d0e3c3e6ff0",
    seat: "0fdc87856756114e6645b2db0f546117c4470a0685b65e542cfcbb22f19265a2" },
  { id: "chair-amber-chenille-beige", fabric: "fabric-amber-beige", roughness: 0.98,
    mean: [214.273193359375, 196.2655029296875, 173.26727294921875],
    geometry: "5a705c6c422cea306e1c15f52ae78e7e3c687121f26b7497bd42a8af34d8f2e1",
    seat: "28972a1abcb01c0601174a223ed03587119636c37c001eb00f2684a5f66c4be1" },
] as const;

// The correction is explicitly limited to two finishes. These actual pre-change
// byte signatures guard the four other users of the formerly shared generator.
const PROTECTED = [
  { id: "chair-temu-swivel-upholstered", fabric: "fabric-temu-sand", roughness: 0.98, bump: 0.018,
    pixels: "111d9056057b3ae18a0fe7aae2b881699902bdb1e1e6ad8e2077c23435e3271d",
    geometry: "1126fb287505aa0a0e8145d65878150d157069f9d7ec51defb1b814625bfb0b4" },
  { id: "chair-temu-velvet-swivel-arm", fabric: "velvet-temu-beige", roughness: 0.98, bump: 0.018,
    pixels: "20710a590d6c933360df20fd80b0b1a8fd8a2acb41ff86254c68abd37944617e",
    geometry: "5e0c8d75b351c026cf2925b6f671abd1050496ddb885b0559fc8352947e5183f" },
  { id: "bed-bliss-120", fabric: "fabric-bliss-weave", roughness: 0.98, bump: 0.018,
    pixels: "11c95a418330b69565c0d38f568249725e396515eb2fc661ff4b2ea5ae4da81a",
    geometry: "219bb926cb67adeb99a9c2925f019f61bba363dfe1f38f975a05531f476fb2b9" },
  { id: "sofa-chicago-206", fabric: "fabric-chicago-chenille", roughness: 0.99, bump: 0.022,
    pixels: "82b8f52baeef57b08e380ab0af43ac9b1d16cd6a75ffd15edc8387fc57f18b7a",
    geometry: "7d3c89a90ba6f8eafc32471ed000f216d6afb993571a61f1c261d15d5d43d021" },
] as const;

function bytesHash(array: ArrayBufferView | undefined) {
  return array ? createHash("sha256").update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest("hex") : null;
}
function jsonHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function pixels(texture: THREE.Texture) {
  return texture.image as { data: Uint8Array; width: number; height: number };
}

// Independent radix-2 FFT of the actual pixel field. This tests visible coherent
// bands across all frequencies, rather than merely checking generator constants.
function spectrum(texture: THREE.Texture) {
  const { data, width: size, height } = pixels(texture);
  expect(height).toBe(size);
  const real = new Float64Array(size * size);
  const imaginary = new Float64Array(real.length);
  let mean = 0;
  for (let index = 0; index < real.length; index += 1) {
    real[index] = data[index * 4] * 0.2126 + data[index * 4 + 1] * 0.7152 + data[index * 4 + 2] * 0.0722;
    mean += real[index] / real.length;
  }
  let variance = 0;
  for (let index = 0; index < real.length; index += 1) {
    real[index] -= mean;
    variance += real[index] ** 2 / real.length;
  }
  function line(offset: number, stride: number) {
    for (let index = 1, reverse = 0; index < size; index += 1) {
      let bit = size >> 1;
      for (; reverse & bit; bit >>= 1) reverse ^= bit;
      reverse ^= bit;
      if (index < reverse) {
        const a = offset + index * stride, b = offset + reverse * stride;
        [real[a], real[b]] = [real[b], real[a]];
        [imaginary[a], imaginary[b]] = [imaginary[b], imaginary[a]];
      }
    }
    for (let length = 2; length <= size; length *= 2) {
      for (let start = 0; start < size; start += length) for (let index = 0; index < length / 2; index += 1) {
        const a = offset + (start + index) * stride;
        const b = offset + (start + index + length / 2) * stride;
        const angle = -2 * Math.PI * index / length;
        const re = real[b] * Math.cos(angle) - imaginary[b] * Math.sin(angle);
        const im = real[b] * Math.sin(angle) + imaginary[b] * Math.cos(angle);
        real[b] = real[a] - re; imaginary[b] = imaginary[a] - im;
        real[a] += re; imaginary[a] += im;
      }
    }
  }
  for (let index = 0; index < size; index += 1) { line(index * size, 1); }
  for (let index = 0; index < size; index += 1) { line(index, size); }
  let total = 0, maximum = 0;
  for (let index = 1; index < real.length; index += 1) {
    const power = real[index] ** 2 + imaginary[index] ** 2;
    total += power; maximum = Math.max(maximum, power);
  }
  return { variance, largestConjugatePair: maximum * 2 / total };
}

async function renderedModel(id: string) {
  const canvas = document.createElement("canvas");
  const gpu = { render() {}, setSize() {}, setPixelRatio() {}, domElement: canvas, shadowMap: { enabled: false } } as unknown as THREE.WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined, disposed = false;
  async function render(modelId: string) {
    const review = createReviewScene(modelId);
    await act(async () => { state = root.render(<Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />).getState(); });
    state!.scene.updateMatrixWorld(true);
  }
  await render(id);
  return { scene: state!.scene, render, async dispose() {
    if (!disposed) { disposed = true; await act(async () => root.unmount()); }
  } };
}

function meshes(scene: THREE.Scene) {
  const result: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
  scene.traverse((object) => { if (object instanceof THREE.Mesh) result.push(object as typeof result[number]); });
  return result;
}

function geometrySignature(geometry: THREE.BufferGeometry, canonical: boolean) {
  const target = canonical && geometry.index ? geometry.toNonIndexed() : geometry;
  const attr = (name: string) => bytesHash((target.getAttribute(name) as THREE.BufferAttribute | undefined)?.array);
  const value = canonical ? { position: attr("position"), normal: attr("normal") }
    : { position: attr("position"), normal: attr("normal"), uv: attr("uv"), index: bytesHash(target.index?.array) };
  if (target !== geometry) target.dispose();
  return value;
}

function uvMetrics(mesh: THREE.Mesh) {
  const { geometry } = mesh, position = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  const index = geometry.index, count = index?.count ?? position.count;
  let collapsed = 0, minimum = Infinity, maximum = 0;
  for (let start = 0; start < count; start += 3) {
    const ids = [0, 1, 2].map((offset) => index ? index.getX(start + offset) : start + offset);
    const [a, b, c] = ids.map((vertex) => new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld));
    b.sub(a); c.sub(a);
    if (b.clone().cross(c).lengthSq() < 1e-24) continue;
    const du1 = uv.getX(ids[1]) - uv.getX(ids[0]), dv1 = uv.getY(ids[1]) - uv.getY(ids[0]);
    const du2 = uv.getX(ids[2]) - uv.getX(ids[0]), dv2 = uv.getY(ids[2]) - uv.getY(ids[0]);
    const determinant = du1 * dv2 - dv1 * du2;
    if (Math.abs(determinant) < 1e-15) { collapsed += 1; continue; }
    const u = b.clone().multiplyScalar(dv2).addScaledVector(c, -dv1).divideScalar(determinant);
    const v = c.clone().multiplyScalar(du1).addScaledVector(b, -du2).divideScalar(determinant);
    const uu = u.dot(u), vv = v.dot(v), uvDot = u.dot(v);
    const midpoint = (uu + vv) / 2, radius = Math.sqrt((uu - vv) ** 2 / 4 + uvDot ** 2);
    minimum = Math.min(minimum, Math.sqrt(Math.max(0, midpoint - radius)));
    maximum = Math.max(maximum, Math.sqrt(midpoint + radius));
  }
  return { collapsed, minimum, maximum };
}

describe("target-only fine chenille", () => {
  test.each(TARGETS)("$id has fine variation without a dominant periodic band", ({ fabric }) => {
    const statistics = spectrum(getPlannerMaterial(fabric).map!);
    expect(statistics.variance).toBeGreaterThan(0.5);
    expect(statistics.largestConjugatePair).toBeLessThan(0.05);
  });

  test.each(TARGETS)("$id retains its exact mean colour and PBR settings", ({ fabric, mean, roughness }) => {
    const material = getPlannerMaterial(fabric), image = pixels(material.map!);
    expect([image.width, image.height]).toEqual([256, 256]);
    const sums = [0, 0, 0];
    for (let index = 0; index < image.data.length; index += 4) {
      sums.forEach((_, channel) => { sums[channel] += image.data[index + channel]; });
      expect(image.data[index + 3]).toBe(255);
    }
    expect(sums.map((sum) => sum / (image.width * image.height))).toEqual([...mean]);
    expect(material.color.toArray()).toEqual([1, 1, 1]);
    expect(material.roughness).toBe(roughness);
    expect(material.metalness).toBe(0);
    expect(material.bumpScale).toBe(0.018);
    expect(material.map!.repeat.toArray()).toEqual([2.2, 2.2]);
    expect(material.bumpMap!.repeat.toArray()).toEqual([2.2, 2.2]);
    expect(material.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(material.bumpMap!.colorSpace).toBe(THREE.NoColorSpace);
    expect(material.map!.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(material.map!.magFilter).toBe(THREE.LinearFilter);
    expect(material.map!.generateMipmaps).toBe(true);
    let edgeDifference = 0, interiorDifference = 0, interiorPairs = 0;
    const red = (x: number, y: number) => image.data[(y * image.width + x) * 4];
    for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
      if (x === 0) edgeDifference += (red(x, y) - red(image.width - 1, y)) ** 2;
      else { interiorDifference += (red(x, y) - red(x - 1, y)) ** 2; interiorPairs += 1; }
      if (y === 0) edgeDifference += (red(x, y) - red(x, image.height - 1)) ** 2;
      else { interiorDifference += (red(x, y) - red(x, y - 1)) ** 2; interiorPairs += 1; }
    }
    // A repeating tile must not introduce an exceptional contrast boundary.
    expect(edgeDifference / (image.width + image.height)).toBeLessThan(interiorDifference / interiorPairs * 1.35);
  });

  test.each(TARGETS)("$id keeps every physical vertex, normal, transform and P13 seat", async ({ id, geometry, seat }) => {
    const model = await renderedModel(id);
    try {
      const physical = meshes(model.scene).map((mesh) => ({ geometry: geometrySignature(mesh.geometry, true), matrixWorld: mesh.matrixWorld.toArray() }));
      expect(jsonHash(physical)).toBe(geometry);
      const hit = new THREE.Raycaster(new THREE.Vector3(0, 2, 0.025), new THREE.Vector3(0, -1, 0)).intersectObjects(model.scene.children, true)[0];
      expect(jsonHash(geometrySignature((hit.object as THREE.Mesh).geometry, false))).toBe(seat);
    } finally { await model.dispose(); }
  });

  test.each(TARGETS)("$id uses metre-based UVs on the seat, shell, rim and stitches", async ({ id, fabric }) => {
    const model = await renderedModel(id);
    try {
      const upholstery = meshes(model.scene).filter((mesh) => mesh.material === getPlannerMaterial(fabric));
      expect(upholstery.length).toBe(id.includes("kaleo") ? 6 : 4);
      for (const mesh of upholstery) {
        const metric = uvMetrics(mesh);
        expect(metric.collapsed).toBe(0);
        expect(metric.minimum).toBeGreaterThan(0.9995);
        expect(metric.maximum).toBeLessThan(Math.sqrt(3) + 0.001);
      }
    } finally { await model.dispose(); }
  });

  test.each(PROTECTED)("$id keeps its existing material bytes", ({ fabric, pixels: expected, roughness, bump }) => {
    const material = getPlannerMaterial(fabric);
    expect(bytesHash(pixels(material.map!).data)).toBe(expected);
    expect(bytesHash(pixels(material.bumpMap!).data)).toBe(expected);
    expect(material.roughness).toBe(roughness);
    expect(material.bumpScale).toBe(bump);
    expect(material.metalness).toBe(0);
    expect(material.color.toArray()).toEqual([1, 1, 1]);
    expect(material.map!.repeat.toArray()).toEqual([2.2, 2.2]);
    expect(material.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(material.bumpMap!.colorSpace).toBe(THREE.NoColorSpace);
  });

  test.each(PROTECTED)("$id keeps all mesh attributes and transforms", async ({ id, geometry }) => {
    const model = await renderedModel(id);
    try {
      expect(jsonHash(meshes(model.scene).map((mesh) => ({ geometry: geometrySignature(mesh.geometry, false), matrixWorld: mesh.matrixWorld.toArray() })))).toBe(geometry);
    } finally { await model.dispose(); }
  });

  test("cached finishes remain independent and repeated access allocates no new maps", () => {
    const materials = [...TARGETS, ...PROTECTED].map(({ fabric }) => getPlannerMaterial(fabric));
    expect(new Set(materials.map((material) => material.map)).size).toBe(6);
    expect(new Set(materials.map((material) => pixels(material.map!).data.buffer)).size).toBe(6);
    for (const [index, { fabric }] of [...TARGETS, ...PROTECTED].entries()) {
      const material = materials[index];
      expect(getPlannerMaterial(fabric)).toBe(material);
      expect(getPlannerMaterial(fabric).map).toBe(material.map);
      expect(material.bumpMap).not.toBe(material.map);
      expect(pixels(material.bumpMap!).data).toBe(pixels(material.map!).data);
    }
  });

  test("target geometry is released once on switching while shared finishes stay alive", async () => {
    const model = await renderedModel(TARGETS[0].id);
    const counts = new Map<THREE.BufferGeometry, number>();
    const materials = TARGETS.map(({ fabric }) => getPlannerMaterial(fabric));
    let sharedDisposals = 0;
    const sharedDispose = () => { sharedDisposals += 1; };
    const resources = materials.flatMap((material) => [material, material.map!, material.bumpMap!]);
    resources.forEach((resource) => resource.addEventListener("dispose", sharedDispose));
    function watch() {
      for (const mesh of meshes(model.scene).filter((item) => materials.includes(item.material))) {
        const geometry = mesh.geometry;
        if (counts.has(geometry)) continue;
        counts.set(geometry, 0);
        geometry.addEventListener("dispose", () => counts.set(geometry, counts.get(geometry)! + 1));
      }
    }
    try {
      watch();
      await model.render(TARGETS[0].id);
      const retained = new Set(meshes(model.scene).map((mesh) => mesh.geometry));
      for (const [geometry, count] of counts) expect(count).toBe(retained.has(geometry) ? 0 : 1);
      watch();
      await model.render(TARGETS[1].id);
      expect([...counts.values()].every((count) => count === 1)).toBe(true);
      watch();
      await model.dispose();
      expect(counts.size).toBeGreaterThanOrEqual(10);
      expect([...counts.values()].every((count) => count === 1)).toBe(true);
      expect(sharedDisposals).toBe(0);
    } finally {
      resources.forEach((resource) => resource.removeEventListener("dispose", sharedDispose));
      await model.dispose();
    }
  });
});
