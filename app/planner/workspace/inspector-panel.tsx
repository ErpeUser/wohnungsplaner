"use client";

import { useId, useState } from "react";

import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import type { CommandResult, PlannerCommand } from "../domain/commands.ts";
import type { PlannerDocumentV3, PlannerPlacement } from "../domain/types.ts";
import { ChairComparisonPanel } from "./chair-comparison-panel.tsx";
import { TableComparisonPanel } from "./table-comparison-panel.tsx";
import "./model-switcher.css";

type InspectorPanelProps = {
  document: PlannerDocumentV3;
  selectionId: string | null;
  dispatch(command: PlannerCommand): CommandResult | void;
  select(id: string | null): void;
};

export function InspectorPanel({ document, selectionId, dispatch, select }: InspectorPanelProps) {
  const selected = document.placements.find((placement) => placement.id === selectionId);
  const builtIn = document.builtIns.find((item) => item.id === selectionId);

  return (
    <aside id="planner-inspector" className="planner-panel planner-panel--inspector" aria-label="Eigenschaften" role="region">
      <header className="planner-panel__header">
        <span className="planner-kicker">Auswahl</span>
        <h2>Eigenschaften</h2>
        <p>{selected ? "Position und Maß präzise anpassen." : builtIn ? "Fest eingebautes Element." : "Element im Plan auswählen."}</p>
      </header>
      {selected ? <PlacementFields document={document} placement={selected} dispatch={dispatch} select={select} /> : builtIn ? (
        <div className="planner-locked-state">
          <span aria-hidden="true">◆</span>
          <div><strong>{builtIn.label}</strong><p>Bestand · gegen Verschieben und Entfernen geschützt</p></div>
        </div>
      ) : (
        <div className="planner-empty-state">
          <span aria-hidden="true">＋</span>
          <strong>Noch nichts ausgewählt</strong>
          <p>Klicke ein Möbel im Plan an. Alle Ziehbewegungen bleiben hier numerisch nachvollziehbar.</p>
        </div>
      )}
    </aside>
  );
}

function PlacementFields({
  document,
  placement,
  dispatch,
  select,
}: {
  document: PlannerDocumentV3;
  placement: PlannerPlacement;
  dispatch(command: PlannerCommand): CommandResult | void;
  select(id: string | null): void;
}) {
  const catalogItem = getFurnitureCatalogItem(placement.catalogId);
  const send = (command: PlannerCommand) => dispatch(command)?.error?.message ?? null;

  return (
    <div className="planner-inspector__form" aria-label="Numerische Objektbearbeitung">
      <div className="planner-selection-summary">
        <span className="planner-selection-summary__swatch" aria-hidden="true" />
        <span><strong>{catalogItem?.name ?? placement.catalogId}</strong><small>{placement.roomId}</small></span>
      </div>
      <ModelSwitcher document={document} placement={placement} dispatch={dispatch} select={select} />
      <fieldset>
        <legend>Position</legend>
        <div className="planner-field-grid">
          <NumericField
            label="Position X in Zentimetern"
            value={placement.position.x * 100}
            onCommit={(value) => send({
              type: "movePlacement",
              placementId: placement.id,
              position: { ...placement.position, x: value / 100 },
            })}
          />
          <NumericField
            label="Position Z in Zentimetern"
            value={placement.position.z * 100}
            onCommit={(value) => send({
              type: "movePlacement",
              placementId: placement.id,
              position: { ...placement.position, z: value / 100 },
            })}
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>Maße</legend>
        <div className="planner-field-grid">
          <NumericField
            label="Breite in Zentimetern"
            value={placement.size.width * 100}
            minimum={10}
            onCommit={(value) => send({ type: "resizePlacement", placementId: placement.id, size: { ...placement.size, width: value / 100 } })}
          />
          <NumericField
            label="Tiefe in Zentimetern"
            value={placement.size.depth * 100}
            minimum={10}
            onCommit={(value) => send({ type: "resizePlacement", placementId: placement.id, size: { ...placement.size, depth: value / 100 } })}
          />
          <NumericField
            label="Höhe in Zentimetern"
            value={placement.size.height * 100}
            minimum={1}
            onCommit={(value) => send({ type: "resizePlacement", placementId: placement.id, size: { ...placement.size, height: value / 100 } })}
          />
          <NumericField
            label="Drehung in Grad"
            value={placement.rotation}
            step={5}
            suffix="°"
            onCommit={(value) => send({ type: "rotatePlacement", placementId: placement.id, rotation: value })}
          />
        </div>
      </fieldset>
      <label className="planner-select-field">
        <span>Material</span>
        <select
          aria-label="Material"
          value={placement.materialVariants?.main ?? catalogItem?.materials[0]?.id ?? "default"}
          onChange={(event) => send({
            type: "setPlacementMaterial",
            placementId: placement.id,
            slot: "main",
            materialId: event.target.value,
          })}
        >
          {(catalogItem?.materials ?? [{ id: "default", label: "Standard" }]).map((material) => (
            <option key={material.id} value={material.id}>{material.label}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="planner-button--danger"
        onClick={() => dispatch({ type: "removePlacement", placementId: placement.id })}
      >
        Möbel entfernen
      </button>
    </div>
  );
}

const DINING_CHAIR_IDS = new Set([
  "living-kaleo-chair-west",
  "living-kaleo-chair-east",
  "living-kaleo-chair-south",
  "living-kaleo-chair-north",
]);

function ModelSwitcher({
  document,
  placement,
  dispatch,
  select,
}: {
  document: PlannerDocumentV3;
  placement: PlannerPlacement;
  dispatch(command: PlannerCommand): CommandResult;
  select(id: string | null): void;
}) {
  const tableSelected = placement.id === "living-bozan-table";
  const chairSelected = DINING_CHAIR_IDS.has(placement.id);
  const [activeTab, setActiveTab] = useState<"chair" | "table">(chairSelected ? "chair" : "table");
  if (!tableSelected && !chairSelected) return null;

  const catalogItem = getFurnitureCatalogItem(placement.catalogId);
  const size = placement.size;
  const confidence = placement.metadata?.confidence === "confirmed" ? "Beleg bestätigt" : "Beleg geschätzt";

  return (
    <section className="planner-model-switcher" aria-label="Modellwechsel">
      <div className="planner-model-switcher__header">
        <span className="planner-kicker">Essgruppe</span>
        <strong>Modell kompakt wechseln</strong>
      </div>
      <div className="planner-model-switcher__tabs" role="tablist" aria-label="Modelle wechseln">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "chair"}
          aria-controls="planner-chair-model-panel"
          className="planner-model-switcher__tab"
          onClick={() => setActiveTab("chair")}
        >
          Stuhlmodell ändern
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "table"}
          aria-controls="planner-table-model-panel"
          className="planner-model-switcher__tab"
          onClick={() => setActiveTab("table")}
        >
          Tischmodell ändern
        </button>
      </div>
      <div className="planner-model-switcher__current">
        <span className="planner-model-switcher__thumb" aria-hidden="true" />
        <span>
          <strong>{catalogItem?.name ?? placement.catalogId}</strong>
          <small>{Math.round(size.width * 100)} × {Math.round(size.depth * 100)} × {Math.round(size.height * 100)} cm · {confidence}</small>
        </span>
      </div>
      {activeTab === "chair" ? (
        <div id="planner-chair-model-panel" role="tabpanel" className="planner-model-switcher__panel">
          <ChairComparisonPanel
            key={placement.catalogId}
            document={document}
            dispatch={dispatch}
            select={select}
          />
        </div>
      ) : (
        <div id="planner-table-model-panel" role="tabpanel" className="planner-model-switcher__panel">
          <TableComparisonPanel
            key={placement.catalogId}
            document={document}
            dispatch={dispatch}
            select={select}
          />
        </div>
      )}
    </section>
  );
}
function NumericField({
  label,
  value,
  onCommit,
  step = 1,
  minimum,
  suffix = "cm",
}: {
  label: string;
  value: number;
  onCommit(value: number): string | null;
  step?: number;
  minimum?: number;
  suffix?: string;
}) {
  const errorId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => formatNumber(value));
  const [error, setError] = useState<string | null>(null);
  const commit = () => {
    setEditing(false);
    const parsed = Number(draft.replace(",", "."));
    if (!Number.isFinite(parsed) || (minimum !== undefined && parsed < minimum)) {
      setError(minimum === undefined ? "Bitte eine gültige Zahl eingeben." : `Der Wert muss mindestens ${minimum} sein.`);
      return;
    }
    const commandError = onCommit(parsed);
    setError(commandError);
    if (commandError) setDraft(formatNumber(value));
  };

  return (
    <label className="planner-number-field">
      <span>{label}</span>
      <span className="planner-number-field__control" data-invalid={Boolean(error)}>
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          value={editing ? draft : formatNumber(value)}
          onFocus={() => {
            setDraft(formatNumber(value));
            setEditing(true);
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(formatNumber(value));
              setError(null);
              event.currentTarget.blur();
            }
          }}
          step={step}
          min={minimum}
        />
        <small>{suffix}</small>
      </span>
      {error ? <small id={errorId} className="planner-field-error" role="alert">{error}</small> : null}
    </label>
  );
}

function formatNumber(value: number) {
  return String(Number(value.toFixed(2)));
}
