"use client";

import { useState } from "react";
import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import type { PlannerCommand, CommandResult } from "../domain/commands.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import { CHAIR_MODELS, chairModelHasGeometry, getChairModel, getChairModelForCatalogId, type ChairModelId } from "../chairs/chair-models.ts";
import { centimetres, ModelEvidence, ModelImage } from "./model-evidence.tsx";

export function ChairComparisonPanel({ document, placementId, dispatch, select }: {
  document: PlannerDocumentV3;
  placementId?: string;
  dispatch(command: PlannerCommand): CommandResult;
  select(id: string | null): void;
}) {
  const chair = document.placements.find((item) => item.id === placementId);
  const initial = getChairModelForCatalogId(chair?.catalogId)?.id ?? CHAIR_MODELS[0].id;
  const [modelId, setModelId] = useState<ChairModelId>(initial);
  const [error, setError] = useState<string | null>(null);
  const model = getChairModel(modelId) ?? CHAIR_MODELS[0];
  const material = getFurnitureCatalogItem(model.catalogId)?.materials.find((item) => item.id === model.materialId)?.label;

  if (!chair) {
    return (
      <label className="planner-select-field">
        <span>Stuhl auswählen</span>
        <select aria-label="Stuhl auswählen" value="" onChange={(event) => select(event.target.value)}>
          <option value="" disabled>Welchen Sitzplatz möchtest du ändern?</option>
          {document.placements.filter((item) => /^living-kaleo-chair-(west|east|south|north)$/.test(item.id)).map((item, index) => (
            <option key={item.id} value={item.id}>Stuhl {index + 1} · {getFurnitureCatalogItem(item.catalogId)?.name ?? item.catalogId}</option>
          ))}
        </select>
      </label>
    );
  }

  const apply = () => {
    const result = dispatch({ type: "setPlacementChairModel", placementId: chair.id, modelId: model.id });
    setError(result.error?.message ?? null);
    if (!result.error) select(chair.id);
  };

  return (
    <div className="planner-model-choice">
      <label className="planner-select-field">
        <span>Stuhlmodell <small>{CHAIR_MODELS.length} Varianten</small></span>
        <select aria-label="Stuhlmodell" value={model.id} onChange={(event) => { setModelId(event.target.value as ChairModelId); setError(null); }}>
          {CHAIR_MODELS.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
        </select>
      </label>
      <div className="planner-model-preview">
        <a href={model.imageUrls[0] ?? model.sourceUrl} target="_blank" rel="noreferrer" className="planner-model-preview__image" aria-label={`Produktbild öffnen · ${model.shortName}`}>
          <ModelImage src={model.imageUrls[0]} name={model.name} />
        </a>
        <div><strong>{model.shortName}</strong><span className="planner-model-status" data-confidence={model.confidence}>{model.sourceStatus === "confirmed" ? "Maße belegt" : "Zuordnung / Maße geschätzt"}</span></div>
      </div>
      <dl className="planner-model-facts">
        <div><dt>B × T × H</dt><dd>{centimetres(model.sizeCm.width)} × {centimetres(model.sizeCm.depth)} × {centimetres(model.sizeCm.height)} cm</dd></div>
        <div><dt>Planmaterial</dt><dd>{material ?? "Materialangabe offen"}</dd></div>
        <div><dt>Sitzhöhe</dt><dd>{centimetres(model.seatCm.height)} cm · {model.swivel ? "drehbar" : "fest"}</dd></div>
        <div><dt>Fuß</dt><dd>{baseLabel(model.baseStyle)}</dd></div>
      </dl>
      <a className="planner-model-source" href={model.sourceUrl} target="_blank" rel="noreferrer">Originalquelle · {model.shortName} ↗</a>
      <button type="button" className="planner-button planner-button--primary planner-model-apply" disabled={!chairModelHasGeometry(model) || chair.catalogId === model.catalogId} onClick={apply}>Auf diesen Stuhl anwenden</button>
      <p className="planner-model-hint">Position und Drehung bleiben erhalten. Die anderen drei Stühle bleiben unverändert.</p>
      {error ? <p className="planner-field-error" role="alert">{error}</p> : null}
      <ModelEvidence name={model.shortName} sourceUrl={model.sourceUrl} sourceLabel={model.sourceLabel} imageUrls={model.imageUrls} notes={model.sourceNotes} mirrorUrl={model.mirrorUrl} />
    </div>
  );
}

function baseLabel(style: string) {
  if (style === "metal-legs") return "Vier Metallbeine";
  if (style === "swivel-metal-legs") return "Drehplatte und vier Metallbeine";
  if (style === "star-base") return "Vierarmiger Kreuzfuß";
  return "Runder Tellerfuß";
}
