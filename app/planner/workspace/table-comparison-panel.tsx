"use client";

import { useRef, useState, type KeyboardEvent, type MutableRefObject } from "react";

import type { PlannerCommand, CommandResult } from "../domain/commands.ts";
import { inspectPlacement } from "../domain/collisions.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import {
  TABLE_MODELS,
  getTableModel,
  getTableVariant,
  metresFromCentimetres,
  tableModelHasGeometry,
  type TableModelId,
  type TableVariantId,
} from "../tables/table-models.ts";

export function TableComparisonPanel({
  document,
  dispatch,
  select,
}: {
  document: PlannerDocumentV3;
  dispatch(command: PlannerCommand): CommandResult;
  select(id: string | null): void;
}) {
  const table = document.placements.find((placement) => placement.id === "living-bozan-table");
  const initialSelection = selectionForPlacement(table);
  const [activeModelId, setActiveModelId] = useState<TableModelId>(initialSelection?.modelId ?? TABLE_MODELS[0].id);
  const [activeVariantId, setActiveVariantId] = useState<TableVariantId>(initialSelection?.variantId ?? "closed");
  const modelTabs = useRef<Array<HTMLButtonElement | null>>([]);
  const variantTabs = useRef<Array<HTMLButtonElement | null>>([]);
  const model = getTableModel(activeModelId) ?? TABLE_MODELS[0];
  const variant = getTableVariant(model, activeVariantId) ?? model.variants[0];
  const panelId = `table-panel-${model.id}`;

  const chooseModel = (nextId: TableModelId) => {
    const next = getTableModel(nextId);
    if (!next || !tableModelHasGeometry(next)) return;
    setActiveModelId(nextId);
    setActiveVariantId(next.variants[0]?.id ?? "closed");
  };

  const apply = () => {
    if (!table || !variant || !model.catalogId) return;
    const result = dispatch({
      type: "setPlacementProduct",
      placementId: table.id,
      catalogId: model.catalogId,
      size: metresFromCentimetres(variant.sizeCm),
      materialId: model.materialId,
      metadata: {
        source: model.sourceLabel,
        confidence: variant.confidence === "unknown" ? "estimated" : variant.confidence,
        notes: [...model.sourceNotes, ...variant.notes, `Vergleichsmodell ${model.id} · Zustand ${variant.id}.`],
      },
    });
    if (!result.error) select(table.id);
  };

  const preview = table && variant && model.catalogId
    ? inspectPlacement(
        document,
        { ...table, catalogId: model.catalogId, size: metresFromCentimetres(variant.sizeCm) },
        table.groupId ? {
          ignorePlacementIds: new Set(document.placements.filter((item) => item.groupId === table.groupId && item.id !== table.id).map((item) => item.id)),
        } : undefined,
      )
    : null;

  const handleArrow = (event: KeyboardEvent<HTMLDivElement>, tabs: MutableRefObject<Array<HTMLButtonElement | null>>, index: number, enabledIndices: number[], onMove?: (nextIndex: number) => void) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (!enabledIndices.length) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const current = Math.max(0, enabledIndices.indexOf(index));
    const next = event.key === "Home" ? 0 : event.key === "End" ? enabledIndices.length - 1 : (current + delta + enabledIndices.length) % enabledIndices.length;
    const nextIndex = enabledIndices[next];
    tabs.current[nextIndex]?.focus();
    onMove?.(nextIndex);
  };

  return (
    <details className="planner-table-compare" open>
      <summary className="planner-table-compare__summary">
        <span>
          <span className="planner-kicker">Essgruppe</span>
          <strong>Tischvergleich · maßstäblich im Grundriss</strong>
        </span>
        <span className="planner-table-compare__summary-hint">4 Modelle · cm</span>
      </summary>
      <div className="planner-table-compare__body">
        <div className="planner-table-compare__tabs" role="tablist" aria-label="Tischmodelle" onKeyDown={(event) => handleArrow(event, modelTabs, Math.max(0, TABLE_MODELS.findIndex((item) => item.id === activeModelId)), TABLE_MODELS.map((item, index) => tableModelHasGeometry(item) ? index : -1).filter((index) => index >= 0), (nextIndex) => chooseModel(TABLE_MODELS[nextIndex].id))}>
          {TABLE_MODELS.map((item, index) => {
            const available = tableModelHasGeometry(item);
            return (
              <button
                key={item.id}
                ref={(element) => { modelTabs.current[index] = element; }}
                id={`table-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={item.id === activeModelId}
                aria-controls={item.id === activeModelId ? panelId : undefined}
                aria-describedby={available ? undefined : "table-blocked-source"}
                aria-disabled={!available}
                disabled={!available}
                tabIndex={item.id === activeModelId ? 0 : -1}
                className="planner-table-compare__tab"
                onClick={() => chooseModel(item.id)}
              >
                <span>{item.shortName}</span>
                <small id={!available ? "table-tab-status-blocked" : undefined}>{item.sourceStatus === "blocked" ? "Quelle blockiert" : item.sourceStatus === "confirmed" ? "Maßgrafik" : "Spiegelbeleg"}</small>
              </button>
            );
          })}
        </div>

        <p id="table-blocked-source" className="planner-table-compare__blocked-source">
          <strong>Blockierte Quelle:</strong> Für Temu 609726 sind noch keine belastbaren Maße verfügbar. <a href="https://www.temu.com/at/g-609726356120319.html" target="_blank" rel="noreferrer">Originalquelle öffnen</a>.
        </p>

        <div id={panelId} role="tabpanel" tabIndex={0} aria-labelledby={`table-tab-${model.id}`} className="planner-table-compare__panel">
          <div className="planner-table-compare__header">
            <div>
              <h3>{model.name}</h3>
              <p>{model.sourceLabel}</p>
            </div>
            <span className={`planner-table-compare__status planner-table-compare__status--${model.sourceStatus}`}>{model.sourceStatus === "confirmed" ? "Maßgrafik bestätigt" : "Maße aus Spiegelbeleg"}</span>
          </div>

          {model.imageUrls.length ? (
            <div className="planner-table-compare__evidence" aria-label={`Produktbilder ${model.name}`}>
              {model.imageUrls.slice(0, 2).map((imageUrl, index) => (
                <a key={imageUrl} href={imageUrl} target="_blank" rel="noreferrer" aria-label={`Bildbeleg ${index + 1} · ${model.shortName}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={`Produktbild ${model.name}, Beleg ${index + 1}`} loading="lazy" />
                </a>
              ))}
            </div>
          ) : null}

          {model.variants.length ? (
            <>
              <div className="planner-table-compare__variants" role="tablist" aria-label="Ausziehstufen" onKeyDown={(event) => handleArrow(event, variantTabs, Math.max(0, model.variants.findIndex((item) => item.id === (variant?.id ?? activeVariantId))), model.variants.map((_, index) => index), (nextIndex) => setActiveVariantId(model.variants[nextIndex].id))}>
                {model.variants.map((item, index) => (
                  <button
                    key={item.id}
                    ref={(element) => { variantTabs.current[index] = element; }}
                    type="button"
                    role="tab"
                    aria-selected={item.id === variant?.id}
                    aria-controls={`${panelId}-variant`}
                    tabIndex={item.id === variant?.id ? 0 : -1}
                    className="planner-table-compare__variant"
                    onClick={() => setActiveVariantId(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div id={`${panelId}-variant`} role="tabpanel" className="planner-table-compare__measure">
                <strong>{variant ? `${formatCentimetres(variant.sizeCm.width)} × ${formatCentimetres(variant.sizeCm.depth)} × ${formatCentimetres(variant.sizeCm.height)} cm` : "Maße offen"}</strong>
                <span>{variant ? `${variant.seatCount} Sitzplätze · ${variant.confidence === "confirmed" ? "bestätigt" : "geschätzt"}` : "Keine belegte Geometrie"}</span>
              </div>
              <p className="planner-table-compare__notes">{variant?.notes.join(" ")}</p>
            </>
          ) : (
            <p className="planner-table-compare__blocked" role="status">Diese Quelle ist derzeit durch Login/Sicherheitsprüfung blockiert. Es gibt keine belastbaren Maße; der Tisch wird deshalb nicht in den Grundriss übernommen.</p>
          )}

          <div className="planner-table-compare__sources">
            <a href={model.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Originalquelle · ${model.shortName}`}>Originalquelle · {model.shortName}</a>
            {model.canonicalUrl ? <a href={model.canonicalUrl} target="_blank" rel="noreferrer">Canonical-/Spiegelquelle</a> : null}
            <span>{model.sourceNotes[0]}</span>
          </div>
          {preview?.hard.length ? <p className="planner-table-compare__collision planner-table-compare__collision--hard" role="alert">Dieser Zustand passt an der aktuellen Position nicht in den Raum; der harte Konflikt wird beim Anwenden blockiert.</p> : preview?.warnings.length ? <p className="planner-table-compare__collision" role="note">Passagehinweis: Der Zustand passt geometrisch, verringert aber den empfohlenen Durchgang.</p> : <p className="planner-table-compare__collision" role="note">Keine harte Geometriekollision an der aktuellen Position.</p>}
          <button type="button" className="planner-button planner-button--primary" disabled={!tableModelHasGeometry(model) || !variant} onClick={apply}>Im Grundriss anwenden</button>
        </div>
      </div>
    </details>
  );
}

function formatCentimetres(value: number) {
  return value.toLocaleString("de-AT", { maximumFractionDigits: 1 });
}

function selectionForPlacement(placement: PlannerDocumentV3["placements"][number] | undefined) {
  if (!placement) return null;
  const model = TABLE_MODELS.find((candidate) => candidate.catalogId === placement.catalogId);
  if (!model) return null;
  const variant = model.variants.find((candidate) => {
    const size = metresFromCentimetres(candidate.sizeCm);
    return Math.abs(size.width - placement.size.width) < 0.0001
      && Math.abs(size.depth - placement.size.depth) < 0.0001
      && Math.abs(size.height - placement.size.height) < 0.0001;
  });
  return variant ? { modelId: model.id, variantId: variant.id } : { modelId: model.id, variantId: model.variants[0]?.id ?? "closed" };
}
