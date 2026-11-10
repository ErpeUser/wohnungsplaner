import { parseArgs } from "./codex-utils.mjs";
import { runPreflight } from "./codex-preflight.mjs";
import { synchronize } from "./codex-sync.mjs";
import { reconcile } from "./codex-pr-reconcile.mjs";

/**
 * Compatibility entry point for the repository maintenance workflow.
 *
 * The implementation deliberately delegates to the existing guarded stages:
 * no force-push, reset, rebase, or implicit merge is introduced here.
 */
export async function runCodexUpdate({ mode = "check", dryRun = false } = {}) {
  if (!["check", "sync", "full"].includes(mode)) {
    throw new Error(`Ungültiger Update-Modus: ${mode}. Erlaubt sind check, sync und full.`);
  }

  const preflight = await runPreflight({ dryRun });
  if (mode === "check") return { mode, preflight };

  const sync = await synchronize({ dryRun, push: mode === "full" });
  if (!sync.ok) return { mode, preflight, sync, blocked: sync.blocked ?? "Synchronisierung blockiert" };

  const reconciliation = await reconcile({ merge: mode === "full", dryRun });
  return { mode, preflight, sync, reconciliation };
}

if (process.argv[1]?.replaceAll("\\\\", "/").endsWith("/codex-update.mjs")) {
  runCodexUpdate(parseArgs())
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
