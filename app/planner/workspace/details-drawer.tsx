import type { PlannerDocumentV3 } from "../domain/types.ts";
import { OUTDOOR_ROOM_IDS, getDocumentWnfArea } from "../domain/apartment-evidence.ts";

type DetailsDrawerProps = {
  document: PlannerDocumentV3;
  onClose(): void;
};

export function DetailsDrawer({ document, onClose }: DetailsDrawerProps) {
  const outdoorIds = new Set<string>(OUTDOOR_ROOM_IDS);
  const interiorRooms = document.rooms.filter((room) => !outdoorIds.has(room.id));
  const outdoorRooms = document.rooms.filter((room) => outdoorIds.has(room.id));
  const wnf = getDocumentWnfArea(document);

  return (
    <aside id="planner-details" className="planner-details" role="dialog" aria-modal="true" aria-labelledby="planner-details-title" tabIndex={-1}>
      <header>
        <div><span className="planner-kicker">Dokument</span><h2 id="planner-details-title">Plandetails</h2></div>
        <button type="button" aria-label="Details schließen" onClick={onClose}>×</button>
      </header>
      <dl>
        <div><dt>Wohnnutzfläche</dt><dd>{wnf.toLocaleString("de-AT", { minimumFractionDigits: 2 })} m²</dd></div>
        <div><dt>Innenräume</dt><dd>{interiorRooms.length}</dd></div>
        <div><dt>Außenbereiche</dt><dd>{outdoorRooms.length}</dd></div>
        <div><dt>Öffnungen</dt><dd>{document.openings.length}</dd></div>
        <div><dt>Bewegliche Objekte</dt><dd>{document.placements.length}</dd></div>
        <div><dt>Datenmodell</dt><dd>Version {document.schemaVersion}</dd></div>
      </dl>
      <section>
        <h3>Planstatus</h3>
        <p>Der offizielle Vermietungsplan ist für Flächen, Raumanzahl und Türen maßgeblich. Die Wohnküche ist vollständig in den 21,82 m² enthalten.</p>
        <ul>
          {document.rooms.map((room) => (
            <li key={room.id}>{room.name} · {room.area.toLocaleString("de-AT", { minimumFractionDigits: 2 })} m²</li>
          ))}
        </ul>
        <p>Balkon und Loggia werden entsprechend dem realen Zustand als ein zusammenhängender Außenbereich gezeigt. Für die WNF bleiben davon die offiziell ausgewiesenen 2,23 m² berücksichtigt.</p>
      </section>
    </aside>
  );
}
