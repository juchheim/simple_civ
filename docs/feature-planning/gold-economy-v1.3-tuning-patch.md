# Gold Economy v1.3 Tuning Patch (Concrete + Implemented)

Report basis: `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/docs/analysis/economic-balance-report.md` generated `2026-02-20T18:40:12.276Z`.

## Goals
- Reduce passive treasury growth and force real budget tradeoffs.
- Increase wartime economic pressure.
- Increase gold-building adoption, especially late line (`Exchange`).
- Improve underperforming `ScholarKingdoms`, constrain overperforming `JadeCovenant`, and reduce Progress-lean drift for `ForgeClans`/`RiverLeague`.

## 1) Global Economy Constant Deltas

| Constant | v1.2 | v1.3 | Delta |
| --- | ---: | ---: | ---: |
| `BASE_CITY_GOLD` | 1 | 0 | -1 |
| `STARTING_TREASURY` | 40 | 30 | -10 |
| `MILITARY_FREE_SUPPLY_BASE` | 2 | 1 | -1 |
| `MILITARY_FREE_SUPPLY_PER_CITY` | 2 | 1 | -1 |
| `MILITARY_UPKEEP_PER_EXCESS_SUPPLY` | n/a | 2 | +2 per excess supply |

Formula delta:
- v1.2: `militaryUpkeep = max(0, usedSupply - freeSupply)`
- v1.3: `militaryUpkeep = max(0, usedSupply - freeSupply) * MILITARY_UPKEEP_PER_EXCESS_SUPPLY`

## 2) Gold Building Line Deltas

| Building | v1.2 Cost | v1.3 Cost | Yield | Upkeep |
| --- | ---: | ---: | ---: | ---: |
| `TradingPost` | 40 | 36 | 5 | 1 |
| `MarketHall` | 62 | 54 | 8 | 2 |
| `Bank` | 82 | 68 | 10 | 3 |
| `Exchange` | 125 | 96 | 16 | 4 |

Intent: reduce payback horizon without increasing steady-state gold yields.

## 3) AI Budget Constant Deltas

### Economy buckets
| State | v1.2 Economy / Military / Rush | v1.3 Economy / Military / Rush |
| --- | --- | --- |
| `Healthy` | 45 / 30 / 25 | 38 / 37 / 25 |
| `Guarded` | 60 / 30 / 10 | 48 / 40 / 12 |
| `Strained` | 78 / 22 / 0 | 70 / 30 / 0 |
| `Crisis` | 90 / 10 / 0 | 84 / 16 / 0 |

### Reserve/state constants
| Constant | v1.2 | v1.3 |
| --- | ---: | ---: |
| `RESERVE_BASE` | 34 | 30 |
| `RESERVE_PER_CITY` | 10 | 9 |
| `RESERVE_PER_COMBAT_UNIT` | 3 | 2 |
| `RESERVE_WAR_BONUS` | 30 | 22 |
| `HEALTHY_TREASURY_BUFFER` | 55 | 45 |
| `STRAINED_DEFICIT_RISK_TURNS` | 6 | 6 |
| `CRISIS_DEFICIT_RISK_TURNS` | 2 | 2 |

### Default economy profile
| Field | v1.2 | v1.3 |
| --- | ---: | ---: |
| `reserveMultiplier` | 1.08 | 1.00 |
| `deficitToleranceTurns` | 2 | 3 |
| `goldBuildBias` | 1.25 | 1.35 |
| `rushBuyAggression` | 1.10 | 1.20 |
| `upkeepRatioLimit` | 0.42 | 0.40 |

## 4) AI Spending/Production Constant Deltas

| Constant | v1.2 | v1.3 |
| --- | ---: | ---: |
| Economic rush-buy payback max | 8 turns | 10 turns |
| Utility score base: `PRODUCTION_BASE_SCORES.economy` | 0.44 | 0.48 |

## 5) Civ Economy Profile Deltas

| Civ | reserveMultiplier | reserveMultiplierPostTitan | deficitToleranceTurns | goldBuildBias | rushBuyAggression | upkeepRatioLimit |
| --- | --- | --- | --- | --- | --- | --- |
| `ForgeClans` | 0.82 -> 0.78 | - | 4 -> 5 | 1.15 -> 1.00 | 1.35 -> 1.55 | 0.48 -> 0.58 |
| `ScholarKingdoms` | 1.45 -> 1.25 | - | 2 -> 2 | 1.55 -> 1.70 | 0.70 -> 0.95 | 0.34 -> 0.38 |
| `RiverLeague` | 1.05 -> 0.98 | - | 3 -> 4 | 1.65 -> 1.75 | 1.00 -> 1.20 | 0.40 -> 0.50 |
| `AetherianVanguard` | 1.30 -> 1.20 | 0.92 -> 0.95 | 4 -> 3 | 1.10 -> 1.30 | 1.45 -> 1.35 | 0.52 -> 0.56 |
| `StarborneSeekers` | 1.55 -> 1.40 | - | 2 -> 2 | 1.55 -> 1.70 | 0.60 -> 0.80 | 0.32 -> 0.36 |
| `JadeCovenant` | 1.10 -> 1.25 | - | 3 -> 2 | 1.40 -> 1.25 | 1.05 -> 0.90 | 0.44 -> 0.34 |

## 6) Implementation Files
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/core/constants.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/rules.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/economy/budget.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/economy/spending.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/production.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/rules.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/rules.test.ts`
