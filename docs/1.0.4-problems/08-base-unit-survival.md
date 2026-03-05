# Problem 08: Base Unit Survival Rate (7-8%) — Too Fragile?

## The Problem
Pre-Army units have extremely low survival rates:
- SpearGuard: 7.6% survival
- BowGuard: 8.4% survival
- Riders: 14.2% survival
- Scout: 9.9% survival

By contrast, Army-upgraded units survive 27-34%. This creates a dynamic where early-game combat is essentially "throw units away until you get ArmyDoctrine tech."

## User Direction
"How to balance this without wrecking the early game? Basically we want these units to matter early and not so much once armies exist. But maybe we've taken this too far."

## Analysis

### Current Stats (from `constants.ts`):

| Unit | ATK | DEF | HP | Cost | Army Version ATK | Army DEF | Army HP |
|------|-----|-----|----|------|-----------------|---------|---------|
| SpearGuard | 2 | 2 | 10 | 27 | 8 | 4 | 15 |
| BowGuard | 2 | 1 | 10 | 27 | 6 | 3 | 15 |
| Riders | 2 | 2 | 10 | 32 | 8 | 4 | 15 |

The stat gap between base and Army is **massive**:
- ATK: 2→8 (4x increase)
- DEF: 1-2→3-4 (2-3x increase)
- HP: 10→15 (50% increase)

With the Civ6-style damage formula (`CIV6_DAMAGE_BASE = 5`, `CIV6_DAMAGE_DIVISOR = 25`), Attack/Defense difference drives exponential damage scaling. A 2 ATK unit attacking a 4 DEF unit does trivial damage, while an 8 ATK unit attacking a 2 DEF unit does massive damage.

### Why This Can't Just Be "Buff Base Units"
- If base SpearGuard had ATK 4/DEF 3, early-game wars would be much more decisive. The first civ to produce 3-4 SpearGuards would crush a neighbor before they can react.
- Base unit weakness is a natural check on early-game rushes, giving victims time to build defenses.
- ArmyDoctrine tech (turn ~159 avg) is the intended transition point — the game is designed around base units being placeholders.

### The Real Problem
The issue isn't that base units are weak — it's that they stay relevant too long. On some maps, ArmyDoctrine doesn't arrive until turn 200+, meaning base units are the only military option for over half the game. During this window, combat is just attrition of replaceable units with no tactical depth.

## Plan

### Option A: Modest Base Unit Buff (Recommended)
**File:** `engine/src/core/constants.ts`

Increase base unit survivability (not lethality):

| Unit | Current | Proposed | Change |
|------|---------|----------|--------|
| SpearGuard | 2/2/10 | 2/3/12 | +1 DEF, +2 HP |
| BowGuard | 2/1/10 | 2/2/12 | +1 DEF, +2 HP |
| Riders | 2/2/10 | 2/3/12 | +1 DEF, +2 HP |

This gives base units ~35-40% more effective HP (from DEF+HP combination) without changing their damage output. Battles last longer, units survive more fights, and the early game has more back-and-forth instead of "first hit kills."

**Why +DEF not +ATK:** We don't want early units hitting harder (that would make rushes more lethal). We want them surviving longer so they matter before being replaced.

### Option B: TimberMills Intermediate Boost
**File:** `engine/src/core/constants.ts`

TimberMills tech (turn ~178 avg) currently provides `+1/+1 to Melee & Ranged` as a passive:
- This already exists as an intermediate buff! Verify it actually applies correctly to base units.
- If it does, the path is: base units (weak) → TimberMills (+1/+1) → ArmyDoctrine (Army units)
- Consider making TimberMills arrive earlier or be cheaper to compress the "weak window."

TimberMills cost is currently 75 (prereq: StoneworkHalls at 30). The total path cost is 105 science. Consider reducing to 60 (from 75) to bring the +1/+1 buff ~15-20 turns earlier.

### Option C: Early-Game Only HP Regen
**File:** `engine/src/game/turn-lifecycle.ts`

Add a passive HP regen for base (non-Army) military units:
- +1 HP/turn when not adjacent to enemies
- This only benefits base units, not Army units (which already have 15 HP and better sustain)
- Once a civ has Army units, they naturally replace base units, and the regen becomes irrelevant

### What NOT to Do
- Don't buff base unit ATK. Early rushes are already powerful for ForgeClans.
- Don't nerf Army units. The Army transition should feel powerful and rewarding.
- Don't change the fundamental base→Army progression. It's a good design that rewards tech investment.

## Ripple Effects to Monitor
- **ForgeClans early rush:** They have earlyRushChance: 1.0 and always rush. If base SpearGuards survive longer, ForgeClans' early attacks become harder to repel. But ForgeClans also benefits from the buff for their own units.
- **ScholarKingdoms/StarborneSeekers defense:** Defensive civs benefit from +DEF since they get attacked more (ScholarKingdoms receives 1.9 wars/game). This is net positive — helps the civ that needs help most.
- **Native camp clearing:** Base units fight NativeChampions (ATK 4/DEF 4/HP 18) and NativeArchers (ATK 3/DEF 2/HP 12). Buff makes early camp clearing slightly easier — monitor camp-clear rates.
- **Settlers:** Settlers have HP 1, so they're unaffected. Their escort units (base SpearGuards) surviving longer does help with Problem 02 (settler deaths).

## Verification
Run 600 simulations before/after. Target:
- Base unit survival rate ≥ 15% (up from 7-8%) — still disposable but not single-battle units
- Army unit survival rate should remain ~28-34% (unchanged)
- Early-game war outcomes should remain balanced (no single civ dominating early)
- Camp-clearing success rate should increase slightly
- Average victory turn should remain within ±5% of current
