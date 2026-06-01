# 01 — Current Architecture (the 2D board today)

This documents exactly how the board is rendered and wired today, so the 3D work can reuse
the right seams instead of rewriting them. All paths are relative to the repo root.

## 1. Rendering technology

The board is **SVG**, rendered by React. There is no Canvas/WebGL/PixiJS. Key facts:

- Hexes are **pointy‑top**. Corner offsets use angles `60·i − 30°`
  (`client/src/components/GameMap/geometry.ts` → `getHexPoints` / `getHexCornerOffsets`).
- Tile→pixel projection (`geometry.ts` → `hexToPixel`):
  ```ts
  // pointy-top axial → pixel
  x = HEX_SIZE * (sqrt(3) * q + (sqrt(3)/2) * r)
  y = HEX_SIZE * (3/2 * r)
  ```
- Constants (`client/src/components/GameMap/constants.ts`): `HEX_SIZE = 75`,
  `MIN_ZOOM = 0.5`, `MAX_ZOOM = 2.0`, `UNIT_IMAGE_SIZE = 110`, `CITY_IMAGE_SIZE = 150`.
- Terrain textures are declared once as SVG `<pattern>` elements and filled into hex
  `<polygon>`s (`GameMap/GameMapLayers.tsx`). Units, cities, fog, overlays are SVG
  `<image>`/`<polygon>` elements positioned by `hexToPixel`.

## 2. Component / hook map

```
client/src/components/
  GameMap.tsx                     ← public board component (props below)
  GameMap/
    GameMapLayers.tsx             ← the <svg>; declares terrain <pattern> defs; stacks layers
    HexTile.tsx                   ← one terrain hex: fill, stroke, fog, overlays, yields label
    OverlayLayer.tsx              ← rivers as rotated textured segments between hex midpoints
    CityBoundsLayer.tsx           ← territory border line segments
    CityLayer.tsx                 ← CityImageLayer + CityLabelLayer
    UnitLayer.tsx                 ← unit sprite: civ-color disc + PNG + HP bar + status rings
    PathLayer.tsx                 ← movement path preview polyline
    geometry.ts                   ← getHexPoints, hexToPixel, getTerrainColor/Image, dist
    constants.ts                  ← HEX_SIZE, zoom limits, image sizes
    useMapInteraction.ts          ← pan/zoom/inertia, screen→world, findHexAtScreen (picking)
    useRiverPolylines.ts          ← builds river RiverSegment[] in pixel space

client/src/hooks/
  useRenderData.ts                ← *** the seam *** projection-independent draw data
  useMapVisibility.ts             ← per-tile {isVisible,isFogged,isShroud}, renderable keys
  useMapController.ts             ← wraps interaction + exposes centerOnCoord/centerOnPoint
  useReachablePaths.ts            ← reachable tiles for selected unit
  render-data-helpers.ts          ← yields w/ civ bonuses, color maps, unit split on/off city
  render-data-city-bounds.ts      ← territory border segment construction
```

In‑game composition (`client/src/components/AppFlow/InGameContent.tsx`):

```
<div 100vw/100vh>
  <GameMap ... onViewChange={onSetMapView} />     ← the board (SVG)
  <ToastContainer />
  <HUD ... mapView onNavigateMap onToggleGameMenu />  ← overlay UI (incl. MiniMap, GameMenu)
  <TechTree/> <EndGameExperience/> modals ...
</div>
```

`GameMap` is mounted exactly once here. **This is the single branch point** where a
`BoardRenderer` will choose SVG vs Three.js (see `06`).

## 3. The render‑data seam (most important section)

`useRenderData` (`client/src/hooks/useRenderData.ts`) is already a clean separation between
*what to draw* and *how to draw it*. It takes game state + a `hexToPixel` function and emits:

- `tileRenderData: TileRenderEntry[]` — `{ key, tile, position, visibility, yields,
  isSelected, isReachable, city }`
- `cityOverlayData: CityOverlayDescriptor[]` — `{ key, position, city, strokeColor }`
- `cityBounds: CityBoundsDescriptor[]` — territory border segments
- `unitRenderDataOnCity` / `unitRenderDataOffCity: UnitDescriptor[]` — `{ unit, position,
  isSelected, isLinkedPartner, showLinkIcon, color, isOnCityHex, canMove }`
- `riverLineSegments: RiverSegment[]` — `{ id, start, end, isMouth }` (pixel space)
- `pathData: HexCoord[]` — path preview for hovered destination
- `selectedUnit`

Two observations that make the 3D plan low‑risk:

1. **Positions come from an injected `hexToPixel`.** `GameMap.tsx` passes
   `projectHexToPixel(hex, HEX_SIZE)`. If we instead inject a 3D projection (or, cleaner,
   keep `useRenderData` emitting *logical* positions and let the 3D renderer compute world
   positions from `tile.coord`), the same hook serves both renderers. The 3D renderer
   primarily needs `tile.coord` / `unit.coord` (the `(q,r)`), which every descriptor already
   carries via `tile`/`unit`/`city`.
2. **Visibility, yields, bounds, reachable, and pathfinding are projection‑agnostic.** They
   are pure functions of game state. The 3D renderer reuses them verbatim.

> Design consequence: the 3D renderer should consume `tileRenderData`, `unitRenderData*`,
> `cityOverlayData`, `cityBounds`, `riverLineSegments` (rebuilt from edges, see `04`),
> `pathData`, and `visibility` — exactly what the SVG layers consume — and only swap the
> *projection* and the *draw calls*.

## 4. Interaction today (what 3D must replicate)

`GameMap/useMapInteraction.ts` (wrapped by `useMapController.ts`) implements:

- **Pan** (drag), **inertia** (`pan-zoom-inertia-helpers.ts`), **wheel zoom about cursor**
  with smoothing (`map-pointer-helpers.ts`), clamped to `MIN_ZOOM..MAX_ZOOM`.
- **Picking**: `findHexAtScreen(screenX, screenY)` converts screen→world via `pan/zoom`,
  then linearly scans `tiles` for the nearest hex center within `HEX_SIZE`. (O(n) per event;
  fine for SVG, replaced by raycasting in 3D — see `05`.)
- **Hover**: `onHoverTile(coord)` → drives `pathData` (path preview) and tile highlight.
- **Click vs drag**: a `DRAG_THRESHOLD` (3px) distinguishes a click (→ `onTileClick`) from a
  pan.
- **Camera commands**: `centerOnCoord(coord)` / `centerOnPoint({x,y})` and `onViewChange`
  emit a `MapViewport` `{ pan, zoom, size, worldBounds, center }` consumed by the HUD
  **MiniMap** to draw the viewport rectangle and to navigate (`onNavigateMap`).

The public `GameMap` props (the contract the renderer must honor) are:

```ts
gameState, onTileClick, selectedCoord, playerId, showShroud, selectedUnitId,
reachableCoords, showTileYields, cityToCenter?, onViewChange?
// + imperative handle: { centerOnCoord, centerOnPoint }
```

## 5. Engine coupling the board relies on

- `HexCoord = { q: number; r: number }` (`engine/src/core/types.ts`).
- Hex math in **both** `engine/src/core/hex.ts` and `client/src/utils/hex.ts`
  (`hexDistance`, `getNeighbors`, `hexRing`, `hexLine`, axial⇄cube). The 3D renderer uses
  these unchanged for any logical queries; only the *visual* position function is new.
- `findPath` (engine) powers `pathData`. Untouched.
- `GameState.map = { width, height, tiles: Tile[], rivers?: {a,b}[] }`.
- `MAP_DIMS` (`engine/src/core/constants.ts`): the only place map dimensions live.

## 6. Assets today

- PNGs under `client/public/{terrain,units,cities,overlays,ui}`; registered in
  `client/src/assets.ts` (`unitImages`, `terrainImages`, `overlayImages`, `cityImages`).
- Terrain: 15 files; units: 19; cities: 10 (`city_1..city_10` by population);
  overlays: 1 (Bulwark). Era banners under `client/src/assets/images/eras/`.
- Served from `/` (Vite `public/`): e.g. `terrainImages.Plains = "/terrain/Plains.png"`.
- These same URLs become `THREE.TextureLoader` inputs in 3D (`08`).

## 7. What this means for the 3D effort

The board already has the right shape for a second renderer:

- A pure **render‑data** layer (reuse as‑is).
- A pure **interaction contract** (`GameMap` props + imperative handle) we re‑implement
  against Three.js.
- A single **mount point** (`InGameContent.tsx`) to branch on the preference.
- A complete **asset registry** to feed the texture loader.

The 3D renderer is therefore additive: a new `GameMap3D` component plus a projection module
and a camera/picking controller, selected by a `BoardRenderer` switch. No SVG code is
deleted; it becomes the 2D branch.
