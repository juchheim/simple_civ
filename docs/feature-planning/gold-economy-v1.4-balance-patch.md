# Gold Economy v1.4 Balance Patch

Source report: `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/docs/analysis/economic-balance-report.md`  
Report timestamp: `2026-02-20T20:07:39.319Z` (25 sims, Aether disabled)

## Goals
1. Keep military sustainability partially dependent on economic infrastructure.
2. Reduce runaway treasury/net for top civs (RiverLeague, ForgeClans, AetherianVanguard).
3. Reduce chronic austerity traps for weak civs (especially JadeCovenant, ScholarKingdoms).
4. Preserve high economic-building adoption, but reduce pure gold snowball from early econ stack.

## Global Constant Deltas (Exact)

### Military supply dependency
- `MILITARY_FREE_SUPPLY_BASE`: `1 -> 1` (no change; retained for dependency)
- `MILITARY_UPKEEP_PER_EXCESS_SUPPLY`: `2 -> 2` (no change; retained)
- `ECONOMIC_BUILDING_SUPPLY_BONUS`:
  - `TradingPost`: `1 -> 1`
  - `MarketHall`: `2 -> 1`
  - `Bank`: `2 -> 2`
  - `Exchange`: `3 -> 3`

### Gold building economy shape
- `TradingPost`: `cost 40 -> 40`, `yield G 4 -> 4`, `maintenance 1 -> 2`
- `MarketHall`: `cost 60 -> 56`, `yield G 6 -> 6`, `maintenance 2 -> 3`
- `Bank`: `cost 80 -> 72`, `yield G 8 -> 8`, `maintenance 3 -> 4`
- `Exchange`: `cost 120 -> 108`, `yield G 12 -> 12`, `maintenance 4 -> 5`

Design effect:
- Lower early/mid raw net from stacked econ buildings.
- Preserve and shift military support value toward deeper economy line (Bank/Exchange).

## AI Logic Delta (Exact)

### Economy tech pressure trigger (earlier preemption)
- In `chooseTechV2` economy pressure condition:
  - `netGold <= 3` -> `netGold <= 5`
  - `usedSupply >= freeSupply` -> `usedSupply >= freeSupply - 1`

Design effect:
- AI enters economy unlock tech path before hard over-cap or hard deficit.

## Civ AI Profile Deltas (Exact)

### ForgeClans
- `build.armyPerCity`: `2.2 -> 2.1`
- `economy.goldBuildBias`: `1.75 -> 1.65`
- `economy.rushBuyAggression`: `1.35 -> 1.2`
- `economy.upkeepRatioLimit`: `0.46 -> 0.44`

### ScholarKingdoms
- `build.armyPerCity`: `2.2 -> 2.0`
- `economy.reserveMultiplier`: `1.25 -> 1.3`
- `economy.goldBuildBias`: `1.95 -> 2.05`
- `economy.rushBuyAggression`: `1.05 -> 1.0`
- `economy.upkeepRatioLimit`: `0.36 -> 0.34`

### RiverLeague
- `build.armyPerCity`: `2.5 -> 2.3`
- `economy.goldBuildBias`: `2.05 -> 1.9`
- `economy.rushBuyAggression`: `1.1 -> 1.0`
- `economy.upkeepRatioLimit`: `0.4 -> 0.36`

### AetherianVanguard
- `economy.reserveMultiplierPostTitan`: `0.9 -> 1.0`
- `economy.goldBuildBias`: `1.75 -> 1.6`
- `economy.rushBuyAggression`: `1.35 -> 1.15`
- `economy.upkeepRatioLimit`: `0.46 -> 0.44`

### StarborneSeekers
- `economy.goldBuildBias`: `1.8 -> 1.7`
- `economy.rushBuyAggression`: `0.75 -> 0.7`

### JadeCovenant
- `build.armyPerCity`: `2.6 -> 2.2`
- `build.settlerCap`: `5 -> 4`
- `build.desiredCities`: `8 -> 7`
- `economy.reserveMultiplier`: `1.15 -> 1.05`
- `economy.goldBuildBias`: `1.85 -> 2.15`
- `economy.rushBuyAggression`: `1.0 -> 0.9`
- `economy.upkeepRatioLimit`: `0.37 -> 0.33`

## Implementation Files
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/core/constants.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/rules.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/tech.ts`

