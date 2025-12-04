# Engine Actions/Units Refactor Plan

- Scope: `engine/src/game/actions/units.ts` (movement, linking, combat, auto-move/explore, swapping).
- Problems: single 700+ line file, mixed responsibilities, repeated lookups with `any` typing, recursive attack redirection, auto-move path loops, vision updates interleaved with state mutations.

## Goals
- Separate command handling by domain (movement/linking, combat, automation) with clear inputs/outputs.
- Centralize unit/city lookups and occupancy validation to remove ad hoc scans.
- Make attack flow deterministic and testable (no recursion, explicit phases).
- Reduce auto-move/explore complexity while preserving behavior and vision updates.
- Minimize drift risk by moving logic in small, gated slices with tests after each slice.

## Proposed Approach (low-drift order)
1) **Lay foundation:** add shared lookup/validation helpers (`getUnitOrThrow`, `getCityAt`, `assertOwnership`, `assertMovesLeft`, `assertAdjacent`, occupancy validator) plus typed action payloads. Add unit tests for helpers before moving handlers.
2) **Movement/linking first:** move `handleMoveUnit`, link/unlink, swap into a new module using helpers. Keep signatures and error strings stable. Add tests for stacking/link rules and move costs. Only then wire imports.
3) **Combat next:** create combat module with `resolveAttack` (no recursion). Port attack logic, garrison redirect, escort redirection, retaliation into helpers. Add tests for each branch, then swap handler to new module.
4) **Automation last:** port `processAutoMovement`/`processAutoExplore` to automation module, reuse pathfinding/lookup helpers. Keep current behavior (failed targets, partial paths) but add iteration guards. Add tests, then switch exports.
5) **Vision touchpoints:** ensure only needed calls to `refreshPlayerVision` remain; add tests asserting vision is refreshed once per outer action.
6) **Cleanup:** remove dead code and `any` usage after all handlers point to shared helpers; run full engine tests.

## Baseline to capture before coding
- Note current error strings thrown by action handlers (movement, attack, swap, link) to ensure UI expectations remain.
- Verify current auto-move iteration caps (`MAX_MOVES = 10`) and partial path behavior so tests can lock them.
- Record when vision refresh happens today (after move, after swap, during auto-move) to assert parity.
- List coupling points: `refreshPlayerVision`, `ensureWar`, `findPath/findReachableTiles`, and unit link semantics.

## Test Strategy
- Add focused tests per module:
  - Movement: stacking/link swap rules, adjacency, movesLeft consumption.
  - Combat: garrison redirect, escort redirection, retaliation ranges, war auto-declare.
  - Automation: stuck targets cleared, partial path behavior, revealed tiles stop auto-explore.
- Run `npm test -w engine`.

## Risks / Notes
- Keep action error strings stable if UI relies on them.
- Ensure vision refresh timing remains compatible with auto-explore heuristics.
- Land changes one block at a time (movement → combat → automation) to reduce merge conflicts.

## Status
- ✅ Foundations: added typed action payloads and shared helpers (`action-helpers`, lookup/validation, unit action types).
- ✅ Movement/linking: `handleMoveUnit`/swap/link/unlink/fortify moved to `unit-movement.ts` using helpers; stacking/territory validation covered by `action-helpers.test.ts`.
- ✅ Combat: attack flow extracted to `unit-combat.ts` (no recursion) with garrison/escort handling.
- ✅ Automation: auto-move/explore lives in `unit-automation.ts` with iteration guards and shared helpers.
- 🧪 Tests: `npm test -w engine`.
