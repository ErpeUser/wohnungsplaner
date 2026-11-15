import http from "node:http";
import fs from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(root, "dist", "server");
const clientRoot = path.join(root, "dist", "client");
const publicRoot = path.join(root, "public");
const pidFile = path.resolve(root, process.env.PLANNER_PID_FILE || ".local/codex-server.pid");
const writePidEnabled = process.env.PLANNER_WRITE_PID !== "0";
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const MAX_STATIC_BYTES = 12 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 240;
const requestBuckets = new Map();
let runtimeHandler;
let runtimeError;
let shuttingDown = false;
let ownsPidFile = false;

async function loadRuntimeHandler() {
  try {
    return (await import("./dist/server/index.js")).default;
  } catch (error) {
    if (error?.code !== "ERR_UNSUPPORTED_ESM_URL_SCHEME" || !String(error?.message).includes("cloudflare:")) {
      runtimeError = error;
      return null;
    }
    const shimName = "cloudflare-workers-shim.mjs";
    const shimPath = path.join(serverRoot, shimName);
    const adapterName = `.local-node-index-${process.pid}.mjs`;
    const adapterPath = path.join(serverRoot, adapterName);
    const source = await fs.readFile(path.join(serverRoot, "index.js"), "utf8");
    await fs.writeFile(shimPath, "export const tracing = undefined;\n", "utf8");
    await fs.writeFile(adapterPath, source.replaceAll("cloudflare:workers", `./${shimName}`), "utf8");
    try {
      return (await import(`${pathToFileURL(adapterPath).href}?pid=${process.pid}`)).default;
    } catch (fallbackError) {
      runtimeError = fallbackError;
      return null;
    } finally {
      await fs.rm(adapterPath, { force: true }).catch(() => undefined);
      await fs.rm(shimPath, { force: true }).catch(() => undefined);
    }
  }
}

const runtimeHandlerPromise = loadRuntimeHandler().then((handler) => {
  runtimeHandler = handler;
  return handler;
});
const cleanupBuckets = setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [key, bucket] of requestBuckets) {
    if (bucket.startedAt < cutoff) requestBuckets.delete(key);
  }
}, RATE_WINDOW_MS);
cleanupBuckets.unref();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".hdr": "application/octet-stream",
  ".woff2": "font/woff2",
};

const safeClientPath = (pathname) => {
  let relative;
  try { relative = decodeURIComponent(pathname.slice(1)); } catch { return null; }
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) return null;
  const resolved = path.resolve(clientRoot, relative);
  return resolved.startsWith(path.resolve(clientRoot) + path.sep) ? resolved : null;
};

const safePublicPath = (pathname) => {
  let relative;
  try { relative = decodeURIComponent(pathname.slice(1)); } catch { return null; }
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) return null;
  const resolved = path.resolve(publicRoot, relative);
  return resolved.startsWith(path.resolve(publicRoot) + path.sep) ? resolved : null;
};

function isPrivateReferencePath(pathname) {
  try {
    // Match the decoded filesystem path, including Windows separators, before
    // a static adapter can turn an encoded spelling into a private directory.
    const normalized = path.posix.normalize(decodeURIComponent(pathname).replaceAll("\\", "/")).toLowerCase();
    return ["/planner-assets/private-reference", "/planner-assets/reference", "/planner-assets/local-sources", "/.codex-temp"].some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    );
  } catch {
    return true;
  }
}

const productImageSources = [
  "https://media.moebelix.com",
  "https://img.kwcdn.com",
  "https://www.woltu.eu",
  "https://assets.wfcdn.com",
  "https://ae-pic-a1.aliexpress-media.com",
  "https://www.rathwood.com",
].join(" ");

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: ${productImageSources}; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; connect-src 'self' ws: wss:;`,
};

function clientAddress(req) {
  return req.socket.remoteAddress || "unknown";
}

function consumeRateLimit(req) {
  const now = Date.now();
  const key = clientAddress(req);
  const bucket = requestBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

async function readStaticFile(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile()) throw Object.assign(new Error("Not a file"), { statusCode: 404 });
  if (stat.size > MAX_STATIC_BYTES) {
    throw Object.assign(new Error("Static asset too large"), { statusCode: 413 });
  }
  return { data: await fs.readFile(file), size: stat.size };
}

function fail(res, statusCode, message, extraHeaders = {}) {
  res.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  return res.end(message);
}

async function writePidFile() {
  if (!writePidEnabled) return;
  await fs.mkdir(path.dirname(pidFile), { recursive: true });
  await fs.writeFile(pidFile, `${process.pid}\n`, "utf8");
  ownsPidFile = true;
}

async function removePidFile() {
  if (!ownsPidFile) return;
  try {
    if ((await fs.readFile(pidFile, "utf8")).trim() === String(process.pid)) {
      await fs.rm(pidFile, { force: true });
    }
  } catch { /* cleanup is best effort during shutdown */ }
  ownsPidFile = false;
}

function removePidFileSync() {
  if (!ownsPidFile) return;
  try {
    if (readFileSync(pidFile, "utf8").trim() === String(process.pid)) {
      rmSync(pidFile, { force: true });
    }
  } catch { /* cleanup is best effort during process exit */ }
  ownsPidFile = false;
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(cleanupBuckets);
  await removePidFile();
  console.log(`Lokaler Raumplaner wird wegen ${signal} beendet.`);
  try {
    server.close(() => process.exit(0));
  } catch {
    process.exit(0);
  }
  setTimeout(() => process.exit(0), 2_000).unref();
}

const server = http.createServer(async (req, res) => {
  try {
    if (!consumeRateLimit(req)) {
      return fail(res, 429, "Zu viele Anfragen. Bitte später erneut versuchen.", { "Retry-After": "60" });
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return fail(res, 405, "Method not allowed", { Allow: "GET, HEAD" });
    }
    if ((req.url || "").length > 4096) return fail(res, 414, "Request-URI too long");
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (isPrivateReferencePath(url.pathname)) return fail(res, 404, "Not found");
    if (url.pathname === "/__codex/health") {
      const healthPayload = JSON.stringify({
        status: "ok",
        sourceCommit: process.env.CODEX_SOURCE_COMMIT || null,
        service: process.env.K_SERVICE || null,
        revision: process.env.K_REVISION || null,
        pid: process.pid,
      });
      return res.writeHead(200, {
        ...securityHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Length": Buffer.byteLength(healthPayload),
      }).end(req.method === "HEAD" ? undefined : healthPayload);
    }
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_next/")) {
      const file = safeClientPath(url.pathname);
      if (!file) return fail(res, 400, "Bad asset path");
      const { data, size } = await readStaticFile(file);
      return res.writeHead(200, { ...securityHeaders, "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "Content-Length": size }).end(req.method === "HEAD" ? undefined : data);
    }
    if (url.pathname.startsWith("/planner-assets/") || url.pathname.startsWith("/room-studies/") || url.pathname.startsWith("/zimmer1-") || url.pathname.startsWith("/vorraum-") || url.pathname === "/og-v2.png" || url.pathname === "/og.png" || url.pathname === "/favicon.svg") {
      const file = safePublicPath(url.pathname);
      if (!file) return fail(res, 400, "Bad public path");
      const { data, size } = await readStaticFile(file);
      return res.writeHead(200, { ...securityHeaders, "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream", "Cache-Control": "public, max-age=3600", "Content-Length": size }).end(req.method === "HEAD" ? undefined : data);
    }
    const handler = runtimeHandler ?? await runtimeHandlerPromise;
    if (!handler) {
      console.error(runtimeError);
      return fail(res, 503, "Der lokale Vinext-Server ist in dieser Node-Laufzeit nicht verfügbar.");
    }
    const response = await handler.fetch(new Request(url, { method: req.method, headers: req.headers }));
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, { ...securityHeaders, ...Object.fromEntries(response.headers) });
    return res.end(body);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR" || error?.statusCode === 404) {
      return fail(res, 404, "Not found");
    }
    console.error(error);
    return fail(res, error?.statusCode || 500, error?.statusCode === 413 ? "Asset ist zu groß." : "Lokaler Raumplaner konnte die Anfrage nicht verarbeiten.");
  }
});

server.listen(port, host, () => {
  void writePidFile().then(() => {
    console.log(`Lokaler Raumplaner läuft auf http://${host}:${port}`);
  }).catch(async (error) => {
    console.error("PID-Datei konnte nicht geschrieben werden.", error);
    await shutdown("startup-error");
  });
});

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("exit", removePidFileSync);
