import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import {
  WC_WALLBOARD_BUILTIN_ID, WC_WALLBOARD_OPTIONS,
  getSelectedWcWallboardOption, wallboardDimensionLabel,
} from "../app/planner/domain/wc-wallboards.ts";
import { shoppingItemsForDocument, shoppingSubtotalForDocument, shoppingSubtotal } from "../app/planner/workspace/shopping-items.ts";
import { createSceneModel } from "../app/planner/scene-3d/scene-model.ts";

test("WC wallboard options preserve exact measured width, height and depth", () => {
  assert.deepEqual(WC_WALLBOARD_OPTIONS.map(({ articleId, widthCm, heightCm, depthCm }) => ({
    articleId, widthCm, heightCm, depthCm,
  })), [
    { articleId: "007326000408", widthCm: 80, heightCm: 3.8, depthCm: 23.5 },
    { articleId: "004201012302", widthCm: 90, heightCm: 3.8, depthCm: 23.5 },
    { articleId: "000377013101", widthCm: 90, heightCm: 3.5, depthCm: 20 },
  ]);
  assert.equal(wallboardDimensionLabel(WC_WALLBOARD_OPTIONS[2]), "90 × 3,5 × 20 cm");
});

test("switches the locked WC built-in and attached styling without moving the wall attachment", () => {
  let document = DEFAULT_APARTMENT_DOCUMENT;
  const original = document.builtIns.find((item) => item.id === WC_WALLBOARD_BUILTIN_ID)!;
  const originalRear = original.position.z - original.size.depth / 2;
  const otherBuiltIns = document.builtIns.filter((item) => item.id !== WC_WALLBOARD_BUILTIN_ID && item.id !== "builtin-wc-shelf-styling");
  for (const option of WC_WALLBOARD_OPTIONS) {
    const result = applyPlannerCommand(document, { type: "setWcWallboard", optionId: option.id });
    assert.equal(result.error, undefined);
    document = result.document;
    const board = document.builtIns.find((item) => item.id === WC_WALLBOARD_BUILTIN_ID)!;
    const styling = document.builtIns.find((item) => item.id === "builtin-wc-shelf-styling")!;
    assert.equal(board.catalogId, option.catalogId);
    assert.equal(board.size.width, option.widthCm / 100);
    assert.equal(board.size.depth, option.depthCm / 100);
    assert.equal(board.size.height, option.heightCm / 100);
    assert.ok(Math.abs(board.position.z - board.size.depth / 2 - originalRear) < 0.0001);
    assert.equal(board.position.x, original.position.x);
    assert.equal(board.elevation, original.elevation);
    assert.equal(styling.position.z, board.position.z);
    assert.ok(Math.abs((styling.elevation ?? 0) - (board.elevation ?? 0) - board.size.height) < 0.0001);
    assert.deepEqual(document.builtIns.filter((item) => item.id !== WC_WALLBOARD_BUILTIN_ID && item.id !== "builtin-wc-shelf-styling"), otherBuiltIns);
    const scene = createSceneModel(document, "wc");
    const sceneBoard = scene.builtIns.find((item) => item.id === WC_WALLBOARD_BUILTIN_ID)!;
    assert.deepEqual(sceneBoard.size, [option.widthCm / 100, option.heightCm / 100, option.depthCm / 100]);
  }
});

test("selected variant alone appears in shopping, changes subtotal, and round-trips", () => {
  for (const option of WC_WALLBOARD_OPTIONS) {
    const changed = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, { type: "setWcWallboard", optionId: option.id });
    assert.equal(changed.error, undefined);
    const restored = structuredClone(changed.document);
    assert.equal(getSelectedWcWallboardOption(restored).id, option.id);
    const items = shoppingItemsForDocument(restored);
    const boards = items.filter((item) => WC_WALLBOARD_OPTIONS.some((other) => other.articleId === item.id));
    assert.equal(boards.length, 1);
    assert.equal(boards[0].id, option.articleId);
    assert.equal(boards[0].url, option.sourceUrl);
    assert.equal(boards[0].retailer, option.retailer);
    assert.equal(boards[0].price, option.price);
    assert.equal(shoppingSubtotalForDocument(restored), Math.round((shoppingSubtotal - 14.99 + option.price) * 100) / 100);
  }
});

test("invalid selections do not mutate the plan", () => {
  const result = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, { type: "setWcWallboard", optionId: "unknown" as never });
  assert.equal(result.error?.code, "invalid");
  assert.equal(result.document, DEFAULT_APARTMENT_DOCUMENT);
});
