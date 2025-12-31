# 05 - Fold Defense Pipeline Into Unified Tactical Plan

## Status
- Completed.
- Defense steps now emit planned move/attack actions and are merged into the unified tactical plan in `engine/src/game/ai2/tactical-planner.ts`.
- Offense planning excludes reserved defense units via `planAttackOrderV2` and `planMoveAndAttack` optional exclusions.
- Offense planning also excludes units currently garrisoned to keep city defenders in place.
- Validation context is reset before executing the unified plan to avoid planning-time `tryAction` reservations blocking real moves.
- Defense actions execute in `executeTacticalPlan` rather than pre-planning mutation.

## Purpose
Convert the defense pipeline from immediate execution into planned actions that the unified tactical planner can execute in one pass. This removes split pipelines and ensures consistent conflict resolution.

## Goals
- Replace pre-execution defense steps with planned actions.
- Ensure defense actions are visible in `TacticalPlan.actions`.
- Prevent offense planning from using units already reserved for defense.

## Non-Goals
- Do not remove existing defense heuristics.
- Do not change unit movement rules.

## Files to Update
- `engine/src/game/ai2/tactical-planner.ts`
- `engine/src/game/ai2/defense.ts`
- `engine/src/game/ai2/defense-ring.ts`
- `engine/src/game/ai2/defense-garrison.ts`
- `engine/src/game/ai2/defense-mutual-defense.ts`
- `engine/src/game/ai2/defense-combat/*`
- `engine/src/game/ai2/tactical-context.ts`

## Current State
- `planTacticalTurn` runs `runDefensePipeline` (which mutates state) before building offense plans.
- Defense action planning exists but is executed immediately.
- Offense planning does not know which units were consumed by defense actions.

## Implementation Plan

### Step 1: Convert defense steps to planners
Refactor each defense step to return action candidates rather than mutating state:
- `defense-garrison.ts` -> `planGarrisonActions`
- `defense-ring.ts` -> `planRingActions`
- `defense-mutual-defense.ts` -> `planReinforcementActions`
- `defense-combat/home-defender.ts` -> `planHomeDefenseAttacks`
- `defense-combat/ring-combat.ts` -> `planRingCombatAttacks`
- `defense-combat/last-stand.ts` -> `planLastStandAttacks`

Each should output `TacticalActionPlan[]` with appropriate intent and scoring.

### Step 2: Reserve units for defense
Extend `TacticalContext` with a `reservedUnitIds` set. Populate it from defense plans before offense planning. In offense planners, exclude reserved units from candidate generation.

### Step 3: Remove pre-execution pipeline
In `tactical-planner.ts`:
- Replace `runDefensePipeline` + immediate execution with:
  - `defenseActions = planDefenseActions(...)`
  - `reservedUnitIds` updated
  - offense planning run against original state but with reserved units filtered out
- Execute unified `plan.actions` once in `executeTacticalPlan`.

### Step 4: Deterministic ordering
Ensure defense actions always appear before offense actions in `plan.actions`. Use source priority and explicit sorting.

## Acceptance Criteria
- No defense actions execute before the unified plan runs.
- Offense planning respects reserved defense units.
- `plan.actions` contains both defense and offense actions in correct order.

## Suggested Tests
- Update or add tests in `engine/src/test/game/ai2/tactical_planner.test.ts`:
  - Ensure defense and offense actions coexist.
  - Ensure a unit used for defense is not used for offense in the same turn.
  - Ensure plan ordering is stable (defense first).
