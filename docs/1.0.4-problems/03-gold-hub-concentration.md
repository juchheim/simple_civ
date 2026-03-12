# Problem 03: Gold Hub Concentration (60-68% from one city)

## The Problem
All six civilizations generate 59-68% of their total gold income from a single city. If that city is captured, economic collapse follows. The economy is fragile and non-resilient.

## Root Cause
The original fix path mixed two different problems:
- Gold buildings stacked too efficiently in one city, so the first city to start the chain became the empire's permanent gold hub.
- The AI often upgraded the same city again instead of bringing other cities up to the previous tier.
- The economy report averaged top-city gold share across all turns, which overweights one-city and two-city openings and made the `<=45%` goal misleading.
- The report column `Top Gold Hub Source` was terrain context, not an economy-chain concentration metric.

The recovery baseline keeps the prerequisite ladder intact, removes cross-city network gold, and evaluates the ship target only on developed-economy samples.

## User Direction
"Fix so that it's not just one city. Then check the balance of the game economy and likely rebalance."

## Recovery Plan

### 1. Telemetry and Report Alignment
- Treat the ship gate as **developed-economy top gold city share**, sampled only when `turn > 100` and the civ owns `>= 3` cities.
- Keep the old all-turn top-city share in the report as a legacy diagnostic only.
- Rename the terrain-context column to **Strategic Site Rate** so it is not mistaken for a gold-chain concentration score.
- Evaluate the gold-hub pillar against the problem target directly: `<=45%` on the developed metric, with no civ above `50%`.

### 2. Gold Ladder Recovery
- Keep `BASE_CITY_GOLD = 2`.
- Keep the prerequisite chain: `TradingPost -> MarketHall -> Bank -> Exchange`.
- Use the recovered gold curve:

| Building | Gold | Upkeep | Conditional |
|----------|------|--------|-------------|
| TradingPost | +3G | 2 | Shared commercial bonus: `floor(pop / 3)` once per city |
| MarketHall | +4G | 3 | Shared commercial bonus: `floor(pop / 3)` once per city |
| Bank | +5G | 4 | `+1G` if any worked Ore Vein |
| Exchange | +4G | 5 | None |

- Apply same-city stack attenuation by slot: `100% / 45% / 20% / 10%` of listed gold, rounded, minimum `1`.
- Apply the shared population-based commercial bonus only once, on the first gold-building slot in that city.
- Keep Bank's ore conditional as a separate local bonus so ore-backed Bank cities still progress.
- Remove all cross-city network gold from the abandoned spillover design.
- Keep gold-building supply bonuses at `0 / 1 / 1 / 2`.

### 3. AI Distribution and Tech Sequencing
- Score gold buildings by **city-local marginal gain**, not empire-wide spillover gain.
- Hard-block a higher-tier gold build if an idle eligible peer is missing the previous tier.
- Apply a `0.65` score multiplier when a non-idle eligible peer is missing the previous tier and is not already building it.
- Only bypass the scatter rule during austerity or `economyState === "Crisis"`.
- Treat a queued gold building as part of a city's **effective tier** when evaluating spread.
- Add economy-chain tech steering:
  - target `Wellworks` once a civ has `>= 2` Trading Posts and lacks it
  - target `UrbanPlans` once a civ has `>= 2` Market Halls or any ore-backed Market Hall city and lacks it
  - suppress `SignalRelay` scoring while `UrbanPlans` is the active economy-chain target

## Ripple Effects to Monitor
- **JadeCovenant:** More cities still means more baseline gold and more places to host first-tier commercial buildings. Watch win rate and average net closely.
- **ScholarKingdoms / StarborneSeekers:** The restored prerequisite chain must not reintroduce late-tier starvation for the science civs.
- **City-state investment:** If the recovered baseline still leaves too much spare gold, city-state investment may need a separate price pass.
- **Rush-buy economy:** The ladder still grants rush-buy discounts, so wider distribution may increase tactical purchasing frequency even if total gold stays flat.
- **Bank/Exchange timing:** The recovered chain should keep Market Hall and Bank adoption healthy without pushing Exchange so late that the capstone becomes irrelevant.

## Verification
Run 600 simulations before/after. Target:
- **Ship gate:** developed-economy top gold city share `<=45%` for at least `5/6` civs, and no civ above `50%`
- Legacy all-turn top-city share no worse than the `303d4ab` baseline by more than `+1.0pp`
- Average net gold remains within `±15%` of the `303d4ab` baseline
- Win-rate spread remains `<= 7pp`
- MarketHall adoption remains `>= 45%`
- Bank adoption remains `>= 25%`
- Scarcity-health deficit/austerity bands remain diagnostic only for this fix; monitor them after ship-gate checks rather than using them as the primary pass/fail condition
