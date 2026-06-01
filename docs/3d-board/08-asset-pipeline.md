# 08 — Asset Pipeline (reusing the existing PNGs)

Requirement: **reuse all existing art**. This doc inventories what exists and how each PNG
becomes a 3D texture, with no dependency on new art to ship.

## 1. Inventory (from `client/src/assets.ts` + `client/public/`)

| Category | Location | Registry (assets.ts) | Count | Use in 3D |
|---|---|---|---|---|
| Terrain | `/terrain/*.png` | `terrainImages` | 15 | top face of terrain prisms; Fog overlay; River edge/mouth ribbons; GoodieHut/NativeCamp/ClearedSettlement decals |
| Units | `/units/*.png` | `unitImages` | 19 | top face of unit hex tokens |
| Cities | `/cities/city_1..10.png` | `cityImages` (by pop) | 10 | top face of city hex tokens |
| Overlays | `/overlays/Bulwark.png` | `overlayImages` | 1 | hex‑top decal |
| UI | `/ui/*.png` (Food/Gold/Prod/Science, tech bg) | — | — | HUD only (unchanged) |
| Eras | `client/src/assets/images/eras/*.png` | imported | 3 | EraModal (unchanged) |
| Victory | `/assets/victory/*.png` | — | — | End screens (unchanged) |
| Audio | `/audio/eras/*` | manifest | — | unchanged |

Representative sizes: terrain/city PNGs are large (~170–230 KB, high‑res square art); units
~100 KB. They are square, top‑down/iconic sprites with transparency — well suited to mapping
onto a hex top face (center‑crop to the hexagon, matching the 2D `slice` behavior).

## 2. From PNG → texture

- Load via drei `useTexture` (wraps `THREE.TextureLoader`) using the **same `/`‑rooted URLs**
  already in `assets.ts` (Vite serves `public/` at root). No file moves.
- Set `texture.colorSpace = THREE.SRGBColorSpace`, generate **mipmaps**, and use anisotropic
  filtering so tiles look crisp at glancing/curved angles and don't shimmer.
- Transparency: units/overlays use alpha; enable `transparent`/alpha‑test on those materials
  (alpha‑test avoids sort issues for hard‑edged sprites).
- UV mapping: map the square texture onto the hexagon top so the visible art is centered and
  the corners are cropped (equivalent to SVG `preserveAspectRatio="xMidYMid slice"`).

## 3. Texture atlases (Phase 4 optimization)

To keep draw calls low with instancing, pack textures into atlases at build time (or first
load) and use per‑instance UV offsets:

- **Terrain atlas:** the ≤15 terrain PNGs in one sheet → a single instanced terrain mesh can
  draw all terrains in one call by indexing UVs per instance.
- **Unit atlas:** the 19 unit PNGs → instanced unit tokens per‑type via UV index.
- **City atlas:** the 10 city PNGs (pop buckets) → instanced city tokens.
- Atlas generation options:
  - **Build‑time** script using the already‑present `jimp` dependency
    (`client/package.json`) to compose sheets + emit a JSON UV map. Preferred (cacheable,
    deterministic).
  - **Runtime** compose into a single `CanvasTexture` on first 3D load (simpler, slight
    startup cost). Acceptable fallback.
- Keep individual‑texture path for Phases 1–3; introduce atlas only when profiling shows draw
  calls/binds are the bottleneck (`07` Phase 4).

> Note: `remove_bg.py` at repo root and `jimp` indicate prior sprite background removal. If
> any reused PNG has a non‑transparent background, run the same background‑removal step so it
> composites cleanly as a token/decal. Audit during Phase 2.

## 4. Depth/side materials (the "hex with depth")

Tokens and terrain prisms have visible sides:

- **Terrain prism sides:** a tiled rock/earth material (a simple color gradient or a small
  reused texture) darker than the top; cliffs taller for Hills/Mountain.
- **Unit/City token sides:** the **civ color** (`UnitDescriptor.color` /
  `CityOverlayDescriptor.strokeColor`) so ownership is legible from any orbit angle. This
  replaces the 2D civ‑color disc/halo.
- No new art needed — sides are solid/【tinted materials, tops are the existing PNGs.

## 5. Loading & preloading strategy

- **Preload on 3D mount:** kick off all terrain textures (small fixed set) before first
  frame; show the suspense loader (`06 §4`) until ready.
- **Lazy‑load unit/city textures** by type as they first appear, or preload all (sets are
  small: 19 + 10). Given counts, preloading everything on 3D entry is fine and simplest.
- **Shared cache:** a module‑level texture cache (`textures.ts`) so re‑mounts (mode toggles,
  map reloads) reuse GPU textures; dispose on full teardown.

## 6. Memory budget

- ~45 source PNGs. With mipmaps (~+33%) and GPU decompression, a naive load is well within a
  ~128 MB texture budget on the Huge map (`07`). Atlasing reduces binds and overhead further.
- Consider downscaling the largest terrain/city PNGs for the *atlas* (e.g. 256² per cell) if
  memory or load time is a concern — purely a 3D‑side optimization; the originals stay for 2D.

## 7. What stays untouched

- HUD/UI icons, tech‑tree background, era banners, victory art, and audio are unrelated to
  the board surface and are **not** modified.
- `assets.ts` remains the registry of record; the 3D texture loader reads from it so there is
  a single mapping from entity → image for both renderers.
