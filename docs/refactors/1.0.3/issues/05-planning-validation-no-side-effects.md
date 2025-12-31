# 05 - Remove Planning-Time Side Effects from Validation

## Priority
Medium. Planning stages call `tryAction` to validate moves/attacks. This can mutate global validation state and skew subsequent planning.

## Why This Matters
- Planning may mark actions as failed, suppressing later candidate actions.
- Planning may reserve tiles even though conflict resolution will reject the action.
- This creates invisible coupling between planner steps and can hide good actions.

## Current Hotspots
- `engine/src/game/ai2/defense-garrison.ts`
- `engine/src/game/ai2/defense-ring.ts`
- `engine/src/game/ai2/defense-mutual-defense.ts`
- `engine/src/game/ai2/defense-combat/*` (where `tryAction` is used for validation)

## Goals
- Planning should be pure (no side effects).
- Validation should use the same rules as runtime, without mutating global validation state.

## Plan
1. Add a "dry-run" validator:
   - New helpers like `canPlanMove` and `canPlanAttack` that call the existing validation checks without applying actions.
   - Do not update `failedActions` or reserved tiles.
2. Replace `tryAction` in planning code:
   - Use `canPlanMove` for move checks.
   - Only use `tryAction` when executing the final plan.
3. Keep a single source of truth for validation rules:
   - Reuse `canAttemptMove` and `canAttemptAttack` logic where possible.

## Files to Update
- `engine/src/game/ai/shared/validation.ts` (expose non-mutating validation utilities)
- Planner modules listed above

## Tests
- Add a test that ensures a failed planning candidate does not suppress a later valid candidate in the same turn.

## Acceptance Criteria
- Planning does not mutate validation state.
- Execution still uses `tryAction` and enforces all rules.
