import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { useStore } from "zustand";

import { getFurnitureCatalogItem } from "../app/planner/catalog/catalog.ts";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand, type PlannerCommand } from "../app/planner/domain/commands.ts";
import type { PlannerDocumentV3, PlannerPlacement } from "../app/planner/domain/types.ts";
import { createCatalogPlacement } from "../app/planner/plan-2d/use-plan-interactions.ts";
import { createPlannerStore, type PlannerStore } from "../app/planner/store/planner-store.ts";
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY, type PlannerRepository } from "../app/planner/store/persistence.ts";
import { InspectorPanel } from "../app/planner/workspace/inspector-panel.tsx";
import { DINING_CHAIR_IDS } from "../app/planner/workspace/placement-label.ts";
import { TableComparisonPanel } from "../app/planner/workspace/table-comparison-panel.tsx";

const ADDED_TABLE = "added-zimmer2-flieks";
const ADDED_CHAIR = "added-zimmer2-chair";
const ORIGINAL_TABLE = "living-bozan-table";

beforeEach(() => { window.localStorage.clear(); });

function Inspector({ store }: { store: PlannerStore }) {
  const state = useStore(store);
  return <InspectorPanel document={state.document} selectionId={state.selectionId} dispatch={state.dispatch} select={state.select} />;
}

function add(document: PlannerDocumentV3, catalogId: string, id: string, position = { x: 1.65, z: 10.25 }) {
  const placement = createCatalogPlacement(getFurnitureCatalogItem(catalogId)!, "zimmer2", position, id);
  placement.rotation = 15;
  placement.groupId = "added-zimmer2-group";
  placement.wallId = document.rooms.find((room) => room.id === "zimmer2")!.boundary[0].wallId;
  placement.materialVariants = { ...placement.materialVariants, userAccent: "metal-black" };
  placement.metadata = { ...placement.metadata, notes: [`Persönliche Notiz für ${id}`] };
  const result = applyPlannerCommand(document, { type: "addPlacement", placement });
  expect(result.error).toBeUndefined();
  return result.document;
}

function documentWithAddedModels() {
  let document = add(structuredClone(DEFAULT_APARTMENT_DOCUMENT), "dining-table-kaufland-567080013-120-160", ADDED_TABLE);
  document = add(document, "chair-kaleo-chenille-beige", ADDED_CHAIR, { x: 3.05, z: 11.25 });
  document.viewPreferences = { ...document.viewPreferences, activeRoomId: "zimmer2" };
  return document;
}

function setup(id: string, persist = false, initialDocument = documentWithAddedModels()) {
  const repository = persist ? createLocalStoragePlannerRepository(window.localStorage) : undefined;
  repository?.save(initialDocument);
  const store = createPlannerStore({ initialDocument, repository, autosaveDelayMs: 0 });
  store.getState().select(id);
  render(<Inspector store={store} />);
  return { store, repository };
}

function selected(document: PlannerDocumentV3, id: string): PlannerPlacement {
  return document.placements.find((item) => item.id === id)!;
}

function selectedValue(name: string) {
  return screen.getByRole("combobox", { name }).querySelector("option:checked")?.getAttribute("value");
}

function expectOnlyTargetChanged(before: PlannerDocumentV3, after: PlannerDocumentV3, id: string) {
  expect(after.placements.filter((item) => item.id !== id)).toEqual(before.placements.filter((item) => item.id !== id));
  const original = selected(before, id);
  const current = selected(after, id);
  for (const key of ["id", "roomId", "position", "rotation", "wallId", "groupId"] as const) expect(current[key]).toEqual(original[key]);
  expect(current.metadata?.notes).toContain(`Persönliche Notiz für ${id}`);
  expect(current.materialVariants?.userAccent).toBe("metal-black");
  for (const key of ["walls", "rooms", "builtIns", "openings", "assets"] as const) expect(after[key]).toEqual(before[key]);
}

async function expectPersisted(store: PlannerStore, repository: PlannerRepository, expected: PlannerDocumentV3) {
  await waitFor(() => expect(store.getState().autosaveStatus).toBe("saved"));
  expect(window.localStorage.getItem(PLANNER_STORAGE_KEY)).toBeTruthy();
  const reloaded = createPlannerStore({ initialDocument: structuredClone(DEFAULT_APARTMENT_DOCUMENT), repository });
  reloaded.getState().hydrate();
  expect(reloaded.getState().document.placements).toEqual(expected.placements);
  expect(reloaded.getState().document.viewPreferences.activeRoomId).toBe("zimmer2");
}

test("an added Flieks table exposes only its own model tab and persists extension through undo and redo", async () => {
  const user = userEvent.setup();
  const { store, repository } = setup(ADDED_TABLE, true);
  const before = store.getState().document;
  const persistedBefore = window.localStorage.getItem(PLANNER_STORAGE_KEY);
  const tab = screen.getByRole("tab", { name: "Tischmodell ändern" });
  expect(screen.queryByRole("tab", { name: "Stuhlmodell ändern" })).toBeNull();
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  await user.click(tab);
  await user.keyboard("{ArrowRight}{End}{Home}");
  expect(tab.getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tab);
  expect(selectedValue("Tischmodell")).toBe("kaufland-567080013-120-160");
  expect(selectedValue("Ausziehzustand")).toBe("closed");

  await user.selectOptions(screen.getByRole("combobox", { name: "Ausziehzustand" }), "extended");
  expect(store.getState().document).toBe(before);
  expect(window.localStorage.getItem(PLANNER_STORAGE_KEY)).toBe(persistedBefore);
  await user.click(screen.getByRole("button", { name: "Auf diesen Tisch anwenden" }));
  const after = store.getState().document;
  expect(selected(after, ADDED_TABLE).size).toEqual({ width: 1.6, depth: 0.8, height: 0.755 });
  expectOnlyTargetChanged(before, after, ADDED_TABLE);
  expect(store.getState().selectionId).toBe(ADDED_TABLE);
  await expectPersisted(store, repository!, after);

  act(() => store.getState().undo());
  expect(store.getState().document.placements).toEqual(before.placements);
  expect(store.getState().canUndo).toBe(false);
  expect(selectedValue("Ausziehzustand")).toBe("closed");
  await expectPersisted(store, repository!, before);
  act(() => store.getState().redo());
  expect(store.getState().document.placements).toEqual(after.placements);
  expect(store.getState().selectionId).toBe(ADDED_TABLE);
  expect(selectedValue("Ausziehzustand")).toBe("extended");
  await expectPersisted(store, repository!, after);
});

test("changing an added table model leaves the original dining table and every other placement intact", async () => {
  const user = userEvent.setup();
  const { store } = setup(ADDED_TABLE);
  const before = store.getState().document;
  await user.selectOptions(screen.getByRole("combobox", { name: "Tischmodell" }), "temu-606997-120-160");
  await user.click(screen.getByRole("button", { name: "Auf diesen Tisch anwenden" }));
  const after = store.getState().document;
  expect(selected(after, ADDED_TABLE).catalogId).toBe("dining-table-temu-606997-120-160");
  expectOnlyTargetChanged(before, after, ADDED_TABLE);
});

test("an added chair appears once beside the four original seats and changes independently through persistence and history", async () => {
  const user = userEvent.setup();
  const { store, repository } = setup(ADDED_CHAIR, true);
  const before = store.getState().document;
  expect(screen.queryByRole("tab", { name: "Tischmodell ändern" })).toBeNull();
  const chooser = screen.getByRole("combobox", { name: "Stuhl auswählen" });
  expect(selectedValue("Stuhl auswählen")).toBe(ADDED_CHAIR);
  expect(within(chooser).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([...DINING_CHAIR_IDS, ADDED_CHAIR]);
  await user.selectOptions(screen.getByRole("combobox", { name: "Stuhlmodell" }), "temu-faux-leather-metal");
  expect(store.getState().document).toBe(before);
  await user.click(screen.getByRole("button", { name: "Auf diesen Stuhl anwenden" }));
  const after = store.getState().document;
  expect(selected(after, ADDED_CHAIR).catalogId).toBe("chair-temu-faux-leather-metal");
  expectOnlyTargetChanged(before, after, ADDED_CHAIR);
  expect(store.getState().selectionId).toBe(ADDED_CHAIR);
  await expectPersisted(store, repository!, after);
  act(() => store.getState().undo());
  expect(store.getState().document.placements).toEqual(before.placements);
  expect(store.getState().canUndo).toBe(false);
  await expectPersisted(store, repository!, before);
  act(() => store.getState().redo());
  expect(store.getState().document.placements).toEqual(after.placements);
  await expectPersisted(store, repository!, after);

  await user.selectOptions(screen.getByRole("combobox", { name: "Stuhl auswählen" }), DINING_CHAIR_IDS[1]);
  expect(store.getState().selectionId).toBe(DINING_CHAIR_IDS[1]);
  expect(store.getState().document.placements).toEqual(after.placements);
  expect(screen.getAllByRole("tab")).toHaveLength(2);
});

test("the original dining chair cross-tab still targets its original table when another table exists", async () => {
  const user = userEvent.setup();
  const { store } = setup(DINING_CHAIR_IDS[1]);
  const before = store.getState().document;
  await user.click(screen.getByRole("tab", { name: "Tischmodell ändern" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Tischmodell" }), "kaufland-567080013-120-160");
  await user.click(screen.getByRole("button", { name: "Auf diesen Tisch anwenden" }));
  expect(selected(store.getState().document, ORIGINAL_TABLE).catalogId).toBe("dining-table-kaufland-567080013-120-160");
  expect(store.getState().document.placements.filter((item) => item.id !== ORIGINAL_TABLE)).toEqual(before.placements.filter((item) => item.id !== ORIGINAL_TABLE));
  await user.click(screen.getByRole("tab", { name: "Stuhlmodell ändern" }));
  expect(screen.queryByRole("button", { name: "Auf diesen Stuhl anwenden" })).toBeNull();
  await user.selectOptions(screen.getByRole("combobox", { name: "Stuhl auswählen" }), DINING_CHAIR_IDS[3]);
  expect(store.getState().selectionId).toBe(DINING_CHAIR_IDS[3]);
});

test.each(["sofa-3seat", "desk-standard", "chair-dining"])("%s does not gain comparison tabs or become an eligible model-switch target", (catalogId) => {
  const initial = add(structuredClone(DEFAULT_APARTMENT_DOCUMENT), catalogId, "unrelated-target");
  const { store } = setup("unrelated-target", false, initial);
  expect(screen.queryByRole("tablist", { name: "Modelle wechseln" })).toBeNull();
  for (const command of [
    { type: "setPlacementProduct", placementId: "unrelated-target", catalogId: "dining-table-kaufland-567080013-120-160", size: { width: 1.2, depth: 0.8, height: 0.755 }, materialId: "walnut" },
    { type: "setPlacementChairModel", placementId: "unrelated-target", modelId: "temu-faux-leather-metal" },
  ] satisfies PlannerCommand[]) {
    let result: ReturnType<typeof applyPlannerCommand> | undefined;
    act(() => { result = store.getState().dispatch(command); });
    expect(result!.error?.code).toBe("invalid");
    expect(store.getState().document).toBe(initial);
    expect(store.getState().canUndo).toBe(false);
  }
});

test("TableComparisonPanel preserves its omitted-ID default and never falls back when an explicit ID is missing", async () => {
  const user = userEvent.setup();
  const store = createPlannerStore({ initialDocument: documentWithAddedModels() });
  const view = render(<TableComparisonPanel document={store.getState().document} dispatch={store.getState().dispatch} select={store.getState().select} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Tischmodell" }), "kaufland-567080013-120-160");
  await user.click(screen.getByRole("button", { name: "Auf diesen Tisch anwenden" }));
  expect(store.getState().selectionId).toBe(ORIGINAL_TABLE);
  const beforeMissing = store.getState().document;
  view.rerender(<TableComparisonPanel key="missing" placementId="missing-table" document={beforeMissing} dispatch={store.getState().dispatch} select={store.getState().select} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Tischmodell" }), "aliexpress-100-140");
  expect(screen.getByRole("button", { name: "Auf diesen Tisch anwenden" }).hasAttribute("disabled")).toBe(true);
  expect(store.getState().document).toBe(beforeMissing);
});

test.each([ADDED_TABLE, ADDED_CHAIR])("registered target %s still rejects an out-of-room replacement atomically", (id) => {
  const initial = documentWithAddedModels();
  selected(initial, id).position = { x: -1, z: -1 };
  const command: PlannerCommand = id === ADDED_TABLE
    ? { type: "setPlacementProduct", placementId: id, catalogId: "dining-table-kaufland-567080013-120-160", size: { width: 1.6, depth: 0.8, height: 0.755 }, materialId: "walnut" }
    : { type: "setPlacementChairModel", placementId: id, modelId: "temu-faux-leather-metal" };
  const result = applyPlannerCommand(initial, command);
  expect(result.error?.code).toBe("collision");
  expect(result.document).toBe(initial);
  expect(result.error?.collisions?.some((hit) => hit.kind === "room-boundary")).toBe(true);
});
