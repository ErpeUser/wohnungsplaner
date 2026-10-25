import assert from "node:assert/strict";
import test, { after } from "node:test";
import { unstable_dev } from "wrangler";

let workerPromise;

async function render(path = "/") {
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
  return (await workerPromise).fetch(`http://localhost${path}`, { headers: { accept: "text/html" } });
}

after(async () => {
  if (workerPromise) (await workerPromise).stop();
});

test("server-renders the planner product root", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html lang="de">/);
  assert.match(html, /Raumplaner/);
  assert.match(html, /2D-Ansicht/);
  assert.match(html, /Export &amp; Import/);
  assert.match(html, /59,49/);
  assert.match(html, /WNF/);
});

test("does not expose legacy studies or private source paths", async () => {
  const html = await (await render()).text();
  assert.doesNotMatch(html, /room-studies|bero-varianten|C:\\Users|file:\/\//i);
});
