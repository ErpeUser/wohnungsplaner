import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";

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
    env: { ...process.env, HOST: "", PORT: String(port), PLANNER_WRITE_PID: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill("SIGTERM"));

  const root = await waitForServer(child, `http://127.0.0.1:${port}/`);
  assert.equal(root.status, 200);
  assert.equal(root.headers.get("x-content-type-options"), "nosniff");
  assert.equal(root.headers.get("x-frame-options"), "DENY");
  assert.match(await root.text(), /Raumplaner/);

  // Local starts must leave other interfaces free on the same port.
  const otherInterface = http.createServer();
  await new Promise((resolve, reject) => {
    otherInterface.once("error", reject);
    otherInterface.listen(port, "127.0.0.2", resolve);
  });
  await new Promise((resolve) => otherInterface.close(resolve));

  const method = await fetch(`http://127.0.0.1:${port}/`, { method: "POST" });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET, HEAD");

  const traversal = await requestRaw(port, "/planner-assets/%2e%2e/package.json");
  assert.ok([400, 404].includes(traversal.status));
  const missingAsset = await requestRaw(port, "/planner-assets/does-not-exist.svg");
  assert.equal(missingAsset.status, 404);
  assert.doesNotMatch(traversal.body, /\"scripts\"/);
});

test("serve-local akzeptiert HOST für Container-Netzwerkschnittstellen", async (t) => {
  const port = 37000 + (process.pid % 1000);
  const child = spawn(process.execPath, ["serve-local.mjs"], {
    env: { ...process.env, HOST: "0.0.0.0", PORT: String(port), PLANNER_WRITE_PID: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill("SIGTERM"));

  await waitForServer(child, `http://127.0.0.1:${port}/`);
  const response = await fetch(`http://127.0.0.2:${port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Raumplaner/);
});

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.send("shutdown");
  await exited;
}

function managedServer(env) {
  // IPC emits the actual signal event so Windows also exercises graceful
  // cleanup; child.kill() on Windows terminates without running signal hooks.
  return spawn(process.execPath, ["--input-type=module", "--eval",
    "await import('./serve-local.mjs'); process.on('message', () => process.emit('SIGTERM'));"], {
    env,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
}

async function waitForPidFile(file) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { return await fs.readFile(file, "utf8"); } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  return fs.readFile(file, "utf8");
}

test("zweiter Testserver verändert die PID-Datei des Hauptservers nicht", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "planner-pid-"));
  const pidFile = path.join(directory, "server.pid");
  const children = [];
  t.after(async () => {
    for (const child of children) await stopServer(child);
    await fs.rm(pidFile, { force: true });
    await fs.rmdir(directory);
  });
  const port = 39000 + (process.pid % 1000);
  const env = { ...process.env, HOST: "127.0.0.1", PLANNER_PID_FILE: pidFile };
  const primary = managedServer({ ...env, PORT: String(port), PLANNER_WRITE_PID: "1" });
  children.push(primary);
  await waitForServer(primary, `http://127.0.0.1:${port}/`);
  assert.equal(await waitForPidFile(pidFile), `${primary.pid}\n`);

  const secondary = managedServer({ ...env, PORT: String(port + 1000), PLANNER_WRITE_PID: "0" });
  children.push(secondary);
  await waitForServer(secondary, `http://127.0.0.1:${port + 1000}/`);
  assert.equal(await fs.readFile(pidFile, "utf8"), `${primary.pid}\n`);
  await stopServer(secondary);
  assert.equal(await fs.readFile(pidFile, "utf8"), `${primary.pid}\n`);
  assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200);
  await stopServer(primary);
  await assert.rejects(fs.readFile(pidFile), { code: "ENOENT" });
});

test("Server entfernt beim Beenden keine fremde PID-Datei", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "planner-pid-"));
  const pidFile = path.join(directory, "server.pid");
  const port = 42000 + (process.pid % 1000);
  const child = managedServer({ ...process.env, HOST: "127.0.0.1", PORT: String(port), PLANNER_PID_FILE: pidFile, PLANNER_WRITE_PID: "1" });
  t.after(async () => {
    await stopServer(child);
    await fs.rm(pidFile, { force: true });
    await fs.rmdir(directory);
  });
  await waitForServer(child, `http://127.0.0.1:${port}/`);
  assert.equal(await waitForPidFile(pidFile), `${child.pid}\n`);
  await fs.writeFile(pidFile, "987654\n");
  await stopServer(child);
  assert.equal(await fs.readFile(pidFile, "utf8"), "987654\n");
});
