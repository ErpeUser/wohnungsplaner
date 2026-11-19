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

test("health identifies the serving revision without exposing unrelated environment values", async (t) => {
  const port = 39000 + (process.pid % 1000);
  const child = spawn(process.execPath, ["serve-local.mjs"], {
    env: {
      ...process.env, HOST: "127.0.0.1", PORT: String(port), PLANNER_WRITE_PID: "0",
      CODEX_SOURCE_COMMIT: "a".repeat(40), K_SERVICE: "wohnungsplaner-preview",
      K_REVISION: "wohnungsplaner-preview-00042-test", PRIVATE_TEST_VALUE: "not-for-health",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
  });
  const response = await waitForServer(child, `http://127.0.0.1:${port}/__codex/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    status: "ok", sourceCommit: "a".repeat(40), service: "wohnungsplaner-preview",
    revision: "wohnungsplaner-preview-00042-test", pid: child.pid,
  });
  const head = await fetch(`http://127.0.0.1:${port}/__codex/health`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

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

  const response = await waitForServer(child, `http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Raumplaner/);

  // Observe the kernel's wildcard binding directly. Requests to alternate
  // loopback addresses may be routed through a host proxy in CI sandboxes.
  const otherInterface = http.createServer();
  try {
    const alternateBind = await new Promise((resolve, reject) => {
      otherInterface.once("error", reject);
      otherInterface.listen(port, "127.0.0.2", () => resolve(true));
    }).catch((error) => {
      assert.equal(error?.code, "EADDRINUSE");
      return false;
    });
    if (process.platform !== "win32") assert.equal(alternateBind, false);
  } finally {
    if (otherInterface.listening) await new Promise((resolve) => otherInterface.close(resolve));
  }
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

test("serve-local sperrt private Referenzen auch bei kodierten oder doppelten Pfadtrennern", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "planner-private-paths-"));
  const port = 45000 + (process.pid % 1000);
  await fs.copyFile(new URL("../serve-local.mjs", import.meta.url), path.join(directory, "serve-local.mjs"));
  for (const folder of ["reference", "private-reference", "local-sources", "textures"]) {
    await fs.mkdir(path.join(directory, "public", "planner-assets", folder), { recursive: true });
  }
  await fs.writeFile(path.join(directory, "public", "planner-assets", "reference", "fixture.txt"), "PRIVATE_REFERENCE_SENTINEL");
  await fs.writeFile(path.join(directory, "public", "planner-assets", "private-reference", "fixture.txt"), "PRIVATE_REFERENCE_SENTINEL");
  await fs.writeFile(path.join(directory, "public", "planner-assets", "local-sources", "fixture.txt"), "PRIVATE_REFERENCE_SENTINEL");
  await fs.writeFile(path.join(directory, "public", "planner-assets", "textures", "oak sample.svg"), "<svg>public texture</svg>");
  const child = spawn(process.execPath, ["serve-local.mjs"], {
    cwd: directory,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), PLANNER_WRITE_PID: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    await fs.rm(directory, { recursive: true, force: true });
  });
  await waitForServer(child, `http://127.0.0.1:${port}/__codex/health`);
  const publicAsset = await requestRaw(port, "/planner-assets/textures/oak%20sample.svg");
  assert.equal(publicAsset.status, 200);
  assert.equal(publicAsset.body, "<svg>public texture</svg>");
  assert.match(publicAsset.headers["cache-control"] ?? "", /must-revalidate/);
  assert.match(publicAsset.headers.etag ?? "", /^W\/\"/);
  const revalidated = await requestRaw(port, "/planner-assets/textures/oak%20sample.svg", {
    headers: { "If-None-Match": publicAsset.headers.etag },
  });
  assert.equal(revalidated.status, 304);

  for (const target of [
    "/planner-assets/reference/fixture.txt",
    "/planner-assets/%72eference/fixture.txt",
    "/planner-assets//reference/fixture.txt",
    "/planner-assets/private%2dreference/fixture.txt",
    "/planner-assets/private-reference%2ffixture.txt",
    "/planner%2dassets/reference/fixture.txt",
    "/planner-assets/local-sources/fixture.txt",
    "/planner-assets/local%2dsources/fixture.txt",
  ]) {
    const response = await requestRaw(port, target);
    assert.equal(response.status, 404, target);
    assert.doesNotMatch(response.body, /PRIVATE_REFERENCE_SENTINEL/, target);
  }
});

test("serve-local erlaubt ausschließlich registrierte Produktbild-Origins im CSP-Header", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "planner-image-policy-"));
  const port = 47000 + (process.pid % 1000);
  await fs.copyFile(new URL("../serve-local.mjs", import.meta.url), path.join(directory, "serve-local.mjs"));
  const child = spawn(process.execPath, ["serve-local.mjs"], {
    cwd: directory,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), PLANNER_WRITE_PID: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    await fs.rm(directory, { recursive: true, force: true });
  });
  const response = await waitForServer(child, `http://127.0.0.1:${port}/__codex/health`);
  const directives = new Map((response.headers.get("content-security-policy") ?? "").split(";").map((value) => {
    const [name, ...sources] = value.trim().split(/\s+/);
    return [name, sources];
  }));
  assert.deepEqual(directives.get("img-src")?.sort(), [
    "'self'", "data:", "blob:",
    "https://media.moebelix.com", "https://img.kwcdn.com", "https://www.woltu.eu",
    "https://assets.wfcdn.com", "https://ae-pic-a1.aliexpress-media.com", "https://www.rathwood.com",
  ].sort());
  assert.deepEqual(directives.get("script-src"), ["'self'", "'unsafe-inline'", "'unsafe-eval'"]);
  assert.deepEqual(directives.get("connect-src"), ["'self'", "ws:", "wss:"]);
});
