# 01 - Expand Role and Capability Schema

## Status
- Completed.
- Implemented `UnitCapabilityProfile` and tags in `engine/src/game/ai2/schema.ts`.
- Updated wrappers in `engine/src/game/ai2/unit-roles.ts` and re-exports in `engine/src/game/ai2/capabilities.ts`.
- Added tests in `engine/src/game/ai2/capabilities.test.ts` (not run here).

## Purpose
Create a richer, derived capability profile for units so tactical and production logic can reason about roles consistently without ad-hoc checks. This is the foundation for the unified tactical scoring and action planner.

## Why This Is Needed
- Current role map in `engine/src/game/ai2/schema.ts` only provides coarse roles: siege, capture, defense, vision, civilian.
- Many modules interpret roles and capabilities differently (range checks, siege handling, capturer checks).
- A unified planner needs a single capability profile to drive scoring, action selection, and unit assignment.

## Goals
- Keep the existing `UnitRole` map as the canonical primary role.
- Add derived capabilities and role tags used by tactical logic and scoring.
- Preserve Trebuchet city-only siege behavior via capability flags (do not create a new base role).
- Keep existing exports working to avoid breaking current callers.

## Non-Goals
- Do not rebalance unit stats.
- Do not change combat resolution.
- Do not change diplomacy rules.

## Files to Update
- `engine/src/game/ai2/schema.ts`
- `engine/src/game/ai2/unit-roles.ts`
- `engine/src/game/ai2/capabilities.ts`
- New tests in `engine/src/game/ai2` (suggested: `capabilities.test.ts`)

## Current State
- `schema.ts` exposes `UnitRole` and capability helpers like `canAttackUnits`, `canAttackCities`, `canCaptureCities`, `isCityOnlySiegeUnitType`.
- `unit-roles.ts` exposes thin wrappers like `isRanged`, `isSiege`, `isCapturer`.
- Several modules still rely on hard-coded unit type checks or local heuristics.

## Implementation Plan

### Step 1: Add a unified capability profile
Add a derived capability profile type in `engine/src/game/ai2/schema.ts`:
- Suggested type name: `UnitCapabilityProfile`.
- Suggested fields:
  - `role`: `UnitRole`
  - `canAttackUnits`, `canAttackCities`, `canCaptureCities`
  - `range`, `mobility` (move points), `isRanged`
  - `isArmy`, `isTitan`
  - `isSiege`, `isCityOnlySiege`
  - `garrisonEligible`
  - `tags`: `frontline`, `skirmisher`, `siege_specialist`, `capturer`, `support`

Add `getUnitCapabilityProfile(unitOrType)` which derives these fields from `UNITS`, `UnitType`, and role map. Keep logic deterministic and cheap.

### Step 2: Define tag heuristics
Use simple heuristics so tags are stable and explainable:
- `frontline`: melee (range == 1) and non-civilian, non-vision, higher HP (>= base melee HP threshold).
- `skirmisher`: ranged (range > 1), lower HP, or high mobility.
- `siege_specialist`: `isCityOnlySiege` or siege role with range > 1.
- `capturer`: can capture cities.
- `support`: low attack or a defensive-only unit (Lorekeeper) or escort-style units.

Keep heuristics inside `schema.ts` so other modules do not replicate them.

### Step 3: Wire compatibility helpers
Update `engine/src/game/ai2/unit-roles.ts` to delegate to the capability profile instead of repeating checks. Preserve existing exports to avoid breaking downstream code.

Update `engine/src/game/ai2/capabilities.ts` to re-export the new profile (if needed) and ensure existing constants still refer to the base role map.

### Step 4: Add tests
Create a small test file to validate tag classification for key units:
- Trebuchet: `isCityOnlySiege`, `siege_specialist`, `garrisonEligible` false.
- BowGuard: `isRanged`, `siege` role, not `city_only_siege`.
- SpearGuard: `frontline`, `capturer` true.
- Riders: `capturer`, high mobility, not frontline.
- Titan: `isTitan`, `capturer`.
- Scout: `vision`, not combat.

Use deterministic expectations based on existing unit stats in `UNITS`.

## Acceptance Criteria
- All current `UnitRole` exports remain intact.
- A `UnitCapabilityProfile` exists and is used by `unit-roles.ts`.
- Tests assert tags for key units.
- No behavior change outside of new profile availability.

## Notes
- Do not encode civ-specific behavior in the capability profile.
- Trebuchet must remain siege role but city-only siege capability should be explicit.

## Suggested Tests
- `npm test -w engine -- --runInBand` (if needed) or targeted test file.
