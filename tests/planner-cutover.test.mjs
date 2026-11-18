import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { startProductionServer } from "./support/local-production-server.mjs";

const projectRoot = new URL("../", import.meta.url);
let serverPromise;

async function getWorker() {
  serverPromise ??= startProductionServer();
  const server=await serverPromise;
  return { fetch: (target, options) => {
    const url=new URL(target);
    return server.fetch(url.pathname+url.search, options);
  } };
}

after(async () => {
  if (serverPromise) await (await serverPromise).stop();
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

test("does not expose private review references or private asset paths in the production worker", async () => {
  const worker = await getWorker();
  const review = await worker.fetch("http://localhost/dev/references/sofa-3seat/0");
  assert.equal(review.status, 404);
  for (const assetPath of [
    "/planner-assets/private-reference/wohnzimmer/reference.png",
    "/planner-assets/%72eference/wohnungsplan.png",
    "/planner-assets//reference/wohnungsplan.png",
    "/planner-assets/private%2dreference/wohnzimmer/reference.png",
    "/planner-assets/private-reference%2fwohnzimmer/reference.png",
    "/planner-assets/local-sources/fixture.txt",
    "/planner-assets/local%2dsources/fixture.txt",
  ]) {
    const privateAsset = await worker.fetch(`http://localhost${assetPath}`);
    assert.equal(privateAsset.status, 404, assetPath);
  }
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
