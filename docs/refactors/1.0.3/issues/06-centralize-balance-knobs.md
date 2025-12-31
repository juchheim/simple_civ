# 06 - Centralize Tactical Balance Knobs

## Priority
Low to Medium. Balance thresholds are scattered across multiple files, making tuning harder than it needs to be.

## Why This Matters
- Thresholds and weights live in many modules with no single entry point.
- Small tuning changes require chasing multiple files and risk inconsistent behavior.

## Current Hotspots
- `engine/src/game/ai2/army-phase.ts` (phase thresholds)
- `engine/src/game/ai2/wait-decision.ts` (wait filters)
- `engine/src/game/ai2/defense-situation/scoring.ts` (threat level thresholds)
- `engine/src/game/ai2/defense-ring.ts` (ring sizing)
- `engine/src/game/ai2/attack-order/move-attack.ts` (exposure multipliers)

## Goals
- Make balance tuning easy and centralized.
- Keep AI profiles as the primary tuning surface, with a shared defaults object.

## Plan
1. Add a new tuning module, e.g. `engine/src/game/ai2/tuning.ts`:
   - Centralize threat thresholds, ring sizes, search radii, wait thresholds, exposure multipliers.
2. Replace inline constants with references to the tuning module.
3. Ensure values can be overridden per civ/profile if needed.

## Tests
- No new tests required. Run `npm test -w engine`.

## Acceptance Criteria
- Tactical thresholds are defined in one place.
- Tuning changes require minimal code edits and are easy to audit.
