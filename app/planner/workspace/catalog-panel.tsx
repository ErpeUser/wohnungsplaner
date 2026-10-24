const PREVIEW_GROUPS = [
  { name: "Sitzen", detail: "Sofas, Sessel, Stühle", glyph: "⌑" },
  { name: "Schlafen", detail: "Betten und Nachtmöbel", glyph: "▱" },
  { name: "Arbeiten", detail: "Tische, Bürostühle, Regale", glyph: "⌗" },
  { name: "Stauraum", detail: "Schränke und Kommoden", glyph: "▥" },
  { name: "Licht & Textil", detail: "Leuchten, Teppiche, Vorhänge", glyph: "◌" },
];

export function CatalogPanel() {
  return (
    <aside id="planner-catalog" className="planner-panel planner-panel--catalog" aria-label="Möbelkatalog">
      <header className="planner-panel__header">
        <span className="planner-kicker">Bibliothek</span>
        <h2>Möbel & Objekte</h2>
        <p>Maßhaltige Elemente für den aktiven Raum.</p>
      </header>
      <div className="planner-catalog__groups" role="list" aria-label="Möbelgruppen">
        {PREVIEW_GROUPS.map((group) => (
          <article key={group.name} role="listitem" className="planner-catalog__group">
            <span aria-hidden="true">{group.glyph}</span>
            <span><strong>{group.name}</strong><small>{group.detail}</small></span>
          </article>
        ))}
      </div>
      <p className="planner-panel__note">Objekte lassen sich im nächsten Schritt per Klick, Ziehen oder Zahlenwert platzieren.</p>
    </aside>
  );
}
