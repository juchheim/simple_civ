# Problem 01: Large Map Stall Rate (24.2%)

## The Problem
Large maps (6 civs, 35x25) fail to produce a winner 24.2% of the time — the worst of any map size. Games reach turn 401 with 2-3 survivors in military equilibrium who can't close on either victory condition.

## Root Cause
Large maps sit in an uncomfortable middle: conquest is too hard (defender advantage + map size), but Progress victory hasn't taken over like it does on Huge maps (where 81% of wins are Progress). Survivors complete Observatory and Grand Academy but can't finish Grand Experiment before turn 401.

## User Direction
"Give the AI more aggressive late-game behavior."

## Plan

### 1. Late-Game Aggression Escalation
**File:** `engine/src/game/ai2/strategic-plan.ts`

Add a **stall-detection escalation** that triggers when the game is past turn ~300 and no civ is close to winning:

- In `getEffectiveAttackThreshold()` (line 273-295), add a **turn-based decay** that progressively lowers the attack threshold after turn 250. Currently it decays based on war duration; add a parallel decay based on absolute turn number.
- Target: By turn 300+, the effective attack threshold should be ~0.5 (attack even without power advantage).

**File:** `engine/src/game/ai/personality.ts`

- Add a `lateGameAggressionFloor` field to `AggressionProfile` that overrides `warPowerThreshold` after turn 250.
- For all civs, set this floor to ~0.6-0.7 so even defensive civs will initiate wars in late game.
- ScholarKingdoms and StarborneSeekers get special handling: their `warPowerThreshold: 100.0` should be overridden after turn 300 to ~0.8 (still cautious but not "never attack").

### 2. Progress Chain Acceleration on Large Maps
**File:** `engine/src/game/ai2/production/victory.ts`

- In `pickVictoryProject()`, add logic: when turn > 250 on Large/Huge maps and no one has won, **all civs** (not just science civs) should evaluate the Progress path, not just at military milestones.
- Lower the `progressWithinRange` threshold from `+40` to `+60` turns on Large maps so more civs pivot to Progress.

### 3. War Decisiveness Improvement
**File:** `engine/src/game/ai2/siege-manager.ts` and `siege-rally.ts`

- After turn 250, increase the urgency of siege operations: reduce rally time requirements and lower the power threshold for launching attacks on cities.
- This prevents the pattern of "declare war, fail to capture, make peace, repeat" seen in stalled games.

## Ripple Effects to Monitor
- **Don't make Small/Tiny games too fast.** The aggression escalation should be turn-gated high enough (250+) that it only affects long games.
- **Don't force science civs into suicidal wars.** The late-game aggression floor should still be cautious for ScholarKingdoms/StarborneSeekers — they should attack when strong, not when weak.
- **Don't break victory type balance.** If all civs start pursuing Progress late, the Conquest path may become even less viable on Large maps. That's acceptable — Huge maps already have 81% Progress wins.

## Verification
Run 200 Large-map simulations before/after. Target:
- Stall rate ≤ 12% (down from 24.2%)
- Average victory turn should decrease (currently 315)
- Victory type mix should shift slightly toward Progress (acceptable)
- No increase in stall rate on other map sizes
