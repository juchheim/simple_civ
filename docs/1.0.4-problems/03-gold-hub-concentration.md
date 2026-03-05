# Problem 03: Gold Hub Concentration (60-68% from one city)

## The Problem
All six civilizations generate 59-68% of their total gold income from a single city. If that city is captured, economic collapse follows. The economy is fragile and non-resilient.

## Root Cause
Gold buildings stack multiplicatively in one city. The building chain (TradingPost → MarketHall → Bank → Exchange) concentrates in the first city that builds TradingPost, since later buildings require earlier ones. The AI rarely builds gold chains in multiple cities.

Gold yields from `constants.ts`:
- TradingPost: +4G (turn ~80)
- MarketHall: +6G (turn ~150)
- Bank: +8G (turn ~250)
- Exchange: +10G, requires Bank (turn ~270)
- Total stack in one city: **+28G/turn** plus conditionals

Meanwhile, BASE_CITY_GOLD = 0, so cities without gold buildings contribute almost nothing.

## User Direction
"Fix so that it's not just one city. Then check the balance of the game economy and likely rebalance."

## Plan

### Phase 1: Spread Gold Generation

#### A. Add Base City Gold
**File:** `engine/src/core/constants.ts`
- Change `BASE_CITY_GOLD` from 0 to **2**. Every city now produces 2G baseline.
- This means a 3-city empire gets 6G from base alone, reducing single-city dependency.

#### B. Reduce Individual Building Gold, Add Population Scaling
**File:** `engine/src/core/constants.ts` (BUILDINGS record)

Rebalance gold building yields to be lower per-building but scale with city development:

| Building | Current Gold | New Gold | New Conditional |
|----------|-------------|----------|-----------------|
| TradingPost | +4G | +3G | +1G per 3 population (was: river/coast +1G) |
| MarketHall | +6G | +4G | +1G per 3 population (was: pop 5+ gives +1G) |
| Bank | +8G | +5G | +1G per worked OreVein tile (unchanged) |
| Exchange | +10G | +6G | Unchanged |

Rationale: A pop-6 city with TradingPost now gets 3 + 2 = 5G (was 4G or 5G). But the critical effect is that **all cities benefit** from the population scaling, not just the one city with the full chain.

#### C. Remove Exchange Dependency on Bank
**File:** `engine/src/core/constants.ts` (BUILDINGS record, Exchange entry)
- Remove `requiresBuilding: BuildingType.Bank` from Exchange.
- Change Exchange prereq to just the tech (SignalRelay). This allows cities to build Exchange independently without the full chain, spreading gold potential.

### Phase 2: AI Build Priority Rebalancing
**File:** `engine/src/game/ai/city-build-priorities.ts`

In `buildPriorities()` and `buildNormalPriorities()`:
- After the first city has TradingPost, prioritize building TradingPost in the second city before MarketHall in the first city.
- Add a **gold building scatter** rule: don't build the next tier in city A until city B has the previous tier.
- Exception: If the civ is in austerity, prioritize the highest gold building available in any city.

### Phase 3: Economy Rebalancing Pass

After Phase 1+2, the total gold in the system will change. Need to rebalance:

**File:** `engine/src/core/constants.ts`
- Adjust building maintenance costs to match new yields. Current maintenance (TradingPost: 2, MarketHall: 3, Bank: 4, Exchange: 5) should remain stable since total yields are slightly lower.
- Adjust `MILITARY_UPKEEP_PER_EXCESS_SUPPLY` if needed (currently 3G per excess supply).

**File:** `engine/src/game/rules.ts`
- Update `getCityYields()` to implement the new population-scaled gold conditionals.
- The existing conditional system checks for river adjacency and population thresholds; extend it for population-scaling.

## Ripple Effects to Monitor
- **JadeCovenant:** Currently avg net 18.43G. They have the most cities (3.8/game), so they benefit most from BASE_CITY_GOLD increase. Monitor that they don't become even more dominant economically. May need to counterbalance by reducing their growth advantages.
- **ScholarKingdoms/StarborneSeekers:** Currently weakest economies. BASE_CITY_GOLD helps them since they have fewer cities but it's proportionally more impactful.
- **City-state investment:** If total gold in system increases, city-state investment costs may need to scale. Currently CITY_STATE_INVEST_BASE_COST = 30; may need to increase to 35-40.
- **Rush-buy economy:** More distributed gold means more cities can rush-buy. Monitor rush-buy frequency.
- **ForgeClans:** Their military discount (80% cost) means they benefit from gold primarily via rush-buys. Watch their military production rate.

## Verification
Run 600 simulations before/after. Target:
- Top gold city share ≤ 45% (down from 60-68%)
- Average net gold should remain within ±15% of current values
- Deficit turn rate should decrease (currently 2.5-16% depending on civ)
- Austerity turn rate should decrease
- Win rate spread should remain ≤ 7pp
- Run a separate economic balance report and compare scorecards
