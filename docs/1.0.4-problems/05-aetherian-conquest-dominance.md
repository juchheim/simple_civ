# Problem 05: AetherianVanguard Conquest Dominance

## The Problem
AetherianVanguard has the highest win rate (24.6%) with 92.4% of wins via conquest, while spending the **least** Command Points (21.9/game). This suggests their baseline combat effectiveness is too high — they win without needing tactical bonus actions.

## User Questions
"Does the Titan use CP correctly? Or are their baseline combat stats too strong? Or something else?"

## Investigation Plan

### Current AetherianVanguard Profile
From `personality.ts`:
- `projectRush: { type: "Building", id: BuildingType.TitansCore }` — they rush Titan
- `aggressionSpikeTrigger: "TitanBuilt"` — aggression ramps after Titan built
- `warPowerThreshold: 0.75` → `warPowerThresholdLate: 0.6` — aggressive early, more aggressive late
- `armySizeMultiplier`: not set (defaults to 1.0)
- `declareAfterContactTurns: 10` — waits a bit before attacking

From `constants.ts`:
- No special combat bonuses for AetherianVanguard (no flat ATK bonus, no defense bonus, no discount)
- **All their power comes from the Titan** (ATK 15, DEF 15, HP 40, Move 2, canCaptureCity)

From `titan-agent.ts`:
- Titan has dedicated AI agent with rally, escort, and movement logic
- `followTitan()` moves military units to follow the Titan
- `runPreTitanRally()` gathers forces before spawning Titan
- `runTitanAgent()` handles Titan combat, retreat, and city capture (499 lines)

### Hypotheses

1. **Titan is too strong as a stat block.** ATK 15/DEF 15/HP 40 makes it nearly unkillable when escorted. The 31.9% death rate sounds killable but is inflated by games where the Titan owner loses overall — when the Titan is properly escorted, its survival rate is much higher.

2. **Titan + escort creates unstoppable deathball.** The `titan-agent.ts` concentrates all military around the Titan. Average 3.0 escorts at first capture means a force of ~4 units (Titan + 3) with combined power far exceeding any defensive formation.

3. **Low CP spend means fights are easy.** If AetherianVanguard doesn't need CP to win battles, fights are decided by base stats alone. The Titan's ATK 15 vs typical city DEF of 3-6 means massive overkill.

4. **TitansCore rush timing is too fast.** TitansCore costs 60 production and requires SteamForges tech (turn ~232 avg). With a projectRush, AetherianVanguard likely builds Titan earlier than average, giving them a powerful mid-game combat spike.

## Plan

### Step 1: Investigate Titan CP Usage
**File:** `engine/src/game/ai2/titan-agent.ts`

Audit `runTitanAgent()` to answer: does the Titan agent ever spend CP? Check if:
- The Titan's actions go through the CP budget system in `tactical-planner.ts`
- The Titan agent calls `getTacticalActionBudget()` or interacts with the CP pool
- If not, the Titan agent might bypass CP entirely — meaning CP spend isn't even a factor for AetherianVanguard's primary winning strategy

### Step 2: Titan Stat Nerf (if investigation confirms stats are the issue)
**File:** `engine/src/core/constants.ts`

Consider reducing Titan survivability:
- ATK 15 → 13 (still highest in game, but less overkill)
- DEF 15 → 12 (revert the v9.15 buff)
- HP 40 → 35 (revert the v9.15 buff — was 30, buffed to 40)

The v9.15 buffs (HP 30→40, DEF 12→15) were "survivability buffs" but may have overshot. Reverting DEF to 12 and HP to 35 would be a middle ground.

### Step 3: TitansCore Cost Adjustment
**File:** `engine/src/core/constants.ts`

TitansCore costs only 60 production (v9.10 buff, was 120). This is very cheap for spawning the game's most powerful unit. Consider:
- Increase cost to 90 (middle ground between 60 and 120)
- This delays the Titan by ~15-20 turns without making it unattainable

### Step 4: Deathball Mitigation
**File:** `engine/src/game/ai2/titan-agent.ts`

In `followTitan()`, reduce the escort concentration:
- Cap escorts at 2 units (currently uncapped, avg 3.0 at captures)
- Send remaining military to other objectives (defend cities, siege secondary targets)
- This splits AetherianVanguard's force, making them more vulnerable to multi-front wars

### Step 5: Consider CP Integration for Titan
**File:** `engine/src/game/ai2/titan-agent.ts`

If the Titan bypasses CP entirely, integrate it:
- Titan attacks should consume CP like any other unit
- This would naturally increase AetherianVanguard's CP spend and reduce their free combat advantage

## Ripple Effects to Monitor
- **AetherianVanguard should still be good at conquest.** Target win rate of 21-23% (down from 24.6%) — they should still be the top conquest civ, just not dominant.
- **Titan should still be impactful.** A 29.6% win-with-Titan rate should drop to ~22-25% — still meaningful but not a guaranteed win.
- **Other civs' Titan builds.** The Titan is available to all civs via TitansCore. Nerfing Titan stats affects everyone, but AetherianVanguard is most impacted since they rush it.
- **Progress victory balance.** If AetherianVanguard conquest slows, their Progress win rate may rise (currently only 7.6%). This is acceptable.

## Verification
Run 600 simulations before/after. Target:
- AetherianVanguard win rate ≤ 23% (down from 24.6%)
- AetherianVanguard CP spend should increase if Titan CP integration is done
- Titan survival rate should decrease to ~25% (from 31.9%)
- Win rate spread ≤ 5pp (currently 5.6pp)
- Titan wins/spawns ratio should decrease to ~22-25% (from 29.6%)
