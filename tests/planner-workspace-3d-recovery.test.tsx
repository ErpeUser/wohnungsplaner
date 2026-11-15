import React, { lazy, Suspense } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("../app/planner/plan-2d/plan-canvas.tsx", () => ({
  PlanCanvas: () => <div data-testid="plan-canvas-2d" />,
}));

vi.mock("../app/planner/scene-3d/planner-3d.tsx", () => ({
  Planner3D: () => { throw new TypeError("Failed to fetch dynamically imported module: /assets/planner-3d-old.js"); },
}));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";
import { createLocalStoragePlannerRepository, PLANNER_STORAGE_KEY } from "../app/planner/store/persistence.ts";
import { PlannerWorkspace, Workspace3DErrorBoundary } from "../app/planner/workspace/planner-workspace-base.tsx";

beforeEach(() => {
  // React reports deliberately thrown boundary errors to the console.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

test("offers a manual reload after a rejected lazy module and never reloads automatically", async () => {
  const user = userEvent.setup();
  const reload = vi.fn();
  const return2D = vi.fn();
  const BrokenImport = lazy(() => Promise.reject(new TypeError(
    "Failed to fetch dynamically imported module: /assets/planner-3d-old.js",
  )));
  render(
    <Workspace3DErrorBoundary onReturn2D={return2D} onReload={reload}>
      <Suspense fallback={<span>3D lädt</span>}><BrokenImport /></Suspense>
    </Workspace3DErrorBoundary>,
  );

  const alert = await screen.findByRole("alert");
  expect(within(alert).getByText("3D-Dateien konnten nicht geladen werden")).toBeTruthy();
  expect(alert.textContent).not.toContain("Eine neue Version ist verfügbar");
  expect(reload).not.toHaveBeenCalled();
  expect(return2D).not.toHaveBeenCalled();

  await user.click(within(alert).getByRole("button", { name: "Seite neu laden" }));
  expect(reload).toHaveBeenCalledTimes(1);
  expect(return2D).not.toHaveBeenCalled();
  await user.click(within(alert).getByRole("button", { name: "Zu 2D" }));
  expect(return2D).toHaveBeenCalledTimes(1);
  expect(reload).toHaveBeenCalledTimes(1);
});

test.each([
  new TypeError("error loading dynamically imported module: /assets/three.js"),
  new TypeError("Importing a module script failed."),
  Object.assign(new Error("Loading chunk 42 failed."), { name: "ChunkLoadError" }),
])("recognizes module-loading failure %s without exposing its technical URL", async (error) => {
  function BrokenModule(): React.JSX.Element { throw error; }
  render(<Workspace3DErrorBoundary onReturn2D={vi.fn()} onReload={vi.fn()}><BrokenModule /></Workspace3DErrorBoundary>);
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByRole("button", { name: "Seite neu laden" })).toBeTruthy();
  expect(alert.textContent).not.toContain("/assets/");
});

test.each([
  new Error("WebGL context lost"),
  new TypeError("Failed to fetch"),
  new Error("Unexpected renderer error"),
])("preserves the existing general error UI for %s", async (error) => {
  const return2D = vi.fn();
  function BrokenRenderer(): React.JSX.Element { throw error; }
  render(<Workspace3DErrorBoundary onReturn2D={return2D} onReload={vi.fn()}><BrokenRenderer /></Workspace3DErrorBoundary>);
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByText("Sichere Ansicht")).toBeTruthy();
  expect(within(alert).getByText("3D-Modul konnte nicht geladen werden")).toBeTruthy();
  expect(within(alert).getByText("Die Planung bleibt vollständig erhalten.")).toBeTruthy();
  expect(within(alert).queryByRole("button", { name: "Seite neu laden" })).toBeNull();
  await userEvent.setup().click(within(alert).getByRole("button", { name: "Zu 2D" }));
  expect(return2D).toHaveBeenCalledOnce();
});

test("returns the actual workspace to 2D while keeping the document, persisted bytes, selection and undo history", async () => {
  const user = userEvent.setup();
  const repository = createLocalStoragePlannerRepository(window.localStorage);
  const store = createPlannerStore({ initialDocument: structuredClone(DEFAULT_APARTMENT_DOCUMENT), repository, autosaveDelayMs: 0 });
  const initial = store.getState().document;
  act(() => {
    store.getState().dispatch({ type: "toggleDoor", openingId: "zimmer1-door" });
    store.getState().select("zimmer1-wardrobe");
    store.getState().setViewMode("3d");
  });
  await waitFor(() => expect(store.getState().autosaveStatus).toBe("saved"));
  const edited = store.getState().document;
  const persisted = window.localStorage.getItem(PLANNER_STORAGE_KEY);
  expect(persisted).toBeTruthy();
  render(<PlannerWorkspace store={store} />);
  const alert = await screen.findByRole("alert");
  await user.click(within(alert).getByRole("button", { name: "Zu 2D" }));

  expect(screen.getByTestId("plan-canvas-2d")).toBeTruthy();
  expect(store.getState().viewMode).toBe("2d");
  expect(store.getState().document).toBe(edited);
  expect(store.getState().selectionId).toBe("zimmer1-wardrobe");
  expect(window.localStorage.getItem(PLANNER_STORAGE_KEY)).toBe(persisted);
  expect(store.getState().canUndo).toBe(true);
  act(() => store.getState().undo());
  expect(store.getState().document).toEqual(initial);
  await waitFor(() => expect(store.getState().autosaveStatus).toBe("saved"));
});
