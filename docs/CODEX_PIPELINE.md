# Codex pipeline

The durable entry point is `npm run codex:pipeline -- --mode=<check|sync|full>`. Add `--dry-run` to show commands without changing refs, installing dependencies, building, merging, or restarting a process. Individual stages are also available as `codex:preflight`, `codex:sync`, `codex:reconcile`, `codex:build`, `codex:restart`, and `codex:postflight`.

Preflight fetches origin (unless dry-run), detects the default branch, records branch/status/HEAD/ahead-behind data, enumerates branches, and attempts a read-only `gh pr list`. Sync is fast-forward-only when origin is newer; local commits may be pushed only in full mode. Dirty trees are never overwritten. Diverged histories are reported as blocked. Uncommitted, staged and untracked project files are included in change classification.

The pipeline classifies changed files. Documentation-only changes require no build. Source, CSS, server/configuration, assets, or dependency manifests trigger the relevant tests/build decision. Build and runtime reports are written to ignored `.local/` files only after successful operations. Runtime restart is opt-in and project-owned: it requires explicit stop/start command environment variables and a PID recorded in `.local/codex-server.pid`.

No operating-system scheduler is installed implicitly. On Windows, an operator may explicitly use `npm run codex:agent:install`, inspect it with `npm run codex:agent:status`, and remove it with `npm run codex:agent:uninstall`. Other operating systems currently report unsupported instead of installing a partial service. GitHub Actions provides remote checks.
