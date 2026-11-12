import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-konva", () => ({
  Arc: () => null,
  Circle: () => null,
  Ellipse: () => null,
  Group: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Layer: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Line: () => null,
  Path: () => null,
  Rect: () => null,
  Stage: ({ children }: React.PropsWithChildren) => <div data-konva-node="Stage">{children}</div>,
  Text: () => null,
  Transformer: () => null,
}));

vi.mock("konva", () => ({ default: { pixelRatio: 1 } }));

vi.mock("../app/planner/scene-3d/planner-3d.tsx", () => ({
  Planner3D: ({ onReturn2D, onToggleDoor, cameraMode }: { onReturn2D(): void; onToggleDoor(id: string): void; cameraMode: string }) => (
    <div data-testid="mock-planner-3d" data-camera-mode={cameraMode}>
      <button type="button" onClick={onReturn2D}>Zu 2D</button>
      <button type="button" aria-label="3D-Türgriff Zimmer 1" onClick={() => onToggleDoor("zimmer1-door")}>Griff</button>
    </div>
  ),
}));

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";
import { PlannerWorkspace } from "../app/planner/workspace/planner-workspace.tsx";
import { ShoppingListDrawer } from "../app/planner/workspace/shopping-list-drawer.tsx";

describe("PlannerWorkspace", () => {
  test("lists the measured bathroom and WC rug set with the supplied Temu link", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);

    const heading = screen.getByRole("heading", { name: "Badematten-Set Waffelstruktur Beige" });
    const product = heading.closest("article");
    assert.ok(product);
    assert.match(product.textContent ?? "", /Bad \/ WC.*122.*61 cm.*77.*46 cm/);
    assert.equal(
      product.querySelector("a")?.getAttribute("href"),
      "https://www.temu.com/goods.html?_bg_fs=1&goods_id=606121368598635&sku_id=102680185861178&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F9ee28586-74e2-44c8-8a12-b513515e7bb7.jpg&_x_sessn_id=8g2dvy87si&refer_page_name=shopping_cart&refer_page_id=10037_1794340300301_s2tdaqql0f&refer_page_sn=10037",
    );
  });

  test("lists the selected beige 180 by 200 cm shower curtain", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);

    const heading = screen.getByRole("heading", { name: "Duschvorhang Stoff Beige · 180 × 200 cm" });
    const product = heading.closest("article");
    assert.ok(product);
    assert.match(product.textContent ?? "", /Bad.*180 × 200 cm.*12 Metallhaken/);
    assert.equal(
      product.querySelector("a")?.getAttribute("href"),
      "https://www.temu.com/goods.html?_bg_fs=1&goods_id=601100062257123&sku_id=17594540656721&_oak_page_source=501&page_source=10037&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2Ffaf94fab-a0c4-456e-91b6-5d4ea67b9522.jpg",
    );
  });

  test("lists four Kaleo chairs with their verified product dimensions", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);

    const heading = screen.getByRole("heading", { name: "Armlehnstuhl Kaleo Chenille Beige" });
    const product = heading.closest("article");
    assert.ok(product);
    assert.match(product.textContent ?? "", /Wohnküche.*1634004202/);
    assert.match(product.textContent ?? "", /63.*87.*64 cm.*Sitzhöhe 50 cm/);
    assert.match(product.textContent ?? "", /4 Stück/);
    assert.equal(
      product.querySelector("a")?.getAttribute("href"),
      "https://www.moebelix.at/p/livetastic-armlehnstuhl-kaleo-chenille-beige-b-63-cm-001634004202",
    );
  });

  test("lists the Bliss bed with product dimensions, room, and planning price", () => {
    render(<ShoppingListDrawer onClose={() => undefined} />);

    const heading = screen.getByRole("heading", { name: "Polsterbett Bliss" });
    const product = heading.closest("article");
    assert.ok(product);
    assert.match(product.textContent ?? "", /Zimmer 1.*800001233737/);
    assert.match(product.textContent ?? "", /147.*222.*108 cm.*120.*200 cm/);
    assert.equal(
      product.querySelector("a")?.getAttribute("href"),
      "https://www.xxxlutz.at/p/homesy-polsterbett-bliss-120-x-200-cm-mit-bettkasten-und-lattenrost-ohne-matratze-beige-800001233737",
    );
  });

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

    await user.click(screen.getByRole("button", { name: "Begehen" }));
    assert.equal(store.getState().cameraMode, "walk");
    assert.equal(screen.getByTestId("mock-planner-3d").getAttribute("data-camera-mode"), "walk");
  });

  test("switches measured table models and extension states from accessible tabs", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    const kaufland = screen.getByRole("tab", { name: /Kaufland 120 → 160/ });
    await user.click(kaufland);
    assert.equal(kaufland.getAttribute("aria-selected"), "true");
    expect(screen.getByText("120 × 80 × 75,5 cm")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Originalquelle.*Kaufland/i }).getAttribute("href")).toBe("https://www.kaufland.at/product/567080013/");

    await user.click(screen.getByRole("tab", { name: /1 Auszug · oval/ }));
    expect(screen.getByText("160 × 80 × 75,5 cm")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Im Grundriss anwenden" }));
    assert.equal(store.getState().document.placements.find((item) => item.id === "living-bozan-table")?.catalogId, "dining-table-kaufland-567080013-120-160");
    assert.deepEqual(store.getState().document.placements.find((item) => item.id === "living-bozan-table")?.size, { width: 1.6, depth: 0.8, height: 0.755 });

    const temu609726 = screen.getByRole("tab", { name: /Temu 110 → 150/ });
    await user.click(temu609726);
    expect(screen.getByText("110 × 110 × 75 cm")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "1 Auszug · oval" }));
    expect(screen.getByText("150 × 110 × 75 cm")).toBeTruthy();
  });

  test("switches the four measured chair models and applies their footprints", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    const amber = screen.getByRole("tab", { name: /Möbelix Amber/ });
    await user.click(amber);
    expect(screen.getByText("56 × 61 × 90 cm")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Originalquelle.*Möbelix Amber/i }).getAttribute("href")).toBe("https://www.moebelix.at/p/livetastic-armlehnstuhl-amber-chenille-beige-b-56-cm-001125032251");
    await user.click(screen.getByRole("button", { name: "Vier Stühle im Grundriss anwenden" }));
    const chairs = store.getState().document.placements.filter((item) => item.id.includes("living-kaleo-chair-"));
    assert.equal(chairs.length, 4);
    assert.ok(chairs.every((item) => item.catalogId === "chair-amber-chenille-beige"));
    assert.ok(chairs.every((item) => item.size.width === 0.56 && item.size.depth === 0.61 && item.size.height === 0.9));
  });

  test("groups seven interior rooms and one connected outdoor area", () => {
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    assert.equal(screen.getByRole("group", { name: "Innenräume" }).querySelectorAll("option").length, 7);
    assert.equal(screen.getByRole("group", { name: "Außenbereich" }).querySelectorAll("option").length, 1);
    expect(screen.getByRole("option", { name: /Balkon \/ Loggia.*6,03 m²/ })).toBeTruthy();
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
        materialId: "oak-light",
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
    const details = screen.getByRole("dialog", { name: "Plandetails" });
    assert.match(details.textContent ?? "", /Innenräume7/);
    assert.match(details.textContent ?? "", /Außenbereiche1/);
    assert.match(details.textContent ?? "", /Wohnküche.*21,82 m²/);
    await user.click(screen.getByRole("button", { name: "Details schließen" }));
    assert.equal(screen.queryByRole("dialog", { name: "Plandetails" }), null);
    assert.equal(document.activeElement, trigger);

    await user.click(trigger);
    await user.keyboard("{Escape}");
    assert.equal(screen.queryByRole("dialog", { name: "Plandetails" }), null);
    assert.equal(document.activeElement, trigger);
  });

  test("opens the export and import dialog and restores its toolbar trigger", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    const trigger = screen.getByRole("button", { name: "Export & Import" });
    await user.click(trigger);
    assert.ok(screen.getByRole("dialog", { name: "Export und Import" }));
    await user.keyboard("{Escape}");
    assert.equal(screen.queryByRole("dialog"), null);
    assert.equal(document.activeElement, trigger);
  });

  test("keeps precise numeric alternatives available for selected furniture", () => {
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    act(() => store.getState().select(DEFAULT_APARTMENT_DOCUMENT.placements[0].id));
    render(<PlannerWorkspace store={store} />);

    assert.ok(screen.getByRole("spinbutton", { name: "Position X in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Position Z in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Breite in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Tiefe in Zentimetern" }));
    assert.ok(screen.getByRole("spinbutton", { name: "Drehung in Grad" }));
  });

  test("selects plan objects and toggles doors with keyboard-accessible controls", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Planobjekt auswählen" }), "zimmer1-chair");
    assert.equal(store.getState().selectionId, "zimmer1-chair");

    const door = DEFAULT_APARTMENT_DOCUMENT.openings.find((opening) => opening.id === "zimmer1-door")!;
    await user.click(screen.getByRole("button", { name: `${door.label} öffnen` }));
    assert.equal(store.getState().document.doorStates[door.id], "open");
    assert.ok(screen.getByRole("button", { name: `${door.label} schließen` }));

    await user.click(screen.getByRole("button", { name: "3D-Ansicht" }));
    await user.click(await screen.findByRole("button", { name: "3D-Türgriff Zimmer 1" }));
    assert.equal(store.getState().document.doorStates[door.id], "closed");
  });

  test("supports standard undo and redo keyboard shortcuts", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: DEFAULT_APARTMENT_DOCUMENT });
    render(<PlannerWorkspace store={store} />);
    act(() => store.getState().dispatch({
      type: "setSurfaceMaterial", roomId: "zimmer1", surface: "floor", materialId: "oak-light",
    }));

    await user.keyboard("{Control>}z{/Control}");
    assert.notEqual(store.getState().document.rooms.find((room) => room.id === "zimmer1")?.surfaces.floor, "shortcut-test");
    await user.keyboard("{Control>}y{/Control}");
    assert.equal(store.getState().document.rooms.find((room) => room.id === "zimmer1")?.surfaces.floor, "oak-light");
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
