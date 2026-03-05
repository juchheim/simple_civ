# Problem 02: Settler Death Rate (52.4%)

## The Problem
Over half of all settlers produced are killed before founding a city. This represents enormous wasted production across all civilizations (ranging from 45.6% for StarborneSeekers to 56.7% for RiverLeague).

## Root Cause
Two separate issues:
1. **Poor settler escort:** AI produces settlers and sends them toward settlement sites without adequate military escort, making them easy targets.
2. **Wartime settler production:** AI continues building settlers during active wars when those settlers are likely to be intercepted.

## User Direction
"Do both" — improve escort AI AND pause settler production during wars.

## Plan

### 1. Settler Production Gate During Wartime
**File:** `engine/src/game/ai/city-build-priorities.ts`

In `buildPriorities()` (line 189-439), add an early gate:
```
If isAtWar(state, playerId) AND no safe city exists for settler:
  Skip settlers entirely in priority list
```

"Safe city" = a city that is:
- Not under siege or adjacent to enemy units
- Not the front-line city (closest to enemy territory)
- Has at least 1 garrison unit

Also in `buildNormalPriorities()` (line 441-554), apply the same gate to peacetime settler production when an enemy military unit is within 4 tiles of any of our cities.

### 2. Settler Escort Requirement
**File:** `engine/src/game/ai2/tactical-planner.ts`

Add a **settler escort** phase that runs before general tactical planning:
- When a settler exists and is not in a city, find the nearest idle military unit and assign it as escort.
- The escort unit should move to stay adjacent to the settler.
- If no escort is available, the settler should **wait in the nearest city** until one is available.

**File:** `engine/src/game/ai2/movement.ts`

Add escort movement logic:
- When a unit is tagged as escort, its movement target becomes the settler's destination, but it should stay within 1 hex of the settler at all times.
- If the escort dies, the settler should retreat to the nearest city.

### 3. Settler Retreat on Enemy Contact
**File:** `engine/src/game/ai2/tactical-planner.ts`

In the defensive planning phase, add:
- If a settler detects an enemy unit within 3 hexes and has no escort, immediately retreat toward the nearest friendly city.
- This should be higher priority than any other settler movement.

## Ripple Effects to Monitor
- **Expansion speed:** Gating settler production during wars will slow expansion for aggressive civs (ForgeClans, AetherianVanguard). Monitor their city count — if it drops below 2.5 avg, the gate is too aggressive.
- **Military production:** If settlers wait for escorts, that's one military unit not fighting. Make sure escort duty is assigned to idle units, not front-line troops.
- **JadeCovenant impact:** JadeCovenant builds the most settlers (3708 produced) and has 3.8 cities/game. They should be least affected since their high gold income lets them sustain both military and expansion.
- **Early game:** The first settler (starting unit) should be exempt from escort requirements since there are no military units available yet.

## Verification
Run 600 simulations before/after. Target:
- Settler death rate ≤ 30% (down from 52.4%)
- Cities founded per game should remain stable (±5%)
- No civ should drop below 2.0 avg cities
- Win rate spread should not increase beyond 7pp
