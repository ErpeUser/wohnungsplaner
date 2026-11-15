# Codex repository instructions

## Google Cloud abgeschaltet – Kostenstopp vom 15.11.2026

Der Nutzer hat sämtliche kostenpflichtigen Google-Cloud-Ressourcen zur
Entfernung freigegeben. Die Abrechnung aller vier vorhandenen Projekte ist
deaktiviert; Cloud Run und die automatischen Cloud-Build-Trigger sind gelöscht.
Keine Abrechnung, Cloud-Ressourcen, Deployments oder Trigger erneut aktivieren
oder anlegen, solange der Nutzer dies nicht ausdrücklich neu beauftragt.
GitHub bleibt das Quellarchiv; für die Anwendung die lokale Vorschau verwenden.
Die folgenden Cloud-Preview-Anleitungen beschreiben die frühere Einrichtung.

## Standardbranch-only für KI-Agenten

Für alle KI-Aufträge in diesem Repository ist `main` der einzige Arbeitszweig.
Vor Änderungen muss `main` auf `origin/main` aktualisiert werden. KI-Agenten
erstellen oder verwenden keine Feature-, Review-, QA- oder sonstigen Branches,
keine zusätzlichen Worktrees und keine Pull Requests. Nach abgeschlossenen
Änderungen werden die geprüften Dateien direkt auf `main` committed und nach
GitHub gepusht; lokaler `main` und `origin/main` müssen danach denselben Commit
zeigen. Nicht benötigte Nebenbranches und zugehörige Pull Requests werden
geschlossen und gelöscht.

## GitHub-only-Prüfung für ChatGPT- und GitHub-Agenten

### Vorschau zuerst

Für sichtbare KI-Iteration zuerst `npm run dev:review` auf Port 3001 verwenden.
Die lokale Vorschau übernimmt Codeänderungen über HMR. Der Cloud-Run-Preview
folgt automatisch auf jeden main-Push mit Build, Image-Upload und Deploy.
Tests, Typecheck, Lint, Audit und visuelle Gesamtläufe dürfen die schnelle
Preview nicht blockieren; sie laufen separat. Der Produktionskanal behält
seine vollständigen Prüfungen. Auch eine schnelle Preview ist erst bestätigt,
wenn Live-Commit und sichtbares Ergebnis tatsächlich geprüft wurden.

ChatGPT Web braucht keinen eigenen Chromium-/WebGL-Browser. Die echte Anwendung wird in GitHub Actions durch den im Ubuntu-Runner vorinstallierten Chrome (optional Edge) fotografiert. Voraussetzung für eine behauptete visuelle Abnahme ist das **Herunterladen und Öffnen konkreter PNG-Dateien** aus dem privaten Workflow-Artefakt. `report/models.html` und `report/manifest.json` dokumentieren auch nicht renderbare Modellordner; `webgl-probe.json` prüft Cloud-WebGL. Siehe `docs/VISUAL_CLOUD.md`. Es wird keine private Referenz in GitHub Pages veröffentlicht. Der Visual-Workflow startet bei Pushes auf `main`; `Run workflow` steht im Standardbranch bereit.

## ZUERST LESEN: Verbindliche visuelle Prüfung für KI-Agenten

Diese Regeln gelten für jeden Auftrag an Oberfläche, 2D/3D-Modellen, Materialien und Kamera:

1. Vor Änderungen den Git-/Pipeline-Startcheck unten ausführen. Nutzerdaten und andere Arbeitskopien erhalten.
2. Während der Bearbeitung `npm run dev:review` verwenden, Browser auf `http://127.0.0.1:3001` öffnen. Änderungen über die automatische Vorschau prüfen; nur bei Bedarf neu starten.
3. Für ein Möbel `/dev/models?model=<Katalog-ID>&view=perspective` öffnen. Modellgalerie und Wohnung verwenden dieselben Renderer. Gespeicherte Produktreferenzen direkt daneben vergleichen.
4. Auf `canvas[data-render-ready="true"]` und den passenden `data-render-key` warten. Screenshots tatsächlich öffnen und betrachten. Ein Canvas, ein Screenshot-Dateiname oder ein grüner Test allein belegt keine richtige Darstellung.
5. Nach gezielten Änderungen am laufenden Entwicklungsserver `npm run visual:models -- --live --model <Katalog-ID>`; bei GUI-Änderungen `npm run test:browser`. Ergebnisse: `artifacts/visual/latest/report/index.html` und `results.json`.
6. Bei sichtbaren Abweichungen korrigieren und erneut aufnehmen. Baselines niemals ungeprüft ersetzen. Vor Abschluss Browserfehler, defekte Ressourcen und ausstehende Prüfschritte benennen.
7. Für den schnellen Preview-Push den Diff und den Anwendungsbuild prüfen; umfangreiche Validierung separat ausführen. Google Cloud Build veröffentlicht die Preview ohne vorgeschaltete Testläufe. GitHub Actions übernimmt Browser-, WebGL- und Screenshot-Prüfungen separat.
8. Keine visuelle Fertigstellung ohne tatsächliche Bildkontrolle behaupten. Falls Browser, WebGL oder Referenzen fehlen, genau diesen Teil als offen melden. Screenshot-Prüfung ersetzt keine fachliche Produkt-/Maßprüfung.

Verbindlicher Ablauf und Abdeckung: [docs/VISUAL_WORKFLOW.md](docs/VISUAL_WORKFLOW.md), [tests/browser/COVERAGE.md](tests/browser/COVERAGE.md).
Cloud-Veröffentlichung und einmalige Einrichtung: [docs/CLOUD_RUN.md](docs/CLOUD_RUN.md).
Private Referenzen bleiben außerhalb `public/`; die Prüfrouten sind in Produktion standardmäßig abgeschaltet. Hosting ist keine automatische Berechtigung, Wohnungsreferenzen öffentlich zu machen.

Die Anweisungen sind eine Arbeitsvorgabe; die automatische Gegenprüfung erfolgt im GitHub-Workflow. Kein Text kann garantieren, dass ein beliebiger externer Agent alle Regeln liest.

Before making a change, run `npm run codex:preflight` (or `npm run codex:pipeline -- --mode=check`). It records the active branch, local status, origin/default branch, ahead/behind counts, remote branches, pull requests when `gh` is authenticated, and known local runtime state. Never discard an uncommitted working tree. A dirty tree that is behind or diverged from origin must be preserved and resolved explicitly.

Use `npm run codex:sync` for a safe fast-forward/publish check. The synchronizer never force-pushes, resets, rebases, or merges divergent histories automatically. Use `npm run codex:reconcile` to inspect PRs; only `--merge`/full mode may request GitHub's `--auto` merge, and only for non-draft, approved, mergeable PRs with successful checks. Never delete a branch containing unique commits.

After changes run the relevant typecheck, lint, tests, and build. `npm run codex:pipeline -- --mode=full` performs the complete guarded flow. Use `--dry-run` to inspect planned actions. Build and restart decisions are based on changed files; documentation-only changes do not rebuild. Desktop packaging is only considered when an existing Electron/Tauri configuration and artifact are present. Local process restarts require explicit `CODEX_RUNTIME_STOP_COMMAND` and `CODEX_RUNTIME_START_COMMAND` environment variables.

The `.local/` directory is intentionally ignored and stores runtime/build/sync reports. These files may only claim success after the corresponding command exits successfully. GitHub Actions can reconcile PRs and run checks, but cannot restart a user's local machine. See `docs/CODEX_PIPELINE.md`, `docs/CODEX_BUILD_STRATEGY.md`, `docs/CODEX_GITHUB_SYNC.md`, and `docs/CODEX_RELEASE_CHECKLIST.md`.

## Verbindlicher Start jedes Codex-Auftrags

Vor jeder neuen Aufgabe im Repository zuerst die Codex-Pipeline ausführen. GitHub synchronisieren, Pull Requests und Branches prüfen, nötige Builds und Neustarts bestimmen, Änderungen implementieren, Tests ausführen und anschließend lokal und remote denselben geprüften Commit herstellen.

Verwende dafür mindestens `npm run codex:pipeline -- --mode=check --dry-run`; für einen vollständig autorisierten Lauf `npm run codex:pipeline -- --mode=full`. Die Alias-Einstiegspunkte `npm run codex:update` und `npm run codex:release` verwenden dieselben Guard-Stufen. Wenn keine lokale Git-Authentifizierung vorhanden ist, nutze die autorisierte GitHub-Schnittstelle und dokumentiere die Blockade statt einen unbestätigten Push zu behaupten.

## Planner-Regeln

- `modelRevision` migriert Katalog- und Materialdefaults. Bei Migrationen bleiben stabile Platzierungs-IDs, Position, Rotation, Raum-/Wandbezug, Gruppen und Nutzermetadaten erhalten; neue Defaults dürfen nur erkannte Legacy-Signaturen ersetzen.
- Möbelbefehle verwenden stabile Platzierungs-IDs und Katalog-IDs aus `app/planner/catalog/catalog.ts`. Änderungen laufen über `applyPlannerCommand` und dessen Undo-/Redo-Historie; Rohdaten werden nicht direkt mutiert.
- Referenzfotos und private Quellen gehören nicht unter `public/planner-assets/`; Exporte entfernen Laufzeit- und Quell-URLs, und der lokale Adapter muss private Referenzpfade mit 404 sperren.
- Vor dem direkten Preview-Push auf `main` sind Diff und Anwendungsbuild zu prüfen. Typecheck, Lint, Asset-Checks, Planner-/UI-Tests und Cutover laufen separat und blockieren die KI-Vorschau nicht. Direkt committen und pushen; keine Pull Requests oder Nebenbranches.

