# Spatial Index and Renderer Asset Transforms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make placement collision checks scale through a spatial index and apply asset meterScale, pivot, and floorOffset consistently to real and placeholder 3D furniture.

**Architecture:** Keep the existing collision report contract and geometry predicates, but use a cached uniform-grid broad phase before exact polygon checks. Carry normalized asset transform metadata in the scene descriptor and apply the same transform wrapper to GLB and parametric render paths.

**Tech Stack:** TypeScript, React Three Fiber, Three.js, Node test runner, Vitest.

**Spec:** User request in the active task.

## Global Constraints

- Do not overwrite local changes, reset, force-push, or invent external Storage/Vision/product APIs.
- Asset hashes change only with a verified intentional binary update.
- After every change run typecheck, lint, focused tests, and build.

## Review Focus

- 1000+ placements must produce the same collision report as the linear implementation.
- Objects exactly on a spatial-cell boundary must not be missed.
- Ignored and floor-covering placements must preserve current semantics.
- Imported GLB and parametric fallback must share meterScale, pivot, and floorOffset behavior.
- Missing or malformed asset metadata must fall back deterministically without throwing.

### Task 1: Collision Spatial Index

**Files:**
- Modify: `app/planner/domain/collisions.ts`
- Test: `tests/planner-geometry.test.ts`

Implement an exported `inspectPlacementLinear` reference and route `inspectPlacement` through a cached uniform-grid index. Add a 1000+ placement equivalence test and boundary/ignore behavior tests.

### Task 2: Renderer Asset Transforms

**Files:**
- Modify: `app/planner/scene-3d/scene-model.ts`
- Modify: `app/planner/scene-3d/furniture.tsx`
- Test: `tests/planner-3d.test.tsx`

Expose normalized transform data on scene objects, scale imported models by `meterScale`, apply `pivot` and `floorOffset` at the shared furniture group, and keep placeholders aligned with the same world-space footprint. Cover real-model and placeholder paths.

### Task 3: Verification and Delivery

Run all required checks, verify the sofa manifest, inspect the final diff, commit on `main`, push `origin/main`, and compare local and remote SHAs.
