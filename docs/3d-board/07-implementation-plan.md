# 07 — Implementation Plan (phased)

Incremental, shippable phases. Each phase is independently reviewable, keeps the app green
(`npm run build`, `npm test`), and leaves 2D fully working. The engine is never touched.

## Phase 0 — Foundations & the seam (no visible 3D yet)

**Goal:** dependencies in, preference plumbed, `BoardRenderer` in place, 2D unchanged.

- [ ] Add deps to `client`: `three`, `@react-three/fiber`, `@react-three/drei`,
      `-D @types/three` (`03`).
- [ ] `useBoardModePreference.ts` + `GameMap3D/capability.ts` (`detect3DCapability`).
- [ ] Plumb `boardMode/effectiveMode/supports3D/setBoardMode` through
      `useAppUiFlow → useAppCoreState → useAppPresenterModel → InGameContent → HUD → GameMenu`
      (`06 §2`).
- [ ] Add the **Board** radio group to `GameMenu` Preferences (`06 §3`).
- [ ] `BoardRenderer.tsx` with lazy `GameMap3D` + error boundary + suspense; swap the single
      `<GameMap>` in `InGameContent.tsx` for `<BoardRenderer boardMode={…}>`.
- [ ] Stub `GameMap3D.tsx`: a minimal `<Canvas>` that renders an empty scene (or a placeholder
      sphere) and implements the `GameMapHandle` no‑ops, so the seam compiles & toggles.

**Acceptance:** toggling 2D⇄3D in Preferences swaps to a (placeholder) canvas and back, with
no errors; default is 3D; tests/build green; 2D path bundle unchanged.

## Phase 1 — Static 3D terrain on the cylinder

**Goal:** the real world surface with terrain relief, reusing 2D render data.

- [ ] `projection.ts`: `chooseWorldSurface` (with unit tests vs the `02` table), `createProjector`
      (cylinder first), `hexToWorld3D`, normals/orientation, corner projection.
- [ ] `elevation.ts`: per‑terrain relief table.
- [ ] `textures.ts`: load `/terrain/*.png` (start individual; atlas in Phase 4).
- [ ] `TerrainInstances.tsx`: one `InstancedMesh` per terrain type (or atlas), placed via the
      projector from `tileRenderData` (consume the **same** `useRenderData`/`useMapVisibility`).
- [ ] `surface.ts` + `lighting.tsx` + skybox: water shell, ocean rim/caps, sun + ambient.
- [ ] Camera: basic constrained `OrbitControls`; initial framing on player start
      (`initialCenter` parity).

**Acceptance:** loading any save renders all visible terrain in correct positions with relief;
hexes are undistorted (cylinder); rotate/zoom works; Huge map loads without jank on a typical
laptop GPU.

## Phase 2 — Entities, overlays, borders, rivers, fog

**Goal:** full world content parity (still view‑only interactions optional).

- [ ] `CityTokens.tsx`: city hex tokens + `<Html>` labels (occluded by planet) from
      `cityOverlayData`; pop‑bucket textures `city_1..10`.
- [ ] `UnitTokens.tsx`: unit hex tokens (instanced per type), civ‑color sides, on/off‑city
      split; adornments for selected/movable/linked/status/HP/exhausted (`04 §2`).
- [ ] `RiverRibbons.tsx` + `BorderTubes.tsx`: from river edges + `cityBounds`.
- [ ] `FogLayer.tsx`: visible/fogged/shroud materials driven by `useMapVisibility` + `showShroud`.
- [ ] `OverlayDecals.tsx`: resource/goodie/camp/Bulwark overlays (mini‑atlas for the 3 glyphs).

**Acceptance:** a complex mid/late‑game save shows the same cities/units/borders/rivers/fog as
2D; era modal still fires (it's in `GameMap.tsx` today — replicate the effect in `GameMap3D`
or hoist it above `BoardRenderer`).

## Phase 3 — Interaction parity

**Goal:** the 3D board is fully playable and matches 2D outcomes.

- [ ] `useMap3DController.ts`: raycast picking (instanceId→coord), hover→`onHoverTile`,
      click/orbit threshold→`onTileClick`, damped orbit, dolly zoom, tilt clamps.
- [ ] Implement `GameMapHandle`: `centerOnCoord` (tween orbit), `centerOnPoint`
      (pixel→coord→center) so the minimap's `onNavigateMap` works.
- [ ] Emit camera‑derived `MapViewport`; `MiniMap.tsx` focus‑marker variant for 3D (`05 §4`).
- [ ] Path preview ribbon from `pathData`; selection/reachable rings.
- [ ] Touch/pointer parity (pinch‑zoom, tap‑select); reduced‑motion handling.
- [ ] Optional: unit move tween along path.

**Acceptance:** the parity checklist (`§ Parity checklist` below) passes in 3D; a full short
game can be played end‑to‑end in 3D; behavior matches 2D for the same inputs.

## Phase 4 — Performance & polish

**Goal:** hit the budget and look good.

- [ ] Texture **atlas** + mipmaps for terrain and units (`08`); collapse draw calls.
- [ ] `frameloop="demand"`; render only on state/camera change.
- [ ] Optional `three-mesh-bvh` if raycast profiling needs it.
- [ ] Chunked instancing / back‑face culling for the far side of the planet.
- [ ] Water shader, atmosphere rim, subtle ambient motion; low‑power toggle.
- [ ] Memory: dispose textures/geometries on unmount & map change; verify no GPU leak across
      load/restart.

**Acceptance:** Huge map meets the perf budget below; no memory growth across repeated
load→play→quit cycles; lighthouse/profiler within targets.

## Phase 5 — Experimental sphere "planet" view (optional)

**Goal:** offer the sphere where it’s viable; keep cylinder default.

- [ ] Sphere branch in `createProjector`; `chooseWorldSurface` already gates it (declined for
      current maps). Add a hidden/dev preference to force‑preview the sphere with documented
      distortion.
- [ ] Pole/seam handling (ocean), latitude‑band clamp.

**Acceptance:** forcing sphere on a synthetic 2:1 wrapping map looks correct; on current maps
the calculator still selects cylinder.

## Perf budget (target hardware: typical integrated/laptop GPU)

| Metric | Budget |
|---|---|
| Draw calls (Huge, idle) | ≤ ~20 |
| Frame time during orbit (Huge) | ≤ 16 ms (60 fps) |
| Idle frame cost (demand loop) | ≈ 0 (no redraw) |
| 3D chunk size (gzipped) | code‑split; loaded only in 3D mode |
| GPU memory (textures, Huge) | ≤ ~128 MB (atlas + mipmaps) |
| Initial 3D scene build (Huge) | ≤ ~500 ms after chunk load |

## Parity checklist (release gate)

- [ ] Terrain, relief, water render for all visible tiles; positions match `(q,r)`.
- [ ] Units (incl. garrison stacking), cities (incl. pop bucket art & labels), borders,
      rivers, overlays, fog/shroud all present and correct.
- [ ] Select unit → reachable tiles shown; hover → path preview; click → move (same result as
      2D); found city; select city; raze; link units — all functional.
- [ ] Selection/movable/linked/status/HP/exhausted adornments match 2D semantics.
- [ ] Era modal triggers on era change; victory/defeat overlays unaffected.
- [ ] Minimap navigates the 3D camera; centering on a city works.
- [ ] Save authored in 2D loads in 3D and vice‑versa with identical state.
- [ ] WebGL‑absent environment auto‑uses 2D; Preferences notes it.
- [ ] `npm run build` (client) and `npm test` green; engine suite untouched.

## Testing strategy

- **Pure units:** `chooseWorldSurface`, `createProjector` math (positions/normals for known
  `(q,r)`), elevation table, pixel→coord inverse used by `centerOnPoint`.
- **Mapping tests:** with mocked R3F, assert render‑data → scene mapping (counts, selection
  adornment presence) in `GameMap3D.test.tsx`.
- **Preference tests:** `useBoardModePreference` default/persistence/capability‑gate.
- **Integration smoke:** `BoardRenderer` falls back to 2D on thrown 3D error; toggling props
  swaps renderers.
- **Manual matrix:** each map size × {2D,3D} × {mouse,touch} for the parity checklist.

## Rollout

- Ship behind the live Preferences toggle with **3D default**; capability auto‑fallback to 2D.
- If field issues arise, a one‑line change flips the default back to `"2d"` in
  `useBoardModePreference` without removing 3D.
- Track console/error‑boundary fallbacks (optional telemetry) to catch device gaps.
