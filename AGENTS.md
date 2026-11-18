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
- Vor Bearbeitungen erst `npm run github:status`, bei sauberem Stand `npm run github:sync` ausführen. Lokal veränderte Dateien niemals mit `git reset --hard`, `git clean -fd`, `git checkout -- .`, Force-Push, automatischem Stash/Pop oder blindem Merge überschreiben.
- **Keine neuen PRs, Featurebranches, Forks, Worktrees oder GitHub Actions/Workflows** erzeugen, es sei denn ausdrücklich angefordert. Bestehende GitHub-Arbeit nicht in neuen Kopien fortführen. Änderungen nach Prüfung im bestehenden `main`-Arbeitsbaum bündeln.
- Falls offene PRs existieren: zuerst Status und Diff gegen `main` überprüfen. Bereits integrierte PRs nicht neu cherry-picken. PRs ausschließlich bei erfüllten Review-/CI-/Konfliktprüfungen mergen, dann den gemergten PR-Branch entfernen. Nicht integrierte PRs niemals kommentarlos schließen. In Konfliktfällen stoppen und klar berichten; keine automatischen Überschreibungen.
- `npm run github:status`/`github:sync`/ `github:reconcile` verwenden; diese Befehle dürfen **nicht** vom Desktop-App-Start oder Build automatisch aufgerufen werden. App ist offline-fähig.
- Codex-/GitHub-Automation auf generierte Berichte in `../Wohnungsplaner_Generated/reports/github` begrenzen; keine versteckten PR-Pipelines oder Neben-Workflows im Projekt anlegen.
- Änderungen erst als abgeschlossen melden, wenn der echte Desktop-Start und 2D/3D-Smoke-Test nach den letzten Änderungen bestehen.

## Niemals löschen oder in Generated ablegen

- Dauerhafte Quellmodule, `package.json`, `package-lock.json`, TypeScript/Vite/Vitest/Playwright-Konfigurationen, Startdateien, Tests, Modelle, Asset-Manifeste, Produktoriginale, Copyright-/Lizenzangaben und eigene unersetzbare Inhalte.
- Browserprofile und dort gespeicherte Wohnungspläne zählen nicht zu generierten Projektdateien. Für diese Daten vor jedem Datenlöschvorgang Export bereitstellen.

**Hinweis:** Diese Regeln gelten auch für zukünftige Agenten – sie dürfen das Layout nicht aus Gewohnheit auf ein Standard-`node_modules`-Projekt mit Output-Verknüpfungen zurücksetzen.
