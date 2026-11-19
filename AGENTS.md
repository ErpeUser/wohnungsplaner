# AGENTS.md – Verbindliche Regeln für alle KI-/Codex-Arbeiten

## Ein kanonischer Quellstand

- **Einziges editierbares Projekt:** `Wohnung/wohnungsplaner/` (das Verzeichnis dieser Datei).
- **Einziger regenerierbarer Arbeitsordner:** `Wohnung/Wohnungsplaner_Generated/` direkt daneben.
- Alle Änderungen an Anwendungslogik, 2D-/3D-Modulen, Tests, Asset-Manifesten und Build-/Startkonfigurationen **ausschließlich** im Quellprojekt vornehmen.
- Niemals Quellen nach `Wohnungsplaner_Generated` kopieren, dort bearbeiten und später zurückkopieren. Kein zusätzlicher Projektklon, keine `site-xxxx`-Varianten, Backup-/Temp-Kopien oder zeitgestempelte Codeduplikate im `Wohnung`-Ordner.
- **Keine NTFS-Junctions, Verzeichnissymlinks oder angeblichen "clean"-Linkordner** für `node_modules`, `dist`, `.next`, `.vinext`, `.wrangler`, `.local` oder `artifacts` im Quellverzeichnis anlegen. Reproduzierbare Pakete/Outputs ausschließlich im Generated-Geschwisterordner.
- Die Datei `.git` darf als Git-Standardmetadatendatei auf den Git-Verwaltungsordner unter Generated zeigen; sie ist **keine Windows-Verknüpfung** und nicht für den App-Start erforderlich.

## Paketverwaltung, Build und Tests

- Node.js **24+** verwenden. `npm run workspace:prepare` erstellt fehlende Pakete unter `../Wohnungsplaner_Generated/dependencies`; **kein `npm install` oder `npm ci` im Quellordner**.
- TypeScript/Vite/Vitest benutzen den verbindlichen Paketresolver `scripts/resolve-dependencies.mjs` bzw. `scripts/workspace-exec.mjs`.
- Buildartefakte, Chrome/Playwright-Downloads, npm-Cache, TS-Cache, Reports, Logs, temporäre Dateien und automatisch installierte Analysewerkzeuge stets im Generated-Ordner ablegen.
- Für Validierung `npm run validate`, `npm run quality:check`, `npm run build`, Browser-2D/3D-Test und `npm run workspace:inventory` verwenden; nach Build/Tests darf im Quellverzeichnis kein generierter Ausgabeordner zurückbleiben.
- Nur tatsächlich nachweislich unbenutzte Dateien/Funktionen mit vollständiger Import-, Daten- und Runtime-Prüfung löschen. Knip meldet Kandidaten, keine automatische Löschgenehmigung. Referenzassets und Modelloriginale niemals wegen fehlender statischer Imports löschen.
- Änderungen an 3D-Modulen mit AST-basierten Werkzeugen durchführen; alle relativen Imports, Typen, Tests, Bild-/GLB-Pfade, Client/SSR/Export/Import-Pfade aktualisieren.

## GitHub und Codex

- **Ein Repository:** `ErpeUser/wohnungsplaner`, **ein Integrationszweig:** `main`.
- Das Repository ist öffentlich. Vor dem ersten Push müssen Generated-Inhalte, lokale Arbeitsdaten, Umgebungsdateien, Schlüssel, Zugangsdaten und private Quellen durch `npm run privacy:check:strict`, `npm run workspace:inventory`, `git ls-files` und einen Geheimnis-Scan geprüft sein.
- Alle Agenten arbeiten direkt im bestehenden Repository auf `main`. Keine Featurebranches, Nebenbranches, Forks, Worktrees oder Pull Requests anlegen. Änderungen nach Prüfung als direkte Commits auf `main` veröffentlichen.
- Vor jedem Pull oder jeder Synchronisierung zuerst `npm run github:status` ausführen. Der Status muss neben `main` alle Remote-Branches und offenen Pull Requests erfassen. Abweichende Branches und PRs zuerst gegen `main` prüfen. Die neueste nachweislich passende Änderung übernehmen, sinnvolle Änderungen zusammenführen oder veraltete/überholte Arbeit mit dokumentierter Entscheidung bereinigen. Keine automatische Auswahl nach Zeitstempel.
- `npm run github:sync` synchronisiert ausschließlich per Fast-Forward und bleibt bei lokalen Änderungen, Divergenz, offenen Prüfkonflikten oder nicht bewerteten Branches/PRs stehen. Entscheidungen und Prüfstände nach `../Wohnungsplaner_Generated/reports/github` schreiben.
- Nach einem erfolgreichen Fast-Forward bewertet `github:sync` die synchronisierten Pfade. Bei App-/Asset-/Konfigurationsänderungen laufen Build, Browser-Smoke-Test und der Produktions-Desktop-Update automatisch. Änderungen an Desktop-Startdateien regenerieren die Tray-Icons unter `../Wohnungsplaner_Generated/desktop`. Erkannte Extension-Pfade werden im Nach-Pull-Bericht markiert, solange kein separates Extension-Paket mit Generator existiert.
- Der Nach-Pull-Ablauf erzeugt weder `.lnk`- noch `.exe`-Dateien. Die versionierte `Wohnungsplaner starten.cmd` bleibt die einzige Startdatei; generierte Desktop-Artefakte liegen ausschließlich unter `../Wohnungsplaner_Generated/desktop`.
- Der Standardbranch bleibt `main`. Branch-Schutz verhindert Force-Push und Löschung, lässt den ausdrücklich gewünschten direkten Commit-Ablauf zu und verlangt keine PR-Freigabe.
- Vor Bearbeitungen erst `npm run github:status`, bei sauberem Stand `npm run github:sync` ausführen. Lokal veränderte Dateien niemals mit `git reset --hard`, `git clean -fd`, `git checkout -- .`, Force-Push, automatischem Stash/Pop oder blindem Merge überschreiben.
- **Keine neuen PRs, Featurebranches, Forks, Worktrees oder GitHub Actions/Workflows** erzeugen, es sei denn ausdrücklich angefordert. Bestehende GitHub-Arbeit nicht in neuen Kopien fortführen. Änderungen nach Prüfung im bestehenden `main`-Arbeitsbaum bündeln.
- Falls offene PRs existieren: zuerst Status und Diff gegen `main` überprüfen. Bereits integrierte PRs nicht neu cherry-picken. PRs ausschließlich bei erfüllten Review-/CI-/Konfliktprüfungen mergen, dann den gemergten PR-Branch entfernen. Nicht integrierte PRs niemals kommentarlos schließen. In Konfliktfällen stoppen und klar berichten; keine automatischen Überschreibungen.
- `npm run github:status`/`github:sync`/ `github:reconcile` verwenden; diese Befehle dürfen **nicht** vom Desktop-App-Start oder Build automatisch aufgerufen werden. App ist offline-fähig.
- Codex-/GitHub-Automation auf generierte Berichte in `../Wohnungsplaner_Generated/reports/github` begrenzen; keine versteckten PR-Pipelines oder Neben-Workflows im Projekt anlegen.
- Änderungen erst als abgeschlossen melden, wenn der echte Desktop-Start und 2D/3D-Smoke-Test nach den letzten Änderungen bestehen.

## Pflichtablauf jeder neuen Codex-/KI-Sitzung

1. Im vorhandenen `Wohnung/wohnungsplaner` beginnen. Zuerst diese `AGENTS.md`, `README.md`, `package.json` und die betroffenen Module/Tests lesen. Projekt- und Generated-Pfad über `npm run workspace:doctor` bestätigen.
2. `git rev-parse --show-toplevel`, `git status --short`, `git branch -vv` und `npm run github:status` ausführen. Nur bei sauberem Arbeitsbaum `npm run github:sync` (Fast-Forward) verwenden. Niemals ungesicherte Arbeit durch Pull/Checkout/Reset ersetzen.
3. Vor einem Codeeingriff Abhängigkeiten, Imports, Persistenz, Datenmigrationen, 2D/3D, Runtime und Tests des betroffenen Moduls prüfen. Keine unnötigen Duplikate, Worktrees, Git-Repositories oder Prozess-/Projektkopien erzeugen.
4. Nach Änderungen `npm run git:policy`, `npm run workspace:doctor`, `npm run build`, `npm run validate` und `npm run privacy:check:strict` ausführen. Bei UI-/3D-Änderungen zusätzlich einen echten 2D-/3D-Browsertest durchführen. `git status --short` und `npm run workspace:inventory` erneut prüfen.
5. Nur beabsichtigte Dateien stagen; Git-Index durch Pre-Commit-Guard prüfen lassen. Kein Force-Push. Vor einem regulären Push führt der lokale Pre-Push-Hook Build, Validierung und Struktur-/Privatsphäre-Prüfung aus. Fehler beheben, nicht Hooks deaktivieren.
6. Konflikte, ausstehende Reviews, nicht veröffentlichte Commits und fehlgeschlagene Checks ausdrücklich melden. Automatische PR-Merges und stilles Schließen nicht gemergter PRs sind verboten.

## Technische Git-Schutzschichten und Grenzen

- `npm run github:setup` bzw. `npm run github:status` richtet **nur für dieses Repository** `core.hooksPath=scripts/git-hooks`, `pull.ff=only` und `merge.ff=only` ein. Ein bereits abweichender Hooks-Pfad wird nicht überschrieben, sondern als Konflikt gemeldet.
- `scripts/git-guard.mjs` verbietet Git-Index-Einträge für generierte Pfade, Umgebungsgeheimnisse und Symlinks und prüft die echte Geschwisterstruktur sowie die kanonische Remote-URL. `npm run git:policy` ist auch im automatischen Test enthalten.
- Ein einziger CI-Workflow `.github/workflows/canonical-quality.yml` wiederholt auf GitHub Build, Layout, Tests und Privatsphäreprüfung. Keine weiteren Workflows ohne konkret belegten Bedarf.
- GitHub-Branch-Protection für `main` erzwingt lineare Historie und verbietet Force-Pushes und Branch-Löschungen auch für Administratoren. PR-Pflicht und Required Status Checks sind ausdrücklich nicht aktiviert, um den direkten `main`-Ablauf nicht stillschweigend auf PRs umzustellen.
- `npm run github:reconcile` ist **nur ein PR-Audit**; auch `github:sync` mergt niemals PRs. Das frühere automatische `--apply` ist untersagt. PRs nur nach inhaltlicher Freigabe, konfliktfreier Integration, CI- und Review-Prüfung manuell bearbeiten. GitHub löscht gemergte PR-Branches bei aktiviertem `delete_branch_on_merge` selbst.
- Lokale Hooks lassen sich technisch umgehen; ein CI-Check **nach** einem Direkt-Push blockiert diesen Push nicht rückwirkend. Wirklich verpflichtende GitHub-Statuschecks **vor** jeder Integration erfordern einen vorab geprüften Commit, gewöhnlich über einen ausdrücklich genehmigten PR. Niemals bestehende Branch-Protection-Regeln umgehen.
- Die Git-Verwaltung unter `Wohnungsplaner_Generated/git/repository` kann **nicht veröffentlichte Commits, Stashes, Reflogs oder weitere Referenzen** enthalten. Deshalb ist sie ohne geprüfte Sicherung **nicht bedenkenlos löschbar**, obwohl der übrige Generated-Inhalt wiederherstellbar ist. Vor jeder Gesamtlöschung sämtliche Git-Referenzen und den Remote-Abgleich prüfen.

## Niemals löschen oder in Generated ablegen

- Dauerhafte Quellmodule, `package.json`, `package-lock.json`, TypeScript/Vite/Vitest/Playwright-Konfigurationen, Startdateien, Tests, Modelle, Asset-Manifeste, Produktoriginale, Copyright-/Lizenzangaben und eigene unersetzbare Inhalte.
- Browserprofile und dort gespeicherte Wohnungspläne zählen nicht zu generierten Projektdateien. Für diese Daten vor jedem Datenlöschvorgang Export bereitstellen.

**Hinweis:** Diese Regeln gelten auch für zukünftige Agenten – sie dürfen das Layout nicht aus Gewohnheit auf ein Standard-`node_modules`-Projekt mit Output-Verknüpfungen zurücksetzen.
