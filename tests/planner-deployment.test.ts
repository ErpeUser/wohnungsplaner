import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const bash = process.env.PLANNER_TEST_BASH || "bash";
const deployArgs = process.platform === "win32"
  ? ["-c", 'export PATH="$(cygpath -u "$DEPLOY_TEST_BIN"):$PATH"; exec bash scripts/cloud-run-preview-deploy.sh']
  : ["scripts/cloud-run-preview-deploy.sh"];
const cloudShell = { skip: process.platform === "win32" && !process.env.PLANNER_TEST_BASH ? "Linux shell contract; executed by Cloud Build CI." : false };

test("preview deploy makes no cloud calls when deployment is disabled or unspecified", cloudShell, async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "planner-deploy-guard-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const log = path.join(directory, "cloud-calls.txt");
  const gcloud = path.join(directory, "gcloud");
  await writeFile(gcloud, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$DEPLOY_TEST_LOG"\nexit 90\n');
  await chmod(gcloud, 0o755);
  const env = {
    ...process.env,
    PATH: `${directory}${path.delimiter}${process.env.PATH ?? ""}`,
    DEPLOY_TEST_LOG: log,
    DEPLOY_TEST_BIN: directory,
    PROJECT_ID: "test-project",
    COMMIT_SHA: "0".repeat(40),
    BUILD_ID: "test-build",
    BRANCH_NAME: "main",
    _REGION: "europe-west1",
    _SERVICE: "test-preview",
    _REGISTRY: "test-registry",
    _RUNTIME_ACCOUNT: "test-runtime",
  };
  for (const flag of ["false", undefined]) {
    const runEnv: NodeJS.ProcessEnv = { ...env };
    if (flag === undefined) delete runEnv._DEPLOY;
    else runEnv._DEPLOY = flag;
    const result = spawnSync(bash, deployArgs, { env: runEnv, encoding: "utf8", timeout: 10_000 });
    assert.equal(result.status, 0, `deployment flag ${flag}: ${result.stderr}`);
    await assert.rejects(readFile(log), { code: "ENOENT" });
  }
});

test("preview deploy verifies the live commit and rejects a stale revision", cloudShell, async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "planner-deploy-iam-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const mutation = path.join(directory, "deployed.txt");
  const gcloud = path.join(directory, "gcloud");
  await writeFile(gcloud, `#!/bin/sh
case "$*" in
  "artifacts docker images describe "*) printf 'sha256:${"0".repeat(64)}\\n' ;;
  "run services describe "*) printf 'https://test-preview.run.app\\n' ;;
  "run deploy "*) : > "$DEPLOY_TEST_MUTATION" ;;
  *) exit 92 ;;
esac
`);
  const curl = path.join(directory, "curl");
  await writeFile(curl, `#!/bin/sh
case "$*" in
  *--write-out*) printf '200' ;;
  *\/__codex/health*) printf '{"status":"ok","sourceCommit":"%s"}' "$DEPLOY_TEST_HEALTH_COMMIT" ;;
  *) output=""; previous=""; for arg in "$@"; do if [ "$previous" = "--output" ]; then output="$arg"; fi; previous="$arg"; done; printf 'Raumplaner' > "$output" ;;
esac
`);
  await chmod(gcloud, 0o755);
  await chmod(curl, 0o755);
  const options = {
    env: {
      ...process.env,
      PATH: `${directory}${path.delimiter}${process.env.PATH ?? ""}`,
      DEPLOY_TEST_MUTATION: mutation,
      DEPLOY_TEST_BIN: directory,
      DEPLOY_TEST_HEALTH_COMMIT: "0".repeat(40),
      PROJECT_ID: "test-project", COMMIT_SHA: "0".repeat(40), BUILD_ID: "test-build", BRANCH_NAME: "main",
      _REGION: "europe-west1", _SERVICE: "test-preview", _REGISTRY: "test-registry", _RUNTIME_ACCOUNT: "test-runtime", _DEPLOY: "true",
    },
    encoding: "utf8" as const, timeout: 10_000,
  };
  const result = spawnSync(bash, deployArgs, options);
  assert.equal(result.status, 0, result.stderr);
  await readFile(mutation);
  const stale = spawnSync(bash, deployArgs, {
    ...options, env: { ...options.env, DEPLOY_TEST_HEALTH_COMMIT: "1".repeat(40) },
  });
  assert.notEqual(stale.status, 0, "A stale live commit must fail the deployment check");
});
