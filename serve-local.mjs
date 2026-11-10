import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "./dist/server/index.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(root, "dist", "client");
const publicRoot = path.join(root, "public");
const port = Number(process.env.PORT || 3000);

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

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return res.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
    }
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const securityHeaders = {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss:;",
    };
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_next/")) {
      const file = safeClientPath(url.pathname);
      if (!file) return res.writeHead(400).end("Bad asset path");
      const data = await fs.readFile(file);
      return res.writeHead(200, { ...securityHeaders, "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "Content-Length": data.byteLength }).end(req.method === "HEAD" ? undefined : data);
    }
    if (url.pathname.startsWith("/planner-assets/") || url.pathname.startsWith("/room-studies/") || url.pathname.startsWith("/zimmer1-") || url.pathname.startsWith("/vorraum-") || url.pathname === "/og-v2.png" || url.pathname === "/og.png" || url.pathname === "/favicon.svg") {
      const file = safePublicPath(url.pathname);
      if (!file) return res.writeHead(400).end("Bad public path");
      const data = await fs.readFile(file);
      return res.writeHead(200, { ...securityHeaders, "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream", "Cache-Control": "public, max-age=3600", "Content-Length": data.byteLength }).end(req.method === "HEAD" ? undefined : data);
    }
    const response = await handler.fetch(new Request(url, { method: req.method, headers: req.headers }));
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, { ...securityHeaders, ...Object.fromEntries(response.headers) });
    return res.end(body);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Lokaler Raumplaner konnte die Anfrage nicht verarbeiten.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Lokaler Raumplaner läuft auf http://127.0.0.1:${port}`);
});
