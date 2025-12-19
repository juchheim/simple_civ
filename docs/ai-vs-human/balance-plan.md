# AI vs Human Balance Plan

**Date:** 2025-12-18  
**Status:** Combat AI Complete (Levels 1-4) | Strategic Features Pending  
**Related:** [balance-analysis.md](./balance-analysis.md)

---

## Design Decisions

### Combat Preview ✅
**Decision:** Keep combat preview for humans. Improve AI decision-making with equivalent information.

**Rationale:** Rather than nerfing information, we level up AI intelligence.

---

### Passive Civilizations (Scholar/Starborne) ✅
**Decision:** They can now declare wars (recently implemented) but remain on the passive side.

**Known Limitation:** If they always have fewer military units than the player, they won't attack.

**Future:** More nuanced aggression triggers beyond raw military count.

---

### Difficulty System ✅
**Decision:** Production/combat/research bonuses for AI.

**Levels:** Easy (-bonuses) / Normal (baseline) / Hard (+25% prod, +10% combat, +20% research) / Expert (+50% prod, +20% combat, +40% research)

**Files modified:** `difficulty.ts` (new), `types.ts`, `builds.ts`, `turn-lifecycle.ts`, `unit-combat.ts`

**Status:** Implemented. UI selection pending (client-side).

---

### Titan Rush Counter ✅
**Decision:** Emergency military production when at war with Titan owner.

**Behavior:**
- Triggers when at war with Titan owner AND have <8 military units
- All cities prioritize Landship > Ranged > Melee
- Stops once 8 military reached, resumes normal production

**Status:** Implemented in `production.ts`.

---

### Anti-Turtle Detection ✅
**Decision:** Detect players rushing Progress victory.

**Covered by:** `isProgressThreat()` in `diplomacy.ts` already detects Observatory/Academy/GrandExperiment builds and triggers war declarations.

**Status:** Already implemented.

---

## Combat Information Economy

The human doesn't have "more information" — they have **better utilization**.

| Human Strategy | Current AI Strategy |
|----------------|---------------------|
| Attack in optimal ORDER | Attacks in iteration order |
| Soften with ranged, finish with melee | Evaluates independently |
| Skip marginal attacks | Attacks if score > 0 |
| Focus fire until dead | Spreads damage |

---

## Implementation Levels

| Level | Focus | Spec | Status | Implementation |
|-------|-------|------|--------|----------------|
| **4** | Coordinated attack timing (staging) | [level-4-coordination.md](./level-4-coordination.md) | ✅ Done | `army-phase.ts` |
| **1A** | Attack order for units in range | [level-1-attack-order.md](./level-1-attack-order.md) | ✅ Done | `attack-order.ts` |
| **1B** | Move-then-attack coordination | [level-1-attack-order.md](./level-1-attack-order.md) | ✅ Done | `attack-order.ts` |
| **2** | Focus Fire enforcement | [level-2-focus-fire.md](./level-2-focus-fire.md) | ✅ Done | `attack-order.ts` |
| **3** | "Wait" option (skip attack for positioning) | [level-3-wait-decision.md](./level-3-wait-decision.md) | ✅ Done | `wait-decision.ts` |

---

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| [`army-phase.ts`](../../engine/src/game/ai2/army-phase.ts) | 312 | Level 4: Army phase state machine |
| [`attack-order.ts`](../../engine/src/game/ai2/attack-order.ts) | 718 | Levels 1A/1B/2: Attack ordering + move-attack |
| [`wait-decision.ts`](../../engine/src/game/ai2/wait-decision.ts) | 278 | Level 3: Wait conditions |
| [`memory.ts`](../../engine/src/game/ai2/memory.ts) | +12 | Added memory fields |
| [`tactics.ts`](../../engine/src/game/ai2/tactics.ts) | +50 | Integration into `runTacticsV2` |

---

## Key Features Implemented

### Level 4: Army Phase State Machine
- Phases: SCATTERED → RALLYING → STAGED → ATTACKING
- 6 override conditions (titan, siege, defense, power, position, low HP)

### Level 1A: Attack Order Optimization
- Simulated HP tracking to maximize kills
- Kill bonus (150), threat bonus, suicide/risk penalties

### Level 1B: Move-Then-Attack
- Exposure damage calculation with 5 anti-stalemate overrides
- Terrain cost awareness

### Level 2: Focus Fire
- `tacticalFocusUnitId` persists across turns
- +50 bonus for attacking focus target

### Level 3: Wait Decision
- 5 wait conditions (reinforcements, power, no kills, exposure, terrain)
- 5 attack overrides (war duration, city HP, titan, high value, civ)

---

## Test Results

**296/307 passing** (11 failures are pre-existing balance tests)

---

*Implementation completed 2025-12-18. See individual spec files for detailed algorithms.*

