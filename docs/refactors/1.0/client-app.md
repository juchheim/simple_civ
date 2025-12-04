# Client App Component Refactor Plan

- Scope: `client/src/App.tsx` (game session lifecycle, UI state, tile/unit interaction, modals).
- Problems: ~700 lines combining session restore, title screen setup, hotkeys, move/attack logic, diplomacy prompts, save/load/restart, and selection handling. State proliferation and inline engine calls make changes risky.

## Goals
- Split responsibilities: session shell, game UI controller, and interaction handlers.
- Reduce prop drilling and inline logic; move heavy handlers to dedicated hooks/services.
- Preserve UX flows (war declaration prompt, auto-explore deselects, error auto-clear) while making them testable.
- Sequence changes to keep behavior stable and minimize merge risk.

## Proposed Approach (low-drift order)
1) **Session shell first:** wrap existing `App` with a thin `AppShell` that only hosts title vs game screens and modals; no logic moves yet. Add minimal tests if possible.
2) **Extract interaction controller:** move selection/hover/pending-war state and `handleTileClick` into `useInteractionController` while keeping function bodies intact. Wire `App` to use the hook. Add tests for selection flow.
3) **Refine handlers:** inside the hook, split `handleTileClick` into helpers (`maybeAttackUnit`, `maybeAttackCity`, `maybeSwapOrStack`, `planMovePath`, `queueAutoMove`) without changing behavior. Test each helper.
4) **Hotkeys + menus:** move Escape/menu toggles into `useGlobalHotkeys`; ensure parity with current behavior before further refactors.
5) **Session commands:** extend `useGameSession` return shape for clearer command API; update callers gradually (save/load/restart). Keep alerts/console output stable.
6) **Cleanup:** remove legacy inline handlers after new hook is stable. Keep prop API the same for child components.

## Baseline to capture before coding
- Current keyboard shortcuts (Escape behavior) and menu toggle logic.
- Tile click outcomes matrix (attack vs move vs swap vs select, war modal gating) for regression tests.
- Error handling flows: auto-clear after 3s, alert usage for save/load/restart failures.
- Dependencies on action error strings from the engine; note any UI expectations before refactoring.

## Risks / Notes
- Ensure saved game restoration still bypasses title screen as today.
- Keep alerts/console semantics or route through a toast system to avoid breaking UX expectations.
- Land steps incrementally (shell → controller → handler split → hotkeys) to reduce churn and drift.

## Status
- ✅ AppShell wraps title vs game content; App now renders through the shell.
- ✅ Interaction controller extracted to `useInteractionController` (selection/hover/pending war, reachable paths, tile-click logic) and wired into `App`.
- ✅ Interaction controller split into helper callbacks; Escape/menu hotkeys moved into `useGlobalHotkeys`.
- 🧪 Ran `npm run lint -w client`; added `useInteractionController` hook tests covering war prompts, immediate attacks, stacking, and planned paths (`npm test -w client -- useInteractionController.test.tsx`).
- ✅ Session command API cleaned (`useGameSession` now exposes `saveGame`/`loadGame` etc.; `App` updated to use commands).
- ✅ Trimmed remaining inline session handlers in `App` into callbacks for clarity.
- ✅ Added `useGlobalHotkeys` coverage (`npm test -w client -- useGlobalHotkeys.test.tsx`).
- Next: continue planned controller/helper refinement as needed and proceed to the next refactor target.
