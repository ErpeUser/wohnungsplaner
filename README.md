# Raumplaner Wohnung

Ein lokaler, maßhaltiger Wohnungsplaner mit einer gemeinsamen Datenquelle für 2D, 3D, Kollisionen und Export. Der 2D-Plan startet sofort; die realistischere 3D-Ansicht wird erst bei Bedarf geladen.

## Start

Voraussetzung ist Node.js ab Version 22.13.

```bash
npm install
npm run dev
```

Der Produktionsstand wird mit `npm run build` erstellt. `npm test` prüft Datenmodell, Geometrie, Bearbeitung, Speicherung, Oberfläche, Export, Serverausgabe und Bundle-Aufteilung.

### Windows: Desktop-Verknüpfung und Tray

Einmal `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install-desktop.ps1` ausführen. Danach startet **Wohnungsplaner** auf dem Desktop den aktuellen lokalen Projektordner ohne Konsolenfenster. Der Installer speichert den absoluten Ordnerpfad unter `%LOCALAPPDATA%\Wohnungsplaner`; nach einem Umzug des Repositorys den Installer erneut ausführen.

Das Haus im Infobereich (gegebenenfalls unter **^**) ist gelb beim Aktualisieren/Laden, grün bei erreichbarer Vorschau und rot bei Fehlern. Doppelklick öffnet die App; das Kontextmenü bietet Öffnen, Aktualisieren, Projektordner und **Wohnungsplaner beenden**. Beenden stoppt den eigenen lokalen Server und entfernt das Tray-Symbol; bereits offene Browser-Tabs bleiben erhalten.

Beim Start und alle fünf Minuten wird `main` ausschließlich per Fast-Forward aktualisiert. Lokale Änderungen und andere Arbeitszweige pausieren Updates mit einem sichtbaren Hinweis; Offlinebetrieb verwendet den vorhandenen Stand. Neue Abhängigkeiten werden automatisch installiert, neue Commits starten die Vorschau neu. Browserdaten bleiben im bisherigen Browserprofil unter `http://127.0.0.1:3001/`. Es wird kein Autostart oder kostenpflichtiger Cloud-Dienst eingerichtet. Diagnose: `.local/desktop-state.json`, `.local/desktop-server.log` und `.local/desktop-worker-error.log`.

## Bedienung

- Raum über die Kopfleiste wählen und Möbel aus dem Katalog einfügen.
- In 2D ziehen, mit Pfeiltasten fein verschieben und Werte im Eigenschaftenbereich exakt eingeben.
- Rückgängig/Wiederholen arbeitet auf denselben semantischen Befehlen wie Maus und Tastatur.
- Die 3D-Ansicht bietet Orbit- und Gehmodus; wenn WebGL oder ein Modell ausfällt, bleibt der vollständige 2D-Plan nutzbar.

## Lokale Daten und Sicherungen

Planänderungen werden ausschließlich im lokalen Browser gespeichert. Über **Export & Import** stehen eine wieder einlesbare JSON-Sicherung, ein hochauflösendes PNG der aktuellen 2D-Ansicht und ein kompakter PDF-Druckplan bereit. Ein Import zeigt vor dem Ersetzen eine Vorschau mit Warnungen.

Private Quellpfade, Fotos oder externe Laufzeit-URLs werden weder in Sicherungen noch in Exporten eingebettet.

## 3D-Assets

Alle zur Laufzeit verwendeten Modelle, Materialien und die Umgebung liegen unter `public/planner-assets/`. Herkunft, Lizenz, Maßstab und Prüfsummen sind in `public/planner-assets/manifest.json` dokumentiert. Fehlende oder beschädigte Modelle werden durch lokale parametrische Ersatzobjekte dargestellt.

Neue KI- oder Produktdateien werden vor dem Eintrag in den Katalog als lokale Asset-Importe vorbereitet. Das Werkzeug erwartet Positionsargumente und erzeugt `<Datei>.asset.json` mit Name, Kategorie, Außenmaßen in Metern, Pivot/Floor-Offset, Dateityp, Dateigröße und SHA-256:

```bash
node scripts/prepare-planner-asset.mjs \
  public/planner-assets/models/neues-produkt.glb \
  "Neues Produkt" "Licht/Deko" 1.20 0.60 0.75
npm run assets:check
```

Produktquelle, Nutzungsrechte und Materialhinweise müssen separat in den Modell- und Asset-Quellen dokumentiert werden. Das Skript prüft diese Angaben nicht und übernimmt die Datei nicht automatisch in den Katalog oder das Asset-Manifest. `npm run assets:check` prüft die bereits registrierten Laufzeit-Assets.

`renderMode: "gltf"` nutzt das geprüfte Originalmodell, `renderMode: "parametric"` die gezielt modellierte Produktform und `renderMode: "auto"` entscheidet anhand der lokalen Verfügbarkeit. Produktbilder bleiben Referenzmaterial; die metrischen Außenmaße im Sidecar und im Katalog sind die Geometriequelle.

## Deko-Empfehlungen und Produktsuche

`recommendDecor(document, roomId)` in `app/planner/recommendations/decor-recommendation.ts` analysiert Raumfläche, Boden-/Wandmaterial, Belegung, Einbauten und vorhandene Fixtures. Die Funktion erzeugt reproduzierbare Platzhalter für Bild, Licht, Teppich, Pflanze, Textil und Ablage nur dann, wenn ihre gemessenen Außenmaße innerhalb der Raumgeometrie liegen. Jede Empfehlung enthält eine Farbpalette, Begründung, Platzierungshinweis und eine konkrete Produktsuchanfrage.

Die Empfehlungen bleiben mit `status: "placeholder"` und `sourceConfidence: "estimated"` gekennzeichnet. Ein nachgeschalteter Produkt- oder Firecrawl-Schritt kann die Suchanfrage mit einem geprüften Produkt beantworten; dessen Bild/GLB wird anschließend über die Sidecar- und Manifest-Pipeline importiert, während Position und Maße vor der Übernahme erneut gegen den Grundriss validiert werden.

## Technische Struktur

- `app/planner/domain`: kanonisches V3-Dokument und Schema
- `app/planner/geometry`: Raum-, Wand-, Öffnungs- und Kollisionsgeometrie
- `app/planner/plan-2d`: Konva-Szene und direkte Bearbeitung
- `app/planner/scene-3d`: verzögert geladene React-Three-Fiber-Szene
- `app/planner/store`: Befehle, Verlauf und lokale Persistenz
- `app/planner/export`: Sicherung, PNG, Druckmodell und Importvorschau

Die Anwendung benötigt keine Datenbank und keine Anmeldung. Hosting-Konfigurationen unter `.openai/` und `worker/` bleiben unabhängig davon bestehen.

## Codex-Entwicklungspipeline

Vor jeder weiteren Codex-Arbeit wird der Repository-Stand mit der versionierten Preflight-Pipeline geprüft. Die wichtigsten Befehle sind:

```bash
npm run codex:pipeline -- --mode=check --dry-run
npm run codex:pipeline -- --mode=sync
npm run codex:pipeline -- --mode=full
npm run codex:pipeline -- --mode=full --dry-run
```

Die Pipeline synchronisiert `main` nur per Fast-Forward, schützt uncommittete Änderungen, prüft PRs/Branches, entscheidet anhand der tatsächlich geänderten Dateien über Abhängigkeiten, Tests, Build und Neustart und schreibt Laufzeitnachweise ausschließlich nach erfolgreichen Schritten nach `.local/`. Eine Windows-Task-Scheduler-Überwachung ist optional und wird nur ausdrücklich über `npm run codex:agent:install` eingerichtet; Status und Entfernung erfolgen mit `npm run codex:agent:status` bzw. `npm run codex:agent:uninstall`.
