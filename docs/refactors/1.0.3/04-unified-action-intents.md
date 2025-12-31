# 04 - Unified Tactical Action Intents

## Status
- Completed.
- Added `garrison`, `support`, and `retreat` intents in `engine/src/game/ai2/tactical-planner.ts`.
- Introduced defense move/attack action adapters so all tactical actions use the unified plan format.
- Conflict resolution and execution now handle movement intents via `tryAction`.

## Purpose
Expand the tactical planner to support non-attack actions (retreat, support, garrison) with a unified action schema and conflict resolution.

## Goals
- Extend `TacticalActionIntent` to cover defensive and support actions.
- Make all tactical actions share a common structure and scoring interface.
- Ensure one action per unit with deterministic ordering.

## Non-Goals
- Do not change movement rules.
- Do not replace the strategic plan or ArmyPhase logic.

## Files to Update
- `engine/src/game/ai2/tactical-planner.ts`
- `engine/src/game/ai2/tactical-context.ts`
- `engine/src/game/ai2/defense-garrison.ts`
- `engine/src/game/ai2/defense-ring.ts`
- `engine/src/game/ai2/defense-mutual-defense.ts`
- `engine/src/game/ai2/movement.ts`
- Any new tactical action helpers

## Current State
- The unified planner only models `attack`, `move-attack`, and `opportunity` actions.
- Garrisoning and ring positioning execute directly in separate defense steps.
- No explicit action intents for retreat, support, or garrison.

## Implementation Plan

### Step 1: Extend action intent types
Update `TacticalActionIntent` and `TacticalActionPlan`:
- Add intents: `retreat`, `support`, `garrison`, `hold` (if needed).
- For movement-like intents, store a `MoveUnit` action and a score.
- Keep `source` field to resolve defense vs offense priority.

### Step 2: Define scoring for new intents
Add scoring in `tactical-scoring.ts`:
- `scoreRetreatAction`: penalize retreat when not threatened, reward when exposure is high.
- `scoreSupportAction`: reward moves that improve focus or protect a city or siege target.
- `scoreGarrisonAction`: reward stabilizing threatened cities, scale with threat level.

### Step 3: Build action candidates
Add a shared “candidate generation” layer:
- `planGarrisonActions` from `defense-garrison.ts`.
- `planRingPositioningActions` from `defense-ring.ts`.
- `planSupportReinforcements` from `defense-mutual-defense.ts`.

Return `TacticalActionPlan[]` rather than mutating state.

### Step 4: Update conflict resolution
- Ensure conflict resolution accounts for new intents.
- Order: defense source > offense source, then score, then intent priority.
- Include a deterministic intent priority map (e.g., retreat > garrison > support > attack > move-attack > opportunity).

### Step 5: Execution
- Extend `executeTacticalActions` to handle movement actions with `tryAction`.
- Verify that defense actions do not get executed twice.

## Acceptance Criteria
- Planner can produce and execute non-attack actions.
- One action per unit enforced across all intents.
- Deterministic ordering within the unified plan.

## Suggested Tests
- New tests in `engine/src/test/game/ai2/tactical_planner.test.ts` for garrison and retreat actions.
- Conflict resolution test where a unit has both a garrison and attack option.
