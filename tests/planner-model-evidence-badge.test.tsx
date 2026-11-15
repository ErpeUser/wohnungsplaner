import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { useStore } from "zustand";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import type { PlannerPlacement } from "../app/planner/domain/types.ts";
import { createCatalogPlacement } from "../app/planner/plan-2d/use-plan-interactions.ts";
import { createPlannerStore, type PlannerStore } from "../app/planner/store/planner-store.ts";
import { getTableModelForCatalogId, metresFromCentimetres } from "../app/planner/tables/table-models.ts";
import { InspectorPanel } from "../app/planner/workspace/inspector-panel.tsx";

const ADDED_ID = "evidence-preview-object";

function Inspector({ store }: { store: PlannerStore }) {
  const state = useStore(store);
  return <InspectorPanel document={state.document} selectionId={state.selectionId} dispatch={state.dispatch} select={state.select} />;
}

function setup(catalogId: string, update?: (placement: PlannerPlacement) => void) {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const placement = createCatalogPlacement(getFurnitureCatalogItem(catalogId)!, "zimmer2", { x: 1.8, z: 10.35 }, ADDED_ID);
  update?.(placement);
  document.placements.push(placement);
  const before = structuredClone(document);
  const store = createPlannerStore({ initialDocument: document });
  store.getState().select(placement.id);
  render(<Inspector store={store} />);
  return { store, placement, before };
}

function currentModelText() {
  return screen.getByRole("region", { name: "Modellwechsel" }).querySelector(".planner-model-switcher__current")?.textContent;
}

test.each([
  ["chair-temu-swivel-upholstered", "Beleg geschätzt"],
  ["chair-temu-faux-leather-metal", "Beleg geschätzt"],
  ["chair-temu-velvet-swivel-arm", "Beleg geschätzt"],
  ["chair-kaleo-chenille-beige", "Beleg bestätigt"],
  ["chair-amber-chenille-beige", "Beleg bestätigt"],
])("new %s uses the recorded chair evidence despite generic confirmed placement metadata", (catalogId, expected) => {
  const { store, before, placement } = setup(catalogId);
  expect(placement.metadata?.confidence).toBe("confirmed");
  expect(currentModelText()).toContain(expected);
  expect(store.getState().document).toEqual(before);
  expect(store.getState().canUndo).toBe(false);
});

test.each([
  ["dining-table-aliexpress-100-140", "closed", "Beleg geschätzt"],
  ["dining-table-aliexpress-100-140", "extended", "Beleg geschätzt"],
  ["dining-table-temu-606997-120-160", "closed", "Beleg geschätzt"],
  ["dining-table-temu-606997-120-160", "extended", "Beleg geschätzt"],
  ["dining-table-kaufland-567080013-120-160", "closed", "Beleg bestätigt"],
  ["dining-table-kaufland-567080013-120-160", "extended", "Beleg bestätigt"],
  ["dining-table-temu-609726-110-150", "closed", "Beleg bestätigt"],
  ["dining-table-temu-609726-110-150", "extended", "Beleg bestätigt"],
])("%s %s reads the matching recorded table variant without altering its dimensions", (catalogId, variantId, expected) => {
  const variant = getTableModelForCatalogId(catalogId)!.variants.find((item) => item.id === variantId)!;
  const { store, before } = setup(catalogId, (placement) => { placement.size = metresFromCentimetres(variant.sizeCm); });
  expect(currentModelText()).toContain(expected);
  expect(store.getState().document).toEqual(before);
  expect(store.getState().canUndo).toBe(false);
});

test.each(["chair-kaleo-chenille-beige", "dining-table-kaufland-567080013-120-160"])("unrecorded %s dimensions never inherit a confirmed product badge", (catalogId) => {
  const { store, before } = setup(catalogId, (placement) => { placement.size.height += 0.02; });
  expect(currentModelText()).toContain("Beleg unklar");
  expect(currentModelText()).not.toContain("Beleg bestätigt");
  expect(store.getState().document).toEqual(before);
});

test("an explicit estimated placement remains estimated even when its product source is confirmed", () => {
  const { store, before } = setup("chair-kaleo-chenille-beige", (placement) => {
    placement.metadata = { ...placement.metadata, confidence: "estimated" };
  });
  expect(currentModelText()).toContain("Beleg geschätzt");
  expect(store.getState().document).toEqual(before);
});

test("a legacy dining slot with no product evidence is unclear despite confirmed placement metadata", () => {
  const document = structuredClone(DEFAULT_APARTMENT_DOCUMENT);
  const chair = document.placements.find((placement) => placement.id === "living-kaleo-chair-west")!;
  chair.catalogId = "chair-dining";
  chair.size = { ...getFurnitureCatalogItem(chair.catalogId)!.defaultSize };
  chair.metadata = { ...chair.metadata, confidence: "confirmed" };
  const before = structuredClone(document);
  const store = createPlannerStore({ initialDocument: document });
  store.getState().select(chair.id);
  render(<Inspector store={store} />);
  expect(currentModelText()).toContain("Beleg unklar");
  expect(currentModelText()).not.toContain("Beleg bestätigt");
  expect(store.getState().document).toEqual(before);
});

test("the original Bozan keeps its documented catalogue evidence", () => {
  const store = createPlannerStore({ initialDocument: structuredClone(DEFAULT_APARTMENT_DOCUMENT) });
  store.getState().select("living-bozan-table");
  const before = structuredClone(store.getState().document);
  render(<Inspector store={store} />);
  expect(currentModelText()).toContain("Beleg bestätigt");
  expect(store.getState().document).toEqual(before);
});

test("draft selection does not change the current object's evidence, and Apply plus Undo follow the actual model", async () => {
  const user = userEvent.setup();
  const { store, before } = setup("chair-kaleo-chenille-beige");
  expect(currentModelText()).toContain("Beleg bestätigt");
  await user.selectOptions(screen.getByRole("combobox", { name: "Stuhlmodell" }), "temu-faux-leather-metal");
  expect(currentModelText()).toContain("Beleg bestätigt");
  expect(store.getState().document).toEqual(before);
  await user.click(screen.getByRole("button", { name: "Auf diesen Stuhl anwenden" }));
  expect(currentModelText()).toContain("Beleg geschätzt");
  act(() => store.getState().undo());
  expect(currentModelText()).toContain("Beleg bestätigt");
  expect(store.getState().document.placements).toEqual(before.placements);
});
