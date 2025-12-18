# AI vs Human Balance Plan

**Date:** 2025-12-18  
**Status:** In Progress  
**Related:** [balance-analysis.md](./balance-analysis.md)

---

## Design Decisions

### Combat Preview
**Decision:** Keep combat preview for humans. Improve AI decision-making with equivalent information.

**Rationale:** Rather than nerfing information, we level up AI intelligence.

---

### Passive Civilizations (Scholar/Starborne)
**Decision:** They can now declare wars (recently implemented) but remain on the passive side.

**Known Limitation:** If they always have fewer military units than the player, they won't attack.

**Future:** More nuanced aggression triggers beyond raw military count.

---

### Difficulty System
**Decision:** Default to industry standard (production/combat bonuses) as fallback.

**Preference:** Make AI smarter first. Difficulty bonuses are backup if AI hits ceiling.

---

### Titan Rush Counter
**Decision:** Implement "Emergency Titan Response" behavior.

When Titan spawns, all AI civs recognize existential threat and coordinate.

---

### Anti-Turtle Detection
**Decision:** Implement detection system.

**Triggers:**
- Human has <4 cities by turn 40
- Human hasn't attacked any AI in 50 turns  
- Human building Observatory/Academy (Progress rush)

**Responses:**
- Aggressive civs declare war simultaneously
- AI civs share vision on human
- Lift `canInitiateWars` restrictions temporarily

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

| Level | Focus | Spec | Status |
|-------|-------|------|--------|
| **1A** | Attack order for units in range | [level-1-attack-order.md](./level-1-attack-order.md) | ✅ Planned |
| **1B** | Move-then-attack coordination | [level-1-attack-order.md](./level-1-attack-order.md) | ✅ Planned |
| **2** | Focus Fire enforcement | [level-2-focus-fire.md](./level-2-focus-fire.md) | ✅ Planned |
| **3** | "Wait" option (skip attack for positioning) | [level-3-wait-decision.md](./level-3-wait-decision.md) | ✅ Planned |
| **4** | Coordinated attack timing (staging) | [level-4-coordination.md](./level-4-coordination.md) | ✅ Planned |

---

## Implementation Priority

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| 1 | Level 1 (Combat AI) | High | High |
| 2 | Anti-Turtle Detection | Medium | High |
| 3 | Emergency Titan Response | Medium | Medium |
| 4 | Difficulty Bonuses | Low | Medium |

---

*This is a living document. Updates made as decisions are finalized.*
