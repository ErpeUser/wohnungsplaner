import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const cloudShell = { skip: process.platform === "win32" ? "Linux shell contract; executed by Cloud Build CI." : false };

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
    const result = spawnSync("bash", ["scripts/cloud-run-preview-deploy.sh"], { env: runEnv, encoding: "utf8", timeout: 10_000 });
    assert.equal(result.status, 0, `deployment flag ${flag}: ${result.stderr}`);
    await assert.rejects(readFile(log), { code: "ENOENT" });
  }
});

test("preview deploy refuses an existing anonymous service before deploying", cloudShell, async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "planner-deploy-iam-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const mutation = path.join(directory, "deployed.txt");
  const gcloud = path.join(directory, "gcloud");
  await writeFile(gcloud, `#!/bin/sh
case "$*" in
  "artifacts docker images describe "*) printf 'sha256:${"0".repeat(64)}\\n' ;;
  "run services list "*) printf 'test-preview\\n' ;;
  "run services get-iam-policy "*) printf 'allUsers\\n' ;;
  "run services describe "*"--format=value(metadata.annotations['run.googleapis.com/invoker-iam-disabled'])"*) printf '\\n' ;;
  "run services describe "*) printf 'https://test-preview.run.app\\n' ;;
  "run deploy "*) : > "$DEPLOY_TEST_MUTATION" ;;
  *) exit 92 ;;
esac
`);
  const curl = path.join(directory, "curl");
  await writeFile(curl, "#!/bin/sh\nexit 91\n");
  await chmod(gcloud, 0o755);
  await chmod(curl, 0o755);
  const result = spawnSync("bash", ["scripts/cloud-run-preview-deploy.sh"], {
    env: {
      ...process.env,
      PATH: `${directory}${path.delimiter}${process.env.PATH ?? ""}`,
      DEPLOY_TEST_MUTATION: mutation,
      PROJECT_ID: "test-project", COMMIT_SHA: "0".repeat(40), BUILD_ID: "test-build", BRANCH_NAME: "main",
      _REGION: "europe-west1", _SERVICE: "test-preview", _REGISTRY: "test-registry", _RUNTIME_ACCOUNT: "test-runtime", _DEPLOY: "true",
    },
    encoding: "utf8", timeout: 10_000,
  });
  assert.notEqual(result.status, 0);
  await assert.rejects(readFile(mutation), { code: "ENOENT" }, "An anonymous service must be rejected before gcloud run deploy.");
});
