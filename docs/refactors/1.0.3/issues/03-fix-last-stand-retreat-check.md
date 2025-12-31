# 03 - Fix Last-Stand Retreat Detection

## Priority
Medium. The last-stand retreat check only considers enemy occupancy and distance and ignores terrain/blocked paths.

## Why This Matters
- Units are flagged as "able to retreat" even when the path is blocked by terrain or friendly units.
- This suppresses the last-stand behavior in situations where it should trigger.

## Current Hotspot
- `engine/src/game/ai2/defense-combat/last-stand.ts` (`checkCanRetreat`)

## Goals
- Determine if a unit has a realistic retreat path to a friendly city.
- Use the same movement rules as real moves (terrain, occupancy, domain).

## Plan
1. Replace the neighbor-only check with a real path check:
   - Use `findPath` or `createMoveContext` to validate passability.
   - Treat "no path" as cornered.
2. Respect terrain and occupied tiles:
   - Exclude tiles blocked by impassable terrain or friendly/enemy units.
3. Keep performance bounded:
   - Limit path search radius (e.g., 6-8 tiles) since this is a tactical emergency check.

## Files to Update
- `engine/src/game/ai2/defense-combat/last-stand.ts`
- Optional helper: `engine/src/game/ai2/movement.ts` (if you want a shared "canRetreat" utility)

## Tests
- Add a test case with an enclosed unit where all exits are blocked by mountains or units; last-stand should trigger.
- Add a test case where a clear path exists; last-stand should not trigger.

## Acceptance Criteria
- Last-stand triggers only when a unit has no valid path to safety.
- Behavior is deterministic and consistent with actual movement rules.
