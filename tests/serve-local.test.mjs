import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";

async function waitForServer(child, url) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`serve-local beendet sich mit Exit-Code ${child.exitCode}`);
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`serve-local war nicht erreichbar: ${lastError}`);
}

function requestRaw(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: "127.0.0.1", port, path, ...options }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    request.on("error", reject);
    request.end();
  });
}

test("serve-local startet mit Node-Shim und setzt Schutzheader", async (t) => {
  const port = 35000 + (process.pid % 1000);
  const child = spawn(process.execPath, ["serve-local.mjs"], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill("SIGTERM"));

  const root = await waitForServer(child, `http://127.0.0.1:${port}/`);
  assert.equal(root.status, 200);
  assert.equal(root.headers.get("x-content-type-options"), "nosniff");
  assert.equal(root.headers.get("x-frame-options"), "DENY");
  assert.match(await root.text(), /Raumplaner/);

  const method = await fetch(`http://127.0.0.1:${port}/`, { method: "POST" });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET, HEAD");

  const traversal = await requestRaw(port, "/planner-assets/%2e%2e/package.json");
  assert.ok([400, 404].includes(traversal.status));
  assert.doesNotMatch(traversal.body, /\"scripts\"/);
});
