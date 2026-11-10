import { parseArgs } from "./codex-utils.mjs";
import { buildDecision } from "./codex-build-decision.mjs";
import { runBuild } from "./codex-build.mjs";
import { restartRuntime } from "./codex-runtime.mjs";
import { runPostflight } from "./codex-postflight.mjs";

/**
 * Release/build compatibility entry point.
 *
 * Existing project build and runtime guards remain the source of truth. This
 * module only composes them and never invents desktop packaging or runtime
 * commands. A restart is performed only when the change classifier requests
 * it (or when --restart is explicitly supplied) and the runtime has the
 * required project-owned stop/start commands.
 */
export async function runCodexRelease({ dryRun = false, force = false, restart = false } = {}) {
  const decision = await buildDecision({ base: "HEAD" });
  const build = await runBuild({ dryRun, force });
  const shouldRestart = Boolean(restart || decision.decision?.restart);
  const runtime = await restartRuntime({ dryRun, restart: shouldRestart });
  const postflight = await runPostflight({ dryRun });
  return { decision, build, runtime, postflight };
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-release.mjs")) {
  runCodexRelease(parseArgs())
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
