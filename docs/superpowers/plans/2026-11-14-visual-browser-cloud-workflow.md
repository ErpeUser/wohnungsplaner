# Visual browser and Cloud Run implementation plan

Goal: approved user workflow edit → live preview → inspect real rendered screenshots → correct → test → GitHub artifact → gated deployment.

Architecture: retain Vinext development server and existing furniture/architecture renderers; isolate gallery scenes without modifying saved plans. Playwright owns repeatable browser flows and latest reports; existing Quality workflow gates one immutable Cloud Run container. No second source-build deployment path.

Approved scope: user explicitly requested implementation on 2026-11-14 and then inexpensive Google Cloud setup, with account switch. Work is in branch `codex/visual-browser-cloud-workflow` in the existing checkout; older dirty worktree is untouched. No push until separately authorized under repository rules.

- [x] Inspect latest main/branches/PRs and run required preflight.
- [x] Write failing review-model tests, implement isolated scene/camera projection.
- [x] Build development-only model gallery and gated raster reference routes.
- [x] Add actual WebGL readiness contract and reuse it in apartment and gallery.
- [x] Add Playwright GUI scenarios, screenshot reports, per-model filtering.
- [x] Extend existing CI, container adapter and safe server PID behavior.
- [x] Put mandatory agent visual instructions at top of AGENTS.md and document commands/coverage.
- [x] Verify live hot update without process restart and inspect real screenshots.
- [x] Run full validation/build/browser suite and review integrated diff.
- [x] Configure scoped GCP/OIDC resources after account selection.
- [ ] First automatic deployment: GitHub Actions must start successfully and publishing must be authorized.
- [x] Record completed local checks and remote publish prerequisites.

Local evidence: production build and `npm run validate` passed, all eight
Playwright scenarios passed, and 93 models produced 372 standard views. The
release container returned the planner and its textures, while keeping the
review gallery and private floor plan images unavailable. The gallery renders
the current model; screenshots reveal differences from real products and are
not an approval of model fidelity.

Decisions: Playwright Chromium works locally; no additional browser plugin required. Keep generated screenshots untracked and private model-reference routes disabled in production. min0/max1 Cloud Run europe-west1 balances hobby cost and memory. No cloud GPU required for client-rendered 3D. GitHub automation uses scoped WIF; no credential keys in repository. GitHub reported a payment/spending limit rejection before runner startup on the latest existing workflow; deployment stays disabled until this is resolved.
