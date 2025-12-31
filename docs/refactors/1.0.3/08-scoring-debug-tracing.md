# 08 - Add Scoring Debug Tracing

## Status
- Completed.
- Added `ScoreBreakdown` support in `engine/src/game/ai2/tactical-scoring.ts` with breakdown-capable scoring helpers.
- Tactical planner now emits breakdown logs when AI debug logging is enabled.

## Purpose
Provide transparent score breakdowns to help tune tactical behavior without guessing why an action was chosen.

## Goals
- Emit optional debug output for score components.
- Keep default logs minimal (only when debug flag is enabled).
- Make it easy to compare candidate actions.

## Non-Goals
- Do not change scoring weights.
- Do not introduce heavy logging in production runs.

## Files to Update
- `engine/src/game/ai2/tactical-scoring.ts`
- `engine/src/game/ai2/tactical-planner.ts`
- `engine/src/game/ai/debug-logging.ts` (or equivalent debug flag module)

## Implementation Plan

### Step 1: Add score breakdown output
In `tactical-scoring.ts`, include a `ScoreBreakdown` object with:
- `total`
- `components` map (component name -> value)
- Optional `notes` array

### Step 2: Add a debug toggle
Use an existing debug flag or add a new one:
- Example: `aiInfo` should only log breakdowns when `AI_DEBUG_TACTICS` is enabled.

### Step 3: Emit logs in planner
In `tactical-planner.ts` or during action selection:
- Log top N candidate actions for each unit with score breakdowns.
- Include intent, target, and source in log output.

### Step 4: Keep it lightweight
- Avoid logging every candidate unless debug mode is on.
- Limit output to top N per unit to prevent log spam.

## Acceptance Criteria
- When debug flag is off, no additional logs appear.
- When debug flag is on, score components are visible for chosen actions.

## Suggested Tests
- Manual run with debug flag set. No unit tests required unless log formatting is brittle.
