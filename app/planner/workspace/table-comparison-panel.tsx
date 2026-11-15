"use client";

import { useState } from "react";
import { getFurnitureCatalogItem } from "../catalog/catalog.ts";
import type { PlannerCommand, CommandResult } from "../domain/commands.ts";
import { inspectPlacement } from "../domain/collisions.ts";
import type { PlannerDocumentV3 } from "../domain/types.ts";
import { TABLE_MODELS, getTableModel, getTableModelForCatalogId, getTableVariant, metresFromCentimetres, tableModelHasGeometry, tableVisualProfile, type TableModelId, type TableVariantId } from "../tables/table-models.ts";
import { centimetres, ModelEvidence, ModelImage, referenceKind } from "./model-evidence.tsx";

const PRIMARY_TABLE_MODEL_IDS: readonly TableModelId[] = [
  "aliexpress-100-140", "temu-606997-120-160", "kaufland-567080013-120-160",
];
const PRIMARY_TABLE_MODELS = TABLE_MODELS.filter((model) => PRIMARY_TABLE_MODEL_IDS.includes(model.id));

export function TableComparisonPanel({ document, dispatch, select }: {
  document: PlannerDocumentV3;
  dispatch(command: PlannerCommand): CommandResult;
  select(id: string | null): void;
}) {
  const table = document.placements.find((item) => item.id === "living-bozan-table");
  const initial = getTableModelForCatalogId(table?.catalogId);
  const extraCurrentModel = initial && !PRIMARY_TABLE_MODEL_IDS.includes(initial.id) ? initial : null;
  const initialVariant = initial?.variants.find((item) => table && sameSize(table.size, metresFromCentimetres(item.sizeCm)));
  const [modelId, setModelId] = useState<TableModelId>(initial?.id ?? PRIMARY_TABLE_MODELS[0].id);
  const [variantId, setVariantId] = useState<TableVariantId>(initialVariant?.id ?? "closed");
  const [error, setError] = useState<string | null>(null);
  const model = getTableModel(modelId) ?? PRIMARY_TABLE_MODELS[0];
  const variant = getTableVariant(model, variantId) ?? model.variants[0];
  const material = getFurnitureCatalogItem(model.catalogId ?? "")?.materials.find((item) => item.id === model.materialId)?.label;
  const preview = table && variant && model.catalogId ? inspectPlacement(document, { ...table, catalogId: model.catalogId, size: metresFromCentimetres(variant.sizeCm) }, {
    ignorePlacementIds: new Set(document.placements.filter((item) => table.groupId && item.groupId === table.groupId && item.id !== table.id).map((item) => item.id)),
  }) : null;
  const unchanged = table && variant && table.catalogId === model.catalogId && sameSize(table.size, metresFromCentimetres(variant.sizeCm));

  const apply = () => {
    if (!table || !variant || !model.catalogId) return;
    const result = dispatch({ type: "setPlacementProduct", placementId: table.id, catalogId: model.catalogId, size: metresFromCentimetres(variant.sizeCm), materialId: model.materialId });
    setError(result.error?.message ?? null);
    if (!result.error) select(table.id);
  };

  return (
    <div className="planner-model-choice">
      <label className="planner-select-field">
        <span>Tischmodell <small>{PRIMARY_TABLE_MODELS.length} Hauptmodelle</small></span>
        <select aria-label="Tischmodell" value={model.id} onChange={(event) => { setModelId(event.target.value as TableModelId); setVariantId("closed"); setError(null); }}>
          {extraCurrentModel ? <option value={extraCurrentModel.id} disabled>Aktuell im Plan · {extraCurrentModel.shortName}</option> : null}
          {PRIMARY_TABLE_MODELS.map((item) => <option key={item.id} value={item.id} disabled={!tableModelHasGeometry(item)}>{item.shortName}</option>)}
        </select>
      </label>
      <div className="planner-model-preview">
        <a href={model.imageUrls[0] ?? model.sourceUrl} target="_blank" rel="noreferrer" className="planner-model-preview__image" aria-label={`${referenceKind(model.imageUrls[0])} öffnen · ${model.shortName}`}>
          <ModelImage src={model.imageUrls[0]} name={model.name} kind={referenceKind(model.imageUrls[0])} />
        </a>
        <div><strong>{model.shortName}</strong><span className="planner-model-status" data-confidence={variant?.confidence}>{variant?.confidence === "confirmed" ? "Maße belegt" : "Maße teilweise geschätzt"}</span></div>
      </div>
      <label className="planner-select-field">
        <span>Ausziehzustand</span>
        <select aria-label="Ausziehzustand" value={variant?.id ?? ""} onChange={(event) => { setVariantId(event.target.value as TableVariantId); setError(null); }}>
          {model.variants.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <dl className="planner-model-facts">
        <div><dt>B × T × H</dt><dd>{variant ? `${centimetres(variant.sizeCm.width)} × ${centimetres(variant.sizeCm.depth)} × ${centimetres(variant.sizeCm.height)} cm` : "Maße offen"}</dd></div>
        <div><dt>Planmaterial</dt><dd>{material ?? "Materialangabe offen"}</dd></div>
        <div><dt>Konstruktion</dt><dd>{constructionLabel(tableVisualProfile(model.catalogId))}</dd></div>
      </dl>
      <a className="planner-model-source" href={model.sourceUrl} target="_blank" rel="noreferrer">Originalquelle · {model.shortName} ↗</a>
      <button type="button" className="planner-button planner-button--primary planner-model-apply" disabled={!table || !tableModelHasGeometry(model) || !variant || Boolean(unchanged) || Boolean(preview?.hard.length)} onClick={apply}>Auf diesen Tisch anwenden</button>
      {preview?.hard.length ? <p className="planner-field-error" role="alert">{preview.hard[0].message} Wähle einen kleineren Ausziehzustand oder verschiebe den Tisch.</p> : <p className="planner-model-hint">Position, Drehung und die vier einzeln platzierten Stühle bleiben erhalten.</p>}
      {preview?.warnings.length ? <p className="planner-model-hint" role="note">{preview.warnings[0].message}</p> : null}
      {error ? <p className="planner-field-error" role="alert">{error}</p> : null}
      <ModelEvidence name={model.shortName} sourceUrl={model.sourceUrl} sourceLabel={model.sourceLabel} imageUrls={model.imageUrls} notes={[...model.sourceNotes, ...(variant?.notes ?? [])]} mirrorUrl={model.canonicalUrl} />
    </div>
  );
}

function sameSize(a: { width: number; depth: number; height: number }, b: { width: number; depth: number; height: number }) {
  return Math.abs(a.width - b.width) < 0.0001 && Math.abs(a.depth - b.depth) < 0.0001 && Math.abs(a.height - b.height) < 0.0001;
}

function constructionLabel(profile: ReturnType<typeof tableVisualProfile>) {
  if (profile === "fluted-extension-pedestal") return "Zwei geriffelte Stützen · Mittelauszug";
  if (profile === "fluted-round-pedestal") return "Geriffelter Rundsockel";
  if (profile === "storage-pedestal") return "Stauraumsockel mit Schiebetüren";
  return "Runde / ovale Platte auf Metallgestell";
}
