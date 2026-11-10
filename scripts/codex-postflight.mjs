import { command, repositorySnapshot, saveState, parseArgs } from "./codex-utils.mjs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

export async function runPostflight({ dryRun = false, tests = true, audit = true } = {}) {
  const checks = [];
  if (tests) {
    const checksToRun = [
      ["typecheck", []],
      ["lint", []],
      ["assets:check", []],
      ["test:planner", []],
      ["test:ui", ["--maxWorkers=1"]],
      ["test:cutover", []],
    ];
    for (const [script, extraArgs] of checksToRun) {
      const result = await command(npm, ["run", script, ...(extraArgs.length ? ["--", ...extraArgs] : [])], { dryRun, allowFailure: true });
      checks.push({ name: script, code: result.code, output: \`\${result.stdout}\${result.stderr}\`.slice(-4000) });
    }
  }
  if (audit) {
    const result = await command(npm, ["audit", "--json"], { dryRun, allowFailure: true });
    checks.push({ name: "audit", code: result.code, output: \`\${result.stdout}\${result.stderr}\`.slice(-4000) });
  }
  const snapshot = await repositorySnapshot();
  const result = {
    generatedAt: new Date().toISOString(),
    checks,
    snapshot,
    ok: checks.every((check) => check.code === 0),
  };
  if (!dryRun) {
    await saveState("codex-runtime-state.json", {
      sourceCommit: snapshot.head || null,
      pendingActions: result.ok ? [] : checks.filter((check) => check.code !== 0).map((check) => check.name),
      lastPostflight: result.generatedAt,
    });
  }
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/codex-postflight.mjs")) {
  runPostflight(parseArgs())
    .then((result) => {
      if (!result.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
