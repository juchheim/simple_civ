# Gold Economy v1.2 Balance Patch (Implemented)

## Goals
- Reduce runaway treasury growth.
- Increase pressure from upkeep and supply.
- Improve adoption of dedicated gold buildings.
- Preserve civ-specific economy behavior through explicit AI profile tuning.

## Core Economy Constants
- `BASE_CITY_GOLD = 1` (was `2`)
- `STARTING_TREASURY = 40` (was `50`)

## Building Upkeep and Gold-Line Values

### Existing Building Upkeep (Gold/turn)
| Building | v1.1 | v1.2 |
| --- | ---: | ---: |
| Farmstead | 1 | 2 |
| StoneWorkshop | 1 | 2 |
| Scriptorium | 1 | 2 |
| Reservoir | 1 | 2 |
| LumberMill | 1 | 2 |
| Academy | 2 | 3 |
| CityWard | 2 | 3 |
| Forgeworks | 2 | 3 |
| CitySquare | 2 | 3 |
| JadeGranary | 2 | 3 |
| Bulwark | 3 | 4 |
| AetherReactor | 3 | 5 |
| ShieldGenerator | 4 | 6 |

### Gold Building Line
| Building | Cost | Gold Yield | Upkeep | Conditional |
| --- | ---: | ---: | ---: | --- |
| TradingPost | 40 | 5 | 1 | +1 G if river-adjacent city |
| MarketHall | 62 | 8 | 2 | +1 G if Pop >= 5 |
| Bank | 82 | 10 | 3 | +1 G if any worked OreVein |
| Exchange | 125 | 16 | 4 | none |

## AI Budget Constants

### Reserve Floor Formula
`reserveFloor = ceil((34 + 10*cityCount + 3*combatUnitCount + (atWar ? 30 : 0)) * reserveMultiplier)`

### Economy State Thresholds
- `Crisis`: austerity active OR `deficitRiskTurns <= 2`
- `Strained`: `treasury < reserveFloor` OR `deficitRiskTurns <= 6`
- `Healthy`: `treasury >= reserveFloor + 55` AND `netGold >= 0`
- Else `Guarded`

### Budget Buckets
| State | Economy Recovery | Military/Defense | Opportunistic Rush-Buy |
| --- | ---: | ---: | ---: |
| Healthy | 45% | 30% | 25% |
| Guarded | 60% | 30% | 10% |
| Strained | 78% | 22% | 0% |
| Crisis | 90% | 10% | 0% |

### Default Economy Profile
- `reserveMultiplier: 1.08`
- `deficitToleranceTurns: 2`
- `goldBuildBias: 1.25`
- `rushBuyAggression: 1.10`
- `upkeepRatioLimit: 0.42`

## Civ Economy Profiles (v1.2)
| Civ | reserveMultiplier | reserveMultiplierPostTitan | deficitToleranceTurns | goldBuildBias | rushBuyAggression | upkeepRatioLimit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ForgeClans | 0.82 | - | 4 | 1.15 | 1.35 | 0.48 |
| ScholarKingdoms | 1.45 | - | 2 | 1.55 | 0.70 | 0.34 |
| RiverLeague | 1.05 | - | 3 | 1.65 | 1.00 | 0.40 |
| AetherianVanguard | 1.30 | 0.92 | 4 | 1.10 | 1.45 | 0.52 |
| StarborneSeekers | 1.55 | - | 2 | 1.55 | 0.60 | 0.32 |
| JadeCovenant | 1.10 | - | 3 | 1.40 | 1.05 | 0.44 |

## Verification
- `npm test -w engine` (passed: 494/494)
- `npm run build -w engine` (passed)
