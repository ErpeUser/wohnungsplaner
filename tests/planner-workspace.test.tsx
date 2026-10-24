import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-konva", () => ({
  Arc: () => null,
  Circle: () => null,
  Group: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Layer: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Line: () => null,
  Rect: () => null,
  Stage: ({ children }: React.PropsWithChildren) => <div data-konva-node="Stage">{children}</div>,
  Text: () => null,
}));

vi.mock("konva", () => ({ default: { pixelRatio: 1 } }));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";
import { PlannerWorkspace } from "../app/planner/workspace/planner-workspace.tsx";

describe("PlannerWorkspace", () => {
  test("offers compact room and 2D/3D controls", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    const room = screen.getByRole("combobox", { name: "Raum" });
    await user.selectOptions(room, "zimmer1");
    assert.equal(store.getState().activeRoomId, "zimmer1");

    const threeD = screen.getByRole("button", { name: "3D-Ansicht" });
    await user.click(threeD);
    assert.equal(threeD.getAttribute("aria-pressed"), "true");
    assert.equal(store.getState().viewMode, "3d");
  });

  test("collapses panels and exposes truthful undo and redo states", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    const catalogToggle = screen.getByRole("button", { name: "Katalog ausblenden" });
    await user.click(catalogToggle);
    assert.equal(catalogToggle.getAttribute("aria-expanded"), "false");
    assert.equal(screen.queryByRole("complementary", { name: "Möbelkatalog" }), null);

    const undo = screen.getByRole("button", { name: "Rückgängig" }) as HTMLButtonElement;
    const redo = screen.getByRole("button", { name: "Wiederholen" }) as HTMLButtonElement;
    assert.equal(undo.disabled, true);
    assert.equal(redo.disabled, true);

    act(() => {
      store.getState().dispatch({
        type: "setSurfaceMaterial",
        roomId: "zimmer1",
        surface: "floor",
        materialId: "oak-workspace-test",
      });
    });
    assert.equal(undo.disabled, false);
    await user.click(undo);
    assert.equal(redo.disabled, false);
  });

  test("announces autosave status in a stable status bar", () => {
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);
    act(() => store.getState().setAutosaveStatus("saved"));

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Lokal gespeichert");
    expect(status.textContent).toContain("59,49 m²");
  });

  test("restores focus when the non-modal details drawer closes", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    const trigger = screen.getByRole("button", { name: "Details öffnen" });
    await user.click(trigger);
    assert.ok(screen.getByRole("complementary", { name: "Plandetails" }));
    await user.click(screen.getByRole("button", { name: "Details schließen" }));
    assert.equal(screen.queryByRole("complementary", { name: "Plandetails" }), null);
    assert.equal(document.activeElement, trigger);

    await user.click(trigger);
    await user.keyboard("{Escape}");
    assert.equal(screen.queryByRole("complementary", { name: "Plandetails" }), null);
    assert.equal(document.activeElement, trigger);
  });

  test("keeps precise numeric alternatives available for selected furniture", () => {
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    act(() => store.getState().select(DEFAULT_APARTMENT_DOCUMENT.placements[0].id));
    render(<PlannerWorkspace store={store} />);

    assert.ok(screen.getByRole("spinbutton", { name: "Position X in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Position Y in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Breite in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Tiefe in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Drehung in Grad" }));
  });

  test("defines a readable compact layout below 1024 pixels", async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: true,
        media: "(max-width: 1023px)",
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }),
    });
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);
    await waitFor(() => {
      assert.equal(store.getState().panels.catalog, false);
      assert.equal(store.getState().panels.inspector, false);
    });

    const css = readFileSync(
      join(process.cwd(), "app/planner/workspace/planner-workspace.css"),
      "utf8",
    );
    expect(css).toMatch(/@media\s*\(max-width:\s*1023px\)/);
    expect(css).toMatch(/\.planner-workspace__body[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.planner-panel--catalog[\s\S]*position:\s*fixed/);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: originalMatchMedia });
  });
});
