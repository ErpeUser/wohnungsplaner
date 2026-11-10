# Build and runtime strategy

`scripts/codex-build-decision.mjs` produces a deterministic decision from changed paths. Lockfiles/package manifests trigger `npm ci --ignore-scripts --no-audit --no-fund`, then tests/build. React/TypeScript, CSS, server/config, and asset changes trigger a production build where appropriate. Documentation and test-only changes do not cause an unnecessary runtime rebuild.

Desktop packaging is not invented: the build stage only reports EXE/MSI/AppImage/DMG artifacts found under an existing `release/` directory. An Electron/Tauri configuration must already exist before a desktop build can be considered. Artifact hashes are SHA-256 values of files that actually exist.

The build state in `.local/codex-build-state.json` records the source commit and artifact hashes only after `npm run build` exits successfully. A failed build is surfaced and never recorded as successful. Rollback is intentionally external/configured; the pipeline does not delete or replace a known-good artifact.
