import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1));
const source = path.join(root, "dist", "client", "assets");
const target = path.join(root, "dist", "server", "assets");

await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, force: true });
console.log("Client-Assets für den lokalen SSR-Adapter synchronisiert.");
