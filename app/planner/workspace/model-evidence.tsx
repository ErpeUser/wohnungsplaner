"use client";

import { useState } from "react";

/** Catalog product URLs only; never apartment reference media. */
export function ModelImage({ src, name, kind = "Produktreferenz" }: { src?: string; name: string; kind?: "Produktreferenz" | "Maßgrafik" }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src) return <span className="planner-model-image__fallback">Kein Bildbeleg</span>;
  if (failedSource === src) return <span className="planner-model-image__fallback">Bild über Quelle öffnen</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={`${kind}: ${name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} />
  );
}

export function ModelEvidence({ name, sourceUrl, sourceLabel, imageUrls, notes, mirrorUrl }: {
  name: string;
  sourceUrl: string;
  sourceLabel: string;
  imageUrls: readonly string[];
  notes: readonly string[];
  mirrorUrl?: string;
}) {
  return (
    <details className="planner-model-evidence">
      <summary>Produktbelege und Unsicherheiten</summary>
      <p>{sourceLabel}</p>
      <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
      <div className="planner-model-evidence__images">
        {imageUrls.slice(0, 3).map((url, index) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Bildbeleg ${index + 1} · ${name}`}>
            <ModelImage src={url} name={`${name}, Beleg ${index + 1}`} kind={referenceKind(url)} />
          </a>
        ))}
      </div>
      {mirrorUrl ? <a href={mirrorUrl} target="_blank" rel="noreferrer">Vergleichsquelle · Zuordnung prüfen</a> : <a href={sourceUrl} target="_blank" rel="noreferrer">Quelle · {name}</a>}
    </details>
  );
}

export function centimetres(value: number) {
  return value.toLocaleString("de-AT", { maximumFractionDigits: 1 });
}

export function referenceKind(url?: string): "Produktreferenz" | "Maßgrafik" {
  // The two saved Kaufland assets are both the supplier's dimension diagram.
  return url?.includes("/kaufland-567080013/") || url?.includes("dimensions.") ? "Maßgrafik" : "Produktreferenz";
}
