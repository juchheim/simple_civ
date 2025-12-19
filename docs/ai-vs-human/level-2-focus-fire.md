# Level 2: Focus Fire Enforcement

**Status:** Planned  
**Complexity:** Medium  
**Prerequisite:** [Level 1](./level-1-attack-order.md) implemented  
**Related:** [balance-plan.md](./balance-plan.md)

---

## Current State Analysis

### What Already Exists

The codebase has existing focus fire logic in `battle-groups.ts`:

```typescript
// selectPrimaryTarget - picks best target for a battle group
const targetCandidates = nearbyEnemies.map(enemy => {
    const totalDamage = unitsInRange.reduce((sum, u) => sum + damage(u, enemy), 0);
    return { enemy, canKill: totalDamage >= enemy.hp };
}).sort((a, b) => {
    if (a.canKill !== b.canKill) return a.canKill ? -1 : 1;  // Killable first
    // Then by units in range, then by HP
});

// coordinateGroupAttack - executes focus fire
// Orders: ranged first (soften), then melee (finish)
// All units target same enemy until dead, then switch
```

**What works:**
- Ranged-first ordering ✅
- Priority on killable targets ✅
- Target switching when current target dies ✅

---

### Gaps in Current Implementation

| Gap | Description | Impact |
|-----|-------------|--------|
| **Battle groups are reactive** | Only form when units are already near enemies | Units spread across map don't coordinate |
| **Per-group targeting** | Each battle group picks its own target | Multiple groups might attack different enemies |
| **No memory persistence** | Target is recalculated every turn | Can lead to target oscillation |
| **Separate from Level 1** | Not integrated with attack order optimization | Competes with greedy ordering |

---

## Level 2 Goal

**Ensure ALL attacks in a combat round go to the same target until that target is dead.**

This is stricter than current behavior:
- Current: Each battle group focuses, but different groups might have different targets
- Level 2: **Global** focus across all units engaged in the same theater

---

## The Problem: Spread Damage

**Scenario:** 5 AI units vs 3 enemy units

**Current Behavior (with battle groups):**
```
Group A (2 units): Targets Enemy 1
Group B (3 units): Targets Enemy 2
Result: Both enemies wounded, neither dead
```

**Ideal Behavior (Level 2):**
```
All 5 units target Enemy 1 → Dead
Remaining attacks go to Enemy 2 → Dead or nearly dead
Result: 2 kills instead of 0
```

---

## Relationship to Level 1

Level 1 already does attack order optimization, which naturally leads to focus fire through the kill bonus in scoring:

```
killBonus = wouldKill ? 150 : 0
```

**Question:** Is Level 1's kill bonus sufficient for focus fire, making Level 2 redundant?

### Analysis

**Level 1 alone:**
- Orders attacks to maximize kills
- Uses simulated HP to track damage
- Naturally focuses on one target until dead
- **Already achieves most of Level 2's goals**

**Where Level 1 falls short:**
1. Doesn't persist target across turns (no memory)
2. Doesn't coordinate movement (Level 1B covers this)
3. Doesn't handle "no kills possible" case explicitly

---

## Level 2 Design: Explicit Focus Target

### Concept

Add an explicit **Tactical Focus Target** that persists across the attack planning phase:

> [!NOTE]
> This is `tacticalFocusUnitId` (unit to kill), distinct from existing `focusCityId` (city to siege) and `focusTargetPlayerId` (player to attack).

```
function getOrSetTacticalFocusTarget(state, playerId, engagedEnemies):
    memory = getAiMemory(state, playerId)
    
    # Check if current focus is still valid
    if memory.tacticalFocusUnitId:
        focusUnit = state.units.find(u => u.id === memory.tacticalFocusUnitId)
        if focusUnit && focusUnit.hp > 0 && isEngaged(focusUnit, state, playerId):
            return focusUnit  # Keep current focus
    
    # Need new focus target
    newFocus = pickBestFocusTarget(engagedEnemies, state, playerId)
    memory.tacticalFocusUnitId = newFocus?.id
    return newFocus
```

### Integration with Level 1

Modify Level 1's scoring to add a **focus bonus**:

```
function scoreAttack(opt, dmg, wouldKill, preview, focusTargetId):
    base = dmg * 2
    killBonus = wouldKill ? 150 : 0
    
    # NEW: Focus fire bonus
    focusBonus = 0
    if focusTargetId && opt.target.id === focusTargetId:
        focusBonus = 50  # Prefer attacking the designated focus target
    
    # ... rest of scoring ...
    
    return base + killBonus + focusBonus - penalties
```

This makes the AI prefer the focus target even when kills aren't possible, preventing spread damage.

---

## Target Selection Algorithm

When picking a new focus target, prioritize:

```
function pickBestFocusTarget(enemies, state, playerId):
    scored = enemies.map(enemy => {
        score = 0
        
        # 1. Killability (highest priority)
        totalDamageAvailable = sumAllAttackerDamage(state, playerId, enemy)
        if totalDamageAvailable >= enemy.hp:
            score += 200  # Guaranteed kill
        elif totalDamageAvailable >= enemy.hp * 0.7:
            score += 100  # Likely kill
        
        # 2. Threat level (high threat = prioritize)
        score += getThreatLevel(enemy) * 20
        
        # 3. Current HP (low HP = easier to finish)
        score += (enemy.maxHp - enemy.hp) * 2
        
        # 4. Unit value (high value targets)
        score += unitValue(enemy)
        
        # 5. Already damaged this turn (commit to finishing)
        if enemy.lastDamagedOnTurn === state.turn:
            score += 75  # Finish what we started
        
        return { enemy, score }
    })
    
    return pickBest(scored, s => s.score)?.enemy
```

### Priority Order

1. **Guaranteed kill** (+200)
2. **Already damaged this turn** (+75) — prevents switching mid-round
3. **Likely kill** (+100)
4. **High threat** (×20)
5. **Low HP** (×2)
6. **High value** (unit value score)

---

## "No Kills Possible" Case

When no enemy can be killed this turn, the AI should still focus:

```
function handleNoKillsPossible(enemies, state, playerId):
    # Pick the enemy we can damage the MOST
    # This sets up a kill for next turn
    
    return enemies
        .map(e => ({
            enemy: e,
            damage: sumAllAttackerDamage(state, playerId, e),
            remainingHp: e.hp - sumAllAttackerDamage(state, playerId, e)
        }))
        .sort((a, b) => a.remainingHp - b.remainingHp)  # Lowest remaining HP first
        [0]?.enemy
```

This ensures that if we can't kill anything, we at least set up a kill for next turn by maximizing damage on **one** target.

---

## Testing Strategy

### Unit Tests

| Test | Setup | Expected |
|------|-------|----------|
| Focus bonus applied | 2 enemies, 1 is focus target | Attacks go to focus target first |
| Kill overrides focus | Focus has 10 HP, other has 1 HP | Secure the kill, then focus |
| Already damaged bonus | Enemy damaged this turn | Continue attacking same target |
| No kills - concentrate | All enemies at full HP | All damage to one enemy |
| Focus persists | Same target selected next turn | Memory preserves focus |

### Simulation Metrics

| Metric | Before (Level 1 only) | Target (Level 1+2) |
|--------|----------------------|-------------------|
| Spread damage rate | ~10% | <3% |
| Turn-to-turn target switches | ~30% | <10% |
| Damaged but not killed rate | ~25% | <15% |

---

## Implementation Notes

**Modified files:**
- `engine/src/game/ai2/attack-order.ts` (add focus bonus to scoring)
- `engine/src/game/ai2/memory.ts` (add `tacticalFocusUnitId`)
- May retire or modify `battle-groups.ts` logic to avoid conflicts

**Key insight:** Level 2 is largely an **enhancement** to Level 1, not a separate system. The focus bonus nudges Level 1's greedy algorithm toward consistent targeting.

---

## Overlap with Existing Code

`battle-groups.ts` already has focus fire logic. Options:

1. **Keep both:** Battle groups for reactive clustering, Level 2 for global focus
2. **Replace:** Level 2 subsumes battle groups entirely
3. **Merge:** Integrate battle group target selection into Level 2's focus picking

**Recommendation:** Option 3 — The `selectPrimaryTarget` logic is solid, reuse it in Level 2's `pickBestFocusTarget`.

---

## Complexity Assessment

**Why this is "Medium" complexity:**
- Mostly scoring adjustments (low code change)
- Memory integration is straightforward
- Risk: Could conflict with existing battle-groups.ts

**Prerequisite: Level 1** — Focus bonus only makes sense after attack ordering is in place.
