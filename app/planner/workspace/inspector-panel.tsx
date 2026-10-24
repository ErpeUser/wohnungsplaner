import type { PlannerCommand } from "../domain/commands.ts";
import type { PlannerDocumentV3, PlannerPlacement } from "../domain/types.ts";

type InspectorPanelProps = {
  document: PlannerDocumentV3;
  selectionId: string | null;
  dispatch(command: PlannerCommand): void;
};

export function InspectorPanel({ document, selectionId, dispatch }: InspectorPanelProps) {
  const selected = document.placements.find((placement) => placement.id === selectionId);
  const builtIn = document.builtIns.find((item) => item.id === selectionId);

  return (
    <aside id="planner-inspector" className="planner-panel planner-panel--inspector" aria-label="Eigenschaften">
      <header className="planner-panel__header">
        <span className="planner-kicker">Auswahl</span>
        <h2>Eigenschaften</h2>
        <p>{selected ? "Position und Maß präzise anpassen." : builtIn ? "Fest eingebautes Element." : "Element im Plan auswählen."}</p>
      </header>
      {selected ? <PlacementFields placement={selected} dispatch={dispatch} /> : (
        <div className="planner-empty-state">
          <span aria-hidden="true">＋</span>
          <strong>Noch nichts ausgewählt</strong>
          <p>Klicke ein Möbel im Plan an. Alle Ziehbewegungen bleiben hier numerisch nachvollziehbar.</p>
        </div>
      )}
      {builtIn ? (
        <div className="planner-locked-state">
          <span aria-hidden="true">◆</span>
          <div><strong>{builtIn.label}</strong><p>Bestand · gegen Verschieben und Entfernen geschützt</p></div>
        </div>
      ) : null}
    </aside>
  );
}

function PlacementFields({
  placement,
  dispatch,
}: {
  placement: PlannerPlacement;
  dispatch(command: PlannerCommand): void;
}) {
  const number = (
    label: string,
    value: number,
    onValue: (value: number) => void,
    options: { step?: number; min?: number; suffix?: string } = {},
  ) => (
    <label className="planner-number-field">
      <span>{label}</span>
      <span className="planner-number-field__control">
        <input
          type="number"
          aria-label={label}
          value={Number(value.toFixed(2))}
          step={options.step ?? 1}
          min={options.min}
          onChange={(event) => onValue(Number(event.target.value))}
        />
        <small>{options.suffix ?? "cm"}</small>
      </span>
    </label>
  );

  return (
    <div className="planner-inspector__form" aria-label="Numerische Objektbearbeitung">
      <div className="planner-selection-summary">
        <span className="planner-selection-summary__swatch" aria-hidden="true" />
        <span><strong>{placement.catalogId}</strong><small>{placement.roomId}</small></span>
      </div>
      <fieldset>
        <legend>Position</legend>
        <div className="planner-field-grid">
          {number("Position X in Zentimetern", placement.position.x * 100, (value) => dispatch({
            type: "movePlacement",
            placementId: placement.id,
            position: { ...placement.position, x: value / 100 },
          }))}
          {number("Position Y in Zentimetern", placement.position.z * 100, (value) => dispatch({
            type: "movePlacement",
            placementId: placement.id,
            position: { ...placement.position, z: value / 100 },
          }))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Maße</legend>
        <div className="planner-field-grid">
          {number("Breite in Zentimetern", placement.size.width * 100, (value) => dispatch({
            type: "resizePlacement",
            placementId: placement.id,
            size: { ...placement.size, width: value / 100 },
          }), { min: 1 })}
          {number("Tiefe in Zentimetern", placement.size.depth * 100, (value) => dispatch({
            type: "resizePlacement",
            placementId: placement.id,
            size: { ...placement.size, depth: value / 100 },
          }), { min: 1 })}
        </div>
      </fieldset>
      {number("Drehung in Grad", placement.rotation, (value) => dispatch({
        type: "rotatePlacement",
        placementId: placement.id,
        rotation: value,
      }), { step: 5, suffix: "°" })}
    </div>
  );
}
