import { parseArgs } from "./codex-utils.mjs";
import { buildDecision } from "./codex-build-decision.mjs";
import { runBuild } from "./codex-build.mjs";
import { restartRuntime } from "./codex-runtime.mjs";
import { runPostflight } from "./codex-postflight.mjs";

async function runHealthcheck(url) {
  if (!url) return { checked: false, skipped: true, reason: "CODEX_HEALTHCHECK_URL nicht gesetzt" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    return { checked: true, ok: response.ok, status: response.status, url };
  } catch (error) {
    return { checked: true, ok: false, url, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Release/build compatibility entry point.
 *
 * Existing project build and runtime guards remain the source of truth. This
 * module only composes them and never invents desktop packaging or runtime
 * commands. A restart is performed only when the change classifier requests
 * it (or when --restart is explicitly supplied) and the runtime has the
 * required project-owned stop/start commands.
 */
export async function runCodexRelease({
  dryRun = false,
  force = false,
  restart = false,
  base = "HEAD",
  healthcheckUrl = process.env.CODEX_HEALTHCHECK_URL,
} = {}) {
  const decision = await buildDecision({ base });
  const build = await runBuild({ dryRun, force, base });
  const shouldRestart = Boolean(restart || decision.decision?.restart);
  const runtime = await restartRuntime({ dryRun, restart: shouldRestart });
  const postflight = await runPostflight({ dryRun, audit: true });
  const healthcheck = await runHealthcheck(healthcheckUrl);
  const ok = Boolean(postflight.ok && (!healthcheck.checked || healthcheck.ok));
  return { base, decision, build, runtime, postflight, healthcheck, ok };
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-release.mjs")) {
  runCodexRelease(parseArgs())
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
