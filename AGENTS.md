# Codex repository instructions

Before making a change, run `npm run codex:preflight` (or `npm run codex:pipeline -- --mode=check`). It records the active branch, local status, origin/default branch, ahead/behind counts, remote branches, pull requests when `gh` is authenticated, and known local runtime state. Never discard an uncommitted working tree. A dirty tree that is behind or diverged from origin must be preserved and resolved explicitly.

Use `npm run codex:sync` for a safe fast-forward/publish check. The synchronizer never force-pushes, resets, rebases, or merges divergent histories automatically. Use `npm run codex:reconcile` to inspect PRs; only `--merge`/full mode may request GitHub's `--auto` merge, and only for non-draft, approved, mergeable PRs with successful checks. Never delete a branch containing unique commits.

After changes run the relevant typecheck, lint, tests, and build. `npm run codex:pipeline -- --mode=full` performs the complete guarded flow. Use `--dry-run` to inspect planned actions. Build and restart decisions are based on changed files; documentation-only changes do not rebuild. Desktop packaging is only considered when an existing Electron/Tauri configuration and artifact are present. Local process restarts require explicit `CODEX_RUNTIME_STOP_COMMAND` and `CODEX_RUNTIME_START_COMMAND` environment variables.

The `.local/` directory is intentionally ignored and stores runtime/build/sync reports. These files may only claim success after the corresponding command exits successfully. GitHub Actions can reconcile PRs and run checks, but cannot restart a user's local machine. See `docs/CODEX_PIPELINE.md`, `docs/CODEX_BUILD_STRATEGY.md`, `docs/CODEX_GITHUB_SYNC.md`, and `docs/CODEX_RELEASE_CHECKLIST.md`.
