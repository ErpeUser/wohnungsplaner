# Codex pipeline

The durable entry point is `npm run codex:pipeline -- --mode=<check|sync|full>`. Add `--dry-run` to show commands without changing refs, installing dependencies, building, merging, or restarting a process. Individual stages are also available as `codex:preflight`, `codex:sync`, `codex:reconcile`, `codex:build`, `codex:restart`, and `codex:postflight`.

Preflight fetches origin (unless dry-run), detects the default branch, records branch/status/HEAD/ahead-behind data, enumerates branches, and attempts a read-only `gh pr list`. Sync is fast-forward-only when origin is newer; local commits may be pushed only in full mode. Dirty trees are never overwritten. Diverged histories are reported as blocked. Uncommitted, staged and untracked project files are included in change classification.

The pipeline classifies changed files. Documentation-only changes require no build. Source, CSS, server/configuration, assets, or dependency manifests trigger the relevant tests/build decision. Build and runtime reports are written to ignored `.local/` files only after successful operations. Runtime restart is opt-in and project-owned: it requires explicit stop/start command environment variables and a PID recorded in `.local/codex-server.pid`.

No operating-system scheduler is installed implicitly. On Windows, an operator may explicitly use `npm run codex:agent:install`, inspect it with `npm run codex:agent:status`, and remove it with `npm run codex:agent:uninstall`. Other operating systems currently report unsupported instead of installing a partial service. GitHub Actions provides remote checks.

## Kompatibilitäts-Einstiegspunkte

Die explizit benannten Wartungsbefehle delegieren auf dieselben Schutzstufen:

- `npm run codex:update -- --mode=check --dry-run` führt nur die Bestandsaufnahme aus.
- `npm run codex:update -- --mode=sync` synchronisiert Fast-Forward-Updates und hält divergente oder geschützte Arbeitsstände an.
- `npm run codex:update -- --mode=full` führt Synchronisierung, freigegebene PR-Reconciliation und Push-Prüfung aus.
- `npm run codex:release` verwendet den vorhandenen Build-Entscheider, erstellt nur erforderliche Artefakte, startet nur einen registrierten Projektprozess mit expliziten Stop-/Start-Befehlen neu und führt danach den Postflight aus.

Keiner dieser Befehle erfindet eine EXE, einen Storage-Worker oder einen Produktions-Endpoint. Ohne lokale GitHub-Authentifizierung ist der lokale Synchronisationsschritt blockiert; in diesem Fall muss der autorisierte GitHub-Connector verwendet und die Blockade protokolliert werden.

## GitHub Actions

`.github/workflows/quality.yml` führt bei Pushes auf `main`, Pull Requests gegen `main` und manuellem Start npm ci, Typecheck, Lint, Produktionsbuild, Planner-/UI-/Cutover-/Asset-Tests sowie `npm audit` aus. Die Aktion kann keine ausgeschaltete lokale Installation starten oder aktualisieren. Der vorhandene Workflow `codex-reconcile.yml` bleibt für die getrennte, geschützte PR-Reconciliation zuständig.


## Validierung vor dem Push und lokaler Healthcheck

Vor einem Push müssen die für die Änderung relevanten Prüfungen erfolgreich beendet
sein. Für den vollständigen Durchlauf ist das der folgende Ablauf:

1. `npm run codex:update -- --mode=check --dry-run`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. `npm run test:planner`
6. `npm run test:ui -- --maxWorkers=1`
7. `npm run test:cutover`
8. `npm run assets:check`
9. `npm audit --json`
10. `npm run codex:update -- --mode=full`

Der Push darf nur gegen den zuvor gelesenen erwarteten Parent-Commit erfolgen. Bei
lokalen Änderungen, divergierender Historie, fehlender Authentifizierung oder einem
fehlgeschlagenen Check bleibt der Vorgang blockiert; es gibt keinen Reset, Rebase
oder Force-Push. Ein erfolgreicher Build ist Voraussetzung für einen Release- oder
Neustart-Schritt.

Der lokale Adapter schreibt während des laufenden Prozesses
`.local/codex-server.pid`. Beim normalen Beenden über SIGINT oder SIGTERM wird die
Datei entfernt. Der Read-only-Endpunkt `GET /__codex/health` benötigt keinen
Vinext-Handler und liefert JSON mit diesen Feldern:

- `status`: immer `"ok"`, wenn der Adapter erreichbar ist
- `sourceCommit`: der Wert von `CODEX_SOURCE_COMMIT` oder `null`
- `pid`: die Prozess-ID des laufenden Adapters

Beispiel:

```bash
curl --fail http://127.0.0.1:3000/__codex/health
```

`npm run codex:release` prüft diesen Endpunkt nur, wenn
`CODEX_HEALTHCHECK_URL` gesetzt ist. Ein fehlgeschlagener Healthcheck macht den
Release-Schritt fehlerhaft; ohne gesetzte URL wird er ausdrücklich als übersprungen
protokolliert. GitHub Actions kann diesen lokalen Prozess nicht starten,
aktualisieren oder wiederherstellen.

## Desktop- und EXE-Grenze

Das Repository enthält keine nachweisbare Electron-, Tauri- oder andere
Desktop-Paketierung. Die Pipeline erzeugt deshalb keine EXE, MSI, AppImage oder
vergleichbare Desktop-Artefakte. Falls später eine solche Paketierung eingeführt
wird, muss sie zuerst als echte Build-Konfiguration und Release-Artefakt im
Repository vorhanden sein; erst dann darf der Build-Entscheider sie berücksichtigen.
