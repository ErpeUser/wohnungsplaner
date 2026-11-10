"use client";

import { useMemo, useRef, useState } from "react";

import {
  filterFurnitureCatalog,
  type FurnitureCategory,
} from "../catalog/catalog.ts";
import { preparePlannerAsset, type AssetImportMetadata } from "../catalog/asset-import.ts";
import type { PlannerAssetRecord, PlannerDocumentV3 } from "../domain/types.ts";

const CATEGORIES: Array<FurnitureCategory | "Alle"> = [
  "Alle",
  "Schlafen",
  "Sitzen",
  "Arbeiten",
  "Aufbewahren",
  "Tische",
  "Licht/Deko",
];

export function CatalogPanel({
  activeRoomId,
  onAdd,
  document,
  onRegisterAsset,
}: {
  activeRoomId: string | null;
  onAdd(catalogId: string): void;
  document?: PlannerDocumentV3;
  onRegisterAsset?(asset: PlannerAssetRecord): string | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FurnitureCategory | "Alle">("Alle");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [assetCategory, setAssetCategory] = useState<FurnitureCategory>("Licht/Deko");
  const [width, setWidth] = useState("1");
  const [depth, setDepth] = useState("1");
  const [height, setHeight] = useState("1");
  const [materialId, setMaterialId] = useState("object-neutral");
  const [source, setSource] = useState("manual-import");
  const [sourceUrl, setSourceUrl] = useState("");
  const [license, setLicense] = useState<AssetImportMetadata["license"]>("CC0-1.0");
  const [confidence, setConfidence] = useState<AssetImportMetadata["confidence"]>("estimated");
  const [importState, setImportState] = useState<"idle" | "reading" | "registering">("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => filterFurnitureCatalog(query, category), [category, query]);

  const onFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setImportError(null);
    setImportMessage(null);
    if (nextFile && !name) setName(nextFile.name.replace(/\.[^.]+$/, ""));
  };

  const importAsset = async () => {
    if (!file || !onRegisterAsset) return;
    setImportState("reading");
    setImportError(null);
    setImportMessage(null);
    try {
      const parsedWidth = Number(width);
      const parsedDepth = Number(depth);
      const parsedHeight = Number(height);
      const metadata: AssetImportMetadata = {
        name: name.trim(),
        category: assetCategory,
        width: parsedWidth,
        depth: parsedDepth,
        height: parsedHeight,
        materialId: materialId.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
        license,
        confidence,
        source: source.trim(),
        notes: ["Lokaler Import; Storage-Verknüpfung muss separat freigegeben werden."],
      };
      const prepared = await preparePlannerAsset(
        metadata,
        new Uint8Array(await file.arrayBuffer()),
        { filename: file.name, mediaType: file.type || undefined },
      );
      setImportState("registering");
      const asset: PlannerAssetRecord = {
        ...prepared,
        mediaType: prepared.mediaType as PlannerAssetRecord["mediaType"],
        createdAt: new Date().toISOString(),
      };
      const error = onRegisterAsset(asset);
      if (error) {
        setImportError(error);
        return;
      }
      setImportMessage(`${asset.name} wurde lokal registriert. Eine Storage-URL ist noch nicht hinterlegt.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Der Asset-Import ist fehlgeschlagen.");
    } finally {
      setImportState("idle");
    }
  };

  return (
    <aside id="planner-catalog" className="planner-panel planner-panel--catalog" aria-label="Möbelkatalog">
      <header className="planner-panel__header">
        <span className="planner-kicker">Bibliothek</span>
        <h2>Möbel & Objekte</h2>
        <p>{activeRoomId ? "Maßhaltige Elemente für den aktiven Raum." : "Wähle zuerst einen Raum aus."}</p>
      </header>
      <label className="planner-catalog__search">
        <span className="planner-visually-hidden">Möbel suchen</span>
        <input
          type="search"
          aria-label="Möbel suchen"
          placeholder="Möbel suchen …"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="planner-catalog__categories" aria-label="Möbelkategorie">
        {CATEGORIES.map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={entry === category}
            onClick={() => setCategory(entry)}
          >
            {entry}
          </button>
        ))}
      </div>
      <section className="planner-catalog__import" aria-labelledby="planner-asset-import-title">
        <div className="planner-catalog__import-header">
          <div>
            <span className="planner-kicker">Lokaler Import</span>
            <h3 id="planner-asset-import-title">Eigenes Asset hinzufügen</h3>
          </div>
          <span className="planner-catalog__import-limit">max. 5 MB</span>
        </div>
        <label className="planner-catalog__file">
          <span>Datei (GLB, PNG, JPEG, SVG, WEBP)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.png,.jpg,.jpeg,.svg,.webp,model/gltf-binary,image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
        {file ? <p className="planner-catalog__file-name" title={file.name}>{file.name} · {formatBytes(file.size)}</p> : null}
        <div className="planner-catalog__import-grid">
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="z. B. Meine Leuchte" /></label>
          <label>Kategorie<select value={assetCategory} onChange={(event) => setAssetCategory(event.target.value as FurnitureCategory)}>{CATEGORIES.filter((entry): entry is FurnitureCategory => entry !== "Alle").map((entry) => <option key={entry}>{entry}</option>)}</select></label>
          <label>Breite (m)<input inputMode="decimal" type="number" min="0.01" step="0.01" value={width} onChange={(event) => setWidth(event.target.value)} /></label>
          <label>Tiefe (m)<input inputMode="decimal" type="number" min="0.01" step="0.01" value={depth} onChange={(event) => setDepth(event.target.value)} /></label>
          <label>Höhe (m)<input inputMode="decimal" type="number" min="0.01" step="0.01" value={height} onChange={(event) => setHeight(event.target.value)} /></label>
          <label>Material-ID<input value={materialId} onChange={(event) => setMaterialId(event.target.value)} /></label>
          <label>Quelle<input value={source} onChange={(event) => setSource(event.target.value)} /></label>
          <label>Confidence<select value={confidence} onChange={(event) => setConfidence(event.target.value as AssetImportMetadata["confidence"])}><option value="estimated">geschätzt</option><option value="confirmed">bestätigt</option><option value="legacy">Bestand</option></select></label>
          <label>Lizenz<select value={license} onChange={(event) => setLicense(event.target.value as AssetImportMetadata["license"])}><option value="CC0-1.0">CC0-1.0</option><option value="MIT">MIT</option></select></label>
          <label className="planner-catalog__import-wide">Quell-URL (optional)<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label>
        </div>
        <button type="button" className="planner-catalog__import-button" disabled={!file || !onRegisterAsset || importState !== "idle"} onClick={() => void importAsset()}>
          {importState === "reading" ? "Datei wird geprüft …" : importState === "registering" ? "Asset wird registriert …" : "Asset lokal registrieren"}
        </button>
        <p className="planner-catalog__import-hint">Die Datei wird nur lokal validiert. Ohne freigegebenen Storage-Vertrag wird kein URL-Upload vorgetäuscht.</p>
        {importError ? <p className="planner-catalog__import-error" role="alert">{importError}</p> : null}
        {importMessage ? <p className="planner-catalog__import-success" role="status">{importMessage}</p> : null}
      </section>
      <div className="planner-catalog__items" role="list" aria-label="Möbel">
        {items.map((item) => (
          <article key={item.id} role="listitem" className="planner-catalog__item">
            <span className={`planner-catalog__symbol planner-catalog__symbol--${item.symbol}`} aria-hidden="true" />
            <span>
              <strong>{item.name}</strong>
              <small>{formatSize(item.defaultSize.width)} × {formatSize(item.defaultSize.depth)} cm</small>
            </span>
            <button
              type="button"
              aria-label={`${item.name} hinzufügen`}
              disabled={!activeRoomId}
              onClick={() => onAdd(item.id)}
            >
              +
            </button>
          </article>
        ))}
        {items.length === 0 ? <p className="planner-catalog__empty">Keine passenden Möbel gefunden.</p> : null}
      </div>
      {document?.assets?.length ? (
        <section className="planner-catalog__assets" aria-label="Registrierte lokale Assets">
          <h3>Registrierte Assets</h3>
          {document.assets.map((asset) => <article key={asset.assetId} className="planner-catalog__asset-record"><strong>{asset.name}</strong><small>{asset.normalizedSize.width.toFixed(2)} × {asset.normalizedSize.depth.toFixed(2)} × {asset.normalizedSize.height.toFixed(2)} m · {asset.confidence}</small><small>{asset.assetUrl ? "Storage-URL hinterlegt" : "nur lokal registriert"}</small></article>)}
        </section>
      ) : null}
      <p className="planner-panel__note">Alt beim Ziehen löst das Raster. Pfeiltasten bewegen 1 cm, mit Umschalt 10 cm.</p>
    </aside>
  );
}

function formatSize(meters: number) {
  return Math.round(meters * 100);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
