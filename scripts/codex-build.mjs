import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { command, git, changedFiles, classifyChanges, determineActions, saveState, parseArgs, repoRoot, sha256File } from "./codex-utils.mjs";

async function findArtifacts(dir, out = []) {
  try {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory() && !["node_modules", ".git"].includes(entry.name)) await findArtifacts(file, out);
      else if (entry.isFile() && /\.(exe|msi|appimage|dmg)$/i.test(entry.name)) out.push(file);
    }
  } catch { /* optional artifact directory */ }
  return out;
}

export async function runBuild({ dryRun = false, force = false } = {}) {
  const files = await changedFiles("HEAD");
  const changes = classifyChanges(files);
  const decision = determineActions(changes, {});
  if (!force && !decision.build) return { decision, built: false, reason: decision.reason };
  if (decision.installDependencies) await command(process.platform === "win32" ? "npm.cmd" : "npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { dryRun });
  const buildResult = await command(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { dryRun });
  const head = (await git(["rev-parse", "HEAD"], { allowFailure: true })).stdout.trim();
  const artifacts = await findArtifacts(path.join(repoRoot, "release"));
  const artifactHashes = {};
  for (const artifact of artifacts) artifactHashes[path.relative(repoRoot, artifact)] = sha256File(await readFile(artifact));
  const result = { decision, built: !dryRun && buildResult.code === 0, planned: dryRun, sourceCommit: head || null, artifacts: artifactHashes };
  if (result.built && !dryRun) await saveState("codex-build-state.json", { ...result, lastSuccessfulBuild: new Date().toISOString() });
  console.log(JSON.stringify(result, null, 2));
  if (!result.built && !dryRun) throw new Error("Build fehlgeschlagen");
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-build.mjs")) runBuild(parseArgs()).catch((error) => { console.error(error.message); process.exitCode = 1; });
