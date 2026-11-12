# Innenausstattungsmodelle

Die Modellablage trennt kaufbare/recherchierte Produkte von wohnungsgebundenen Fixed-Elementen:

```text
models/
  products/<model-id>/
  fixed/<element-id>/
  _template/
```

## Aktueller Bestand

Die Prüfung des Default-Branches `main` am 2026-11-12 umfasst:

- **46 Produktordner**
- **91 Fixed-Element-Ordner**
- **137 gültige `manifest.json`- und `link.txt`-Paare**
- **137 maschinenlesbare `quality-report.json`-Audits**
- **0 importierte GLB/GLTF/OBJ/FBX-Meshes**
- **0 importierte PBR-Textursets**
- **3 lokale Referenzbilder** in den vorhandenen Tabellenordnern
- **17 dokumentierte externe Produkt-URLs**, davon 13 Produkte und 4 Fixed-Elemente

Die aktuelle Runtime-Zuordnung bleibt parametrisch. Die Auditberichte kennzeichnen deshalb Geometrie und Materialprüfung ohne Mesh beziehungsweise Textur als offen. Es wird keine Viewer-Integration behauptet, solange der zentrale Viewer unter `app/planner/scene-3d/` die Dateien nicht lädt.

## Quellen und Manifeste

Produktordner verwenden `link.txt` für eine oder mehrere Quellen; Fixed-Elemente dokumentieren dort entweder eine konkrete Referenz oder, wenn das Element zur Wohnung gehört, den fehlenden externen Produktbezug. Jede als URL erkennbare Zeile wird im zugehörigen `manifest.json.sourceUrls` gespiegelt. Kommentare wie `Keine externe Produktquelle im Datensatz hinterlegt` werden nicht als URL erfunden.

Die vier zuvor fehlenden Produktkategorien für die Tabellenordner sind als `table` ergänzt. Bestehende IDs, Katalogzuordnungen, Varianten und Runtime-Fallbacks bleiben erhalten. Die vier kurzen Tabellen-IDs bleiben als Quell-Aliase bestehen; ihre kanonischen `dining-table-*` Ordner übernehmen verifizierte Maße, Materialangaben und Varianten, ohne eine referenzierte ID zu löschen.

## Ordnerkonvention

```text
<model>/
  manifest.json       # ID, Kategorie, Quellen, Varianten und Runtime-Zuordnung
  link.txt            # Quellen oder begründeter Quellenstatus
  README.md           # Ordnerhinweise, sofern vorhanden
  quality-report.json # maschinenlesbarer Auditstatus
  source/             # zulässige Originalquellen, falls vorhanden
  references/         # Produktansichten und Maßgrafiken
  textures/           # PBR-Texturen, falls vorhanden
  mesh/               # GLB/GLTF/OBJ/FBX, falls vorhanden
  runtime/            # Ladepfade und Variantenhinweise, falls erforderlich
```

Private Referenzfotos und Quellen bleiben außerhalb von `public/planner-assets/`. Exporte dürfen keine privaten Quell- oder Laufzeit-URLs enthalten.
