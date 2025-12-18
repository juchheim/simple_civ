# AI vs Human Balance Analysis

**Date:** 2025-12-18  
**Version:** 1.8  
**Purpose:** Critical assessment of game balance when a human player faces AI opponents.

---

## Executive Summary

> [!CAUTION]
> **The game is balanced for AI vs AI. A skilled human player will dominate the current AI.**

The balance work completed in v1.8 creates interesting variety and competitive dynamics between AI civilizations. However, it does not create a meaningful challenge for experienced 4X players. This document outlines why, and what can be done about it.

---

## Human Advantages the AI Cannot Counter

### 1. Perfect Information Exploitation

**Combat Preview System:**
- Humans can see exact damage ranges before attacking
- Attack, defense, flanking bonuses, and terrain modifiers are all visible
- Expected damage, counter-damage, and kill probability are displayed

**AI Limitation:**
```typescript
// AI uses static risk tolerance thresholds
const riskPenalty = (ret * 1.7) * (1 - profile.tactics.riskTolerance);
const suicidePenalty = suicide ? 200 : 0;
```

The AI applies a fixed penalty formula. Humans can calculate optimal trades and cherry-pick only guaranteed kills.

---

### 2. Diplomacy Manipulation

**AI Behavioral Constraints:**

| Setting | AI Behavior | Human Exploit |
|---------|-------------|---------------|
| `minWarTurn` | Won't attack before turn 8-14 | Free early expansion window |
| `warPowerRatio` | Needs 0.85-1.5x power to attack | Build overwhelming force without pressure |
| `peaceIfBelowRatio` | Proposes peace at 0.55-0.8 ratio | Humans can bleed AI dry then accept peace to heal |
| `canInitiateWars` | Scholar/Starborne = FALSE | They literally never attack first |

**Critical Exploit:**
Scholar Kingdoms and Starborne Seekers have `canInitiateWars: false`. They will **never** declare war on a human player. You can build in complete peace until you're ready to win.

---

### 3. Focus Fire / Deathball Management

**What the AI Does:**
```typescript
// AI tries to coordinate via forceConcentration
const requiredNear = Math.max(2, Math.ceil(profile.tactics.forceConcentration * 4));
```

The AI stages units before attacking, but execution is imperfect:
- Units sometimes move before the stack arrives
- Attack targeting uses scoring functions, not sequential kill optimization
- No concept of "bait and switch" tactics

**Human Advantage:**
- Stack 5+ units and systematically eliminate enemy units one-by-one
- Focus the biggest threat first
- Retreat, heal, repeat
- Use ranged units to soften, then melee to finish

---

### 4. Settler Spam Timing

**AI Constraints:**
```typescript
settlerCap: 3-5,      // Hard cap on settlers
desiredCities: 5-8,   // Soft limit on expansion
```

The AI follows conservative expansion rules. It won't spam 10+ settlers.

**Human Exploit:**
- Rush 2-3 extra settlers in the first 50 turns
- With 8+ cities vs AI's 3-4, you have 2x+ production
- Snowball advantage compounds every turn

---

### 5. Tech Path Optimization

**AI Tech Selection:**
```typescript
// AI uses weighted preference but not perfect chains
const weights = {
    [TechId.FormationTraining]: 1.4,
    [TechId.StarCharts]: 1.3,
    // etc.
};
```

The AI picks "good" techs but doesn't perfectly beeline critical paths.

**Human Exploit:**
1. Beeline StarCharts → Observatory → Academy → Experiment
2. Build only defensive units (BowGuards)
3. The AI won't attack aggressively enough to stop a pure Progress rush
4. Win by turn 180-200 without ever fighting

---

## Most Exploitable Civilizations (For Human Players)

### 🥇 AetherianVanguard - **BROKEN**

**Why it's overpowered in human hands:**
- **Titan** ignores terrain costs, has 2 movement, and 25 HP
- Human can build a perfect deathball escort (4+ ranged, 2+ melee, 1 Titan)
- AI cannot coordinate defense against a human-piloted Titan push
- With +1 Movement for all military (after Titan's Core), your army is faster than theirs

**Exploit Strategy:**
1. Rush Titan's Core (turn 120-130)
2. Pre-stage military around the build city
3. When Titan spawns, you have a 10+ unit deathball
4. Capture 2-3 capitals in 30 turns; victory by turn 160

---

### 🥈 ScholarKingdoms - **Easy Mode**

**Why it's overpowered in human hands:**
- +6 Defense distributed across cities = nearly unkillable
- +1 Science in Capital + per CityWard = faster tech
- AI will never attack you first (`canInitiateWars: false`)

**Exploit Strategy:**
1. Build 4-5 cities peacefully
2. Research StarCharts by turn 130
3. Build Progress chain while AI fights each other
4. Win by turn 200 with zero combat

---

### 🥉 JadeCovenant - **Snowball Potential**

**Why it's overpowered in human hands:**
- +5 starting food + 20% faster growth = explode to Pop 7+ by turn 100
- 30% cheaper settlers with 3 movement = claim the entire map
- +1 Atk/Def per 4 pop (late game: +3/+3 on all units)
- Nature's Wrath (1 dmg/turn to enemies in territory) = free attrition

**Exploit Strategy:**
1. Build 5 settlers in first 80 turns
2. Grow all cities to Pop 12+ (effectively free +3/+3 combat bonus)
3. Your late-game military crushes everything
4. Either Conquest or Progress win depending on preference

---

## What the AI Does Well

To be fair, the AI isn't completely trivial:

| Capability | Implementation |
|------------|----------------|
| **Civ-specific playstyles** | Each AI has unique profiles affecting diplomacy, tech, builds |
| **Basic tactical decisions** | Retreat when hurt, focus fire, flanking bonus awareness |
| **Progress denial** | AI WILL declare war if you're building Observatory |
| **Force concentration** | AI stages 3-4 units before attacking (usually) |
| **Titan agent** | Aetherian AI aggressively uses Titan (capital hunt behavior) |

---

## Difficulty Scaling Analysis

### Current State: No Difficulty Levels

The AI receives **no bonuses** compared to the human:
- Same production rates
- Same research speed
- Same combat stats
- Same visibility rules

### Industry Standard Comparison

| Game | Easy AI | Normal AI | Hard AI | Deity AI |
|------|---------|-----------|---------|----------|
| Civilization VI | -20% prod | Normal | +40% prod | +80% prod, +4 combat |
| Stellaris | -25% res | Normal | +50% res | +100% res |
| SimpleCiv | Normal | Normal | Normal | (none) |

---

## Recommended Fixes for Human vs AI Balance

### Phase 1: Quick Wins

1. **Remove Combat Preview Details**
   - Show only "Favorable / Even / Unfavorable" instead of exact numbers
   - Or make preview accuracy a tech unlock

2. **Earlier AI Aggression vs Humans**
   ```typescript
   // Detect human player and lower thresholds
   if (isHumanOpponent(otherId)) {
       effectiveWarPowerRatio *= 0.75;
       effectiveMinWarTurn -= 5;
   }
   ```

3. **AI Expansion Boost**
   - Increase `desiredCities` by +2 when facing humans
   - Remove `settlerCap` entirely vs human players

### Phase 2: Difficulty Levels

```typescript
type Difficulty = "Story" | "Normal" | "Hard" | "Impossible";

const difficultyBonuses: Record<Difficulty, DifficultyModifiers> = {
    Story: { aiProduction: 0.75, aiCombat: -1, aiTech: 0.8 },
    Normal: { aiProduction: 1.0, aiCombat: 0, aiTech: 1.0 },
    Hard: { aiProduction: 1.4, aiCombat: +2, aiTech: 1.3 },
    Impossible: { aiProduction: 2.0, aiCombat: +4, aiTech: 2.0 },
};
```

### Phase 3: Smarter AI Behaviors

1. **Anti-turtle detection**
   - If human hasn't expanded after turn 40, AI should swarm
   
2. **Coalition mechanics**
   - If human is leading, AI civs should ally against them
   
3. **Strategic deception**
   - AI shouldn't show exact unit positions in fog
   - Should feint attacks and hide unit composition

---

## Appendix: AI Profile Reference

### Aggressive Civs (Will Attack Humans)

| Civ | warPowerRatio | minWarTurn | canInitiateWars |
|-----|---------------|------------|-----------------|
| ForgeClans | 1.15 | 12 | ✅ Yes |
| RiverLeague | 0.85 | 8 | ✅ Yes |
| JadeCovenant | 1.0 | 10 | ✅ Yes |
| AetherianVanguard | 0.9 | 10 | ✅ Yes |

### Defensive Civs (Will NOT Attack Humans First)

| Civ | warPowerRatio | minWarTurn | canInitiateWars |
|-----|---------------|------------|-----------------|
| ScholarKingdoms | 1.5 | 20 | ❌ No |
| StarborneSeekers | 1.5 | 25 | ❌ No |

---

## Conclusion

The current balance creates:
- ✅ Interesting AI vs AI matches with 6 distinct playstyles
- ✅ Variety in victory types (31% Conquest / 64% Progress)
- ✅ Close-ish win rates (14-28% spread)
- ❌ Trivial challenge for experienced human players
- ❌ No difficulty scaling
- ❌ Exploitable defensive civs

**Expected human win rate: 90%+** against current AI.

---

*This document should be updated as difficulty systems are implemented.*
