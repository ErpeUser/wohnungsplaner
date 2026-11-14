"use client";

import { lazy, Suspense, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { REVIEW_MODELS, type ReviewView } from "./review-models.ts";
import type { ReviewReferences } from "./reference-files.ts";
import "./model-review.css";

const Preview = lazy(() => import("./model-review-canvas.tsx").then((module) => ({ default: module.ModelReviewCanvas })));
const subscribe = () => () => {};
const browserSnapshot = () => true;
const serverSnapshot = () => false;
const VIEWS: { id: ReviewView; label: string }[] = [
  { id: "perspective", label: "Schrägansicht" }, { id: "front", label: "Vorne" },
  { id: "side", label: "Seite" }, { id: "back", label: "Hinten" },
];

export function ModelReview({ references, initialModelId = "chair-kaleo-chenille-beige", initialView = "perspective" }: {
  references: Record<string, ReviewReferences>;
  initialModelId?: string;
  initialView?: ReviewView;
}) {
  const clientReady = useSyncExternalStore(subscribe, browserSnapshot, serverSnapshot);
  const [modelId, setModelId] = useState(initialModelId);
  const [view, setView] = useState<ReviewView>(initialView);
  const [variant, setVariant] = useState<string | undefined>();
  const [material, setMaterial] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const model = REVIEW_MODELS.find((entry) => entry.id === modelId)!;
  const source = references[model.id];
  const materialId = material ?? model.materials[0].id;
  const variantId = variant ?? model.variants[0].id;
  const renderKey = `${model.id}:${view}:${materialId}:${variantId}`;

  function changeModel(id: string) {
    setReady(false); setModelId(id); setMaterial(undefined); setVariant(undefined);
    window.history.replaceState(null, "", `?model=${encodeURIComponent(id)}&view=${view}`);
  }

  return <main className="model-review">
    <header className="model-review__header">
      <div><p>Werkstatt · Visuelle Prüfung</p><h1>Modellgalerie</h1><Link href="/">Zur Wohnungsplanung</Link></div>
      <p>Originale Renderer, feste Perspektiven und gespeicherte Produktreferenzen.</p>
    </header>
    <section className="model-review__controls" aria-label="Modellprüfung einstellen">
      <label>Modell<select aria-label="Modell" value={model.id} onChange={(event) => changeModel(event.target.value)}>
        {REVIEW_MODELS.map((entry) => <option key={entry.id} value={entry.id}>{entry.category} · {entry.name}</option>)}
      </select></label>
      <label>Perspektive<select aria-label="Perspektive" value={view} onChange={(event) => { setReady(false); setView(event.target.value as ReviewView); window.history.replaceState(null, "", `?model=${encodeURIComponent(model.id)}&view=${event.target.value}`); }}>
        {VIEWS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
      </select></label>
      <label>Material<select aria-label="Material" value={materialId} onChange={(event) => { setReady(false); setMaterial(event.target.value); }}>
        {model.materials.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
      </select></label>
      <label>Größenvariante<select aria-label="Größenvariante" value={variantId} onChange={(event) => { setReady(false); setVariant(event.target.value); }}>
        {model.variants.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
      </select></label>
    </section>
    <div className="model-review__columns">
      <section className="model-review__panel" aria-label="Gerendertes Modell">
        <h2>{model.name}</h2><code data-testid="model-id">{model.id}</code>
        <div className="model-review__canvas">
          <Suspense fallback={<p>3D wird geladen …</p>}>
            {clientReady ? <Preview key={renderKey} modelId={model.id} materialId={materialId} variantId={variantId} view={view} renderKey={renderKey} onReady={() => setReady(true)} /> : <p>3D wird geladen …</p>}
          </Suspense>
        </div>
        <p role="status" data-testid="model-render-status">{ready ? "3D bereit" : "3D wird vorbereitet …"}</p>
        <p>Die Darstellung zeigt das aktuelle Projektmodell. Produkttreue muss anhand der Referenzen beurteilt werden.</p>
      </section>
      <section className="model-review__panel" aria-label="Produktreferenzen">
        <h2>Produktreferenzen</h2>
        {source?.links.map((link, index) => <p key={link}><a href={link} target="_blank" rel="noreferrer">Produktquelle {index + 1}</a></p>)}
        {source?.images.length ? <><p>Gespeicherter Händlerauszug. Vergleichsbilder können Empfehlungen für andere Produkte enthalten.</p><div className="model-review__references">{source.images.map((entry) => <a key={entry.src} href={entry.src} target="_blank" rel="noreferrer">
          {/* Local review references retain their original raster bytes. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.src} alt={entry.label} loading="lazy" />
        </a>)}</div></> : <p>Für dieses Modell sind keine gespeicherten Raster-Referenzen vorhanden.</p>}
      </section>
    </div>
  </main>;
}
