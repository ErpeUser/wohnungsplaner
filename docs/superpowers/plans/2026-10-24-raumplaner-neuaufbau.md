# Raumplaner-Neuaufbau Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den bestehenden Wohnungsplaner durch einen modularen, lokalen Planer mit gemeinsamer V3-Datenbasis, interaktivem Konva-2D-Plan und lazy geladenem React-Three-Fiber-3D-Raum ersetzen.

**Architecture:** Ein validiertes `PlannerDocumentV3` mit globalem Wandgraph ist die einzige persistierte Wahrheit. Reine Domain-Funktionen, Commands, History und Repository liegen unter `app/planner/domain` und `app/planner/store`; Konva und React Three Fiber sind austauschbare Renderer desselben Dokuments. Der neue Workspace entsteht zunächst unter `/planner`, übernimmt dann `/`, bevor alle alten Renderer, Datenkopien und Starter-Reste entfernt werden.

**Tech Stack:** React 19.3.1, React DOM 19.3.1, Next 16.4.3, vinext 1.3.0, TypeScript 5.9, Vite 8, Zod 4.6.7, Zustand 5.0.16, Konva 10.9.0, React Konva 19.3.2, Three.js 0.186.1, React Three Fiber 9.8.2, Drei 10.7.9, React Three Postprocessing 3.2.2, Vitest 5.0.5, Testing Library 16.3.3.

**Spec:** `docs/superpowers/specs/2026-10-24-raumplaner-neuaufbau-design.md`

## Global Constraints

- Kanonische Maße sind Meter; die Oberfläche zeigt Zentimeter.
- Globale Achsen sind `x` Ost–West, `z` Nord–Süd und `y` Höhe.
- Der persistierte Wandgraph ist die einzige Architekturwahrheit; Raumkonturen und Rendergeometrie sind abgeleitet.
- Das vollständige Produkt bleibt lokal; private Quellenmedien und Planungsdaten verlassen den Browser nicht.
- 2D bleibt bei fehlendem WebGL2 oder verlorengegangenem Kontext vollständig nutzbar.
- Voller Editor: neueste zwei stabile Chromium/Edge- und Firefox-Versionen ab 1024 × 700 px; Tablet-Landscape ab 1024 px mit Touch/Stift.
- WCAG 2.2 AA; jede Drag-Funktion hat eine numerische und tastaturbedienbare Alternative.
- Bestehende uncommittete Nutzeränderungen dürfen weder zurückgesetzt noch pauschal überschrieben werden.
- TDD gilt für jedes neue Domain-Verhalten, jede Interaktion und jede Regression.
- Neue Pakete sind auf die oben genannten Rollen begrenzt; kein zweites State-, Canvas-, 3D- oder UI-Framework parallel.
- Startansicht enthält keinen Three.js/R3F-Chunk; 3D wird dynamisch geladen.

## Review Focus

- Beschädigte, teilweise oder unbekannte gespeicherte Daten: letzte gültige Fassung bleibt als Backup erhalten, der Planer startet reparierbar und meldet nicht migrierte Einträge.
- Möbel an schrägen Wänden, in Türschwenkflächen und nahe Raumgrenzen: harte Kollisionen und reine Warnzonen bleiben geometrisch getrennt.
- Möbelwechsel zwischen Räumen: nur vollständig im Zielraum führt ein einzelner undo-fähiger Transfer-Command aus; Wandüberschneidungen werden abgelehnt.
- Fehlendes GLTF/HDR/WebGL2 oder Kontextverlust: betroffenes Asset nutzt einen Platzhalter beziehungsweise die App fällt auf 2D zurück, ohne das Dokument zu verändern.
- Tastatur, Touch, reduzierte Bewegung und kleine Viewports: alle Kernänderungen bleiben über Inspector/Commands möglich; die Oberfläche verliert keine fokussierbaren Aktionen.

---

## File Structure

```text
app/
  page.tsx                                 finaler schlanker Einstieg
  planner/
    page.tsx                               temporärer, separat prüfbarer V3-Einstieg
    domain/
      types.ts                             kanonische Domain-Typen
      schema.ts                            Zod-Schema und Validierung
      wall-graph.ts                        Raumkonturen/Wandprojektion
      apartment-v3.ts                      bestätigte Wohnung als V3-Dokument
      migration.ts                         v2→v3 und Migrationsbericht
      geometry.ts                          Polygone, Bounds, Punktprüfungen
      collisions.ts                        harte Treffer und Warnzonen
      snapping.ts                          Raster- und Kantenfang
      commands.ts                          reine Dokument-Commands
    store/
      history.ts                           Undo/Redo ohne UI-/Kamerazustand
      persistence.ts                       localStorage, Backup, Import
      planner-store.ts                     Zustand-Store und Actions
    catalog/
      catalog.ts                           Katalogdefinitionen
      asset-manifest.ts                    lokale Assets/Lizenzen/Fallbacks
    workspace/
      planner-workspace.tsx                Produkt-Shell
      planner-toolbar.tsx                  Ansicht, Undo/Redo, Export
      room-selector.tsx                    kompakte Raumwahl
      catalog-panel.tsx                    Suche/Kategorien/Einfügen
      inspector-panel.tsx                  numerische Bearbeitung
      details-drawer.tsx                   Nachweise und Unsicherheiten
      planner-status.tsx                   Raster/Kollision/Autosave
      planner-workspace.css                Runtime-Tokens und Layout
    plan-2d/
      plan-canvas.tsx                      Konva-Stage und Viewport
      plan-scene.ts                        renderer-unabhängige 2D-Deskriptoren
      architecture-layer.tsx               Räume/Wände/Öffnungen
      furniture-layer.tsx                  Placements und Auswahl
      overlay-layer.tsx                    Maße/Elektro/Snapping/Kollision
      use-plan-interactions.ts              Pointer-/Tastatur-Commands
    scene-3d/
      planner-3d.tsx                       R3F-Canvas und Fallbackgrenze
      scene-model.ts                       reine Mesh-/Materialdeskriptoren
      architecture.tsx                     Böden/Wände/Öffnungen/Einbauten
      furniture.tsx                        GLTF oder parametrischer Fallback
      materials.ts                         PBR-Materialzuordnung
      lighting.tsx                         Environment/Licht/Postprocessing
      camera-controller.tsx                Orbit-/Rundgangmodus
      quality.ts                           adaptive Qualitätsstufen
    export/
      planner-export.ts                    JSON/PNG/PDF-Daten
      export-dialog.tsx                    app-eigener Export/Import-Dialog
public/planner-assets/
  manifest.json                            Quelle, Lizenz, Hash, Maße
  environment/                             lokales HDR/PMREM-Ausgangsasset
  textures/                                lokale PBR-Texturen
  models/                                  lokale GLB-Möbel
tests/
  planner-*.test.ts[x]                     neue Domain-/UI-Verträge
```

## Task 1: Runtime aktualisieren und V3-Schema etablieren

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `app/planner/domain/types.ts`
- Create: `app/planner/domain/schema.ts`
- Create: `tests/planner-schema.test.ts`

**Interfaces:**
- Produces: `Point2`, `WallRef`, `PlannerWall`, `PlannerRoom`, `PlannerOpening`, `PlannerBuiltIn`, `PlannerFixture`, `PlannerPlacement`, `PlannerDocumentV3`, `PlannerValidationError`, `parsePlannerDocument(value: unknown): PlannerDocumentV3`.

- [ ] **Step 1: Ausgangszustand protokollieren**

Run: `npm run lint && npm test`
Expected: Lint exit 0; bestehender Build und 61 Tests bestehen. Falls der Build im Sandbox-Prozess mit `spawn EPERM` scheitert, denselben Befehl mit genehmigter Prozessausführung wiederholen und nur echte Produktfehler als Baseline-Fehler notieren.

- [ ] **Step 2: Fehlende V3-Schemaverträge als Tests schreiben**

`tests/planner-schema.test.ts` prüft mindestens:

```ts
test("accepts a closed wall graph with one room and placement", () => {
  assert.equal(parsePlannerDocument(validDocument).schemaVersion, 3);
});

test("rejects openings outside their referenced wall", () => {
  assert.throws(() => parsePlannerDocument(invalidOpening), /opening.*wall/i);
});

test("rejects duplicate ids and non-finite coordinates", () => {
  assert.throws(() => parsePlannerDocument(invalidIds), /duplicate|finite/i);
});
```

- [ ] **Step 3: Schema-Test rot ausführen**

Run: `npx tsx --test tests/planner-schema.test.ts`
Expected: FAIL mit `ERR_MODULE_NOT_FOUND` für `app/planner/domain/schema.ts`.

- [ ] **Step 4: Kompatible aktuelle Laufzeit und Testwerkzeuge installieren**

Installiere exakt die im Header genannten stabilen Versionen; zusätzlich `postprocessing@6.39.5`, `jsdom@30.1.3`, `@testing-library/user-event@14.6.8` sowie aktuelle React-19-kompatible Typen. Aktualisiere `vinext`, `react-server-dom-webpack` und `@vitejs/plugin-rsc` gemeinsam auf ihre React-19.3-kompatiblen Stände. Ergänze `"typecheck": "tsc --noEmit"`, `"test:planner": "tsx --test"` und `"test:ui": "vitest run"`; der vollständige `test`-Befehl führt Build, bestehende Tests, alle `planner-*.test.ts`, UI-Tests und `.mjs`-Serververträge aus.

- [ ] **Step 5: Kanonische Typen und Zod-Schema minimal implementieren**

`PlannerRoom.boundary` ist `WallRef[]` mit `direction: 1 | -1`; `PlannerOpening` referenziert `wallId`, `offset`, `width`, `height`, `sill`, `kind`, `hinge` und `swingDegrees`. Das Schema erzwingt eindeutige IDs, endliche Zahlen, existierende Referenzen, geschlossene Raumloops und Öffnungen innerhalb der Wandlänge.

- [ ] **Step 6: Schema-Test grün ausführen**

Run: `npm run test:planner -- tests/planner-schema.test.ts`
Expected: alle Schema-Tests PASS.

- [ ] **Step 7: Aktualisierten Runtime-Baseline prüfen**

Run: `npm ls react react-dom vinext @react-three/fiber react-konva konva zustand zod && npm run typecheck && npm run lint && npm run build`
Expected: keine ungültigen Peer-Abhängigkeiten; alle Befehle exit 0.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts app/planner/domain/types.ts app/planner/domain/schema.ts tests/planner-schema.test.ts
git commit -m "feat: establish planner v3 domain"
```

## Task 2: Bestätigte Wohnung und v2-Migration übernehmen

**Files:**
- Create: `app/planner/domain/wall-graph.ts`
- Create: `app/planner/domain/apartment-v3.ts`
- Create: `app/planner/domain/migration.ts`
- Create: `tests/planner-apartment.test.ts`
- Modify: `tests/room-model.test.ts`

**Interfaces:**
- Consumes: V3-Typen und `parsePlannerDocument` aus Task 1; bestätigte Werte aus den bisherigen `app/*-model.ts` nur als Migrationsquelle.
- Produces: `DEFAULT_APARTMENT_DOCUMENT: PlannerDocumentV3`, `deriveRoomPolygon(document, roomId): Point2[]`, `deriveWallLength(wall): number`, `migrateStoredPlannerData(value, baseDocument): MigrationResult` mit `{ document, warnings, legacyBackupJson, unmapped }`.

- [ ] **Step 1: Charakterisierungstests für V3-Wohnung und Migration schreiben**

Prüfe neun Räume, 59,49 m² bestätigte Gesamtfläche, Zimmer 1 mit 356 × 397 cm, sämtliche vorhandenen Öffnungen, diagonale Fassaden, feste Küche/Sanitärteile und folgende Fehlerfälle: rohes v2-Room-Record, teilweise fehlende Räume, unbekannte Möbeltypen, ungültige Zahlen und bereits gültiges V3-Dokument.

- [ ] **Step 2: Charakterisierungstest rot ausführen**

Run: `npm run test:planner -- tests/planner-apartment.test.ts`
Expected: FAIL, weil `DEFAULT_APARTMENT_DOCUMENT` und `migrateStoredPlannerData` fehlen.

- [ ] **Step 3: Globalen Wandgraph und bestätigte V3-Daten implementieren**

Modelliere jede reale Wand einmal mit stabiler ID und Raum-Nachbarschaften. Öffnungen referenzieren Wände statt eigene freie Endpunkte. Feste Küche/Sanitärteile werden `builtIns`, Elektroelemente `fixtures`, vorhandene freie Möbel `placements` mit expliziter `roomId`.

- [ ] **Step 4: Verlustfreie v2→v3-Migration implementieren**

Bekannte Möbeltypen werden über eine explizite Mapping-Tabelle überführt. Unbekannte oder ungültige Einträge landen in `unmapped`, erzeugen eine Warnung und bleiben vollständig in `legacyBackupJson`; sie werden niemals still verworfen.

- [ ] **Step 5: Apartment- und Migrationstests grün ausführen**

Run: `npm run test:planner -- tests/planner-apartment.test.ts tests/room-model.test.ts`
Expected: bestätigte Alt- und neue V3-Werte PASS.

- [ ] **Step 6: Commit**

```bash
git add app/planner/domain/wall-graph.ts app/planner/domain/apartment-v3.ts app/planner/domain/migration.ts tests/planner-apartment.test.ts tests/room-model.test.ts
git commit -m "feat: migrate apartment model to wall graph"
```

## Task 3: Geometrie, Snapping und Kollisionen zentralisieren

**Files:**
- Create: `app/planner/domain/geometry.ts`
- Create: `app/planner/domain/collisions.ts`
- Create: `app/planner/domain/snapping.ts`
- Create: `tests/planner-geometry.test.ts`

**Interfaces:**
- Consumes: `PlannerDocumentV3`, `PlannerPlacement`, `Point2`.
- Produces: `placementPolygon`, `pointInPolygon`, `roomAtPoint`, `roomContainsPlacement`, `doorSweepPolygon`, `doorPassagePolygon`, `inspectPlacement(document, placement): CollisionReport`, `snapPlacement(input: SnapInput): SnapResult`.

- [ ] **Step 1: Geometrieverträge als fehlende Tests schreiben**

Tests decken gedrehte Rechtecke, schräge Wände, 5-cm-Zugabe zur 90°-Türschwenkfläche, 60-cm-Passagewarnung, feste Einbauten, nicht kollidierende Fixtures, 5-cm-Raster, Wand-/Kantenfang und vollständig in einen anderen Raum verschobene Placements ab.

- [ ] **Step 2: Geometrietest rot ausführen**

Run: `npm run test:planner -- tests/planner-geometry.test.ts`
Expected: FAIL wegen fehlender Geometrieexporte.

- [ ] **Step 3: Reine Geometrie- und Kollisionsfunktionen implementieren**

`CollisionReport` trennt `hard: CollisionHit[]` von `warnings: CollisionHit[]`; Türschwenkflächen sind hart, beidseitige Passagetiefen sind Warnungen. Berechnungen verwenden eine gemeinsame Epsilon-Konstante von `0.001` m.

- [ ] **Step 4: Deterministisches Snapping implementieren**

Priorität: gültige Wand-/Objektkante innerhalb 4 cm, danach 5-cm-Raster; `disableGrid` überspringt nur das Raster. `SnapResult` enthält Position und sichtbare Guide-Deskriptoren.

- [ ] **Step 5: Geometrietest grün ausführen**

Run: `npm run test:planner -- tests/planner-geometry.test.ts`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/planner/domain/geometry.ts app/planner/domain/collisions.ts app/planner/domain/snapping.ts tests/planner-geometry.test.ts
git commit -m "feat: add planner geometry engine"
```

## Task 4: Commands, Raumtransfer und Undo/Redo bauen

**Files:**
- Create: `app/planner/domain/commands.ts`
- Create: `app/planner/store/history.ts`
- Create: `app/planner/store/planner-store.ts`
- Create: `tests/planner-commands.test.ts`

**Interfaces:**
- Consumes: Domain/Geometrie aus Tasks 1–3.
- Produces: `PlannerCommand`-Union (`addPlacement`, `movePlacement`, `resizePlacement`, `rotatePlacement`, `removePlacement`, `transferPlacement`, `toggleDoor`, `setSurfaceMaterial`), `applyPlannerCommand(document, command): CommandResult`, `createPlannerHistory(initialDocument)`, `createPlannerStore(options): StoreApi<PlannerState & PlannerActions>`.

- [ ] **Step 1: Command- und History-Tests schreiben**

Prüfe unveränderliche Dokumentupdates, Ablehnung harter Kollisionen, Warnungen ohne Blockade, atomaren Raumtransfer, gesperrte `builtIns`, Türzustand, Materialänderung, Undo/Redo, Redo-Verlust nach neuem Command und Ausschluss von Auswahl/Kamera/Panelzustand aus der History.

- [ ] **Step 2: Command-Test rot ausführen**

Run: `npm run test:planner -- tests/planner-commands.test.ts`
Expected: FAIL wegen fehlender Commands/History.

- [ ] **Step 3: Reinen Command-Reducer implementieren**

Jeder erfolgreiche `CommandResult` enthält `{ document, warnings }`; abgelehnte Commands enthalten `{ document: original, error }`. Nur vollständig im Zielraum liegende Objekte akzeptieren `transferPlacement`.

- [ ] **Step 4: Sitzungs-History und Zustand-Store implementieren**

Der Store hält Dokument, Auswahl, Raum, 2D/3D-Ansicht, Overlays, Panels, Autosave-Status und Migrationsergebnis; nur erfolgreiche Dokument-Commands erzeugen History-Einträge.

- [ ] **Step 5: Command-Test grün ausführen**

Run: `npm run test:planner -- tests/planner-commands.test.ts`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/planner/domain/commands.ts app/planner/store/history.ts app/planner/store/planner-store.ts tests/planner-commands.test.ts
git commit -m "feat: add planner commands and history"
```

## Task 5: Lokale Persistenz, Autosave und sicheren Import implementieren

**Files:**
- Create: `app/planner/store/persistence.ts`
- Create: `tests/planner-persistence.test.ts`
- Modify: `app/planner/store/planner-store.ts`

**Interfaces:**
- Consumes: `PlannerDocumentV3`, `MigrationResult`, `parsePlannerDocument`, `migrateStoredPlannerData`.
- Produces: `PlannerRepository` mit `load()`, `save(document)`, `restoreBackup()`, `previewImport(value)`, `commitImport(preview)`; `createLocalStoragePlannerRepository(storage, clock)`; Store-Actions `hydrate`, `scheduleSave`, `importDocument`, `restoreBackup`.

- [ ] **Step 1: Persistenz-Fehlerfälle als Tests schreiben**

Prüfe: leerer Speicher, gültiges V3, rohes v2, beschädigtes JSON, schemaungültiges V3, Backup vor Überschreiben, Speicherausnahme/Quota-Fehler, Import-Vorschau ohne Mutation und explizites Commit mit History-Reset.

- [ ] **Step 2: Persistenztest rot ausführen**

Run: `npm run test:planner -- tests/planner-persistence.test.ts`
Expected: FAIL wegen fehlendem Repository.

- [ ] **Step 3: Repository und Schlüssel implementieren**

Verwende `wohnung-planner-v3` und `wohnung-planner-v3-backup`. `save` validiert zuerst, schreibt dann die letzte gültige aktuelle Fassung als Backup und anschließend atomar das neue JSON. Fehler ändern weder Store-Dokument noch Backup.

- [ ] **Step 4: Autosave im Store implementieren**

Debounce 300 ms; Zustände `idle | saving | saved | error`. Superseded Saves werden abgebrochen/ignoriert, und Kamerabewegungen oder Panelwechsel lösen kein Save aus.

- [ ] **Step 5: Persistenztest grün ausführen**

Run: `npm run test:planner -- tests/planner-persistence.test.ts tests/planner-commands.test.ts`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/planner/store/persistence.ts app/planner/store/planner-store.ts tests/planner-persistence.test.ts
git commit -m "feat: persist planner documents safely"
```

## Task 6: Neuen Workspace und dauerhafte UX-/Designverträge erstellen

**Files:**
- Modify: `DESIGN.md`
- Create: `UX-CONTRACT.md`
- Create: `app/planner/page.tsx`
- Create: `app/planner/workspace/planner-workspace.tsx`
- Create: `app/planner/workspace/planner-toolbar.tsx`
- Create: `app/planner/workspace/room-selector.tsx`
- Create: `app/planner/workspace/catalog-panel.tsx`
- Create: `app/planner/workspace/inspector-panel.tsx`
- Create: `app/planner/workspace/details-drawer.tsx`
- Create: `app/planner/workspace/planner-status.tsx`
- Create: `app/planner/workspace/planner-workspace.css`
- Create: `tests/planner-workspace.test.tsx`

**Interfaces:**
- Consumes: `createPlannerStore`, `DEFAULT_APARTMENT_DOCUMENT`, Repository.
- Produces: `<PlannerWorkspace />`, stabile zugängliche Toolbar-/Panel-/Raumwahl-Verträge und dokumentierte Runtime-Token.

- [ ] **Step 1: Workspace-Interaktionen als Tests schreiben**

Testing Library prüft kompakte Raumwahl, 2D/3D-Schalter, Panel-Einklappen, sichtbare Undo/Redo-Zustände, Autosave-Status, Details-Drawer, Fokuswiederherstellung, numerische Alternativen und lesbaren Kompaktmodus unter 1024 px.

- [ ] **Step 2: Workspace-Test rot ausführen**

Run: `npm run test:ui -- tests/planner-workspace.test.tsx`
Expected: FAIL wegen fehlendem Workspace.

- [ ] **Step 3: `DESIGN.md` und `UX-CONTRACT.md` auf das freigegebene Zielbild aktualisieren**

Dokumentiere den „Architekten-Arbeitstisch“, dominante Arbeitsfläche, einklappbare Panels, semantische Tokens, Scrollbesitz, Commands, Autosave, Undo/Redo, Import/Export, Fehler, reduzierte Bewegung und WCAG-2.2-AA-Verhalten. Runtime-CSS bleibt die kanonische Tokenquelle und wird im `DESIGN.md` explizit gemappt.

- [ ] **Step 4: Workspace auf der temporären Route `/planner` implementieren**

Header enthält Raumwahl, Ansicht, Undo/Redo und Export; links Katalog, Mitte Arbeitsfläche, rechts Inspector, unten Status. Keine permanente Nachweiskartenwand und keine horizontale abgeschnittene Raumkartenleiste.

- [ ] **Step 5: Workspace-Test grün ausführen**

Run: `npm run test:ui -- tests/planner-workspace.test.tsx`
Expected: alle Tests PASS.

- [ ] **Step 6: Design-Kontext und Build prüfen**

Run: `npx -p @google/design.md designmd lint DESIGN.md && npm run typecheck && npm run build`
Expected: DESIGN.md 0 Fehler; Typecheck/Build exit 0.

- [ ] **Step 7: Commit**

```bash
git add DESIGN.md UX-CONTRACT.md app/planner/page.tsx app/planner/workspace tests/planner-workspace.test.tsx
git commit -m "feat: add focused planner workspace"
```

## Task 7: Gemeinsamen Konva-Grundplan rendern

**Files:**
- Create: `app/planner/plan-2d/plan-scene.ts`
- Create: `app/planner/plan-2d/plan-canvas.tsx`
- Create: `app/planner/plan-2d/architecture-layer.tsx`
- Create: `app/planner/plan-2d/overlay-layer.tsx`
- Create: `tests/planner-2d.test.tsx`
- Modify: `app/planner/workspace/planner-workspace.tsx`

**Interfaces:**
- Consumes: Wandgraph, Store-Raum/Overlays.
- Produces: `createPlanScene(document, options): PlanScene`, `<PlanCanvas />`; Layer-Deskriptoren für Räume, Wände, Öffnungen, Built-ins, Fixtures, Maße und Guides.

- [ ] **Step 1: Plan-Scene- und Viewport-Tests schreiben**

Prüfe alle neun Räume aus einem Wandgraph, Gesamt-/Einzelraumfilter, Türen/Fenster, Built-ins, optionale Maße/Elektroelemente, planrichtige Orientierung, Zoom-zum-Zeiger und „Alles anzeigen“ für Gesamtwohnung sowie schräge Raumkonturen.

- [ ] **Step 2: 2D-Test rot ausführen**

Run: `npm run test:ui -- tests/planner-2d.test.tsx`
Expected: FAIL wegen fehlendem `PlanCanvas`/`createPlanScene`.

- [ ] **Step 3: Reine Plan-Deskriptoren implementieren**

Konvertiere Meter erst am Viewport-Rand in Pixel. Keine Raumgeometrie oder Möbellogik darf im JSX neu berechnet oder kopiert werden.

- [ ] **Step 4: Konva-Stage und Architektur-/Overlay-Layer implementieren**

Stage besitzt klar getrennte Layer, ResizeObserver, stabile Pixelratio und begrenzten Zoom. Maße und Fixtures sind standardmäßig aus und separat schaltbar.

- [ ] **Step 5: 2D-Test grün ausführen**

Run: `npm run test:ui -- tests/planner-2d.test.tsx`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/planner/plan-2d app/planner/workspace/planner-workspace.tsx tests/planner-2d.test.tsx
git commit -m "feat: render apartment with konva"
```

## Task 8: Möbelkatalog, Auswahl und direkte Manipulation ergänzen

**Files:**
- Create: `app/planner/catalog/catalog.ts`
- Create: `app/planner/plan-2d/furniture-layer.tsx`
- Create: `app/planner/plan-2d/use-plan-interactions.ts`
- Create: `tests/planner-furniture.test.tsx`
- Modify: `app/planner/workspace/catalog-panel.tsx`
- Modify: `app/planner/workspace/inspector-panel.tsx`
- Modify: `app/planner/workspace/planner-status.tsx`
- Modify: `app/planner/plan-2d/plan-canvas.tsx`

**Interfaces:**
- Consumes: Commands, Store, `snapPlacement`, `inspectPlacement`.
- Produces: `FurnitureCatalogItem`, `FURNITURE_CATALOG`, `<FurnitureLayer />`, `usePlanInteractions()`; Einfügen, Auswahl, Drag, Transform, Tastatur und numerischer Inspector.

- [ ] **Step 1: Möbel-Interaktionen als Tests schreiben**

Prüfe Katalogsuche/-kategorie, Einfügen in aktuellen Raum, Auswahl, 5-cm-Drag, Alt ohne Raster, 1-/10-cm-Pfeiltasten, Escape-Abbruch, geeignete Größenänderung, 45°-/freie Drehung, harte Kollisionsablehnung, Warnanzeige, vollständigen Raumtransfer und Undo/Redo.

- [ ] **Step 2: Möbeltest rot ausführen**

Run: `npm run test:ui -- tests/planner-furniture.test.tsx`
Expected: FAIL wegen fehlendem Katalog/FurnitureLayer.

- [ ] **Step 3: Kleinen parametrischen Katalog implementieren**

Kategorien: Schlafen, Sitzen, Arbeiten, Aufbewahren, Tische, Licht/Deko. Erster Satz: Bett, Schrank, Schreibtisch, Stuhl, Sofa, Esstisch, Kommode, Regal, Lowboard, Nachttisch, Teppich, Leuchte und Pflanze; jede Definition besitzt reale Defaultmaße, Skalierungsregel, 2D-Symbol und 3D-Fallbacktyp.

- [ ] **Step 4: Konva-Auswahl und Transform implementieren**

React besitzt die Position; Konva-Scale wird beim Transform-Ende in Breite/Tiefe gebacken und auf 1 zurückgesetzt. Jeder Abschluss sendet genau einen Domain-Command; Drag-Zwischenstände mutieren nicht die History.

- [ ] **Step 5: Inspector und Tastaturalternativen implementieren**

Felder für X/Z, Breite, Tiefe, Höhe, Drehung und Material besitzen Labels, Einheiten, Inline-Fehler und `aria-invalid`; gesperrte Built-ins erklären ihren Status.

- [ ] **Step 6: Möbeltest grün ausführen**

Run: `npm run test:planner -- tests/planner-geometry.test.ts tests/planner-commands.test.ts && npm run test:ui -- tests/planner-furniture.test.tsx`
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

```bash
git add app/planner/catalog/catalog.ts app/planner/plan-2d app/planner/workspace/catalog-panel.tsx app/planner/workspace/inspector-panel.tsx app/planner/workspace/planner-status.tsx tests/planner-furniture.test.tsx
git commit -m "feat: add interactive furniture planning"
```

## Task 9: Deklarative R3F-Architektur und robusten Fallback einführen

**Files:**
- Create: `app/planner/scene-3d/scene-model.ts`
- Create: `app/planner/scene-3d/planner-3d.tsx`
- Create: `app/planner/scene-3d/architecture.tsx`
- Create: `app/planner/scene-3d/materials.ts`
- Create: `app/planner/scene-3d/lighting.tsx`
- Create: `app/planner/scene-3d/quality.ts`
- Create: `tests/planner-3d.test.tsx`
- Modify: `app/planner/workspace/planner-workspace.tsx`

**Interfaces:**
- Consumes: V3-Dokument und Store-Auswahl/Türzustände.
- Produces: `createSceneModel(document, roomId): SceneModel`, `<Planner3D />`, `QualityTier`, `detectThreeSupport(): ThreeSupport`, dynamisch importierte 3D-Arbeitsfläche.

- [ ] **Step 1: Scene-Model-, Lazy- und Fallback-Tests schreiben**

Prüfe abgeleitete Böden/Wände/Öffnungen ohne doppelte Geometrie, schräge Fassaden, Built-ins, korrekte Türzustände, `frameloop="demand"`, WebGL2-Fehler, Kontextverlust, Ladefehler und Rückkehr zu 2D ohne Dokumentmutation.

- [ ] **Step 2: 3D-Test rot ausführen**

Run: `npm run test:ui -- tests/planner-3d.test.tsx`
Expected: FAIL wegen fehlender R3F-Szene.

- [ ] **Step 3: Reines SceneModel und R3F-Architekturkomponenten implementieren**

Eine Wandquelle erzeugt Böden, Wände und Öffnungsausschnitte. Materialien werden über semantische Surface-IDs gecacht; wiederholte Geometrien teilen Ressourcen.

- [ ] **Step 4: Realistische Grundbeleuchtung und Qualitätsstufen implementieren**

Setze korrekten sRGB-Output, aktuelles Three.js-Tone-Mapping, Environment/PMREM, weiche Schatten und sparsame AO ein. Qualitätsstufen verändern nur DPR, Schatten und Effekte, niemals Dokument oder Geometrie.

- [ ] **Step 5: 3D lazy laden und Fallback integrieren**

Der Workspace importiert `Planner3D` ausschließlich nach aktivem 3D-Schalter. Lade- und Fehlerzustand bleiben in derselben stabilen Arbeitsflächengeometrie und bieten „Zu 2D“.

- [ ] **Step 6: 3D-Test grün ausführen**

Run: `npm run test:ui -- tests/planner-3d.test.tsx && npm run build`
Expected: Tests/Build PASS; separater 3D-Chunk entsteht.

- [ ] **Step 7: Commit**

```bash
git add app/planner/scene-3d app/planner/workspace/planner-workspace.tsx tests/planner-3d.test.tsx
git commit -m "feat: add resilient react three fiber scene"
```

## Task 10: Lokale PBR-/GLTF-Assets, Möbel und Kameramodi integrieren

**Files:**
- Create: `app/planner/catalog/asset-manifest.ts`
- Create: `app/planner/scene-3d/furniture.tsx`
- Create: `app/planner/scene-3d/camera-controller.tsx`
- Create: `public/planner-assets/manifest.json`
- Create: `public/planner-assets/environment/*`
- Create: `public/planner-assets/textures/**/*`
- Create: `public/planner-assets/models/*.glb`
- Create: `tests/planner-assets.test.ts`
- Modify: `app/planner/scene-3d/planner-3d.tsx`
- Modify: `app/planner/scene-3d/materials.ts`

**Interfaces:**
- Consumes: `FURNITURE_CATALOG`, Store-Auswahl und `SceneModel`.
- Produces: `PlannerAssetManifest`, `resolveFurnitureAsset(item): AssetResolution`, `<Furniture3D />`, `CameraMode = "orbit" | "walk"`, Asset-/Kamera-Fallbacks.

- [ ] **Step 1: Asset- und Kamera-Verträge als Tests schreiben**

Prüfe zu jedem Manifest-Eintrag lokale Datei, Lizenz, Source-URL, Hash und Maßstab; fehlendes/defektes Asset ergibt parametrischen Fallback. Kamerawechsel erhält Auswahl, Rundgang kollidiert mit Wänden/Built-ins, Reset kehrt zur Raumstartpose zurück und reduzierte Bewegung deaktiviert dekorative Übergänge.

- [ ] **Step 2: Asset-Test rot ausführen**

Run: `npm run test:planner -- tests/planner-assets.test.ts`
Expected: FAIL wegen fehlendem Manifest/Assets.

- [ ] **Step 3: Kleinen lizenzierten lokalen Asset-Satz hinzufügen**

Wähle CC0 oder eindeutig redistributierbare GLB/PBR/HDR-Assets, dokumentiere Quelle/Lizenz/Hash, normalisiere Metermaßstab und komprimiere nur bei messbarem Nutzen. Kein Asset wird zur Laufzeit von einer fremden URL geladen.

- [ ] **Step 4: GLTF-Möbel mit parametrischen Fallbacks implementieren**

Lade/cache Assets über Drei, wende Katalogmaße und Materialslots an und ersetze nur das betroffene Möbel bei Fehler. Auswahl wird über eine dezente Kontur/Materialänderung gezeigt.

- [ ] **Step 5: Orbit- und Rundgangkamera implementieren**

Orbit zeigt Wohnung oder aktuellen Raum; Rundgang verwendet bestehende Walkability/Collision-Funktionen aus der Domain, sichtbare Bildschirmsteuerung und Tastatur. Kamerazustand bleibt außerhalb der Dokument-History.

- [ ] **Step 6: Asset-/3D-Tests grün ausführen**

Run: `npm run test:planner -- tests/planner-assets.test.ts && npm run test:ui -- tests/planner-3d.test.tsx`
Expected: alle Tests PASS.

- [ ] **Step 7: Commit**

```bash
git add app/planner/catalog/asset-manifest.ts app/planner/scene-3d public/planner-assets tests/planner-assets.test.ts
git commit -m "feat: add realistic local planner assets"
```

## Task 11: JSON-, PNG- und kompakten PDF-Export fertigstellen

**Files:**
- Create: `app/planner/export/planner-export.ts`
- Create: `app/planner/export/export-dialog.tsx`
- Create: `tests/planner-export.test.tsx`
- Modify: `app/planner/workspace/planner-toolbar.tsx`
- Modify: `app/planner/workspace/planner-workspace.css`

**Interfaces:**
- Consumes: `PlannerDocumentV3`, `PlanScene`, Repository-Importvorschau.
- Produces: `serializePlannerBackup`, `createPlanPng`, `createPrintModel`, `<ExportDialog />`, `<ImportPreview />`.

- [ ] **Step 1: Export-/Importdialog-Tests schreiben**

Prüfe V3-JSON mit Version, PNG aus aktueller 2D-Stage, PDF-Druckmodell mit Gesamtplan/Raumliste/Möbelliste, Import-Vorschau mit Warnungen, Bestätigung vor Ersetzen, Fokusfalle/Escape/Fokuswiederherstellung und Verbot privater Quellenpfade.

- [ ] **Step 2: Exporttest rot ausführen**

Run: `npm run test:ui -- tests/planner-export.test.tsx`
Expected: FAIL wegen fehlenden Exportfunktionen.

- [ ] **Step 3: Reine Exportmodelle implementieren**

JSON exportiert das validierte Dokument; PNG nutzt die Konva-Stage mit wählbaren Overlays; PDF verwendet eine kompakte druckbare React-Struktur aus demselben `PlanScene`, ohne Wand-Snapshot- oder Bildstudienpfad.

- [ ] **Step 4: Zugänglichen Export-/Importdialog implementieren**

Getrennte Aktionen heißen „JSON-Sicherung“, „PNG-Ansicht“ und „PDF-Plan“. Import zeigt Version, Räume, Placements und Warnungen vor dem bestätigten Commit; keine nativen Browserdialoge.

- [ ] **Step 5: Exporttest grün ausführen**

Run: `npm run test:ui -- tests/planner-export.test.tsx`
Expected: alle Tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/planner/export app/planner/workspace/planner-toolbar.tsx app/planner/workspace/planner-workspace.css tests/planner-export.test.tsx
git commit -m "feat: add planner backup and exports"
```

## Task 12: Hauptansicht umschalten und Legacy-Code sicher entfernen

**Files:**
- Replace: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/check-client-bundle.mjs`
- Create: `tests/planner-cutover.test.mjs`
- Delete after reference audit: `app/apartment-3d.tsx`, `app/apartment-plan.tsx`, `app/apartment-3d-model.ts`, `app/apartment-model.ts`, `app/room-model.ts`, `app/kitchen-model.ts`, `app/living-room-model.ts`, `app/wet-room-model.ts`, `app/hall-variants.ts`, `app/planner-storage.ts`, `app/chatgpt-auth.ts`
- Delete after replacement tests: obsolete assertions in `tests/rendered-html.test.mjs`, `tests/room-model.test.ts`
- Delete after asset/reference audit: `public/room-studies/`, `public/bero-varianten/`, unused starter SVGs, unused `db/`, `drizzle/`, `examples/d1/`, `drizzle.config.ts`

**Interfaces:**
- Consumes: vollständigen V3-Workspace aus Tasks 1–11.
- Produces: `/` als alleinigen Produktpfad, keine Legacy-Renderer/Datenkopien, Build-Budgetprüfung und aktualisierte Dokumentation.

- [ ] **Step 1: Cutover- und Bundle-Verträge als Tests schreiben**

`tests/planner-cutover.test.mjs` prüft servergerenderten neuen Workspace, Abwesenheit alter Bildstudien-/Wandansichts-Copy, fehlende Legacy-Imports, vollständige V3-Räume und zugänglichen 2D-Fallback. `scripts/check-client-bundle.mjs` prüft aus Build-Manifest/HTML, dass der initiale Client-Einstieg keinen Three/R3F-Chunk referenziert und der 3D-Chunk separat existiert.

- [ ] **Step 2: Cutover-Test rot ausführen**

Run: `npm run build && node --test tests/planner-cutover.test.mjs && node scripts/check-client-bundle.mjs`
Expected: FAIL, solange `/` noch die alte Seite rendert beziehungsweise Initialbundle Three.js enthält.

- [ ] **Step 3: Root auf den V3-Workspace umstellen**

`app/page.tsx` bleibt ein schlanker Server-/Lazy-Einstieg. Metadaten, deutsche Oberfläche und lokaler Datenschutztext bleiben erhalten; die temporäre `/planner`-Route darf auf `/` re-exportieren oder entfallen.

- [ ] **Step 4: Referenzaudit vor jeder Löschung ausführen**

Run: `rg -n "ApartmentThreeView|ThreeRoom|ApartmentPlan|room-model|apartment-model|room-studies|bero-varianten|drizzle|react-zoom-pan-pinch" app tests scripts public package.json README.md`
Expected: nur ausdrücklich zu ersetzende Legacy-Dateien/Tests oder keine Treffer. Unerwartete Verbraucher werden zuerst migriert.

- [ ] **Step 5: Legacy-Dateien, generierte Bildstudien und unbenutzten Starter-Code entfernen**

Entferne ausschließlich die oben gelisteten, nach Step 4 verbraucherlosen Pfade. Entferne `drizzle-orm`, `drizzle-kit` und `react-zoom-pan-pinch` aus den Dependencies, sofern `rg` weiterhin keine Verbraucher zeigt. Lass `.openai/`, `worker/` und Hosting-Konfiguration bestehen.

- [ ] **Step 6: CSS und Dokumentation auf den neuen Planer reduzieren**

`globals.css` behält Reset, Fonts, globale Scrollbar und Druckbasis; Workspace-spezifische Regeln liegen in `planner-workspace.css`. README beschreibt Start, Test, lokale Daten, Import/Export, 2D/3D-Fallback und Asset-Lizenzen statt Starter-/D1-Anleitung.

- [ ] **Step 7: Cutover- und vollständige Suite grün ausführen**

Run: `npm run typecheck && npm run lint && npm test && node scripts/check-client-bundle.mjs`
Expected: alle Befehle exit 0; keine Chunk-Größenwarnung wird durch bloßes Anheben des Limits unterdrückt.

- [ ] **Step 8: Premium-UI-Audit und statische Verbotsprüfung ausführen**

Run: `python <CODEX_HOME>/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py . --mode strict`
Expected: keine blockierenden Findings. Suche zusätzlich nach `window.alert`, `window.confirm`, klickbaren nicht-semantischen Elementen und rohen Farbliteralen außerhalb der Tokenquelle.

- [ ] **Step 9: Browserprüfung durchführen**

Prüfe real im Browser: Start ohne Scrollzwang bei 1440 × 900, Gesamtwohnung, Zimmerwechsel, Möbel einfügen/verschieben/numerisch ändern, Undo/Redo, 2D→3D-Synchronität, Türzustand, fehlendes Asset, erzwungener WebGL-Fallback, Importwarnung, Export, Tastatur, reduzierte Bewegung und 1024 × 700. Erfasse Referenzbilder für Gesamtplan, möbliertes Zimmer und 3D-Perspektive.

- [ ] **Step 10: Finalen Diff und Anforderungsabgleich prüfen**

Run: `git diff --check && git status --short && rg -n "TODO|FIXME|@ts-ignore|eslint-disable" app/planner tests`
Expected: kein Whitespace-Fehler; nur beabsichtigte Dateien; keine ungeklärten Suppressions oder offenen Platzhalter.

- [ ] **Step 11: Commit**

```bash
git add app public package.json package-lock.json README.md scripts tests DESIGN.md UX-CONTRACT.md
git commit -m "feat: replace legacy room planner"
```

---

## Self-Review

- **Spec coverage:** V3-Wandgraph, Migration, 2D, direkte Manipulation, 3D, lokale Assets, Workspace, Persistenz, Export, Barrierefreiheit, Performance und Legacy-Löschung sind je einer prüfbaren Task zugeordnet.
- **Step scan:** Jeder Produktionsschritt folgt einem beobachteten roten Test; Konfiguration/Abhängigkeiten sind in den ersten fachlichen Deliverable integriert.
- **Type consistency:** `PlannerDocumentV3`, `PlannerCommand`, `CollisionReport`, `MigrationResult`, `PlannerRepository`, `PlanScene` und `SceneModel` werden einmal definiert und in späteren Tasks unverändert konsumiert.
- **Review focus:** Alle fünf genannten Fehlermodi besitzen explizite Tests in Tasks 2–10.
- **Proportion:** Der Plan entscheidet Dateien, Schnittstellen, konkrete Werte und Nachweise; Implementierungsdetails innerhalb reiner Funktionen bleiben beim Implementer.
