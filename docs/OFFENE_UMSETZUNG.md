# Offene Umsetzung und verifizierte Übergaben

Stand: 2026-11-10

## Nachlauf dieser Finalrunde

Die folgenden Angaben sind der aktuelle, nach dieser Runde verifizierte Stand
und ersetzen ältere Zwischenstände weiter unten im Dokument:

- Implementierungs-Commit dieser Finalrunde: `1f10176dabced5d2512929b57d54f7be950feb6e`;
  die danach verifizierte Doku-Synchronisierung steht auf `c3497564344e75e623537c8289e1950b2f47a85e`.
- Zum Zeitpunkt dieser Verifikation war `main` sechs Commits vor
  `0a8a4416243aece82a02190e635f8fc7053b4525`, ohne Rückstand; es gab keine
  offenen oder geschlossenen PRs und nur den Branch `main`. Der abschließende
  Doku-Commit erhöht diesen Abstand um einen weiteren Commit; die beiden
  abschließenden Audit-Doku-Commits erhöhen ihn insgesamt auf acht.
- Direkt implementiert: 5-MB-/MIME-/Magic-Byte-Importschutz inklusive WebP,
  sichere SVG-Prüfung, korrigierbare Herkunft/Confidence, persistierbares
  Asset-Register in V3, Register-/Remove-Commands, Schema- und Reload-Tests,
  vollständige Footprint-Raumwahl beim Drag, begrenzte Kandidatensuche,
  Canvas-scoped 2D-Tastatur, konkreter 3D-Pointer-Lock, Form-Control-Guards
  sowie Drawer-Fokusinitialisierung, Tab-Trap, inert-Hintergrund und korrekte
  Fokus-Rückgabe.
- Nachweis: `npm run typecheck` und `npm run lint` erfolgreich; `npm run test:ui`
  erfolgreich mit 80 Tests; Planner-Suite 100/101 bestanden. Der einzige
  lokale Restfehler ist die Manifest-Byteprüfung der rekonstruierten Arbeitskopie,
  weil der autorisierte Datei-Connector nicht jedes binäre PNG/HDR-Byte verlustfrei
  materialisieren kann. Die Remote-Binärdateien wurden nicht verändert.
- Reale Produktquellen, lizenzierte HDR-/GLB-Erweiterungen, Vision-API,
  Storage-Worker und Firecrawl-/Context7-Verträge bleiben blockiert und werden
  nicht erfunden. Die konkreten Anschlussaufträge in diesem Dokument bleiben
  gültig.

Dieses Dokument trennt ausgeführte Änderungen von Punkten, die in der
vorliegenden Codebasis nicht nachweisbar bearbeitet werden konnten. Es ist als
ausführbare Übergabe für die nächste Person oder Codex gedacht. Unbekannte
Dateien, Routen und APIs werden ausdrücklich als unbekannt behandelt.

## Ausgeführt und lokal verifiziert

- Der GitHub-Standardbranch wurde über die autorisierte GitHub-Schnittstelle
  als `main` bestätigt. Der geprüfte Ausgangs-Head war `8eff500...`; der
  frühere Referenzstand `0a8a4416243aece82a02190e635f8fc7053b4525` blieb
  Vorfahr. Die abschließende Prüfung über die autorisierte GitHub-Schnittstelle
  bestätigte den finalen Fast-Forward-HEAD von `main` ohne Rückstand. Die
  PR-Abfrage blieb leer; es gibt nur `main`.
- Ein direkter Shell-Klon war in dieser Umgebung nicht ausführbar:
  `fatal: could not read Username for 'https://github.com': No such device or address`.
  Die Arbeitskopie wurde deshalb aus der autorisierten GitHub-Dateiansicht
  rekonstruiert; Binärdateien wurden unverändert als Base64 übernommen.
- `npm ci --ignore-scripts --no-audit --no-fund` wurde nach Entfernung eines
  stale/corrupt `node_modules` erfolgreich ausgeführt.
- Öffnungen prüfen jetzt eine zusammenhängende, kollineare Wandkette in
  `app/planner/domain/geometry.ts`; ein neuer Regressionstest deckt eine
  Öffnung ab, die über zwei Wandsegmente läuft.
- Die Floor-Covering-Regel in `app/planner/domain/collisions.ts` verwendet
  ausschließlich das explizite Feld `floorCovering` oder Rug/Carpet-Katalog-IDs.
  Eine niedrige Höhe allein macht einen Tisch deshalb nicht mehr begehbar.
- Material-IDs werden in `app/planner/domain/material-registry.ts` aus einer
  statischen Oberflächenliste, dem Katalog und dem aktuellen Dokument geprüft;
  `commands.ts` weist unbekannte IDs mit einem stabilen `invalid`-Fehler zurück.
- `verifyPlannerAssetBytes` prüft SHA-256 vor Magic-Byte-Prüfungen. Der
  Dateiimport prüft zusätzlich GLB, PNG, JPEG, SVG und WEBP-Signaturen.
- Der Asset-Manifest-Stand ist im Remote unverändert. Der aktuelle lokale
  `npm run assets:check`-Lauf scheitert ausschließlich an der rekonstruierten
  Sofa-Binärdatei (`model-sofa`, erwartete und lokale Länge/SHA unterscheiden
  sich); die Remote-Binärdateien wurden nicht verändert.
- Der 2D-Canvas verhindert Form-Submit-Navigation. Detail- und Einkaufsdrawer
  besitzen Dialog-Semantik, mobile Bereiche erhalten einen schließbaren Backdrop,
  und externe Produktbilder verwenden `referrerPolicy="no-referrer"` sowie einen
  Fehler-Fallback. Die `matchMedia`-Registrierung unterstützt moderne und ältere
  Browserpfade.
- Die neuen und angepassten Regressionstests liegen in den vorhandenen
  `tests/planner-*.test.ts`- und `tests/planner-workspace.test.tsx`-Dateien.

## Prüfkommandos und Ergebnisse

Im rekonstruierten Arbeitsverzeichnis wurden folgende Prüfungen ausgeführt:

```bash
npm run typecheck
npm run lint
npm run assets:check
npm run test:planner
npm run test:ui -- --maxWorkers=1
```

Ergebnis der Finalrunde: Typecheck und ESLint endeten mit Exit-Code 0; der
Produktionsbuild endete mit Exit-Code 0; `test:ui -- --maxWorkers=1` bestand
mit 6 Dateien und 80/80 Tests; `test:cutover` bestand mit 4/4 Tests und
bestätigte den Client-Bundle-Vertrag. Der vollständige Planner-Lauf bestand
100/101 Tests; der einzige Fehler ist die lokale Binärmanifest-Prüfung von
`tests/planner-assets.test.ts`. Ohne diesen binären Test bestanden 92/92
Planner-Tests. `npm run assets:check` reproduziert denselben Sofa-Längen-/SHA-
Fehler. Build und Tests melden nur Vinext-/Chunk-Größen-, Three-CJS- und die
Umgebungswarnung zur unbekannten npm-`http-proxy`-Konfiguration.

## Offene Übergabeaufträge

### OPEN-AI-IMPORT-002 – PreparedAsset an Upload, Store und Platzierung anbinden

**Priorität:** P1.

**Vorarbeit:** `app/planner/catalog/asset-import.ts` validiert Metadaten,
Medientyp, Binärsignatur, SHA-256, normierte Maße, Pivot und Floor-Offset;
`PlannerDocumentV3` besitzt ein Asset-Register mit Register-/Remove-Commands
und Reload-Persistenz. Es fehlt weiterhin das Upload-UI mit Fortschritt, die
Verknüpfung zu einer freigegebenen Storage-URL und die 3D-Platzierung importierter
Assets. Es gibt keine verifizierte KI-/Vision-API, keinen API-Schlüssel und
keine verbindliche Produktquelle für automatische Maßextraktion.

**Betroffene echte Pfade:**

- `app/planner/catalog/asset-import.ts`
- `app/planner/workspace/catalog-panel.tsx`
- `app/planner/store/planner-store.ts`
- `app/planner/domain/commands.ts`
- `app/planner/domain/types.ts`
- `tests/planner-asset-import.test.ts`

**Implementierung:**

1. Im Catalog-Panel einen Datei-Input für GLB/PNG/JPEG/SVG/WEBP mit 5-MB-
   Grenze und sichtbarem Status anlegen.
2. Vor dem Upload lokale Maße und Material abfragen; Vision-Ausgaben nur als
   Vorschlag mit `confidence` und `source` speichern.
3. `PreparedAsset` in ein persistierbares Asset-Register des
   `PlannerDocumentV3` überführen und per Command eine Platzierung mit
   Metermaßen, Floor-Offset und Material-ID erzeugen.
4. Platzierung vor dem Commit auf Raumgrenzen und Kollision prüfen; bei
   Unsicherheit einen editierbaren Platzhalter und eine Warnung darstellen.
5. Nach dem manuellen Korrigieren erneut speichern und laden; Binärdaten nur
   über einen freigegebenen Storage-/Worker-Vertrag referenzieren.

**Benötigte Schnittstelle:** konkrete Vision-/Storage-API, erlaubte
Dateigrößen, Lizenz-/Quellfelder und ein verifizierter Vertrag für
`assetId -> URL`.

**Tests:** Import jeder unterstützten Signatur, falsche Magic Bytes, fehlende
Maße, unbekannte Material-ID, Kollision an Raumgrenze, Persistenz nach Reload
und ein E2E-Fall für manuelles Verschieben/Drehen.

### OPEN-UX-003 – Mobile Modal-Fokus und vollständige Transformationsbedienung

**Priorität:** P1.

**Vorarbeit:** Für Detail- und Einkaufsdrawer sind Dialogrollen, initialer
Fokus, Tab-/Shift-Tab-Trap, `inert`-Untergrund, Backdrop, Escape und Focus-Return
umgesetzt. Vollständige Abdeckung für Catalog-/Inspector-Panels sowie ein
durchgängig tastatur-/touchfähiger Transformationsmodus fehlen weiterhin.

**Betroffene Pfade:** `app/planner/workspace/planner-workspace.tsx`,
`details-drawer.tsx`, `shopping-list-drawer.tsx`,
`catalog-panel.tsx`, `inspector-panel.tsx`,
`app/planner/plan-2d/use-plan-interactions.ts`.

**Implementierung:** Beim Öffnen den ersten sinnvollen Fokus setzen, Tab/Shift-
Tab im Dialog zyklisch halten, den Hintergrund mit `inert` sperren und beim
Schließen den auslösenden Button fokussieren. Für ausgewählte Objekte
Pfeiltasten, Shift-Schrittweite, Drehung und Resize-Handles als dieselben
Commands wie die Pointerbedienung verwenden.

**Tests:** Tastatur-only Durchlauf je Drawer, Escape/Backdrop, Fokus bleibt im
Dialog, Pfeil-/Shift-Transformation, Touch-Pointer-Capture und Regression für
Undo/Redo.

### OPEN-RENDER-004 – SVG-Fallback, 3D-Quellenkennzeichnung und Performance

**Priorität:** P2.

Die Fallback-Ansicht in `app/planner/plan-2d/plan-canvas.tsx` zeigt Räume,
Wände, Einbauten, Möbel und Öffnungen, bildet aber nicht alle Fixture-/Deko-
Details und Transformationsgriffe ab. `app/planner/scene-3d/*` benötigt eine
sichtbare Kennzeichnung von Produktquelle, Schätzung und Platzhalter. Für sehr
große Raster-/Freiplatzierungen fehlen weiterhin ein Spatial Index und
diagonale Snap-Guides in `app/planner/domain/snapping.ts`.

**Implementierung:** Gemeinsame PlanScene-Deskriptoren auch für SVG-Handles
verwenden; Quellen-/Confidence-Badge in 2D/3D ergänzen; die bereits auf die
Canvas-Instanz begrenzte Pointer-Lock-Logik beibehalten; Snap-Suche mit Sweep/Index
beschleunigen und diagonale Achsen nur bei nachgewiesener Geometrie anbieten.

**Tests:** Pixel-/DOM-Snapshot der Fallback-Ansicht, Quelle/Confidence für
verifizierte und geschätzte Assets, 1.000 Platzierungen mit konstantem
Interaktionsbudget und Pointer-Lock außerhalb der Canvas.

### OPEN-SEC-005 – CSP, Worker-Allowlist und Rate-Limits

**Priorität:** P2, vor öffentlichem Betrieb.

Die vorhandenen Runtime-Header erlauben für die aktuelle Rendering-Architektur
breite Worker-/Inline-Pfade. Eine vollständige Einschränkung muss gegen den
realen Vinext-/Three-Build geprüft werden; ein blindes Entfernen könnte die
Produktionsansicht brechen.

**Betroffene Pfade:** `next.config.*` bzw. Header-Konfiguration,
`app/planner/scene-3d/*`, Worker-/Bildoptimierungsroute und
`serve-local.mjs`.

**Implementierung:** Produktions-Bundle inventarisieren, konkrete Origins
auflisten, CSP ohne unnötige Quellen testen, Worker- und Bild-Requests
begrenzen, Fehlerstatus/Retry-After standardisieren.

## Shell-/Remote-Nachweis

Ein direkter Shell-Klon und eine lokale Git-Synchronisierung waren wegen
fehlender Credentials bzw. fehlendem `.git` im rekonstruierten Arbeitsbaum
nicht möglich. Die folgenden verlangten Shell-Kommandos wurden dennoch
ausgeführt und scheiterten mit „not a git repository“ bzw. ohne `origin`:

```bash
git status --short
git branch --show-current
git log --oneline -5
git fetch origin --prune
git ls-remote --heads origin
```

Die autorisierte GitHub-Schnittstelle führte die Fast-Forward-Commits aus und
bestätigte abschließend `main` auf
`14926e84b72c0be93dfd284a20e3e230b7483788`, ohne offene PRs und ohne weitere
Branches. Es gab deshalb nichts zu mergen, zu schließen oder zu löschen.


## Zweite Finalrunde – zusätzlicher Umsetzungsstand

Diese Nachrunde hat weitere lokal mögliche Punkte umgesetzt:

- app/planner/workspace/catalog-panel.tsx besitzt jetzt einen lokalen Importdialog
  für GLB, PNG, JPEG, SVG und WEBP mit 5-MB-Limit, Dateiprüfung, Maßeingabe,
  Material, Lizenz, Quelle, Confidence, Statusmeldungen und registrierten Assets.
- app/planner/workspace/planner-workspace.tsx verbindet den Import mit
  registerAsset und erzeugt im aktiven Raum einen kollisionsgeprüften,
  editierbaren Platzhalter mit den importierten Metermaßen.
- app/planner/plan-2d/plan-scene.ts, architecture-layer.tsx und
  plan-canvas.tsx führen Source/Confidence durch gemeinsame Szenendeskriptoren
  und markieren geschätzte oder alte Daten gestrichelt und zugänglich.
- app/planner/plan-2d/use-plan-interactions.ts unterstützt 5-Grad-Rotation,
  45-Grad-Shift-Rotation und verwendet weiterhin dieselben Commands.
- serve-local.mjs setzt Security-Header, CSP-Pfade für den lokalen Build,
  GET/HEAD-Allowlist, URL-Limit 414, statische 12-MB-Grenze 413,
  per-IP-Request-Limit 429 und Retry-After.
- docs/superpowers/plans/2026-11-10-final-completion-plan.md und
  docs/CODEX_FINAL_FORTSETZUNGSPROMPT.md enthalten den sequenziellen
  Umsetzungsplan für die restlichen extern abhängigen Punkte.

Frische Nachweise dieser Nachrunde:

- npm run typecheck: Exit 0
- npm run lint: Exit 0
- npm run build: Exit 0
- npm run test:ui -- --maxWorkers=1: 6 Dateien, 81/81
- npm run test:cutover: 5/5 bestanden (4 Cutover-Tests plus serve-local-Smoke-Test),
  Client-Bundle-Vertrag bestanden
- fokussierter Workspace-/Furniture-Lauf: 2 Dateien, 26/26
- vollständiger Planner-Lauf: 100/101; einziger Fehler bleibt die lokale
  rekonstruierte model-sofa-Binärdatei in tests/planner-assets.test.ts
- nicht-binärer Planner-Subset: 92/92
- npm run assets:check: reproduziert denselben model-sofa-Byte-/SHA-Fehler

Ein parallel gestarteter kombinierter Cutover-Lauf blieb nach zwei erfolgreichen
SSR-Tests hängen, obwohl der isolierte npm run test:cutover-Lauf mit 4/4
bestand. Das ist als Ressourcen-/Parallelitätsproblem dokumentiert, nicht als
grüner kombinierter Lauf behauptet.

Nicht abschließbar ohne externe Verträge bleiben:

- echter Storage-Worker für assetId -> URL
- dynamische GLB-/Bild-Ladung über freigegebene URLs
- Vision-/Produktrecherche mit belegbaren Quellen
- Produktionsorigin-Inventar für CSP und Worker-Allowlist
- belastbare Dependency-/npm audit-Kompatibilitätsmatrix

