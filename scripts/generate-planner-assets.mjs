import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

class NodeFileReader {
  result = null;
  error = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.({ target: this });
    }).catch((error) => {
      this.error = error;
      this.onerror?.(error);
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString("base64")}`;
      this.onloadend?.({ target: this });
    }).catch((error) => {
      this.error = error;
      this.onerror?.(error);
    });
  }
}

globalThis.FileReader ??= NodeFileReader;

const root = resolve(process.cwd(), "public/planner-assets");
const exporter = new GLTFExporter();
const assets = [];

const modelDefinitions = [
  ["sofa", ["sofa-3seat"], sofa],
  ["chair", ["chair-dining", "chair-office"], chair],
  ["bed", ["bed-120", "bed-160"], bed],
  ["table", ["desk-standard", "dining-table"], table],
  ["storage", ["nightstand", "wardrobe-200", "dresser", "shelf", "lowboard"], storage],
  ["plant", ["plant-medium"], plant],
];

for (const [name, catalogIds, factory] of modelDefinitions) {
  const scene = new Scene();
  scene.add(factory());
  const buffer = await exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    trs: false,
  });
  await addAsset({
    id: `model-${name}`,
    type: "model",
    relativePath: `models/${name}.glb`,
    bytes: Buffer.from(buffer),
    catalogIds,
    license: {
      spdx: "MIT",
      sourceUrl: "https://github.com/mrdoob/three.js/blob/dev/LICENSE",
      note: "Project-authored normalized geometry generated with Three.js primitives.",
    },
  });
}

await addTextAsset("texture-oak", "texture", "textures/wood/oak.svg", oakTexture(), "image/svg+xml");
await addTextAsset("texture-fabric", "texture", "textures/fabric/weave.svg", fabricTexture(), "image/svg+xml");
await addTextAsset("texture-rug", "texture", "textures/fabric/rug.svg", rugTexture(), "image/svg+xml");
await addAsset({
  id: "environment-studio",
  type: "environment",
  relativePath: "environment/studio-soft.hdr",
  bytes: radianceEnvironment(),
  license: authoredLicense(),
});

// Preserve and hash the user-authorized artwork instead of generating replacement pixels.
await addAsset({
  id: "texture-hall-wheat-final",
  type: "texture",
  relativePath: "textures/art/hall-wheat-final.webp",
  bytes: await readFile(resolve(root, "textures/art/hall-wheat-final.webp")),
  mediaType: "image/webp",
  meterScale: 0.30,
  license: {"spdx":"LicenseRef-UserProvided","sourceUrl":"https://github.com/ErpeUser/wohnungsplaner/blob/main/public/planner-assets/textures/art/hall-wheat-final.webp","note":"User-provided custom artwork, authorized for the Wohnplaner visualization. No general open-source license is asserted. WebP derivative of Weizen_Final_30x45cm(1).tif."},
});

const manifest = {
  version: 1,
  generatedBy: "scripts/generate-planner-assets.mjs",
  units: "metres",
  assets,
};
await writeFile(resolve(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

async function addTextAsset(id, type, relativePath, content, mediaType) {
  return addAsset({ id, type, relativePath, bytes: Buffer.from(content), mediaType, license: authoredLicense() });
}

async function addAsset({ id, type, relativePath, bytes, catalogIds = [], mediaType, license, meterScale = 1 }) {
  const path = resolve(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  assets.push({
    id,
    type,
    path: `/planner-assets/${relativePath.replaceAll("\\", "/")}`,
    mediaType: mediaType ?? (type === "model" ? "model/gltf-binary" : "application/octet-stream"),
    license,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.byteLength,
    meterScale,
    ...(catalogIds.length ? { catalogIds } : {}),
  });
}

function authoredLicense() {
  return {
    spdx: "CC0-1.0",
    sourceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    note: "Project-authored procedural asset released under CC0-1.0.",
  };
}

function box(group, size, position, color, radius = 0) {
  const geometry = radius > 0
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, Math.min(...size) / 2 - 0.001))
    : new BoxGeometry(...size);
  const material = new MeshStandardMaterial({ color, roughness: 0.72, metalness: 0 });
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function cylinder(group, radius, height, position, color, segments = 20) {
  const mesh = new Mesh(
    new CylinderGeometry(radius, radius, height, segments),
    new MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05 }),
  );
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function sofa() {
  const group = new Group();
  box(group, [0.76, 0.22, 0.72], [0, 0.3, 0.04], "#cfbba7", 0.04);
  box(group, [0.86, 0.58, 0.16], [0, 0.53, -0.38], "#b8a089", 0.04);
  box(group, [0.12, 0.48, 0.72], [-0.44, 0.38, 0.04], "#b8a089", 0.04);
  box(group, [0.12, 0.48, 0.72], [0.44, 0.38, 0.04], "#b8a089", 0.04);
  box(group, [0.36, 0.1, 0.675], [-0.2, 0.45, 0.0175], "#cfbba7", 0.03);
  box(group, [0.36, 0.1, 0.675], [0.2, 0.45, 0.0175], "#cfbba7", 0.03);
  return group;
}

function chair() {
  const group = new Group();
  box(group, [0.72, 0.12, 0.72], [0, 0.48, 0], "#a97a50", 0.02);
  box(group, [0.72, 0.5, 0.1], [0, 0.74, -0.31], "#a97a50", 0.02);
  for (const x of [-0.28, 0.28]) for (const z of [-0.28, 0.28]) {
    cylinder(group, 0.055, 0.48, [x, 0.24, z], "#554b43", 12);
  }
  return group;
}

function bed() {
  const group = new Group();
  box(group, [0.96, 0.18, 0.92], [0, 0.28, 0.03], "#b78f68", 0.02);
  box(group, [0.9, 0.24, 0.84], [0, 0.47, 0.04], "#ded5c9", 0.05);
  box(group, [0.96, 0.58, 0.12], [0, 0.66, -0.44], "#9b806d", 0.04);
  box(group, [0.38, 0.08, 0.22], [-0.22, 0.63, -0.23], "#eee9df", 0.04);
  box(group, [0.38, 0.08, 0.22], [0.22, 0.63, -0.23], "#eee9df", 0.04);
  return group;
}

function table() {
  const group = new Group();
  box(group, [1, 0.1, 0.9], [0, 0.91, 0], "#b88455", 0.02);
  for (const x of [-0.42, 0.42]) for (const z of [-0.36, 0.36]) {
    box(group, [0.09, 0.88, 0.09], [x, 0.44, z], "#4c4640");
  }
  return group;
}

function storage() {
  const group = new Group();
  box(group, [0.92, 0.92, 0.9], [0, 0.46, 0], "#b88455", 0.02);
  for (const y of [0.22, 0.5, 0.78]) box(group, [0.82, 0.02, 0.04], [0, y, 0.47], "#6d4c35");
  for (const x of [-0.42, 0.42]) for (const z of [-0.38, 0.38]) {
    box(group, [0.06, 0.08, 0.06], [x, 0.04, z], "#3f3c38");
  }
  return group;
}

function plant() {
  const group = new Group();
  const pot = new Mesh(
    new CylinderGeometry(0.3, 0.22, 0.38, 24),
    new MeshStandardMaterial({ color: "#9c5d3f", roughness: 0.82 }),
  );
  pot.position.y = 0.19;
  group.add(pot);
  cylinder(group, 0.045, 0.5, [0, 0.58, 0], "#47634f", 10);
  for (const [x, y, z, sx, sy] of [
    [-0.17, 0.68, 0.02, 0.32, 0.18], [0.17, 0.76, 0.02, 0.34, 0.2],
    [-0.08, 0.9, 0.03, 0.3, 0.18], [0.08, 0.6, -0.07, 0.3, 0.17],
  ]) {
    const leaf = new Mesh(
      new SphereGeometry(0.5, 16, 8),
      new MeshStandardMaterial({ color: "#557b5d", roughness: 0.9 }),
    );
    leaf.position.set(x, y, z);
    leaf.scale.set(sx, sy, 0.08);
    group.add(leaf);
  }
  return group;
}

function oakTexture() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#b88759"/>
  <g fill="none" stroke="#805c3f" stroke-opacity=".28" stroke-width="3">
    <path d="M0 34C90 5 130 65 240 34s170-8 272 14M0 116c95-24 162 32 260 0s162-4 252 21M0 216c125-38 179 28 286-4s153-7 226 11M0 328c87-23 178 30 284-5s153-9 228 17M0 438c117-29 169 25 272-2s164-7 240 14"/>
  </g></svg>`;
}

function fabricTexture() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#c4aa8e"/><path d="M0 0L256 256M-64 0L192 256M64 0L320 256M256 0L0 256M320 0L64 256M192 0L-64 256" stroke="#725f50" stroke-opacity=".18" stroke-width="2"/></svg>`;
}

function rugTexture() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#d7c4a6"/><g fill="none" stroke="#795e4d" stroke-opacity=".38" stroke-width="8"><path d="M0 128h512M0 384h512M128 0v512M384 0v512"/><path d="M0 0l512 512M512 0L0 512" stroke-width="3"/></g></svg>`;
}

function radianceEnvironment() {
  const header = Buffer.from("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 2 +X 4\n", "ascii");
  const pixels = Buffer.from([
    210, 220, 235, 128, 230, 220, 198, 128, 248, 226, 190, 128, 196, 211, 230, 128,
    80, 86, 91, 128, 105, 96, 84, 128, 112, 100, 86, 128, 73, 82, 88, 128,
  ]);
  return Buffer.concat([header, pixels]);
}
