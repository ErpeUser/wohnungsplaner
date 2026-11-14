import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { useStore } from "zustand";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createPlannerStore, type PlannerStore } from "../app/planner/store/planner-store.ts";
import { InspectorPanel } from "../app/planner/workspace/inspector-panel.tsx";

function Inspector({ store }: { store: PlannerStore }) {
  const state = useStore(store);
  return <InspectorPanel document={state.document} selectionId={state.selectionId} dispatch={state.dispatch} select={state.select} />;
}

function setup(id = "living-kaleo-chair-west") {
  const store = createPlannerStore({ initialDocument: structuredClone(DEFAULT_APARTMENT_DOCUMENT) });
  store.getState().select(id);
  render(<Inspector store={store} />);
  return store;
}

describe("inspector editing", () => {
  test("focusing and leaving an unchanged numeric field does not create history", async () => {
    const user = userEvent.setup();
    const store = setup();
    const before = store.getState().document;
    await user.click(screen.getByRole("spinbutton", { name: "Position X in Zentimetern" }));
    await user.tab();
    expect(store.getState().document).toBe(before);
    expect(store.getState().canUndo).toBe(false);
  });

  test("Escape cancels an edited coordinate without committing its draft", async () => {
    const user = userEvent.setup();
    const store = setup();
    const before = store.getState().document;
    const input = screen.getByRole("spinbutton", { name: "Position X in Zentimetern" });
    await user.clear(input);
    await user.type(input, "210");
    await user.keyboard("{Escape}");
    expect(store.getState().document).toBe(before);
    expect((input as HTMLInputElement).value).toBe("220");
    expect(store.getState().canUndo).toBe(false);
  });

  test("an empty coordinate is rejected without converting it to zero", async () => {
    const user = userEvent.setup();
    const store = setup();
    const before = store.getState().document;
    await user.clear(screen.getByRole("spinbutton", { name: "Position X in Zentimetern" }));
    await user.tab();
    expect(screen.getByRole("alert").textContent).toMatch(/gültige Zahl/);
    expect(store.getState().document).toBe(before);
    expect(store.getState().canUndo).toBe(false);
  });

  test("one coordinate edit requires one undo even after tabbing through another field", async () => {
    const user = userEvent.setup();
    const store = setup();
    const before = store.getState().document;
    const input = screen.getByRole("spinbutton", { name: "Position X in Zentimetern" });
    await user.clear(input);
    await user.type(input, "210");
    await user.tab();
    await user.tab();
    expect(store.getState().document.placements.find((p) => p.id === "living-kaleo-chair-west")?.position.x).toBe(2.1);
    act(() => store.getState().undo());
    expect(store.getState().document.placements).toEqual(before.placements);
    expect(store.getState().canUndo).toBe(false);
  });

  test("the compact chooser changes the selected east chair and keeps the other seats", async () => {
    const user = userEvent.setup();
    const store = setup("living-kaleo-chair-east");
    const before = store.getState().document;
    await user.selectOptions(screen.getByRole("combobox", { name: "Stuhlmodell" }), "temu-faux-leather-metal");
    await user.click(screen.getByRole("button", { name: "Auf diesen Stuhl anwenden" }));
    const after = store.getState().document;
    expect(after.placements.find((p) => p.id === "living-kaleo-chair-east")?.catalogId).toBe("chair-temu-faux-leather-metal");
    expect(after.placements.filter((p) => p.id !== "living-kaleo-chair-east")).toEqual(before.placements.filter((p) => p.id !== "living-kaleo-chair-east"));
    expect(after.placements.filter((p) => p.id.startsWith("living-kaleo-chair-")).length).toBe(4);
    expect(store.getState().selectionId).toBe("living-kaleo-chair-east");
    act(() => store.getState().undo());
    expect(store.getState().document.placements).toEqual(before.placements);
  });

  test("changing the selected object resets the model panel to the matching target", async () => {
    const user = userEvent.setup();
    const store = setup("living-bozan-table");
    await user.click(screen.getByRole("tab", { name: "Stuhlmodell ändern" }));
    expect(screen.getByRole("combobox", { name: "Stuhl auswählen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Auf diesen Stuhl anwenden" })).toBeNull();
    await user.selectOptions(screen.getByRole("combobox", { name: "Stuhl auswählen" }), "living-kaleo-chair-north");
    expect(store.getState().selectionId).toBe("living-kaleo-chair-north");
    expect(screen.getByRole("tab", { name: "Stuhlmodell ändern" }).getAttribute("aria-selected")).toBe("true");
  });
});
