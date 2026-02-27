# City-State Simulation Report

Generated: 2026-02-27T18:44:31.683Z

## Data Coverage
- Simulations processed: 100
- Simulations with city-state telemetry: 100
- Simulations missing city-state telemetry: 0
- Total city-states created: 171
- Total city-state active turns: 16540
- Total contested turns: 242 (No Suz: 0, Close-race: 242)
- Contest telemetry coverage (city-state entries): 171 with split fields, 0 legacy-only
- Global suzerain flip rate: 0.84 per 100 active turns
- Average unique suzerains per city-state: 1.20
- Average city-states created per telemetry simulation: 1.71
- Average surviving city-states at game end (telemetry sims): 1.71



## Creation Timing
- Simulations with at least one city-state created: 75/100 (75.0%)
- First city-state creation turn (min / p25 / median / p75 / max): 104 / 155 / 178 / 199 / 371
- First city-state creation turn (average, sims with any): 183.8

## Map-Size Creation Rates
| Map | Sims | Telemetry Sims | Sims with >=1 CS | Share with >=1 CS | Total Created | Avg Created / Telemetry Sim | Avg First CS Turn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tiny | 20 | 20 | 6 | 30.0% | 8 | 0.40 | 178.7 |
| Small | 20 | 20 | 14 | 70.0% | 20 | 1.00 | 163.9 |
| Standard | 20 | 20 | 19 | 95.0% | 35 | 1.75 | 178.5 |
| Large | 20 | 20 | 18 | 90.0% | 51 | 2.55 | 199.3 |
| Huge | 20 | 20 | 18 | 90.0% | 57 | 2.85 | 191.0 |

## Suzerainty vs Winning
- Winner average suzerain turns: 51.77
- Non-winner average suzerain turns: 36.28
- Winner average city-state investment: 1507.7G
- Non-winner average city-state investment: 1270.2G
- Winners with any suzerainty: 43/84 (51.2%)
- Winners with any city-state investment: 47/84 (56.0%)
- Participant win rate with any suzerainty: 29.3%
- Participant win rate without suzerainty: 15.0%
- Participant win rate with any city-state investment: 20.9%
- Correlation (suzerain turns -> win flag): 0.072
- Correlation (city-state gold invested -> win flag): 0.044
- Winner share of sim-wide suzerain turns (when any suzerainty existed): 48.3%

## Investment Mix
- Total city-state investment: 553422G across 6375 actions
- Maintenance investment: 196531G (35.5%) across 2525 actions (39.6%)
- Challenger investment: 356891G (64.5%) across 3850 actions (60.4%)
- Maintenance gold per suzerain turn: 11.88
- Maintenance actions per 100 suzerain turns: 15.27

## Civ Performance
| Civ | Games | Wins | Win% | Avg Suz Turns | Avg Invested Gold | Avg Maintenance Gold | Avg Invest Actions | Win% (Suz>0) | Win% (Suz=0) | Top Suz Claims |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 74 | 17 | 23.0% | 43.70 | 1368.5 | 436.3 | 16.59 | 32.1% | 17.4% | 32 |
| ScholarKingdoms | 70 | 10 | 14.3% | 19.87 | 697.8 | 211.5 | 9.17 | 31.3% | 9.3% | 15 |
| RiverLeague | 70 | 11 | 15.7% | 29.49 | 1440.0 | 439.0 | 14.91 | 21.7% | 12.8% | 23 |
| AetherianVanguard | 71 | 20 | 28.2% | 39.06 | 991.8 | 399.8 | 14.00 | 25.9% | 29.5% | 35 |
| StarborneSeekers | 68 | 14 | 20.6% | 25.84 | 1048.4 | 321.5 | 12.35 | 41.2% | 13.7% | 14 |
| JadeCovenant | 67 | 12 | 17.9% | 79.42 | 2400.0 | 1021.7 | 24.28 | 27.8% | 6.5% | 51 |

## Yield-Type Summary
| Yield | City-States | Avg Active Turns | Contested Turn Share | No Suz Share | Close-Race Share | Flip Rate /100T | Avg Unique Suz | Surviving | Removed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Science | 43 | 101.21 | 1.7% | 0.0% | 1.7% | 1.49 | 1.26 | 43 | 0 |
| Production | 43 | 86.09 | 0.9% | 0.0% | 0.9% | 0.35 | 1.12 | 43 | 0 |
| Food | 41 | 98.39 | 1.1% | 0.0% | 1.1% | 1.14 | 1.17 | 41 | 0 |
| Gold | 44 | 101.18 | 2.0% | 0.0% | 2.0% | 0.34 | 1.27 | 44 | 0 |

## City-State Suzerainty Ledger
| City-State | Yield | Appearances | Avg Active Turns | Contested Share | No Suz Share | Close-Race Share | Flip Rate /100T | Avg Unique Suz | Suzerain Turns by Civ | Investment by Civ (Gold/Actions) | Avg Suz Changes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amber Orchard | Food | 2 | 60.00 | 7.5% | 0.0% | 7.5% | 27.50 | 1.50 | RiverLeague 103T, ForgeClans 17T | RiverLeague 2141G/26, maintain 1075G, ForgeClans 1381G/20 | 16.50 |
| Bloomtide | Food | 8 | 108.25 | 1.0% | 0.0% | 1.0% | 0.12 | 1.13 | AetherianVanguard 341T, StarborneSeekers 258T, ForgeClans 226T, JadeCovenant 26T, RiverLeague 15T | ForgeClans 7159G/62, maintain 193G, StarborneSeekers 6366G/69, maintain 3517G, AetherianVanguard 5967G/62, maintain 5967G, RiverLeague 5389G/61, maintain 304G, JadeCovenant 2123G/28, maintain 109G, ScholarKingdoms 649G/13 | 0.13 |
| Bramble Feast | Food | 2 | 20.50 | 2.4% | 0.0% | 2.4% | 0.00 | 1.00 | JadeCovenant 35T, AetherianVanguard 6T | JadeCovenant 1765G/25, maintain 1765G, AetherianVanguard 649G/13 | 0.00 |
| Dawnharvest | Food | 4 | 49.00 | 0.5% | 0.0% | 0.5% | 0.51 | 1.25 | ForgeClans 71T, StarborneSeekers 52T, ScholarKingdoms 41T, AetherianVanguard 32T | ForgeClans 2189G/33, maintain 352G, StarborneSeekers 1509G/27, ScholarKingdoms 487G/12, maintain 352G, AetherianVanguard 177G/5 | 0.25 |
| Evergrain Vale | Food | 2 | 203.00 | 1.0% | 0.0% | 1.0% | 0.00 | 1.00 | JadeCovenant 212T, ForgeClans 194T | RiverLeague 11616G/45, ScholarKingdoms 8541G/44, JadeCovenant 3517G/33, maintain 3517G, AetherianVanguard 2014G/24, ForgeClans 1278G/25, maintain 259G | 0.00 |
| Fernsong | Food | 1 | 256.00 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | StarborneSeekers 256T | ForgeClans 3132G/29, StarborneSeekers 2508G/29, maintain 2508G, ScholarKingdoms 1251G/19 | 0.00 |
| Hearthbloom | Food | 1 | 91.00 | 1.1% | 0.0% | 1.1% | 0.00 | 1.00 | JadeCovenant 91T | JadeCovenant 2300G/28, maintain 2300G, AetherianVanguard 1521G/21 | 0.00 |
| Moonmeadow | Food | 1 | 161.00 | 0.0% | 0.0% | 0.0% | 0.62 | 2.00 | JadeCovenant 160T, StarborneSeekers 1T | StarborneSeekers 4775G/34, ForgeClans 1837G/23, RiverLeague 1837G/23, JadeCovenant 1346G/22, maintain 1316G, ScholarKingdoms 1251G/19 | 1.00 |
| Nectarwind | Food | 2 | 104.50 | 2.9% | 0.0% | 2.9% | 0.00 | 1.00 | JadeCovenant 137T, RiverLeague 72T | JadeCovenant 3822G/34, maintain 3822G, ForgeClans 731G/14, RiverLeague 521G/13, maintain 521G, StarborneSeekers 136G/4 | 0.00 |
| Rainpetal Court | Food | 4 | 46.00 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | AetherianVanguard 108T, StarborneSeekers 49T, RiverLeague 27T | AetherianVanguard 877G/21, maintain 877G, JadeCovenant 322G/8, StarborneSeekers 270G/7, ForgeClans 30G/1 | 0.00 |
| Silverbarley | Food | 1 | 206.00 | 1.5% | 0.0% | 1.5% | 0.97 | 2.00 | JadeCovenant 185T, AetherianVanguard 21T | JadeCovenant 2641G/29, maintain 1973G, RiverLeague 1521G/21, AetherianVanguard 1251G/19, ForgeClans 1019G/17 | 2.00 |
| Sunseed Haven | Food | 3 | 133.67 | 1.5% | 0.0% | 1.5% | 0.25 | 1.33 | JadeCovenant 312T, ScholarKingdoms 46T, ForgeClans 43T | AetherianVanguard 5186G/35, ForgeClans 4425G/50, JadeCovenant 4424G/51, maintain 4424G, StarborneSeekers 2633G/27, ScholarKingdoms 1477G/23, maintain 1447G, RiverLeague 503G/11 | 0.33 |
| Thistleheart | Food | 5 | 73.40 | 0.8% | 0.0% | 0.8% | 0.27 | 1.20 | JadeCovenant 300T, AetherianVanguard 46T, ScholarKingdoms 21T | JadeCovenant 3775G/53, maintain 3044G, StarborneSeekers 1689G/29, ScholarKingdoms 476G/11, maintain 109G, ForgeClans 408G/10 | 0.20 |
| Verdant Myth | Food | 1 | 38.00 | 2.6% | 0.0% | 2.6% | 0.00 | 1.00 | AetherianVanguard 38T | ForgeClans 1381G/20, AetherianVanguard 404G/11, maintain 404G | 0.00 |
| Wildroot Sanctum | Food | 4 | 123.00 | 0.4% | 0.0% | 0.4% | 1.22 | 1.00 | JadeCovenant 470T, RiverLeague 22T | JadeCovenant 5149G/57, maintain 5051G, ForgeClans 1837G/23, ScholarKingdoms 98G/3 | 1.50 |
| Aureate Crown | Gold | 3 | 93.67 | 1.8% | 0.0% | 1.8% | 0.71 | 1.33 | JadeCovenant 181T, RiverLeague 100T | JadeCovenant 14704G/79, maintain 6772G, RiverLeague 4083G/48, maintain 688G, ForgeClans 1354G/26, ScholarKingdoms 916G/16 | 0.67 |
| Auric Bazaar | Gold | 1 | 17.00 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | ForgeClans 17T | None | 0.00 |
| Brassmoon Mint | Gold | 3 | 85.33 | 8.6% | 0.0% | 8.6% | 0.39 | 1.33 | ForgeClans 159T, RiverLeague 68T, JadeCovenant 29T | JadeCovenant 1850G/27, ForgeClans 1803G/25, maintain 1612G, AetherianVanguard 573G/12, RiverLeague 304G/9, maintain 304G | 0.33 |
| Coinfire Crossing | Gold | 1 | 161.00 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | JadeCovenant 161T | None | 0.00 |
| Crownmarket | Gold | 4 | 151.00 | 1.2% | 0.0% | 1.2% | 0.50 | 1.75 | RiverLeague 218T, ForgeClans 199T, JadeCovenant 138T, StarborneSeekers 49T | JadeCovenant 11395G/96, maintain 1222G, ForgeClans 3168G/43, maintain 1521G, StarborneSeekers 1593G/28, maintain 1219G, RiverLeague 1477G/23, maintain 1447G, AetherianVanguard 843G/19 | 0.75 |
| Embermint | Gold | 5 | 81.20 | 0.7% | 0.0% | 0.7% | 0.49 | 1.20 | AetherianVanguard 251T, JadeCovenant 87T, ScholarKingdoms 44T, RiverLeague 24T | JadeCovenant 3573G/50, maintain 178G, AetherianVanguard 2941G/50, maintain 2719G, ScholarKingdoms 1725G/32, maintain 557G, RiverLeague 1477G/21, maintain 178G, StarborneSeekers 63G/2 | 0.40 |
| Gildenspire | Gold | 3 | 125.00 | 6.1% | 0.0% | 6.1% | 0.80 | 1.67 | JadeCovenant 331T, AetherianVanguard 40T, ForgeClans 4T | JadeCovenant 6377G/72, maintain 5208G, ForgeClans 3892G/45, AetherianVanguard 2637G/39, maintain 800G, RiverLeague 1019G/17, ScholarKingdoms 378G/9 | 1.00 |
| Golden Mirage | Gold | 5 | 79.00 | 0.5% | 0.0% | 0.5% | 0.25 | 1.20 | AetherianVanguard 234T, RiverLeague 139T, StarborneSeekers 13T, ForgeClans 9T | AetherianVanguard 4602G/62, maintain 2508G, RiverLeague 2859G/45, maintain 2719G, StarborneSeekers 1459G/23, maintain 78G, JadeCovenant 438G/10, ScholarKingdoms 98G/3 | 0.20 |
| Kingsmerch | Gold | 3 | 80.33 | 0.4% | 0.0% | 0.4% | 0.00 | 1.00 | AetherianVanguard 111T, ScholarKingdoms 86T, ForgeClans 44T | RiverLeague 2206G/39, JadeCovenant 1251G/19, ScholarKingdoms 1003G/19, maintain 1003G, ForgeClans 907G/18, maintain 907G, AetherianVanguard 404G/11, maintain 404G, StarborneSeekers 322G/8 | 0.00 |
| Opaline Vault | Gold | 4 | 122.75 | 1.0% | 0.0% | 1.0% | 0.41 | 1.50 | JadeCovenant 155T, AetherianVanguard 129T, ScholarKingdoms 92T, ForgeClans 67T, RiverLeague 48T | JadeCovenant 6546G/58, maintain 217G, ForgeClans 2988G/35, maintain 1471G, RiverLeague 1160G/20, maintain 890G, ScholarKingdoms 1108G/18, maintain 89G, AetherianVanguard 581G/14, maintain 78G, StarborneSeekers 98G/3 | 0.50 |
| Radiant Hoard | Gold | 1 | 8.00 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | AetherianVanguard 8T | None | 0.00 |
| Saffron Treasury | Gold | 2 | 75.00 | 1.3% | 0.0% | 1.3% | 0.00 | 1.00 | AetherianVanguard 106T, ForgeClans 44T | AetherianVanguard 2108G/27, maintain 2108G, StarborneSeekers 1251G/19, JadeCovenant 270G/7 | 0.00 |
| Starcoin Port | Gold | 1 | 147.00 | 0.7% | 0.0% | 0.7% | 0.00 | 1.00 | JadeCovenant 147T | JadeCovenant 2300G/28, maintain 2300G, RiverLeague 1673G/22, ForgeClans 731G/14, ScholarKingdoms 378G/9 | 0.00 |
| Suncoin Citadel | Gold | 5 | 136.40 | 0.9% | 0.0% | 0.9% | 0.00 | 1.00 | StarborneSeekers 437T, JadeCovenant 228T, AetherianVanguard 17T | RiverLeague 8833G/63, StarborneSeekers 6028G/64, maintain 5930G, ForgeClans 2633G/27, AetherianVanguard 304G/9, maintain 304G | 0.00 |
| Velvet Ledger | Gold | 3 | 79.33 | 5.0% | 0.0% | 5.0% | 0.42 | 1.33 | JadeCovenant 113T, ScholarKingdoms 95T, StarborneSeekers 30T | StarborneSeekers 5760G/45, maintain 1003G, ScholarKingdoms 3118G/31, maintain 2387G, JadeCovenant 2732G/30, maintain 2732G, ForgeClans 2411G/26, AetherianVanguard 1837G/23 | 0.33 |
| Ashen Bellows | Production | 5 | 113.20 | 0.2% | 0.0% | 0.2% | 0.00 | 1.00 | JadeCovenant 440T, AetherianVanguard 85T, ForgeClans 41T | StarborneSeekers 4887G/52, JadeCovenant 3999G/39, maintain 3822G, ForgeClans 1224G/26, maintain 404G, AetherianVanguard 1083G/24, maintain 352G, RiverLeague 1019G/17, ScholarKingdoms 573G/12 | 0.00 |
| Blackglass Armory | Production | 3 | 50.33 | 4.0% | 0.0% | 4.0% | 0.66 | 1.33 | StarborneSeekers 64T, ForgeClans 52T, AetherianVanguard 35T | StarborneSeekers 2508G/29, maintain 2508G, AetherianVanguard 1838G/33, maintain 587G, ForgeClans 1346G/22, maintain 1316G, JadeCovenant 820G/15, RiverLeague 573G/12 | 0.33 |
| Brasshollow | Production | 1 | 75.00 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | ForgeClans 75T | ForgeClans 3235G/32, maintain 3235G, StarborneSeekers 438G/10, RiverLeague 177G/5 | 0.00 |
| Cinderhold | Production | 1 | 120.00 | 0.8% | 0.0% | 0.8% | 0.00 | 1.00 | AetherianVanguard 120T | JadeCovenant 2014G/24, AetherianVanguard 1471G/23, maintain 1471G, StarborneSeekers 731G/14 | 0.00 |
| Emberforge Bastion | Production | 2 | 82.50 | 0.6% | 0.0% | 0.6% | 0.00 | 1.00 | JadeCovenant 100T, AetherianVanguard 65T | JadeCovenant 2108G/27, maintain 2108G, ScholarKingdoms 1251G/19, ForgeClans 1019G/17 | 0.00 |
| Flintspire Works | Production | 5 | 88.60 | 1.6% | 0.0% | 1.6% | 0.23 | 1.20 | JadeCovenant 206T, ScholarKingdoms 111T, RiverLeague 100T, AetherianVanguard 26T | JadeCovenant 4366G/50, maintain 3235G, ScholarKingdoms 3133G/45, maintain 1612G, ForgeClans 2509G/29, RiverLeague 2202G/37, maintain 1471G, AetherianVanguard 1936G/26, maintain 1906G, StarborneSeekers 1837G/23 | 0.20 |
| Gearstorm Hold | Production | 2 | 55.50 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | ForgeClans 69T, JadeCovenant 42T | None | 0.00 |
| Hammerdeep | Production | 4 | 117.00 | 1.5% | 0.0% | 1.5% | 0.00 | 1.00 | ScholarKingdoms 236T, ForgeClans 160T, RiverLeague 72T | StarborneSeekers 7802G/54, ForgeClans 7621G/68, maintain 1511G, RiverLeague 5973G/72, maintain 109G, AetherianVanguard 2657G/38, JadeCovenant 1521G/21, ScholarKingdoms 217G/7, maintain 217G | 0.00 |
| Ironwyrm Foundry | Production | 4 | 75.50 | 0.7% | 0.0% | 0.7% | 0.00 | 1.00 | ForgeClans 253T, ScholarKingdoms 32T, AetherianVanguard 17T | ForgeClans 2300G/28, maintain 2300G, StarborneSeekers 1673G/22, AetherianVanguard 735G/16, maintain 735G, RiverLeague 503G/11 | 0.00 |
| Molten Crown | Production | 4 | 67.50 | 0.7% | 0.0% | 0.7% | 2.22 | 1.25 | ForgeClans 155T, AetherianVanguard 83T, JadeCovenant 28T, StarborneSeekers 4T | RiverLeague 2873G/28, ForgeClans 1471G/23, maintain 1471G, AetherianVanguard 304G/9, maintain 67G, JadeCovenant 217G/7, maintain 217G, StarborneSeekers 129G/4, maintain 26G | 1.50 |
| Obsidian Kiln | Production | 5 | 99.20 | 0.6% | 0.0% | 0.6% | 0.81 | 1.20 | ForgeClans 259T, RiverLeague 165T, AetherianVanguard 70T, JadeCovenant 2T | JadeCovenant 8059G/63, ForgeClans 5276G/62, maintain 3517G, AetherianVanguard 5057G/61, maintain 404G, RiverLeague 2987G/31, maintain 2924G, StarborneSeekers 1689G/29 | 0.80 |
| Runehammer Gate | Production | 1 | 8.00 | 12.5% | 0.0% | 12.5% | 0.00 | 1.00 | RiverLeague 8T | AetherianVanguard 322G/8, RiverLeague 259G/8, maintain 259G | 0.00 |
| Skyfurnace | Production | 1 | 82.00 | 0.0% | 0.0% | 0.0% | 1.22 | 2.00 | ForgeClans 82T | ForgeClans 30G/1, JadeCovenant 30G/1 | 1.00 |
| Stonewake Crucible | Production | 2 | 43.00 | 0.0% | 0.0% | 0.0% | 0.00 | 1.00 | JadeCovenant 86T | ScholarKingdoms 731G/14, JadeCovenant 521G/13, maintain 521G, ForgeClans 136G/4 | 0.00 |
| Thunder Anvil | Production | 3 | 119.67 | 0.6% | 0.0% | 0.6% | 0.00 | 1.00 | ForgeClans 275T, AetherianVanguard 53T, RiverLeague 31T | RiverLeague 12069G/66, maintain 1340G, ForgeClans 3455G/53, maintain 1612G, JadeCovenant 1689G/29, AetherianVanguard 460G/12, maintain 460G | 0.00 |
| Aetherquill | Science | 3 | 96.00 | 4.2% | 0.0% | 4.2% | 13.19 | 1.33 | AetherianVanguard 122T, JadeCovenant 112T, ScholarKingdoms 52T, StarborneSeekers 2T | StarborneSeekers 3003G/42, maintain 156G, JadeCovenant 2204G/26, maintain 823G, ScholarKingdoms 1478G/30, maintain 658G | 12.67 |
| Arcstar Repository | Science | 3 | 73.00 | 0.9% | 0.0% | 0.9% | 0.00 | 1.00 | ScholarKingdoms 148T, JadeCovenant 71T | JadeCovenant 5646G/47, maintain 460G, RiverLeague 2014G/24, ScholarKingdoms 1003G/19, maintain 1003G, AetherianVanguard 649G/13, ForgeClans 63G/2 | 0.00 |
| Celestine Scriptorium | Science | 2 | 86.00 | 5.8% | 0.0% | 5.8% | 0.00 | 1.00 | ForgeClans 97T, AetherianVanguard 75T | ForgeClans 3412G/37, maintain 3235G, AetherianVanguard 2946G/39, maintain 2508G, StarborneSeekers 916G/16 | 0.00 |
| Dreaming Calculus | Science | 1 | 125.00 | 0.8% | 0.0% | 0.8% | 0.00 | 1.00 | StarborneSeekers 125T | RiverLeague 2014G/24, StarborneSeekers 1340G/22, maintain 1340G | 0.00 |
| Eclipsed Theorem | Science | 4 | 58.25 | 0.4% | 0.0% | 0.4% | 0.00 | 1.00 | ScholarKingdoms 191T, ForgeClans 38T, StarborneSeekers 4T | JadeCovenant 7791G/40, AetherianVanguard 3132G/29, ScholarKingdoms 1692G/32, maintain 1692G | 0.00 |
| Halcyon Loom | Science | 2 | 109.50 | 2.3% | 0.0% | 2.3% | 0.46 | 1.50 | AetherianVanguard 202T, JadeCovenant 17T | JadeCovenant 5146G/53, AetherianVanguard 2222G/40, maintain 2222G, RiverLeague 649G/13, ForgeClans 573G/12, StarborneSeekers 378G/9 | 0.50 |
| Lunarchive | Science | 4 | 68.00 | 2.6% | 0.0% | 2.6% | 0.00 | 1.00 | RiverLeague 138T, StarborneSeekers 123T, JadeCovenant 11T | JadeCovenant 3412G/30, RiverLeague 3390G/45, maintain 3390G, ForgeClans 2341G/36, StarborneSeekers 1003G/19, maintain 1003G, ScholarKingdoms 820G/15 | 0.00 |
| Meridian of Runes | Science | 2 | 109.00 | 0.5% | 0.0% | 0.5% | 0.00 | 1.00 | JadeCovenant 133T, AetherianVanguard 85T | AetherianVanguard 2314G/29, maintain 109G, JadeCovenant 1471G/23, maintain 1471G, StarborneSeekers 177G/5 | 0.00 |
| Nyx Codex | Science | 2 | 48.50 | 0.0% | 0.0% | 0.0% | 1.03 | 1.50 | ScholarKingdoms 62T, ForgeClans 34T, JadeCovenant 1T | JadeCovenant 2633G/27, ScholarKingdoms 1936G/26, maintain 1906G, ForgeClans 658G/15, maintain 658G, AetherianVanguard 573G/12 | 0.50 |
| Observatory of Whispers | Science | 5 | 131.00 | 0.9% | 0.0% | 0.9% | 3.05 | 1.60 | RiverLeague 234T, JadeCovenant 170T, ForgeClans 126T, AetherianVanguard 100T, ScholarKingdoms 25T | JadeCovenant 7987G/89, maintain 3445G, RiverLeague 5237G/50, maintain 4506G, ForgeClans 5081G/37, maintain 4127G, AetherianVanguard 3140G/38, maintain 688G, ScholarKingdoms 2755G/40, maintain 31G | 4.00 |
| Prism Oracle | Science | 1 | 124.00 | 0.0% | 0.0% | 0.0% | 0.81 | 2.00 | ScholarKingdoms 109T, StarborneSeekers 15T | StarborneSeekers 2873G/28, ScholarKingdoms 1771G/25, maintain 1741G | 1.00 |
| Quillspire | Science | 5 | 105.00 | 2.1% | 0.0% | 2.1% | 0.19 | 1.20 | RiverLeague 245T, StarborneSeekers 237T, AetherianVanguard 34T, ForgeClans 9T | ForgeClans 8359G/72, maintain 78G, RiverLeague 6091G/59, maintain 4455G, JadeCovenant 3412G/30, StarborneSeekers 2815G/31, maintain 2515G, ScholarKingdoms 1521G/21, AetherianVanguard 142G/5, maintain 142G | 0.20 |
| Radiant Lexicon | Science | 3 | 176.33 | 2.5% | 0.0% | 2.5% | 0.00 | 1.00 | RiverLeague 235T, JadeCovenant 157T, ForgeClans 137T | ScholarKingdoms 7011G/56, RiverLeague 4151G/35, maintain 4151G, JadeCovenant 2300G/28, maintain 2300G, ForgeClans 1131G/18 | 0.00 |
| Sapphire Mnemos | Science | 2 | 50.50 | 1.0% | 0.0% | 1.0% | 0.99 | 1.50 | ForgeClans 45T, JadeCovenant 34T, AetherianVanguard 22T | JadeCovenant 916G/16, AetherianVanguard 707G/15, maintain 460G | 0.50 |
| Voidlight Archive | Science | 4 | 143.75 | 0.7% | 0.0% | 0.7% | 0.35 | 1.50 | ForgeClans 233T, JadeCovenant 213T, AetherianVanguard 91T, StarborneSeekers 38T | JadeCovenant 9919G/85, maintain 4104G, AetherianVanguard 3851G/47, maintain 109G, ForgeClans 3333G/48, maintain 2508G, StarborneSeekers 634G/13, maintain 61G | 0.50 |

## Notes
- "Maintenance Gold" counts investment spend that occurred while the investor was the incumbent suzerain for that city-state.
- "No Suz Share" counts turns where the city-state had no suzerain.
- "Close-Race Share" counts turns where a suzerain existed but first/second influence were within the contest margin.
- "Flip Rate /100T" is suzerain changes per 100 active turns.
- Correlations are participant-level across telemetry simulations and should be treated as directional, not causal.

