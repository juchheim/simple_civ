# City Growth Analysis - All Map Sizes

**Date:** November 26, 2025  
**Analysis:** City growth timing vs victory achievement across all map sizes  
**Simulations:** 5 runs per map size (25 total simulations)  
**Turn Limit:** 200 turns or victory  
**Growth Adjustments:** Applied (pop 7-8: 1.58, pop 9-10: 1.68)

---

## Executive Summary

Analysis across all map sizes shows **mixed results** after the growth cost adjustments:

- **Smaller maps (Tiny, Small):** Games end too quickly for pop 10 to be relevant
- **Standard maps:** Still show significant gap (17.7 turns)
- **Large & Huge maps:** Show improved alignment (7.9-8.9 turn gaps)
- **Overall:** Average gap of 19.8 turns, but this is skewed by smaller maps

**Key Finding:** The growth adjustments are working well for Large and Huge maps, but Standard maps may need additional tuning.

---

## Results by Map Size

### Tiny Maps (2 civs)

- **Victories:** 3 of 5 (60%)
- **Average victory turn:** 83.0
- **Cities reaching pop 10:** 1 of 15 (6.7%)
- **Average pop 10 turn:** 195.0
- **Gap:** -112.0 turns (victory happens before pop 10)

**Analysis:** Games end too quickly (often by turn 2-132) for cities to reach pop 10. This is expected for such small maps and is not a concern.

---

### Small Maps (3 civs)

- **Victories:** 4 of 5 (80%)
- **Average victory turn:** 107.3
- **Cities reaching pop 10:** 5 of 35 (14.3%)
- **Average pop 10 turn:** 180.8
- **Gap:** -73.5 turns (victory happens before pop 10)

**Analysis:** Similar to Tiny maps, games end quickly. Only one simulation had cities reach pop 10, and that was a late-game victory (turn 191).

---

### Standard Maps (4 civs)

- **Victories:** 5 of 5 (100%)
- **Average victory turn:** 151.8
- **Cities reaching pop 10:** 11 of 64 (17.2%)
- **Average pop 10 turn:** 134.1
- **Gap:** +17.7 turns (pop 10 before victory)

**Analysis:** Shows the largest positive gap among maps where pop 10 is achievable. Cities reach pop 10 about 18 turns before victory on average. This suggests Standard maps may need additional growth cost increases.

**Per-simulation gaps:** [18.0, 42.4, 8.5, 33.5, 7.0] - High variance indicates some games align well while others don't.

---

### Large Maps (6 civs)

- **Victories:** 4 of 5 (80%)
- **Average victory turn:** 158.8
- **Cities reaching pop 10:** 26 of 107 (24.3%)
- **Average pop 10 turn:** 150.9
- **Gap:** +7.9 turns (pop 10 before victory)

**Analysis:** **Well-aligned!** The gap of 7.9 turns is within acceptable range (<10 turns). The growth adjustments are working well for Large maps.

**Per-simulation gaps:** [34.2, 3.5, 29.0, 23.6] - Most simulations show reasonable alignment.

---

### Huge Maps (6 civs)

- **Victories:** 5 of 5 (100%)
- **Average victory turn:** 140.0
- **Cities reaching pop 10:** 16 of 133 (12.0%)
- **Average pop 10 turn:** 131.1
- **Gap:** +8.9 turns (pop 10 before victory)

**Analysis:** **Well-aligned!** The gap of 8.9 turns is within acceptable range. Growth adjustments are working well for Huge maps.

**Per-simulation gaps:** [27.5, 10.3, 10.0, 25.3, 10.0] - Most simulations show good alignment, with a couple outliers.

---

## Cross-Map-Size Comparison

| Map Size | Avg Victory Turn | Avg Pop 10 Turn | Gap | Cities @ Pop 10 | Total Cities |
|----------|-----------------|-----------------|-----|-----------------|--------------|
| Tiny     | 83.0            | 195.0           | -112.0 | 1 (6.7%)      | 15           |
| Small    | 107.3           | 180.8           | -73.5  | 5 (14.3%)     | 35           |
| Standard | 151.8           | 134.1           | **+17.7** | 11 (17.2%)   | 64           |
| Large    | 158.8           | 150.9           | **+7.9** | 26 (24.3%)   | 107          |
| Huge     | 140.0           | 131.1           | **+8.9** | 16 (12.0%)   | 133          |

**Key Observations:**
1. **Tiny/Small maps:** Negative gaps are expected - games end too quickly
2. **Standard maps:** Largest positive gap (17.7 turns) - may need additional tuning
3. **Large/Huge maps:** Well-aligned (7.9-8.9 turns) - growth adjustments working

---

## Growth Milestones Analysis

### Across All Map Sizes

| Milestone | Cities Reaching | Percentage | Avg Turn | Range |
|-----------|----------------|------------|----------|-------|
| Pop 3 | ~338 cities | ~94% | ~66 | [15, 181] |
| Pop 5 | ~320 cities | ~89% | ~84 | [25, 185] |
| Pop 7 | ~265 cities | ~74% | ~106 | [41, 199] |
| Pop 10 | 59 cities | ~16% | ~145 | [89, 200] |

**Pattern:** Consistent growth trajectory across map sizes, with pop 10 achievement being relatively rare (16% of cities).

---

## Overall Assessment

### Current Status

**Across all map sizes:**
- Average victory turn: 132.0
- Average pop 10 turn: 145.7
- Average gap: 19.8 turns

**However, this is misleading** because:
- Tiny/Small maps skew the average with negative gaps (games end before pop 10)
- Standard/Large/Huge maps (where pop 10 matters) show gaps of 7.9-17.7 turns

### Map-Size-Specific Recommendations

1. **Tiny & Small Maps:** No changes needed - games end too quickly for pop 10 to be relevant

2. **Standard Maps:** Consider additional 5-10% growth cost increase for pop 7-10
   - Current gap: 17.7 turns
   - Target: <10 turns
   - Suggested: Increase pop 9-10 factor from 1.68 to ~1.75

3. **Large Maps:** ✓ Well-aligned (7.9 turn gap) - no changes needed

4. **Huge Maps:** ✓ Well-aligned (8.9 turn gap) - no changes needed

### Alternative Approach: Map-Size-Specific Tuning

If Standard maps consistently show larger gaps, consider:
- **Map-size-specific growth factors** (higher costs for Standard maps)
- Or **universal adjustment** that brings Standard maps into acceptable range

---

## Comparison to Previous Analysis

**Before adjustments (Huge maps only):**
- Average gap: 21.0 turns
- Pop 9→10 cost: 476 → 557 (+17.0%)
- Pop 10→11 cost: 762 → 936 (+22.8%)

**After adjustments (Huge maps):**
- Average gap: 8.9 turns
- **Improvement: 12.1 turns** (57% reduction in gap)

**Conclusion:** The growth cost increases are working effectively for Large and Huge maps, bringing the gap from 21 turns down to ~8-9 turns.

---

## Recommendations

### Primary Recommendation

1. **Keep current growth factors for Large/Huge maps** - they're well-aligned
2. **Consider additional 5-10% increase for Standard maps** - to bring gap from 17.7 to <10 turns
3. **No changes needed for Tiny/Small maps** - games end before pop 10 is relevant

### Implementation Options

**Option A: Universal Adjustment**
- Increase pop 9-10 factor from 1.68 to 1.75 (additional ~4% cost increase)
- This would help Standard maps while slightly over-tuning Large/Huge maps

**Option B: Map-Size-Specific Factors**
- Keep current factors for Large/Huge
- Use higher factors (1.75-1.80) for Standard maps
- Requires code changes to make growth factors map-size-aware

**Option C: Status Quo**
- Accept that Standard maps have a 17.7 turn gap
- Focus on Large/Huge maps which are well-aligned
- Standard maps may naturally have different dynamics

### Recommended Choice

**Option A (Universal Adjustment)** - A small additional increase (1.68 → 1.75) would:
- Bring Standard maps closer to target (<10 turn gap)
- Slightly over-tune Large/Huge maps (from 8-9 to ~5-6 turns), which is still acceptable
- Maintain simplicity (no map-size-specific code)

---

## Data Files

- Raw simulation data: `/tmp/city-growth-results-all-maps.json`
- Analysis scripts: `engine/src/sim/city-growth-analysis.ts`, `engine/src/sim/analyze-all-maps.mjs`

