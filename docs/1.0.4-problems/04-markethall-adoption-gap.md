# Problem 04: MarketHall Adoption Gap for Military Civs

## The Problem
ForgeClans (34.2%) and AetherianVanguard (40.6%) rarely build MarketHall, compared to 75-81% adoption for JadeCovenant/StarborneSeekers. This creates a compounding economic disadvantage: without MarketHall, they can't build Bank or Exchange, leaving them permanently behind in gold generation.

## Root Cause
Military civs' build priorities favor units over economy buildings. In `city-build-priorities.ts`, when `isAtWar` is true (which it often is for ForgeClans at 2.0 wars/game), military production dominates. MarketHall requires tech `Wellworks` and arrives at a time when military civs are investing in `FormationTraining` → `DrilledRanks` → `ArmyDoctrine`.

The AI personality for ForgeClans has `armySizeMultiplier: 2.5`, meaning they want 2.5x the base army size, perpetually crowding out economy buildings.

## User Direction
"Tune."

## Plan

### 1. Economy Building Floor in Build Priorities
**File:** `engine/src/game/ai/city-build-priorities.ts`

In `buildPriorities()` (line 189-439), add a **gold building floor** rule:

```
If player has no MarketHall AND has Wellworks tech AND is NOT in austerity:
  Insert MarketHall at priority position 3 (after settler and first military unit)
  regardless of war state
```

This ensures MarketHall gets built in at least one city even during wartime. The check "is NOT in austerity" prevents a chicken-and-egg problem where austerity blocks the building that would fix austerity.

### 2. Per-Civ Economy Building Priority
**File:** `engine/src/game/ai/city-build-priorities.ts`

In `getStandingArmyPriorities()` (line 556-621), add an economy interleave:

For ForgeClans and AetherianVanguard specifically:
- After producing 3 military units without any economy building, force the next production to be the highest unbuit gold building available.
- Track this with a counter in AI memory.

### 3. Personality Tuning
**File:** `engine/src/game/ai/personality.ts`

Add `economyBuildingPriority` field to `AiPersonality`:
- ForgeClans: `economyBuildingPriority: 0.4` (build economy building 40% of the time when available)
- AetherianVanguard: `economyBuildingPriority: 0.35`
- ScholarKingdoms: `economyBuildingPriority: 0.5` (already good, keep)
- Others: `economyBuildingPriority: 0.45` (default)

Use this in `buildPriorities()` to interleave economy buildings into the priority list at the specified frequency.

## Ripple Effects to Monitor
- **ForgeClans military output:** If they spend turns building MarketHall, they produce fewer units. Their army size multiplier (2.5x) gives them a large buffer. Monitor that their unit production rate stays ≥10 per 100 turns.
- **AetherianVanguard win rate:** They're currently the highest win rate (24.6%). Slight slowdown from economy building might actually help balance by reducing their conquest dominance.
- **War performance:** If military civs pause for economy buildings mid-war, they might lose momentum. The "not in austerity" and "after 3 military units" gates should prevent this for critical moments.

## Verification
Run 600 simulations before/after. Target:
- ForgeClans MarketHall adoption ≥ 60% (up from 34.2%)
- AetherianVanguard MarketHall adoption ≥ 55% (up from 40.6%)
- ForgeClans/AetherianVanguard deficit turns should decrease
- Military unit production rate should not drop more than 15%
- Win rate spread should remain stable or improve
