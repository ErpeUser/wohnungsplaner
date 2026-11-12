# Codex repository instructions

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
- Vor einem Push sind Diff, Typecheck, Lint, Asset-Checks, Planner-/UI-Tests, Build und Cutover zu prüfen. Ohne eine neue ausdrückliche Freigabe wird nicht gepusht.

