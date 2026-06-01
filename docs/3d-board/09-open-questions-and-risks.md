# 09 — Open Questions & Risk Register

## Open questions (need a product/design decision)

| # | Question | Default assumption in this plan | Impact if changed |
|---|----------|---------------------------------|-------------------|
| Q1 | World shape feel: closed planet (full wrap, ocean seam) vs open drum (visible edge of world)? | **Open drum, `Φ≈330°`**, ocean rim (honest about bounded map). | Cosmetic + camera limits; both supported by the projector. |
| Q2 | Should units use extruded **hex tokens** (per request) or billboarded sprites for max readability? | **Hex tokens with depth**, top textured, civ‑color sides (matches the request). | Token model & adornments; sprite would be cheaper but less "3D". |
| Q3 | Terrain **relief** amount — subtle vs dramatic peaks? | Moderate relief; Mountains tallest. | Pure visual; elevation table tunable. |
| Q4 | Day/night & animated water, or fixed sun + simple water (keeps reused PNGs readable)? | **Fixed sun + simple water**, animation as optional polish. | Perf + art legibility. |
| Q5 | Camera: orbit‑around‑planet vs a gentler "curved tabletop" tilt? | **Orbit**, clamped tilt for readability. | Interaction feel; both via OrbitControls config. |
| Q6 | Minimap in 3D: focus marker vs a small live 3D inset? | **Focus marker** on the existing 2D SVG minimap (no new renderer). | Effort; inset is more work. |
| Q7 | Make 3D the default for **all** devices or gate low‑power devices to 2D by heuristic? | 3D default + WebGL capability gate; no aggressive perf gating initially. | UX on weak devices; can add a perf heuristic to `detect3DCapability`. |
| Q8 | Ship the experimental **sphere** view at all in v1, or cylinder‑only first? | Cylinder‑only for v1; sphere is Phase 5/optional. | Scope; sphere adds distortion handling work. |

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Performance on Huge map** (1,200 tiles + tokens) | Med | High | Instancing + atlas + `frameloop="demand"` + chunked culling + BVH picking (`04`,`07`); perf budget gate before release. |
| **Bundle size** of three/R3F/drei | Med | Med | Code‑split via `React.lazy`; 2D path loads nothing extra; verify chunk in build. |
| **WebGL unavailable / GPU driver bugs** | Med | Med | Capability probe + error boundary → automatic 2D fallback; preserve stored pref. |
| **Reused PNGs look wrong in 3D lighting** (already‑lit sprites washed out) | Med | Med | Flat-ish lighting + sRGB + tonemapping tuned to match 2D; minimal sun contrast. |
| **Picking accuracy** on curved/instanced meshes | Low | Med | Raycast with instanceId→coord table; unit tests on projector inverse; visual hover debug. |
| **Minimap/`MapViewport` mismatch** (no true rect in 3D) | Low | Low | Camera‑derived approximate viewport + focus‑marker minimap variant (`05 §4`). |
| **Era modal lives in `GameMap.tsx`** (2D component) | Low | Low | Hoist era‑change effect above `BoardRenderer` or replicate in `GameMap3D` (`07` Phase 2). |
| **Hidden flat‑grid assumptions** in client code | Low | Med | All such logic is engine/render‑data (projection‑independent); 3D only swaps projection + draw. Audited in `01`. |
| **GPU memory leaks** across mode toggles / reloads | Med | Med | Central texture cache + explicit dispose on teardown; leak test in Phase 4. |
| **Scope creep into engine** (someone "adds wrap") | Low | High | Hard rule in `00`/`02`: engine topology frozen; 3D is render‑only; enforce in review. |
| **Test suite tries to init WebGL** under jsdom | Med | Low | Lazy import + default 2D under test + R3F test renderer for scene tests (`06 §6`). |
| **Touch UX regressions** | Med | Med | Port existing touch thresholds; manual device matrix in `07`. |

## Explicitly out of scope (restating, to prevent drift)

- Changing coordinates, adjacency, distance, pathfinding, map generation, AI, or save format.
- True geodesic/Goldberg hex‑sphere world (different engine; breaks saves) — see `02 §5`.
- Globe wrap‑around movement / east–west adjacency.
- New 3D‑authored or rigged/animated unit models.
- Server/multiplayer changes.

## Decision log (to be filled during implementation)

| Date | Decision | Rationale | By |
|------|----------|-----------|----|
| _TBD_ | Cylinder default, sphere deferred | `02` math: sphere not viable for current map aspect/bounded grid | — |
| _TBD_ | Three.js + R3F + drei | React fit, ecosystem, render‑data seam (`03`) | — |
