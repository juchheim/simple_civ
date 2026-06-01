# 05 — Interaction & Camera

The 3D board must reproduce the interaction contract of the SVG `GameMap` (see
`01 §4`): click a hex, hover to preview a path, pan/zoom, center on a coord, and feed a
`MapViewport`‑equivalent to the HUD/minimap. This doc specifies the 3D equivalents.

## 1. Camera model

Use an **orbit camera** around the world (drei `OrbitControls`, constrained):

- **Target:** the world center (cylinder axis center / sphere center).
- **Orbit (drag):** rotate around the world — the 3D analog of 2D panning. On a cylinder,
  horizontal drag spins the drum (longitude) and vertical drag tilts within clamped polar
  limits so you can't flip under the world.
- **Zoom (wheel/pinch):** dolly the camera toward/away from the surface, clamped to a
  `minDistance/maxDistance` derived from world radius (the analog of `MIN_ZOOM/MAX_ZOOM`).
- **Tilt clamp:** `minPolarAngle/maxPolarAngle` keep a readable near‑top‑down‑ish view of the
  facing hexes while still feeling 3D.
- **Damping:** enable `enableDamping` for inertia (the analog of the existing pan inertia in
  `pan-zoom-inertia-helpers.ts`).
- **No roll.** Keep up‑vector stable so the board never tumbles.

Initial camera framing mirrors `useMapInteraction`'s initial centering: focus the player's
first unit/city (the same `initialCenter` logic in `GameMap.tsx`) by rotating that hex to the
front‑center and choosing a distance that frames a comfortable neighborhood of tiles.

## 2. Picking (click & hover) via raycasting

Replace `findHexAtScreen` (nearest‑center scan) with GPU‑friendly raycasting:

- Each terrain hex carries its `(q, r)` in `userData` (or, for `InstancedMesh`, the ray hit
  returns an `instanceId` → map back to `coord` via the instance index table).
- On pointer move/up, cast a ray from the camera through the pointer; the first hit on the
  terrain layer yields the `coord`.
- **Hover** → `onHoverTile(coord)` (drives `pathData` + tile highlight), throttled to
  animation frames.
- **Click vs drag** → keep a pixel/time threshold (port `DRAG_THRESHOLD` semantics): a small
  pointer delta with no orbit = click → `onTileClick(coord)`; larger = camera orbit.
- **Performance:** with a single instanced terrain mesh, one raycast tests one mesh. If
  profiling shows cost on Huge maps, add `three-mesh-bvh` (`Bvh` from drei) to accelerate.
  This is far cheaper than the current O(n) per‑event scan.
- **Touch:** pointer events unify mouse/touch; pinch = zoom, one‑finger drag = orbit,
  tap = select (port `useTouchController`/`touch-controller-helpers.ts` thresholds).

## 3. `centerOnCoord` / imperative handle parity

`GameMap` exposes `{ centerOnCoord, centerOnPoint }` and consumes `cityToCenter`. The 3D
component implements the same `GameMapHandle`:

- `centerOnCoord(coord)` → animate the orbit so `projector.positionOf(coord)` rotates to the
  camera’s front‑center (tween longitude/latitude/target), preserving the current zoom.
- `centerOnPoint({x,y})` → the minimap navigates in **flat sheet pixel space**; convert that
  pixel point to the nearest `(q,r)` (reuse `hexToPixel` inverse / nearest‑center) then
  `centerOnCoord`. This keeps the existing minimap → `onNavigateMap` flow working unchanged.

## 4. The `MapViewport` analog & the minimap

The SVG board emits `MapViewport { pan, zoom, size, worldBounds, center }` and the
**MiniMap** (`client/src/components/HUD/MiniMap.tsx`) uses `worldBounds`/`center` to draw a
viewport rectangle and to navigate.

3D has no flat pan/zoom rectangle, so:

- The 3D board emits a viewport object with the **same shape** but computed from the camera:
  - `center` = the flat‑sheet pixel position of the hex currently at screen center (ray from
    camera center → hit coord → `hexToPixel`).
  - `worldBounds` = an approximate flat‑space box covering the hexes currently visible on the
    facing side (bounding box of on‑screen hit‑tested tiles, sampled sparsely).
  - `pan`/`zoom`/`size` are filled with best‑effort equivalents (size from canvas; zoom from
    camera distance mapped into `[MIN_ZOOM, MAX_ZOOM]`).
- The MiniMap stays a 2D SVG of the **flat layout** (it already uses `hexToPixel` and revealed
  tiles — projection‑independent, so it needs **no change**). In 3D mode it shows a **focus
  marker / soft highlight** of the centered region instead of a crisp 1:1 rectangle. A tiny
  conditional in `MiniMap.tsx` (`mode === "3d"`) renders a focus dot+radius rather than the
  exact `viewportRect`.

This means the **HUD does not need to know about Three.js**; it keeps consuming a
`MapViewport`. Only the rectangle’s interpretation softens in 3D.

## 5. Keyboard & accessibility

- Preserve existing global hotkeys (`useGlobalHotkeys.ts`) — they act on selection/turn
  logic, not the renderer, so they work in both modes.
- Add arrow/WASD to orbit and `+/-` to zoom in 3D (optional parity nicety).
- **Reduced motion:** respect `prefers-reduced-motion` → disable camera/movement tweens and
  water animation; snap instead of animate.
- **Fallback affordance:** if a user struggles in 3D, Preferences offers one‑click switch to
  2D (and we auto‑switch on WebGL failure — `06`).

## 6. Event wiring summary

| Concern | 2D (today) | 3D (new) |
|---|---|---|
| Hover tile | `findHexAtScreen` on mousemove | raycast on pointermove → coord |
| Click tile | click vs drag threshold → `onTileClick` | raycast + click/orbit threshold → `onTileClick` |
| Pan | drag updates `pan` | orbit rotates camera |
| Zoom | wheel → `zoom` about cursor | wheel/pinch → dolly distance |
| Center on coord | set `pan` from `hexToPixel` | tween orbit to coord’s surface position |
| Minimap navigate | `centerOnPoint(worldPt)` | pixel→coord→`centerOnCoord` |
| Viewport out | real `MapViewport` | camera‑derived `MapViewport` (approx) |

All of these are encapsulated in a `useMap3DController` hook that mirrors the surface of
`useMapController`, so `GameMap3D` and `GameMap` are drop‑in interchangeable behind the
`BoardRenderer` (see `06`).
