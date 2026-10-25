"use client";

import { useMemo, useState } from "react";

import {
  filterFurnitureCatalog,
  type FurnitureCategory,
} from "../catalog/catalog.ts";

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
}: {
  activeRoomId: string | null;
  onAdd(catalogId: string): void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FurnitureCategory | "Alle">("Alle");
  const items = useMemo(() => filterFurnitureCatalog(query, category), [category, query]);

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
      <p className="planner-panel__note">Alt beim Ziehen löst das Raster. Pfeiltasten bewegen 1 cm, mit Umschalt 10 cm.</p>
    </aside>
  );
}

function formatSize(meters: number) {
  return Math.round(meters * 100);
}
