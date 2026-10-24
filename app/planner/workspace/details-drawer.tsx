import type { PlannerDocumentV3 } from "../domain/types.ts";

type DetailsDrawerProps = {
  document: PlannerDocumentV3;
  onClose(): void;
};

export function DetailsDrawer({ document, onClose }: DetailsDrawerProps) {
  const wnf = document.rooms
    .filter((room) => room.includedInWnf)
    .reduce((sum, room) => sum + room.area, 0);

  return (
    <aside id="planner-details" className="planner-details" aria-label="Plandetails">
      <header>
        <div><span className="planner-kicker">Dokument</span><h2>Plandetails</h2></div>
        <button type="button" aria-label="Details schließen" onClick={onClose}>×</button>
      </header>
      <dl>
        <div><dt>Wohnnutzfläche</dt><dd>{wnf.toLocaleString("de-AT", { minimumFractionDigits: 2 })} m²</dd></div>
        <div><dt>Räume</dt><dd>{document.rooms.length}</dd></div>
        <div><dt>Öffnungen</dt><dd>{document.openings.length}</dd></div>
        <div><dt>Bewegliche Objekte</dt><dd>{document.placements.length}</dd></div>
        <div><dt>Datenmodell</dt><dd>Version {document.schemaVersion}</dd></div>
      </dl>
      <section>
        <h3>Planstatus</h3>
        <p>Maße, Räume, Türen und feste Einbauten stammen aus dem gemeinsamen V3-Wohnungsmodell.</p>
      </section>
    </aside>
  );
}
