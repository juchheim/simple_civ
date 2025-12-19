# Level 1: Attack Order Optimization

**Status:** Planned  
**Complexity:** High  
**Related:** [balance-plan.md](./balance-plan.md) | [balance-analysis.md](./balance-analysis.md)

---

> [!IMPORTANT]
> **This spec accounts for actual game mechanics discovered in the codebase.** The original Level 1 concept was revised after reviewing movement and attack rules.

---

## Game Rules (Confirmed from Codebase)

**Attack Requirements:**
- Unit must have `movesLeft > 0` to attack (`assertMovesLeft()` in `handleAttack`)
- Unit must have `hasAttacked === false`
- Target must be within unit's range (`hexDistance(attacker.coord, target.coord) <= stats.rng`)
- Ranged units (range > 1) require line of sight

**Attack Consequences:**
- After attacking: `movesLeft = 0` AND `hasAttacked = true`
- No movement allowed after attacking (movement also requires `movesLeft > 0`)
- Melee units advance into tile if they kill the defender

**Key Implication:** The order of operations matters significantly. A unit that moves first loses movement points, potentially preventing attack if terrain cost exceeded available moves.

---

## Split: Level 1A vs Level 1B

Given the complexity, Level 1 should be split:

| Level | Focus | Complexity | Prerequisite |
|-------|-------|------------|--------------|
| **1A** | Attack order for units already in range | Medium | None |
| **1B** | Move-then-attack coordination | High | 1A complete |

---

# Level 1A: In-Range Attack Ordering

## Scope

Only consider units that can attack **right now** without moving:
- Filter to units with `movesLeft > 0` AND `hasAttacked === false`
- Filter targets to those within unit's attack range
- Plan optimal attack sequence among these ready-to-fire units

## Algorithm

```
function planAttackOrderV2(state, playerId):
    # Phase 1: Gather eligible attackers
    eligibleAttackers = state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
        !isGarrisoned(u, state)  # Garrisoned units can't attack
    )
    
    # Phase 2: For each attacker, find valid targets in range
    attackOptions = []
    for each attacker in eligibleAttackers:
        range = UNITS[attacker.type].rng
        targets = findTargetsInRange(state, attacker, range)
        for each target in targets:
            attackOptions.push({ attacker, target })
    
    # Phase 3: Greedy kill optimization with simulated HP
    simulatedHP = new Map(enemies => enemy.hp)
    plannedAttacks = []
    usedAttackers = new Set()
    
    while attackOptions.length > 0:
        # Score all remaining options using SIMULATED HP
        scored = attackOptions
            .filter(opt => !usedAttackers.has(opt.attacker.id))
            .filter(opt => simulatedHP.get(opt.target.id) > 0)
            .map(opt => {
                simHP = simulatedHP.get(opt.target.id)
                preview = getCombatPreview(opt.attacker, opt.target, state)
                dmg = preview.estimatedDamage.avg
                wouldKill = (simHP - dmg) <= 0
                return { ...opt, dmg, wouldKill, score: scoreAttack(opt, dmg, wouldKill, preview) }
            })
            .sort((a, b) => b.score - a.score)
        
        if scored.length === 0:
            break
            
        best = scored[0]
        plannedAttacks.push(best)
        usedAttackers.add(best.attacker.id)
        simulatedHP.set(best.target.id, simulatedHP.get(best.target.id) - best.dmg)
    
    return plannedAttacks
```

## Scoring Function

```
function scoreAttack(opt, dmg, wouldKill, preview):
    base = dmg * 2
    
    # MASSIVE bonus for kills (this is THE key insight)
    killBonus = wouldKill ? 150 : 0
    
    # Bonus for high-threat targets (they would hurt us more next turn)
    threatBonus = getThreatLevel(opt.target) * 15
    
    # Penalize ranged units killing when melee could (preserve ranged for softening)
    rangedFinishPenalty = 0
    if wouldKill && opt.attacker.type === BowGuard && dmg > opt.target.hp + 2:
        rangedFinishPenalty = 30  # Slight penalty for overkill with ranged
    
    # Penalize suicide (unless trading up)
    returnDmg = preview.returnDamage?.avg ?? 0
    isSuicide = returnDmg >= opt.attacker.hp
    suicidePenalty = 0
    if isSuicide:
        if wouldKill && unitValue(opt.target) > unitValue(opt.attacker):
            suicidePenalty = 20  # Small penalty, trade is worth it
        else:
            suicidePenalty = 200  # Never suicide for no kill
    
    # Risk penalty (scaled down if we're getting the kill)
    riskPenalty = wouldKill ? (returnDmg * 0.3) : (returnDmg * 1.5)
    
    return base + killBonus + threatBonus - rangedFinishPenalty - suicidePenalty - riskPenalty
```

## Overkill Prevention

```
# After executing each attack, check if target is dead
for attack in plannedAttacks:
    currentHP = getActualHP(state, attack.target.id)
    if currentHP <= 0:
        continue  # Target already dead, skip this attack
    
    executeAttack(state, attack)
```

---

# Level 1B: Move-Then-Attack Coordination

## The Problem

A unit 2 tiles away from an enemy can:
1. Move 1 tile closer
2. Attack (if range allows from new position)

But if the unit uses ALL moves (e.g., moving through forest costs 2), it CAN'T attack.

## Key Insight

The AI needs to plan movement **considering the attack it wants to execute**, not greedily move then figure out what to attack.

## Algorithm Concept

```
function planMoveAndAttack(state, playerId):
    # Phase 1: Run Level 1A for units already in position
    immediateAttacks = planAttackOrderV2(state, playerId)
    
    # Phase 2: For units NOT in any attack range, can they reach attack range?
    needsMovement = state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
        !hasAnyTargetInRange(u, state)  # No targets right now
    )
    
    for each unit in needsMovement:
        # Find all tiles the unit can reach with movesLeft >= 1 remaining
        reachableTiles = findTilesWithMovesRemaining(state, unit, minMovesAfter: 1)
        
        # For each reachable tile, check if any enemy would be in attack range
        attackOpportunities = []
        for each tile in reachableTiles:
            targetsFromTile = findTargetsInRange(state, unit, tile)
            if targetsFromTile.length > 0:
                attackOpportunities.push({ tile, targets: targetsFromTile })
        
        # Pick the opportunity with highest potential kill / damage
        if attackOpportunities.length > 0:
            best = scoreMoveAttackOpportunities(attackOpportunities)
            return { moveAction: move(unit, best.tile), attackAfter: true }
    
    return null  # No good move-attack combos
```

## Movement Cost Awareness

**Critical:** The `findTilesWithMovesRemaining` function must account for terrain costs:

- Grassland: 1 move
- Forest/Hill: 2 moves
- Titan ignores terrain (always 1)

A unit with 2 `movesLeft` can:
- Move 2 tiles on grassland (2 moves spent, 0 left, CAN'T ATTACK)
- Move 1 tile on forest (2 moves spent, 0 left, CAN'T ATTACK)
- Move 1 tile on grassland (1 move spent, 1 left, CAN ATTACK)

---

## Exposure Damage Consideration

> [!WARNING]
> **This is the gap that causes AI units to walk into death.** The AI moves into range, can't attack, and gets destroyed before their turn.

When a unit moves but CAN'T attack this turn (0 moves remaining), the enemy gets a free turn to attack first. The AI must estimate:

1. How much damage will this unit take before their next turn?
2. Will the unit survive to actually attack?
3. Is the trade still worth it?

### Exposure Calculation

```
function calculateExposureDamage(state, unit, destinationTile):
    exposureDamage = 0
    
    for each enemy in state.units (where enemy.ownerId != unit.ownerId):
        enemyRange = UNITS[enemy.type].rng
        distanceToDestination = hexDistance(enemy.coord, destinationTile)
        
        if distanceToDestination <= enemyRange:
            preview = getCombatPreview(enemy, unit, state)
            exposureDamage += preview.estimatedDamage.avg
        
        elif distanceToDestination <= enemyRange + enemy.movesLeft:
            preview = getCombatPreview(enemy, unit, state)
            exposureDamage += preview.estimatedDamage.avg * 0.7  # Discount slightly
    
    return exposureDamage
```

### Survival Check

```
function isMoveSurvivable(unit, destinationTile, state):
    exposure = calculateExposureDamage(state, unit, destinationTile)
    survivalHP = unit.hp - exposure
    
    if survivalHP <= 0:
        return { survivable: false, reason: "Would die before attacking" }
    
    if survivalHP <= 2:
        return { survivable: true, marginal: true, reason: "Would survive but barely" }
    
    return { survivable: true, marginal: false }
```

### Movement Decision Flow

```
function shouldMoveToAttackPosition(unit, tile, state, canAttackThisTurn):
    if canAttackThisTurn:
        return { shouldMove: true }
    
    survival = isMoveSurvivable(unit, tile, state)
    
    if !survival.survivable:
        return { shouldMove: false, reason: "Would die before attacking" }
    
    if survival.marginal:
        potentialTarget = getBestTargetFromTile(state, unit, tile)
        if potentialTarget && isHighValueTarget(potentialTarget):
            return { shouldMove: true, reason: "High value target worth the risk" }
        return { shouldMove: false, reason: "Not worth the exposure damage" }
    
    return { shouldMove: true }
```

### High Value Targets
- Enemy Titan: Always worth exposure
- Enemy Settler: Usually worth exposure
- Low HP ranged unit (guaranteed kill): Worth exposure
- Full HP melee unit: Probably NOT worth exposure

---

## Anti-Stalemate Override Conditions

> [!CAUTION]
> **Without these overrides, the AI becomes too passive and games stall.**

### Override 1: Power Advantage

```
function getPowerOverrideMultiplier(state, playerId, targetId):
    myUnits = countMilitaryUnits(state, playerId)
    theirUnits = countMilitaryUnits(state, targetId)
    ratio = myUnits / max(theirUnits, 1)
    
    if ratio >= 2.0: return 0.3  # Only consider 30% of exposure
    if ratio >= 1.5: return 0.6
    if ratio >= 1.2: return 0.8
    return 1.0
```

### Override 2: War Duration Escalation

```
function getWarDurationMultiplier(state, playerId, targetId):
    turnsAtWar = state.turn - getWarStartTurn(state, playerId, targetId)
    
    if turnsAtWar >= 30: return 0.3  # Desperate
    if turnsAtWar >= 20: return 0.5
    if turnsAtWar >= 10: return 0.7
    return 1.0
```

### Override 3: Strategic Objective Proximity

```
function getObjectiveProximityMultiplier(state, unit, playerId):
    focusCity = getAiFocusCity(state, playerId)
    if !focusCity: return 1.0
    
    dist = hexDistance(unit.coord, focusCity.coord)
    if dist <= 2: return 0.4  # Commit!
    if dist <= 4: return 0.6
    return 1.0
```

### Override 4: No Safe Options

```
function forceMovementIfNeeded(unit, allMoveOptions, state):
    safeOptions = allMoveOptions.filter(opt => opt.exposure <= 0)
    
    if safeOptions.length > 0:
        return pickBest(safeOptions)
    
    # NO safe options - pick least-bad
    return allMoveOptions
        .sort((a, b) => (b.potentialDamage - b.exposure) - (a.potentialDamage - a.exposure))
        [0]
```

### Override 5: Civ Personality

> [!IMPORTANT]
> **Unified CivAggressionProfile** — All levels should use these consistent values to avoid conflicting aggression behaviors.

```typescript
// Shared across Levels 1B, 3, and 4
// Derived from existing forceConcentration (0.55-0.9) and riskTolerance (0.2-0.55) in rules.ts
type CivAggressionProfile = {
    exposureMultiplier: number;     // Level 1B: Multiplies calculated exposure
    waitThresholdMult: number;      // Level 3: Multiplies wait score threshold
    maxStagingTurns: number;        // Level 4: Max turns to wait in "staged" phase
    requiredArmyPercent: number;    // Level 4: % of army needed to attack
};

const CIV_AGGRESSION: Record<string, CivAggressionProfile> = {
    // Aggressive civs: high riskTolerance (0.55), high forceConcentration (0.75)
    ForgeClans:         { exposureMultiplier: 0.6,  waitThresholdMult: 0.4, maxStagingTurns: 2, requiredArmyPercent: 0.60 },
    RiverLeague:        { exposureMultiplier: 0.6,  waitThresholdMult: 0.5, maxStagingTurns: 2, requiredArmyPercent: 0.65 },
    AetherianVanguard:  { exposureMultiplier: 0.6,  waitThresholdMult: 0.5, maxStagingTurns: 1, requiredArmyPercent: 0.50 },
    // Balanced civ: moderate riskTolerance (0.45), moderate forceConcentration (0.7)
    JadeCovenant:       { exposureMultiplier: 0.8,  waitThresholdMult: 0.8, maxStagingTurns: 3, requiredArmyPercent: 0.70 },
    // Defensive civs: low riskTolerance (0.2), low forceConcentration (0.55)
    ScholarKingdoms:    { exposureMultiplier: 1.0,  waitThresholdMult: 1.0, maxStagingTurns: 4, requiredArmyPercent: 0.80 },
    StarborneSeekers:   { exposureMultiplier: 1.0,  waitThresholdMult: 1.0, maxStagingTurns: 4, requiredArmyPercent: 0.80 },
};
```

**Usage in each level:**
- **Level 1B:** `effectiveExposure = rawExposure * profile.exposureMultiplier`
- **Level 3:** `shouldWait = waitScore > attackScore * profile.waitThresholdMult`
- **Level 4:** `triggersAttack = turnsStaged >= profile.maxStagingTurns || armyPercent >= profile.requiredArmyPercent`

```
function getCivPersonalityMultiplier(state, playerId):
    civ = getPlayerCiv(state, playerId)
    return CIV_AGGRESSION[civ]?.exposureMultiplier ?? 0.85
```

### Override 6: Controlled Randomness

```
function getRandomVariance(gameSeed, unitId):
    hash = hashCombine(gameSeed, unitId)
    variance = 0.85 + (hash % 31) / 100  # Range: 0.85 to 1.15
    return variance
```

### Combined Calculation

```
function getEffectiveExposure(unit, tile, state, playerId, targetId):
    rawExposure = calculateExposureDamage(state, unit, tile)
    
    powerMult = getPowerOverrideMultiplier(state, playerId, targetId)
    warMult = getWarDurationMultiplier(state, playerId, targetId)
    objMult = getObjectiveProximityMultiplier(state, unit, playerId)
    civMult = getCivPersonalityMultiplier(state, playerId)
    randomMult = getRandomVariance(state.seed, unit.id)
    
    return rawExposure * powerMult * warMult * objMult * civMult * randomMult
```

### Example Scenarios

| Situation | Raw | Power | War | Obj | Civ | Rand | Effective | Decision |
|-----------|-----|-------|-----|-----|-----|------|-----------|----------|
| ForgeClans, even armies | 6 | 1.0 | 1.0 | 1.0 | 0.7 | 0.95 | 4.0 | Attack! |
| ScholarKingdoms, even | 6 | 1.0 | 1.0 | 1.0 | 1.0 | 1.05 | 6.3 | Defend |
| RiverLeague, 20 turns war | 6 | 1.0 | 0.5 | 1.0 | 0.7 | 1.0 | 2.1 | Attack! |
| Starborne, near city | 6 | 1.0 | 1.0 | 0.4 | 1.0 | 0.9 | 2.2 | Push! |

---

## Ranged vs Melee Exposure Difference

**Ranged units** face less exposure when attacking (2 tiles away):
- Enemy melee can't counterattack
- Exposure only from enemy ranged units

**Melee units** face full exposure:
- Must be adjacent
- Enemy always counterattacks

**Algorithm should prefer:**
1. Ranged units close distance first (lower exposure)
2. Melee only advance when they can attack this turn OR ranged has softened targets

---

## Testing Strategy

### Level 1A Unit Tests

| Test | Setup | Expected |
|------|-------|----------|
| 2 attackers secure 1 kill | 2 BowGuards vs 1 Spear (7 HP) | Both attack same target, 1 kill |
| 3 vs 2 focus fire | Mix of units | Maximize kills, not spread damage |
| Ranged softens, melee finishes | BowGuard + SpearGuard | Bow first if needed for kill |
| Overkill prevention | 3 vs 1 where 2 kills | Only 2 attack |
| No suicide for damage | Low HP vs full HP | Don't attack if die without kill |

### Level 1B Unit Tests

| Test | Setup | Expected |
|------|-------|----------|
| Move into range and attack | 2 tiles away, grassland | Move 1, attack |
| Don't overextend | 2 tiles, forest | Don't move if 0 moves after |
| Prioritize attack over move | Could move 3 or move 1+attack | Choose move 1+attack |

### Simulation Metrics

| Metric | Before | Target (1A) | Target (1A+1B) |
|--------|--------|-------------|----------------|
| Kills per combat round | ~0.4 | ~0.6 | ~0.75 |
| Spread damage wasted | ~20% | <5% | <5% |
| Units dying without kills | ~35% | ~25% | ~20% |

---

## Implementation Notes

**New file:** `engine/src/game/ai2/attack-order.ts`

**Integration:** Call `planAttackOrderV2()` at start of `executeCombatV2()` before individual unit processing.

**Changes to existing code:**
- `tactics.ts`: Replace per-unit evaluation with ordered execution
- Modify `bestAttackForUnit()` to work with pre-planned orders

**Recommendation:** Implement 1A first, validate, then add 1B.
