"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import type { PlannerDocumentV3, Point2 } from "../domain/types.ts";
import type { PlanScene } from "../plan-2d/plan-scene.ts";
import type { PlannerImportPreview, PlannerRepository } from "../store/persistence.ts";
import {
  createPlanPng,
  createPrintModel,
  serializePlannerBackup,
  type PlanStageExporter,
  type PlannerPrintModel,
} from "./planner-export.ts";

type ExportDialogProps = {
  open: boolean;
  document: PlannerDocumentV3;
  scene: PlanScene;
  stage: PlanStageExporter | null;
  repository: PlannerRepository;
  onImport(preview: PlannerImportPreview): void;
  onClose(): void;
  onDownload?(filename: string, payload: string): void;
  onPrint?(): void;
};

export function ExportDialog({
  open,
  document,
  scene,
  stage,
  repository,
  onImport,
  onClose,
  onDownload = downloadFile,
  onPrint = () => window.print(),
}: ExportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<PlannerImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const printModel = useMemo(() => createPrintModel(document, scene), [document, scene]);
  const migrationBackup = repository.getMigrationBackup();
  const importSourceBackup = repository.getImportSourceBackup();

  useEffect(() => {
    if (!open) return;
    const previousFocus = documentActiveElement();
    const dialog = dialogRef.current;
    const focusables = () => dialog
      ? [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => !element.hasAttribute("disabled"))
      : [];
    const first = focusables()[0];
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const current = globalThis.document.activeElement;
      const index = items.indexOf(current as HTMLElement);
      const next = event.shiftKey
        ? items[index <= 0 ? items.length - 1 : index - 1]
        : items[index === items.length - 1 ? 0 : index + 1];
      event.preventDefault();
      next.focus();
    };
    globalThis.document.addEventListener("keydown", onKeyDown);
    return () => {
      globalThis.document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  const exportJson = () => onDownload("wohnung-v3.json", serializePlannerBackup(document));
  const exportPng = () => {
    if (!stage) return;
    onDownload("wohnung-plan.png", createPlanPng(stage, { pixelRatio: 2 }));
  };
  const readImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setPreview(null);
    setImportError(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Die JSON-Sicherung ist zu groß (maximal 5 MB).");
      if (file.type && file.type !== "application/json" && file.type !== "text/json") {
        throw new Error("Bitte eine JSON-Sicherung auswählen.");
      }
      const text = await readTextFile(file);
      setPreview(repository.previewImport(JSON.parse(text)));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Die Sicherung konnte nicht gelesen werden.");
    }
  };

  return (
    <div className="planner-dialog-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="planner-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-export-title"
      >
        <header className="planner-export-dialog__header">
          <div>
            <span className="planner-kicker">Sichern · Teilen · Wiederherstellen</span>
            <h2 id="planner-export-title">Export und Import</h2>
          </div>
          <button type="button" className="planner-dialog-close" onClick={onClose} aria-label="Export schließen">×</button>
        </header>

        <div className="planner-export-dialog__body">
          <section className="planner-export-card" aria-labelledby="planner-export-actions">
            <span className="planner-kicker">Ausgeben</span>
            <h3 id="planner-export-actions">Plan weiterverwenden</h3>
            <p>Alle Formate werden direkt aus dem aktuellen Plan erzeugt. Es werden keine privaten Quellenpfade eingebettet.</p>
            <div className="planner-export-actions">
              <button type="button" aria-label="JSON-Sicherung" onClick={exportJson}>
                <strong>JSON-Sicherung</strong>
                <span>Vollständiger, wieder importierbarer V3-Stand</span>
              </button>
              <button type="button" aria-label="PNG-Ansicht" onClick={exportPng} disabled={!stage}>
                <strong>PNG-Ansicht</strong>
                <span>{stage ? "Aktuelle 2D-Ansicht in hoher Auflösung" : "Bitte zuerst zur 2D-Ansicht wechseln"}</span>
              </button>
              <button type="button" aria-label="PDF-Plan" onClick={onPrint}>
                <strong>PDF-Plan</strong>
                <span>Kompaktes Druckblatt mit Plan und Listen</span>
              </button>
              {migrationBackup ? (
                <button
                  type="button"
                  aria-label="Legacy-Sicherung herunterladen"
                  onClick={() => onDownload("wohnung-legacy-sicherung.json", migrationBackup)}
                >
                  <strong>Legacy-Sicherung</strong>
                  <span>Unveränderte Quelldaten vor der Migration</span>
                </button>
              ) : null}
              {importSourceBackup ? (
                <button
                  type="button"
                  aria-label="Import-Quelle herunterladen"
                  onClick={() => onDownload("wohnung-import-quelle.json", importSourceBackup)}
                >
                  <strong>Import-Quelle</strong>
                  <span>Unveränderte Quelldaten des letzten Legacy-Imports</span>
                </button>
              ) : null}
            </div>
          </section>

          <section className="planner-export-card" aria-labelledby="planner-import-title">
            <span className="planner-kicker">Einlesen</span>
            <h3 id="planner-import-title">Sicherung prüfen</h3>
            <p>Der bestehende Plan wird erst nach einer Vorschau und deiner Bestätigung ersetzt.</p>
            <label className="planner-file-button">
              JSON-Sicherung auswählen
              <input type="file" accept="application/json,.json" onChange={readImport} />
            </label>
            {importError ? <p className="planner-export-error" role="alert">{importError}</p> : null}
            {preview ? (
              <ImportPreview
                preview={preview}
                onConfirm={() => {
                  onImport(preview);
                  onClose();
                }}
              />
            ) : null}
          </section>
        </div>

        <PrintPlan model={printModel} />
      </div>
    </div>
  );
}

export function ImportPreview({
  preview,
  onConfirm,
}: {
  preview: PlannerImportPreview;
  onConfirm(): void;
}) {
  return (
    <div className="planner-import-preview" aria-live="polite">
      <h4>Importvorschau</h4>
      <div className="planner-import-preview__facts">
        <span>Version V{preview.document.schemaVersion}</span>
        <span>{preview.document.rooms.length} Bereiche</span>
        <span>{preview.document.placements.length} Möbel</span>
      </div>
      {preview.warnings.length ? (
        <div className="planner-import-preview__warnings">
          <strong>{preview.warnings.length} Hinweis{preview.warnings.length === 1 ? "" : "e"}</strong>
          <ul>{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      ) : <p>Die Sicherung ist vollständig und ohne Warnung lesbar.</p>}
      {preview.unmapped.length ? <p>{preview.unmapped.length} Einträge konnten nicht zugeordnet werden.</p> : null}
      <button type="button" className="planner-button planner-button--danger" disabled={!preview.canCommit} onClick={onConfirm}>
        Plan ersetzen
      </button>
    </div>
  );
}

function PrintPlan({ model }: { model: PlannerPrintModel }) {
  const bounds = model.plan.bounds;
  const padding = 0.35;
  const viewBox = [
    bounds.minX - padding,
    bounds.minZ - padding,
    bounds.maxX - bounds.minX + padding * 2,
    bounds.maxZ - bounds.minZ + padding * 2,
  ].join(" ");
  return (
    <section className="planner-print-document" aria-label="PDF-Druckvorschau">
      <header>
        <span>Wohnung · Planungsstand V3</span>
        <h1>{model.title}</h1>
        <p>{model.summary}</p>
      </header>
      <svg viewBox={viewBox} role="img" aria-label="Grundriss für den PDF-Plan">
        {model.plan.rooms.map((room) => (
          <polygon key={room.id} points={svgPoints(room.points)} fill="#eee8dc" stroke="#6f6a61" strokeWidth="0.025" />
        ))}
        {model.plan.builtIns.map((item) => (
          <polygon key={item.id} points={svgPoints(item.points)} fill="#9ca9a5" stroke="#415154" strokeWidth="0.018" />
        ))}
        {model.plan.walls.map((wall) => (
          <line key={wall.id} x1={wall.start.x} y1={wall.start.z} x2={wall.end.x} y2={wall.end.z} stroke="#243639" strokeWidth={Math.max(0.05, wall.thickness)} strokeLinecap="square" />
        ))}
        {model.plan.openings.map((opening) => (
          <line key={opening.id} x1={opening.start.x} y1={opening.start.z} x2={opening.end.x} y2={opening.end.z} stroke="#d8a174" strokeWidth="0.08" />
        ))}
      </svg>
      <div className="planner-print-document__lists">
        <div>
          <h2>Räume</h2>
          <table><tbody>{model.rooms.map((room) => (
            <tr key={room.id}><th>{room.name}</th><td>{room.area.toLocaleString("de-AT")} m²</td></tr>
          ))}</tbody></table>
        </div>
        <div>
          <h2>Möbel</h2>
          {model.furniture.length ? <table><tbody>{model.furniture.map((item) => (
            <tr key={item.id}><th>{item.name}</th><td>{item.room} · {item.widthCm} × {item.depthCm} cm</td></tr>
          ))}</tbody></table> : <p>Noch keine frei platzierten Möbel.</p>}
        </div>
      </div>
    </section>
  );
}

function svgPoints(points: Point2[]) {
  return points.map((point) => `${point.x},${point.z}`).join(" ");
}

function documentActiveElement() {
  if (typeof globalThis.document === "undefined") return null;
  return globalThis.document.activeElement instanceof HTMLElement ? globalThis.document.activeElement : null;
}

function readTextFile(file: File) {
  if (typeof file.text === "function") return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Die Sicherung konnte nicht gelesen werden."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });
}

function downloadFile(filename: string, payload: string) {
  const isDataUrl = payload.startsWith("data:");
  const url = isDataUrl
    ? payload
    : URL.createObjectURL(new Blob([payload], { type: "application/json;charset=utf-8" }));
  const link = globalThis.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  if (!isDataUrl) globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
