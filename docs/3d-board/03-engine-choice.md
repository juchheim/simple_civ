# 03 — 3D Engine Choice

## Recommendation

Use **Three.js** as the WebGL engine, integrated with **react-three-fiber (R3F)** and
**drei**, because the client is a React 18 + Vite app and R3F lets the 3D scene be expressed
as React components driven by the same hooks/state the SVG board already uses.

```
three                      // core WebGL engine
@react-three/fiber         // React renderer for three (declarative scene graph)
@react-three/drei          // helpers: OrbitControls, Html labels, useTexture, Instances, Bvh
three-mesh-bvh (optional)  // accelerated raycasting for picking on large maps
```

Install (pin to current majors at implementation time; do not invent versions — let the
package manager resolve latest compatible):

```bash
npm install three @react-three/fiber @react-three/drei -w client
npm install -D @types/three -w client
# optional, only if raycast profiling shows a need on Huge maps:
npm install three-mesh-bvh -w client
```

## Why this stack

- **React-native fit.** The board lives inside `InGameContent.tsx` next to the HUD; R3F
  mounts a `<Canvas>` that participates in the same React tree, so the 3D board can read the
  exact same props (`gameState`, `selectedUnitId`, callbacks) the SVG `GameMap` reads today.
  No bespoke imperative bridge to keep in sync with React state.
- **Declarative parity with the render‑data seam.** `useRenderData` already yields arrays of
  descriptors. In R3F those map naturally to `<Instances>`/`<instancedMesh>` and component
  lists, mirroring how the SVG layers map them to elements today.
- **Batteries included (drei).** `OrbitControls` (camera), `<Html>` (screen‑space city
  labels — replaces SVG `CityLabelLayer`), `useTexture` (loads the existing PNGs),
  `<Instances>`/`<Merged>` (instancing for 1,200 hexes), `Bvh` (fast picking). Each maps to a
  concrete need below.
- **Maturity & longevity.** Three.js is the de‑facto standard WebGL library with the largest
  ecosystem and documentation surface; low risk of abandonment.
- **Bundle is acceptable and lazy‑loaded.** Three + R3F + drei is sizeable (hundreds of KB
  gzipped), but the 3D board is **code‑split** (`React.lazy`) so it only loads when the 3D
  renderer is actually used; the 2D path pays nothing. See `06`/`07`.

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| **Babylon.js** | Viable, not chosen | Excellent engine, but heavier React integration story; team already in React idiom; R3F ecosystem (drei) covers our needs with less glue. |
| **PixiJS (2.5D)** | Rejected for "true 3D" | Great 2D/WebGL perf but it is a 2D renderer; a curved planet with real depth/lighting is awkward. Could power a faster *2D* board later, orthogonal to this effort. |
| **Raw WebGL / regl** | Rejected | Maximal control, maximal cost; no reason to hand‑roll what Three provides. |
| **Globe libraries (globe.gl, three‑globe)** | Rejected | Built around lat/long data‑viz on full spheres; they assume the very sphere mapping `02` shows is wrong for our bounded hex grid. |
| **CSS 3D transforms** | Rejected | Cannot do per‑hex relief, lighting, or efficient picking at 1,200 tiles. |

## Constraints & guardrails for the integration

- **SSR/test safety.** Vitest + jsdom has no WebGL. The 3D module must be lazy‑loaded and
  never imported by code paths exercised in unit tests unless mocked. Components that read
  the preference must default‑render the 2D branch under test (see `06`).
- **Single source of state.** Three runs its own render loop, but it must treat React/game
  state as the source of truth. No game state lives in the 3D scene; the scene is a pure
  function of render data (same contract as SVG).
- **Resource lifecycle.** Geometries, materials, and textures are disposed on unmount and on
  map change to avoid GPU leaks (R3F disposes most automatically; shared cached textures are
  disposed centrally — `08`).
- **Color management.** Use `THREE.SRGBColorSpace` for texture color and the modern
  lighting/tonemapping defaults so the reused PNGs look correct, matching their 2D appearance
  as closely as possible.

## Version policy

Pin to the latest stable majors available when Phase 0 starts and record the resolved
versions in `client/package.json` + this doc. Do not hand‑write version numbers in advance;
the agent installs via npm so the lockfile is authoritative.
