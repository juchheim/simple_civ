# 02 — Geometry & Topology: sphere vs cylinder

This is the doc that answers the user's core question — *"can the flat hex board live on a
sphere, and if not, on a cylinder, and what are the ramifications?"* — with the math, the
ramifications, and a concrete per‑map‑size decision procedure.

## 0. The non‑negotiable: the engine grid stays flat and bounded

The engine defines a tile's identity as axial `(q, r)` and builds the map as a bounded
rectangle (`engine/src/map/map-generator.ts`):

```ts
for (let r = 0; r < height; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < width - r_offset; q++) { /* tile {q,r} */ }
}
```

with dimensions (`engine/src/core/constants.ts`, `MAP_DIMS`):

| Size | width (W) | height (H) | tiles (≈ W·H) |
|------|-----------|------------|----------------|
| Tiny | 20 | 15 | 300 |
| Small | 25 | 20 | 500 |
| Standard | 30 | 22 | 660 |
| Large | 35 | 25 | 875 |
| Huge | 40 | 30 | 1200 |

Adjacency is the fixed 6‑neighbor axial rule (`DIRECTIONS` in `engine/src/core/hex.ts`),
distance is the axial/cube metric (`hexDistance`), pathfinding/LoS/fog/AI/saves all assume
this. **Changing the topology (e.g., making it wrap, or retiling a sphere) would touch the
entire engine and break save compatibility.** We will not do that. Therefore:

> **3D is a projection of the existing flat grid onto a 3D surface — a pure rendering
> concern. Coordinates, adjacency, distance, and saves are unchanged.**

Everything below is about *displaying* that flat sheet on a curved surface.

## 1. The two candidate surfaces

We map the flat hex sheet's pixel layout `(x, y) = hexToPixel(q, r)` onto a 3D surface.
Define the sheet's world extents in hex units (set `HEX_SIZE = s`):

- Column pitch `dx = √3 · s ≈ 1.732 s`
- Row pitch `dy = 1.5 · s`
- Sheet width `Xspan ≈ W · dx`, sheet height `Yspan ≈ H · dy`
- Sheet aspect `A = Xspan / Yspan = (W·√3)/(H·1.5)`

| Size | Xspan/s | Yspan/s | Aspect A |
|------|---------|---------|----------|
| Tiny | 34.64 | 22.5 | **1.54** |
| Small | 43.30 | 30.0 | **1.44** |
| Standard | 51.96 | 33.0 | **1.57** |
| Large | 60.62 | 37.5 | **1.62** |
| Huge | 69.28 | 45.0 | **1.54** |

### 1a. Cylinder (developable → zero shape distortion)

Wrap the sheet's X‑axis around the cylinder and keep Y along the axis. A cylinder has zero
Gaussian curvature, so the sheet maps **isometrically**: every hex keeps its true shape and
area. Parameterize:

```
θ(x) = θ0 + (x / Xspan) · Φ        // Φ = total wrap angle (radians)
R     = Xspan / Φ                   // radius so arc length == sheet width (no stretch)
world = ( R·sin θ,  Yc − y,  R·cos θ )   // y → height along axis (Yc centers it)
```

Choosing `Φ` controls how much of a "planet" it looks like:

- `Φ = 2π` → fully closed drum. Looks like a planet when orbited. But the engine grid does
  **not** wrap, so column `0` and column `W−1` are *visually* adjacent while being
  *gameplay* walls. **Mitigation (and why this is acceptable):** map generation already
  pushes land inward and rings the map with deep ocean (`LANDMASS_PARAMS.edgeFalloffStart`
  in `engine/src/map/generation/landmass.ts`). The wrap seam therefore lands in open ocean
  where units essentially never sit, so the "fake adjacency" is not reachable in practice.
- `Φ < 2π` (e.g. 300–330°) → an **open drum**: a curved world with a visible "edge of the
  world" rendered as an ocean falloff / atmosphere rim. This is the most *honest*
  representation of a bounded map and removes the fake‑adjacency concern entirely.

**Recommendation:** default `Φ ≈ 330°` (open drum) with an oceanic rim, configurable up to
`2π`. Distortion is **zero** for any `Φ`; `Φ` is purely aesthetic.

### 1b. Sphere (equirectangular mapping → unavoidable distortion)

Map `x → longitude λ` and `y → latitude φ` (plate‑carrée / equirectangular):

```
λ(x) = (x / Xspan) · Λ            // Λ = longitude span used (≤ 2π)
φ(y) = φ0 − (y / Yspan) · Β       // Β = latitude span used (≤ π)
world = ( R cosφ cosλ, R sinφ, R cosφ sinλ )
```

Two hard problems, both intrinsic (not implementation bugs):

1. **You cannot tile a sphere with regular hexagons.** By Euler's formula, any
   hexagon‑dominant closed tiling of a sphere needs exactly **12 pentagons** (Goldberg
   polyhedra / soccer‑ball). A *fixed rectangular* hex grid mapped by lat/long is not such a
   tiling, so on a sphere the cells become **distorted, non‑regular** polygons.
2. **Meridian convergence (pole pinch).** East–west spacing scales by `cos φ`. A row at
   latitude `φ` is compressed horizontally to `cos φ` of its true width. Near the poles this
   → 0 (cells collapse to slivers).

#### Does a sphere even *fit*? (The decisive constraint)

To place all `W` columns and `H` rows on a sphere of radius `R`, arc lengths must fit:

- Longitudinal arc must host the columns: `R · Λ ≥ Xspan`, and `Λ ≤ 2π` ⇒ `R ≥ Xspan/2π`.
- Latitudinal arc must host the rows: `R · Β ≥ Yspan`, and `Β ≤ π` ⇒ `R ≥ Yspan/π`.

If we *also* want equal scale (so cells aren't pre‑stretched), arc length per hex must match
in both axes, i.e. `R` is the same and we use the natural pitches. Take the binding lower
bound `R* = max(Xspan/2π, Yspan/π)` and compute the **resulting latitude band** `Β = Yspan/R*`
and **longitude coverage** `Λ = Xspan/R*`:

| Size | Xspan/2π | Yspan/π | R*/s | Λ (lon) | Β (lat) | Verdict |
|------|----------|---------|------|---------|---------|---------|
| Tiny | 5.51 | 7.16 | 7.16 | 4.84 rad = **277°** | 3.14 rad = **180°** | pole‑to‑pole, 83° seam |
| Small | 6.89 | 9.55 | 9.55 | 4.53 rad = **260°** | **180°** | pole‑to‑pole |
| Standard | 8.27 | 10.50 | 10.50 | 4.95 rad = **284°** | **180°** | pole‑to‑pole |
| Large | 9.65 | 11.94 | 11.94 | 5.08 rad = **291°** | **180°** | pole‑to‑pole |
| Huge | 11.03 | 14.32 | 14.32 | 4.84 rad = **277°** | **180°** | pole‑to‑pole |

Interpretation: for every current map size the **latitude band is the binding constraint and
equals the full 180°**, meaning the grid would stretch **literally pole to pole** (maximum
pinch at the top and bottom rows), while the longitude coverage is only ~260–290° (so there
is *also* an 70–100° seam gap — it does **not** even form a full planet). If instead we
enlarge `R` to relax the pole pinch, longitude coverage shrinks proportionally and the grid
becomes a **small patch stuck on a large sphere** (a "sticker on a marble").

**Conclusion (math‑backed):** with the current aspect ratios (~1.5:1) and a bounded
(non‑wrapping) grid, a true sphere is *not* a good playable surface. Either you accept
extreme polar distortion or you get a small patch. A sphere only becomes attractive when a
map is near **2:1 aspect** *and* wraps east–west. None of today's maps qualify.

This is exactly the user's branch: **"if a sphere will not work, it will be on a cylinder."**
For all current map sizes, **it will be on a cylinder.**

## 2. The per‑map‑size decision procedure (implement this)

Rather than hard‑code "always cylinder," ship a calculator so the choice is data‑driven and
future‑proof (e.g. if a 2:1 wrapping map is added later). Proposed engine‑side helper
(pure, unit‑testable; lives in the client geometry module since it's render‑only, or in a
small shared util — see `06`):

```ts
export type WorldSurface =
  | { kind: "cylinder"; radius: number; wrapAngle: number; height: number }
  | { kind: "sphere"; radius: number; lonSpan: number; latSpan: number };

export interface SurfaceDecision {
  surface: WorldSurface;
  // Worst-case east-west compression for a sphere (1 = none). cylinder => 1.
  worstCompression: number;
  reason: string;
}

const HEX_S = 1;                       // work in hex units; scale later
const DX = Math.sqrt(3) * HEX_S;
const DY = 1.5 * HEX_S;

// Tunables (documented defaults)
const MAX_POLE_COMPRESSION = 0.6;      // require cos(latMax) >= 0.6  (latMax <= ~53°)
const REQUIRE_WRAP_FOR_SPHERE = true;  // current grid never wraps -> sphere disallowed
const DEFAULT_CYLINDER_WRAP = (330 * Math.PI) / 180;

export function chooseWorldSurface(
  W: number, H: number, opts?: { gridWraps?: boolean }
): SurfaceDecision {
  const Xspan = W * DX;
  const Yspan = H * DY;

  // Sphere feasibility (only if a future map wraps east-west)
  if (!REQUIRE_WRAP_FOR_SPHERE || opts?.gridWraps) {
    const R = Math.max(Xspan / (2 * Math.PI), Yspan / Math.PI);
    const latSpan = Yspan / R;                 // radians, symmetric about equator
    const latMax = latSpan / 2;
    const compression = Math.cos(Math.min(latMax, Math.PI / 2));
    if (compression >= MAX_POLE_COMPRESSION && latSpan <= Math.PI) {
      return {
        surface: { kind: "sphere", radius: R, lonSpan: Xspan / R, latSpan },
        worstCompression: compression,
        reason: `sphere viable: pole compression ${compression.toFixed(2)} >= ${MAX_POLE_COMPRESSION}`,
      };
    }
  }

  // Cylinder fallback (developable, zero distortion)
  const radius = Xspan / DEFAULT_CYLINDER_WRAP;
  return {
    surface: { kind: "cylinder", radius, wrapAngle: DEFAULT_CYLINDER_WRAP, height: Yspan },
    worstCompression: 1,
    reason: REQUIRE_WRAP_FOR_SPHERE
      ? "cylinder: grid is bounded (non-wrapping); sphere disabled"
      : "cylinder: sphere distortion exceeds threshold",
  };
}
```

Running this for every `MAP_DIMS` entry yields **cylinder** for all current sizes (sphere is
disabled because the grid does not wrap, and even if forced, `latSpan = 180°` ⇒
`compression = cos 90° = 0 < 0.6`). The function is the literal encoding of "sphere if it
works, else cylinder," and it is unit‑testable against the table above.

## 3. Ramifications of moving the flat board to a curved surface

A summary of the real consequences and how each is handled. (Cylinder unless noted.)

| Concern | Flat sheet | On a cylinder | On a sphere (if ever) |
|---|---|---|---|
| Hex shape/area | exact | **exact (isometric)** | distorted by `cos φ` |
| Adjacency/distance | engine `(q,r)` | unchanged (render‑only) | unchanged (render‑only) |
| East–west edge | hard wall (ocean rim) | open‑drum rim or ocean seam | antimeridian seam in ocean |
| North/south edge | hard wall (ocean rim) | flat/ domed cap, ocean rim | pole pinch (lands in ocean) |
| Straight rows | horizontal lines | helix‑like bands (gentle) | parallels (curved) |
| Rivers (edge segments) | rotated quads | ribbons following surface | ribbons + distortion |
| Picking | nearest‑center scan | **raycast** hex meshes | raycast |
| "Center on coord" | pan to pixel | rotate world/camera to bring θ,y to front | rotate to λ,φ |
| Minimap viewport rect | screen rect in world | focus indicator (no 1:1 rect) | focus indicator |

Notes:

- **Rows become gentle bands, not straight lines.** On a cylinder, a constant‑`r` row wraps
  around as a circle at constant height — visually a horizontal band. The pointy‑top layout's
  half‑column offset per row is preserved exactly (developable), so the hex tessellation is
  seamless across the wrap as long as `W·dx` equals the circumference (it does, by
  construction). If `Φ < 2π` (open drum) there is no wrap tessellation requirement at all.
- **Curvature vs readability.** Large radius (gentle curve) keeps gameplay legible; small
  radius (tight planet) looks dramatic but bends distant hexes away from camera. We expose a
  `curvature` setting (effectively choosing `Φ` and an optional "flatten near camera"
  factor). Default favors readability.
- **Caps.** The top/bottom of the cylinder are deep ocean (from edge falloff). Render
  domed/closed caps with an ocean+atmosphere shader so it reads as a planet from far zoom,
  while the playable band stays near the "equator."

## 4. Rivers, borders, fog on a curved surface

- **Rivers** are stored as **edges** `rivers: {a,b}[]` and currently drawn as rotated
  textured quads between hex‑corner midpoints (`useRiverPolylines.ts` + `OverlayLayer.tsx`).
  In 3D we keep the same edge data but place a short ribbon/decal *on the surface* along the
  projected edge (a quad whose two ends are the 3D positions of the shared corners, oriented
  tangent to the surface). On a cylinder this is exact; on a sphere it inherits the cell
  distortion. See `04 §Rivers`.
- **Territory borders** (`cityBounds`) are also edge segments between hex corners — same
  treatment: project both corner endpoints to the surface and draw a tube/ribbon.
- **Fog/shroud** is per‑tile state; render as a darkened/again‑textured top face or a
  surface‑hugging overlay (`04 §Fog`). No geometry change, only material.

## 5. Why not a geodesic hex‑sphere (Goldberg) world?

It is the "correct" way to get true hexes on a sphere, but it requires the *grid itself* to
be a sphere tiling with 12 pentagons and **completely different adjacency, distance, and
coordinates**. That is a new game engine, breaks every save, and contradicts the
non‑negotiable in §0. Explicitly out of scope (`00` N4). The cylinder gives true hexes today
with none of that cost.

## 6. Summary

- Keep the engine's flat, bounded `(q,r)` grid. 3D is rendering only.
- **Default surface = cylinder** (open drum, `Φ≈330°`): zero hex distortion, planet‑like
  when orbited, honest about the bounded edge (ocean rim), and the calculator selects it for
  **all** current map sizes.
- **Sphere = experimental**, auto‑declined by `chooseWorldSurface` until a map both wraps
  east–west and has ~2:1 aspect; documented distortion if forced on.
- The selection is a small, tested, pure function keyed off `MAP_DIMS`, so adding a future
  map size automatically gets the right surface.
