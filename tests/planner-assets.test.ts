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
  nextWalkFov,
  walkZoomCommandForKey,
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
    assert.equal(await verifyPlannerAssetBytes(asset, bytes), true, asset.id);
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

test("asset byte verification rejects a damaged payload", async () => {
  const asset = PLANNER_ASSET_MANIFEST.assets[0];
  assert.equal(await verifyPlannerAssetBytes(asset, new Uint8Array([0, 1, 2, 3])), false);
});

test("asset byte verification rejects same-length content with a wrong SHA-256", async () => {
  const asset = PLANNER_ASSET_MANIFEST.assets.find((candidate) => candidate.type === "model")!;
  const bytes = new Uint8Array(asset.byteLength);
  bytes.set([0x67, 0x6c, 0x54, 0x46]);
  assert.equal(await verifyPlannerAssetBytes(asset, bytes), false);
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

test("walk collision allows crossing a low rug placement", () => {
  const rug = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.catalogId === "rug-temu-rabbit-ivory-100x180")!;
  const rugOnlyDocument = {
    ...DEFAULT_APARTMENT_DOCUMENT,
    builtIns: [],
    placements: [rug],
  };

  assert.equal(isWalkPositionValid(rugOnlyDocument, rug.position, 0.05), true);
});

test("walk collision crosses floor finishes and the full thickness of interior doorways", () => {
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, { x: 1.5, z: 4.55 }, 0.22), true);
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, { x: -0.8, z: 5.5 }, 0.22), true);
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, { x: -0.08, z: 6.29 }, 0.22), true);

  const acrossHallDoor = moveWalkPosition(
    DEFAULT_APARTMENT_DOCUMENT,
    { x: -0.5, z: 6.29 },
    { x: 0.5, z: 6.29 },
    0.22,
  );
  assert.ok(Math.hypot(acrossHallDoor.x - 0.5, acrossHallDoor.z - 6.29) < 0.03);
  assert.equal(isWalkPositionValid(DEFAULT_APARTMENT_DOCUMENT, { x: 2.17, z: 3.8 }, 0.22), false);
});

test("camera policy keeps selection external and disables decorative motion when requested", () => {
  assert.equal(cameraTransitionDuration(true), 0);
  assert.ok(cameraTransitionDuration(false) > 0);
  const scene = createSceneModel(DEFAULT_APARTMENT_DOCUMENT, null);
  const before = JSON.stringify(DEFAULT_APARTMENT_DOCUMENT);
  createWalkStartPose(DEFAULT_APARTMENT_DOCUMENT, scene, null);
  assert.equal(JSON.stringify(DEFAULT_APARTMENT_DOCUMENT), before);
});

test("walk zoom uses plus and minus keys and keeps a usable field of view", () => {
  assert.equal(walkZoomCommandForKey({ code: "Equal", key: "+" }), "zoom-in");
  assert.equal(walkZoomCommandForKey({ code: "NumpadAdd", key: "+" }), "zoom-in");
  assert.equal(walkZoomCommandForKey({ code: "Minus", key: "-" }), "zoom-out");
  assert.equal(walkZoomCommandForKey({ code: "NumpadSubtract", key: "-" }), "zoom-out");
  assert.equal(walkZoomCommandForKey({ code: "KeyW", key: "w" }), null);
  assert.equal(nextWalkFov(42, "zoom-in"), 37);
  assert.equal(nextWalkFov(42, "zoom-out"), 47);
  assert.equal(nextWalkFov(24, "zoom-in"), 24);
  assert.equal(nextWalkFov(72, "zoom-out"), 72);
});
