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
- **0 GLB/GLTF/OBJ/FBX-Meshes innerhalb von `models/**`** (die 6 bestehenden Runtime-GLBs unter `public/planner-assets/models/` bleiben unverändert)
- **0 importierte PBR-Textursets**
- **3 lokale Referenzbilder** in den vorhandenen Tabellenordnern
- **22 eindeutige externe URLs**, davon 18 Produkt-URLs und 4 Fixed-Element-URLs (28 manifestierte URL-Einträge und 23 URL-Einträge in `link.txt`; Alias- und kanonische Ordner können dieselbe Quelle wiederholen)

Die aktuelle Runtime-Zuordnung bleibt parametrisch. Die Auditberichte kennzeichnen deshalb Geometrie und Materialprüfung ohne Mesh beziehungsweise Textur als offen. Es wird keine Viewer-Integration behauptet, solange der zentrale Viewer unter `app/planner/scene-3d/` die Dateien nicht lädt.

## Quellen und Manifeste

Produktordner verwenden `link.txt` für eine oder mehrere Quellen; Fixed-Elemente dokumentieren dort entweder eine konkrete Referenz oder, wenn das Element zur Wohnung gehört, den fehlenden externen Produktbezug. Jede als URL erkennbare Zeile wird im zugehörigen `manifest.json.sourceUrls` gespiegelt. Kommentare wie `Keine externe Produktquelle im Datensatz hinterlegt` werden nicht als URL erfunden.

Retained source aliases können ihre verifizierte URL bewusst nur im Manifest führen; `quality-report.json` kennzeichnet diesen Fall als `source-only-alias`. Der kanonische Runtime-Ordner trägt die synchronisierte Quellenliste. So bleiben Alias-IDs und gespeicherte Platzierungen erhalten, ohne eine URL doppelt als neue Quelle zu behaupten.

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

## Gemeinsame Dokumentation und Duplikate

Die generische Beschreibung des Modellordners steht nur noch in dieser `models/README.md`; 128 identische Einzel-READMEs wurden aus den Modellordnern entfernt. Die pro Modell unterschiedlichen `manifest.json`, `quality-report.json` und `link.txt` bleiben eigene Dateien, weil Katalog-IDs und Quellpfade erhalten bleiben müssen.

Gleiche Binärreferenzen (Bilder, HTML-Snapshots, öffentliches SVG) sind unter Windows als NTFS-Hardlinks konsolidiert. Ihre jeweiligen Pfade bleiben für App und Modell-Viewer gültig. Änderungen an einer hardverknüpften Datei wirken bei direktem Überschreiben auf alle Alias-Pfade; für unabhängige Änderungen eine neue Datei über eine atomare Ersetzung anlegen. Produktquellen niemals als regenerierbaren Buildcache behandeln.

## Historische Modellrevisionen (nicht das V3-Persistenzschema)

Die frühere unbenutzte Quelldatei `app/planner/domain/model-revision.ts` enthielt ausschließlich folgende historische Notizen. Sie wurde in diese zentrale Referenz übernommen; die Modellrevision ist **keine** aktive Schema-Versionsprüfung.

| Revision | Historischer Stand |
|---|---|
| 0 | V3-Dokument ohne Modellrevision (vor dem AliExpress-Sofa) |
| 1 | AliExpress-Relaxsofa und erster Wohnungsmodell-Visualstand |
| 2 | Temu-Vintage-Teppich und Materialnormalisierung |
| 3 | Bozan-Tischvergleich und aktuelle Essgruppe |
| 4 | Kaleo-/Amber-Stuhlmaße und Gruppenmodell |
| 5 | Bad/WC-, Vorraum- und Zimmer-1-Detailstand |
| 6 | Aktueller maßhaltiger Modell- und Materialstand |
