import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifestUrl = new URL("../dist/client/.vite/manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const browserEntry = manifest["virtual:vinext-app-browser-entry"];
const rootEntry = manifest["app/page.tsx"];
const workspaceEntry = manifest["app/planner/workspace/planner-workspace.tsx"];
const scene3dEntry = manifest["app/planner/scene-3d/planner-3d.tsx"];

assert.ok(browserEntry, "Vinext browser entry is missing");
assert.ok(workspaceEntry, "Planner workspace client entry is missing");
assert.ok(scene3dEntry, "Lazy 3D client entry is missing");

function staticClosure(entryKey) {
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    for (const dependency of manifest[key]?.imports ?? []) visit(dependency);
  };
  visit(entryKey);
  return [...seen].map((key) => ({ key, ...manifest[key] }));
}

const initialEntries = staticClosure("virtual:vinext-app-browser-entry");
const rootEntries = rootEntry ? staticClosure("app/page.tsx") : [];
const workspaceEntries = staticClosure("app/planner/workspace/planner-workspace.tsx");
const sceneEntries = staticClosure("app/planner/scene-3d/planner-3d.tsx");
const isThreeChunk = (entry) => /three(?:\.module)?|react-three|planner-3d/i.test(`${entry.key} ${entry.name ?? ""} ${entry.file ?? ""}`);

assert.equal(initialEntries.some(isThreeChunk), false, "Initial browser entry must not statically include Three/R3F");
assert.equal(rootEntries.some(isThreeChunk), false, "Root page must not statically include Three/R3F");
assert.equal(workspaceEntries.some(isThreeChunk), false, "2D workspace entry must not statically include Three/R3F");
assert.equal(sceneEntries.some(isThreeChunk), true, "Lazy 3D entry must include the Three chunk");
assert.ok(workspaceEntry.dynamicImports?.includes("app/planner/scene-3d/planner-3d.tsx"), "3D entry must remain a dynamic import");

console.log("Client bundle contract passed: 2D starts without Three; 3D remains lazy.");
