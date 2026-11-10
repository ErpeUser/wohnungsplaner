import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(root, "dist", "client");
const serverRoot = path.join(root, "dist", "server");
const assetDirectories = ["assets", "_next"];
let copied = 0;

for (const directory of assetDirectories) {
  const source = path.join(clientRoot, directory);
  const target = path.join(serverRoot, directory);
  try {
    await access(source);
  } catch {
    continue;
  }
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true, force: true });
  copied += 1;
}

if (copied === 0) {
  throw new Error("Der Vinext-Build enthält weder assets noch _next-Clientdateien.");
}

console.log("Client-Assets für den lokalen SSR-Adapter synchronisiert.");
