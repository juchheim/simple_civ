# 04 — Rendering Design (how each element becomes 3D)

Every visual element below is driven by the **same render data** the SVG board uses
(`useRenderData`, `useMapVisibility`). The only new pieces are (a) the projection
`hexToWorld3D`, (b) Three.js meshes/materials, and (c) instancing for scale.

## 0. Projection module: `hexToWorld3D`

A new pure module (client) is the 3D analog of `geometry.ts → hexToPixel`. It composes
`hexToPixel` (to get the flat sheet position) with the chosen `WorldSurface` from
`chooseWorldSurface` (`02 §2`).

```ts
// pseudo-API
interface Projector {
  surface: WorldSurface;
  positionOf(coord: HexCoord, elevation?: number): THREE.Vector3; // hex center on surface
  normalAt(coord: HexCoord): THREE.Vector3;                       // surface normal (up)
  orientationOf(coord: HexCoord): THREE.Quaternion;               // align token's +Y to normal
  cornerOf(coord: HexCoord, cornerIndex: 0..5, elevation?): THREE.Vector3;
}
function createProjector(map: {width:number;height:number}, hexSize: number): Projector;
```

- Cylinder: `(x,y)` → `θ = θ0 + x/Xspan·Φ`, position `= (R·sinθ, Yc − y, R·cosθ)`; normal is
  the radial direction `(sinθ, 0, cosθ)`.
- Sphere (experimental): `(x,y)` → `(λ, φ)`, standard spherical position; normal is radial.
- `elevation` lifts a point along the normal (terrain relief and token height).

Everything else asks the projector for positions; nothing else needs to know the surface
kind. This keeps cylinder/sphere swappable behind one interface.

## 1. Terrain tiles → extruded hex prisms with relief

- **Geometry:** a unit pointy‑top hexagonal prism (a `CylinderGeometry` with 6 radial
  segments, or a custom extruded hex). Top face is textured; sides use a darker "earth/rock"
  material; bottom is hidden.
- **Per‑terrain elevation** (visual relief; gameplay unaffected):
  | Terrain | Relief | Note |
  |---|---|---|
  | DeepSea | lowest (recessed, translucent water shader) | base sea level − ε |
  | Coast | just below land | shallow water tint |
  | Marsh/Desert/Plains | low | flat-ish |
  | Forest | low + tree impostors (optional) | PNG already shows trees |
  | Hills | medium | |
  | Mountain | tall | dramatic peaks |
  Elevation is a lookup table in the 3D module, **not** in the engine.
- **Texture:** the existing `/terrain/*.png` mapped to the top hex face (UVs set so the
  square PNG is centered/cropped to the hex, matching SVG `preserveAspectRatio="slice"`).
- **Scale:** at 1,200 tiles we must **instance**. Use one `InstancedMesh` (or drei
  `<Instances>`) **per terrain type** (≤ 8 terrains + special tiles), or a single
  `InstancedMesh` with a **texture atlas** (`08`) and per‑instance UV offset. Per‑instance
  transform = `projector.positionOf(coord, elevation)` + `orientationOf(coord)`. This turns
  ~1,200 draw calls into ~8.
- **Selection / reachable / hover** are per‑tile visual states. Implement as either
  per‑instance color tint (`InstancedMesh.setColorAt`) or thin overlay rings on the selected
  / reachable hexes only (few at a time, cheap as individual meshes). Mirrors `HexTile.tsx`
  stroke logic (`isSelected` → white ring, `isReachable` → green ring + center dot).

## 2. Units → extruded hex tokens (reusing PNGs)

Per the requirement: units "remain as hexes but have depth, PNGs reused."

- **Geometry:** a short hex prism (token) — like a board‑game piece. Top face textured with
  `unitImages[unit.type]`; side is the **civ color** (`UnitDescriptor.color`) so ownership
  reads from any angle (this also replaces the SVG civ‑color disc).
- **Orientation:** `orientationOf(coord)` so the token stands "up" along the surface normal
  (radially outward on the cylinder/sphere). Tokens may additionally **billboard the top
  texture** toward the camera’s yaw for readability if needed, but the base stays on the
  surface.
- **Adornments** (from `UnitDescriptor`, mirroring `UnitLayer.tsx`):
  - `isSelected` → glowing ring/emissive base (was yellow dashed circle).
  - `canMove` → small pulsing emissive orb (was green orb).
  - HP bar → a billboarded bar above the token (drei `<Html>` or a camera‑facing quad);
    skip for Settler (matches current rule).
  - `isLinkedPartner` / `showLinkIcon` / `NaturesWrath` status → ring variants.
  - Exhausted (`movesLeft<=0 && hasAttacked && !cpGranted`) → desaturate/dim material.
- **On‑city stacking:** keep the existing split (`unitRenderDataOnCity` vs
  `OffCity`) so a garrison renders slightly offset/elevated above the city token.
- **Scale strategy:** units are far fewer than tiles, but still instance per `UnitType`
  (texture atlas of units) for headroom; adornments are individual meshes only for the
  selected/hovered/moving units.
- **Movement animation:** when a `MoveUnit` changes a unit's `coord`, tween the token along
  the path on the surface (lerp through `pathData` projected points). Optional but cheap and
  high‑impact; falls back to snap if reduced‑motion is set.

## 3. Cities → extruded hex tokens + label

- **Geometry/texture:** hex token textured with `cityImages[pop-bucket]`
  (`city_1..city_10`), taller than unit tokens, civ color on the sides
  (`CityOverlayDescriptor.strokeColor`).
- **Labels:** the SVG `CityLabelLayer` becomes drei `<Html>` screen‑space labels anchored to
  `projector.positionOf(city.coord)`; they occlude behind the planet (use `<Html occlude>`)
  so far‑side cities don't show through.
- **Fogged cities** still render (matches current behavior: cities show in fogged tiles).

## 4. Rivers → surface ribbons (same edge data)

- Input is unchanged: `gameState.map.rivers` (edge pairs) processed exactly as
  `useRiverPolylines.ts` does, but instead of pixel segments we project each segment's two
  endpoints (shared hex corners) with `projector.cornerOf(...)` and build a thin ribbon
  (a `TubeGeometry`/quad strip) lying on the surface, textured with `/terrain/RiverEdge.png`
  (and `RiverMouth.png` for `isMouth`). On a cylinder the ribbon is exact; on a sphere it
  inherits cell distortion (acceptable, rivers are decorative).

## 5. Territory borders → surface tubes

- `cityBounds` (from `render-data-city-bounds.ts`) are corner‑to‑corner segments colored by
  owner. Project endpoints and draw colored tubes hugging the surface, slightly elevated to
  avoid z‑fighting with terrain tops. Same data as 2D.

## 6. Fog of war & shroud

- Per‑tile `visibility = { isVisible, isFogged, isShroud }` from `useMapVisibility`.
  - `isVisible` → full‑color top texture.
  - `isFogged` → darken top (multiply by ~0.55) + overlay `/terrain/Fog.png` at low opacity
    (matches `HexTile.tsx`).
  - `isShroud` → either hidden (if `showShroud` false) or a near‑black capped hex with the
    fog texture at full opacity. Implement via per‑instance color/material variant or a
    separate "fog" instanced layer over shrouded hexes.
- Driven by the same `showShroud` prop already plumbed to `GameMap`.

## 7. Overlays (resources, goodie huts, camps)

- `OverlayType` icons currently are a mix of inline SVG shapes (RichSoil, OreVein,
  SacredSite) and full‑hex PNGs (GoodieHut, NativeCamp, ClearedSettlement, Bulwark).
  - PNG overlays → small textured quads/decals on the hex top, billboarded if iconic.
  - The three inline‑SVG resource glyphs → recreate as tiny extruded badges or pre‑rendered
    sprite textures (a 3‑icon mini‑atlas) so 3D doesn't depend on SVG. Low effort, few per
    map.

## 8. World shell, water, lighting, backdrop

- **Water:** DeepSea/Coast as a translucent animated water material (or a single sea shell
  mesh at sea level with land prisms poking through). Cheap version: flat blue emissive
  tiles like 2D; nicer version: a subtle normal‑mapped water shader.
- **Caps/rim:** for the open‑drum (`Φ<2π`) render an ocean falloff + soft atmosphere rim at
  the world edge; for a closed drum render domed ocean caps so far zoom reads as a planet.
- **Lighting:** one directional "sun" + low ambient/hemisphere fill; keep it flat enough that
  the reused PNGs stay readable (they are lit/painted already). Provide a fixed sun angle by
  default (no day/night) to avoid washing out art; day/night is optional polish.
- **Backdrop:** a starfield skybox/space gradient behind the world for the "planet in space"
  feel. Cheap (cubemap or shader gradient).

## 9. Layer/stacking order (3D equivalent of GameMapLayers)

The SVG stack order (terrain → rivers → borders → city images → on‑city units → city labels →
off‑city units → path) maps to draw/elevation order in 3D via small normal‑direction offsets
and `renderOrder`/`depthTest` tuning:

1. Terrain prisms (with relief)
2. Water shell
3. River ribbons + border tubes (slightly above terrain top)
4. City tokens
5. On‑city (garrison) unit tokens (above city)
6. Off‑city unit tokens
7. Selection/reachable rings, path ribbon (top‑most, `depthTest` off if needed)
8. Screen‑space HTML labels + HP bars

## 10. Performance levers (detailed budget in `07`)

- **Instancing** terrain (per‑terrain or atlas) and units (per‑type). Target ≤ ~20 draw
  calls for the whole board.
- **Frustum culling** is automatic per‑mesh; for instanced meshes rely on a bounding sphere;
  optionally split the world into a few instanced chunks so the back of the planet culls.
- **Texture atlas + mipmaps** to cut binds and shimmering (`08`).
- **Adornments only where needed** (selected/hovered/movable units, selected/reachable
  tiles), never per‑every‑tile.
- **On‑demand rendering:** R3F `frameloop="demand"` — only re‑render on state change or
  during camera motion/animations, so an idle board costs ~0 GPU.
- **Reduced‑motion / low‑power mode:** disable water animation, movement tweens, and demand
  fewer frames.
