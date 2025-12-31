# 07 - Enforce War-Only Attack Gating

## Status
- Completed.
- Added border violation detection in `engine/src/game/helpers/diplomacy.ts` and war declaration handling in `engine/src/game/ai2/diplomacy.ts`.
- War planning now avoids stacking additional war declarations in the same turn after a border violation response.

## Purpose
Ensure AI attacks only occur when at war, or after a border violation that triggers war. Defensive combat helpers must not attack during peace.

## Goals
- Gate all combat actions behind war state or explicit war declaration.
- If an enemy violates borders, declare war before attacking.
- Prevent accidental peace-time attacks from defense modules.

## Non-Goals
- Do not change diplomacy scoring or war declaration strategy here.
- Do not add new UI or player-facing systems.

## Files to Update
- `engine/src/game/ai2/defense-combat/home-defender.ts`
- `engine/src/game/ai2/defense-combat/ring-combat.ts`
- `engine/src/game/ai2/defense-combat/last-stand.ts`
- `engine/src/game/ai2/defense-combat/focus-fire.ts`
- `engine/src/game/ai2/defense-garrison.ts` (if it issues attacks)
- `engine/src/game/ai2/tactical-planner.ts`
- `engine/src/game/ai2/diplomacy.ts`
- `engine/src/game/helpers/diplomacy.ts`

## Current State
- Offense planning uses `warEnemyIds` but some defense helpers use nearby enemies without verifying war state.
- There is no explicit “border violation triggers war” hook in defensive tactics.

## Implementation Plan

### Step 1: Add or reuse a border-violation check
Define a helper (if one does not exist) to detect enemy units inside our territory when at peace. Use it to trigger war declaration before any attack actions are generated.

Suggested approach:
- Use a helper like `isEnemyInTerritory(state, playerId, enemyId)` that checks tile ownership for enemy units.
- If peace and violation is detected and `canDeclareWar` is true, plan a `SetDiplomacy` action to War and only then schedule attacks.

### Step 2: Gate defensive attacks
In each defense-combat planner:
- Filter `nearbyEnemies` using `getWarEnemyIds(state, playerId)`.
- If no war enemies exist, return no attack actions unless a border violation triggers a war declaration.

### Step 3: Centralize war gating in tactical planner
Add a planner-level gate so any attack action is only scheduled if:
- The enemy is in `warEnemyIds`, or
- A planned war declaration is included earlier in `plan.actions`.

### Step 4: Avoid illegal action ordering
Ensure the action list always declares war before any attacks in the same turn if triggered by border violation.

## Acceptance Criteria
- AI never attacks while at peace unless war is declared first.
- Defensive combat helpers do not bypass war gating.
- Existing war declaration logic remains intact.

## Suggested Tests
- Add tests that place an enemy unit inside territory at peace and confirm AI declares war before attacking.
- Confirm no attacks occur without war in `engine/src/test/game/ai2/tactical_planner.test.ts`.
