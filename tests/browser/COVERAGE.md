# Browser coverage

Run `npm run test:browser` for the interaction suite, `npm run visual:models`
for every model in four views, or `npm run visual:check` for both. The first
run requires `npx playwright install chromium` (`--with-deps` on Linux CI).
Each command builds the app and starts its own production server on
`127.0.0.1:3100`; an occupied port fails instead of testing a different app.
`VISUAL_SKIP_BUILD=1` is only for a build already verified from this worktree.

For a focused model review:

```sh
npm run visual:models -- --model chair-kaleo-chenille-beige
npm run visual:models -- --model chair-kaleo-chenille-beige --view front
npm run visual:models -- --live --model chair-kaleo-chenille-beige --view front
```

Views are `front`, `side`, `back`, and `perspective`. Model IDs come from
the gallery's **Modell** selector; an unknown model or view fails.
`npm run dev:review` starts the immediate local preview with gallery and live updates.

## Automated interaction checks

| Flow | Evidence / assertion |
| --- | --- |
| Move one existing chair | Existing object selector + numeric inspector; chair X changes by 10 cm; every other placement, including the table and three chairs, remains identical |
| Undo / redo | Inspector returns to 220 cm, then 230 cm |
| Save / reload | Wait for actual persisted value, reload, select same chair, verify position and untouched peers |
| Table comparison | Select another table, choose its extension, apply; persisted catalog ID and dimensions match |
| Chair comparison | Apply a different model to all four seats; table stays identical |
| Material | Add a catalog chair through UI, select a material, verify save and reload |
| 2D / 3D | Switch to 3D, wait for renderer readiness, inspect screenshot pixels for nonblank geometry, return to 2D |
| Desktop panels | Open and close details, shopping list, export dialog |
| Mobile, 390 × 844 | Open inspector and catalog; controls visible; no horizontal document overflow |
| Model gallery | Every selectable catalog/built-in model, four views, exact current render key and nonblank screenshot pixels |

Every test has an isolated browser context and storage. Tests use normal UI
controls for changes; persisted planner JSON is read only for assertions.
They do not import a user's browser profile, seed localStorage, or mutate
the application store from the browser console. Uncaught application errors,
local console errors, failed local requests, and lost/failed WebGL contexts fail the run.
External product-image host failures are not local application errors.

## Screenshots and reports

`artifacts/visual/latest/` is replaced at the beginning of each run. It contains
meaningfully named screenshots under `gui/` and/or `models/`, a browsable
`report/index.html`, machine-readable `report/results.json`, and failure
screenshots/traces under `test-results/`. Reports record commit, branch,
dirty status, timestamps, statuses, durations, and screenshot links. A dirty
run is explicitly marked and must not be represented as a clean commit result.
CI uploads this directory with a commit-specific artifact name.

Screenshots are review evidence, not automatically accepted pixel baselines.
The suite has no baseline update command and never approves its own images.
The gallery's reference-photo quality review still requires human inspection.

## Deliberate gaps

This is a targeted regression suite, not a claim of complete GUI coverage.
It does not cover freehand dragging/resizing, touch gestures, keyboard-only
navigation, screen reader/contrast audits, all room/camera combinations,
walkthrough collision behavior, every material or size variant, import/export
round trips, download content, print layout, GLB upload validation, network
outages, multi-tab persistence conflicts, other browsers, or exact similarity
to private reference photographs. Existing domain and component tests cover
separate logic; this browser suite does not replace those checks.

The headless Chromium renderer uses software WebGL for repeatability and
does not substitute for performance testing on the user's GPU. Missing WebGL
is a failure, never a skipped 3D check. Screenshots on different operating
systems can differ because of font and rasterization differences.

## Zusätzliche Cloud-Szenarien und Modelllücken

- Jeder der acht Räume erhält eine echte 2D- und 3D-Aufnahme mit sichtbarer WebGL-Szenenpixelprüfung.
- Der isolierte JSON-Sicherungsexport wird wieder importiert und auf dieselben Platzierungen geprüft.
- Die Modellgalerie nimmt **jede auswählbare Größenvariante** aus vier standardisierten Perspektiven auf.
- `report/manifest.json` katalogisiert die 137 Modellmanifeste, Bildreferenzen, Git-Commit und alle nicht individuell gemappten Modelle.
- `report/webgl-probe.json` bestätigt mit tatsächlichen gelesenen Pixeln WebGL2 im Cloud-Browser.
- Materialkombinationen, komplette freie Mausbewegungen und visuelle Produkttreue bleiben weiter getrennt zu kontrollieren.
