# 3D Board — Planning & Implementation Docs

This folder is the single source of truth for the project that adds an optional **3D
rendering** of the Simple Civ game board. 3D becomes the **new default**; the existing
2D board is preserved as a preference under **Game → Preferences**.

> TL;DR of the engineering decision: **the engine topology does not change.** The board
> stays the exact same flat, bounded, axial hex grid it is today. "3D" is a pure
> **client-side rendering/projection** of that grid onto a curved 3D surface. The default
> surface is a **cylinder** (a developable surface that hosts the hex grid with zero shape
> distortion); a true **sphere** is offered as an experimental "planet" view but is *not*
> geometrically viable as the playable surface for the current map sizes (proof in
> `02-geometry-and-topology.md`). The board itself does not become a different game — it
> becomes a different *view* of the same game.

## Read in this order

| # | Doc | What it covers |
|---|-----|----------------|
| 00 | [`00-overview-and-goals.md`](./00-overview-and-goals.md) | Vision, goals, non-goals, constraints, success criteria, glossary |
| 01 | [`01-current-architecture.md`](./01-current-architecture.md) | How the 2D board works today, the seams we reuse, exact file map |
| 02 | [`02-geometry-and-topology.md`](./02-geometry-and-topology.md) | Hex-on-sphere vs cylinder math, per-map-size decision, rivers/poles/seams |
| 03 | [`03-engine-choice.md`](./03-engine-choice.md) | Three.js + react-three-fiber rationale, alternatives, dependencies |
| 04 | [`04-rendering-design.md`](./04-rendering-design.md) | Tiles, units, cities, overlays, fog, borders, lighting, instancing |
| 05 | [`05-interaction-and-camera.md`](./05-interaction-and-camera.md) | Camera, picking/raycasting, hover, center-on-coord, minimap, touch |
| 06 | [`06-preferences-and-integration.md`](./06-preferences-and-integration.md) | The 2D/3D toggle, the `BoardRenderer` abstraction, prop plumbing |
| 07 | [`07-implementation-plan.md`](./07-implementation-plan.md) | Phased milestones, file-by-file changes, acceptance criteria, tests |
| 08 | [`08-asset-pipeline.md`](./08-asset-pipeline.md) | Reusing the existing PNGs as textures/atlases, depth materials, memory |
| 09 | [`09-open-questions-and-risks.md`](./09-open-questions-and-risks.md) | Decisions to confirm, risk register, mitigations |

## Status

| Phase | Description | State |
|-------|-------------|-------|
| Planning | These documents | **Drafted — pending review** |
| Phase 0 | Dependencies + `BoardRenderer` seam + preference toggle | Not started |
| Phase 1 | Static 3D terrain (cylinder) reusing 2D render data | Not started |
| Phase 2 | Units, cities, overlays, borders, fog as 3D | Not started |
| Phase 3 | Camera, picking, hover, center-on-coord parity | Not started |
| Phase 4 | Performance pass (instancing/atlases) + polish | Not started |
| Phase 5 | Experimental sphere "planet" view (optional) | Not started |

## Guiding principles

1. **Engine is sacred.** No change to coordinates `(q, r)`, adjacency, distance,
   pathfinding, map generation, save format, or AI. A saved game plays identically in 2D
   and 3D. See `02` for why this is both possible and necessary.
2. **Reuse the render-data seam.** The client already separates *what to draw* (the
   `useRenderData` hook) from *how to draw it* (the SVG layer components). The 3D renderer
   consumes the **same render data** and the **same interaction callbacks**. We are adding a
   second renderer, not rewriting the board.
3. **Reuse all art.** Every existing `.png` is reused as a texture. Entities that sit on
   hexes (units, cities) stay hex-shaped but gain depth (extruded hex tokens textured with
   their PNG). No new art is required to ship.
4. **Graceful fallback.** If WebGL is unavailable or the device is too weak, fall back to
   2D automatically and surface the choice in Preferences.
5. **No corners cut.** Parity with the 2D board (fog, borders, reachable tiles, path
   preview, hover, selection, minimap navigation, era modal) is a release requirement, not
   a stretch goal.
