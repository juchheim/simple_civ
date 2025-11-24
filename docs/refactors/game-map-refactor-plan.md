# GameMap Component Refactor Plan

## Background
`client/src/components/GameMap.tsx` is currently ~770 lines of intertwined rendering, interaction, and stateful logic. It handles:
- Hex geometry helpers (color, textures, SVG points).
- Map panning/zooming and drag detection.
- Tile rendering with fog/shroud/reachable overlays.
- River polyline rendering and sprite layering.
- Unit/city rendering and interaction hit-targets.
- Event wiring for clicks, wheel zoom, and viewport transforms.

The size and responsibility spread make targeted updates (e.g., adding overlays or unit sprites) risky and hard to review.

## Goals
1. Split the GameMap into composable, testable modules (render-only subcomponents + hooks for interaction).
2. Keep public props the same so `App.tsx` stays untouched.
3. Maintain current rendering behavior (no visual regressions).
4. Prepare for future features (e.g., highlighting, animations) by isolating panning/zooming logic.

## Constraints & Guidelines
- No behavior changes; only reorganize code.
- Keep `GameMap` as a thin orchestrator that wires data + callbacks to subcomponents.
- SVG render order must remain: tiles → overlays → rivers → units → UI hints.
- Prefer colocating new files under `client/src/components/GameMap/` to avoid clutter.
- Hooks/components should accept explicit props (no direct imports from `App.tsx` state).

## Proposed Phases

### Phase 0 – Inventory & Safeguards
1. Capture a manual checklist (seed `41839`, toggle shroud on/off, drag, scroll zoom, select units/tiles).
2. Document existing helper functions (color, textures, geometry) inside this plan for quick reference.
3. (Optional) Add a lightweight Storybook-style fixture or screenshot comparison script for regression detection.

_Exit criteria_: Clear manual verification steps + helper inventory noted here.

#### Manual Checklist (seed 41839)
- Launch the client, start a new game, and set the RNG seed to `41839`.
- Toggle fog shroud on and off via the HUD button; confirm shroud tiles swap between blank and question-mark overlays.
- Drag/pan the map in multiple directions to ensure inertia and drag threshold feel unchanged.
- Scroll zoom in/out while hovering the map; verify zoom centers around the cursor and min/max clamps hold.
- Click several visible tiles (including one with a unit) to confirm selection highlights move as expected.
- Select an army, issue a move so reachable overlays appear, then re-select linked units to confirm rings render.

#### Helper Inventory Snapshot (pre-refactor)
- `getTerrainColor(type: TerrainType)`: returns solid fill colors per terrain; used for fogged/shroud tiles when textures are hidden.
- `getTerrainImage(type: TerrainType)`: maps terrain names to `terrainImages` sprite URLs for SVG patterns.
- `getHexPoints()`: precomputes the SVG polygon string for a pointy-top hex with radius `HEX_SIZE`.
- `getHexCornerOffsets()`: produces the six corner offset vectors used by river overlays and shared-edge math.
- `squaredDistance(a, b)`: helper for comparing corner points when stitching river polylines.
- `hexToPixel(hex: HexCoord)`: converts axial coordinates to pixel space; reused by tile/unit positioning.
- `screenToWorld(x, y)`: converts mouse positions into world space for hit-testing during interaction.
- `findHexAtScreen(x, y)`: brute-force hit-test that selects the closest hex center within `HEX_SIZE`.

### Phase 1 – Extract Pure Helpers
1. Move `getTerrainColor`, `getTerrainImage`, `getHexPoints`, `getHexCornerOffsets`, and geometry math into `client/src/components/GameMap/geometry.ts`.
2. Export them for reuse; keep `GameMap.tsx` importing from the new module.
3. Add unit tests for helpers if feasible (Vitest in `client` workspace once test runner is wired).

_Exit criteria_: `GameMap.tsx` no longer defines static helper functions inline.

_Status 2025-11-24_: `geometry.ts` hosts the color/image helpers, hex point/corner calculators, `hexToPixel`, and `squaredDistance`. `GameMap.tsx` now imports these exports; tests remain TODO pending a client-side runner.

### Phase 2 – Tile & Overlay Subcomponents
1. Create `HexTile.tsx` to encapsulate tile polygon rendering (fog/shroud/reachable indicators).
2. Create `OverlayLayer.tsx` for river/fog/selection overlays that depend on pre-computed props.
3. Ensure props are serializable so they can be memoized.

_Exit criteria_: `GameMap.tsx` delegates tile rendering to `HexTile` and overlay logic to `OverlayLayer`.

_Status 2025-11-24_: `HexTile.tsx` now renders the base polygon/fog layers and `OverlayLayer.tsx` handles city highlights + river sprites from memoized descriptor props. `GameMap.tsx` only maps tile data → props arrays.

### Phase 3 – Units & Cities Layer
1. Extract a `UnitLayer.tsx` that renders unit sprites, linked indicators, and selection highlights.
2. Extract a `CityLayer.tsx` for city sprites and ownership markers.
3. Centralize sprite size/offset constants in `GameMap/constants.ts`.

_Exit criteria_: Unit and city rendering logic live outside `GameMap.tsx`; the main component only maps props → layer props.

_Status 2025-11-24_: `UnitLayer.tsx` now owns the sprite rendering (with `UNIT_IMAGE_SIZE` + link icons), `CityLayer.tsx` renders city rings/text using `CITY_*` constants, and `GameMap/constants.ts` hosts `HEX_SIZE`, zoom bounds, drag threshold, and sprite sizing for reuse.

### Phase 4 – Interaction Hooks
1. Introduce `useMapInteraction.ts` for panning/zooming/drag state.
2. Introduce `useRiverPolylines.ts` (or reuse existing util) to memoize polylines separate from render logic.
3. Keep event handlers (wheel, pointer down/up/move) inside the hook; expose callbacks/refs to `GameMap`.

_Exit criteria_: `GameMap.tsx` becomes a declarative composition of hooks + layers (<~200 lines).

_Status 2025-11-24_: `useMapInteraction.ts` owns pan/zoom initialization, wheel handling, and click dispatch; `useRiverPolylines.ts` wraps the river logging + legacy fallback. `GameMap.tsx` now consumes hook outputs (pan/zoom, handlers, segments) and just wires them into layers.

## Testing & Verification
- After each phase, run `npm run build -w client` and manually test the checklist from Phase 0.
- Capture before/after screenshots for the reference seed to confirm rendering parity.

## Outstanding Questions
- Should we introduce automated visual tests (e.g., Playwright screenshots) before large UI changes?
- Do we need memoization for large maps (Standard/Large) once layers are split?

## References
- Current component: `client/src/components/GameMap.tsx`
- River helpers: `client/src/utils/rivers.ts` (still used for polylines)
- Assets: `client/src/assets.ts`

