import { parseArgs } from "./codex-utils.mjs";
import { runPreflight } from "./codex-preflight.mjs";
import { synchronize } from "./codex-sync.mjs";
import { reconcile } from "./codex-pr-reconcile.mjs";
import { buildDecision } from "./codex-build-decision.mjs";
import { runBuild } from "./codex-build.mjs";
import { restartRuntime } from "./codex-runtime.mjs";
import { runPostflight } from "./codex-postflight.mjs";

export async function runCodexPipeline(options = {}) {
  const mode = options.mode || "check";
  const dryRun = Boolean(options.dryRun);
  const preflight = await runPreflight({ dryRun });
  if (mode === "check") {
    const decision = await buildDecision({ base: preflight.head || "HEAD" });
    return { mode, preflight, decision };
  }
  const sync = await synchronize({ dryRun, push: mode === "full" });
  if (!sync.ok) return { mode, preflight, sync, blocked: sync.blocked };
  const reconciliation = await reconcile({ merge: mode === "full", dryRun });
  const decision = await buildDecision({ base: sync.before?.head || "HEAD" });
  const build = mode === "full" ? await runBuild({ dryRun }) : { built: false, reason: "Sync-Modus führt keinen Build aus" };
  const runtime = mode === "full" ? await restartRuntime({ dryRun, restart: Boolean(decision.decision.restart) }) : null;
  const postflight = mode === "full" ? await runPostflight({ dryRun }) : null;
  return { mode, preflight, sync, reconciliation, decision, build, runtime, postflight };
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-pipeline.mjs")) runCodexPipeline(parseArgs()).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
