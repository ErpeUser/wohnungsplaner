# Interior refinement - DRAFT, NOT READY TO MERGE

Base: 534070af52a777c503352d8ebc98289c5ae21dbb. The concurrent living-room rug change to 250 x 180 cm is retained. No main-branch ref update, force push, reset or rebase is part of this draft.

## Implemented proposal
- Four original bathroom hooks in one horizontal row, 20-cm centre spacing. Individual 12-cm discs and mounting height are explicitly visual assumptions.
- Bath mat 122 x 61 x 1 cm moved 19 cm toward basin; WC mat 77 x 46 x 1 cm turned lengthwise; existing paper holder moved to opposite wall.
- Original generated cotton mesh with actual millimetre relief and separate sRGB colour/linear microheight channels; no advertising image used as texture.
- Kitchen cabinet chains, upper cabinets, corner sink cabinet and backsplash based on BD19929-2.PDF pages 1-4. Actual worktop cutout and hollow sink/base geometry. Refrigerator, oven, hob, microwave and hood IDs retained.
- Old combined hallway decoration replaced by separate print/three-plate and print/25-cm-planter compositions. Original plant/ceramic geometry and generated artwork.
- Shared effective document used by the existing workspace, with a pre-upgrade local backup. Existing user placements/assets/door state remain intact in the refinement function.
- Existing renderers preserved unchanged as *-base.tsx, with narrow adapters for new models.

## Source limits
The supplier plan gives 2425/2562-mm kitchen runs, 120-mm plinth, 750-mm carcass, 40-mm worktop, 560-mm backsplash and upper cabinets at 1470-2220 mm. It does not dimension the floor-tile pattern. The 320-mm tile pitch remains a prior project reference/visual assumption, not a measured supplier dimension. The room model and supplier north-run clear width differ by about 45 mm; this draft does not certify installation fit.

## Verification actually performed
An isolated, dependency-free test fixture ran 16 tests with 0 failures during this session, including a demonstrated red/green tile-pitch regression. That is NOT the complete application suite. Syntax transpilation of the earlier local patch found no syntax errors, but it is NOT TypeScript typechecking.
The final integration test committed here imports the real apartment/schema and has NOT been executed. Neither the final adapters nor their browser behaviour are certified by the isolated tests.
Shell DNS/network failure prevented cloning/npm access. No full npm ci, codex preflight, typecheck, lint, full tests, production build or real application screenshot could be completed. No independent agent/reviewer was available; review was by the author.

## Merge blockers / next verification
1. Obtain authenticated checkout; run codex:pipeline check before further changes. Preserve dirty worktree.
2. npm ci; npm run typecheck; npm run lint; npm run assets:check; npm run test:planner; npm run test:ui -- --maxWorkers=1; npm run build; npm run test:cutover.
3. Add/exercise repository hydration, import, backup/quota-failure and save/reload integration tests against the adapters. Confirm no user-moved furniture is reset.
4. Verify actual WebGL render, room cutaways and object bounds. Check mounting against wall faces, kitchen module joins and sink cutout. Compare all four rooms to user reference images.
5. Finish the legacy 2D kitchen floor-detail grid so its pitch matches the new 3D grid without painting over cabinets. This draft leaves the base 2D floor-detail implementation in place deliberately.
6. Update old shopping-list/decor copy (including obsolete 2 x 2 hook wording) to match the final approved arrangement, without inventing prices or product IDs.
7. Review memory/performance for the physical rug meshes and dispose/recreate behaviour under React StrictMode.
8. Only after green full checks and visual acceptance may this be merged to main.

The later five living/dining concepts are analysis only. They are not automatic changes to the user's furniture or shopping list.
