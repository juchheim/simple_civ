# Gold Economy v1.3.2 Military Dependency Hotfix (Implemented)

## Intent
Make military sustainability partially dependent on economic building investment, instead of letting civs maintain large armies without committing to the gold building line.

## Rule-Level Dependency Added
`getPlayerSupplyUsage` now includes a free-supply bonus from economic buildings:

- `TradingPost`: `+1 free supply`
- `MarketHall`: `+1 free supply`
- `Bank`: `+1 free supply`
- `Exchange`: `+2 free supply`

Military upkeep pressure raised concurrently:

- `MILITARY_UPKEEP_PER_EXCESS_SUPPLY: 1 -> 2`

Combined effect:
- Armies without economy infrastructure become expensive quickly.
- Building the gold line directly reduces military upkeep burden.

## AI Behavior Changes
1. Economy production is boosted when military pressure is high:
   - Added economy candidate bonus when `usedSupply > freeSupply`.
   - Added bonus when `upkeepRatio` exceeds civ limit.
2. Forced economy recovery now triggers if supply is materially over cap:
   - `usedSupply > freeSupply + 1` forces economy-building prioritization.
3. Higher-tier economic buildings are now favored more strongly:
   - tier multipliers increased to encourage moving beyond `TradingPost`:
   - `MarketHall 1.20`, `Bank 1.40`, `Exchange 1.70`
4. Economy profile tuning increased economic bias where needed:
   - Higher `goldBuildBias` and tighter `upkeepRatioLimit` for civs that were skipping the line.

## Files Updated
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/core/constants.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/rules.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/production.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/production/economy.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/turn-runner/production.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/economy/budget.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/rules.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/rules.test.ts`
