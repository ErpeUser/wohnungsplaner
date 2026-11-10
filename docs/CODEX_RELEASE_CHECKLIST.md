# Release checklist

- Run `npm run codex:pipeline -- --mode=check --dry-run` and inspect the decision.
- Confirm the working tree is clean or that uncommitted work is intentionally preserved.
- Run `npm run typecheck`, `npm run lint`, the relevant planner/UI/cutover tests, and `npm run build` when the decision requires it.
- Run full mode only with authenticated GitHub access and repository branch protection configured; review every proposed PR action.
- Verify `.local/codex-build-state.json` contains a real source commit and hashes only after a successful build.
- If a local runtime is managed, set explicit `CODEX_RUNTIME_STOP_COMMAND`/`CODEX_RUNTIME_START_COMMAND`, verify the PID belongs to this project, and run the health check.
- Re-run check mode. The second run should report no unnecessary build, merge, or restart.
- Record any external blockers (missing credentials, required reviews, conflicts, or absent desktop packaging) rather than claiming completion.
