import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import {
  PLANNER_ASSET_MANIFEST,
  resolveFurnitureAsset,
  verifyPlannerAssetBytes,
} from "../app/planner/catalog/asset-manifest.ts";
import { FURNITURE_CATALOG } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import {
  cameraTransitionDuration,
  createWalkStartPose,
  isWalkPositionValid,
  moveWalkPosition,
} from "../app/planner/scene-3d/camera-controller.tsx";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

test("planner asset manifest is local, licensed, hashed and meter-normalized", async () => {
  assert.ok(PLANNER_ASSET_MANIFEST.assets.length >= 8);
  for (const asset of PLANNER_ASSET_MANIFEST.assets) {
    assert.match(asset.path, /^\/planner-assets\//);
    assert.doesNotMatch(asset.path, /^https?:/);
    assert.match(asset.license.spdx, /^(CC0-1\.0|MIT)$/);
    assert.match(asset.license.sourceUrl, /^https:\/\//);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(asset.meterScale > 0);

    const bytes = await readFile(resolve(process.cwd(), "public", asset.path.slice(1)));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.id);
    assert.equal(verifyPlannerAssetBytes(asset, bytes), true, asset.id);
  }
});

test("every furniture item resolves to a local model or a deterministic parametric fallback", () => {
  for (const item of FURNITURE_CATALOG) {
    const resolution = resolveFurnitureAsset(item);
    assert.equal(resolution.itemId, item.id);
    assert.ok(resolution.kind === "gltf" || resolution.kind === "parametric");
    if (resolution.kind === "gltf") assert.match(resolution.asset.path, /^\/planner-assets\/models\//);
  }

  const sofa = FURNITURE_CATALOG.find((item) => item.id === "sofa-3seat")!;
  const healthy = resolveFurnitureAsset(sofa);
  assert.equal(healthy.kind, "gltf");
  const missing = resolveFurnitureAsset(sofa, new Set([healthy.kind === "gltf" ? healthy.asset.id : ""]));
  assert.deepEqual(missing, {
    kind: "parametric",
    itemId: sofa.id,
    fallback: sofa.fallback3d,
    reason: "asset-unavailable",
  });
});

test("asset byte verification rejects a damaged payload", () => {
  const asset = PLANNER_ASSET_MANIFEST.assets[0];
  assert.equal(verifyPlannerAssetBytes(asset, new Uint8Array([0, 1, 2, 3])), false);
});

test("walk camera starts inside the chosen scope and rejects walls, built-ins and exterior", () => {
  const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, "wohnkueche");
  const pose = createWalkStartPose(DEFAULT_APARTMENT_DOCUMENT, scene, "wohnkueche");
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, pose.position, 0.22), true);
  const viewLength = Math.hypot(pose.lookAt.x - pose.position.x, pose.lookAt.z - pose.position.z);
  const viewProbe = {
    x: pose.position.x + (pose.lookAt.x - pose.position.x) / viewLength * 0.4,
    z: pose.position.z + (pose.lookAt.z - pose.position.z) / viewLength * 0.4,
  };
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, viewProbe, 0.22), true);

  const builtIn = DEFAULT_APARTMENT_DOCUMENT.builtIns.find((item) => item.roomId === "wohnkueche")!;
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, builtIn.position, 0.22), false);
  const withSofa = {
    ...DEFAULT_APARTMENT_DOCUMENT,
    placements: [{
      id: "walk-sofa",
      roomId: "wohnkueche",
      catalogId: "sofa-3seat",
      position: pose.position,
      rotation: 0,
      size: { width: 2.2, depth: 0.92, height: 0.82 },
    }],
  };
  assert.equal(isWalkPositionValid(withSofa, pose.position, 0.22), false);
  assert.notDeepEqual(createWalkStartPose(withSofa, scene, "wohnkueche").position, pose.position);
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, { x: -20, z: -20 }, 0.22), false);

  const blocked = moveWalkPosition(DEFAULT_APARTMENT_DOCUMENT, pose.position, { x: -50, z: -50 }, 0.22);
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, blocked, 0.22), true);
});

test("camera policy keeps selection external and disables decorative motion when requested", () => {
  assert.equal(cameraTransitionDuration(true), 0);
  assert.ok(cameraTransitionDuration(false) > 0);
  const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
  const before = JSON.stringify(DEFAULT_APARTMENT_DOCUMENT);
  createWalkStartPose(DEFAULT_APARTMENT_DOCUMENT, scene, null);
  assert.equal(JSON.stringify(DEFAULT_APARTMENT_DOCUMENT), before);
});
