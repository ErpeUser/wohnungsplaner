import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import type { PlannerDocumentV3, PlannerPlacement } from "../app/planner/domain/types.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";

const tableId = "living-bozan-table";
const chairIds = [
  "living-kaleo-chair-west",
  "living-kaleo-chair-east",
  "living-kaleo-chair-south",
  "living-kaleo-chair-north",
];

test("switches exactly the selected dining chair and retains its saved placement and personal notes", () => {
  for (const placementId of chairIds) {
    const original = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    const selected = original.placements.find((item) => item.id === placementId)!;
    selected.rotation += 15;
    selected.wallId = original.walls[0].id;
    selected.materialVariants = { ...selected.materialVariants, userAccent: "metal-black" };
    selected.metadata = { ...selected.metadata, notes: ["Meine Notiz: diesen Sitzplatz am Fenster behalten."] };

    const result = applyPlannerCommand(original, {
      type: "setPlacementChairModel",
      placementId,
      modelId: "temu-faux-leather-metal",
    });

    assert.ok(result, "the single-chair command must return a result");
    assert.equal(result.error, undefined, placementId);
    const changed = result.document.placements.find((item) => item.id === placementId)!;
    assert.equal(changed.catalogId, "chair-temu-faux-leather-metal");
    assert.deepEqual(changed.size, { width: 0.58, depth: 0.5098, height: 0.7999 });
    assert.equal(changed.materialVariants?.main, "leather-temu-cream");
    assert.equal(changed.materialVariants?.userAccent, "metal-black");
    assert.equal(changed.id, selected.id);
    assert.deepEqual(changed.position, selected.position);
    assert.equal(changed.rotation, selected.rotation);
    assert.equal(changed.roomId, selected.roomId);
    assert.equal(changed.wallId, selected.wallId);
    assert.equal(changed.groupId, selected.groupId);
    assert.ok(changed.metadata?.notes?.includes("Meine Notiz: diesen Sitzplatz am Fenster behalten."));
    assert.equal(changed.metadata?.confidence, "estimated");
    assert.match(changed.metadata?.source ?? "", /601105793166093/);
    assert.deepEqual(
      result.document.placements.filter((item) => item.id !== placementId),
      original.placements.filter((item) => item.id !== placementId),
      "the table, three other chairs, and unrelated furniture stay unchanged",
    );
    assert.equal(selected.catalogId, "chair-aliexpress-woltu-1005013095870024", "the original document stays immutable");
  }
});

test("rejects missing, locked, non-chair, and unknown single-chair targets atomically", () => {
  const cases = [
    { placementId: "missing-chair", modelId: "temu-faux-leather-metal", code: "not-found" },
    { placementId: "builtin-living-tv", modelId: "temu-faux-leather-metal", code: "locked" },
    { placementId: tableId, modelId: "temu-faux-leather-metal", code: "invalid" },
    { placementId: chairIds[0], modelId: "unknown-chair", code: "invalid" },
  ];
  for (const { placementId, modelId, code } of cases) {
    const result = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, {
      type: "setPlacementChairModel", placementId, modelId,
    });
    assert.ok(result, "invalid single-chair commands must return an error result");
    assert.equal(result.error?.code, code);
    assert.equal(result.document, DEFAULT_APARTMENT_DOCUMENT);
  }
});

test("single-chair replacement exempts only the table and still blocks other chairs, built-ins, and room boundaries", () => {
  for (const obstacle of ["chair", "built-in", "room-boundary"] as const) {
    const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
    const selected = document.placements.find((item) => item.id === chairIds[0])!;
    if (obstacle === "chair") selected.position = { ...document.placements.find((item) => item.id === chairIds[1])!.position };
    if (obstacle === "room-boundary") selected.position = { x: -5, z: -5 };
    if (obstacle === "built-in") document.builtIns.push({
      id: "test-fixed-cabinet", label: "Fixed cabinet", roomId: selected.roomId,
      kind: "storage", position: { ...selected.position }, rotation: 0,
      size: { width: 0.3, depth: 0.3, height: 2 }, locked: true,
    });

    const result = applyPlannerCommand(document, {
      type: "setPlacementChairModel", placementId: selected.id, modelId: "temu-faux-leather-metal",
    });
    assert.ok(result, "the single-chair command must validate collision geometry");
    assert.equal(result.error?.code, "collision", obstacle);
    assert.equal(result.document, document, obstacle);
    assert.ok(result.error?.collisions?.some((hit) => hit.kind === (obstacle === "chair" ? "placement" : obstacle)), obstacle);
  }
});

test("chair rotation and resizing allow intended table overlap without moving the group", () => {
  const original = chairAtTableCentre();
  for (const command of [
    { type: "rotatePlacement" as const, placementId: chairIds[0], rotation: 90 },
    { type: "resizePlacement" as const, placementId: chairIds[0], size: { width: 0.6, depth: 0.6, height: 0.9 } },
  ]) {
    const result = applyPlannerCommand(original, command);
    assert.equal(result.error, undefined, command.type);
    assert.deepEqual(
      result.document.placements.filter((item) => item.id !== chairIds[0]),
      original.placements.filter((item) => item.id !== chairIds[0]),
    );
  }
});

test("chair rotation and resizing retain collisions against neighboring chairs", () => {
  const original = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  original.placements.find((item) => item.id === chairIds[0])!.position = {
    ...original.placements.find((item) => item.id === chairIds[1])!.position,
  };
  for (const command of [
    { type: "rotatePlacement" as const, placementId: chairIds[0], rotation: 90 },
    { type: "resizePlacement" as const, placementId: chairIds[0], size: { width: 0.6, depth: 0.6, height: 0.9 } },
  ]) {
    const result = applyPlannerCommand(original, command);
    assert.equal(result.error?.code, "collision", command.type);
    assert.equal(result.document, original);
    assert.ok(result.error?.collisions?.some((hit) => hit.entityId === chairIds[1]));
  }
});

test("table replacement preserves saved user metadata, transforms, and all four chairs through undo and redo", () => {
  const original = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const table = original.placements.find((item) => item.id === tableId)!;
  table.wallId = original.walls[0].id;
  table.metadata = { ...table.metadata, notes: ["Meine Notiz: Platz für den Kinderstuhl freihalten."] };
  const store = createPlannerStore({ initialDocument: original });
  const result = store.getState().dispatch({
    type: "setPlacementProduct", placementId: tableId,
    catalogId: "dining-table-kaufland-567080013-120-160",
    size: { width: 1.6, depth: 0.8, height: 0.755 }, materialId: "walnut",
    metadata: { notes: ["Zusätzliche persönliche Notiz."] },
  });
  assert.equal(result.error, undefined);
  const changed = result.document.placements.find((item) => item.id === tableId)!;
  assert.ok(changed.metadata?.notes?.includes("Meine Notiz: Platz für den Kinderstuhl freihalten."));
  assert.ok(changed.metadata?.notes?.includes("Zusätzliche persönliche Notiz."));
  assert.deepEqual(changed.position, table.position);
  assert.equal(changed.rotation, table.rotation);
  assert.equal(changed.roomId, table.roomId);
  assert.equal(changed.wallId, table.wallId);
  assert.equal(changed.groupId, table.groupId);
  assert.deepEqual(otherPlacements(result.document, tableId), otherPlacements(original, tableId));
  store.getState().undo();
  assert.deepEqual(store.getState().document.placements, original.placements);
  store.getState().redo();
  assert.deepEqual(store.getState().document.placements, result.document.placements);
});

test("single-chair replacement is one undoable action and redo restores only that chair", () => {
  const original = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const store = createPlannerStore({ initialDocument: original });
  const result = applyPlannerCommand(original, {
    type: "setPlacementChairModel", placementId: chairIds[2], modelId: "temu-faux-leather-metal",
  });
  assert.ok(result, "the single-chair command must exist before checking its store history");
  const changed = store.getState().dispatch({
    type: "setPlacementChairModel", placementId: chairIds[2], modelId: "temu-faux-leather-metal",
  });
  assert.equal(changed.error, undefined);
  store.getState().undo();
  assert.deepEqual(store.getState().document.placements, original.placements);
  assert.equal(store.getState().canUndo, false);
  store.getState().redo();
  assert.deepEqual(store.getState().document.placements, changed.document.placements);
  assert.deepEqual(otherPlacements(store.getState().document, chairIds[2]), otherPlacements(original, chairIds[2]));
});

test("undo and redo preserve the current room and overlay preferences in state and persistence data", () => {
  const store = createPlannerStore({ initialDocument: structuredClone(DEFAULT_APARTMENT_DOCUMENT) });
  store.getState().setActiveRoom("wohnkueche");
  store.getState().setOverlay("evidence", true);
  store.getState().select(chairIds[0]);
  const result = store.getState().dispatch({ type: "movePlacement", placementId: chairIds[0], position: { x: 2.1, z: 5 } });
  assert.equal(result.error, undefined);
  store.getState().undo();
  assert.equal(store.getState().activeRoomId, "wohnkueche");
  assert.equal(store.getState().document.viewPreferences.activeRoomId, "wohnkueche");
  assert.equal(store.getState().overlays.evidence, true);
  assert.equal(store.getState().document.viewPreferences.overlays.evidence, true);
  assert.equal(store.getState().selectionId, chairIds[0]);
  store.getState().setActiveRoom(null);
  store.getState().setOverlay("evidence", false);
  store.getState().redo();
  assert.equal(store.getState().activeRoomId, null);
  assert.equal(store.getState().document.viewPreferences.activeRoomId, null);
  assert.equal(store.getState().overlays.evidence, false);
  assert.equal(store.getState().document.viewPreferences.overlays.evidence, false);
  assert.deepEqual(store.getState().document.placements.find((item) => item.id === chairIds[0])?.position, { x: 2.1, z: 5 });
});

function otherPlacements(document: PlannerDocumentV3, placementId: string): PlannerPlacement[] {
  return document.placements.filter((item) => item.id !== placementId);
}

function chairAtTableCentre(): PlannerDocumentV3 {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  document.placements.find((item) => item.id === chairIds[0])!.position = {
    ...document.placements.find((item) => item.id === tableId)!.position,
  };
  return document;
}
