import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { createPlannerHistory } from "../app/planner/store/history.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";
import type { PlannerAssetRecord, PlannerDocumentV3, PlannerPlacement } from "../app/planner/domain/types.ts";


test("blocks moving one dining chair onto another chair", () => {
  const west = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-kaleo-chair-west")!;
  const east = DEFAULT_APARTMENT_DOCUMENT.placements.find((item) => item.id === "living-kaleo-chair-east")!;

  const moved = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
    type: "movePlacement",
    placementId: west.id,
    position: east.position,
  });

  assert.equal(moved.document, DEFAULT_APARTMENT_DOCUMENT);
  assert.equal(moved.error?.code, "collision");
  assert.ok(moved.error?.collisions?.some((hit) => hit.entityId === east.id));
});

test("applies placement commands immutably and rejects hard collisions", () => {
  const original = commandDocument();
  const moved = applyPlannerCommand(original, {
    type: "movePlacement",
    placementId: "chair",
    position: { x: 2.4, z: 1.8 },
  });

  assert.equal(moved.error, undefined);
  assert.notEqual(moved.document, original);
  assert.deepEqual(original.placements[0].position, { x: 1, z: 2 });
  assert.deepEqual(moved.document.placements[0].position, { x: 2.4, z: 1.8 });

  const blocked = applyPlannerCommand(original, {
    type: "movePlacement",
    placementId: "chair",
    position: { x: 3.4, z: 3.4 },
  });
  assert.equal(blocked.document, original);
  assert.equal(blocked.error?.code, "collision");
  assert.ok(blocked.error?.collisions?.some((hit) => hit.kind === "built-in"));
});

test("accepts passage warnings without blocking the command", () => {
  const original = commandDocument();
  const result = applyPlannerCommand(original, {
    type: "movePlacement",
    placementId: "chair",
    position: { x: 1.79, z: 0.57 },
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.document.placements[0].position, { x: 1.79, z: 0.57 });
  assert.ok(result.warnings.some((hit) => hit.kind === "door-passage"));
});

test("changes only a placement material without revalidating its unchanged geometry", () => {
  const original = commandDocument();
  original.placements[0] = {
    ...original.placements[0],
    position: { x: 3.4, z: 3.4 },
    materialVariants: { main: "rug-old-pattern" },
  };

  const result = applyPlannerCommand(original, {
    type: "setPlacementMaterial",
    placementId: "chair",
    slot: "main",
    materialId: "fabric-sand",
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.document.placements[0].position, { x: 3.4, z: 3.4 });
  assert.deepEqual(result.document.placements[0].size, original.placements[0].size);
  assert.equal(result.document.placements[0].materialVariants?.main, "fabric-sand");
});

test("rejects material ids that are not in the planner material registry", () => {
  const result = applyPlannerCommand(commandDocument(), {
    type: "setPlacementMaterial",
    placementId: "chair",
    slot: "main",
    materialId: "not-a-planner-material",
  });

  assert.equal(result.error?.code, "invalid");
});

test("registers and removes imported assets through the same command history", () => {
  const asset: PlannerAssetRecord = {
    assetId: "import-chair-" + "a".repeat(12),
    name: "Import Chair",
    category: "Sitzen",
    mediaType: "model/gltf-binary",
    byteLength: 128,
    sha256: "a".repeat(64),
    normalizedSize: { width: 0.8, depth: 0.8, height: 0.9 },
    floorOffset: 0,
    pivot: "center",
    materialId: "object-neutral",
    license: "CC0-1.0",
    source: "manual-import",
    confidence: "estimated",
    notes: [],
    createdAt: "2026-11-10T00:00:00.000Z",
  };
  const registered = applyPlannerCommand(commandDocument(), { type: "registerAsset", asset });
  assert.equal(registered.error, undefined);
  assert.equal(registered.document.assets?.[0].assetId, asset.assetId);
  const removed = applyPlannerCommand(registered.document, { type: "removeAsset", assetId: asset.assetId });
  assert.equal(removed.error, undefined);
  assert.deepEqual(removed.document.assets, []);
});

test("moves every member of a linked furniture group by the same delta", () => {
  const original = commandDocument();
  original.placements = [
    { ...placement("table", "room-a", { x: 1.5, z: 2 }, 0.8, 0.8), groupId: "dining-group" },
    { ...placement("chair-left", "room-a", { x: 0.95, z: 2 }, 0.4, 0.4), groupId: "dining-group" },
    { ...placement("chair-right", "room-a", { x: 2.05, z: 2 }, 0.4, 0.4), groupId: "dining-group" },
    placement("lamp", "room-a", { x: 3.4, z: 1 }, 0.2, 0.2),
  ];

  const moved = applyPlannerCommand(original, {
    type: "movePlacement",
    placementId: "chair-left",
    position: { x: 1.15, z: 2.3 },
  });

  assert.equal(moved.error, undefined);
  assert.deepEqual(moved.document.placements.map((item) => item.position), [
    { x: 1.7, z: 2.3 },
    { x: 1.15, z: 2.3 },
    { x: 2.25, z: 2.3 },
    { x: 3.4, z: 1 },
  ]);
  assert.deepEqual(original.placements[0].position, { x: 1.5, z: 2 });
});

test("adds, resizes, rotates, and removes movable placements", () => {
  const original = commandDocument();
  const addedItem = placement("table", "room-a", { x: 2.5, z: 2.8 }, 0.6, 0.6);
  const added = applyPlannerCommand(original, { type: "addPlacement", placement: addedItem });
  assert.equal(added.error, undefined);
  assert.equal(added.document.placements.length, 2);

  const resized = applyPlannerCommand(added.document, {
    type: "resizePlacement",
    placementId: "table",
    size: { width: 0.8, depth: 0.7, height: 0.75 },
  });
  assert.deepEqual(resized.document.placements[1].size, { width: 0.8, depth: 0.7, height: 0.75 });

  const rotated = applyPlannerCommand(resized.document, {
    type: "rotatePlacement",
    placementId: "table",
    rotation: 90,
  });
  assert.equal(rotated.document.placements[1].rotation, 90);

  const removed = applyPlannerCommand(rotated.document, { type: "removePlacement", placementId: "table" });
  assert.equal(removed.document.placements.some((item) => item.id === "table"), false);
});

test("rejects an unknown target room before geometry inspection", () => {
  const original = commandDocument();
  const result = applyPlannerCommand(original, {
    type: "addPlacement",
    placement: placement("unknown-room-item", "missing-room", { x: 1, z: 1 }, 0.4, 0.4),
  });

  assert.equal(result.document, original);
  assert.equal(result.error?.code, "not-found");
});

test("treats the document id as reserved", () => {
  const original = commandDocument();
  const result = applyPlannerCommand(original, {
    type: "addPlacement",
    placement: placement(original.id, "room-a", { x: 2.5, z: 2.8 }, 0.4, 0.4),
  });

  assert.equal(result.error?.code, "duplicate-id");
});

test("transfers placements atomically only when fully inside the target room", () => {
  const original = commandDocument();
  const accepted = applyPlannerCommand(original, {
    type: "transferPlacement",
    placementId: "chair",
    roomId: "room-b",
    position: { x: 5, z: 2 },
  });
  assert.equal(accepted.error, undefined);
  assert.equal(accepted.document.placements[0].roomId, "room-b");
  assert.deepEqual(accepted.document.placements[0].position, { x: 5, z: 2 });

  const rejected = applyPlannerCommand(original, {
    type: "transferPlacement",
    placementId: "chair",
    roomId: "room-b",
    position: { x: 4.01, z: 2 },
  });
  assert.equal(rejected.document, original);
  assert.equal(rejected.error?.code, "collision");
  assert.equal(original.placements[0].roomId, "room-a");
});

test("keeps built-ins locked while changing doors and room materials", () => {
  const original = commandDocument();
  const locked = applyPlannerCommand(original, {
    type: "removePlacement",
    placementId: "builtin-cabinet",
  });
  assert.equal(locked.document, original);
  assert.equal(locked.error?.code, "locked");

  const opened = applyPlannerCommand(original, { type: "toggleDoor", openingId: "door-main" });
  assert.equal(opened.document.doorStates["door-main"], "open");
  assert.equal(original.doorStates["door-main"], "closed");

  const surfaced = applyPlannerCommand(opened.document, {
    type: "setSurfaceMaterial",
    roomId: "room-a",
    surface: "floor",
    materialId: "porcelain-light",
  });
  assert.equal(surfaced.document.rooms[0].surfaces.floor, "porcelain-light");
});

test("supports undo, redo, and drops redo after a new document", () => {
  const first = commandDocument();
  const second = applyPlannerCommand(first, {
    type: "movePlacement",
    placementId: "chair",
    position: { x: 2, z: 2 },
  }).document;
  const third = applyPlannerCommand(second, {
    type: "rotatePlacement",
    placementId: "chair",
    rotation: 90,
  }).document;
  const history = createPlannerHistory(first);

  history.push(second);
  history.push(third);
  assert.equal(history.canUndo(), true);
  assert.equal(history.undo(), second);
  assert.equal(history.undo(), first);
  assert.equal(history.canUndo(), false);
  assert.equal(history.redo(), second);

  history.push(third);
  assert.equal(history.canRedo(), false);
  assert.equal(history.redo(), third);
});

test("keeps selection, camera, view, and panels outside document history", () => {
  const store = createPlannerStore({ initialDocument: commandDocument() });
  store.getState().select("chair");
  store.getState().setViewMode("3d");
  store.getState().setCameraMode("walk");
  store.getState().setPanel("catalog", true);
  store.getState().dispatch({
    type: "movePlacement",
    placementId: "chair",
    position: { x: 2.2, z: 2 },
  });

  assert.equal(store.getState().canUndo, true);
  store.getState().undo();
  assert.deepEqual(store.getState().document.placements[0].position, { x: 1, z: 2 });
  assert.equal(store.getState().selectionId, "chair");
  assert.equal(store.getState().viewMode, "3d");
  assert.equal(store.getState().cameraMode, "walk");
  assert.equal(store.getState().panels.catalog, true);

  store.getState().redo();
  assert.deepEqual(store.getState().document.placements[0].position, { x: 2.2, z: 2 });
});

test("persists room and overlay preferences in the document and restores them on replace", () => {
  const store = createPlannerStore({ initialDocument: commandDocument() });
  store.getState().setActiveRoom("room-b");
  store.getState().setOverlay("dimensions", true);

  assert.equal(store.getState().document.viewPreferences.activeRoomId, "room-b");
  assert.equal(store.getState().document.viewPreferences.overlays.dimensions, true);

  const replacement = structuredClone(store.getState().document);
  replacement.viewPreferences.activeRoomId = "room-a";
  replacement.viewPreferences.overlays.dimensions = false;
  store.getState().replaceDocument(replacement);

  assert.equal(store.getState().activeRoomId, "room-a");
  assert.equal(store.getState().overlays.dimensions, false);
});

function placement(
  id: string,
  roomId: string,
  position: { x: number; z: number },
  width = 0.04,
  depth = 0.04,
): PlannerPlacement {
  return {
    id,
    roomId,
    catalogId: `catalog-${id}`,
    position,
    rotation: 0,
    size: { width, depth, height: 0.8 },
  };
}

function commandDocument(): PlannerDocumentV3 {
  return {
    schemaVersion: 3,
    id: "command-document",
    name: "Command fixture",
    updatedAt: "2026-10-24T08:00:00.000Z",
    walls: [
      { id: "a-south", start: { x: 0, z: 0 }, end: { x: 4, z: 0 }, thickness: 0.12, height: 2.6, roomIds: ["room-a"] },
      { id: "shared", start: { x: 4, z: 0 }, end: { x: 4, z: 4 }, thickness: 0.12, height: 2.6, roomIds: ["room-a", "room-b"] },
      { id: "a-north", start: { x: 4, z: 4 }, end: { x: 0, z: 4 }, thickness: 0.12, height: 2.6, roomIds: ["room-a"] },
      { id: "a-west", start: { x: 0, z: 4 }, end: { x: 0, z: 0 }, thickness: 0.12, height: 2.6, roomIds: ["room-a"] },
      { id: "b-south", start: { x: 4, z: 0 }, end: { x: 8, z: 0 }, thickness: 0.12, height: 2.6, roomIds: ["room-b"] },
      { id: "b-east", start: { x: 8, z: 0 }, end: { x: 8, z: 4 }, thickness: 0.12, height: 2.6, roomIds: ["room-b"] },
      { id: "b-north", start: { x: 8, z: 4 }, end: { x: 4, z: 4 }, thickness: 0.12, height: 2.6, roomIds: ["room-b"] },
    ],
    rooms: [
      {
        id: "room-a",
        name: "Room A",
        area: 16,
        includedInWnf: true,
        boundary: [
          { wallId: "a-south", direction: 1 },
          { wallId: "shared", direction: 1 },
          { wallId: "a-north", direction: 1 },
          { wallId: "a-west", direction: 1 },
        ],
        surfaces: { floor: "oak", walls: "white", ceiling: "white" },
      },
      {
        id: "room-b",
        name: "Room B",
        area: 16,
        includedInWnf: true,
        boundary: [
          { wallId: "b-south", direction: 1 },
          { wallId: "b-east", direction: 1 },
          { wallId: "b-north", direction: 1 },
          { wallId: "shared", direction: -1 },
        ],
        surfaces: { floor: "oak", walls: "white", ceiling: "white" },
      },
    ],
    openings: [{
      id: "door-main",
      label: "Main door",
      wallId: "a-south",
      offset: 1,
      width: 0.8,
      height: 2.05,
      sill: 0,
      kind: "door",
      hinge: "start",
      swingDirection: 1,
      swingDegrees: 90,
    }],
    builtIns: [{
      id: "builtin-cabinet",
      label: "Cabinet",
      roomId: "room-a",
      kind: "storage",
      position: { x: 3.4, z: 3.4 },
      rotation: 0,
      size: { width: 0.8, depth: 0.8, height: 2 },
      locked: true,
    }],
    fixtures: [],
    placements: [placement("chair", "room-a", { x: 1, z: 2 })],
    doorStates: { "door-main": "closed" },
    viewPreferences: {
      activeRoomId: "room-a",
      overlays: { dimensions: false, fixtures: true, evidence: false },
    },
  };
}
