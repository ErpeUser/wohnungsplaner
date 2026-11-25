import { act, render, screen, within } from "@testing-library/react";
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

  test.each([
    ["builtin-bath-mat", "27,20", "https://de.aliexpress.com/item/1005013137520536.html"],
    ["builtin-wc-mat", "21,84", "https://de.aliexpress.com/item/1005013137520536.html"],
    ["living-chicago-sofa", "437,49", "https://de.aliexpress.com/item/1005013379584796.html"],
  ])("shows the selected product's shopping price and link for %s", (id, price, url) => {
    setup(id);
    const data = screen.getByRole("region", { name: "Kaufdaten" });
    expect(data.textContent).toContain(price);
    expect(within(data).getByRole("link", { name: /Produkt bei AliExpress öffnen/ }).getAttribute("href")).toBe(url);
  });

  test("updates the purchase card when the WC wallboard variant changes", () => {
    const store = setup("builtin-wc-wallboard-artisan-80");
    const card = () => screen.getByRole("region", { name: "Kaufdaten" });
    expect(card().textContent).toContain("14,99");
    act(() => { store.getState().dispatch({ type: "setWcWallboard", optionId: "livetastic-90" }); });
    expect(card().textContent).toContain("44,91");
    expect(within(card()).getByRole("link", { name: /Produkt bei XXXLutz öffnen/ }).getAttribute("href")).toBe("https://www.xxxlutz.at/p/livetastic-wandboard-in-90-3-5-20-cm-naturfarben-000377013101");
  });

  test("shows an existing product link without inventing a missing price", () => {
    setup("builtin-bath-round-mirror");
    const data = screen.getByRole("region", { name: "Kaufdaten" });
    expect(data.textContent).toContain("Preis bei AliExpress prüfen");
    expect(within(data).getByRole("link", { name: /Produkt bei AliExpress öffnen/ }).getAttribute("href")).toContain("1005012515662602");
  });

  test("does not attach an unrelated purchase price or link to a fixed object", () => {
    setup("builtin-bath-tub");
    const data = screen.getByRole("region", { name: "Kaufdaten" });
    expect(data.textContent).toContain("Kein Einkaufsartikel hinterlegt");
    expect(within(data).queryByRole("link")).toBeNull();
  });

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

  test("switches directly among the four named seats and keeps model changes in undo redo history", async () => {
    const user = userEvent.setup();
    const store = setup("living-kaleo-chair-east");
    const before = store.getState().document;
    const chooser = screen.getByRole("combobox", { name: "Stuhl auswählen" });
    expect(chooser.querySelector("option:checked")?.getAttribute("value")).toBe("living-kaleo-chair-east");
    expect(within(chooser).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Stuhl 1 · WOLTU Chenille Drehstuhl · AliExpress", "Stuhl 2 · WOLTU Chenille Drehstuhl · AliExpress", "Stuhl 3 · WOLTU Chenille Drehstuhl · AliExpress", "Stuhl 4 · WOLTU Chenille Drehstuhl · AliExpress",
    ]);

    for (const id of ["living-kaleo-chair-west", "living-kaleo-chair-south", "living-kaleo-chair-north"]) {
      await user.selectOptions(screen.getByRole("combobox", { name: "Stuhl auswählen" }), id);
      expect(store.getState().selectionId).toBe(id);
      expect(store.getState().document).toBe(before);
      expect(store.getState().canUndo).toBe(false);
    }
    const inspector = screen.getByRole("region", { name: "Eigenschaften" });
    expect(inspector.querySelector(".planner-selection-summary strong")?.textContent).toBe("Stuhl 4 · WOLTU Chenille Drehstuhl · AliExpress");
    expect(inspector.querySelector(".planner-model-switcher__current strong")?.textContent).toBe("Stuhl 4 · WOLTU Chenille Drehstuhl · AliExpress");

    await user.selectOptions(screen.getByRole("combobox", { name: "Stuhlmodell" }), "temu-faux-leather-metal");
    await user.click(screen.getByRole("button", { name: "Auf diesen Stuhl anwenden" }));
    const after = store.getState().document;
    expect(after.placements.find((item) => item.id === "living-kaleo-chair-north")?.catalogId).toBe("chair-temu-faux-leather-metal");
    expect(after.placements.filter((item) => item.id !== "living-kaleo-chair-north")).toEqual(before.placements.filter((item) => item.id !== "living-kaleo-chair-north"));
    expect(inspector.querySelector(".planner-selection-summary strong")?.textContent).toBe("Stuhl 4 · Temu Kunstlederstuhl");
    act(() => store.getState().undo());
    expect(store.getState().document.placements).toEqual(before.placements);
    expect(store.getState().canUndo).toBe(false);
    act(() => store.getState().redo());
    expect(store.getState().document.placements).toEqual(after.placements);
    expect(store.getState().selectionId).toBe("living-kaleo-chair-north");
  });
});
