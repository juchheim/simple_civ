# HUD Refactor Plan

## Background
`client/src/components/HUD.tsx` has grown to ~380 lines and now mixes many UI responsibilities: selected-unit detail, linking controls, city management, diplomacy, build menus, action buttons, turn/notification banners, and tech navigation. The component relies on a long list of props/state selectors, has nested conditional rendering, and re-computes derived data inline, making it difficult to reason about or extend (e.g., adding new diplomacy options or city panels requires touching multiple disjoint sections). Refactoring into focused sub-components/hooks will improve readability, reuse, and testability.

## Goals
1. Separate HUD concerns into composable components (unit panel, city panel, action bar, diplomacy summary, turn info, etc.).
2. Introduce shared hooks/helpers for repeated logic (unit selection, build ordering, action dispatch wrappers).
3. Preserve all existing behaviors/UX (keyboard/mouse interactions, auto-select logic, button availability, tooltips).
4. Keep prop drilling manageable via context or structured prop models.
5. Expand test coverage (unit tests for helpers/components, at least smoke tests for new containers).

## Constraints
- No behavioral changes—pure UI refactor.
- Keep `HUD.tsx` as the exported entry point; internal modules live under `client/src/components/HUD/`.
- Maintain existing CSS classes/structure where feasible to avoid style regressions.
- Keep commits/PR chunks reviewable (<400 LOC diff per phase if possible).

## Proposed Phases

### Phase 0 – Inventory & Safeguards
1. Document current HUD responsibilities (unit controls, city panel, actions, diplomacy, turn info, tech button) in this plan.
2. Add targeted Vitest/RTL smoke tests (e.g., renders selected unit info, shows build buttons, toggles diplomacy action state) to lock key behaviors.
3. Confirm there is no dependency on precise DOM structure (search for `.HUD` selectors in CSS/tests).

#### Phase 0 Status (2025-11-24)
- **Turn/Research cluster**: turn counter, active player label, end-turn button, active tech progress, tech tree modal trigger.
- **Tile unit overview**: multi-unit selector for stacked units with auto-select when only one friendly unit.
- **Unit panel**: stats (moves/hp), linked partner context, Link/Unlink/Found City controls gated by turn ownership, link state, and unit type.
- **City panel**: city vitals (hp/pop/stores/build queue), idle build buttons (unit/building/project), worked-tile assignment grid, raze confirmation, city attack targeting, and handles `SetWorkedTiles` / `SetCityBuild` actions.
- **Action helpers**: prompt/confirm wrappers for city founding and razing, and button gating for radii/pop limits.
- **Diplomacy summary**: per-opponent war/peace state, offer buttons (declare war, propose/accept peace, offer/accept/revoke vision) with contact/offer guardrails and status copy.
- **Search audit**: `rg ".HUD"` across repo yields no CSS/test selectors, so DOM structure changes won't break styles/tests.
- **Safeguard tests**: Added `client/src/components/HUD/HUD.test.tsx` pulling Vitest/RTL to cover unit linking controls, idle build buttons (via mocked `canBuild`), and diplomacy offer acceptance so refactors keep existing behaviors.

_Exit criteria_: Plan updated with inventory; tests added to guard major features; HUD still monolithic.

### Phase 1 – Structural Split & Hooks
1. Create `client/src/components/HUD/hooks/` for shared logic:
   - `useSelectedUnits(selectedCoord, units, playerId)`
   - `useUnitActions(gameState, selectedUnit, onAction)`
   - `useCityBuildOptions(city, gameState)`
2. Introduce `client/src/components/HUD/sections/` to host initial sub-components (`TurnSummary`, `TechButton`, `UnitList`).
3. Update `HUD.tsx` to consume these helpers while keeping rendering inline for the remaining sections.

_Exit criteria_: Hooks in place; HUD component imports from hooks/sections; tests updated accordingly.

#### Phase 1 Status (2025-11-24)
- Added `hooks/use-selected-units.ts`, `hooks/use-unit-actions.ts`, and `hooks/use-city-build-options.ts` to encapsulate auto-selection, link/settler actions, and filtered build options (with shared option catalogs).
- Created `sections/TurnSummary.tsx`, `sections/TechButton.tsx`, and `sections/UnitList.tsx` plus barrel exports for reuse; layout/markup preserved to avoid CSS regressions.
- `HUD.tsx` now orchestrates via the new hooks/sections, slimming the top-level logic (unit panel still inline, but state derivations and research/unit list rendering are delegated).
- Existing Vitest smoke tests continue to pass against the refactored structure (`npm run test -w client`).

### Phase 2 – Unit & City Panels
1. Extract `UnitPanel` and `CityPanel` components (props-only, pure render).
2. Move linking/escort logic into `UnitPanel`, and build queue controls into `CityPanel`.
3. Ensure action callbacks remain typed and memoized to avoid unnecessary re-renders.
4. Add RTL tests covering each panel (unit actions enabled/disabled, city build buttons).

_Exit criteria_: Unit/city logic fully encapsulated; HUD renders these components with clear props; tests passing.

#### Phase 2 Status (2025-11-24)
- Added `sections/UnitPanel.tsx` to render unit stats, link/escort controls, and settler founding hook via memoized callbacks from `useUnitActions`.
- Added `sections/CityPanel.tsx` handling city vitals, idle build queues (fed by `useCityBuildOptions`), worked-tile assignment, raze confirmation hook, and city attack targeting using props-only data.
- `HUD.tsx` now memoizes all action handlers (`handleEndTurn`, `handleBuild`, `handleRazeCity`, `handleCityAttack`, `handleSetWorkedTiles`) before passing them to the new panels, keeping the entry component focused on composition.
- New RTL suites (`sections/UnitPanel.test.tsx`, `sections/CityPanel.test.tsx`) lock button enablement and build/tile assignment flows; overall client tests remain green via `npm run test -w client`.

### Phase 3 – Action Bar & Diplomacy Summary
1. Extract `ActionBar` (end turn, skip, city management buttons) and `DiplomacySummary` (war/peace status, offers).
2. Centralize button-state computation in helpers to avoid duplicate conditions.
3. Wire up existing `onAction` flows and ensure UI parity.

_Exit criteria_: Action/diplomacy sections isolated; shared helpers cover button enablement.

#### Phase 3 Status (2025-11-24)
- Added `sections/ActionBar.tsx` to compose the existing turn summary/end-turn controls, keeping space ready for future action buttons without duplicating logic inside `HUD.tsx`.
- Extracted the diplomacy UI to `sections/DiplomacySummary.tsx`, consuming a new helper (`helpers/diplomacy.ts`) that builds per-player button states (offers/contact/vision flags) so the component stays declarative.
- `HUD.tsx` now memoizes `diplomacyRows` once per render and simply renders `<DiplomacySummary>`/`<ActionBar>`; existing `onAction` flows are passed straight through, preserving behavior verified by the HUD smoke tests.
- Re-ran `npm run test -w client` to keep the regression suite green after the extraction.

### Phase 4 – Finishing Pass
1. Review `HUD.tsx` for leftover inline logic; reduce to orchestration/composition.
2. Ensure all new files have consistent typing, minimal prop drilling, and comments only where needed.
3. Update docs/changelogs if relevant (e.g., mention new structure in `docs/codebase_info/client.md`).
4. Run `npm run lint -w client` and `npm run build -w client`.

_Exit criteria_: `HUD.tsx` <150 lines, primarily layout/wiring; tests/lint/build green.

#### Phase 4 Status (2025-11-24)
- `HUD.tsx` now only wires hooks/components (`ActionBar`, `TechButton`, `UnitList`, `UnitPanel`, `CityPanel`, `DiplomacySummary`) plus memoized handlers; no inline UI logic remains.
- Added `client/.eslintrc.cjs` with TypeScript/React-Hooks rules (relaxed where legacy files rely on `any` or `_` placeholders) so `npm run lint -w client` succeeds; wired dependencies via client `package.json`.
- Updated `docs/codebase_info/client.md` to describe the new HUD subdirectory layout and shared hooks/helpers.
- Final verification: `npm run test -w client`, `npm run lint -w client`, and `npm run build -w client` all complete successfully.

## Testing & Verification
- Vitest/RTL suite for HUD hooks/components (`npm run test -w client`).
- Manual smoke: start a game, select units/cities, trigger unit link/unlink, set builds, toggle diplomacy, ensure actions still dispatch.
- Run `npm run build -w client` before final approval.

