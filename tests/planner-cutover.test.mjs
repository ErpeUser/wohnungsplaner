import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { unstable_dev } from "wrangler";

const projectRoot = new URL("../", import.meta.url);
let workerPromise;

async function getWorker() {
  workerPromise ??= unstable_dev("dist/server/index.js", {
    config: "dist/server/wrangler.json",
    local: true,
    logLevel: "none",
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
      testMode: true,
      watch: false,
    },
  });
  return workerPromise;
}

after(async () => {
  if (workerPromise) (await workerPromise).stop();
});

test("the product root server-renders the V3 planner with a complete 2D fallback", async () => {
  const worker = await getWorker();
  const response = await worker.fetch("http://localhost/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Raumplaner/);
  assert.match(html, /Gesamtwohnung/);
  assert.match(html, /2D-Ansicht/);
  assert.match(html, /Wohnküche/);
  assert.match(html, /Zimmer 1/);
  assert.match(html, /Zimmer 2/);
  assert.match(html, /Vorraum/);
  assert.match(html, /Abstellraum/);
  assert.match(html, /Bad/);
  assert.match(html, /WC/);
  assert.match(html, /Loggia/);
  assert.match(html, /Balkon/);
  assert.doesNotMatch(html, /Bildstudie|Wand hinter dem Bett|Botanical Cocoon/);
});

test("the root is a thin V3 entry and no legacy renderer remains", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(source, /PlannerWorkspace/);
  assert.doesNotMatch(source, /use client|three|ApartmentPlan|ApartmentThreeView|room-studies/);

  const legacyFiles = [
    "app/apartment-3d.tsx",
    "app/apartment-plan.tsx",
    "app/apartment-3d-model.ts",
    "app/apartment-model.ts",
    "app/room-model.ts",
    "app/kitchen-model.ts",
    "app/living-room-model.ts",
    "app/wet-room-model.ts",
    "app/hall-variants.ts",
    "app/planner-storage.ts",
    "app/chatgpt-auth.ts",
  ];

  for (const file of legacyFiles) {
    await assert.rejects(access(new URL(file, projectRoot)), { code: "ENOENT" }, `${file} should be removed`);
  }
});
