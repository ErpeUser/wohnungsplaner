import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Box3, DoubleSide, Group, Mesh, Raycaster, Vector3, type Object3D } from "three";
import { GLTFLoader, type GLTF } from "three-stdlib";
import { beforeAll, expect, test } from "vitest";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { normalizeCatalogGltf } from "../app/planner/scene-3d/gltf-normalization.ts";

// Original asset envelopes, recorded before the internal connection correction.
const CASES = [
  {
    name: "plant", catalogId: "plant-medium",
    min: [-0.33, 2.384185793236071e-9, -0.30000001192092896],
    max: [0.34, 0.99, 0.30000001192092896],
    size: { width: 0.55, depth: 0.55, height: 1.15 },
  },
  {
    name: "sofa", catalogId: "sofa-3seat",
    min: [-0.4999999986588955, 0.14000000536441803, -0.45999999821186066],
    max: [0.4999999986588955, 0.8199999916553498, 0.4000000143051147],
    size: { width: 2.2, depth: 0.92, height: 0.82 },
  },
];
const models = new Map<string, GLTF>();

beforeAll(async () => {
  for (const { name } of CASES) {
    const bytes = await readFile(resolve(process.cwd(), `public/planner-assets/models/${name}.glb`));
    models.set(name, await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, ""));
  }
});

function meshes(object: Object3D): Mesh[] {
  const result: Mesh[] = [];
  object.traverse((child) => { if (child instanceof Mesh) result.push(child); });
  return result;
}

function materialMesh(model: GLTF, index: number): Mesh {
  const mesh = meshes(model.scene).find((entry) => !Array.isArray(entry.material)
    && model.parser.associations.get(entry.material)?.materials === index);
  if (!mesh) throw new Error(`Missing original material role ${index}`);
  return mesh;
}

function intersections(object: Object3D, origin: number[], direction: number[]) {
  object.updateMatrixWorld(true);
  const targets = meshes(object);
  const materials = new Set(targets.flatMap((mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material]));
  const originalSides = new Map([...materials].map((material) => [material, material.side]));
  try {
    for (const material of materials) material.side = DoubleSide;
    const ray = new Raycaster(new Vector3().fromArray(origin), new Vector3().fromArray(direction).normalize());
    const hits = ray.intersectObjects(targets, false);
    // A ray on a shared triangle edge counts as one surface crossing.
    return hits.filter((hit, index) => index === 0 || Math.abs(hit.distance - hits[index - 1].distance) > 1e-8);
  } finally {
    for (const [material, side] of originalSides) material.side = side;
  }
}

function expectInteriorPoint(mesh: Mesh, point: number[], label: string) {
  for (const direction of [[1, 0.173, 0.311], [0.137, 1, 0.239], [0.191, 0.317, 1]]) {
    const hits = intersections(mesh, point, direction);
    expect(hits.length % 2, `${label}: the common point must be inside the actual closed mesh`).toBe(1);
    expect(hits.every((hit) => hit.distance > 1e-7), `${label}: connection must have positive overlap`).toBe(true);
  }
}

test.each(CASES)("$name keeps its exact original outer bounds, catalog size and six material roles", ({ name, catalogId, min, max, size }) => {
  const model = models.get(name)!;
  model.scene.updateMatrixWorld(true);
  const sourceBounds = new Box3().setFromObject(model.scene, true);
  expect(sourceBounds.min.toArray()).toEqual(min);
  expect(sourceBounds.max.toArray()).toEqual(max);
  expect(getFurnitureCatalogItem(catalogId)!.defaultSize).toEqual(size);
  const primitives = meshes(model.scene);
  expect(primitives).toHaveLength(6);
  expect(primitives.map((mesh) => model.parser.associations.get(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.materials).sort()).toEqual([0, 1, 2, 3, 4, 5]);

  const placement = new Group();
  placement.scale.set(size.width, size.height, size.depth);
  placement.add(normalizeCatalogGltf(model.scene.clone(true)));
  const placedBounds = new Box3().setFromObject(placement, true);
  expect(placedBounds.min.y).toBeCloseTo(0, 12);
  const placedSize = placedBounds.getSize(new Vector3());
  expect(placedSize.x).toBeCloseTo(size.width, 12);
  expect(placedSize.y).toBeCloseTo(size.height, 12);
  expect(placedSize.z).toBeCloseTo(size.depth, 12);
});

test("every existing plant leaf overlaps the stem, which overlaps the pot", () => {
  const plant = models.get("plant")!;
  const connections = [
    { label: "pot/stem", roles: [0, 1], point: [0, 0.35, 0] },
    { label: "stem/left leaf", roles: [1, 2], point: [-0.035, 0.68, 0.02] },
    { label: "stem/right leaf", roles: [1, 3], point: [0.025, 0.76, 0.02] },
    { label: "stem/top leaf", roles: [1, 4], point: [-0.025, 0.829, 0.02] },
    { label: "stem/rear leaf", roles: [1, 5], point: [0.01, 0.6, -0.04] },
  ];
  for (const { label, roles, point } of connections) {
    for (const role of roles) expectInteriorPoint(materialMesh(plant, role), point, label);
  }
});

test.each([
  { label: "seat body", role: 0, point: [0, 0.3, -0.31] },
  { label: "left cushion", role: 4, point: [-0.2, 0.45, -0.31] },
  { label: "right cushion", role: 5, point: [0.2, 0.45, -0.31] },
])("sofa $label has a positive connection with the existing back", ({ label, role, point }) => {
  const sofa = models.get("sofa")!;
  expectInteriorPoint(materialMesh(sofa, role), point, label);
  expectInteriorPoint(materialMesh(sofa, 1), point, "back");
});

test("downward rays through the old sofa seat/back opening now hit upholstery", () => {
  const sofa = models.get("sofa")!;
  for (const x of [-0.2, 0, 0.2]) {
    const hits = intersections(sofa.scene, [x, 2, -0.27], [0, -1, 0]);
    expect(hits.length, `No open strip at source X=${x}, Z=-0.27`).toBeGreaterThan(0);
    expect(hits[0].point.y).toBeGreaterThan(0.4);
  }
});
