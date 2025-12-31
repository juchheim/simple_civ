# 04 - Remove Legacy Defense Entry Points

## Priority
Medium. Several defense functions are now unused after the unified planner refactor but still exported, which adds confusion and invites accidental re-use.

## Why This Matters
- Dead code makes the system harder to reason about.
- Some comments still reference the old pipeline (e.g., "handled separately in defendCitiesV2").

## Current Hotspots
- `engine/src/game/ai2/defense.ts`
- `engine/src/game/ai2/defense/steps.ts` (run-phase pipeline)
- `engine/src/game/ai2/defense-ring.ts` (old run-phase)
- `engine/src/game/ai2/defense-mutual-defense.ts` (old run-phase)
- `engine/src/game/ai2/defense-combat/focus-fire.ts` (old run-phase)

## Goals
- Remove unused runtime entry points.
- Keep only the planner-driven API surface.

## Plan
1. Delete or unexport run-phase entry points that are no longer referenced:
   - `defendCitiesV2`
   - `runDefenseAssignments` (run-phase)
   - `positionDefensiveRing`
   - `sendMutualDefenseReinforcements`
   - `coordinateDefensiveFocusFire`
   - `runHomeDefenderCombat`, `runDefensiveRingCombat`, `runLastStandAttacks`
2. Update comments that reference the old flow.
3. Ensure any remaining exports are planner-only ("planX" functions).

## Files to Update
- `engine/src/game/ai2/defense.ts`
- `engine/src/game/ai2/defense/steps.ts`
- `engine/src/game/ai2/defense-ring.ts`
- `engine/src/game/ai2/defense-mutual-defense.ts`
- `engine/src/game/ai2/defense-combat/focus-fire.ts`

## Tests
- No new tests required. Ensure `npm test -w engine` stays green.

## Acceptance Criteria
- No unused defense functions remain in the public API.
- Comments and docs reference only the unified planner path.
