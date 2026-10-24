import type { AutosaveStatus } from "../store/planner-store.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";

const SAVE_LABELS: Record<AutosaveStatus, string> = {
  idle: "Bereit",
  saving: "Wird lokal gespeichert …",
  saved: "Lokal gespeichert",
  error: "Speichern fehlgeschlagen · Änderungen bleiben geöffnet",
};

export function PlannerStatus({ document, autosaveStatus }: {
  document: PlannerDocumentV3;
  autosaveStatus: AutosaveStatus;
}) {
  const wnf = document.rooms
    .filter((room) => room.includedInWnf)
    .reduce((sum, room) => sum + room.area, 0);
  return (
    <footer className="planner-status" role="status" aria-live="polite">
      <span className={`planner-status__dot planner-status__dot--${autosaveStatus}`} aria-hidden="true" />
      <strong>{SAVE_LABELS[autosaveStatus]}</strong>
      <span>{wnf.toLocaleString("de-AT", { minimumFractionDigits: 2 })} m² WNF</span>
      <span>{document.rooms.length} Bereiche</span>
      <span>Raster 5 cm</span>
    </footer>
  );
}
