# 06 — Preferences & Integration

This doc specifies the **2D/3D toggle** (3D default), how it persists, and the
`BoardRenderer` abstraction that branches the two renderers from one mount point.

## 1. The preference: `boardMode`

A new preference `boardMode: "2d" | "3d"`, default `"3d"`, persisted in `localStorage`,
following the existing pattern in `client/src/hooks/useCombatPreviewPreference.ts`.

```ts
// client/src/hooks/useBoardModePreference.ts  (new)
import { useCallback, useEffect, useState } from "react";
import { detect3DCapability } from "../components/GameMap3D/capability"; // WebGL probe

export type BoardMode = "2d" | "3d";
const STORAGE_KEY = "boardMode";

function readInitial(): BoardMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as BoardMode | null;
    if (stored === "2d" || stored === "3d") return stored;
  } catch { /* ignore */ }
  return "3d"; // 3D is the new default
}

export function useBoardModePreference() {
  const [boardMode, setBoardModeState] = useState<BoardMode>(readInitial);
  // Capability gate: if 3D unsupported, force 2D at runtime (do NOT overwrite stored pref).
  const supports3D = detect3DCapability();
  const effectiveMode: BoardMode = boardMode === "3d" && !supports3D ? "2d" : boardMode;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, boardMode); } catch { /* ignore */ }
  }, [boardMode]);

  const setBoardMode = useCallback((m: BoardMode) => setBoardModeState(m), []);
  const toggleBoardMode = useCallback(
    () => setBoardModeState(p => (p === "3d" ? "2d" : "3d")), []);

  return { boardMode, effectiveMode, supports3D, setBoardMode, toggleBoardMode };
}
```

`detect3DCapability()` does a one‑time `canvas.getContext("webgl2"||"webgl")` probe (and can
also honor a low‑power heuristic). The stored preference is preserved even when we fall back,
so a user who picks 3D keeps it when they move to a capable device.

## 2. Where the state lives & how it flows (mirrors `showShroud`)

The existing display toggles flow:

```
useAppUiFlow.ts            (owns showShroud/toggleShroud state)
  → useAppCoreState.ts     (re-exports)
  → useAppPresenterModel.tsx (maps to onToggle*)
  → InGameContent props    (showShroud, onToggleShroud)
  → HUD → GameMenu (Preferences panel checkbox)
```

`boardMode` follows the same path:

1. Add `boardMode`, `effectiveMode`, `setBoardMode` to **`useAppUiFlow.ts`** (using
   `useBoardModePreference`). 
2. Re‑export through **`useAppCoreState.ts`**.
3. Map in **`useAppPresenterModel.tsx`** to the props the presenter needs:
   - `boardMode={core.effectiveMode}` (what the renderer should use *now*)
   - `storedBoardMode={core.boardMode}` + `onSetBoardMode={core.setBoardMode}` (for the
     Preferences UI radio/toggle)
   - `supports3D={core.supports3D}` (to disable/annotate the 3D option when unsupported)
4. **`InGameContent.tsx`** uses `boardMode` to pick the renderer (next section), and passes
   `storedBoardMode/onSetBoardMode/supports3D` down through `HUD` into `GameMenu`.

## 3. The Preferences UI (Game → Preferences)

In `client/src/components/HUD/sections/GameMenu.tsx`, the existing Preferences panel
(Fullscreen, Show shroud, Show yields, Combat preview, Music…) gains a **Board** control at
the top:

```tsx
<div className="hud-section-subtitle">Board</div>
<label /* radio group */>
  <input type="radio" name="boardMode" checked={storedBoardMode === "3d"}
         onChange={() => onSetBoardMode("3d")} disabled={!supports3D} />
  3D world (default)
</label>
<label>
  <input type="radio" name="boardMode" checked={storedBoardMode === "2d"}
         onChange={() => onSetBoardMode("2d")} />
  2D map
</label>
{!supports3D && (
  <div className="hud-hint">3D is unavailable on this device; using 2D.</div>
)}
```

Switching is **live** (no reload): changing `boardMode` re‑renders `InGameContent`, which
swaps the renderer. Game state, selection, and camera target are preserved across the swap
where possible (selection/coord are in app state, not the renderer).

`GameMenu`'s props type extends with `storedBoardMode`, `onSetBoardMode`, `supports3D`, and
the chain in `HUD`/`InGameContent` passes them through (purely additive props).

## 4. The `BoardRenderer` seam (single branch point)

Today `InGameContent.tsx` mounts `<GameMap … />` directly. We introduce a thin selector and
**lazy‑load** the 3D bundle so the 2D path never pays for Three.js:

```tsx
// client/src/components/GameMap/BoardRenderer.tsx (new)
import React from "react";
import { GameMap, GameMapHandle } from "../GameMap";          // existing SVG board (2D)
const GameMap3D = React.lazy(() => import("../GameMap3D/GameMap3D")); // new 3D board

type BoardRendererProps = React.ComponentProps<typeof GameMap> & { boardMode: "2d" | "3d" };

export const BoardRenderer = React.forwardRef<GameMapHandle, BoardRendererProps>(
  ({ boardMode, ...props }, ref) => {
    if (boardMode === "2d") return <GameMap ref={ref} {...props} />;
    return (
      <ErrorBoundary fallback={<GameMap ref={ref} {...props} />}>
        <React.Suspense fallback={<BoardLoading />}>
          <GameMap3D ref={ref} {...props} />
        </React.Suspense>
      </ErrorBoundary>
    );
  }
);
```

Key properties:

- **Identical props.** `GameMap3D` accepts the exact `GameMapProps` and implements the same
  `GameMapHandle` (`centerOnCoord`, `centerOnPoint`). `InGameContent` changes only from
  `<GameMap …>` to `<BoardRenderer boardMode={boardMode} …>`. Nothing else in the in‑game
  tree changes.
- **Error boundary → 2D fallback.** Any runtime failure constructing the WebGL scene falls
  back to the SVG board automatically (and we can surface a toast + note in Preferences).
- **Suspense fallback.** While the 3D chunk loads, show a lightweight loader (or the 2D board
  as an instant placeholder).

## 5. New 3D module layout

```
client/src/components/GameMap3D/
  GameMap3D.tsx            ← forwardRef component; <Canvas>; consumes same props as GameMap
  capability.ts           ← detect3DCapability() WebGL probe
  projection.ts           ← createProjector(), hexToWorld3D, chooseWorldSurface (02 §2)
  surface.ts              ← cylinder/sphere meshes, caps, water, skybox
  TerrainInstances.tsx    ← instanced terrain prisms from tileRenderData
  UnitTokens.tsx          ← instanced unit tokens from unitRenderData* (+ adornments)
  CityTokens.tsx          ← city tokens + <Html> labels from cityOverlayData
  RiverRibbons.tsx        ← river ribbons from edge data
  BorderTubes.tsx         ← territory borders from cityBounds
  FogLayer.tsx            ← fog/shroud material variants
  OverlayDecals.tsx       ← resource/goodie/camp overlays
  useMap3DController.ts    ← camera + raycast picking + centerOnCoord; mirrors useMapController
  textures.ts             ← shared texture cache/atlas loader (08)
  lighting.tsx            ← sun + ambient + tonemapping
  elevation.ts            ← per-terrain relief table
  GameMap3D.test.tsx      ← render-data → scene-graph mapping tests (mock three / r3f)
```

The 3D module imports `useRenderData`, `useMapVisibility`, `useReachablePaths`, and the
engine hex utils — the **same** data hooks the SVG board uses. It does not duplicate game
logic.

## 6. Test & SSR considerations

- **Default 2D under test.** Unit tests for app flow should pass `boardMode="2d"` (or rely on
  `detect3DCapability()` returning false under jsdom) so existing component tests don't try to
  spin up WebGL. Add a test util to force `boardMode`.
- **Lazy import isolation.** Because `GameMap3D` is `React.lazy`, it is never imported in the
  2D path; tests that don't exercise 3D won't load three.
- **3D scene‑graph tests** mock `@react-three/fiber`/three (R3F provides a test renderer) and
  assert the **mapping** (e.g., N visible tiles → N terrain instances, a selected unit →
  selection adornment) rather than pixels.
- **Engine tests untouched.** No engine changes ⇒ `npm test -w engine` is unaffected.

## 7. Build & bundle

- `three`/`@react-three/fiber`/`@react-three/drei` added to `client` deps; the 3D module is a
  separate Vite chunk via `React.lazy`. Verify `npm run build -w client` emits a distinct
  chunk and the base bundle size is unchanged for 2D‑only users.
- No change to `server` or `engine` builds.

## 8. Net integration footprint

Files **added**: the `GameMap3D/*` module, `useBoardModePreference.ts`, `BoardRenderer.tsx`.
Files **edited** (all additive props / one mount swap):
`useAppUiFlow.ts`, `useAppCoreState.ts`, `useAppPresenterModel.tsx`, `InGameContent.tsx`,
`HUD.tsx`, `HUD/sections/GameMenu.tsx`, optionally `MiniMap.tsx` (focus marker in 3D),
`client/package.json`. **No engine edits. No SVG board deletions.**
