import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const [filename, name, category = "Licht/Deko", width = "1", depth = "1", height = "1"] = process.argv.slice(2);
if (!filename || !name) {
  console.error("Verwendung: node scripts/prepare-planner-asset.mjs <datei> <name> [kategorie] [breite-m] [tiefe-m] [höhe-m]");
  process.exit(1);
}

const bytes = await fs.readFile(filename);
const extension = path.extname(filename).slice(1).toLowerCase();
const sha256 = createHash("sha256").update(bytes).digest("hex");
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset";
const output = `${filename}.asset.json`;
const sidecar = {
  version: 1,
  assetId: `import-${slug}-${sha256.slice(0, 12)}`,
  name,
  category,
  normalizedSize: { width: Number(width), depth: Number(depth), height: Number(height) },
  floorOffset: 0,
  pivot: "center",
  filename: path.basename(filename),
  mediaType: extension === "glb" ? "model/gltf-binary" : extension === "svg" ? "image/svg+xml" : extension === "png" ? "image/png" : "image/jpeg",
  byteLength: bytes.byteLength,
  sha256,
  pipeline: ["mime-check", "sha256", "metadata", "preview", "catalog-approval"],
};
await fs.writeFile(output, `${JSON.stringify(sidecar, null, 2)}\n`);
console.log(`Asset vorbereitet: ${output}`);
