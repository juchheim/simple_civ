# Level 4: Coordinated Attack Timing

**Status:** Planned  
**Complexity:** Medium-High  
**Prerequisite:** None (can be implemented independently, but synergizes with Level 3)  
**Related:** [balance-plan.md](./balance-plan.md) | [Level 3](./level-3-wait-decision.md)

---

## Problem Statement

Current AI behavior:

```
Unit A arrives at rally point → attacks immediately
Unit B arrives 2 turns later → attacks alone
Unit C arrives 3 turns later → attacks alone
```

**Result:** Units fight in a staggered trickle. Enemy defeats them one by one.

**Ideal behavior:**

```
Unit A arrives at rally point → WAITS
Unit B arrives → WAITS
Unit C arrives → NOW all 3 attack together
```

**Result:** Concentrated force overwhelms enemy defenses.

---

## Current State Analysis

### What Already Exists

**1. Rally Point System:**
```typescript
const rally = pickRallyCoord(next, focusCity.coord, 3);
// Stage at distance 3 from city (outside city attack range)
```

**2. `shouldStage` Logic:**
```typescript
const requiredNear = Math.max(2, Math.ceil(profile.tactics.forceConcentration * 4));
const shouldStage = (nearCount < requiredNear) && 
                    (profile.tactics.forceConcentration >= 0.65);
```
- Requires 2-4 units near target before allowing attack
- Uses `forceConcentration` profile (0.55-0.9)

**3. Composition Gates:**
```typescript
const capturersNear = countNearbyByPredicate(..., u => canCapture(u));
const siegeNear = countNearbyByPredicate(..., u => isSiege(u));
// Must have at least 1 capturer and 1 siege unit
```

**4. Titan Support Check:**
```typescript
const requiredSupport = Math.ceil(profile.tactics.forceConcentration * 4);
const supportCount = friendlyMilitaryNearTitan;
const allowDeepPush = supportCount >= requiredSupport;
```

**5. Role-Based Movement Pacing:**
```typescript
// Riders can't outrun the stack
if (nearestAnchorDist > 2) {
    next = moveToward(next, playerId, live, rally);
}
```

---

### Gaps in Current Implementation

| Gap | Description | Impact |
|-----|-------------|--------|
| **Staging affects movement, not attack** | Units stage, then attack individually once "near enough" | Trickle attacks continue |
| **No "coordinated go" signal** | No explicit "all units attack NOW" trigger | Units don't synchronize |
| **Partial composition** | Checks for 1 capturer + 1 siege, not full army | Attacks with incomplete force |
| **Attack pass is unit-by-unit** | `bestAttackForUnit` runs for each unit independently | No coordinated timing |
| **No army state machine** | No "gathering → staging → attacking" phases | Hard to coordinate behavior |

---

## Level 4 Goal

**Implement an explicit "attack phase" that only triggers when the army is ready as a group.**

---

## Design: Army State Machine

### Phases

```
┌─────────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  SCATTERED  │ --> │ RALLYING │ --> │  STAGED   │ --> │ ATTACK!  │
└─────────────┘     └──────────┘     └───────────┘     └──────────┘
       ^                                   │
       └───────────────────────────────────┘
              (after attack, regroup if needed)
```

**SCATTERED:** Units spread across map, no coherent army  
**RALLYING:** Units moving toward rally point  
**STAGED:** Most units at rally point, waiting for signal  
**ATTACK:** Coordinated assault on target

---

### Memory: Army Phase Tracking

```
AiPlayerMemoryV2 = {
    ...existing,
    armyPhase: "scattered" | "rallying" | "staged" | "attacking",
    armyRallyPoint: { q: number, r: number } | null,
    armyReadyTurn: number | null,  // Turn when staged condition was met
}
```

---

### Phase Transitions

**SCATTERED → RALLYING:**
```
function checkScatteredToRallying(state, playerId):
    # Trigger: We have a focus target and enough units to form an army
    focusCity = getAiFocusCity(state, playerId)
    if !focusCity:
        return "scattered"
    
    militaryCount = countMilitaryUnits(state, playerId)
    if militaryCount < 3:
        return "scattered"  # Not enough units for coordinated attack
    
    # Pick rally point and start moving
    rallyPoint = pickRallyCoord(state, focusCity.coord, 4)  # Distance 4 from target
    return { phase: "rallying", rallyPoint }
```

**RALLYING → STAGED:**
```
function checkRallyingToStaged(state, playerId, rallyPoint):
    profile = getAiProfile(state, playerId)
    
    requiredNear = Math.max(3, Math.ceil(profile.tactics.forceConcentration * 5))
    nearCount = countUnitsNear(state, playerId, rallyPoint, radius: 3)
    
    hasComposition = checkArmyComposition(state, playerId, rallyPoint)
    # Needs: ≥1 capturer, ≥1 siege, ≥1 melee
    
    if nearCount >= requiredNear && hasComposition:
        return { phase: "staged", readyTurn: state.turn }
    
    return "rallying"  # Keep rallying
```

**STAGED → ATTACK:**
```
function checkStagedToAttack(state, playerId, readyTurn):
    profile = getAiProfile(state, playerId)
    
    # Option 1: Most units have arrived
    totalMilitary = countMilitaryUnits(state, playerId)
    nearRally = countUnitsNear(state, playerId, rallyPoint, radius: 3)
    
    if nearRally >= totalMilitary * 0.75:
        return "attacking"  # 75%+ of army staged = GO
    
    # Option 2: Been staged for too long (anti-stall)
    turnsStaged = state.turn - readyTurn
    if turnsStaged >= 3:
        return "attacking"  # Don't wait forever
    
    # Option 3: Aggressive civ, enough force
    if profile.tactics.forceConcentration < 0.6 && nearRally >= 3:
        return "attacking"  # Aggressive civs attack sooner
    
    return "staged"  # Keep waiting
```

**ATTACK → SCATTERED (after battle):**
```
function checkAttackToScattered(state, playerId):
    # After capturing city or losing significant units, regroup
    if cityJustCaptured || armyLostMajorUnits:
        return "scattered"
    
    return "attacking"  # Continue assault
```

---

## Attack Synchronization

### The Key Change

**Before (current):**
```typescript
// In runTacticsV2
for (const unit of attackingUnits) {
    const best = bestAttackForUnit(next, playerId, live);
    if (best && best.score > 0) {
        next = tryAction(next, best.action);  // Each unit attacks independently
    }
}
```

**After (Level 4):**
```typescript
// In runTacticsV2
const armyPhase = getArmyPhase(state, playerId);

if (armyPhase !== "attacking") {
    // NOT IN ATTACK PHASE: Don't attack, just position
    for (const unit of militaryUnits) {
        next = moveTowardRallyPoint(next, playerId, unit);
    }
    return next;
}

// IN ATTACK PHASE: Execute coordinated attack
const attacks = planAttackOrderV2(next, playerId);  // Level 1
next = executeAttacks(next, attacks);
```

The key insight: **Don't call attack logic at all until army phase is "attacking"**.

---

## Integration with Levels 1, 2, 3

| Level | Integration |
|-------|-------------|
| **Level 1** | Level 4 gates when Level 1 runs. Level 1 optimizer only executes during "attacking" phase |
| **Level 2** | Focus target is set during "rallying" phase, attacks concentrate during "attacking" phase |
| **Level 3** | "Wait" decision is now baked into phase logic. Staged = waiting. Attack phase = go |

---

## Edge Cases

### 1. Enemy Attacks First

If enemy attacks our staging army, we must defend:

```
function handleEnemyInitiatedCombat(state, playerId):
    # If any of our units are under attack, transition to "attacking" immediately
    for unit in ourUnits:
        if unitTookDamageThisTurn(unit):
            return "attacking"  # Forced engagement
    
    return currentPhase
```

### 2. Opportunity Kills

If a unit can secure a guaranteed kill during staging, allow it:

```
function allowOpportunityKill(state, playerId, unit, armyPhase):
    if armyPhase === "attacking":
        return true  # Normal attack phase
    
    # During staging, only attack if it's a guaranteed kill
    bestAttack = bestAttackForUnit(state, playerId, unit)
    if bestAttack && bestAttack.wouldKill && bestAttack.score > 200:
        return true  # Don't pass up a free kill
    
    return false  # Stay staged
```

### 3. Siege Commitment

Once a siege is underway (city HP reduced), don't retreat to staging:

```
function overrideStagingForActiveSiege(state, playerId, focusCity):
    if focusCity.hp < focusCity.maxHp * 0.7:
        return "attacking"  # City is wounded, finish it
    
    return currentPhase
```

### 4. Titan Override

Titans don't wait — they're the attack signal:

```
function titanOverride(state, playerId):
    titan = getTitan(state, playerId)
    if titan && titanIsNearTarget(titan, focusCity):
        return "attacking"  # Titan presence triggers attack
```

---

## Civ Personality Influence

> [!NOTE]
> Uses unified `CivAggressionProfile.maxStagingTurns` and `requiredArmyPercent` — see [Level 1B](./level-1-attack-order.md#override-5-civ-personality) for full table.

| Civ | Staging Patience | Required Force % |
|-----|-----------------|------------------|
| ForgeClans | 2 turns max | 60% of army |
| RiverLeague | 2 turns max | 65% of army |
| AetherianVanguard | 1 turn (Titan rushes) | 50% of army |
| JadeCovenant | 3 turns max | 70% of army |
| ScholarKingdoms | 4 turns max | 80% of army |
| StarborneSeekers | 4 turns max | 80% of army |

Aggressive civs tolerate smaller armies and shorter staging windows.

---

## Testing Strategy

### Unit Tests

| Test | Setup | Expected |
|------|-------|----------|
| Scattered → Rallying | Focus target set, 5 units | Phase becomes "rallying" |
| Rallying → Staged | 4 units at rally point | Phase becomes "staged" |
| Staged → Attacking | 85% of army staged, 3 turns | Phase becomes "attacking" |
| Enemy forces engagement | Enemy attacks staged army | Phase becomes "attacking" |
| Opportunity kill | Unit can kill during staging | Kill allowed |
| Titan override | Titan near target | Attack immediately |

### Simulation Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Trickle attacks (1-2 units) | ~40% | <10% |
| Coordinated attacks (3+ units) | ~30% | >70% |
| Average army size at attack | 2.5 | 4+ |
| City capture rate per war | ~60% | ~80% |

---

## Implementation Notes

**Modified files:**
- `engine/src/game/ai2/memory.ts` — Add `armyPhase`, `armyRallyPoint`, `armyReadyTurn`
- `engine/src/game/ai2/tactics.ts` — Gate attack logic by army phase
- `engine/src/game/ai2/army-phase.ts` (NEW) — Phase state machine

**Complexity:** Medium-High  
- State machine adds complexity
- Must handle all edge cases (enemy attack, opportunity kills, titan override)
- Must integrate with existing staging logic (don't break what works)

> [!WARNING]
> **Replaces existing systems:** Level 4 **subsumes** the current `shouldStage` logic in `tactics.ts`. The explicit phase machine replaces the ad-hoc staging check. Remove or deprecate `shouldStage` after Level 4 is implemented.

---

## Overlap with Level 3

| Level 3: Wait Decision | Level 4: Coordinated Timing |
|-----------------------|----------------------------|
| "Should this unit attack now?" | "Should the army attack now?" |
| Unit-level decision | Army-level decision |
| Reactive (evaluates current situation) | Proactive (phases planned ahead) |

**Recommendation:** Implement Level 4 first, then Level 3 becomes simpler — it only handles edge cases within the "attacking" phase (e.g., individual unit decides to hold back despite army attacking).
