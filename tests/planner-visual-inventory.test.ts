import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/visual-cloud-inventory.mjs", import.meta.url));
const loader = import.meta.resolve("tsx");
const chair = "chair-kaleo-chenille-beige";
const table = "dining-table";
const views = ["front", "side", "back", "perspective"];

async function putFile(directory: string, relative: string, contents: string) {
  const file = path.join(directory, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
}

async function fixture(t: TestContext, shots: Array<[string, string]>) {
  const temporary = path.join(process.cwd(), ".local");
  await mkdir(temporary, { recursive: true });
  const directory = await mkdtemp(path.join(temporary, "visual-inventory-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "models", "fixed"), { recursive: true });
  for (const [id, catalogId] of [
    [chair, chair], ["fixture-kaleo-alias", chair], [table, table], ["fixture-unmapped", "fixture-unmapped"],
  ]) {
    await putFile(directory, `models/products/${id}/manifest.json`, JSON.stringify({
      id, displayName: id, variants: ["default"], sourceUrls: [],
      runtime: { renderer: "parametric", catalogId },
    }));
  }
  await putFile(directory, "artifacts/visual/latest/report/results.json", JSON.stringify({
    status: "passed", errors: [],
    tests: [{ name: "inventory fixture input", status: "passed", screenshots: [], failures: [] }],
  }));
  for (const [model, view] of shots) {
    // Only exercise inventory file-existence checks. These are not render evidence.
    await putFile(directory, `artifacts/visual/latest/models/${model}/${model}--default--${view}.png`, "INVENTORY_TEST_FIXTURE");
  }
  return directory;
}

async function runInventory(directory: string, model = "", view = "") {
  const result = spawnSync(process.execPath, ["--import", loader, script, "models"], {
    cwd: directory, encoding: "utf8", timeout: 20_000,
    env: { ...process.env, VISUAL_MODEL: model, VISUAL_VIEW: view, VISUAL_BROWSER_CHANNEL: "" },
  });
  assert.equal(result.error, undefined);
  const manifest = JSON.parse(await readFile(path.join(directory, "artifacts/visual/latest/report/manifest.json"), "utf8"));
  return { result, manifest };
}

test("a focused model/view review accepts its requested captures and retains unrequested inventory rows", async (t) => {
  const directory = await fixture(t, [[chair, "front"]]);
  const { result, manifest } = await runInventory(directory, chair, "front");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(manifest.models.length, 4);
  assert.equal(manifest.coverage.expectedModelScreenshots, 2);
  assert.equal(manifest.coverage.missingScreenshots, 0);
  assert.equal(manifest.models.find((row: { modelId: string }) => row.modelId === table).coverage, "not-requested");
  assert.equal(manifest.models.find((row: { modelId: string }) => row.modelId === "fixture-kaleo-alias").coverage, "captured");
  assert.equal(manifest.models.find((row: { modelId: string }) => row.modelId === "fixture-unmapped").coverage, "not-renderable");
  assert.deepEqual(manifest.selection, { modelId: chair, views: ["front"] });
  assert.equal(manifest.fidelityStatus, "not-reviewed");
});

test("a model-only review still requires its four standard views", async (t) => {
  const directory = await fixture(t, views.map((view) => [chair, view]));
  const { result, manifest } = await runInventory(directory, chair);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(manifest.coverage.expectedModelScreenshots, 8);
  assert.equal(manifest.coverage.missingScreenshots, 0);
});

test("a view-only review captures that perspective for all mapped models", async (t) => {
  const directory = await fixture(t, [[chair, "front"], [table, "front"]]);
  const { result, manifest } = await runInventory(directory, "", "front");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(manifest.coverage.expectedModelScreenshots, 3);
  assert.equal(manifest.coverage.missingScreenshots, 0);
});

test("an unfiltered review accepts the complete four-view set while preserving mapping gaps", async (t) => {
  const directory = await fixture(t, [chair, table].flatMap((model) => views.map((view): [string, string] => [model, view])));
  const { result, manifest } = await runInventory(directory);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(manifest.coverage.expectedModelScreenshots, 12);
  assert.equal(manifest.coverage.missingScreenshots, 0);
  assert.equal(manifest.coverage.unmappedManifests, 1);
  assert.equal(manifest.technicalStatus, "passed-with-coverage-gaps");
});

test("missing required views still fail an unfiltered review", async (t) => {
  const directory = await fixture(t, [[chair, "front"], [table, "front"]]);
  const { result, manifest } = await runInventory(directory);
  assert.equal(result.status, 1);
  assert.equal(manifest.coverage.expectedModelScreenshots, 12);
  assert.equal(manifest.coverage.missingScreenshots, 9);
  assert.equal(manifest.technicalStatus, "failed");
});

for (const [model, view] of [["unknown-model", "front"], [chair, "unknown-view"]]) {
  test(`invalid selection ${model}/${view} cannot pass because unrelated captures exist`, async (t) => {
    const directory = await fixture(t, [chair, table].flatMap((id) => views.map((angle): [string, string] => [id, angle])));
    const { result, manifest } = await runInventory(directory, model, view);
    assert.equal(result.status, 1);
    assert.equal(manifest.technicalStatus, "failed");
    assert.ok(manifest.diagnostics.selectionError);
  });
}
