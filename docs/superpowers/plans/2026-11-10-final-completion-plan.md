# Final Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every remaining local implementation gap in the planner while making external Storage, Vision, product-source and production-origin dependencies explicit and executable as follow-up work.

**Architecture:** Keep the existing command-driven PlannerDocumentV3 domain as the single source of truth. Finish local import and accessibility behavior without inventing an external contract; integrate dynamic 3D assets only behind a validated `assetId -> URL` boundary. Keep 2D, SVG fallback and 3D on shared scene descriptors and preserve provenance/confidence through every renderer.

**Tech Stack:** React 19, TypeScript, Zod, Zustand, Vinext/Vite, Three.js, Konva, Node test runner, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-final-optimization-design.md` and `docs/OFFENE_UMSETZUNG.md`.

## Global Constraints

- Never invent Vision APIs, API keys, product URLs, Storage routes or production origins.
- Keep `PlannerDocumentV3` JSON-serializable; store only validated metadata and `assetId -> URL` references.
- Reuse existing `PlannerCommand` history for add, move, rotate, resize, register and remove operations.
- Keep the 5 MB limit, SHA-256, Magic-Byte, material, meter-size, pivot and floor-offset validation.
- Preserve uncertainty as editable data with `confidence`, `source` and a visible warning.
- Do not force-push; update `main` only with an expected-head fast-forward.
- Every implementation task ends with focused tests plus typecheck, lint and build where the changed surface requires them.

## Review Focus

- A valid file with the wrong extension or MIME type must be rejected before persistence.
- A legacy document with `assets` absent or old `loggia` aliases must still reload safely.
- A drawer must never leak focus to an inert background or return focus to the wrong trigger.
- Pointer lock and walk controls must not react outside their concrete Canvas instance.
- A missing or untrusted external asset URL must render an editable placeholder, never silently fail.

### Task 1: Local Catalog Import UI

**Files:**
- Modify: `app/planner/workspace/catalog-panel.tsx`
- Modify: `app/planner/store/planner-store.ts`
- Modify: `app/planner/catalog/asset-import.ts`
- Test: `tests/planner-asset-import.test.ts`
- Test: `tests/planner-workspace.test.tsx`

**Interfaces:**
- Consume `preparePlannerAsset`, `PlannerAssetRecord`, `registerAsset`, existing store command dispatch.
- Produce a controlled file input with progress state, validation error state, and a manual metadata form.

- [ ] Write tests for GLB/PNG/JPEG/SVG/WEBP selection, 5 MB rejection, MIME mismatch, missing dimensions, unknown material, progress completion and readable errors.
- [ ] Render the input with `accept=".glb,.png,.jpg,.jpeg,.svg,.webp"`, size preflight, progress text and retry/reset behavior.
- [ ] Collect width/depth/height, material, license, source and confidence before dispatching `registerAsset`.
- [ ] Add a local placeholder placement path that uses the existing command and collision validation; do not call an external URL.
- [ ] Run the focused asset/UI tests and verify keyboard-only operation.

### Task 2: Validated External Asset Boundary and 3D Placeholder

**Files:**
- Modify: `app/planner/domain/types.ts`
- Modify: `app/planner/domain/schema.ts`
- Modify: `app/planner/scene-3d/*`
- Modify: `app/planner/workspace/inspector-panel.tsx`
- Test: `tests/planner-commands.test.ts`
- Test: `tests/planner-persistence.test.ts`

**Interfaces:**
- Consume `PlannerAssetRecord.assetUrl?: string`, normalized size, pivot and floor offset.
- Produce a renderer boundary that accepts a validated `assetId` and returns either a loaded model or an editable placeholder state.

- [ ] Add a pure `resolvePlannerAsset(assetId, document)` helper that rejects unknown IDs, invalid URLs and missing records.
- [ ] Pass `meterScale`, pivot and floor offset into the model transform only after resolution.
- [ ] Render a labeled placeholder containing source and confidence when no trusted URL is available.
- [ ] Preserve URL-less local assets through reload without silently pretending they are rendered products.
- [ ] Test unknown IDs, invalid URLs, stable transforms, placeholder rendering and reload persistence.

### Task 3: Complete Keyboard, Touch and Drawer UX

**Files:**
- Modify: `app/planner/workspace/planner-workspace.tsx`
- Modify: `app/planner/workspace/details-drawer.tsx`
- Modify: `app/planner/workspace/shopping-list-drawer.tsx`
- Modify: `app/planner/workspace/catalog-panel.tsx`
- Modify: `app/planner/workspace/inspector-panel.tsx`
- Modify: `app/planner/plan-2d/use-plan-interactions.ts`
- Test: `tests/planner-workspace.test.tsx`

**Interfaces:**
- Consume the same `PlannerCommand` handlers used by pointer operations.
- Produce keyboard equivalents for move, Shift-move, rotate, resize and delete, plus pointer capture for touch.

- [ ] Add drawer-specific trigger refs and focus traps for Catalog and Inspector surfaces.
- [ ] Add keyboard commands for arrows, Shift-arrows, rotation and resize with deterministic step sizes.
- [ ] Capture and release pointer IDs on touch transform interactions.
- [ ] Test focus boundaries, Escape/backdrop, trigger return, keyboard transform, touch capture and Undo/Redo.

### Task 4: Shared Scene Descriptor and Large-Scene Performance

**Files:**
- Modify: `app/planner/plan-2d/plan-canvas.tsx`
- Modify: `app/planner/scene-3d/*`
- Modify: `app/planner/domain/snapping.ts`
- Create/Modify: shared PlanScene descriptor module used by 2D/SVG/3D.
- Test: SVG DOM/pixel snapshot tests and a 1,000-object benchmark.

**Interfaces:**
- Produce one descriptor containing geometry, transform, material, source, confidence and placeholder state.

- [ ] Route SVG fallback, 2D objects and 3D object metadata through the descriptor.
- [ ] Add source/confidence badges and placeholder styling in all renderers.
- [ ] Replace unbounded candidate scans with a bounded spatial index or sweep structure.
- [ ] Add an interaction-budget benchmark for 1,000 objects and ensure diagonal guides require real geometry.

### Task 5: Production-Origin and Worker Security Gate

**Files:**
- Inspect/Modify: `next.config.*`, header configuration, `serve-local.mjs`, existing image/worker route, `app/planner/scene-3d/*`.

**Interfaces:**
- Consume the actual production bundle and origin inventory; no guessed origins.
- Produce restrictive CSP, worker allowlist, bounded request handling and standard error/`Retry-After` responses.

- [ ] Inventory emitted worker/image/blob origins from the production build.
- [ ] Add tests for allowed and rejected origins, request size, rate limit and retry headers.
- [ ] Tighten CSP incrementally and rerun build, cutover and 3D tests after each change.

### Task 6: Coupled Dependency Upgrade Matrix

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Inspect: `vitest.config.ts`, `next.config.*`, Vite/Vinext configuration.

- [ ] Test patch updates for Next/eslint-config-next, Three/@types/three, Konva, Vitest and testing-library packages in isolated commits.
- [ ] Test Vinext/Vite/Cloudflare/Wrangler together before changing their pinned versions.
- [ ] Keep TypeScript 7 and ESLint 10 out of the release until their compatibility matrix is green.
- [ ] Run `npm audit --json`, typecheck, lint, build, planner, UI, cutover and 3D tests; record advisories and failures.

### Task 7: Final Verification and Fast-Forward Release

**Files:**
- Modify: `docs/OFFENE_UMSETZUNG.md`
- Modify: `docs/audits/2026-11-10-final-optimization.md`

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test:planner`, `npm run test:ui -- --maxWorkers=1`, `npm run test:cutover` and asset checks.
- [ ] Verify remote default branch, PRs, branches, expected parent and final HEAD through the GitHub connector.
- [ ] Push only with an expected-head fast-forward and record exact commit IDs and any external blockers.
