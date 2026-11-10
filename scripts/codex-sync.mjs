import { git, repositorySnapshot, saveState, parseArgs, ensureLocalDir, localDir } from "./codex-utils.mjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

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
      await ensureLocalDir();
      const patch = await git(["diff", "--binary"], { allowFailure: true });
      const untracked = before.status.split(/\r?\n/).filter((line) => line.startsWith("?? ")).join("\n");
      await writeFile(path.join(localDir, "codex-uncommitted.patch"), `${patch.stdout}${untracked ? `\n# Untracked files (copy separately):\n${untracked}\n` : ""}`, "utf8");
      actions.push({ action: "snapshot-written", file: ".local/codex-uncommitted.patch" });
    }
    if (before.behind > 0 || (before.ahead > 0 && before.behind > 0)) {
      return { ok: false, blocked: "Arbeitsbaum enthält uncommittete Änderungen und Remote ist nicht identisch", before, actions };
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
    return { ok: false, blocked: "Lokaler und Remote-Stand sind divergiert; kein automatischer Merge", before, actions };
  }
  const after = await repositorySnapshot();
  const result = { ok: true, before, after, actions, currentCommit: after.head };
  if (!dryRun) await saveState("codex-sync-report.json", { ...result, completedAt: new Date().toISOString() });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-sync.mjs")) synchronize({ ...parseArgs(), push: parseArgs().mode === "full" }).catch((error) => { console.error(error.message); process.exitCode = 1; });
