# Interior refinement - reviewed changes, full application verification still required

Base main: 534070af52a777c503352d8ebc98289c5ae21dbb.
Review branch: codex/interior-refinement-review-20261111.
The concurrent living-room rug change to 250 x 180 cm is retained. No reset, rebase or force push is required. Do not represent this branch as deployed or merged into main.

## Implemented room changes retained from the initial draft
- Four original bathroom hooks in one horizontal row, 20-cm centre spacing. Individual 12-cm discs and mounting height remain visual assumptions, not confirmed seller dimensions.
- Bathroom mat 122 x 61 x 1 cm moved 19 cm toward the basin; WC mat 77 x 46 x 1 cm turned lengthwise. The existing paper holder is moved to the opposite WC wall.
- Original cotton mesh with physical millimetre relief, a constant physical weave pitch, separate sRGB colour and linear microheight channels. No advertising image is used on these new mats.
- Kitchen cabinet chains, upper/corner cabinets, recessed sink, worktop cutout and backsplash based on BD19929-2.PDF pages 1-4. Fridge, oven, hob, microwave and hood identities are retained; unrelated furniture is not removed.
- Retired combined hallway decoration replaced by separate 36 x 50 cm print / three-plate composition and 32 x 45 cm print / 25-cm wall planter composition.
- Existing renderer modules are preserved as *-base.tsx. Narrow adapters render the targeted objects.

## Follow-up corrections
1. Interior floors now use the inverse physical atlas size with ShapeGeometry's metre UVs. The old implementation multiplied by room width/depth a second time. Balcony source floors remain in the base renderer because its balcony architecture also depends on those records.
2. The 2D kitchen L-shaped tile patches use the same clipped world-coordinate cells and 2-mm joints as the 3D grid. The floor layer is drawn before cabinets/appliances, not over them.
3. A failed pre-upgrade backup (quota/access error) now returns the existing valid user document with a warning. It does not throw out of hydration and leave the default plan visible. Existing backups are not overwritten; unrelated placements, assets and door states remain intact in the tested loading helper.
4. Shopping data is separated from the unchanged drawer rendering. All 35 existing item identities, 19 product URLs and priced subtotal are retained. Hook wording now says one horizontal row; the sink location says corner sink cabinet rather than below the microwave. Four unpriced generic hall entries record the requested picture, plate and planter sizes. No new seller prices or URLs were invented.
5. Placement containment now checks the physical interior wall face (half the stored wall thickness), while door/window/passage openings remain passable only on their own boundary wall. A regression covers both wall penetration and the adjacent-wall opening exemption.
6. All 17 photo-first catalog ids now carry explicit source, dimensions and construction metadata. The three previously undocumented ids (photo-referenced sectional sofa and the two Easy-Line/shaggy rug variants) remain estimated and continue to use local parametric geometry.

## Source limits
Supplier dimensions: 2425/2562-mm kitchen runs, 120-mm plinth, 750-mm carcass, 40-mm worktop, 560-mm backsplash and upper cabinets at 1470-2220 mm. The supplier document does NOT dimension the floor tile pitch. The 320-mm grid remains an existing project reference / design assumption. The room model's clear north width and supplier run differ by about 45 mm; installation fit is not certified. Do not stretch the fridge or remove appliances to hide that discrepancy.

## Fresh verification performed in the follow-up session
The following four files were executed against a materialized source subset using Node v22.16.0:
- tests/planner-interior-upgrade.test.ts: 7 tests.
- tests/planner-interior-floor-scale.test.ts: 6 tests.
- tests/planner-interior-mesh-invariants.test.ts: 12 tests.
- tests/planner-interior-shopping.test.ts: 7 tests.
Result: 32 passed, 0 failed. Backup/quota regressions and floor-scale/layer regressions were observed failing before the fixes. An empty shopping fixture failed before the real retained item data was installed.

Command: node --experimental-strip-types --test tests/planner-interior-*.test.ts (only those four files existed in the isolated test directory).
Strict TypeScript no-emit checking passed for these tests and their dependency-free production modules using ES2022 / NodeNext. Syntax transpilation passed for nine materialized source files. Syntax checking is NOT full React/Three typechecking.
The original draft's tests/planner-interior-refinement.test.ts, which imports the real apartment/schema, was NOT included in the above count and remains unexecuted here.

## Remaining merge blockers
- This environment cannot resolve github.com or registry.npmjs.org from the shell. The authorized GitHub connector is available, but a real authenticated checkout and npm dependency installation were not possible. The source subset is NOT a full checkout and has no local commit matching the remote SHA.
- Full npm ci, codex preflight, application typecheck, lint, assets:check, full planner/UI tests, production build and cutover checks are NOT verified in this session.
- No real application WebGL render, browser screenshot, StrictMode lifecycle test or end-to-end save/import/reload test has been completed for this branch.
- No independent reviewer/subagent was available. The review was an author self-review plus the tests listed above.
- Existing binary assets and manifest values were not modified. No new claim is made about their integrity beyond that unchanged scope.

## Required local completion sequence
Preserve dirty worktrees and browser save data. Fetch this review branch into an isolated checkout, run codex:pipeline check, npm ci, typecheck, lint, assets:check, test:planner, test:ui -- --maxWorkers=1, build and test:cutover. Diagnose failures rather than bypassing them.
Open Bad, WC, Vorraum and Wohnkueche in both 2D and 3D. Check corner fronts, worktop cutout, refrigerator access, consistent floor pitch, hook direction, mat position, opposite-wall paper holder and both hall compositions. Load an existing saved plan and verify its user-moved furniture, assets and door states are retained.
Only after the full checks pass and the actual application views are verified should this PR be merged into main and the local production server rebuilt/restarted.

The requested five dining/living alternatives remain analysis-only and are not applied to the user's table, chairs or living-room rug by this branch.
