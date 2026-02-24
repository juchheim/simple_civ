# Gold Economy v1.3.1 Hotfix (Implemented)

## Why
- v1.3 produced chronic austerity/deficits across most civs.
- Economic buildings were still under-produced in deeper tiers (`MarketHall`/`Bank`/`Exchange`).

## Global Economy Deltas (v1.3 -> v1.3.1)
| Constant | v1.3 | v1.3.1 |
| --- | ---: | ---: |
| `BASE_CITY_GOLD` | 0 | 1 |
| `STARTING_TREASURY` | 30 | 40 |
| `MILITARY_FREE_SUPPLY_BASE` | 1 | 2 |
| `MILITARY_FREE_SUPPLY_PER_CITY` | 1 | 1 |
| `MILITARY_UPKEEP_PER_EXCESS_SUPPLY` | 2 | 1 |

## AI Budget Deltas
| Constant | v1.3 | v1.3.1 |
| --- | ---: | ---: |
| Healthy bucket (`econ/mil/rush`) | 38/37/25 | 34/40/26 |
| Guarded bucket (`econ/mil/rush`) | 48/40/12 | 44/42/14 |
| `HEALTHY_TREASURY_BUFFER` | 45 | 40 |
| Default `reserveMultiplier` | 1.00 | 0.95 |
| Default `goldBuildBias` | 1.35 | 1.45 |
| Default `upkeepRatioLimit` | 0.40 | 0.42 |

## Economic Building Production Hotfix
1. Added higher-tier preference multiplier in economy scoring:
   - `TradingPost`: `1.00`
   - `MarketHall`: `1.12`
   - `Bank`: `1.25`
   - `Exchange`: `1.45`
2. Economy recovery forcing now also triggers when `netGold < 0` (even outside explicit `Strained/Crisis` state).

## Civ Economy Profile Deltas
| Civ | v1.3 | v1.3.1 |
| --- | --- | --- |
| ForgeClans | `0.78 / 5 / 1.00 / 1.55 / 0.58` | `0.90 / 4 / 1.25 / 1.35 / 0.52` |
| ScholarKingdoms | `1.25 / 2 / 1.70 / 0.95 / 0.38` | `1.25 / 2 / 1.90 / 1.05 / 0.36` |
| RiverLeague | `0.98 / 4 / 1.75 / 1.20 / 0.50` | `1.00 / 4 / 1.80 / 1.10 / 0.46` |
| AetherianVanguard | `1.20->0.95 / 3 / 1.30 / 1.35 / 0.56` | `1.15->0.90 / 3 / 1.35 / 1.35 / 0.54` |
| StarborneSeekers | `1.40 / 2 / 1.70 / 0.80 / 0.36` | `1.45 / 2 / 1.75 / 0.75 / 0.36` |
| JadeCovenant | `1.25 / 2 / 1.25 / 0.90 / 0.34` | `1.15 / 3 / 1.50 / 1.00 / 0.40` |

Format per civ:
- `reserveMultiplier / deficitToleranceTurns / goldBuildBias / rushBuyAggression / upkeepRatioLimit`
- Aetherian includes `reserveMultiplierPostTitan` in arrow notation.

## Files Updated
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/core/constants.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/rules.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/economy/budget.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/production/economy.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/turn-runner/production.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/rules.ts`
- `/Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/rules.test.ts`
