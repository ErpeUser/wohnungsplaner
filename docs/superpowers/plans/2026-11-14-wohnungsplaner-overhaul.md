# Wohnungsplaner: belegbare Überarbeitung

> **For agentic workers:** Use superpowers:executing-plans for each scoped task. The user supplied the execution brief; proceed with reversible development work and stop before unapproved publication.

**Goal:** Improve the existing apartment planner's model fidelity, independent object editing, compact inspector, privacy controls and verifiable rendering without replacing its architecture.

**Architecture:** Keep the V3 document, stable placement/catalog IDs, Zustand history and `applyPlannerCommand`. The apartment and review gallery continue sharing React Three Fiber renderers. Private reference media remain internal evidence, never new public assets.

**Tech Stack:** Existing React, TypeScript, Konva, Three.js / React Three Fiber, Vite/Vinext, Node tests, Vitest and Playwright.

**Spec:** The user's twelve-section implementation brief in this conversation; repository `AGENTS.md`, `DESIGN.md`, `UX-CONTRACT.md` and visual workflow apply. Baseline: `e622b3fd06eaebcdf97b79b0b23f304e46ed289a`.

## Design decisions

Preserve the existing calm drawing-table design: dark toolbar, paper surfaces, teal selected states and metric measurements. Replace embedded comparison dashboards with compact model options, one current target and one explicit apply action. Use local product references only when their provenance is established; otherwise show a labelled source link and uncertainty. Existing alternative tables/chairs remain available; do not remove catalog entries to match stale hardcoded counts.

Alternatives considered: replacing the application would discard established geometry/history and is rejected; merely reskinning the existing bulk chooser would preserve its incorrect group mutation and is rejected. Extend the current commands and inspector instead.

## Global constraints

- No push to main, preview publication or production deployment without express approval.
- No new private apartment media in Git changes, public assets, exports or production containers.
- Preserve placement IDs, pose, room/wall/group membership and user metadata during model swaps.
- Keep four dining chairs; changes to one chair must not reset the other three.
- Do not invent unverified dimensions, geometry or materials; keep proxy references labelled.
- Record tests and screenshots honestly; repository changes are distinct from deployed preview.

## Review focus

- Changing the east/north/south chair must target that chair rather than the first chair.
- Numeric blur, Escape and invalid/empty input must not add phantom history entries.
- Model changes and Undo/Redo must retain custom notes and independently positioned chairs.
- Narrow viewports must expose apply actions and numeric fields without nested horizontal scrolling.
- Missing references, encoded private paths and review routes must not disclose internal files.

## Tasks

- [x] Inspect the existing Edge tab, switch 2D/3D, select a chair and examine model controls.
- [x] Read pinned repository instructions, tree, architecture and deployment configuration; execute initial dry-run pipeline.
- [x] Inventory all product/fixed manifests, reference descriptors and quality reports; inspect actual individual source images and record limitations.
- [x] Extend `app/planner/domain/commands.ts` with `setPlacementChairModel { placementId, modelId }`; regression-test metadata, pose, collision and history invariants. Keep legacy bulk command compatible.
- [x] Replace inspector comparison embedding with compact selectable model controls in `workspace/inspector-panel.tsx` and scoped components/CSS. Fix empty/Escape/unchanged numeric commits; test through real store and UI.
- [x] Refine evidence-backed model geometry and shared materials/render lifecycle; test scale, profiles, readiness and resource behavior without inventing source data.
- [x] Audit fixed architecture and privacy/deployment safeguards; add bounded regression tests for demonstrated gaps.
- [x] Improve 2D label density and mobile scroll ownership within existing layout tokens.
- [x] Execute build, validate, visual:check, browser tests and targeted model-capture commands; report actual outcomes, including browser-launch failures.
- [ ] Complete new-code WebGL captures and visual acceptance. The available Edge session shows a different Windows checkout; local Playwright is blocked by a missing browser/download and the system browser by a socket sandbox restriction. Four-view baseline captures were inspected, not passed off as the new code.
- [x] Perform independent code/reference review and produce the exact scoped diff and reports with test outcomes and deployment status.
- [ ] Integrate into main or publish preview/production only after visual gates and explicit publication approval. The authorized review branch/draft PR is not a deployment.

## Handoff

The integrated result and its limits are recorded in [the overhaul report](../../reviews/2026-11-14-overhaul-report.md), with the complete 137-folder inventory and separate model, apartment-photo and privacy evidence. All 12 products with raster references received individual-file review. No private reference media are included in the change.

## Baseline observations

The deployed inspector embeds the large chair comparison and invokes the four-chair bulk action even when one chair is selected. Numeric fields commit on every blur, including unchanged values, which creates redundant history steps. Kitchen labels overlap heavily in 2D. The full apartment's 3D view renders successfully in Edge after loading. Repository quality reports describe parametric fallbacks and do not prove photorealistic product matching.
