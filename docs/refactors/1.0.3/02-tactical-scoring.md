# 02 - Centralize Tactical Scoring

## Status
- Completed.
- Added `engine/src/game/ai2/tactical-scoring.ts` and moved attack scoring logic there.
- Converted `engine/src/game/ai2/attack-order/scoring.ts` into a thin re-export.
- Updated move-attack scoring and defense focus scoring to use centralized helpers.

## Purpose
Create a shared tactical scoring module that all offensive and defensive planners use. The goal is to replace duplicated scoring logic with a single source of truth and tunable weights.

## Goals
- Introduce `tactical-scoring.ts` with explicit score components and weights.
- Keep current behavior as close as possible while moving logic.
- Use the shared threat/value profiles from `engine/src/game/ai2/tactical-threat.ts`.
- Ensure Trebuchet city-only siege bonus remains intact or improves.

## Non-Goals
- Do not change combat preview mechanics.
- Do not alter diplomacy or turn flow in this step.
- Do not redesign ArmyPhase or strategic goal selection.

## Files to Update
- New: `engine/src/game/ai2/tactical-scoring.ts`
- Refactor callers:
  - `engine/src/game/ai2/attack-order/scoring.ts`
  - `engine/src/game/ai2/attack-order/move-attack.ts`
  - `engine/src/game/ai2/defense-combat/tactical-defense.ts`
  - `engine/src/game/ai2/defense-combat/focus-fire.ts`
  - `engine/src/game/ai2/attack-order/focus.ts`
  - `engine/src/game/ai2/wait-decision.ts`

## Current State
- `scoreAttackOption` in `attack-order/scoring.ts` mixes kill, risk, exposure, focus, and siege logic.
- Defense modules compute their own scores and add ad-hoc bonuses.
- Move-attack scoring partly duplicates attack scoring with extra exposure logic.

## Implementation Plan

### Step 1: Define scoring interfaces
Create types in `tactical-scoring.ts`:
- `ScoreComponents` with explicit fields:
  - `damageScore`, `killScore`, `captureScore`, `threatRemoval`, `objectiveBonus`, `roleFitBonus`
  - `riskPenalty`, `exposurePenalty`, `stallPenalty`
- `ScoreBreakdown` with total score plus component list for tracing.
- `AttackScoreInput` compatible with current callers.

### Step 2: Centralize scoring helpers
Move logic into helpers:
- `scoreUnitAttack(input)`
- `scoreCityAttack(input)`
- `scoreMoveAttack(input)` or a wrapper that adds exposure to `scoreAttackOption`
- `scoreDefenseAttack(input)` with explicit defense bonus and proximity logic

Use `getUnitThreatProfile` and `getCityValueProfile` for value computations. Keep weights aligned with current values to avoid balance drift.

### Step 3: Wire current callers
Replace logic in these modules to call the new scoring API:
- `attack-order/scoring.ts` should become a thin adapter that exports `scoreAttackOption` but delegates to `tactical-scoring.ts`.
- `defense-combat/tactical-defense.ts` and `focus-fire.ts` should use a defense-aware scoring function.
- `move-attack.ts` should apply exposure penalty using centralized functions (avoid duplicating weights).
- `attack-order/focus.ts` should use a shared target scoring helper.
- `wait-decision.ts` should reuse `scoreAttackOption` without re-implementing score math.

### Step 4: Validate behavior
Compare pre-refactor and post-refactor scores using existing tests. Add quick unit tests if a score component or weight shifts due to refactor.

## Acceptance Criteria
- All scoring functions are defined in `tactical-scoring.ts` and used by offense and defense logic.
- `attack-order/scoring.ts` does not contain independent scoring math.
- Existing tests in `engine/src/test/game/ai2` still pass without tuning changes.
- Trebuchet still scores higher on city attacks than generic siege units.

## Risks
- Small differences in floating point math or order of operations can affect tie-breaks.
- Moving risk or exposure penalties can cause tactical choices to shift.

## Suggested Tests
- `npm test -w engine`.
- Focus on `engine/src/test/game/ai2/attack_planning.test.ts` and `engine/src/test/game/ai2/tactical_planner.test.ts`.
