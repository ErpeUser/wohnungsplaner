import { command, detectDefaultBranch, parseArgs } from "./codex-utils.mjs";

export async function listPullRequests() {
  const result = await command("gh", ["pr", "list", "--state", "open", "--limit", "100", "--json", "number,headRefName,baseRefName,author,isDraft,mergeable,reviewDecision,statusCheckRollup"], { allowFailure: true });
  if (result.code !== 0) return { reachable: false, pullRequests: [], error: result.stderr };
  try { return { reachable: true, pullRequests: JSON.parse(result.stdout || "[]") }; } catch { return { reachable: false, pullRequests: [], error: "Ungültige gh-Ausgabe" }; }
}

export function canAutoMerge(pr, defaultBranch) {
  if (!pr || pr.baseRefName !== defaultBranch || pr.isDraft) return false;
  if (pr.mergeable !== "MERGEABLE") return false;
  if (pr.reviewDecision !== "APPROVED") return false;
  const checks = Array.isArray(pr.statusCheckRollup) ? pr.statusCheckRollup : [];
  if (checks.length === 0) return false;
  return checks.every((check) => ["SUCCESS", "SKIPPED", "NEUTRAL"].includes(check?.conclusion));
}

export async function reconcile({ merge = false, dryRun = false } = {}) {
  const defaultBranch = await detectDefaultBranch();
  const listed = await listPullRequests();
  const actions = [];
  for (const pr of listed.pullRequests) {
    if (canAutoMerge(pr, defaultBranch)) {
      actions.push({ number: pr.number, action: merge ? "merge" : "eligible" });
      if (merge && !dryRun) await command("gh", ["pr", "merge", String(pr.number), "--auto", "--merge", "--delete-branch"]);
    } else actions.push({ number: pr.number, action: "hold", reason: "Nicht alle Merge-Anforderungen erfüllt" });
  }
  const result = { defaultBranch, reachable: listed.reachable, actions, blocked: listed.error || null };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-pr-reconcile.mjs")) reconcile(parseArgs()).catch((error) => { console.error(error.message); process.exitCode = 1; });
