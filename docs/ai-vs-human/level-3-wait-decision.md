# Level 3: Attack vs Wait Decision

**Status:** Planned  
**Complexity:** Medium  
**Prerequisite:** [Level 4](./level-4-coordination.md) (Level 3 operates *within* Level 4's attack phase)  
**Related:** [balance-plan.md](./balance-plan.md) | [Level 1](./level-1-attack-order.md)

> [!IMPORTANT]
> **Hierarchy:** Level 4 (Army Phase) gates **when** the army attacks. Level 3 decides if an **individual unit** within the attack phase should hold back. Level 4 is the primary gate; Level 3 is a secondary filter.

---

## Problem Statement

Current AI behavior:

```
if (bestAttackScore > 0):
    attack()
```

This means the AI attacks whenever an attack is *not terrible*. But sometimes the optimal play is:

> **"Don't attack now. Wait for reinforcements. Attack together next turn."**

Humans naturally do this. The AI doesn't.

---

## When to Wait (Human Intuition)

A skilled human player waits when:

1. **Outnumbered locally** — "I have 1 unit, they have 3. I'll wait for my army to arrive."
2. **Out of position** — "My ranged are exposed. Let me reposition first."
3. **Enemy is baiting** — "They left one injured unit forward. It's a trap."
4. **Reinforcements coming** — "My second army arrives next turn. Wait and attack as one."
5. **Terrain disadvantage** — "Attacking uphill/into forest. Wait for them to come to me."

---

## Current State Analysis

### What Already Exists

**1. `shouldStage` in tactics.ts:**
```typescript
const shouldStage = (nearCount < requiredNear) && 
                    (profile.tactics.forceConcentration >= 0.65);
```
- Only applies to movement toward siege targets
- Doesn't affect attack decisions
- Doesn't consider enemy strength

**2. `forceConcentration` profile parameter (0.55-0.9):**
- Higher = wait for more units before pushing
- Only affects staging, not "should I attack right now"

**3. Attack scoring with risk penalties:**
```typescript
const suicidePenalty = suicide ? 200 : 0;
if (threats.count >= 3 && !kill) {
    exposurePenalty += 80;
}
```
- Avoids obviously bad attacks
- Doesn't consider "wait for better opportunity"

**4. `retreatIfNeeded`:**
- Pulls back damaged units
- Reactive, not proactive

---

### The Gap

| Scenario | Current AI | Ideal AI |
|----------|-----------|----------|
| 1 vs 3, our reinforcements 2 turns away | Attacks (suicides) | Waits |
| Ranged unit exposed, could reposition | Attacks anyway | Repositions first |
| Enemy has defensive terrain advantage | Attacks into disadvantage | Waits for them to advance |
| No kill possible, would just wound | Attacks, takes counter-damage | Maybe waits |

---

## Level 3 Design: "Wait" Evaluation

### Core Concept

Before executing any attack, evaluate:

```
function shouldWaitInsteadOfAttacking(state, playerId, attacks):
    if attacks.length === 0:
        return false  # Nothing to wait for
    
    # Check each wait condition
    conditions = [
        checkReinforcementsIncoming(state, playerId),
        checkLocalPowerDisadvantage(state, playerId, attacks),
        checkNoKillPossible(state, attacks),
        checkExposureAfterAttack(state, playerId, attacks),
        checkTerrainDisadvantage(state, attacks),
    ]
    
    waitScore = sum(c.score for c in conditions)
    attackScore = sum(a.score for a in attacks)
    
    # Wait if clearly disadvantageous to attack now
    return waitScore > attackScore * 0.5
```

---

### Wait Condition 1: Reinforcements Incoming

```
function checkReinforcementsIncoming(state, playerId):
    combatZone = getCombatZone(state, playerId)  # Tiles with enemies nearby
    
    reinforcements = state.units.filter(u =>
        u.ownerId === playerId &&
        !isInCombatZone(u.coord, combatZone) &&
        distanceToCombatZone(u.coord, combatZone) <= 3  # 1-3 turns away
    )
    
    reinforcementPower = sum(unitValue(r) for r in reinforcements)
    currentPower = sum(unitValue(u) for u in unitsInCombatZone)
    
    # If reinforcements would increase our power by >30%, wait
    if reinforcementPower > currentPower * 0.3:
        return { shouldWait: true, score: reinforcementPower * 0.5, reason: "Reinforcements incoming" }
    
    return { shouldWait: false, score: 0 }
```

**Key:** Only wait if reinforcements are *close* (1-3 turns). Don't wait indefinitely.

---

### Wait Condition 2: Local Power Disadvantage

```
function checkLocalPowerDisadvantage(state, playerId, attacks):
    combatZone = getCombatZone(state, playerId)
    
    ourUnits = unitsInZone(state, playerId, combatZone)
    theirUnits = enemyUnitsInZone(state, playerId, combatZone)
    
    ourPower = sum(effectiveCombatPower(u) for u in ourUnits)
    theirPower = sum(effectiveCombatPower(u) for u in theirUnits)
    
    ratio = ourPower / max(theirPower, 1)
    
    if ratio < 0.6:  # We're at >40% disadvantage
        return { shouldWait: true, score: 60, reason: "Outnumbered locally" }
    
    if ratio < 0.8:  # Slight disadvantage
        return { shouldWait: true, score: 30, reason: "Slight disadvantage" }
    
    return { shouldWait: false, score: 0 }
```

---

### Wait Condition 3: No Kill Possible

```
function checkNoKillPossible(state, attacks):
    killsPossible = attacks.filter(a => a.wouldKill).length
    
    if killsPossible === 0:
        # No kills this turn - maybe wait?
        totalDamage = sum(a.damage for a in attacks)
        totalExposure = sum(a.returnDamage for a in attacks)
        
        # If we'd take more damage than we deal, definitely wait
        if totalExposure > totalDamage * 0.8:
            return { shouldWait: true, score: 40, reason: "Bad trade, no kills" }
        
        # If damage is marginal, consider waiting
        if totalDamage < 10:
            return { shouldWait: true, score: 20, reason: "Marginal damage, no kills" }
    
    return { shouldWait: false, score: 0 }
```

---

### Wait Condition 4: Exposure After Attack

```
function checkExposureAfterAttack(state, playerId, attacks):
    # After attacking, movesLeft = 0. Can't retreat.
    # Calculate how exposed our attackers will be.
    
    exposureScore = 0
    for attack in attacks:
        afterPosition = getPositionAfterAttack(attack)  # Melee advance if kill
        threats = countThreatsToTile(state, playerId, afterPosition)
        
        if threats.count >= 3:
            exposureScore += 40  # Very exposed
        elif threats.count >= 2:
            exposureScore += 20  # Moderately exposed
    
    if exposureScore > 60:
        return { shouldWait: true, score: exposureScore, reason: "Would be too exposed" }
    
    return { shouldWait: false, score: 0 }
```

---

### Wait Condition 5: Terrain Disadvantage

```
function checkTerrainDisadvantage(state, attacks):
    disadvantageScore = 0
    
    for attack in attacks:
        defenderTerrain = getTerrain(state, attack.target.coord)
        attackerTerrain = getTerrain(state, attack.attacker.coord)
        
        # Defender on defensive terrain (forest, hill)
        if defenderTerrain.defenseBonus > attackerTerrain.defenseBonus:
            disadvantageScore += 15
    
    if disadvantageScore > 30:
        return { shouldWait: true, score: disadvantageScore, reason: "Terrain disadvantage" }
    
    return { shouldWait: false, score: 0 }
```

---

## Override: When NOT to Wait

Even if wait conditions are met, sometimes we must attack:

```
function mustAttackAnyway(state, playerId):
    memory = getAiMemory(state, playerId)
    
    # Override 1: War dragging on too long
    warDuration = state.turn - getWarStartTurn(...)
    if warDuration >= 25:
        return { mustAttack: true, reason: "War too long, push!" }
    
    # Override 2: City about to be captured (finish it)
    focusCity = getAiFocusCity(state, playerId)
    if focusCity && focusCity.hp <= 5:
        return { mustAttack: true, reason: "City almost down" }
    
    # Override 3: We have massive power advantage
    if ratio >= 2.0:
        return { mustAttack: true, reason: "Overwhelming force" }
    
    # Override 4: Aggressive civ personality
    if getCivPersonality(playerId) === "aggressive":
        # Aggressive civs are 50% less likely to wait
        # (lower the wait score threshold)
        pass
    
    return { mustAttack: false }
```

---

## What Does "Wait" Actually Mean?

When the AI decides to wait, it should:

1. **Don't attack** (obviously)
2. **Reposition for advantage** — move ranged to better ground, melee to flanking positions
3. **Hold ground** — fortify if already in good position
4. **Pull back slightly** — if overextended, retreat one tile

```
function executeWaitBehavior(state, playerId, units):
    for unit in units:
        if shouldReposition(unit, state):
            moveTowardBetterPosition(unit, state)
        elif shouldFortify(unit, state):
            fortify(unit)
        elif shouldPullBack(unit, state):
            retreatOneStep(unit, state)
        else:
            # Just do nothing this turn (skip)
            pass
```

---

## Integration with Level 4 (Primary Gate)

Level 4's army phase is the **primary gate**. Level 3 runs **within** the attack phase:

```
function runCombatAI(state, playerId):
    # Step 1: Level 4 - Are we in attack phase?
    armyPhase = getArmyPhase(state, playerId)
    
    if armyPhase !== "attacking":
        # NOT ATTACKING: Just position units toward rally
        return executeRallyBehavior(state, playerId)
    
    # Step 2: Level 1 - Plan optimal attack order
    plannedAttacks = planAttackOrderV2(state, playerId)
    
    # Step 3: Level 3 - Per-unit wait filter (secondary)
    # Even though army is "attacking", individual units may hold back
    filteredAttacks = []
    for attack in plannedAttacks:
        unitWaitCheck = shouldUnitWait(state, playerId, attack)
        if !unitWaitCheck.shouldWait:
            filteredAttacks.push(attack)
        else:
            # This unit waits - reposition instead
            executeRepositioning(state, attack.attacker)
    
    # Step 4: Execute filtered attacks
    return executeAttacks(state, filteredAttacks)
```

**Key insight:** Level 3 is NOT "should the army wait?" — that's Level 4. Level 3 is "given the army is attacking, should THIS SPECIFIC UNIT hold back?"

---

## Civ Personality Influence

> [!NOTE]
> Uses unified `CivAggressionProfile.waitThresholdMult` — see [Level 1B](./level-1-attack-order.md#override-5-civ-personality) for full table.

| Civ | Wait Threshold Multiplier |
|-----|--------------------------|
| ForgeClans | 0.4× (rarely waits) |
| RiverLeague | 0.5× |
| AetherianVanguard | 0.5× |
| JadeCovenant | 0.8× |
| ScholarKingdoms | 1.0× (baseline) |
| StarborneSeekers | 1.0× |

**Effect:** Aggressive civs need a much higher wait score to actually wait.

---

## Testing Strategy

### Unit Tests

| Test | Setup | Expected |
|------|-------|----------|
| Reinforcements incoming | 1 unit in combat, 2 units 2 tiles away | Wait |
| Outnumbered 1v3 | 1 vs 3 enemies | Wait |
| No kills possible, bad trade | Would deal 4, take 6 | Wait |
| Kill possible, slight disadvantage | Can secure kill | Attack |
| War too long override | 30 turns at war | Attack anyway |
| Aggressive civ | ForgeClans, slight disadvantage | Attack |

### Simulation Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Suicide attacks (attack when outnumbered) | ~15% | <5% |
| Units dying without reinforcement | ~25% | <10% |
| Wait-then-attack sequences | Rare | Common |

---

## Implementation Notes

**New file:** `engine/src/game/ai2/wait-decision.ts`

**Integration:** Insert wait check at start of `runTacticsV2()`

**Complexity:** Medium — mostly decision logic, no complex pathfinding

**Risk:** Could make AI too passive. Need anti-stalemate overrides from Level 1B.

---

## Relationship to Existing `shouldStage`

Current `shouldStage` is about **movement staging** before attacking a city.

Level 3 is about **attack timing** — skip the attack this turn entirely.

They're complementary:
- `shouldStage`: "Don't move to the city yet, wait for army to assemble"
- Level 3: "Don't attack yet, wait for better opportunity"

Consider merging the concepts in implementation to avoid redundancy.
