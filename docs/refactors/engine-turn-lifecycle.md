# Engine Turn Lifecycle Refactor Plan

- Scope: `engine/src/game/turn-lifecycle.ts` (`handleEndTurn`, `advancePlayerTurn`, `runEndOfRound`, `completeBuild`).
- Problems: single flow handles state transitions, healing, attrition, auto-actions, city economy, build resolution, and civ-specific rules. Hard to extend, risky side effects, minimal seams for testing.

## Goals
- Decompose turn processing into pure, testable phases (start-of-turn reset, upkeep, city economy, builds, research, end-of-round victory).
- Isolate civ-specific modifiers (JadeCovenant, ForgeClans, AetherianVanguard) behind capability helpers to avoid scattering conditionals.
- Make build completion deterministic with reusable spawn helpers and overflow handling.
- Sequence work to limit drift: introduce helpers first, then move phases incrementally.

## Proposed Approach (low-drift order)
1) **Helper foundation:** add capability helpers (`getCivBonuses`), spawn helper skeletons (ID generation, terrain validation), and growth/build utility functions with tests; keep existing lifecycle untouched.
2) **Start-of-turn phase:** extract `startPlayerTurn` (phase set, tech autoselect, flag resets, attrition) to call helpers. Wire `advancePlayerTurn` to use it; add tests.
3) **Movement refresh + auto behaviors:** move moves/attack reset, captured grace, vision refresh, and auto-move/explore trigger into dedicated functions. Swap calls in `advancePlayerTurn`; test movement resets.
4) **City economy phase:** extract city loop (healing, yields, growth, territory claims). Use helpers for growth cost/claiming. Wire back; add tests for healing/growth edge cases.
5) **Build processing:** move build resolution into `processBuildQueues` using spawn/apply reward helpers. Keep RNG semantics; test unit spawn placement, Jade/Titan special cases, project yields.
6) **Research and victory:** keep `runEndOfRound` as orchestrator but isolate research tick into a small function; ensure tests cover victory ordering.
7) **Cleanup:** delete old inline logic once all phases call helpers; run full tests.

## Baseline to capture before coding
- Current order of side effects: phase switch, vision refresh timing, auto behaviors run after move resets, city processing order, research tick placement, victory checks at end of round.
- RNG/ID generation formula for unit/project spawns and use of `state.seed`; record to avoid save incompatibility.
- Logging expectations in healing/city messages; decide whether to gate with debug flag or preserve strings.
- Couplings: `processAutoExplore/processAutoMovement` signatures, `ensureWorkedTiles/claimCityTerritory` behaviors, civ-specific modifiers (Jade, ForgeClans, Aetherian) numeric values.

## Test Strategy
- Unit tests per phase:
  - Movement reset (captured grace, Jade settler moves).
  - City healing/growth with/without damage, Farmstead/Jade granary modifiers.
  - Build completion for units (spawn location search), TitansCore, Jade Granary free settler, project yield grants.
- Regression: turn order phase transitions and research completion.
- Run `npm test -w engine`.

## Risks / Notes
- Preserve RNG/ID generation semantics to avoid breaking saves/replays.
- Keep console logging minimal or route through debug flag to avoid noisy tests.
- Move one phase at a time and land after tests to reduce drift; avoid touching UI-facing strings.

## Status
- ✅ Helper foundation: capability helpers, spawn/build utilities (`helpers/builds`, `helpers/spawn`, `helpers/turn`) and movement reset helpers (`helpers/turn-movement`).
- ✅ Start-of-turn extracted (`startPlayerTurn`) with tech selection, healing/attrition, move reset, status clears, vision refresh, auto behaviors.
- ✅ Movement reset/auto behaviors: `resetUnitsForTurn`, `resetCityFireFlags`, `runPlayerAutoBehaviors` reused in lifecycle.
- ✅ City economy/build processing: city loop extracted (`processCityForTurn`/`processCityBuild`), uses shared growth/claiming helpers.
- ✅ Research/victory handled via `processResearch` and end-of-round sweep preserved.
- 🧪 Tests: `npm test -w engine`.
