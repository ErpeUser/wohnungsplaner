import React, { act } from "react";
import { createRoot, extend, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { Furniture3D } from "../app/planner/scene-3d/furniture.tsx";
import { createReviewScene } from "../app/planner/review/review-models.ts";
import { getPlannerMaterial } from "../app/planner/scene-3d/materials.ts";

extend({ Group: THREE.Group, Mesh: THREE.Mesh, ExtrudeGeometry: THREE.ExtrudeGeometry });
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SOFT_SEATS = [
  ["chair-kaleo-chenille-beige", "fabric-kaleo-beige", 0.46, 0.46, 0.50],
  ["chair-amber-chenille-beige", "fabric-amber-beige", 0.42, 0.43, 0.49],
] as const;

function chair(id: string, material: string) {
  const review = createReviewScene(id, material);
  return <Furniture3D scene={review.scene} selectionId={null} onSelect={() => {}} />;
}

// The actual R3F scene is mounted: only the unused GPU boundary is omitted.
async function renderedChair(id: string, material: string) {
  const canvas = document.createElement("canvas");
  const gpu = {
    render() {}, setSize() {}, setPixelRatio() {},
    domElement: canvas, shadowMap: { enabled: false },
  } as unknown as THREE.WebGLRenderer;
  const root = createRoot(canvas);
  await root.configure({ gl: gpu, frameloop: "never", size: { width: 800, height: 600, top: 0, left: 0 } });
  let state: RootState | undefined;
  let disposed = false;
  async function render(modelId: string, materialId: string) {
    await act(async () => { state = root.render(chair(modelId, materialId)).getState(); });
    state!.scene.updateMatrixWorld(true);
  }
  await render(id, material);
  return {
    scene: state!.scene,
    render,
    async dispose() {
      if (!disposed) {
        disposed = true;
        await act(async () => root.unmount());
      }
    },
  };
}

function seatMesh(scene: THREE.Scene) {
  const hits = new THREE.Raycaster(new THREE.Vector3(0, 2, 0.025), new THREE.Vector3(0, -1, 0))
    .intersectObjects(scene.children, true);
  expect(hits.length).toBeGreaterThan(0);
  return hits[0].object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
}

function seatRay(seat: THREE.Mesh, x: number, z: number) {
  return new THREE.Raycaster(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0)).intersectObject(seat);
}

describe("Kaleo and Amber seat cushions", () => {
  test.each(SOFT_SEATS)("%s rounds the four cushion corners inside the existing footprint", async (id, material, width, depth) => {
    const model = await renderedChair(id, material);
    try {
      const seat = seatMesh(model.scene);
      // These diagonal points lay on the old square pad. The reviewed cushions
      // have a softer outline; their measured cardinal extents remain intact.
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        expect(seatRay(seat, x * width * 0.46, 0.025 + z * depth * 0.46)).toHaveLength(0);
        expect(seatRay(seat, x * width * 0.30, 0.025 + z * depth * 0.30).length).toBeGreaterThan(0);
      }
    } finally { await model.dispose(); }
  });

  test.each(SOFT_SEATS)("%s has a gentle crown below the recorded seat height", async (id, material, width, depth, height) => {
    const model = await renderedChair(id, material);
    try {
      const seat = seatMesh(model.scene);
      const center = seatRay(seat, 0, 0.025)[0];
      expect(center.point.y).toBeCloseTo(height, 5);
      for (const [x, z] of [[width * 0.35, 0.025], [-width * 0.35, 0.025], [0, 0.025 + depth * 0.35], [0, 0.025 - depth * 0.35]]) {
        const shoulder = seatRay(seat, x, z)[0];
        expect(shoulder).toBeDefined();
        expect(shoulder.point.y).toBeLessThan(height - 0.0005);
        expect(shoulder.point.y).toBeGreaterThan(height - 0.006);
      }
    } finally { await model.dispose(); }
  });

  test.each(SOFT_SEATS)("%s keeps the original seat dimensions, offset and thickness", async (id, material, width, depth, height) => {
    const model = await renderedChair(id, material);
    try {
      const seat = seatMesh(model.scene);
      const bounds = new THREE.Box3().setFromObject(seat);
      const actual = [...bounds.min.toArray(), ...bounds.max.toArray()];
      const expected = [-width / 2, height - 0.055, 0.025 - depth / 2, width / 2, height, 0.025 + depth / 2];
      actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThan(0.00001));
      const fabricId = id === "chair-kaleo-chenille-beige" ? "fabric-kaleo-chenille" : material;
      expect(seat.material).toBe(getPlannerMaterial(fabricId));
    } finally { await model.dispose(); }
  });

  test.each(SOFT_SEATS)("%s is a closed cushion with smooth finite normals and metric fabric UVs", async (id, material) => {
    const model = await renderedChair(id, material);
    try {
      const source = seatMesh(model.scene).geometry;
      const geometry = source.index ? source.toNonIndexed() : source;
      const position = geometry.getAttribute("position");
      const normal = geometry.getAttribute("normal");
      const uv = geometry.getAttribute("uv");
      const edges = new Map<string, number>();
      const weldedNormals = new Map<string, THREE.Vector3>();
      const key = (point: THREE.Vector3) => point.toArray().map((value) => Math.round(value * 1e7)).join(":");
      try {
        for (let index = 0; index < position.count; index += 3) {
          const vertices = [0, 1, 2].map((offset) => new THREE.Vector3().fromBufferAttribute(position, index + offset));
          const cross = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
          expect(cross.length()).toBeGreaterThan(1e-10);
          const uvArea = Math.abs(
            (uv.getX(index + 1) - uv.getX(index)) * (uv.getY(index + 2) - uv.getY(index))
            - (uv.getX(index + 2) - uv.getX(index)) * (uv.getY(index + 1) - uv.getY(index)),
          );
          // A metre of mesh must stay a metre of projected fabric. This catches
          // normalized sphere UVs, pole pinching and collapsed texture triangles.
          expect(uvArea / cross.length()).toBeGreaterThan(0.56);
          expect(uvArea / cross.length()).toBeLessThan(1.01);
          vertices.forEach((vertex, offset) => {
            const vertexNormal = new THREE.Vector3().fromBufferAttribute(normal, index + offset);
            expect([...vertex.toArray(), ...vertexNormal.toArray(), uv.getX(index + offset), uv.getY(index + offset)].every(Number.isFinite)).toBe(true);
            expect(vertexNormal.length()).toBeCloseTo(1, 5);
            expect(cross.dot(vertexNormal)).toBeGreaterThan(0);
            const vertexKey = key(vertex);
            const previousNormal = weldedNormals.get(vertexKey);
            if (previousNormal) expect(previousNormal.dot(vertexNormal)).toBeGreaterThan(0.9999);
            weldedNormals.set(vertexKey, vertexNormal);
            const edge = [vertexKey, key(vertices[(offset + 1) % 3])].sort().join("/");
            edges.set(edge, (edges.get(edge) ?? 0) + 1);
          });
        }
        expect([...edges.values()].every((count) => count === 2)).toBe(true);
      } finally { if (geometry !== source) geometry.dispose(); }
    } finally { await model.dispose(); }
  });

  test.each([
    ["chair-temu-swivel-upholstered", "fabric-temu-sand", 0.42, 0.41, 0.40],
    ["chair-temu-faux-leather-metal", "leather-temu-cream", 0.5098, 0.44, 0.4699],
    ["chair-temu-velvet-swivel-arm", "velvet-temu-beige", 0.41, 0.45, 0.47],
  ] as const)("%s retains its existing pad instead of inheriting the cushion correction", async (id, material, width, depth, height) => {
    const model = await renderedChair(id, material);
    try {
      const seat = seatMesh(model.scene);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        expect(seatRay(seat, x * width * 0.46, 0.025 + z * depth * 0.46).length).toBeGreaterThan(0);
      }
      expect(seatRay(seat, width * 0.35, 0.025)[0].point.y).toBeCloseTo(height, 4);
    } finally { await model.dispose(); }
  });

  test("switching cushion models releases owned geometry while keeping shared fabrics alive", async () => {
    const model = await renderedChair("chair-kaleo-chenille-beige", "fabric-kaleo-beige");
    const oldSeat = seatMesh(model.scene);
    let oldGeometryDisposed = false;
    let sharedMaterialDisposed = false;
    let sharedTextureDisposed = false;
    const onMaterialDispose = () => { sharedMaterialDisposed = true; };
    const onTextureDispose = () => { sharedTextureDisposed = true; };
    oldSeat.geometry.addEventListener("dispose", () => { oldGeometryDisposed = true; });
    oldSeat.material.addEventListener("dispose", onMaterialDispose);
    const textures = [oldSeat.material.map, oldSeat.material.bumpMap].filter((texture): texture is THREE.Texture => !!texture);
    textures.forEach((texture) => texture.addEventListener("dispose", onTextureDispose));
    try {
      await model.render("chair-amber-chenille-beige", "fabric-amber-beige");
      expect(oldGeometryDisposed).toBe(true);
      const amberSeat = seatMesh(model.scene);
      expect(amberSeat.material).toBe(getPlannerMaterial("fabric-amber-beige"));
      let replacementDisposed = false;
      amberSeat.geometry.addEventListener("dispose", () => { replacementDisposed = true; });
      await model.dispose();
      expect(replacementDisposed).toBe(true);
      expect(sharedMaterialDisposed).toBe(false);
      expect(sharedTextureDisposed).toBe(false);
    } finally {
      oldSeat.material.removeEventListener("dispose", onMaterialDispose);
      textures.forEach((texture) => texture.removeEventListener("dispose", onTextureDispose));
      await model.dispose();
    }
  });
});
