import type { AutosaveStatus } from "../store/planner-store.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import { getDocumentWnfArea } from "../domain/apartment-evidence.ts";

const SAVE_LABELS: Record<AutosaveStatus, string> = {
  idle: "Bereit",
  saving: "Wird lokal gespeichert …",
  saved: "Lokal gespeichert",
  error: "Speichern fehlgeschlagen · Änderungen bleiben geöffnet",
};

export function PlannerStatus({
  document,
  autosaveStatus,
  selectionId = null,
  warningCount = 0,
  hasError = false,
}: {
  document: PlannerDocumentV3;
  autosaveStatus: AutosaveStatus;
  selectionId?: string | null;
  warningCount?: number;
  hasError?: boolean;
}) {
  const wnf = getDocumentWnfArea(document);
  return (
    <footer className="planner-status" role="status" aria-live="polite">
      <span className={`planner-status__dot planner-status__dot--${autosaveStatus}`} aria-hidden="true" />
      <strong>{SAVE_LABELS[autosaveStatus]}</strong>
      <span>{wnf.toLocaleString("de-AT", { minimumFractionDigits: 2 })} m² WNF</span>
      <span>{document.rooms.length} Bereiche</span>
      <span>Raster 5 cm</span>
      {selectionId ? <span>Auswahl: {selectionId}</span> : null}
      {hasError ? <span className="planner-status__problem">Aktion abgelehnt</span> : warningCount > 0 ? (
        <span className="planner-status__warning">{warningCount} Hinweis{warningCount === 1 ? "" : "e"}</span>
      ) : null}
    </footer>
  );
}
