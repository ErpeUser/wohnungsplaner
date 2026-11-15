import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const bash = process.env.PLANNER_TEST_BASH || "bash";
const shell = { skip: process.platform === "win32" && !process.env.PLANNER_TEST_BASH };
const script = path.resolve("scripts/cloud-preview-cache.sh").replaceAll("\\", "/");

async function fixture(t: { after(fn: () => Promise<unknown>): void }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "planner-cache-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const directory of ["app", "worker", "public/planner-assets", "bin", "remote"]) {
    await mkdir(path.join(root, directory), { recursive: true });
  }
  for (const [file, content] of Object.entries({
    "package.json": '{"name":"cache-test"}',
    "package-lock.json": '{"lockfileVersion":3}',
    "app/model.ts": "export const width = 1;",
    "worker/index.ts": "export default {};",
    "public/planner-assets/manifest.json": '{"assets":[]}',
    "public/planner-assets/model.glb": "model-one",
    "sync-client-assets.mjs": "export {};",
  })) await writeFile(path.join(root, file), content);
  await writeFile(path.join(root, "bin/gcloud"), `#!/bin/sh
if [ "$1 $2" != "storage cp" ]; then exit 90; fi
source="$3"; target="$4"
case "$source" in gs://*) source="$CACHE_TEST_REMOTE/$(printf '%s' "$source" | sed 's|^gs://[^/]*/||')" ;; esac
case "$target" in gs://*) target="$CACHE_TEST_REMOTE/$(printf '%s' "$target" | sed 's|^gs://[^/]*/||')" ;; esac
test -f "$source" || exit 1
mkdir -p "$(dirname "$target")"
cp "$source" "$target"
`);
  const npm = `#!/bin/sh
case "$*" in
  "--yes npm@12.1.0 ci"*) echo install >> "$CACHE_TEST_LOG"; mkdir -p node_modules; echo '{}' > node_modules/.package-lock.json ;;
  "run build") echo compile >> "$CACHE_TEST_LOG"; mkdir -p dist/server dist/client/_next; cp app/model.ts dist/server/index.js; echo compiled > dist/client/_next/client.js ;;
  *) exit 91 ;;
esac
`;
  await writeFile(path.join(root, "bin/npm"), npm);
  await writeFile(path.join(root, "bin/npx"), npm);
  for (const file of ["gcloud", "npm", "npx"]) await chmod(path.join(root, "bin", file), 0o755);
  return root;
}

function run(root: string, mode: string) {
  const args = process.platform === "win32"
    ? ["-c", 'export PATH="$(cygpath -u "$CACHE_TEST_BIN"):$PATH"; exec bash "$CACHE_TEST_SCRIPT" "$CACHE_TEST_MODE"']
    : [script, mode];
  const result = spawnSync(bash, args, {
    cwd: root, encoding: "utf8", timeout: 30_000,
    env: {
      ...process.env, PATH: path.join(root, "bin") + path.delimiter + process.env.PATH,
      CACHE_TEST_BIN: path.join(root, "bin"), CACHE_TEST_SCRIPT: script, CACHE_TEST_MODE: mode,
      CACHE_TEST_REMOTE: path.join(root, "remote").replaceAll("\\", "/"),
      CACHE_TEST_LOG: path.join(root, "calls.txt").replaceAll("\\", "/"),
      _CACHE_BUCKET: "preview-cache",
    },
  });
  assert.equal(result.status, 0, result.stderr + result.stdout);
  return result.stdout;
}

function keys(root: string) {
  const output = run(root, "keys");
  return Object.fromEntries(output.trim().split(/\r?\n/).map(line => line.split("=")));
}

test("renderer edits reuse dependencies while lockfile edits invalidate output", shell, async t => {
  const root = await fixture(t);
  const first = keys(root);
  await writeFile(path.join(root, "app/model.ts"), "export const width = 2;");
  const code = keys(root);
  assert.equal(code.DEPENDENCY_KEY, first.DEPENDENCY_KEY);
  assert.notEqual(code.BUILD_KEY, first.BUILD_KEY);
  await writeFile(path.join(root, "package-lock.json"), '{"lockfileVersion":3,"changed":true}');
  const lock = keys(root);
  assert.notEqual(lock.DEPENDENCY_KEY, code.DEPENDENCY_KEY);
  assert.notEqual(lock.BUILD_KEY, code.BUILD_KEY);
});

test("binary edits skip compilation but imported metadata and new paths do not", shell, async t => {
  const root = await fixture(t);
  const first = keys(root);
  await writeFile(path.join(root, "public/planner-assets/model.glb"), "model-two");
  assert.deepEqual(keys(root), first);
  await writeFile(path.join(root, "public/planner-assets/manifest.json"), '{"assets":["model"]}');
  assert.notEqual(keys(root).BUILD_KEY, first.BUILD_KEY);
  const metadata = keys(root);
  await writeFile(path.join(root, "public/planner-assets/new.glb"), "new-model");
  assert.notEqual(keys(root).BUILD_KEY, metadata.BUILD_KEY);
});

test("warm assets reuse output, warm code skips install, corrupt output rebuilds", shell, async t => {
  const root = await fixture(t);
  run(root, "restore"); run(root, "build"); run(root, "save");
  assert.equal(await readFile(path.join(root, "calls.txt"), "utf8"), "install\ncompile\n");
  await rm(path.join(root, "dist"), { recursive: true });
  await rm(path.join(root, "node_modules"), { recursive: true });
  await writeFile(path.join(root, "public/planner-assets/model.glb"), "model-two");
  run(root, "restore"); run(root, "build");
  assert.equal(await readFile(path.join(root, "calls.txt"), "utf8"), "install\ncompile\n");
  assert.equal(await readFile(path.join(root, "dist/client/planner-assets/model.glb"), "utf8"), "model-two");
  await writeFile(path.join(root, "app/model.ts"), "export const width = 2;");
  await rm(path.join(root, "dist"), { recursive: true });
  run(root, "restore"); run(root, "build"); run(root, "save");
  assert.equal(await readFile(path.join(root, "calls.txt"), "utf8"), "install\ncompile\ncompile\n");
  const current = keys(root);
  await writeFile(path.join(root, "remote/v1/builds", current.BUILD_KEY + ".tgz"), "corrupt");
  await rm(path.join(root, "dist"), { recursive: true });
  run(root, "restore"); run(root, "build");
  assert.equal(await readFile(path.join(root, "calls.txt"), "utf8"), "install\ncompile\ncompile\ncompile\n");
});
