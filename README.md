# Raumplaner Wohnung

Ein lokaler, maßhaltiger Wohnungsplaner mit einer gemeinsamen Datenquelle für 2D, 3D, Kollisionen und Export. Der 2D-Plan startet sofort; die realistischere 3D-Ansicht wird erst bei Bedarf geladen.

## Start

Voraussetzung: **Node.js 24 oder neuer**. Die Paketauflösung benötigt Node 24; die Installation erfolgt außerhalb des Quellordners.

```bash
npm run workspace:prepare
npm run dev
```

Der Produktionsstand wird mit `npm run build` erstellt. `npm test` prüft Datenmodell, Geometrie, Bearbeitung, Speicherung, Oberfläche, Export, Serverausgabe und Bundle-Aufteilung.

### Windows: direkt starten, ohne Desktop-Verknüpfung

**Doppelklick auf `Wohnungsplaner starten.cmd` im Ordner `wohnungsplaner`** startet die lokale Anwendung mit Tray-Symbol und Browseroberfläche. Das ist eine echte Startdatei, **keine Windows-Verknüpfung** und kein separater Installationsklon. Die Quellskripte bleiben dauerhaft unter `scripts/`, regenerierbare Tray-Icons liegen unter `../Wohnungsplaner_Generated/desktop`. Es wird weder ein `.lnk` noch ein NTFS-Junction oder ein zweites Programmverzeichnis erstellt.

Das Haus im Infobereich (gegebenenfalls unter **^**) zeigt Laden, Erreichbarkeit oder Fehler an. Doppelklick öffnet die App; das Kontextmenü bietet Öffnen, lokale Vorschau prüfen, Projektordner und **Wohnungsplaner beenden**. Beenden stoppt den eigenen lokalen Server.

Der Desktopbetrieb ist **Git-frei und offline im Sinne von ohne GitHub-Synchronisierung**. Die Anwendung bleibt lokal unter `http://127.0.0.1:3001/` erreichbar; neue npm-Pakete werden nur bei fehlenden oder geänderten Abhängigkeiten aus dem Internet geladen. Die Startdatei `Wohnungsplaner starten.cmd` im Projektordner startet den lokalen Produktionsstand auf Port 3001 und erzeugt einen fehlenden Build automatisch. Das separate Skript `start-wohnungsplaner.ps1` verwendet Port 3000. Logs und PID-Dateien liegen ausschließlich unter `../Wohnungsplaner_Generated/logs/local/`. Im Quellverzeichnis wird **keine** `.local`-Verknüpfung erzeugt.

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
- `app/planner/domain/geometry.ts` und `wall-graph.ts`: Raum-, Wand- und Öffnungsgeometrie
- `app/planner/plan-2d`: Konva-Szene und direkte Bearbeitung
- `app/planner/scene-3d/architecture`: Türen, Fenster, Räume, Küche und Einbauten in getrennten Modulen
- `app/planner/scene-3d/furniture`: Sofas, Betten, Tische, Stühle, Teppiche und Dekoration
- `app/planner/scene-3d/materials`: Materialrezepte und Texturfunktionen
- `app/planner/scene-3d/shared`: gemeinsam wiederverwendete Geometrien und Ressourcen
- `app/planner/scene-3d/planner-3d.tsx`: verzögert geladener 3D-Einstieg
- `app/planner/store`: Befehle, Verlauf und lokale Persistenz
- `app/planner/export`: Sicherung, PNG, Druckmodell und Importvorschau

Die Anwendung benötigt keine Datenbank und keine Anmeldung. Der Desktop-Start verwendet kein lokales Git-Repository und führt keine GitHub-Updates aus. Die veraltete Git-/Cloud-/Codex-Automationspipeline und ihre ausschließlich darauf bezogenen Tests wurden aus den aktiven Quellen entfernt. Reproduzierbare Analysewerkzeuge werden über `npm run code:audit` separat im Generated-Ordner installiert.

## Trennung von Quellcode und erzeugten Arbeitsdaten

Der Projektordner `Wohnung/wohnungsplaner` enthält den dauerhaften Code sowie Original-Modellquellen, Laufzeit-Assets und notwendige Buildkonfigurationen. **Daneben**, als echter Geschwisterordner unter `Wohnung/`, liegt `Wohnungsplaner_Generated` als vollständig reproduzierbarer Arbeitsdatenordner mit:

- `dependencies/`: npm-Pakete und Kopien der Paket-Metadaten
- `build/`: `dist`, `.next` und `.vinext`
- `cache/`: npm-, TypeScript- und Wrangler-Zwischenergebnisse
- `logs/`: lokale Desktop- und Laufzeitprotokolle
- `reports/`: Test-, Playwright-, Coverage- und Analyseergebnisse
- `agents/`, `docs/`, `downloads/`, `tmp/`, `desktop/` und `tools/`: nur wegwerfbare Arbeitsdaten, Icons und separat installierte Prüfwerkzeuge

**Es gibt keinerlei Windows-Verzeichnisverknüpfungen im Quellordner.** Pakete liegen direkt in `../Wohnungsplaner_Generated/dependencies/node_modules`; der Build in `../Wohnungsplaner_Generated/build/dist`. Temporär von Frameworks erzeugte Quell-Caches werden automatisch geprüft und nach abgeschlossenen Werkzeugläufen entfernt. Für Git existiert nur die standardmäßige `.git`-**Textdatei** als Verweis auf die Git-Metadaten im generierten Geschwisterordner – kein NTFS-Link. Die App selbst braucht Git nicht.

**Wiederherstellbar sind die generierten Build-, Cache- und Paketdaten, nicht zwangsläufig die Git-Metadaten unter `Wohnungsplaner_Generated/git/repository`.** Der nächste Start stellt Paket- und Builddateien automatisch wieder her; Browserdownloads bei `npm run visual:check` ebenso. Vor einer Gesamtlöschung des Generated-Ordners müssen unveröffentlichte Commits, Stashes und Reflogs geprüft und gesichert sein. Neuinstallationen benötigen ggf. Internet. Der Programmcode, `package.json`, `package-lock.json`, `tsconfig.json`, originale Fotos/GLBs, Manifeste, die Startskripte und Tests bleiben absichtlich außerhalb. Eigene, nicht ersetzbare Dateien niemals in `Wohnungsplaner_Generated` speichern. `npm run workspace:prepare` richtet die Ablage ein, `npm run workspace:doctor` prüft das linkfreie Layout. **Nicht `npm ci` direkt im Quellprojekt ausführen.**

Identische Referenzbilder nutzen NTFS-Hardlinks: Sie belegen nur einmal Speicher, sind aber weiterhin unter allen benötigten Modell- und Produktpfaden erreichbar. Beim **In-place-Ändern** einer solchen Datei verändern sich alle Hardlinks; Bilder deshalb als unveränderliche Quellen behandeln oder durch Umbenennen gezielt ersetzen. Gemeinsame Hinweise stehen zentral in `models/README.md`.

## Wiederholbare Code- und Speicherplatzanalyse

Die Werkzeuge werden nur bei Bedarf in `Wohnungsplaner_Generated/tools/code-audit/` nachinstalliert. Sie sind **keine** dauerhaften npm-Abhängigkeiten des Produkts. Die Analyse selbst verändert oder löscht keinen Produktcode.

```bash
npm run workspace:doctor      # prüft: keine Junctions und keine Quellen-Caches
npm run workspace:inventory   # listet dauerhafte Dateien und versehentliche temporäre Ausgaben
npm run code:audit            # Knip, Madge, TypeScript, ESLint
npm run test:coverage         # Vitest mit V8-Code-Coverage
npm run visual:check -- --model=chair-dining  # Beispiel: echtes Browser-/WebGL-Rendering
```

- Knip meldet mutmaßlich unbenutzte Dateien, Exports, Typen und Pakete. Dynamische Imports, manuell ausgeführte Skripte, CSS-Plugins und öffentliche APIs können falsch als unbenutzt gelten; daher **keine automatische Löschung nur aufgrund von Knip**.
- Madge prüft Importgraph und Zyklen der Planner-Dateien.
- TypeScript und ESLint prüfen mit den vorhandenen Projektregeln.
- V8-Coverage zeigt Testausführung unter `Wohnungsplaner_Generated/reports/coverage/`; Browser/WebGL-Verhalten wird separat unter `reports/artifacts/visual/` geprüft.
- Das Quellinventar liegt unter `../Wohnungsplaner_Generated/reports/layout/` und prüft das Quellprojekt auf **0 Junctions und 0 generierte Artefakte**.

npm-Caches, das temporäre Verzeichnis der über die npm-Skripte gestarteten Werkzeuge, Reports und Builddateien werden mit `scripts/workspace-exec.mjs` auf den internen Generated-Ordner geroutet. Globale Installationen von Node.js/npm, vom Betriebssystem verwaltete Caches und die persönlichen Browserdaten (gespeicherte Wohnungspläne) sind bewusst **nicht** Bestandteil dieses löschbaren Ordners.

Für den abschließenden kombinierten Schnellcheck zusätzlich `npm run quality:check` verwenden (Quelllayout, Knip/Madge, TypeScript, ESLint, **Produktions-npm-Audit**, privater Asset-Schutz). Der separate Befehl `npm run security:prod` schreibt den aktuellen Audit unter `Wohnungsplaner_Generated/reports/security/` ab. `npm run validate` startet nun auch vier Sicherheits- und Pfadtests des Generated-Bootstraps. Alle Analysen sind wiederholbar; die Ergebnisse im Generated-Ordner sind bewusst löschbar.

## Git, GitHub und Codex: dauerhafter Arbeitsablauf

**Kanonisch ist ausschließlich dieses Repository auf dem Integrationszweig `main`.** Vor jeder Arbeit `AGENTS.md` lesen; Änderungen bleiben in den vorhandenen Quellen. Keine Kopien, Junctions, Symlinks, Worktrees, ungefragten Branches/PRs oder zusätzlichen Pipelines anlegen.

```powershell
# Einstieg – erst Zustand prüfen, nie vorhandene Änderungen überschreiben
npm run workspace:doctor
npm run github:status
git status --short
npm run github:sync             # NUR bei sauberem Working Tree; Fetch + FF-only

# Nach einer Änderung – die passende fachliche UI-/3D-Prüfung ergänzen
npm run git:policy
npm run build
npm run validate
npm run privacy:check:strict
npm run workspace:inventory
git status --short
```

`npm run github:sync` führt **keine PR-Merges** aus und verwirft keine lokalen Änderungen. Sind lokale Commits voraus, divergiert der Verlauf oder besteht ein Konflikt, wird der Vorgang beendet und muss geprüft werden. `npm run github:reconcile` erstellt ausschließlich eine Übersicht offener PRs. Inhaltliche Prüfung, CI/Reviews und eventuelles Mergen/Schließen bleiben bewusst getrennte Entscheidungen. GitHub hat `delete_branch_on_merge` aktiviert; erfolgreich gemergte PR-Branches werden dort automatisch gelöscht.

`npm run github:setup` oder `github:status` installiert die **lokalen Git-Hooks** (`scripts/git-hooks/`) in die Git-Konfiguration dieses Repositories und stellt `pull.ff=only` ein. Vor jedem Commit prüft ein Hook den Index auf temporäre Dateien, vertrauliche Umgebungsdateien und Links. Vor jedem Push laufen Strukturprüfung, Build, Validierung und Datenschutzprüfung. Zusätzlich gibt es **genau einen** GitHub-Actions-Workflow: `.github/workflows/canonical-quality.yml`. Er prüft eingehende Integrationen auf GitHub ohne weitere Deployment-Pipeline.

**GitHub-Branch-Protection:** Für `main` gelten lineare Historie, Schutz gegen Force-Push und Löschung sowie Durchsetzung für Administratoren. PR-Pflicht und Required Status Checks sind nicht eingerichtet.

**Sicherheitsgrenze:** Lokale Git-Hooks sind nicht serverseitig unveränderlich; bei direkten Pushes läuft GitHub-CI erst nach dem Push. Für eine serverseitig *vor* der Integration verpflichtende Testfreigabe wären GitHub Required Status Checks und im Regelfall ein vorab geprüfter PR erforderlich. Eine solche Umstellung würde den ausdrücklich gewünschten Direkt-`main`-Ablauf ändern und darf deshalb nicht stillschweigend erfolgen. Bereits vorhandene Schutzregeln haben immer Vorrang.

**Git-Sicherung:** Die Verzeichnisse unter `Wohnungsplaner_Generated` sind überwiegend regenerierbar, **ausgenommen potenziell unveröffentlichte Informationen unter `git/repository`** (lokale Commits, Stashes, Reflogs). Das gesamte Generated-Verzeichnis niemals löschen, bevor `git status`, `git log`, sämtliche Referenzen und die Synchronisation mit dem Remote geprüft und gegebenenfalls gesichert wurden. Persönliche Browserdaten, Wohnungspläne und Modelloriginale sind ebenfalls niemals als Cache zu behandeln.
