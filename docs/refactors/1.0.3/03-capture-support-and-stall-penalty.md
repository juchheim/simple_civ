# 03 - Centralize Capture Support and Stall Penalties

## Status
- Completed.
- Added `evaluateCaptureSupport` in `engine/src/game/ai2/tactical-scoring.ts`.
- Wired `scoreCityAttack` to use the shared helper and re-exported it via `engine/src/game/ai2/attack-order/scoring.ts`.

## Purpose
Make city capture logic consistent across attack-order, move-attack, and defensive scoring by centralizing capture support checks and stall penalties.

## Goals
- Define a shared helper that evaluates capture readiness and penalties.
- Ensure city-zeroing without capture support is penalized everywhere.
- Keep Trebuchet city-only siege behavior intact.

## Non-Goals
- Do not change city combat or capture rules.
- Do not add new capture mechanics.

## Files to Update
- `engine/src/game/ai2/tactical-scoring.ts` (or a new helper module used by it)
- `engine/src/game/ai2/attack-order/scoring.ts` (adapter only)
- `engine/src/game/ai2/attack-order/move-attack.ts`
- `engine/src/game/ai2/defense-combat/tactical-defense.ts`
- Optional: `engine/src/game/ai2/combat-eval.ts` if it bypasses scoring

## Current State
- Capture bonus and stall penalty live inside `scoreCityAttack` in `attack-order/scoring.ts`.
- Move-attack logic uses `scoreAttackOption` but could bypass capture support logic in some edge cases.
- Defensive focus-fire and other actions might attack cities without consistent stall penalties.

## Implementation Plan

### Step 1: Create a capture support helper
In `tactical-scoring.ts` (or a separate `tactical-capture.ts`), add:
- `evaluateCaptureSupport(state, playerId, attacker, city, damage, targetHpOverride)` returning:
  - `wouldDropToZero`
  - `canCaptureNow` (attacker can capture and is adjacent)
  - `followUpCapture` (adjacent capturer with moves and not garrisoned)
  - `captureBonus`
  - `stallPenalty`

Keep bonus and penalty values aligned with the existing behavior:
- `canCaptureNow` -> large bonus (currently +320 + 200 * siegeCommitment)
- `followUpCapture` -> smaller bonus (currently +120 + 120 * siegeCommitment)
- `wouldDropToZero` without capture support -> strong penalty (currently -350 or -800)

### Step 2: Wire into city attack scoring
Ensure `scoreCityAttack` uses the helper output for bonuses and penalties.

### Step 3: Apply to move-attack and defense scoring
- For move-attack actions that target cities, make sure the same capture logic applies.
- For any defensive city attack logic (if present), apply stall penalties consistently.

### Step 4: Validate
Add or update tests in `engine/src/test/game/ai2/attack_planning.test.ts` to ensure:
- City-zeroing without capturer is penalized in both direct attacks and move-attacks.
- Capture support bonus applies consistently.

## Acceptance Criteria
- A single helper defines capture bonus and stall penalty behavior.
- All city-targeting scoring paths use the helper.
- No behavior regression in existing tests.

## Notes
- Trebuchet cannot capture; penalties should be harsher when only siege units can zero the city.
- Avoid adding new state mutations in the scoring helper.
