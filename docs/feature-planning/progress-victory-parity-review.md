# Progress Victory Parity Review

**Date:** 2025-12-08  
**Goal:** Achieve Conquest/Progress Victory parity (target: ~50/50 split)  
**Current Status:** 32% Progress Victory (improved from previous, but still below target)

## What Has Been Done ✅

### 1. Progress Projects Always Available (v2.1)
- **Location:** `engine/src/game/ai/cities.ts`
- **Implementation:** Progress projects (Observatory → GrandAcademy → GrandExperiment) are always included as fallback options in build priorities, even during wartime
- **Impact:** Prevents complete abandonment of Progress path during conflicts

### 2. Progress City Prioritization (v2.2)
- **Location:** `engine/src/game/ai/cities.ts`
- **Implementation:** Designated progress city (capital or highest pop) prioritizes Progress projects even during wartime
- **Impact:** Ensures at least one city continues Progress path while others handle military

### 3. Late Game Progress Protection (v1.2)
- **Location:** `engine/src/game/ai/goals.ts` lines 169-183
- **Implementation:** At turn 200, aggressive civs check if nearing Progress (GrandAcademy/GrandExperiment) before switching to Conquest
- **Impact:** Prevents abandoning Progress when close to victory

### 4. Observatory Commitment
- **Location:** `engine/src/game/ai/goals.ts` lines 141-144
- **Implementation:** Once Observatory is complete AND capitals are safe, commit to Progress path
- **Impact:** Provides commitment point for Progress-oriented civs

## Remaining Gaps ❌

### Gap #1: Overly Strict Safety Check (CRITICAL) ✅ FIXED
**Location:** `engine/src/game/ai/goals.ts` line 139

**Problem:**
```typescript
const capitalsSafe = capitals.every(c => c.hp >= (c.maxHp ?? 15) * 0.6 && !anyEnemyNearCity(c, state, playerId, 2));
if (player.completedProjects.includes(ProjectId.Observatory) && capitalsSafe) {
    return "Progress";
}
```

**Issues:**
- Requires ALL capitals at 60%+ HP (too strict)
- Requires NO enemies within 2 tiles (a single scout probe abandons Progress)
- Only triggers AFTER Observatory is complete (too late for early commitment)

**Impact:** Progress-oriented civs abandon Progress path too easily, even when close to victory.

**Fix Implemented (v1.3):**
1. ✅ Relaxed HP threshold to 40% (from 60%)
2. ✅ Allows weak threats (scouts, single units) - only blocks strong threats (3+ attack or 10+ HP)
3. ✅ Removed safety requirement if GrandAcademy is complete (lines 160-172)

### Gap #2: No Early Progress Commitment (HIGH) ✅ FIXED
**Location:** `engine/src/game/ai/goals.ts`

**Problem:** Progress-oriented civs (ScholarKingdoms, StarborneSeekers) only commit to Progress AFTER Observatory is complete. They should commit earlier when they have StarCharts tech.

**Question** Do progress-oriented civs prioritize getting to StarCharts? Generally they should.

**Answer:** ✅ YES - Fixed in v1.3:
- Progress-oriented civs now prioritize StarCharts even in Balanced mode (tech selection boost)
- Early commitment: If civ has StarCharts tech AND personality prefers Progress, commit to Progress (with relaxed safety check)
- This happens BEFORE Observatory is complete

**Impact:** Progress-oriented civs waste time in Balanced/Conquest mode before committing to their specialty.

**Fix Implemented:**
- ✅ Early commitment check added in `aiVictoryBias` (lines 190-194)
- ✅ Tech selection boost for Progress path techs when Balanced but prefers Progress (tech.ts)
- ✅ Progress-oriented civs now commit earlier and prioritize StarCharts tech

### Gap #3: No "Close to Progress" Protection (HIGH) ✅ FIXED
**Location:** `engine/src/game/ai/goals.ts`

**Problem:** The "Finish him" logic (lines 153-158) and "enemy capital in strike range" (lines 160-167) can switch to Conquest even when very close to Progress victory.

**Impact:** AI abandons Progress when 1-2 turns away from GrandExperiment completion.

**Fix Implemented (v1.3):**
- ✅ Added check BEFORE Conquest switches (lines 160-172): If GrandAcademy is complete OR GrandExperiment is being built with >50% progress, stay committed to Progress
- ✅ "Finish him" and "capital in strike range" only trigger if not close to Progress (lines 219-227)
- ✅ Protects Progress path when 1-2 turns from victory

### Gap #4: No Progress Race Detection (MEDIUM) ✅ FIXED
**Location:** `engine/src/game/ai/goals.ts`

**Problem:** If another civ is close to Progress victory (has GrandAcademy or is building GrandExperiment), the AI doesn't prioritize Progress to compete.

**Impact:** AI doesn't respond to Progress race threats, allowing opponents to win via Progress.

**Player Impact** ✅ FIXED - player isn't made aware of progress race threats. if the ai can make decisions based on this knowledge, the player should be able to do the same thing. when a condition happens that would trigger ai to prioritize to compete, show a message to the player at the start of the turn. something like "Scholar Kingdoms has done X!" or "Forge Clans is working on Y!" (but better written) note: do not require the player to have an observatory or similar condition to receive this announcement.

**Fix Implemented:**
- ✅ AI Progress race detection added in `aiVictoryBias` (lines 209-217)
- ✅ Player notifications implemented:
  - `useProgressRaceAlerts` hook detects enemy Progress milestones
  - Alerts shown when enemies complete Observatory, GrandAcademy, or GrandExperiment
  - Alerts shown when enemies start building GrandExperiment
  - No requirement for player to have Observatory - all players are notified
  - Modal displays appropriate warnings with color coding (amber for critical threats)

### Gap #5: No Active Progress Project Check (MEDIUM) ✅ FIXED
**Location:** `engine/src/game/ai/goals.ts`

**Problem:** If the designated progress city is actively building a Progress project, the AI might still switch to Conquest.

**Impact:** Wastes production already invested in Progress projects.

**Fix Implemented (v1.3):**
- ✅ Checks if any city is building Progress project (lines 143-158)
- ✅ If GrandExperiment is >50% complete, stays committed to Progress (lines 166-172)
- ✅ Progress project progress is tracked and used to protect commitment

### Gap #6: No "Progress is Faster" Calculation (LOW)
**Location:** `engine/src/game/ai/goals.ts`

**Problem:** AI doesn't estimate which victory path is faster. It switches to Conquest based on opportunities without considering Progress timeline.

**Impact:** AI might switch to Conquest when Progress is actually 5-10 turns faster.

**Fix Needed:**
- Estimate turns to GrandExperiment completion (based on current production/science)
- Estimate turns to Conquest (based on distance to capitals, military strength)
- If Progress is faster, stay committed even if Conquest opportunities exist

## Implementation Status

### ✅ Completed (v1.3)
1. **✅ Priority 1 (CRITICAL):** Gap #1 - Relaxed safety check
2. **✅ Priority 2 (HIGH):** Gap #3 - Protected "close to Progress" state
3. **✅ Priority 3 (HIGH):** Gap #2 - Early Progress commitment + StarCharts prioritization
4. **✅ Priority 4 (MEDIUM):** Gap #4 - Progress race detection (AI + Player notifications)
5. **✅ Priority 5 (MEDIUM):** Gap #5 - Active project check

### 🔄 Remaining (Optional)
6. **Priority 6 (LOW):** Gap #6 - Victory timeline estimation (nice-to-have, not critical)

## Expected Impact

With implemented fixes (v1.3):
- **Current:** 36% Progress Victory (up from 32% in short test)
- **Target:** 45-55% Progress Victory rate (with full simulation)
- **Key Changes:**
  - ✅ Progress-oriented civs commit earlier (StarCharts tech) and stay committed longer
  - ✅ Less abandonment when close to victory (protected at GrandAcademy/GrandExperiment)
  - ✅ Better response to Progress race threats (AI switches to compete, players get notifications)
  - ✅ Relaxed safety requirements allow Progress pursuit during minor conflicts
  - ✅ Active project protection prevents wasted production

## Implementation Summary

**Files Modified:**
- `engine/src/game/ai/goals.ts` - Victory bias logic with all protections
- `engine/src/game/ai/tech.ts` - StarCharts prioritization for progress-oriented civs
- `client/src/components/HUD/hooks/use-progress-race-alerts.ts` - NEW: Progress race detection
- `client/src/components/HUD/hooks/use-diplomacy-alerts.ts` - Extended alert type
- `client/src/components/HUD/sections/DiplomacyAlertModal.tsx` - Progress race alert UI
- `client/src/components/HUD.tsx` - Integrated progress race alerts

**Next Steps:**
- Run full simulation (50+ games) to measure impact
- Monitor Progress Victory rate - target 45-55%
- Consider Gap #6 (Victory timeline estimation) if further improvement needed

