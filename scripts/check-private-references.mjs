import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildMode = process.argv.includes("--build");
const buildRoot = process.env.PLANNER_BUILD_OUTPUT_ROOT
  ? path.resolve(process.env.PLANNER_BUILD_OUTPUT_ROOT)
  : path.resolve(root, "..", "Wohnungsplaner_Generated", "build", "dist");
const outputRoots = [path.join(buildRoot, "client"), path.join(buildRoot, "server")];
const referenceDirectories = ["planner-assets/private-reference", "planner-assets/reference", "planner-assets/local-sources"];
const privateRoots = buildMode
  ? outputRoots.flatMap((output) => [...referenceDirectories, ".codex-temp"].map((directory) => path.join(output, directory)))
  : [...referenceDirectories.map((directory) => path.join(root, "public", directory)), path.join(root, ".codex-temp")];
const strict = buildMode || process.argv.includes("--strict");
const findings = [];

if (buildMode) {
  const available = await Promise.all(outputRoots.map(async (directory) => {
    try { return (await fs.stat(directory)).isDirectory(); } catch { return false; }
  }));
  if (available.some((exists) => !exists)) {
    console.error("Produktionsausgabe fehlt: zuerst npm run build ausführen.");
    process.exit(1);
  }
}

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
  console.log(buildMode
    ? "Produktionsausgabe: keine privaten Referenzdateien gefunden."
    : "Private Referenzen: lokal keine Produktions- oder Temp-Dateien gefunden.");
} else {
  console.warn(
    (buildMode
      ? "Private Referenzen in der Produktionsausgabe gefunden:\n"
      : "Private Referenzen im Arbeitsbaum gefunden. Sie dürfen weder unter public/ noch in Produktionsartefakte gelangen:\n") +
      findings.map((file) => "- " + file).join("\n"),
  );
  if (strict) process.exitCode = 1;
}
