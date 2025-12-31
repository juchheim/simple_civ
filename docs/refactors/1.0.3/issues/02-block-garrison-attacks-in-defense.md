# 02 - Enforce No-Garrison Attacks in Defense Planning

## Priority
High. Defense focus-fire currently schedules garrisoned units as attackers even though garrisoned units cannot attack.

## Why This Matters
- Planned actions are invalid and always fail at execution time.
- This wastes a unit slot and can suppress a valid action due to conflict resolution.

## Current Hotspots
- `engine/src/game/ai2/defense-combat/tactical-defense.ts` (`planFocusFireActions`)
- `engine/src/game/actions/unit-combat.ts` (throws on garrison attack)

## Goals
- Defense planners must never schedule garrisoned units as attackers.
- Action lists should only include valid actions that can execute.

## Plan
1. Filter attackers in `planFocusFireActions`:
   - Exclude garrisoned units explicitly (use `isGarrisoned` helper).
2. Audit other defensive attack planners:
   - Ensure `planSortieActions`, `planHomeDefenderAttacks`, and `planDefensiveRingCombat` do not use garrisoned units.
   - Add garrison filtering where needed.
3. Add a safety guard:
   - If a defense planner receives a garrison unit, skip it with a comment to prevent regressions.

## Files to Update
- `engine/src/game/ai2/defense-combat/tactical-defense.ts`
- `engine/src/game/ai2/defense-combat/ring-combat.ts`
- `engine/src/game/ai2/defense-combat/home-defender.ts`

## Tests
- Add a test in `engine/src/game/ai2/tactical-defense.test.ts` that asserts garrison units are not included as attackers in focus-fire actions.

## Acceptance Criteria
- No defense plan includes a garrisoned unit as an attacker.
- All defense actions in the plan are executable without the garrison attack error.
