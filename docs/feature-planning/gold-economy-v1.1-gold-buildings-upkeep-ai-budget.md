# Gold Economy v1.1

## Scope
Add Gold as a full 4th yield with:
- Dedicated Gold-producing building progression.
- Per-turn upkeep on existing persistent buildings.
- Treasury ledger and austerity state.
- AI budget-state management, rush-buy constraints, and civ-specific economy personalities.

## Locked Economy Rules

### Gold Sources
- `Yields` includes `G`.
- Terrain and overlays can contribute Gold.
- City baseline:
  - `BASE_CITY_GOLD = 2`
  - `CITY_CENTER_MIN_GOLD = 1`

### Existing Buildings
- Existing buildings do not gain new flat Gold unless they are in the dedicated Gold line.
- Existing persistent buildings carry per-turn upkeep in Gold.

### Dedicated Gold Buildings
- `TradingPost` (Hearth, `Fieldcraft`): cost 45, +4G, upkeep 1, +1G if river-adjacent city.
- `MarketHall` (Banner, `Wellworks`): cost 70, +6G, upkeep 2, +1G if pop >= 5.
- `Bank` (Engine, `UrbanPlans`): cost 95, +8G, upkeep 3, +1G if any worked `OreVein`.
- `Exchange` (Aether, `ZeroPointEnergy`): cost 170, +12G, upkeep 4.

### Treasury and Deficit
- `grossGold = sum(cityYield.G)`
- `buildingUpkeep = sum(building maintenance)`
- `militaryUpkeep = max(0, usedSupply - freeSupply)`
- `netGold = grossGold - buildingUpkeep - militaryUpkeep`
- `treasury = max(0, treasury + netGold)`
- Austerity trigger: `treasury == 0 && netGold < 0`
- Austerity effects:
  - Production multiplier `0.90`
  - Science multiplier `0.90`
  - Rush-buy disabled
- Austerity clears when `netGold >= 0`.

## AI Budget Management

### Economy Snapshot
Computed each AI turn:
- `grossGold`, `buildingUpkeep`, `militaryUpkeep`, `netGold`, `treasury`
- `reserveFloor`
- `deficitRiskTurns`
- `economyState`

Definitions:
- `reserveFloor = (30 + 8*cityCount + 2*combatUnitCount + (atWar ? 20 : 0)) * reserveMultiplier`
- `deficitRiskTurns = netGold < 0 ? ceil(treasury / abs(netGold)) : Infinity`
- States:
  - `Healthy`: `treasury >= reserveFloor + 40 && netGold >= 0`
  - `Guarded`: otherwise, but not Strained/Crisis
  - `Strained`: `treasury < reserveFloor || deficitRiskTurns <= 5`
  - `Crisis`: austerity active or `deficitRiskTurns <= 2`

### Bucket Weights by State
Spendable treasury: `max(0, treasury - reserveFloor)`

- `Healthy`: recovery 40%, military 35%, opportunistic rush-buy 25%
- `Guarded`: recovery 50%, military 35%, opportunistic rush-buy 15%
- `Strained`: recovery 70%, military 30%, opportunistic rush-buy 0%
- `Crisis`: recovery 85%, military 15%, opportunistic rush-buy 0%

### Rush-Buy Rules
- Allowed only in `Healthy` or `Guarded`.
- Post-spend treasury must remain `>= reserveFloor`.
- Not allowed for Progress chain or once-per-civ completions.
- Candidate must satisfy at least one:
  - Saves `>= 3` turns on threatened defender build.
  - Completes Gold building with payback `<= 8` turns.
  - Completes combat unit in city with threat `raid` or higher.
- Anti-spam:
  - Max 2 rush-buys per player turn.
  - Max 1 rush-buy per city per turn.
  - Max 1 economic rush-buy on consecutive turns.

### Budget-Corrective Production
- In `Strained`/`Crisis`, force economy recovery production toward Gold buildings.
- In `Crisis`, pause settler production unless elimination risk is present.
- In `Strained`/`Crisis`, deprioritize non-critical and non-defensive lines.

## Civilization Economy Profiles
Defined per civ with:
- `reserveMultiplier`
- `deficitToleranceTurns`
- `goldBuildBias`
- `rushBuyAggression`
- `upkeepRatioLimit`

Profiles:
- ForgeClans: `0.85`, `4`, `0.90`, `1.25`, `0.62`
- ScholarKingdoms: `1.35`, `2`, `1.25`, `0.60`, `0.45`
- RiverLeague: `1.00`, `3`, `1.35`, `0.90`, `0.52`
- AetherianVanguard: `1.20 pre-Titan / 0.80 post-Titan`, `5`, `0.80`, `1.35`, `0.72`
- StarborneSeekers: `1.40`, `2`, `1.30`, `0.50`, `0.42`
- JadeCovenant: `1.05`, `3`, `1.15`, `0.95`, `0.56`

Behavior intent:
- ForgeClans: lower reserves, more wartime spend.
- ScholarKingdoms: conservative treasury, anti-deficit.
- RiverLeague: strong river/coast Gold-build preference.
- AetherianVanguard: pre-Titan reserve hoarding, post-Titan aggression.
- StarborneSeekers: low rush-buy aggression, low volatility.
- JadeCovenant: wide-economy governor with settler pause when upkeep pressure is high.

## Acceptance Targets
- Victory completion rate: `>= 94%`.
- Progress share: `40%-65%`.
- Per-civ win rates: `16%-30%`.
- Civ-specific austerity share targets by simulation band.
- No AI remains in austerity `> 6` consecutive turns outside explicit high-war Aetherian cases.
