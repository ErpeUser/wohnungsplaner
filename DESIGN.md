---
version: alpha
colors:
  ink: "#203034"
  muted: "#667171"
  paper: "#f2efe8"
  panel: "#fffdf9"
  line: "#d8d6cf"
  accent: "#274c52"
  chrome: "#172629"
  canvas: "#ebe8df"
  measure: "#94502f"
  danger: "#a83f38"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    lineHeight: "1.45"
  mono:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "12px"
    lineHeight: "1.35"
rounded:
  control: "5px"
  panel: "8px"
  pill: "999px"
spacing:
  unit: "4px"
  touch: "44px"
components:
  plannerShell:
    surface: "panel"
    border: "line"
    radius: "panel"
  threeViewport:
    surface: "canvas"
    chrome: "chrome"
    radius: "panel"
  primaryControl:
    surface: "accent"
    focus: "#f2c8aa"
    radius: "control"
---

## Overview

Wohnungsplaner is a practical room-planning tool for people comparing furniture and
decor in a real apartment. Its visual reference is a quiet material board: warm
paper, walnut and moss accents, dark architectural chrome, and a measured drawing
surface. The product register is task-focused and precise; the material palette
provides the character.

The memorable signature is the dark teal 3D viewport with warm wood and moss
surfaces. The catalog and editing chrome stay restrained so the room remains the
visual focus. The interface must never resemble a generic neon dashboard or a
decorative marketing landing page.

## Colors

`paper` is the document background, `panel` is the readable workspace surface,
and `line` separates adjacent controls without heavy cards. `ink` and `muted`
carry text hierarchy. `accent` is reserved for actionable controls and links.
`chrome` frames the 3D tools; `canvas` is the neutral modelling ground and
`measure` is reserved for dimensional evidence. `danger` is used only for
destructive or failed states.

## Typography

Inter (with system fallbacks) is used for German UI copy and controls. The mono
stack is limited to measurements, asset labels, and compact technical metadata.
Use sentence case, short verbs, and a readable line length. Do not use tracked
all-caps labels as decoration.

## Layout

The desktop workspace is a two-sided editing frame: catalog and controls remain
available beside a generous plan/3D surface. On small screens the surface becomes
the primary task, while controls move into stacked or scrollable regions. Reserve
safe-area space for touch controls and keep primary actions at least 44px high.

The 3D surface owns its own interaction layer. Fullscreen is user-triggered and
keeps the view label, exit action, camera help, and return-to-2D path reachable.

## Elevation & Depth

Use borders and tonal separation before shadows. Shadows are reserved for physical
3D objects and floating controls over the viewport. A translucent dark teal
toolbar with a soft blur is the only elevated chrome in the 3D view.

## Shapes

Controls use a 5px radius, workspace panels use 8px, and status chips may use a
pill. Avoid applying one radius to every surface. Focus rings use a visible warm
peach outline and never rely on color changes alone.

## Components

Catalog cards expose the product name, category, dimensions, add action, and an
optional source link. Source links are secondary and never replace the add action.
The 3D toolbar is a semantic toolbar with an explicit fullscreen button and
`aria-pressed` state. Loading, context-loss, and unavailable-WebGL states keep
the same footprint and offer a clear recovery path.

## Do's and Don'ts

- Do keep real room geometry and source evidence visually dominant.
- Do show estimated product dimensions as estimates and retain source links.
- Do preserve keyboard focus, visible focus rings, reduced-motion behavior, and
  touch targets on every viewport.
- Don't use a gradient wash, neon accent, or decorative animation without a
  material or interaction reason.
- Don't hide the catalog source or turn a proxy into a claim of a verified 3D
  product model.
