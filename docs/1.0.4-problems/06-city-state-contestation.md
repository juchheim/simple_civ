# Problem 06: City-State Contestation Too Low (83% never flip)

## The Problem
83% of city-states (1737/2093) never change suzerains. The investment system creates persistent ownership rather than dynamic competition. City-states function as permanent buffs rather than contested strategic objectives.

Key metrics:
- Contested turn share: only 0.94%
- Average unique suzerains per city-state: 1.18
- Maintenance cost: only 5.24G per suzerain turn — too cheap to hold
- Flip rate: 0.27 per 100 active turns — very low

## Root Cause
From `city-states.ts` and `constants.ts`:
1. **Maintenance is too cheap.** Once you're suzerain, you barely need to invest to keep it (5.24G per suzerain turn, 14.18 actions per 100 turns).
2. **Challenger bonus is strong but not enough to overcome incumbency.** `CITY_STATE_CHALLENGER_INVEST_BONUS = 16` and `CITY_STATE_CHALLENGER_PRESSURE = 12` exist but the suzerain's built-up influence creates a large lead that's hard to overcome.
3. **Pair-fatigue discourages persistent challenges.** The pair-recapture stability margin (base 6, step 6) makes it increasingly expensive for the same two civs to fight over a city-state. This kills hotspot dynamics.
4. **Passive contestation barely works.** Only 2 passive openings in 600 games, 0 direct flips from passive pressure.

## User Direction
"Yeah, this needs fixing."

## Plan

### 1. Increase Maintenance Cost (Holding Tax)
**File:** `engine/src/core/constants.ts`

- Increase `CITY_STATE_INVEST_SUZERAIN_DISCOUNT` from 0.8 to **0.9** (suzerain gets less of a discount when investing)
- Add a new constant: `CITY_STATE_INFLUENCE_DECAY_PER_TURN = 2` — every turn, the suzerain's influence lead decays slightly

**File:** `engine/src/game/city-states.ts`

In the turn processing function, add influence decay:
- Each turn, if a city-state has a suzerain, reduce the lead by `CITY_STATE_INFLUENCE_DECAY_PER_TURN`
- This means the suzerain must periodically reinvest to maintain their position
- If influence drops to where second place is within `CITY_STATE_CONTEST_MARGIN` (8), the city-state enters contested status → other civs get opportunities

### 2. Strengthen Passive Contestation
**File:** `engine/src/game/city-states.ts`

Currently passive contestation barely works (0 direct flips in 600 games). Fix:
- Increase `CITY_STATE_CONTESTATION_INTERVAL` from 2 to **1** (contestation pressure every turn instead of every 2 turns)
- Increase contestation pressure magnitude: when a rival has military near a city-state, it should meaningfully eat into the suzerain's lead
- Add **proximity-based passive pressure**: civs with cities within 5 hexes of a city-state get automatic +1 influence per turn, creating natural territorial contestation

### 3. Reduce Pair-Fatigue Severity
**File:** `engine/src/game/city-states.ts`

Currently pair-fatigue (recapture stability margin) escalates at +6 per flip, making repeat contests prohibitively expensive:
- Reduce `SUZERAIN_PAIR_RECAPTURE_MARGIN_STEP` from 6 to **3**
- Reduce `SUZERAIN_PAIR_RECAPTURE_MARGIN_BASE` from 6 to **4**
- This still discourages infinite ping-pong but allows more dynamic back-and-forth

### 4. War-Based Suzerainty Disruption
**File:** `engine/src/game/city-states.ts`

Currently `WartimeRelease` accounts for 33.5% of ownership changes — war is the primary driver of city-state turnover. Strengthen this:
- When a suzerain is at war, their influence in all city-states should decay at **2x the normal rate**
- This creates strategic decisions: going to war risks losing your city-state network

## Ripple Effects to Monitor
- **City-state value:** If city-states flip too often, they become less worth investing in. Target flip rate of ~0.5-0.8 per 100 turns (from 0.27) — enough to be dynamic without being chaotic.
- **JadeCovenant:** They invest 4143G/game in city-states (most of any civ). More contestation means their gold advantage becomes even more important. If their win rate spikes, city-state investment costs may need to increase.
- **Game length:** More city-state dynamics add complexity but shouldn't significantly extend game length. Monitor average victory turn.
- **Investment allocation:** If maintenance costs increase, the current 80/20 challenger/maintenance split should shift toward more maintenance. Target ~65/35.

## Verification
Run 600 simulations before/after. Target:
- Never-flip rate ≤ 60% (down from 83%)
- Average unique suzerains ≥ 1.4 (up from 1.18)
- Contested turn share ≥ 3% (up from 0.94%)
- Flip rate 0.5-0.8 per 100 active turns (up from 0.27)
- Hotspot share ≥ 2% (up from 0.54%)
- Winner vs non-winner suzerainty gap should remain (suzerainty should still help winning)
