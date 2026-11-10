# Codex pipeline

The durable entry point is `npm run codex:pipeline -- --mode=<check|sync|full>`. Add `--dry-run` to show commands without changing refs, installing dependencies, building, merging, or restarting a process. Individual stages are also available as `codex:preflight`, `codex:sync`, `codex:reconcile`, `codex:build`, `codex:restart`, and `codex:postflight`.

Preflight fetches origin (unless dry-run), detects the default branch, records branch/status/HEAD/ahead-behind data, enumerates branches, and attempts a read-only `gh pr list`. Sync is fast-forward-only when origin is newer; local commits may be pushed only in full mode. Dirty trees are never overwritten. Diverged histories are reported as blocked. Uncommitted, staged and untracked project files are included in change classification.

The pipeline classifies changed files. Documentation-only changes require no build. Source, CSS, server/configuration, assets, or dependency manifests trigger the relevant tests/build decision. Build and runtime reports are written to ignored `.local/` files only after successful operations. Runtime restart is opt-in and project-owned: it requires explicit stop/start command environment variables and a PID recorded in `.local/codex-server.pid`.

No operating-system scheduler is installed implicitly. On Windows, an operator may explicitly use `npm run codex:agent:install`, inspect it with `npm run codex:agent:status`, and remove it with `npm run codex:agent:uninstall`. Other operating systems currently report unsupported instead of installing a partial service. GitHub Actions provides remote checks.

## Kompatibilitäts-Einstiegspunkte

Die explizit benannten Wartungsbefehle delegieren auf dieselben Schutzstufen:

- \`npm run codex:update -- --mode=check --dry-run\` führt nur die Bestandsaufnahme aus.
- \`npm run codex:update -- --mode=sync\` synchronisiert Fast-Forward-Updates und hält divergente oder geschützte Arbeitsstände an.
- \`npm run codex:update -- --mode=full\` führt Synchronisierung, freigegebene PR-Reconciliation und Push-Prüfung aus.
- \`npm run codex:release\` verwendet den vorhandenen Build-Entscheider, erstellt nur erforderliche Artefakte, startet nur einen registrierten Projektprozess mit expliziten Stop-/Start-Befehlen neu und führt danach den Postflight aus.

Keiner dieser Befehle erfindet eine EXE, einen Storage-Worker oder einen Produktions-Endpoint. Ohne lokale GitHub-Authentifizierung ist der lokale Synchronisationsschritt blockiert; in diesem Fall muss der autorisierte GitHub-Connector verwendet und die Blockade protokolliert werden.

## GitHub Actions

\`.github/workflows/quality.yml\` führt bei Pushes auf \`main\`, Pull Requests gegen \`main\` und manuellem Start npm ci, Typecheck, Lint, Produktionsbuild, Planner-/UI-/Cutover-/Asset-Tests sowie \`npm audit\` aus. Die Aktion kann keine ausgeschaltete lokale Installation starten oder aktualisieren. Der vorhandene Workflow \`codex-reconcile.yml\` bleibt für die getrennte, geschützte PR-Reconciliation zuständig.

