# Wohnungsplaner UX contract

This contract records the user-visible behavior that must remain consistent with
the visual system in [DESIGN.md](./DESIGN.md).

## Scope and locale

- Product locale is German (`de-AT`); use plain German labels and sentence case.
- The workspace supports desktop pointer/keyboard input and mobile touch input.
- The 3D view is an enhancement. If WebGL is unavailable or loses its context,
  preserve the document and provide a clear return to 2D.

## Core workflows

| Operation | Trigger | Success state | Recovery |
| --- | --- | --- | --- |
| Add catalog item | `Hinzufügen` on a catalog item | Placement is selected and visible in the active room | Keep the catalog open and explain a collision or invalid room |
| Edit placement | Select and move/resize/rotate | Changes are reflected in 2D and 3D and autosaved | Keep the last valid geometry and show the validation message |
| Save/reload | Workspace persistence | The latest valid document is restored | Keep the in-memory document when storage fails |
| Switch 2D/3D | View toggle | Same room, selection, and document state | Keep controls available and offer `Zu 2D` when 3D fails |
| Walkthrough | `Begehung` camera mode and touch drag | Camera moves inside the selected room with collision limits | Release pointer capture on `pointerup`/`pointercancel` |
| Fullscreen | User-triggered `Vollbild` button | 3D host occupies the viewport and button changes to `Vollbild schließen` | Ignore rejected requests and leave the normal view usable |

## 3D interaction

- Orbit uses a single pointer drag; touch gestures declare their ownership with
  `touch-action` and do not scroll the page while manipulating the canvas.
- Walkthrough keeps the camera inside the selected room and exposes keyboard
  movement as a non-touch alternative.
- Fullscreen is never entered automatically. It uses the browser fullscreen API
  from a direct user action and tracks `fullscreenchange` so Escape and browser
  controls update the button state.
- The 3D quality tier caps device-pixel ratio and uses lower-cost settings on
  constrained devices. A context-loss message explains that the document is safe.

## Catalog and evidence

- Products from `Desktop/Deko` remain catalog records even when the public starter
  scene omits the Zimmer-1 verification room.
- The 42 Deko records use deterministic parametric proxies because the supplied
  folders contain product images and metadata, not licensed GLB/GLTF files.
- Estimated dimensions and source links are visible in the catalog metadata; a
  proxy is never described as a measured or manufacturer-verified 3D model.

## Accessibility and responsive behavior

- Interactive controls use native buttons/links with visible focus states and
  accessible names.
- Touch targets are at least 44px where space permits, including fullscreen.
- Reduced-motion preferences disable non-essential motion.
- The 3D toolbar remains reachable in fullscreen; mobile hides only its redundant
  label, not its action or status.
