import assert from "node:assert/strict";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import { DEFAULT_APARTMENT_DOCUMENT } from "../app/planner/domain/apartment-v3.ts";
import { createPlanScene } from "../app/planner/plan-2d/plan-scene.ts";
import {
  createPlanPng,
  createPrintModel,
  serializePlannerBackup,
} from "../app/planner/export/planner-export.ts";
import { ExportDialog } from "../app/planner/export/export-dialog.tsx";
import type { PlannerImportPreview, PlannerRepository } from "../app/planner/store/persistence.ts";

const scene = createPlanScene(DEFAULT_APARTMENT_DOCUMENT, {
  activeRoomId: null,
  overlays: DEFAULT_APARTMENT_DOCUMENT.viewPreferences.overlays,
});

test("serializes a validated V3 backup without private source paths", () => {
  const backup = serializePlannerBackup(DEFAULT_APARTMENT_DOCUMENT);
  const parsed = JSON.parse(backup);
  assert.equal(parsed.schemaVersion, 3);
  assert.equal(parsed.rooms.length, 9);
  assert.doesNotMatch(backup, /(?:[A-Z]:\\|\/Users\/|sourcePath|imageStudies)/i);
});

test("creates a high-resolution PNG from the current Konva stage", () => {
  const toDataURL = vi.fn(() => "data:image/png;base64,plan");
  assert.equal(createPlanPng({ toDataURL }, { pixelRatio: 2 }), "data:image/png;base64,plan");
  expect(toDataURL).toHaveBeenCalledWith({ mimeType: "image/png", pixelRatio: 2 });
});

test("creates a compact print model from the same scene and document", () => {
  const model = createPrintModel(DEFAULT_APARTMENT_DOCUMENT, scene);
  assert.equal(model.schemaVersion, 3);
  assert.equal(model.rooms.length, 9);
  assert.equal(model.plan.rooms, scene.rooms);
  assert.equal(model.furniture.length, DEFAULT_APARTMENT_DOCUMENT.placements.length);
  assert.match(model.summary, /59,49 m²/);
  assert.doesNotMatch(JSON.stringify(model), /(?:[A-Z]:\\|\/Users\/|sourcePath|imageStudies)/i);
});

describe("ExportDialog", () => {
  test("offers explicit export actions and uses the live 2D stage", async () => {
    const user = userEvent.setup();
    const download = vi.fn();
    const print = vi.fn();
    const toDataURL = vi.fn(() => "data:image/png;base64,plan");
    render(
      <ExportDialog
        open
        document={DEFAULT_APARTMENT_DOCUMENT}
        scene={scene}
        stage={{ toDataURL }}
        repository={repository()}
        onImport={vi.fn()}
        onClose={vi.fn()}
        onDownload={download}
        onPrint={print}
      />,
    );

    assert.ok(screen.getByRole("dialog", { name: "Export und Import" }));
    await user.click(screen.getByRole("button", { name: "JSON-Sicherung" }));
    expect(download).toHaveBeenCalledWith("wohnung-v3.json", expect.stringContaining('"schemaVersion": 3'));
    await user.click(screen.getByRole("button", { name: "PNG-Ansicht" }));
    expect(download).toHaveBeenCalledWith("wohnung-plan.png", "data:image/png;base64,plan");
    await user.click(screen.getByRole("button", { name: "PDF-Plan" }));
    expect(print).toHaveBeenCalledOnce();
    assert.ok(screen.getByRole("img", { name: "Grundriss für den PDF-Plan" }));
  });

  test("offers the untouched migration source as a separate recovery download", async () => {
    const user = userEvent.setup();
    const download = vi.fn();
    const source = '{"zimmer1":[{"type":"legacy"}]}';
    const repo = repository();
    repo.getMigrationBackup = () => source;
    render(
      <ExportDialog open document={DEFAULT_APARTMENT_DOCUMENT} scene={scene} stage={null} repository={repo}
        onImport={vi.fn()} onClose={vi.fn()} onDownload={download} />,
    );

    await user.click(screen.getByRole("button", { name: "Legacy-Sicherung herunterladen" }));
    expect(download).toHaveBeenCalledWith("wohnung-legacy-sicherung.json", source);
  });

  test("previews imports with warnings and requires an explicit replacement", async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    const preview = importPreview(["Ein alter Eintrag wurde übersprungen."]);
    render(
      <ExportDialog
        open
        document={DEFAULT_APARTMENT_DOCUMENT}
        scene={scene}
        stage={null}
        repository={repository(preview)}
        onImport={onImport}
        onClose={vi.fn()}
      />,
    );

    const file = new File([JSON.stringify(DEFAULT_APARTMENT_DOCUMENT)], "sicherung.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("JSON-Sicherung auswählen"), file);
    await screen.findByText("Importvorschau");
    expect(screen.getByText("Version V3")).toBeTruthy();
    expect(screen.getByText("9 Räume")).toBeTruthy();
    expect(screen.getByText("Ein alter Eintrag wurde übersprungen.")).toBeTruthy();
    expect(onImport).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Plan ersetzen" }));
    expect(onImport).toHaveBeenCalledWith(preview);
  });

  test("traps focus, closes on Escape and restores the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Export öffnen" });
    trigger.focus();
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Export und Import" });
    await waitFor(() => assert.equal(dialog.contains(document.activeElement), true));
    await user.keyboard("{Escape}");
    assert.equal(screen.queryByRole("dialog"), null);
    assert.equal(document.activeElement, trigger);
  });
});

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Export öffnen</button>
      <ExportDialog
        open={open}
        document={DEFAULT_APARTMENT_DOCUMENT}
        scene={scene}
        stage={null}
        repository={repository()}
        onImport={vi.fn()}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function repository(preview = importPreview()): PlannerRepository {
  return {
    load: () => preview,
    save: (document) => document,
    restoreBackup: () => null,
    getMigrationBackup: () => null,
    previewImport: vi.fn(() => preview),
    commitImport: vi.fn(() => preview.document),
  };
}

function importPreview(warnings: string[] = []): PlannerImportPreview {
  return {
    document: DEFAULT_APARTMENT_DOCUMENT,
    warnings,
    legacyBackupJson: null,
    unmapped: [],
    canCommit: true,
  };
}
