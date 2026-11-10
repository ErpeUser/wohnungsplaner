import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const assetRoot = path.join(root, "..", "public", "planner-assets");
const manifestPath = path.join(assetRoot, "manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const errors = [];

for (const asset of manifest.assets ?? []) {
  const relative = asset.path.replace(/^\/planner-assets\//, "");
  const filePath = path.join(assetRoot, relative);
  let bytes;
  try {
    bytes = await fs.readFile(filePath);
  } catch {
    errors.push(`${asset.id}: Datei fehlt (${asset.path})`);
    continue;
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== asset.byteLength) errors.push(`${asset.id}: byteLength ${asset.byteLength} != ${bytes.byteLength}`);
  if (sha256 !== asset.sha256) errors.push(`${asset.id}: SHA-256 stimmt nicht (${sha256})`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Planner-Assets geprüft: ${manifest.assets?.length ?? 0} Manifest-Einträge sind vorhanden und unverändert.`);
}
