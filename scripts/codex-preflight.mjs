import { git, command, repositorySnapshot, saveState, parseArgs } from "./codex-utils.mjs";

export async function runPreflight({ dryRun = false } = {}) {
  if (!dryRun) await git(["fetch", "origin", "--prune"], { allowFailure: true });
  const snapshot = await repositorySnapshot();
  const remotes = await git(["remote", "-v"], { allowFailure: true });
  const branches = await git(["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes/origin"], { allowFailure: true });
  const prs = await command("gh", ["pr", "list", "--state", "all", "--limit", "100", "--json", "number,headRefName,baseRefName,state,isDraft,mergeable,statusCheckRollup,reviewDecision"], { allowFailure: true });
  let pullRequests = [];
  if (prs.code === 0) { try { pullRequests = JSON.parse(prs.stdout || "[]"); } catch { pullRequests = []; } }
  const result = { generatedAt: new Date().toISOString(), ...snapshot, remotes: remotes.stdout.trim(), branches: branches.stdout.split(/\r?\n/).filter(Boolean), pullRequests, githubReachable: prs.code === 0 };
  if (!dryRun) await saveState("codex-sync-report.json", result);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-preflight.mjs")) runPreflight(parseArgs()).catch((error) => { console.error(error.message); process.exitCode = 1; });
