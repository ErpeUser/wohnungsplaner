import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";

async function createFixture(t: TestContext) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "planner-build-privacy-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "scripts"), { recursive: true });
  await copyFile(new URL("../sync-client-assets.mjs", import.meta.url), path.join(directory, "sync-client-assets.mjs"));
  await copyFile(new URL("../scripts/check-private-references.mjs", import.meta.url), path.join(directory, "scripts", "check-private-references.mjs"));
  return directory;
}

async function putFile(directory: string, relative: string, contents: string) {
  const file = path.join(directory, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
}

function runScript(directory: string, script: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: "utf8", timeout: 10_000 });
}

test("asset sync removes private generated references while preserving source files and public assets", async (t) => {
  const directory = await createFixture(t);
  await putFile(directory, "dist/client/assets/app.js", "export const ready = true;");
  await putFile(directory, "dist/server/index.js", "export default {};");
  await putFile(directory, "public/planner-assets/reference/plan.txt", "PRIVATE_SOURCE_SENTINEL");
  await putFile(directory, "dist/client/planner-assets/products/chair.svg", "<svg>public product</svg>");
  const privateOutputs = [
    "dist/client/planner-assets/reference/plan.txt",
    "dist/client/planner-assets/private-reference/photo.txt",
    "dist/client/planner-assets/local-sources/source.txt",
    "dist/server/planner-assets/reference/plan.txt",
    "dist/server/planner-assets/private-reference/photo.txt",
    "dist/server/planner-assets/local-sources/source.txt",
  ];
  for (const file of privateOutputs) await putFile(directory, file, "PRIVATE_BUILD_SENTINEL");

  const sync = runScript(directory, "sync-client-assets.mjs");
  assert.equal(sync.status, 0, sync.stderr);
  for (const file of privateOutputs) await assert.rejects(readFile(path.join(directory, file)), { code: "ENOENT" }, file);
  assert.equal(await readFile(path.join(directory, "public/planner-assets/reference/plan.txt"), "utf8"), "PRIVATE_SOURCE_SENTINEL");
  assert.equal(await readFile(path.join(directory, "dist/client/planner-assets/products/chair.svg"), "utf8"), "<svg>public product</svg>");
  assert.equal(await readFile(path.join(directory, "dist/server/assets/app.js"), "utf8"), "export const ready = true;");
  const check = runScript(directory, "scripts/check-private-references.mjs", "--build");
  assert.equal(check.status, 0, check.stderr);
});

test("production privacy check rejects leaked output independently of source reference availability", async (t) => {
  const directory = await createFixture(t);
  await putFile(directory, "dist/client/planner-assets/reference/plan.txt", "PRIVATE_BUILD_SENTINEL");
  await putFile(directory, "dist/server/index.js", "export default {};");
  const check = runScript(directory, "scripts/check-private-references.mjs", "--build");
  assert.equal(check.status, 1, check.stdout);
  assert.match(check.stderr, /dist\/client\/planner-assets\/reference\/plan\.txt/);
});

test("production privacy check cannot pass when the build is absent", async (t) => {
  const directory = await createFixture(t);
  const check = runScript(directory, "scripts/check-private-references.mjs", "--build");
  assert.equal(check.status, 1, check.stdout);
});
