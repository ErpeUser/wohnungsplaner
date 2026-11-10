import { git, repositorySnapshot, saveState, parseArgs, ensureLocalDir, localDir, repoRoot } from "./codex-utils.mjs";
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

async function snapshotWorkingTree() {
  await ensureLocalDir();
  const patch = await git(["diff", "HEAD", "--binary"], { allowFailure: true });
  const untracked = await git(["ls-files", "--others", "--exclude-standard", "-z"], { allowFailure: true });
  const files = untracked.stdout.split("\0").filter(Boolean);
  const copied = [];
  for (const relative of files) {
    const source = path.resolve(repoRoot, relative);
    const root = path.resolve(repoRoot) + path.sep;
    if (!source.startsWith(root)) continue;
    const destination = path.join(localDir, "codex-untracked", relative);
    await mkdir(path.dirname(destination), { recursive: true });
    const info = await stat(source);
    if (info.isDirectory()) await cp(source, destination, { recursive: true, force: true });
    else await writeFile(destination, await readFile(source));
    copied.push(relative);
  }
  await writeFile(
    path.join(localDir, "codex-uncommitted.patch"),
    `${patch.stdout}${copied.length ? `\n# Untracked file contents copied to .local/codex-untracked/:\n${copied.join("\n")}\n` : ""}`,
    "utf8",
  );
  await writeFile(path.join(localDir, "codex-untracked.json"), `${JSON.stringify({ files: copied }, null, 2)}\n`, "utf8");
  return { patch: ".local/codex-uncommitted.patch", untracked: copied, manifest: ".local/codex-untracked.json" };
}

export async function synchronize({ dryRun = false, push = false } = {}) {
  const fetchResult = dryRun ? { code: 0, stderr: "" } : await git(["fetch", "origin", "--prune"], { allowFailure: true });
  if (fetchResult.code !== 0) {
    const snapshot = await repositorySnapshot();
    const result = { ok: false, blocked: "GitHub/Origin nicht erreichbar; kein Synchronisationsanspruch", error: fetchResult.stderr, before: snapshot, actions: [] };
    if (!dryRun) await saveState("codex-sync-report.json", { ...result, completedAt: new Date().toISOString() });
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const before = await repositorySnapshot();
  const actions = [];
  if (before.dirty) {
    actions.push({ action: "preserve-uncommitted", status: before.status });
    if (!dryRun) {
      actions.push({ action: "snapshot-written", ...await snapshotWorkingTree() });
    }
    if (before.behind > 0 || (before.ahead > 0 && before.behind > 0)) {
      const result = { ok: false, blocked: "Arbeitsbaum enthält uncommittete Änderungen und Remote ist nicht identisch", before, actions };
      if (!dryRun) await saveState("codex-sync-report.json", { ...result, completedAt: new Date().toISOString() });
      return result;
    }
  }
  if (before.ahead === 0 && before.behind === 0) actions.push({ action: "none" });
  else if (before.behind > 0 && before.ahead === 0) {
    actions.push({ action: "fast-forward", branch: before.defaultBranch });
    if (!dryRun) await git(["merge", "--ff-only", `origin/${before.defaultBranch}`]);
  } else if (before.ahead > 0 && before.behind === 0) {
    actions.push({ action: "publish", branch: before.defaultBranch });
    if (push && !dryRun) await git(["push", "origin", before.defaultBranch]);
  } else {
    const result = { ok: false, blocked: "Lokaler und Remote-Stand sind divergiert; kein automatischer Merge", before, actions };
    if (!dryRun) await saveState("codex-sync-report.json", { ...result, completedAt: new Date().toISOString() });
    return result;
  }
  const after = await repositorySnapshot();
  const result = { ok: true, before, after, actions, currentCommit: after.head };
  if (!dryRun) await saveState("codex-sync-report.json", { ...result, completedAt: new Date().toISOString() });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-sync.mjs")) synchronize({ ...parseArgs(), push: parseArgs().mode === "full" }).catch((error) => { console.error(error.message); process.exitCode = 1; });
