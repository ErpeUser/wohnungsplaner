import { webcrypto } from "node:crypto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createPlannerStore } from "../app/planner/store/planner-store.ts";
import { CatalogPanel } from "../app/planner/workspace/catalog-panel.tsx";

afterEach(() => vi.unstubAllGlobals());

function importDisclosure() {
  const summary = screen.getByText("Eigene Datei registrieren").closest("summary");
  expect(summary).toBeInstanceOf(HTMLElement);
  const details = summary?.parentElement;
  expect(details).toBeInstanceOf(HTMLDetailsElement);
  return { summary: summary!, details: details as HTMLDetailsElement };
}

describe("catalog import disclosure", () => {
  test("starts closed and keeps search, category selection and adding furniture usable", async () => {
    const user = userEvent.setup();
    const added: string[] = [];
    render(<CatalogPanel activeRoomId="zimmer2" onAdd={(id) => added.push(id)} />);
    const { summary, details } = importDisclosure();

    expect(details.open).toBe(false);
    expect(details.contains(screen.getByRole("list", { name: "Möbel" }))).toBe(false);
    await user.type(screen.getByRole("searchbox", { name: "Möbel suchen" }), "sofa");
    await user.click(screen.getByRole("button", { name: "Sitzen" }));
    await user.click(screen.getByRole("button", { name: "Sofa hinzufügen" }));
    expect(added).toEqual(["sofa-3seat"]);
    expect(details.open).toBe(false);

    // Native summary is in the tab order. JSDOM/user-event do not implement
    // Enter/Space activation for summary, so activate the native click below.
    screen.getByRole("searchbox", { name: "Möbel suchen" }).focus();
    for (let i = 0; i < 20 && document.activeElement !== summary; i += 1) await user.tab();
    expect(document.activeElement).toBe(summary);
    await user.click(summary);
    expect(details.open).toBe(true);
  });

  test("keeps the selected file and entered metadata when closed, rerendered and reopened", async () => {
    const user = userEvent.setup();
    render(<CatalogPanel activeRoomId="zimmer2" onAdd={() => undefined} onRegisterAsset={() => null} />);
    const { summary, details } = importDisclosure();
    await user.click(summary);

    const file = new File(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], "leuchte.svg", { type: "image/svg+xml" });
    const fileInput = screen.getByLabelText("Datei (GLB, PNG, JPEG, SVG, WEBP)") as HTMLInputElement;
    await user.upload(fileInput, file);
    const values = {
      Name: "Meine Leuchte",
      "Breite (m)": "0.42",
      "Tiefe (m)": "0.35",
      "Höhe (m)": "0.77",
      "Material-ID": "wood-oak",
      Quelle: "Eigene Angaben",
      "Quell-URL (optional)": "https://example.test/leuchte",
    };
    for (const [label, value] of Object.entries(values)) {
      await user.clear(screen.getByLabelText(label, { exact: true }));
      await user.type(screen.getByLabelText(label, { exact: true }), value);
    }
    await user.selectOptions(screen.getByLabelText("Kategorie", { exact: true }), "Tische");
    await user.selectOptions(screen.getByLabelText("Maßangaben", { exact: true }), "confirmed");
    await user.selectOptions(screen.getByLabelText("Lizenz", { exact: true }), "MIT");

    await user.click(summary);
    expect(details.open).toBe(false);
    await user.type(screen.getByRole("searchbox", { name: "Möbel suchen" }), "sofa");
    await user.click(summary);
    expect(details.open).toBe(true);
    expect((screen.getByLabelText("Datei (GLB, PNG, JPEG, SVG, WEBP)") as HTMLInputElement).files?.[0]).toBe(file);
    for (const [label, value] of Object.entries(values)) {
      expect((screen.getByLabelText(label, { exact: true }) as HTMLInputElement).value).toBe(value);
    }
    expect(screen.getByLabelText("Kategorie", { exact: true })).toHaveProperty("value", "Tische");
    expect(screen.getByLabelText("Maßangaben", { exact: true })).toHaveProperty("value", "confirmed");
    expect(screen.getByLabelText("Lizenz", { exact: true })).toHaveProperty("value", "MIT");
    expect((screen.getByRole("button", { name: "Angaben lokal registrieren" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Sofa hinzufügen" })).toBeTruthy();
  });

  test("still validates the chosen file and registers its exact dimensions through the command boundary", async () => {
    const user = userEvent.setup();
    const store = createPlannerStore({ initialDocument: structuredClone(DEFAULT_APARTMENT_DOCUMENT) });
    vi.stubGlobal("crypto", webcrypto);
    render(<CatalogPanel
      activeRoomId="zimmer2"
      onAdd={() => undefined}
      onRegisterAsset={(asset) => store.getState().dispatch({ type: "registerAsset", asset }).error?.message ?? null}
    />);
    await user.click(importDisclosure().summary);

    const bytes = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'></svg>");
    const file = new File([bytes], "leuchte.svg", { type: "image/svg+xml" });
    // JSDOM's File omits arrayBuffer; preserve real bytes and run the actual
    // preparePlannerAsset validation/hash rather than mocking the importer.
    Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
    await user.upload(screen.getByLabelText("Datei (GLB, PNG, JPEG, SVG, WEBP)"), file);
    for (const [label, value] of [["Breite (m)", "0.42"], ["Tiefe (m)", "0.35"], ["Höhe (m)", "0.77"]]) {
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), value);
    }
    await user.click(screen.getByRole("button", { name: "Angaben lokal registrieren" }));

    await waitFor(() => expect(store.getState().document.assets?.length).toBe(1));
    const asset = store.getState().document.assets![0];
    expect(asset.name).toBe("leuchte");
    expect(asset.normalizedSize).toEqual({ width: 0.42, depth: 0.35, height: 0.77 });
    expect(asset.mediaType).toBe("image/svg+xml");
    expect(asset.byteLength).toBe(bytes.byteLength);
    expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(asset.assetUrl).toBeUndefined();
    expect(screen.getByRole("status")).toBeTruthy();
    expect((screen.getByLabelText("Datei (GLB, PNG, JPEG, SVG, WEBP)") as HTMLInputElement).files?.length).toBe(0);
    store.getState().undo();
    expect(store.getState().document.assets ?? []).toEqual([]);
  });
});
