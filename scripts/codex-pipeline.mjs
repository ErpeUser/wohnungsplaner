import { parseArgs } from "./codex-utils.mjs";
import { runPreflight } from "./codex-preflight.mjs";
import { synchronize } from "./codex-sync.mjs";
import { reconcile } from "./codex-pr-reconcile.mjs";
import { buildDecision } from "./codex-build-decision.mjs";
import { runBuild } from "./codex-build.mjs";
import { restartRuntime } from "./codex-runtime.mjs";
import { runPostflight } from "./codex-postflight.mjs";

function blockedResult(mode, payload, reason) {
  return { mode, ...payload, blocked: reason, ok: false };
}

export async function runCodexPipeline(options = {}) {
  const mode = options.mode || "check";
  const dryRun = Boolean(options.dryRun);
  if (!["check", "sync", "full"].includes(mode)) throw new Error(\`Ungültiger Pipeline-Modus: \${mode}\`);

  const preflight = await runPreflight({ dryRun });
  if (mode === "check") {
    const decision = await buildDecision({ base: preflight.head || "HEAD" });
    return { mode, preflight, decision, ok: true };
  }

  // Never publish before the build and postflight have passed.
  const sync = await synchronize({ dryRun, push: false });
  if (!sync.ok) return blockedResult(mode, { preflight, sync }, sync.blocked || "Synchronisierung blockiert");

  const reconciliation = await reconcile({ merge: mode === "full", dryRun });
  const base = sync.before?.head || "HEAD";
  const decision = await buildDecision({ base });
  let build;
  let runtime = null;
  let postflight = null;

  try {
    build = mode === "full"
      ? await runBuild({ dryRun, base })
      : { base, built: false, reason: "Sync-Modus führt keinen Build aus" };
    runtime = mode === "full"
      ? await restartRuntime({ dryRun, restart: Boolean(decision.decision.restart) })
      : null;
    postflight = mode === "full" ? await runPostflight({ dryRun, audit: true }) : null;
  } catch (error) {
    return blockedResult(mode, { preflight, sync, reconciliation, decision, build, runtime, postflight }, error.message);
  }

  const buildFailed = mode === "full" && !dryRun && decision.decision.build && !build?.built;
  const testsFailed = mode === "full" && postflight && !postflight.ok;
  if (buildFailed || testsFailed) {
    const failedChecks = postflight?.checks?.filter((check) => check.code !== 0).map((check) => check.name) || [];
    return blockedResult(
      mode,
      { preflight, sync, reconciliation, decision, build, runtime, postflight },
      failedChecks.length ? \`Postflight fehlgeschlagen: \${failedChecks.join(", ")}\` : "Build fehlgeschlagen",
    );
  }

  let publish = null;
  if (mode === "full") {
    publish = await synchronize({ dryRun, push: true });
    if (!publish.ok) {
      return blockedResult(mode, { preflight, sync, reconciliation, decision, build, runtime, postflight, publish }, publish.blocked || "Push blockiert");
    }
  }

  return { mode, preflight, sync, reconciliation, decision, build, runtime, postflight, publish, ok: true };
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-pipeline.mjs")) {
  runCodexPipeline(parseArgs())
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.blocked || result.ok === false) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
