# City Growth Alignment Analysis Report

**Date:** November 26, 2025  
**Analysis:** City growth timing vs victory achievement  
**Simulations:** 5 runs on Huge maps with 6 civilizations each  
**Turn Limit:** 200 turns or victory

---

## Executive Summary

Cities are reaching population 10 **significantly earlier** than victory is achieved. The average gap is **21.0 turns**, meaning cities typically hit pop 10 about 3 weeks (in game time) before the game ends. This suggests city growth should be **slowed down by approximately 15-20%** to better align pop 10 achievement with victory timing.

---

## Simulation Results

### Simulation Overview

| Sim | Seed | Victory Turn | Winner | Total Cities | Cities @ Pop 10 | Avg Pop 10 Turn | Gap |
|-----|------|--------------|--------|--------------|-----------------|-----------------|-----|
| 1   | 1001 | 192          | StarborneSeekers | 29 | 14 (48.3%) | 160.1 | +31.9 |
| 2   | 2002 | 120          | ScholarKingdoms | 23 | 2 (8.7%) | 111.0 | +9.0 |
| 3   | 3003 | 133          | ScholarKingdoms | 26 | 4 (15.4%) | 114.5 | +18.5 |
| 4   | 4004 | 138          | ScholarKingdoms | 24 | 3 (12.5%) | 114.3 | +23.7 |
| 5   | 5005 | 136          | ScholarKingdoms | 25 | 5 (20.0%) | 114.0 | +22.0 |

**Key Observations:**
- All 5 simulations ended in victory (none hit 200 turn limit)
- Average victory turn: **143.8**
- Median victory turn: **136**
- Total cities reaching pop 10: **28** across all simulations
- Average cities per simulation reaching pop 10: **5.6** (out of ~25 cities)

---

## Pop 10 Achievement Analysis

### Timing Statistics

- **First city to reach pop 10:** Turn 102
- **Last city to reach pop 10:** Turn 191
- **Average turn to reach pop 10:** Turn 136.9
- **Median turn to reach pop 10:** Turn 125
- **Q1 (25th percentile):** Turn 114
- **Q3 (75th percentile):** Turn 163
- **Standard deviation:** 28.4 turns

### Distribution

- **Early (<120 turns):** 10 cities (35.7%)
- **Mid-game (120-149 turns):** 8 cities (28.6%)
- **Late (≥150 turns):** 10 cities (35.7%)

### Growth Rates

Average growth rate to pop 10: **~0.09 pop/turn** (approximately 11-12 turns per population point from founding to pop 10)

---

## Victory vs Pop 10 Alignment

### Per-Simulation Gaps

| Simulation | Victory Turn | Avg Pop 10 Turn | Gap |
|------------|--------------|-----------------|-----|
| 1 | 192 | 160.1 | **+31.9** |
| 2 | 120 | 111.0 | **+9.0** |
| 3 | 133 | 114.5 | **+18.5** |
| 4 | 138 | 114.3 | **+23.7** |
| 5 | 136 | 114.0 | **+22.0** |

**Average gap:** **21.0 turns** (cities reach pop 10 before victory)

### Aggregate Analysis

- **Average victory turn:** 143.8
- **Average pop 10 turn:** 136.9
- **Aggregate gap:** 6.9 turns

*Note: The per-simulation average gap (21.0) is more accurate as it accounts for varying numbers of cities reaching pop 10 in each simulation.*

---

## Growth Milestones Analysis

### Across All Simulations

| Milestone | Cities Reaching | Percentage | Avg Turn | Range |
|-----------|----------------|------------|----------|-------|
| Pop 3 | ~120 cities | ~92% | ~66 | [14, 187] |
| Pop 5 | ~112 cities | ~86% | ~83 | [25, 180] |
| Pop 7 | ~88 cities | ~68% | ~96 | [43, 188] |
| Pop 10 | 28 cities | ~22% | ~137 | [102, 191] |

### Growth Trajectory (Typical Simulation)

- **Turn 25:** ~36 cities, avg pop 2.7
- **Turn 50:** ~75 cities, avg pop 3.3
- **Turn 75:** ~120 cities, avg pop 4.1
- **Turn 100:** ~138 cities, avg pop 5.3
- **Turn 125:** ~144 cities, avg pop 6.6, some cities at pop 10+
- **Turn 150:** ~150 cities, avg pop 7.5, more cities at pop 10+

---

## Detailed Per-Simulation Breakdown

### Simulation 1 (Seed 1001) - Longest Game
- **Victory:** Turn 192 (StarborneSeekers)
- **Cities reaching pop 10:** 14 of 29 (48.3%)
- **Pop 10 range:** Turns 120-191
- **Average pop 10 turn:** 160.1
- **Gap:** +31.9 turns (largest gap)
- **Notable:** This was the longest game and had the most cities reach pop 10

### Simulation 2 (Seed 2002) - Shortest Game
- **Victory:** Turn 120 (ScholarKingdoms)
- **Cities reaching pop 10:** 2 of 23 (8.7%)
- **Pop 10 range:** Turns 110-112
- **Average pop 10 turn:** 111.0
- **Gap:** +9.0 turns (smallest gap)
- **Notable:** Early conquest victory, few cities reached pop 10

### Simulations 3-5 (Seeds 3003, 4004, 5005)
- **Victory range:** Turns 133-138
- **Cities reaching pop 10:** 3-5 per simulation (12-20%)
- **Average pop 10 turn:** ~114 turns
- **Gap range:** +18.5 to +23.7 turns
- **Notable:** Consistent pattern of mid-game victories with moderate pop 10 achievement

---

## Recommendations

### Primary Recommendation: Slow Down City Growth by 15-20%

**Target:** Reduce the gap from 21.0 turns to <5 turns by delaying pop 10 achievement

**Current Situation:**
- Cities reach pop 10 at turn ~137 on average
- Victory occurs at turn ~144 on average
- Gap: Cities reach pop 10 **21 turns too early**

**Goal:** Slow growth so cities reach pop 10 closer to victory timing (around turn 140-145 instead of turn 137)

**Methods to Consider:**

1. **Increase Growth Costs**
   - Current: Pop 9→10 costs 159 food (no Farmstead)
   - Suggested: Increase by 15-20% for pop 7-10 range
   - Example: Pop 9→10 could cost ~185-190 food instead of 159

2. **Adjust Growth Formula Multipliers**
   - Current growth factors: 1.20 (2-4), 1.27 (5-6), 1.32 (7-8), 1.37 (9-10), 1.42 (11+)
   - Suggested: Increase factors by ~0.05-0.10 for pop 7-10 range
   - Example: 9-10 could use 1.45-1.50 instead of 1.37

3. **Reduce Base Food Yields (if needed)**
   - City centers currently guarantee ≥2 food
   - Only consider this if other methods aren't sufficient
   - Would affect early game growth too, so use cautiously

4. **Building Modifiers**
   - Farmstead currently reduces growth cost by 10%
   - Could reduce this to 5-7% to slow growth slightly
   - Or keep as-is if other adjustments are sufficient

### Secondary Considerations

1. **Victory Type Impact**
   - Most victories were conquest-based (ScholarKingdoms won 4 of 5)
   - Progress victories may have different timing (only 1 Progress victory observed)
   - Consider if different victory types should have different growth curves

2. **Civ-Specific Factors**
   - Jade Covenant has growth bonuses (Jade Granary)
   - Consider if civ-specific bonuses are sufficient or need adjustment

3. **Map Size Scaling**
   - Analysis was on Huge maps only
   - Smaller maps may have different dynamics
   - Consider separate tuning for different map sizes

### Implementation Priority

1. **High Priority:** Increase growth costs for pop 7-10 by 15-20%
2. **Medium Priority:** Adjust growth formula multipliers for mid-late game (increase factors)
3. **Low Priority:** Consider reducing base food yields (only if other methods insufficient)

---

## Conclusion

The analysis clearly shows that cities are reaching population 10 **too early** relative to victory timing. The average gap of **21.0 turns** represents a significant misalignment. 

**Recommended Action:** Implement a **15-20% increase in growth costs** for populations 7-10, which would delay the average pop 10 turn from ~137 to ~140-145, better aligning with the average victory turn of ~144.

This adjustment would:
- Make pop 10 achievement feel more meaningful and timely (closer to victory)
- Better align growth milestones with game progression
- Maintain the challenge of reaching pop 10 while ensuring it happens closer to when games typically end

---

## Data Files

- Raw simulation data: `/tmp/city-growth-results-clean.json`
- Analysis scripts: `engine/src/sim/city-growth-analysis.ts`, `engine/src/sim/detailed-analysis.mjs`

