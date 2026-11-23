import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { applyPlannerCommand } from "../app/planner/domain/commands.ts";
import { WcWallboardPicker } from "../app/planner/workspace/wc-wallboard-picker.tsx";
import { ShoppingListDrawer } from "../app/planner/workspace/shopping-list-drawer.tsx";

afterEach(cleanup);

describe("WC wallboard selector", () => {
  it("shows three accessible products and applies the selected option", () => {
    const dispatch = vi.fn((command: Parameters<typeof applyPlannerCommand>[1]) =>
      applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, command));
    render(<WcWallboardPicker document={DEFAULT_APARTMENT_DOCUMENT} dispatch={dispatch} />);
    const group = screen.getByRole("group", { name: "WC-Wandboard auswählen" });
    const options = within(group).getAllByRole("button");
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(options[2]);
    expect(dispatch).toHaveBeenCalledWith({ type: "setWcWallboard", optionId: "livetastic-90" });
    expect(within(group).getByRole("button", { name: /BOXXX/ })).toBeTruthy();
    expect(screen.getByText(/9 cm je Seite/)).toBeTruthy();
  });

  it("shopping drawer includes only selected Livetastic wallboard and its price", () => {
    const document = applyPlannerCommand(DEFAULT_APARTMENT_DOCUMENT, { type: "setWcWallboard", optionId: "livetastic-90" }).document;
    render(<ShoppingListDrawer document={document} dispatch={(command) => applyPlannerCommand(document, command)} onClose={() => {}} />);
    const article = screen.getByText("Livetastic Wandboard · 90 cm Naturfarben").closest("article");
    expect(article).not.toBeNull();
    expect(within(article!).getByText(/90 × 3,5 × 20 cm/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Wandboard Simple · 80 cm Eiche Artisan Dekor" })).toBeNull();
  });
});
