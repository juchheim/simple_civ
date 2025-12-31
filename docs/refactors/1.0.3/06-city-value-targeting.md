# 06 - Apply Shared City Value Profile to Defense and Strategy

## Status
- Completed.
- Defense move scoring now uses `getCityValueProfile` via `getDefenseCityValueBonus` in `engine/src/game/ai2/defense-actions.ts`.
- Focus city selection in `engine/src/game/ai2/strategy.ts` now uses `getCityValueProfile`.
- No additional strategic-plan changes were needed (no city-scoring logic present).

## Purpose
Ensure capital and recapture priorities use the unified city value profile so strategic targeting and defense decisions are consistent with tactical scoring.

## Goals
- Use `getCityValueProfile` for capital/recapture value in defense and strategy logic.
- Remove ad-hoc capital or recapture scoring in strategic modules.

## Non-Goals
- Do not change diplomacy or victory evaluation.
- Do not change the tactical planner in this step.

## Files to Update
- `engine/src/game/ai2/tactical-threat.ts` (already provides `getCityValueProfile`)
- `engine/src/game/ai2/defense-capital.ts`
- `engine/src/game/ai2/strategic-plan.ts`
- Optional: `engine/src/game/ai2/strategy.ts` if focus city selection uses raw checks

## Current State
- Tactical scoring uses `getCityValueProfile` but strategy and defense still use local heuristics.
- Capital and recapture weighting varies between modules.

## Implementation Plan

### Step 1: Update defense-capital prioritization
In `defense-capital.ts`, replace bespoke capital weighting with values from `getCityValueProfile`. Use:
- `capitalValue` to prioritize defending capitals.
- `recaptureValue` to prioritize retaking lost capitals.
- `hpFrac` to modulate urgency for low-HP cities.

### Step 2: Update strategic target selection
In `strategic-plan.ts`, use `getCityValueProfile` for:
- Selecting war targets (higher totalValue should be higher priority).
- Choosing focus cities for offensives.

### Step 3: Update focus city selection (if applicable)
If `strategy.ts` or focus logic does direct checks for `isCapital` or `originalOwnerId`, replace with `CityValueProfile` totals or component checks for consistency.

## Acceptance Criteria
- Defense and strategy use the same city value profile as tactical scoring.
- Capital and recapture values match tactical priorities.
- No duplicated city value math outside `tactical-threat.ts`.

## Suggested Tests
- Add or update tests in `engine/src/test/game/ai2/attack_planning.test.ts` or new tests to confirm focus selection favors capital when `capitalHunt` is high.
