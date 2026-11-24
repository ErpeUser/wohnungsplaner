"use client";

import { useState } from "react";
import type { CommandResult, PlannerCommand } from "../domain/commands.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import {
  WC_REAR_WALL_WIDTH_CM, WC_WALLBOARD_OPTIONS,
  getSelectedWcWallboardOption, wallboardDimensionLabel,
} from "../domain/wc-wallboards.ts";

const euro = new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" });

/** One selector drives the saved WC geometry and the derived shopping-list article. */
export function WcWallboardPicker({ document, dispatch, compact = false }: {
  document: PlannerDocumentV3;
  dispatch(command: PlannerCommand): CommandResult;
  compact?: boolean;
}) {
  const selected = getSelectedWcWallboardOption(document);
  const [error, setError] = useState<string | null>(null);
  const headingId = compact ? "wc-wallboard-inspector-title" : "wc-wallboard-shopping-title";
  return (
    <section className={`planner-wallboards${compact ? " planner-wallboards--compact" : ""}`} aria-labelledby={headingId}>
      <div className="planner-wallboards__heading">
        <div>
          <h3 id={headingId}>Wandboard für das WC</h3>
          <p>Eine Variante wählen. Maßzeichnung und Einkaufsliste ändern sich gemeinsam.</p>
        </div>
        <span className="planner-wallboards__count">3 Varianten</span>
      </div>
      <div className="planner-wallboards__options" role="group" aria-label="WC-Wandboard auswählen">
        {WC_WALLBOARD_OPTIONS.map((option) => {
          const active = selected.id === option.id;
          return (
            <article className="planner-wallboard-choice" data-selected={active} data-option={option.id} key={option.id}>
              <button
                type="button"
                className="planner-wallboard-choice__select"
                aria-pressed={active}
                aria-label={`${option.name}, ${wallboardDimensionLabel(option)}, ${euro.format(option.price)}${active ? ", ausgewählt" : ", auswählen"}`}
                onClick={() => {
                  if (active) return;
                  const result = dispatch({ type: "setWcWallboard", optionId: option.id });
                  setError(result.error?.message ?? null);
                }}
              >
                <span className="planner-wallboard-choice__sample" aria-hidden="true">
                  <span className="planner-wallboard-choice__sample-board" style={{
                    backgroundColor: option.swatch,
                    width: `${(option.widthCm / 90) * 100}%`,
                    height: `${option.depthCm * 1.05}px`,
                  }} />
                </span>
                <span className="planner-wallboard-choice__body">
                  <strong>{option.shortName}</strong>
                  <span className="planner-wallboard-choice__measure">{wallboardDimensionLabel(option)}</span>
                  <small>{option.finish}</small>
                </span>
                <span className="planner-wallboard-choice__price">
                  <strong>{euro.format(option.price)}</strong>
                  <small>{active ? "✓ Gewählt" : "Wählen"}</small>
                </span>
              </button>
              <a className="planner-wallboard-choice__source" href={option.sourceUrl} target="_blank" rel="noreferrer">
                Produktdetails bei {option.retailer} ↗
              </a>
            </article>
          );
        })}
      </div>
      <p className="planner-wallboards__fit">
        Rückwand {WC_REAR_WALL_WIDTH_CM} cm breit · seitlicher Abstand bei {selected.widthCm} cm:
        {" "}{(WC_REAR_WALL_WIDTH_CM - selected.widthCm) / 2} cm je Seite. Produktpreise vor dem Kauf prüfen.
      </p>
      {error ? <p className="planner-field-error" role="alert">{error}</p> : null}
    </section>
  );
}
