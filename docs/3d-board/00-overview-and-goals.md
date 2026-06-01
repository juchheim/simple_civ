# 00 — Overview & Goals

## Vision

Players should be able to play Simple Civ on a tactile, three‑dimensional world that reads
like a living planet — terrain with relief, units and cities as physical tokens you can
orbit around — while every rule, coordinate, and outcome remains **identical** to the
current 2D game. 3D is the default presentation; 2D remains a first‑class option for
players who prefer it or whose hardware requires it.

## What "3D board" means here (and what it does not)

The request describes "the same hex‑based board except that it will be played on a large
world sphere," with units/cities staying as hexes but gaining depth and reusing their PNGs.
The crucial engineering interpretation, justified in detail in
[`02-geometry-and-topology.md`](./02-geometry-and-topology.md):

- **It is a rendering change, not a topology change.** The set of tiles, their `(q, r)`
  coordinates, who is adjacent to whom, distances, pathfinding, line of sight, and map
  generation are **unchanged**. We take the existing flat grid and *project* it onto a
  curved 3D surface for display and interaction.
- **The default 3D surface is a cylinder ("drum/planet" world)**, because a cylinder is a
  *developable* surface: a flat hex sheet wraps onto it with **zero shape distortion**, so
  hexes stay regular hexes. A true sphere cannot host a fixed‑adjacency hex grid without
  severe distortion for the current map aspect ratios (the math proof and the per‑map‑size
  calculator are in `02`). The sphere is therefore an **optional, experimental "planet"
  view**, automatically declined by the geometry calculator for today's map sizes.
- **Hex tokens with depth.** Terrain tiles become shallow extruded hex prisms with
  per‑terrain elevation (mountains tall, sea low). Units and cities become extruded hex
  tokens textured on top with their existing PNG, so they "remain as hexes but have depth."

## Goals

- G1. A 3D board that renders the full game state (terrain, units, cities, overlays,
  rivers, borders, fog/shroud, selection, reachable tiles, path preview) with **visual and
  behavioral parity** to the 2D board.
- G2. **3D is the default**; **2D selectable** in Game → Preferences and persisted across
  sessions, exactly like the existing `showCombatPreview` preference.
- G3. **Zero engine changes.** A game saved in one mode loads and plays identically in the
  other. No change to `@simple-civ/engine`.
- G4. **Reuse 100% of existing art** (`client/public/{terrain,units,cities,overlays,ui}`)
  as textures. No blocking dependency on new art.
- G5. **Acceptable performance** on the largest map (Huge = 40×30 ≈ 1,200 tiles): steady
  interaction at 60 fps on a typical laptop GPU, with a documented budget (`07`).
- G6. **Graceful degradation**: auto‑fallback to 2D when WebGL is missing or
  initialization fails.
- G7. **Maintainability**: 3D added behind a clean `BoardRenderer` seam so the two
  renderers share data/logic and can evolve independently.

## Non‑goals (for the initial release)

- N1. Changing gameplay, balance, rules, or the engine's flat‑grid topology.
- N2. Globe wrap‑around movement (the engine grid is bounded and does **not** wrap; we will
  not invent east–west adjacency). See `02` for how we render this honestly.
- N3. New 3D‑authored art, animated rigged models, or per‑unit 3D meshes. (Future work.)
- N4. A true geodesic/Goldberg hex‑sphere world (mathematically incompatible with a fixed
  rectangular hex grid; see `02`).
- N5. Multiplayer/netcode changes — rendering is local and state‑driven.

## Hard constraints discovered during codebase review

- C1. Coordinates are **axial `(q, r)`** (`engine/src/core/types.ts` → `HexCoord`) and are
  serialized everywhere (tiles, units, cities, rivers, fog history, saved games, server).
  They must remain the canonical identity of a tile in 3D.
- C2. The map is a **bounded rectangle** `width × height` stored as a flat `tiles[]` array
  with a sheared/offset axial layout (`engine/src/map/map-generator.ts`,
  `MAP_DIMS` in `engine/src/core/constants.ts`). It does not wrap.
- C3. Rendering today is **SVG** (`client/src/components/GameMap/*`); hexes are **pointy‑top**;
  `HEX_SIZE = 75`; pixel projection is `hexToPixel` in `GameMap/geometry.ts`.
- C4. The client has **no 3D dependency** yet (`client/package.json`: React + Vite only).
- C5. Preferences are **localStorage‑backed hooks** (e.g.
  `client/src/hooks/useCombatPreviewPreference.ts`) surfaced in
  `client/src/components/HUD/sections/GameMenu.tsx` under a "Preferences" panel. There is no
  server‑side settings store; that's the pattern we extend.
- C6. There is already a clean **render‑data seam**: `useRenderData`
  (`client/src/hooks/useRenderData.ts`) computes positions/visibility/yields; the SVG
  components only draw. This is the seam the 3D renderer plugs into.

## Success criteria (acceptance)

1. Toggle 2D⇄3D in Preferences with no reload; choice persists across sessions; default is
   3D on first run.
2. In 3D you can: select a unit, see reachable tiles, hover to preview a path, click to
   move, found/select cities, see borders, fog/shroud, era transitions, and use the minimap
   to navigate — all matching 2D outcomes.
3. Loading a save authored in 2D shows the same world in 3D and vice‑versa.
4. Huge map sustains interactive frame rates within the budget in `07`.
5. On a WebGL‑less environment the app silently uses 2D and notes it in Preferences.
6. `npm run build` and `npm test` pass; engine test suite is untouched and green.

## Glossary

- **Axial coords `(q, r)`** — the engine's hex coordinate identity. Canonical, serialized.
- **Developable surface** — a surface (plane, cylinder, cone) that can be unrolled flat
  without stretching. Hex shapes are preserved when mapped onto it. A sphere is **not**
  developable.
- **Render data** — the projection‑independent description of what to draw for the current
  turn, produced by `useRenderData` (tiles, units, cities, borders, rivers, path).
- **Projection** — the function mapping `(q, r)` → a position. In 2D it is `hexToPixel`
  (→ `x, y`). In 3D it is a new `hexToWorld3D` (→ `x, y, z` on the cylinder/sphere).
- **BoardRenderer** — the new abstraction that picks the 2D (SVG) or 3D (Three.js) renderer
  from the same render data and interaction callbacks.
- **Token** — an extruded hex prism representing a unit or city, textured on top with the
  entity's existing PNG.
