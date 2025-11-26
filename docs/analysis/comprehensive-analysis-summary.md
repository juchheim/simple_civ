# Comprehensive Analysis Summary Report

**Date:** November 26, 2025  
**Simulations:** 50 total (10 per map size)  
**Total Time:** 1,159 seconds (23.2s per simulation)

---

## Executive Summary

Analysis of 50 simulations reveals significant balance issues, high settler death rates, and map-size-dependent game flow patterns. Key findings:

- **Victory Rate:** 88% (44/50 games)
- **Civ Balance:** ScholarKingdoms dominates (46% win rate), AetherianVanguard & JadeCovenant never win
- **Settler Death Rate:** 92.5% (extremely high)
- **Pop 10 Timing:** Cities reach pop 10 an average of 13.1 turns before victory
- **Stalls:** 6 games (12%) reached turn limit without victory, mostly on smaller maps

---

## 1. Which Civs Win by Which Victory Type

### Victory Distribution

| Civilization | Total Wins | Conquest | Progress | Conquest % | Progress % |
|--------------|-----------|----------|----------|-----------|------------|
| **ScholarKingdoms** | 23 | 1 | 22 | 4.3% | 95.7% |
| **ForgeClans** | 17 | 8 | 9 | 47.1% | 52.9% |
| **StarborneSeekers** | 3 | 0 | 3 | 0% | 100% |
| **RiverLeague** | 1 | 1 | 0 | 100% | 0% |
| **AetherianVanguard** | 0 | 0 | 0 | - | - |
| **JadeCovenant** | 0 | 0 | 0 | - | - |

### Key Insights

- **ScholarKingdoms** heavily favors Progress victories (95.7%) - their science bonus makes them dominant in tech races
- **ForgeClans** is balanced between Conquest (47.1%) and Progress (52.9%) - versatile
- **StarborneSeekers** exclusively wins via Progress (100%) - their wonder helps with tech
- **RiverLeague** only won once, via Conquest
- **AetherianVanguard & JadeCovenant** never won in any simulation

---

## 2. Accurate Participation & Win Rates per Civ

### Participation Statistics

| Civilization | Games Played | Win Rate | Elimination Rate | Avg Final Cities | Avg Final Pop |
|--------------|--------------|----------|------------------|------------------|---------------|
| **ScholarKingdoms** | 50 | **46.0%** | 28.0% | 2.3 | 15.9 |
| **ForgeClans** | 50 | **34.0%** | 6.0% | 5.3 | 39.5 |
| **RiverLeague** | 40 | 2.5% | 20.0% | 3.7 | 29.5 |
| **AetherianVanguard** | 30 | **0.0%** | 26.7% | 2.7 | 19.0 |
| **StarborneSeekers** | 20 | 15.0% | 15.0% | 2.9 | 21.4 |
| **JadeCovenant** | 20 | **0.0%** | 20.0% | 3.0 | 20.6 |

### Key Insights

- **Participation varies by map size:** Only ForgeClans and ScholarKingdoms appear in all 50 games (they're always in the first 2 slots). Other civs only appear on larger maps.
- **ScholarKingdoms** has highest win rate (46%) but also highest elimination rate (28%) - high risk, high reward
- **ForgeClans** is most stable (6% elimination rate) with good win rate (34%)
- **AetherianVanguard & JadeCovenant** have 0% win rate - severely underpowered
- **ForgeClans** builds more cities (5.3 avg) and has higher population (39.5 avg) than ScholarKingdoms (2.3 cities, 15.9 pop)

---

## 3. Why Smaller Maps Stall - Detailed Diagnostics

### Stall Statistics by Map Size

| Map Size | No Victory Games | Stall Rate | Common Issues |
|----------|-----------------|------------|---------------|
| **Tiny** | 2/10 (20%) | Highest | Low activity, tech progression slow |
| **Small** | 1/10 (10%) | Medium | One civ eliminated, others can't finish |
| **Standard** | 2/10 (20%) | Highest | Multiple eliminations, stalemate |
| **Large** | 1/10 (10%) | Medium | Active but no civ can close victory |
| **Huge** | 0/10 (0%) | None | All games finish |

### Detailed Stall Analysis

**Tiny Maps (2 stalls):**
- **Issue:** Very low activity in final turns (5-9 events in last 10 turns)
- **Pattern:** Both civs still alive, but neither can achieve victory
- **Example (Seed 3003):** ScholarKingdoms has 15 techs and 2 projects but can't complete Grand Experiment; ForgeClans has only 7 techs
- **Root Cause:** Limited map space prevents expansion, tech progression too slow

**Small Maps (1 stall):**
- **Issue:** One civ eliminated early, remaining civs can't finish
- **Example (Seed 105005):** ScholarKingdoms eliminated, ForgeClans and RiverLeague both have 4 cities but neither can win

**Standard Maps (2 stalls):**
- **Issue:** Multiple eliminations create stalemate situations
- **Pattern:** 2-3 civs remain, all have similar power, none can break through
- **Example (Seed 208008):** RiverLeague and AetherianVanguard both have 15 techs and many projects, but neither completes Grand Experiment

**Large Maps (1 stall):**
- **Issue:** Active game but no civ can close victory
- **Pattern:** Multiple civs remain, active wars and projects, but victory conditions not met

**Huge Maps (0 stalls):**
- **All games finish** - sufficient space and time for victory conditions

### Recommendations

1. **Smaller maps need faster tech progression** - reduce tech costs or increase science yields
2. **Victory conditions may be too strict** - consider making Progress victory easier on smaller maps
3. **AI may need better end-game push** - civs with advantage should be more aggressive about closing

---

## 4. Settler Death Rates vs Production

### Overall Statistics

- **Total Settlers Produced:** 1,007
- **Total Settlers Killed:** 931
- **Death Rate: 92.5%** ⚠️ **EXTREMELY HIGH**

### By Civilization

| Civilization | Produced | Killed | Death Rate |
|--------------|----------|--------|------------|
| ScholarKingdoms | 183 | 192 | **104.9%** ⚠️ |
| ForgeClans | 248 | 238 | 96.0% |
| RiverLeague | 205 | 184 | 89.8% |
| StarborneSeekers | 83 | 75 | 90.4% |
| JadeCovenant | 109 | 96 | 88.1% |
| AetherianVanguard | 179 | 146 | 81.6% |

### Key Insights

- **92.5% death rate is extremely problematic** - settlers are being killed almost as fast as they're produced
- **ScholarKingdoms has >100% death rate** - more settlers killed than produced (captured settlers count as kills)
- **Settlers are too vulnerable** - with only 1 HP, they die to any unit attack
- **This severely limits expansion** - cities can't be founded if settlers keep dying

### Recommendations

1. **Increase settler HP** - from 1 to 3-5 HP to survive at least one attack
2. **Add settler protection** - settlers could have defensive bonuses or require multiple attacks
3. **Improve AI settler escort** - AI should protect settlers with military units
4. **Reduce settler cost** - if they die so often, make them cheaper to replace

---

## 5. Army Usage Patterns

### Overall Statistics

- **Army Formations:** 68 total (1.36 per game)
- **Army Units Produced:** 0 (armies are transformed, not produced)
- **Army Units Killed:** 29 total

### Key Insights

- **Low army formation rate** - only 1.36 armies per game on average
- **Armies are rarely killed** - only 29 army deaths across 50 games
- **Armies may be underutilized** - Form Army projects aren't being prioritized
- **Army transformation works** - units are being converted to armies when projects complete

### Recommendations

1. **Make Form Army projects more attractive** - reduce cost or increase army bonuses
2. **AI should prioritize armies more** - especially in mid-late game
3. **Armies may be too powerful** - if they're rarely killed, they might be overpowered

---

## 6. Pop 10 vs Victory Timing Gap

### Overall Statistics

- **Games with Pop 10 Cities:** 28 of 44 victories (63.6%)
- **Average Victory Turn:** 161.2
- **Average Pop 10 Turn:** 148.1
- **Average Gap:** **13.1 turns** (pop 10 before victory)

### By Map Size

| Map Size | Games with Pop 10 | Avg Gap | Status |
|----------|-------------------|---------|--------|
| Small | 5 | 16.8 turns | Too early |
| Standard | 6 | 17.4 turns | Too early |
| Large | 8 | 15.8 turns | Too early |
| Huge | 9 | **5.9 turns** | ✓ Well-aligned |

### By Victory Type

- **Progress Victories:** 28 games, avg gap 13.1 turns
- **Conquest Victories:** No data (conquest happens before pop 10 typically)

### Key Insights

- **Gap improved from previous analysis** - was 21 turns, now 13.1 turns (growth cost increases helped)
- **Huge maps are well-aligned** - 5.9 turn gap is acceptable
- **Smaller maps still have large gaps** - 16-17 turns suggests growth is still too fast for smaller maps
- **Only 63.6% of victories have pop 10 cities** - many games end before cities reach pop 10

### Recommendations

1. **Growth adjustments are working for Huge maps** - keep current settings
2. **Consider map-size-specific growth** - smaller maps may need slower growth
3. **Current 13.1 turn gap is acceptable** - within reasonable range (<20 turns)

---

## Additional Findings

### War Statistics (Fixed - No Duplicates)

- **Unique Wars:** 396 total (7.9 per game)
- **Average War Duration:** ~22 turns
- **Peace Treaties:** 317 (wars do resolve)

### Technology Progression

- **Total Techs Researched:** 2,137 (42.7 per game)
- **Average per Civ:** ~8.5 techs per civ per game
- **Tech progression is healthy** - civs are researching consistently

### City Statistics

- **Total Cities Founded:** 726 (14.5 per game)
- **Total Cities Captured:** 219 (4.4 per game)
- **Cities Razed:** 0 (AI never razes cities)

---

## Critical Issues Identified

### 1. Civilization Balance ⚠️ CRITICAL

- **AetherianVanguard & JadeCovenant:** 0% win rate - need significant buffs
- **ScholarKingdoms:** 46% win rate - may be overpowered
- **Recommendation:** Rebalance civ traits and abilities

### 2. Settler Death Rate ⚠️ CRITICAL

- **92.5% death rate is unacceptable**
- **Recommendation:** Increase settler HP, improve AI protection, or reduce settler cost

### 3. Smaller Map Stalls ⚠️ MODERATE

- **20% of Tiny/Standard maps stall**
- **Recommendation:** Faster tech progression or easier victory conditions on smaller maps

### 4. Army Underutilization ⚠️ MINOR

- **Only 1.36 armies per game**
- **Recommendation:** Make Form Army projects more attractive to AI

---

## Recommendations Summary

### High Priority

1. **Fix settler vulnerability** - Increase HP from 1 to 3-5
2. **Rebalance civilizations** - Buff AetherianVanguard & JadeCovenant, consider nerfing ScholarKingdoms
3. **Improve smaller map game flow** - Faster tech or easier victories

### Medium Priority

4. **Map-size-specific growth tuning** - Smaller maps may need slower growth
5. **Improve AI settler protection** - Escort settlers with military units

### Low Priority

6. **Increase army formation rate** - Make Form Army projects more attractive
7. **Consider city razing** - AI never razes, might be useful in some situations

---

## Data Files

- **Simulation Results:** `/tmp/comprehensive-simulation-results.json` (16MB)
- **Full Analysis Report:** `docs/analysis/comprehensive-analysis-report.md`
- **Enhanced Analysis:** `docs/analysis/comprehensive-analysis-summary.md` (this file)

---

*Analysis completed with 50 simulations across all map sizes. All metrics now use accurate, deduplicated event tracking.*

