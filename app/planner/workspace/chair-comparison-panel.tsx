"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import type { PlannerCommand, CommandResult } from "../domain/commands.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import {
  CHAIR_MODELS,
  chairModelHasGeometry,
  getChairModel,
  getChairModelForCatalogId,
  type ChairModelId,
} from "../chairs/chair-models.ts";

export function ChairComparisonPanel({
  document,
  dispatch,
  select,
}: {
  document: PlannerDocumentV3;
  dispatch(command: PlannerCommand): CommandResult;
  select(id: string | null): void;
}) {
  const chair = document.placements.find((placement) => placement.id === "living-kaleo-chair-west");
  const initial = getChairModelForCatalogId(chair?.catalogId)?.id ?? CHAIR_MODELS[0].id;
  const [activeModelId, setActiveModelId] = useState<ChairModelId>(initial);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const model = getChairModel(activeModelId) ?? CHAIR_MODELS[0];
  const panelId = `chair-panel-${model.id}`;

  const chooseModel = (nextId: ChairModelId) => setActiveModelId(nextId);
  const apply = () => {
    const result = dispatch({ type: "setDiningChairModel", modelId: model.id });
    if (!result.error) select("living-kaleo-chair-west");
  };

  const handleArrow = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? CHAIR_MODELS.length - 1 : (index + delta + CHAIR_MODELS.length) % CHAIR_MODELS.length;
    tabs.current[next]?.focus();
    chooseModel(CHAIR_MODELS[next].id);
  };

  return (
    <details className="planner-table-compare planner-chair-compare" open>
      <summary className="planner-table-compare__summary">
        <span>
          <span className="planner-kicker">Essgruppe</span>
          <strong>Stuhlvergleich · vier Plätze maßstäblich</strong>
        </span>
        <span className="planner-table-compare__summary-hint">4 Modelle · cm</span>
      </summary>
      <div className="planner-table-compare__body">
        <div className="planner-table-compare__tabs" role="tablist" aria-label="Stuhlmodelle" onKeyDown={(event) => handleArrow(event, Math.max(0, CHAIR_MODELS.findIndex((item) => item.id === activeModelId)))}>
          {CHAIR_MODELS.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => { tabs.current[index] = element; }}
              id={`chair-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={item.id === activeModelId}
              aria-controls={item.id === activeModelId ? panelId : undefined}
              tabIndex={item.id === activeModelId ? 0 : -1}
              className="planner-table-compare__tab"
              onClick={() => chooseModel(item.id)}
            >
              <span>{item.shortName}</span>
              <small>{item.sourceStatus === "confirmed" ? "Maßblatt" : "Bild-/Spiegelmaß"}</small>
            </button>
          ))}
        </div>

        <div id={panelId} role="tabpanel" tabIndex={0} aria-labelledby={`chair-tab-${model.id}`} className="planner-table-compare__panel">
          <div className="planner-table-compare__header">
            <div>
              <h3>{model.name}</h3>
              <p>{model.sourceLabel}</p>
            </div>
            <span className={`planner-table-compare__status planner-table-compare__status--${model.sourceStatus}`}>
              {model.sourceStatus === "confirmed" ? "Maßblatt bestätigt" : "Näherung sichtbar"}
            </span>
          </div>

          <div className="planner-table-compare__evidence" aria-label={`Produktbilder ${model.name}`}>
            {model.imageUrls.slice(0, 3).map((imageUrl, index) => (
              <a key={imageUrl} href={imageUrl} target="_blank" rel="noreferrer" aria-label={`Bildbeleg ${index + 1} · ${model.shortName}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={`Produktbild ${model.name}, Beleg ${index + 1}`} loading="lazy" />
              </a>
            ))}
          </div>

          <div className="planner-table-compare__measure">
            <strong>{formatCentimetres(model.sizeCm.width)} × {formatCentimetres(model.sizeCm.depth)} × {formatCentimetres(model.sizeCm.height)} cm</strong>
            <span>Sitz {formatCentimetres(model.seatCm.width)} × {formatCentimetres(model.seatCm.depth)} cm · Sitzhöhe {formatCentimetres(model.seatCm.height)} cm{model.armHeightCm ? ` · Armlehne ${formatCentimetres(model.armHeightCm)} cm` : ""}</span>
          </div>
          <p className="planner-table-compare__notes">{model.sourceNotes.join(" ")}</p>

          <div className="planner-table-compare__sources">
            <a href={model.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Originalquelle · ${model.shortName}`}>Originalquelle · {model.shortName}</a>
            {model.mirrorUrl ? <a href={model.mirrorUrl} target="_blank" rel="noreferrer">Maß-/Bildspiegel</a> : null}
            <span>{model.swivel ? "Drehbar" : "Feststehend"} · {baseLabel(model.baseStyle)} · vier Plätze werden automatisch um den gewählten Tisch gelegt.</span>
          </div>
          <p className="planner-table-compare__collision" role="note">
            {model.sourceStatus === "confirmed" ? "Maße und Fußgeometrie bestätigt; der schwarze Sternfuß ist als 65 × 65 cm Stellfläche berücksichtigt." : "Maße sind mangels öffentlich lesbarer Temu-Maßgrafik geschätzt; die Modellfläche und Sitzposition bleiben im Grundriss maßstäblich zur angegebenen Näherung."}
          </p>
          <button type="button" className="planner-button planner-button--primary" disabled={!chairModelHasGeometry(model)} onClick={apply}>Vier Stühle im Grundriss anwenden</button>
        </div>
      </div>
    </details>
  );
}

function formatCentimetres(value: number) {
  return value.toLocaleString("de-AT", { maximumFractionDigits: 1 });
}

function baseLabel(style: string) {
  return style === "metal-legs" ? "vier Metallbeine" : style === "swivel-metal-legs" ? "Drehplatte + vier Metallbeine" : style === "star-base" ? "Sternfuß 65 × 65 cm" : "Drehplatte";
}
