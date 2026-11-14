import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const privateRoots = [
  path.join(root, "public", "planner-assets", "private-reference"),
  path.join(root, "public", "planner-assets", "reference"),
  path.join(root, ".codex-temp"),
];
const strict = process.argv.includes("--strict");
const findings = [];

async function walk(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.isFile()) findings.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
  }
}

for (const directory of privateRoots) await walk(directory);

if (!findings.length) {
  console.log("Private Referenzen: lokal keine Produktions- oder Temp-Dateien gefunden.");
} else {
  console.warn(
    "Private Referenzen im Arbeitsbaum gefunden. Sie dürfen weder unter public/ noch in Produktionsartefakte gelangen:\n" +
      findings.map((file) => "- " + file).join("\n"),
  );
  if (strict) process.exitCode = 1;
}
