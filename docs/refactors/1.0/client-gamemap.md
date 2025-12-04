# Client GameMap Component Refactor Plan

- Scope: `client/src/components/GameMap.tsx` (pan/zoom controller, visibility calc, render data assembly, SVG layout).
- Problems: Dense component mixing view state, data selectors, memo chains, and SVG rendering. Hard to change rendering or add overlays; pan/zoom/resizing logic entwined with render prep.

## Goals
- Separate view controller (pan/zoom/resize) from render-data selectors and presentational SVG layers.
- Make tile/unit/city overlay derivations reusable and testable without DOM.
- Keep rendering performant with minimal memo churn.
- Sequence changes to keep rendering stable after each step.

## Proposed Approach (low-drift order)
1) **Extract controller hook:** create `useMapController` that only wraps current pan/zoom/resize logic; keep render data inside component. Verify behavior matches before moving data selectors.
2) **Move visibility selector:** add `useMapVisibility` returning visibility maps/renderable keys; swap component to use it while leaving render assembly in place. Add tests.
3) **Render data hook:** create `useRenderData` (tiles/units/cities/overlays) using visibility output; wire component to it without changing layer components. Test selectors.
4) **Layer split:** break SVG layers into small components after data hooks are stable (Tiles, Rivers, CityBounds, Units, Paths). Keep props API identical to avoid ripple changes.
5) **Performance tweaks:** once structure is stable, optimize memo deps and geometry constants; compare render counts in dev.

## Baseline to capture before coding
- Current layer order (terrain, overlays, bounds, units, paths) and styling expectations for fog/shroud/reachability.
- Ref API for centering (`centerOnCoord`, `centerOnPoint`) and how callers use it.
- Existing memoization behavior for visibility and render data to compare render counts after changes.
- Geometry constants (HEX_SIZE, corner offsets) and how they influence bounds drawing; keep snapshots for sanity.

## Risks / Notes
- Keep external API stable (`ref` methods, props) for callers.
- Verify shroud/fog visuals remain unchanged (order of layers, reachability highlighting).
- Land each step separately (controller → visibility → render data → layer split) to limit drift.

## Status
- [x] **Step 1: Extract `useMapController`** (Completed)
  - Move map interaction and viewport logic to `client/src/hooks/useMapController.ts`.
- [x] **Step 2: Extract `useMapVisibility`** (Completed)
  - Move visibility selector to `client/src/hooks/useMapVisibility.ts`.
- [x] **Step 3: Extract `useRenderData`** (Completed)
  - Move render data assembly (tiles, units, cities, overlays) to `client/src/hooks/useRenderData.ts`.
- [x] **Step 4: Layer split** (Completed)
  - Added `GameMapLayers` presentational component; `GameMap.tsx` now delegates SVG layer rendering.
- 🧪 Tests: `npm test -w client -- useMapController.test.tsx useMapVisibility.test.tsx useRenderData.test.tsx useInteractionController.test.tsx`; `npm run lint -w client`.
- Perf tweaks: unit render data is pre-split into on/off-city arrays to avoid per-render filtering; `GameMapLayers` memoized to reduce unnecessary re-renders.
- Remaining: optional perf tuning/render count audits.
