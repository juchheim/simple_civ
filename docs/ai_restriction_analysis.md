# AI Behavior Restriction Analysis

**Date:** 2025-11-25  
**Issue:** AI players are too passive - not founding many cities, never going to war, not completing victory paths

## Executive Summary

I've identified **5 major bottlenecks** preventing AI from being competitive:

1. **CRITICAL: Settlers are never built after initial cities** - Missing logic to continue producing settlers
2. **CRITICAL: War thresholds are way too strict** - Most civs require 105-110% power advantage to declare war
3. **MODERATE: Victory progression is blocked** - AIs abandon Progress path too easily
4. **MODERATE: City cap is too low** - Most civs stop at 3-4 cities on maps that support 6+ civs
5. **MINOR: Contact delay gates warfare** - Forces 4-10 turn wait even when aggressive

---

## FINDING #1: Settlers Never Built (CRITICAL)

### Location
`engine/src/game/ai/cities.ts` lines 78-87

### The Problem
```typescript
const desiredCities = personality.desiredCities ?? 3;
const cityCountShort = myCities.length < desiredCities;
const freeLandNear = myCities.some(c => { /* checks for free land */ });
```

**The variable `cityCountShort` and `freeLandNear` are calculated but NEVER USED.**

The build priority system (lines 18-72) includes settlers in the build queue, but there's **no logic** that actually increases settler priority when the AI is below their desired city count.

### Impact
- AI starts with 1 settler, founds 1 city
- Never builds another settler because there's no mechanism to prioritize them
- On a Standard 20×14 map with 4 civs, each AI should found 3-5 cities but they found only 1-2

### Evidence
- Line 26, 39, 42: Settlers appear in priority lists
- Line 62: Expansion desire > 1.05 pushes settler to front... **but only once at game start**
- Lines 80-87: Variables computed but never referenced again

### Fix Needed
The build priority logic needs to **dynamically boost settler production** when `cityCountShort == true` and `freeLandNear == true`.

---

## FINDING #2: War Thresholds Too Strict (CRITICAL)

### Location
`engine/src/game/ai/personality.ts` lines 45-143  
`engine/src/game/ai-decisions.ts` lines 83-136

### The Problem

Most AI civilizations have `warPowerThreshold` values that are **impossibly high**:

| Civilization | War Power Threshold | Meaning |
|--------------|---------------------|---------|
| **ScholarKingdoms** | **1.1** | Requires 110% power advantage |
| **StarborneSeekers** | **1.05** | Requires 105% power advantage |
| **JadeCovenant** | **1.05** | Requires 105% power advantage |
| **AetherianVanguard** | 0.95 (0.7 late) | Only reasonable one |
| RiverLeague | 0.85 | Slightly aggressive |
| ForgeClans | 0.8 | Aggressive |

**REAL WORLD:** In actual games, power parity fluctuates constantly. Requiring 105-110% advantage means the AI will **NEVER** declare war because:
- Small variations in unit production shift power ±10%
- One completed building swings the calculation
- The AI waits for a window that never comes

### Evidence From Code
```typescript
// ai-decisions.ts line 95
const warPowerThreshold = (() => {
    if (aggression.aggressionSpikeTrigger === "TitanBuilt" && hasTitan(playerId, state)) {
        return aggression.warPowerThresholdLate ?? aggression.warPowerThreshold;
    }
    return aggression.warPowerThreshold;
})();

// Line 108
if (dist !== null && dist <= warDistanceMax && aiPower >= enemyPower * warPowerThreshold) {
    return "DeclareWar";
}
```

**The `>=` check means:**
- ScholarKingdoms: Only declare war when `aiPower >= enemyPower * 1.1`
- 3 of 6 civs fall into this category

### Additional Gate: Contact Delay
Lines 101-106 enforce `declareAfterContactTurns` (4-10 turns):
- ForgeClans: 4 turns
- RiverLeague: 6 turns  
- AetherianVanguard: 6 turns
- **ScholarKingdoms: 8 turns**
- **StarborneSeekers: 10 turns**
- JadeCovenant: 6 turns

This means even if power conditions align, AI waits many turns, during which conditions change.

### Impact
- 50% of AI civs (Scholar, Starborne, Jade) functionally **never declare war**
- The other 50% are hesitant
- Games devolve into pure builder competitions with no conflict
- Conquest victory path is unreachable for AI

### Fix Needed
Lower thresholds to realistic values:
- Aggressive civs: 0.6-0.8 (declare when 60-80% of enemy power)
- Balanced civs: 0.8-1.0 (declare near parity)
- Peaceful civs: 1.0-1.2 (only declare when clearly stronger)

Current 1.05-1.1 values are in "impossibly cautious" territory.

---

## FINDING #3: Progress Victory Abandonment (MODERATE)

### Location
`engine/src/game/ai/goals.ts` lines 16-41

### The Problem
```typescript
const capitalsSafe = capitals.every(c => c.hp >= c.maxHp * 0.6 && !anyEnemyNearCity(c, state, playerId, 2));
if (player.completedProjects.includes(ProjectId.Observatory) && capitalsSafe) {
    return "Progress";
}
```

**The AI only pursues Progress victory if:**
1. They've completed Observatory AND
2. **ALL capitals are at 60%+ HP AND**
3. **NO enemies within 2 tiles of ANY capital**

### Impact
- Even minor skirmishes cause AI to abandon Progress path
- A single scout probe near capital triggers switch to Conquest
- Progress-oriented civs (Scholar, Starborne) give up on their specialty
- Combined with Finding #2 (can't declare war), AI gets stuck in limbo

### Evidence
Line 26: The `capitalsSafe` check is extremely strict - requires perfect safety across all capitals.

### Fix Needed
Relax the safety check:
- Allow Progress pursuit with 40% HP threshold
- Allow 1 enemy within 2 tiles
- OR: Don't require `capitalsSafe` at all if Observatory is complete

---

## FINDING #4: City Cap Too Low (MODERATE)

### Location
`engine/src/game/ai/personality.ts` lines 53-143

### The Problem

**Desired city counts are too conservative:**

| Civilization | Desired Cities | Expansion Desire |
|--------------|---------------|------------------|
| ForgeClans | 3 | 1.35 |
| **ScholarKingdoms** | **3** | 1.2 |
| RiverLeague | 4 | 1.5 |
| **AetherianVanguard** | **3** | 1.25 |
| **StarborneSeekers** | **3** | 1.25 |
| JadeCovenant | 4 | 1.7 |

**Default:** 3 cities

### Context from Rulebook
`docs/rules/simple-civ_v0.94_rulebook.md` lines 61-62:
- Standard map: 20×14 = 280 hexes
- Civ count cap: 4 players

**Math:** 280 hexes ÷ 4 players = 70 hexes per player  
With cities ~4-8 tiles apart (optimal spacing), each player should found **6-8 cities**, not 3-4.

### Impact
- AI stops expanding at 3 cities on maps designed for 6+
- Leaves massive amounts of territory unclaimed
- Player can freely expand and dominate
- Combined with Finding #1 (no settler production), this caps AI at 1-2 cities in practice

### Fix Needed
Increase `desiredCities` based on map size:
- Tiny (12×8): 2 cities
- Small (16×12): 3 cities  
- **Standard (20×14): 5-6 cities**
- Large (24×18): 6-7 cities
- Huge (32×24): 8-10 cities

---

## FINDING #5: Contact Delay Gates (MINOR)

### Location  
`engine/src/game/ai/personality.ts` lines 56, 71, 85, 98, 114, 128, 142  
`engine/src/game/ai-decisions.ts` lines 101-116

### The Problem
```typescript
declareAfterContactTurns?: number;

// Actual values:
ForgeClans: 4,
RiverLeague: 6,
AetherianVanguard: 6,
ScholarKingdoms: 8,
StarborneSeekers: 10,
JadeCovenant: 6,
```

Even when power and distance conditions are met, AI must wait 4-10 turns after first contact before declaring war.

### Impact
- Delays warfare by up to 10 turns
- In a ~70-80 turn game (rulebook line 37), this is 12-15% of total game time
- By the time gate expires, power balance has shifted (nullified by Finding #2)

### Why This Exists
Prevents "instant war on meeting" behavior - reasonable for realism.

### Fix Needed  
Reduce to 0-3 turns max:
- Aggressive civs: 0-1 turns
- Balanced civs: 2 turns
- Peaceful civs: 3 turns

Current 8-10 turn delays are excessive for a fast-paced 70-turn game.

---

## Root Cause Analysis

The AI system was designed with **diplomatic realism** in mind (gradual escalation, careful expansion), but the implementation is **too conservative for the game's pacing**.

### Design vs Reality Mismatch

| Design Assumption | Actual Game Behavior |
|-------------------|---------------------|
| "AI should expand to 3-4 cities" | Maps support 6-8 cities per player |
| "AI should only go to war when clearly stronger" | Power balance constantly fluctuates ±10% |
| "AI should wait before declaring war" | 8-10 turns is 15% of total game time |
| "AI should pursue Progress if safe" | Any minor threat blocks Progress path |

---

## Recommended Fix Priority

### CRITICAL (Must Fix)
1. **Enable ongoing settler production** - Add logic to boost settler priority when `cityCountShort && freeLandNear`
2. **Lower war thresholds** - Change 1.05-1.1 values to 0.8-1.0

### HIGH (Should Fix)  
3. **Increase city counts** - Raise `desiredCities` to 5-6 for Standard maps
4. **Relax Progress safety check** - Allow Progress pursuit with minor threats

### MEDIUM (Nice to Have)
5. **Reduce contact delay** - Cut `declareAfterContactTurns` to 0-3 range

---

## Supporting Evidence

### From AI Status Doc
`docs/doc_ai_status.md` lines 18-19:
> "Settler automation: moves toward the best nearby city sites (using scoreCitySite) and founds cities"

**BUT:** If settlers are never built (Finding #1), this automation never runs.

### From Rulebook  
`docs/rules/simple-civ_v0.94_rulebook.md`:
- Line 37: "~70–80 turns on Standard maps"
- Line 55-58: Lists **both Conquest and Progress** as viable victory paths
- Line 256: "Conquest Victory: you control all enemy capitals"

**BUT:** Current AI can't achieve Conquest (Finding #2) or Progress (Finding #3).

---

## Conclusion

The AI is stuck in a **passive loop** due to five overlapping restrictions:

1. Can't expand (no settlers built)
2. Can't go to war (thresholds too strict)  
3. Can't pursue Progress (safety checks too strict)
4. Stops too early (city caps too low)
5. Delays too long (contact gates too high)

**The result:** AI builds 1-2 cities, researches a few techs, and idles while the human player dominates.

**The fix:** Relax all five constraints to match the game's actual pacing (70-80 turns, 4+ civs, conquest/progress viable).
