# Offene Umsetzung und verifizierte Übergaben

Stand: 2026-11-10

Dieses Dokument trennt ausgeführte Änderungen von Punkten, die in der
vorliegenden Codebasis nicht nachweisbar bearbeitet werden konnten. Es ist als
ausführbare Übergabe für die nächste Person oder Codex gedacht. Unbekannte
Dateien, Routen und APIs werden ausdrücklich als unbekannt behandelt.

## Ausgeführt und lokal verifiziert

- Der GitHub-Standardbranch wurde über die autorisierte GitHub-Schnittstelle
  als `main` mit Ausgangs-Head `ab8132df44cdc92e6fc7caa322c42bef1f6ce528` bestätigt.
  Die Abfrage offener Pull Requests ergab keine Einträge; die Branchabfrage
  enthielt nur `main`. Es gab daher keinen integrierbaren Nebenbranch und
  keinen Branch, der nach nachgewiesener Übernahme gelöscht werden konnte.
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
- Der Asset-Manifest-Stand wurde gegen die tatsächlich vorhandenen lokalen
  Bytes synchronisiert; `npm run assets:check` ist erfolgreich.
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

Ergebnis: Typecheck, ESLint, Asset-Prüfung und 96 Planner-Tests bestanden;
die UI-Suite bestand mit 80 Tests. Die UI-Suite benötigt in dieser Umgebung
wegen sechs isolierter jsdom-Umgebungen rund 71 Sekunden im seriellen Lauf.
Es bleibt die bekannte, harmlose Warnung aus Three.js (`THREE_CJS_DEPRECATED`)
und die npm-Warnung zur unbekannten `http-proxy`-Konfiguration.

## Offene Übergabeaufträge

### OPEN-CHESS-001 – Private-Hub-Pfeile und Allie-Pairing-Fehler

**Priorität:** P0, sobald das betreffende Schachprojekt identifiziert ist.

**Beobachtung:** Der Auftrag nennt eine chess.com-ähnliche private-Hub-UI mit
fehlenden Pfeilen sowie die Meldung „Lokaler Allie-Server nicht erreichbar: Zu
viele Pairing-Versuche“. Im Repository `ErpeUser/wohnungsplaner` gibt es keine
Treffer für `private hub`, `allie`, `pairing`, `server nicht erreichbar`,
`pfeil` oder `arrow` außerhalb allgemeiner Pfeiltasten-/Raumplanertexte. Es
existieren auch keine Schach-Routen, Pairing-Handler, WebSocket-Clients oder
Allie-Konfigurationen. Eine Änderung an Wohnungsplaner-Dateien würde deshalb
keine nachweisbare Wirkung haben.

**Blockade:** Das betroffene Schach-Repository, der konkrete Pfad bzw. eine
laufende URL und die Server-/Client-Logs wurden nicht bereitgestellt. Es fehlen
damit die echte Komponente, die Übersetzungs-/Routingstruktur und der Vertrag
des Pairing-Endpoints. Dieser Auftrag ist keine Behauptung, dass die Funktion
in diesem Projekt erledigt sei.

**Unmittelbarer nächster Befehl nach Bereitstellung des richtigen Quellbaums:**

```bash
rg -n -i "private.?hub|allie|pairing|pfeil|arrow|lokaler|server nicht erreichbar" <schach-repository>
```

Danach sind die gefundene Hub-Komponente, die Icon-/SVG-Quelle, der Pairing-
Client und der lokale Allie-Serverpfad zu benennen. Erst dann kann der Fix
implementiert werden:

1. Pfeile als echte, fokussierbare Buttons mit `aria-label`, sichtbarem
   Hover-/Focus-State und pointer/keyboard-Navigation in der gefundenen
   Hub-Komponente ergänzen; eine bestehende Icon-Bibliothek des Projekts
   verwenden.
2. Pairing-Versuche clientseitig mit Request-ID, AbortController und
   exponentiellem Backoff begrenzen; parallele Versuche für denselben Nutzer
   deduplizieren.
3. Serverseitig Rate-Limit/Lease pro Session durchsetzen und bei erreichbarem
   Retry-Limit einen maschinenlesbaren Fehler (`code`, `retryAfterMs`) statt
   des unstrukturierten Textes liefern.
4. UI-Zustände für `connecting`, `retrying`, `unavailable` und `paired` mit
   verständlicher Aktion („Erneut versuchen“) und Status-Live-Region abbilden.

**Benötigte Eingaben:** richtiges Repository oder die betroffenen Dateien,
lokaler Allie-Endpunkt, Auth-/Session-Vertrag, erwartete maximale
Pairing-Versuche und ein reproduzierbarer Logauszug. Keine API-Schlüssel in
Git committen.

**Tests nach Einfügung in die echte Codebasis:**

```bash
# Pfade an das gefundene Schachprojekt anpassen
npm test -- <hub-ui-test> <pairing-client-test> <pairing-server-test>
npm run typecheck
npm run lint
```

Akzeptanz: Pfeile sind per Maus, Touch und Tastatur sichtbar und bedienbar;
der Hub zeigt korrekte Fokus-/Disabled-Zustände; zehn parallele Pairing-
Auslöser erzeugen höchstens eine aktive Anfrage; nach dem Limit erscheint ein
Retry-Zeitpunkt; ein erreichbarer lokaler Allie-Server führt erfolgreich zu
`paired`; ein nicht erreichbarer Server bleibt ohne Endlosschleife bedienbar.

### OPEN-AI-IMPORT-002 – PreparedAsset an Upload, Store und Platzierung anbinden

**Priorität:** P1.

**Vorarbeit:** `app/planner/catalog/asset-import.ts` validiert Metadaten,
Medientyp, Binärsignatur, SHA-256, normierte Maße, Pivot und Floor-Offset.
`PreparedAsset` wird aber noch nicht von einem Upload-UI in den Planner-Store
übernommen. Es gibt keine verifizierte KI-/Vision-API, keinen API-Schlüssel und
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

**Vorarbeit:** Drawer-Dialogrollen, Backdrop, Escape-Schließen und Focus-Return
sind umgesetzt. Ein vollständiger Fokus-Trap, inert-Untergrund und ein
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
verwenden; Quellen-/Confidence-Badge in 2D/3D ergänzen; Pointer-Lock auf die
Canvas-Instanz statt globalem Selector begrenzen; Snap-Suche mit Sweep/Index
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

## Nicht ausgeführte Befehle

Der Shell-Push war wegen fehlender Git-Credentials nicht möglich. Der
verifizierte Push wurde deshalb über die autorisierte GitHub-Schnittstelle als
Commit `0a8a4416243aece82a02190e635f8fc7053b4525` auf `main` ausgeführt. Die
folgenden Shell-Kommandos wurden in dieser Umgebung nicht ausgeführt und sind
für eine spätere lokale Checkout-Synchronisierung vorgesehen:

```bash
git status --short
git branch --show-current
git log --oneline -5
git fetch origin --prune
git ls-remote --heads origin
```

Erwartung bei der Nachprüfung: Arbeitsbranch `main`; der Remote-`main` zeigt
auf `0a8a4416243aece82a02190e635f8fc7053b4525`, offene PRs bleiben leer und es
existieren keine zusätzlich zu löschenden integrierten Branches.
