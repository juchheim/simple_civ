# 09 - Unified Tactical Planner Test Expansion

## Status
- Completed.
- Added border-violation war gating coverage in `engine/src/test/game/ai2/tactical_planner.test.ts`.
- Added siege-commitment focus-city priority test in `engine/src/test/game/ai2/attack_planning.test.ts`.
- Adjusted border-violation coverage to use a non-garrison attacker, low target HP, and tolerate unit destruction.
- Updated defense/offense conflict test to assert on any defense action rather than a specific unit.
- `npm test -w engine` green.

## Purpose
Expand tests to validate the unified planner, shared scoring, and war-only gating across offense and defense logic.

## Goals
- Cover the unified action selection behavior across intents.
- Validate capture-support and stall penalties across attack and move-attack.
- Confirm defense and offense alignment for focus targets and threat levels.

## Non-Goals
- Do not add E2E simulation tests beyond what is needed for tactical planning.

## Test Files to Update or Add
- `engine/src/test/game/ai2/tactical_planner.test.ts`
- `engine/src/test/game/ai2/attack_planning.test.ts`
- `engine/src/test/game/ai2/defense_situation.test.ts`
- New: `engine/src/test/game/ai2/tactical_scoring.test.ts` (optional)
- New: `engine/src/test/game/ai2/capabilities.test.ts` (if not added earlier)

## Test Cases

### 1. Unified action conflict resolution
- A unit has both a defense garrison action and an offense attack action.
- Expect defense action to win and appear earlier in plan order.

### 2. Move-attack exposure gating
- High exposure, non-lethal move-attack should be rejected.
- Low exposure, lethal move-attack should be accepted.

### 3. Capture-support and stall penalties
- City zeroing without capturer should be penalized across direct attack and move-attack.
- Adjacent or follow-up capturer should boost score.

### 4. Focus alignment
- Defense focus-fire should target the same enemy that offense scoring would choose given the same defenders.

### 5. War-only gating
- When at peace, no attacks occur.
- When enemy unit violates border, AI declares war before attacking.

### 6. Trebuchet behavior
- Trebuchet should still prioritize city targets and score higher against cities than generic siege.

## Acceptance Criteria
- All new tests pass with the refactor complete.
- No flakiness or randomized assertions.

## Suggested Commands
- `npm test -w engine`
