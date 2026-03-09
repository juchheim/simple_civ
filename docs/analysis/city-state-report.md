# City-State Simulation Report

Generated: 2026-03-09T19:50:10.925Z

## Data Coverage
- Simulations processed: 100
- Simulations with city-state telemetry: 100
- Simulations missing city-state telemetry: 0
- Total city-states created: 390
- Total city-state active turns: 52607
- Total contested turns: 443 (No Suz: 2, Close-race: 441)
- Total turnover-window turns: 29231
- Total flip-window turns: 28219
- Total safe-lead incumbent turns: 26286
- Total hotspot turns: 574
- Contest telemetry coverage (city-state entries): 390 with split fields, 0 legacy-only
- Global suzerain flip rate: 0.40 per 100 active turns
- True ownership turnover rate: 0.40 per 100 active turns
- Average unique suzerains per city-state: 1.24
- Average city-states created per telemetry simulation: 3.90
- Average surviving city-states at game end (telemetry sims): 3.86



## Creation Timing
- Simulations with at least one city-state created: 86/100 (86.0%)
- First city-state creation turn (min / p25 / median / p75 / max): 70 / 99 / 127 / 164 / 381
- First city-state creation turn (average, sims with any): 139.9

## Map-Size Creation Rates
| Map | Sims | Telemetry Sims | Sims with >=1 CS | Share with >=1 CS | Total Created | Avg Created / Telemetry Sim | Avg First CS Turn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tiny | 20 | 20 | 12 | 60.0% | 19 | 0.95 | 166.8 |
| Small | 20 | 20 | 14 | 70.0% | 33 | 1.65 | 146.6 |
| Standard | 20 | 20 | 20 | 100.0% | 67 | 3.35 | 116.5 |
| Large | 20 | 20 | 20 | 100.0% | 124 | 6.20 | 131.7 |
| Huge | 20 | 20 | 20 | 100.0% | 147 | 7.35 | 150.8 |

## Camp-Clearing Activation Funnel
- Camp-clearing episodes observed: 4852
- Direct starts in Ready: 1870 (38.5%)
- Episodes that reached Ready: 2814 (58.0%)
- Episodes with sighting telemetry: 2612 (53.8%)
- Sighted -> prep start (avg / median): 117.23 / 93 turns
- Prep start -> first Ready (avg / median): 2.71 / 0 turns
- Prep start -> self clear (avg / median): 14.51 / 9 turns
- Total prep duration (avg / median): 7.36 / 0 turns
- Timeouts after reaching Ready: 136 (17.3% of timeouts)
- Ready turn diagnostics: no contact 5778, adjacent contact 850, attack opportunity 2737, stalled opportunity 1512, power disadvantage 1856, progress 1608
- Ready-timeout primary breakdown: no contact 86, declined attack 34, power collapse 16, other 0
- War-interrupted episodes: 1578 (32.5%)
- Cleared-by-other breakdown: lacked military 43, late start 85, other 36
- Initial prep state mix: Buildup 1228, Gathering 62, Positioning 1692, Ready 1870

### Camp Outcomes
| Outcome | Episodes | Share |
| --- | --- | --- |
| ClearedBySelf | 371 | 7.6% |
| ClearedByOther | 164 | 3.4% |
| TimedOut | 787 | 16.2% |
| WartimeEmergencyCancelled | 1578 | 32.5% |
| OtherCancelled | 1900 | 39.2% |
| StillActive | 52 | 1.1% |

### Camp Funnel By Readiness
| Readiness | Episodes | Self Clears | Self Clear Rate | Timeouts | Timeout Rate | Avg Prep Turns | Avg Prep->Ready | Reached Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PreArmy | 1064 | 6 | 0.6% | 417 | 39.2% | 9.03 | 8.38 | 18.7% |
| ArmyTech | 2133 | 114 | 5.3% | 241 | 11.3% | 6.79 | 1.93 | 79.7% |
| ArmyFielded | 1655 | 251 | 15.2% | 129 | 7.8% | 7.01 | 2.93 | 55.2% |

### Slowest Prep Episodes
| Map | Seed | Civ | Outcome | Readiness | Initial State | Sighted->Prep | Total Prep | Prep->Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Large | 306006 | ScholarKingdoms | StillActive | ArmyTech | Buildup | 175 | 219T | n/a |
| Huge | 412012 | JadeCovenant | ClearedByOther | ArmyTech | Buildup | 180 | 202T | n/a |
| Large | 315015 | StarborneSeekers | ClearedByOther | ArmyTech | Positioning | 142 | 156T | n/a |
| Small | 116016 | JadeCovenant | OtherCancelled | ArmyTech | Positioning | n/a | 152T | 8 |
| Huge | 401001 | ForgeClans | StillActive | ArmyTech | Buildup | n/a | 126T | n/a |
| Standard | 214014 | ScholarKingdoms | ClearedBySelf | ArmyTech | Positioning | n/a | 105T | 22 |
| Large | 308008 | RiverLeague | ClearedByOther | PreArmy | Buildup | n/a | 104T | n/a |
| Large | 318018 | JadeCovenant | ClearedBySelf | PreArmy | Buildup | n/a | 102T | 15 |
| Small | 106006 | ForgeClans | ClearedBySelf | PreArmy | Buildup | n/a | 96T | 5 |
| Huge | 405005 | JadeCovenant | StillActive | ArmyFielded | Positioning | 136 | 89T | 4 |

## Suzerainty vs Winning
- Winner average suzerain turns: 169.61
- Non-winner average suzerain turns: 112.81
- Winner average city-state investment: 3982.1G
- Non-winner average city-state investment: 2617.1G
- Winners with any suzerainty: 60/92 (65.2%)
- Winners with any city-state investment: 66/92 (71.7%)
- Participant win rate with any suzerainty: 24.9%
- Participant win rate without suzerainty: 17.9%
- Participant win rate with any city-state investment: 21.6%
- Correlation (suzerain turns -> win flag): 0.134
- Correlation (city-state gold invested -> win flag): 0.149
- Winner share of sim-wide suzerain turns (when any suzerainty existed): 42.4%

## Investment Mix
- Total city-state investment: 1224765G across 16305 actions
- Maintenance investment: 248782G (20.3%) across 6716 actions (41.2%)
- Challenger investment: 975983G (79.7%) across 9589 actions (58.8%)
- Maintenance gold per suzerain turn: 4.73
- Maintenance actions per 100 suzerain turns: 12.77

## Turnover Diagnostics
- Turnover-window challenger investment: 945423G across 9073 actions
- Flip-window challenger investment: 931062G across 8919 actions
- Deep-challenge investment: 30495G across 514 actions
- Neutral-claim investment: 65G across 2 actions
- Passive contestation pulses: 16108
- Passive contestation close-race pulses: 12535
- Passive openings observed: 0
- Passive openings with treasury to invest: 0 (0.0%)
- Passive openings with reserve-safe invest: 0 (0.0%)
- Passive openings avg nominated turn-order delay: 0.00 turns
- Passive openings attempted by nominated challenger: 0 (0.0%)
- Passive openings avg delay to first nominated attempt: 0.00 turns
- Passive openings resolved before expiry: 0 (0.0%)
- Passive openings won by nominated challenger: 0 (0.0%; 0.0% of resolved)
- Passive openings lost to someone else: 0
- Passive openings expired unresolved: 0
- Passive opening resolutions by cause: None
- Passive opening nominated wins by cause: None
- Passive openings with no nominated attempt: 0 (0.0%)
- No-attempt reasons: treasury blocked 0, reserve blocked 0, no-attempt despite capacity 0
- Passive direct flip conversion per 100 close-race pulses: 0.00
- Passive-assisted suzerainty changes: 70 (32.9% of non-passive changes)
- Passive-assisted true ownership turnovers: 66 (31.6% of ownership turnover)
- Passive-assisted ownership conversion per 100 close-race pulses: 0.53
- Passive-involved ownership conversion per 100 close-race pulses: 0.53
- Passive-assisted ownership causes: WartimeRelease 66
- Pair-fatigue-triggered investment: 38193G across 479 actions
- Pair-fatigue share of challenger spend: 3.9%
- Safe-maintenance investment: 39G across 1 actions
- Focus turns: 37315 (challenge 30434, maintenance 6881)
- Focus assignments: 705, focus switches: 93
- Flip conversion per 100 turnover-window turns: 0.73
- True ownership conversion per 100 turnover-window turns: 0.71
- Flip conversion per 100 challenge-focus turns: 0.70
- Safe-maintenance share of maintenance spend: 0.0%

## Flip Cause Summary
| Cause | Suzerainty Changes | True Ownership Turnovers | State Change Share | Ownership Share |
| --- | --- | --- | --- | --- |
| Investment | 105 | 103 | 49.3% | 49.3% |
| PassiveContestation | 0 | 0 | 0.0% | 0.0% |
| WartimeRelease | 69 | 67 | 32.4% | 32.1% |
| WarBreak | 0 | 0 | 0.0% | 0.0% |
| Other | 39 | 39 | 18.3% | 18.7% |

## Hotspot Diagnostics
- Hotspot turn share of active turns: 1.1%
- City-state instances with any hotspot time: 17/390
- True ownership turnovers occurring in hotspot instances: 123 / 209

## Hotspot Instances
| Map | Seed | City-State | Yield | Created | Active | Hotspot | Hotspot Share | Ownership Turnovers | Suz Changes | Turnover Pair | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Standard | 218018 | Evergrain Vale | Food | 97 | 305T | 59T | 19.3% | 15 | 15 | RiverLeague <> ScholarKingdoms 15 | Other 7, Investment 6, WartimeRelease 2 |
| Huge | 412012 | Stonewake Crucible | Production | 292 | 143T | 45T | 31.5% | 13 | 13 | AetherianVanguard <> ScholarKingdoms 13 | Other 8, Investment 5 |
| Huge | 412012 | Flintspire Works | Production | 156 | 278T | 101T | 36.3% | 12 | 12 | AetherianVanguard <> ForgeClans 12 | Investment 10, Other 1, WartimeRelease 1 |
| Standard | 218018 | Quillspire | Science | 172 | 229T | 51T | 22.3% | 12 | 12 | StarborneSeekers <> ForgeClans 12 | Investment 9, Other 3 |
| Large | 309009 | Voidlight Archive | Science | 216 | 90T | 58T | 64.4% | 10 | 10 | ForgeClans <> StarborneSeekers 10 | Investment 10 |
| Standard | 218018 | Starcoin Port | Gold | 156 | 245T | 49T | 20.0% | 9 | 9 | StarborneSeekers <> RiverLeague 9 | Investment 7, Other 2 |
| Huge | 406006 | Wildroot Sanctum | Food | 108 | 322T | 34T | 10.6% | 9 | 9 | JadeCovenant <> RiverLeague 9 | Investment 7, Other 1, WartimeRelease 1 |
| Huge | 410010 | Sunseed Haven | Food | 115 | 335T | 36T | 10.7% | 8 | 8 | JadeCovenant <> ForgeClans 7, StarborneSeekers <> JadeCovenant 1 | Investment 7, WartimeRelease 1 |
| Huge | 403003 | Brassmoon Mint | Gold | 136 | 221T | 19T | 8.6% | 5 | 5 | JadeCovenant <> ForgeClans 4, StarborneSeekers <> JadeCovenant 1 | Investment 2, Other 2, WartimeRelease 1 |
| Huge | 419019 | Gildenspire | Gold | 173 | 175T | 18T | 10.3% | 5 | 5 | StarborneSeekers <> AetherianVanguard 5 | Investment 4, WartimeRelease 1 |
| Large | 314014 | Prism Oracle | Science | 134 | 285T | 18T | 6.3% | 4 | 4 | JadeCovenant <> StarborneSeekers 4 | Investment 4 |
| Standard | 203003 | Eclipsed Theorem | Science | 137 | 117T | 18T | 15.4% | 4 | 4 | JadeCovenant <> ForgeClans 4 | Investment 4 |
| Standard | 209009 | Runehammer Gate | Production | 133 | 159T | 18T | 11.3% | 4 | 4 | AetherianVanguard <> ScholarKingdoms 4 | Investment 4 |
| Standard | 208008 | Aetherquill | Science | 84 | 215T | 16T | 7.4% | 4 | 4 | AetherianVanguard <> JadeCovenant 4 | Investment 3, WartimeRelease 1 |
| Large | 318018 | Dreaming Calculus | Science | 362 | 18T | 2T | 11.1% | 4 | 4 | StarborneSeekers <> ForgeClans 4 | Investment 3, Other 1 |
| Large | 309009 | Emberforge Bastion | Production | 285 | 21T | 16T | 76.2% | 3 | 3 | ForgeClans <> JadeCovenant 3 | Other 2, Investment 1 |

## Hotspot City Names (Cross-Sim Aggregate)
| City-State | Yield | Avg Hotspot Turns | Hotspot Share | Avg Ownership Turnovers | Avg Suz Changes | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- |
| Evergrain Vale | Food | 9.8T | 4.6% | 2.67 | 2.67 | Other 7, Investment 6, WartimeRelease 3 |
| Quillspire | Science | 7.3T | 4.9% | 2.14 | 2.14 | Investment 10, Other 3, WartimeRelease 2 |
| Voidlight Archive | Science | 7.3T | 5.3% | 1.75 | 1.75 | Investment 11, Other 2, WartimeRelease 1 |
| Stonewake Crucible | Production | 9.0T | 9.8% | 2.80 | 2.80 | Other 8, Investment 5, WartimeRelease 1 |
| Flintspire Works | Production | 16.8T | 10.6% | 2.00 | 2.00 | Investment 10, Other 1, WartimeRelease 1 |
| Sunseed Haven | Food | 5.8T | 4.8% | 1.22 | 1.44 | Investment 9, WartimeRelease 2 |
| Wildroot Sanctum | Food | 4.3T | 2.1% | 1.38 | 1.38 | Investment 7, Other 2, WartimeRelease 2 |
| Starcoin Port | Gold | 7.0T | 6.2% | 1.43 | 1.43 | Investment 8, Other 2 |
| Brassmoon Mint | Gold | 1.9T | 1.5% | 0.70 | 0.70 | Other 3, Investment 2, WartimeRelease 2 |
| Gildenspire | Gold | 2.6T | 1.6% | 1.00 | 1.00 | Investment 4, WartimeRelease 3 |
| Eclipsed Theorem | Science | 3.6T | 3.1% | 1.00 | 1.00 | Investment 4, WartimeRelease 1 |
| Prism Oracle | Science | 2.6T | 1.4% | 0.71 | 0.71 | Investment 4, WartimeRelease 1 |

## Civ Performance
| Civ | Games | Wins | Win% | Avg Suz Turns | Avg Invested Gold | Avg Maintenance Gold | Avg Invest Actions | Win% (Suz>0) | Win% (Suz=0) | Top Suz Claims |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 74 | 22 | 29.7% | 144.22 | 2635.6 | 602.8 | 37.88 | 31.1% | 27.6% | 77 |
| ScholarKingdoms | 70 | 10 | 14.3% | 110.73 | 1888.4 | 442.3 | 30.91 | 23.1% | 3.2% | 63 |
| RiverLeague | 70 | 9 | 12.9% | 138.14 | 3282.4 | 644.8 | 43.19 | 10.8% | 15.2% | 62 |
| AetherianVanguard | 71 | 21 | 29.6% | 98.13 | 2661.9 | 471.6 | 34.35 | 35.9% | 21.9% | 62 |
| StarborneSeekers | 68 | 20 | 29.4% | 132.68 | 3600.5 | 675.7 | 43.32 | 26.8% | 33.3% | 63 |
| JadeCovenant | 67 | 10 | 14.9% | 127.21 | 3491.7 | 726.1 | 43.73 | 20.0% | 7.4% | 61 |

## Turnover Pressure By Civ
| Civ | Avg Turnover Gold | Avg Deep Gold | Avg Neutral Gold | Avg Pair-Fatigue Gold | Avg Safe Maint Gold | Avg Focus Challenge T | Avg Focus Maint T | Focus Switches / Game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 1962.1 | 70.2 | 0.5 | 140.4 | 0.5 | 76.50 | 21.20 | 0.27 |
| ScholarKingdoms | 1378.6 | 67.5 | 0.0 | 25.7 | 0.0 | 71.81 | 14.69 | 0.27 |
| RiverLeague | 2608.7 | 28.9 | 0.0 | 57.1 | 0.0 | 76.17 | 14.10 | 0.17 |
| AetherianVanguard | 2103.8 | 86.5 | 0.0 | 154.7 | 0.0 | 61.08 | 11.69 | 0.11 |
| StarborneSeekers | 2865.4 | 59.0 | 0.4 | 112.3 | 0.0 | 83.19 | 15.19 | 0.28 |
| JadeCovenant | 2640.4 | 125.2 | 0.0 | 50.7 | 0.0 | 65.97 | 21.40 | 0.22 |

## Yield-Type Summary
| Yield | City-States | Avg Active Turns | Contested Turn Share | No Suz Share | Close-Race Share | Flip Rate /100T | Avg Unique Suz | Surviving | Removed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Science | 98 | 134.27 | 1.0% | 0.0% | 1.0% | 0.46 | 1.27 | 98 | 0 |
| Production | 99 | 137.03 | 0.6% | 0.0% | 0.6% | 0.35 | 1.17 | 98 | 1 |
| Food | 96 | 134.98 | 0.8% | 0.0% | 0.8% | 0.44 | 1.22 | 94 | 2 |
| Gold | 97 | 133.25 | 1.0% | 0.0% | 1.0% | 0.38 | 1.31 | 96 | 1 |

## Yield Turnover Windows
| Yield | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share |
| --- | --- | --- | --- | --- |
| Science | 58.9% | 56.8% | 47.7% | 1.2% |
| Production | 52.6% | 51.4% | 50.3% | 1.3% |
| Food | 52.5% | 50.5% | 52.8% | 1.1% |
| Gold | 58.4% | 55.8% | 49.1% | 0.7% |

## City-State Suzerainty Ledger
| City-State | Yield | Appearances | Avg Active Turns | Contested Share | No Suz Share | Close-Race Share | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share | Flip Rate /100T | Avg Unique Suz | Suzerain Turns by Civ | Focus Challenge by Civ | Focus Maintenance by Civ | Investment by Civ (Gold/Actions) | Avg Suz Changes | Avg Ownership Turnovers | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amber Orchard | Food | 6 | 137.83 | 0.8% | 0.0% | 0.8% | 61.2% | 58.9% | 45.8% | 0.0% | 0.36 | 1.50 | StarborneSeekers 362T, ForgeClans 189T, AetherianVanguard 158T, JadeCovenant 89T, RiverLeague 29T | JadeCovenant 107T, ScholarKingdoms 91T, RiverLeague 88T, ForgeClans 76T, StarborneSeekers 61T, AetherianVanguard 25T | JadeCovenant 71T, StarborneSeekers 68T, ForgeClans 54T, RiverLeague 7T, AetherianVanguard 1T | RiverLeague 9256G/46, maintain 109G, JadeCovenant 5512G/57, maintain 1582G, StarborneSeekers 4878G/90, maintain 2089G, ForgeClans 3268G/53, maintain 685G, AetherianVanguard 791G/18, maintain 142G, ScholarKingdoms 322G/8 | 0.50 | 0.50 | Other 2, WartimeRelease 1 |
| Bloomtide | Food | 10 | 110.00 | 0.5% | 0.0% | 0.5% | 30.8% | 30.2% | 71.3% | 0.0% | 0.18 | 1.10 | StarborneSeekers 303T, JadeCovenant 270T, ForgeClans 206T, ScholarKingdoms 139T, RiverLeague 115T, AetherianVanguard 67T | AetherianVanguard 22T, ForgeClans 15T | ScholarKingdoms 92T, RiverLeague 56T, JadeCovenant 25T | AetherianVanguard 3131G/51, ForgeClans 2769G/31, RiverLeague 2363G/56, maintain 1543G, StarborneSeekers 986G/28, maintain 956G, JadeCovenant 880G/24, maintain 880G, ScholarKingdoms 763G/21, maintain 763G | 0.20 | 0.20 | Investment 1, Other 1 |
| Bramble Feast | Food | 7 | 138.29 | 0.1% | 0.0% | 0.1% | 40.7% | 37.4% | 63.4% | 0.0% | 0.52 | 1.57 | JadeCovenant 274T, ScholarKingdoms 256T, StarborneSeekers 163T, RiverLeague 142T, ForgeClans 133T | ForgeClans 139T, AetherianVanguard 138T, StarborneSeekers 108T, ScholarKingdoms 19T, JadeCovenant 13T | JadeCovenant 47T, StarborneSeekers 10T | StarborneSeekers 6359G/54, maintain 178G, JadeCovenant 3770G/77, maintain 1706G, AetherianVanguard 1837G/23, ForgeClans 1750G/32, RiverLeague 649G/13, ScholarKingdoms 597G/13, maintain 24G | 0.71 | 0.71 | WartimeRelease 3, Other 2 |
| Dawnharvest | Food | 2 | 107.00 | 0.0% | 0.0% | 0.0% | 48.6% | 48.6% | 51.4% | 0.0% | 0.00 | 1.00 | RiverLeague 175T, ScholarKingdoms 39T | AetherianVanguard 104T | RiverLeague 25T | AetherianVanguard 4041G/32, RiverLeague 373G/11, maintain 373G | 0.00 | 0.00 | None |
| Evergrain Vale | Food | 6 | 214.17 | 1.9% | 0.0% | 1.9% | 63.0% | 57.4% | 55.3% | 4.6% | 1.25 | 1.33 | RiverLeague 377T, ScholarKingdoms 271T, ForgeClans 232T, StarborneSeekers 223T, JadeCovenant 147T, AetherianVanguard 35T | RiverLeague 480T, AetherianVanguard 153T, JadeCovenant 89T, StarborneSeekers 54T, ScholarKingdoms 16T | StarborneSeekers 25T, JadeCovenant 12T, ScholarKingdoms 5T, RiverLeague 2T | AetherianVanguard 9042G/66, RiverLeague 8562G/96, maintain 808G, JadeCovenant 3262G/61, maintain 880G, ScholarKingdoms 2463G/42, maintain 1006G, ForgeClans 1528G/41, maintain 1465G, StarborneSeekers 372G/10, maintain 50G | 2.67 | 2.67 | Other 7, Investment 6, WartimeRelease 3 |
| Fernsong | Food | 3 | 138.00 | 0.5% | 0.0% | 0.5% | 38.2% | 38.2% | 62.1% | 0.0% | 0.24 | 1.33 | RiverLeague 184T, AetherianVanguard 172T, ForgeClans 34T, StarborneSeekers 24T | ForgeClans 105T, ScholarKingdoms 58T, StarborneSeekers 33T | None | ForgeClans 5397G/60, maintain 973G, StarborneSeekers 2633G/27, ScholarKingdoms 1837G/23, JadeCovenant 1019G/17, RiverLeague 529G/15, maintain 529G | 0.33 | 0.33 | Investment 1 |
| Greenstar Hollow | Food | 5 | 105.20 | 1.0% | 0.0% | 1.0% | 63.5% | 62.7% | 38.2% | 0.0% | 0.00 | 1.00 | RiverLeague 245T, JadeCovenant 174T, ForgeClans 59T, ScholarKingdoms 48T | ScholarKingdoms 264T, ForgeClans 139T, StarborneSeekers 56T | RiverLeague 73T, ForgeClans 45T, ScholarKingdoms 25T | ScholarKingdoms 2843G/47, maintain 607G, RiverLeague 2713G/60, maintain 1582G, ForgeClans 2599G/55, maintain 1348G, StarborneSeekers 378G/9 | 0.00 | 0.00 | None |
| Hearthbloom | Food | 5 | 163.80 | 1.1% | 0.0% | 1.1% | 57.1% | 53.8% | 50.7% | 0.0% | 0.12 | 1.20 | ForgeClans 346T, ScholarKingdoms 324T, AetherianVanguard 149T | ScholarKingdoms 237T, JadeCovenant 128T | ScholarKingdoms 80T, ForgeClans 54T | JadeCovenant 13218G/75, ScholarKingdoms 4634G/86, maintain 2033G, StarborneSeekers 3132G/29, ForgeClans 2640G/60, maintain 1621G, AetherianVanguard 1275G/20, maintain 24G | 0.20 | 0.20 | WartimeRelease 1 |
| Moonmeadow | Food | 1 | 156.00 | 0.6% | 0.0% | 0.6% | 94.2% | 94.2% | 5.8% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 156T | RiverLeague 147T | ScholarKingdoms 53T | RiverLeague 3714G/31, ScholarKingdoms 1582G/42, maintain 1582G | 0.00 | 0.00 | None |
| Nectarwind | Food | 5 | 128.00 | 0.6% | 0.0% | 0.6% | 19.5% | 15.9% | 90.8% | 0.0% | 0.00 | 1.00 | ForgeClans 454T, StarborneSeekers 186T | AetherianVanguard 40T | StarborneSeekers 6T, ForgeClans 2T | AetherianVanguard 3268G/33, StarborneSeekers 793G/22, maintain 763G, ForgeClans 264G/9, maintain 128G, JadeCovenant 63G/2 | 0.00 | 0.00 | None |
| Rainpetal Court | Food | 12 | 106.08 | 0.4% | 0.0% | 0.4% | 67.8% | 67.6% | 33.6% | 0.0% | 0.00 | 1.00 | RiverLeague 399T, ScholarKingdoms 385T, JadeCovenant 218T, StarborneSeekers 171T, ForgeClans 100T | AetherianVanguard 294T, StarborneSeekers 188T, JadeCovenant 165T, ScholarKingdoms 124T, ForgeClans 70T, RiverLeague 42T | RiverLeague 97T, JadeCovenant 69T, StarborneSeekers 49T | JadeCovenant 13184G/136, maintain 1582G, RiverLeague 9218G/149, maintain 3164G, AetherianVanguard 7010G/91, StarborneSeekers 6535G/82, maintain 1760G, ForgeClans 1846G/36, maintain 178G, ScholarKingdoms 1489G/29, maintain 358G | 0.00 | 0.00 | None |
| Silverbarley | Food | 7 | 94.43 | 0.3% | 0.0% | 0.3% | 42.2% | 42.2% | 57.8% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 369T, RiverLeague 200T, ForgeClans 92T | RiverLeague 144T, AetherianVanguard 83T, JadeCovenant 28T, ScholarKingdoms 13T, ForgeClans 11T | ForgeClans 52T, ScholarKingdoms 6T | RiverLeague 10396G/71, maintain 24G, StarborneSeekers 3412G/30, ScholarKingdoms 2554G/64, maintain 1760G, AetherianVanguard 2329G/36, ForgeClans 967G/25, maintain 529G, JadeCovenant 916G/16 | 0.00 | 0.00 | None |
| Sunseed Haven | Food | 9 | 120.78 | 1.3% | 0.1% | 1.2% | 52.6% | 51.2% | 51.0% | 4.8% | 1.20 | 1.33 | StarborneSeekers 445T, JadeCovenant 399T, RiverLeague 181T, ForgeClans 61T | ForgeClans 368T, StarborneSeekers 153T, RiverLeague 146T, AetherianVanguard 85T, ScholarKingdoms 27T, JadeCovenant 6T | JadeCovenant 40T | RiverLeague 8109G/94, maintain 1465G, StarborneSeekers 6725G/78, maintain 657G, AetherianVanguard 4457G/35, JadeCovenant 2733G/69, maintain 2265G, ForgeClans 2378G/46, maintain 142G, ScholarKingdoms 660G/16 | 1.44 | 1.22 | Investment 9, WartimeRelease 2 |
| Thistleheart | Food | 4 | 98.25 | 1.5% | 0.3% | 1.3% | 39.2% | 39.2% | 60.6% | 0.0% | 0.76 | 1.25 | ForgeClans 193T, StarborneSeekers 160T, AetherianVanguard 39T | RiverLeague 127T, ForgeClans 1T | StarborneSeekers 70T, ForgeClans 10T | RiverLeague 3402G/36, StarborneSeekers 2342G/54, maintain 1426G, AetherianVanguard 270G/7, ForgeClans 85G/3, maintain 50G | 0.75 | 0.25 | WartimeRelease 1 |
| Verdant Myth | Food | 6 | 168.50 | 0.6% | 0.0% | 0.6% | 67.7% | 66.6% | 34.8% | 0.0% | 0.20 | 1.33 | JadeCovenant 411T, ForgeClans 293T, ScholarKingdoms 164T, StarborneSeekers 86T, AetherianVanguard 57T | StarborneSeekers 383T, ScholarKingdoms 289T, AetherianVanguard 178T, RiverLeague 149T, ForgeClans 104T, JadeCovenant 37T | JadeCovenant 131T, ForgeClans 80T, ScholarKingdoms 43T, StarborneSeekers 1T | StarborneSeekers 10397G/71, maintain 195G, ForgeClans 6814G/82, maintain 1012G, JadeCovenant 5651G/82, maintain 2930G, AetherianVanguard 4306G/49, RiverLeague 3132G/29, ScholarKingdoms 3052G/68, maintain 1543G | 0.33 | 0.33 | Investment 1, WartimeRelease 1 |
| Wildroot Sanctum | Food | 8 | 198.00 | 0.7% | 0.0% | 0.7% | 54.8% | 52.1% | 52.5% | 2.1% | 0.69 | 1.38 | RiverLeague 477T, ForgeClans 464T, StarborneSeekers 335T, JadeCovenant 191T, AetherianVanguard 117T | StarborneSeekers 428T, JadeCovenant 299T, RiverLeague 269T, AetherianVanguard 268T, ScholarKingdoms 163T | StarborneSeekers 53T, RiverLeague 11T, AetherianVanguard 5T, JadeCovenant 1T | StarborneSeekers 13354G/133, maintain 1526G, RiverLeague 8129G/85, maintain 1022G, JadeCovenant 6682G/79, maintain 101G, ForgeClans 5874G/106, maintain 2757G, AetherianVanguard 4842G/69, maintain 702G, ScholarKingdoms 1754G/30 | 1.38 | 1.38 | Investment 7, Other 2, WartimeRelease 2 |
| Aureate Crown | Gold | 4 | 166.00 | 1.2% | 0.0% | 1.2% | 48.3% | 44.7% | 62.3% | 0.0% | 0.15 | 1.25 | RiverLeague 360T, ForgeClans 154T, StarborneSeekers 150T | RiverLeague 34T | ForgeClans 78T, RiverLeague 5T | RiverLeague 3345G/61, maintain 1331G, ScholarKingdoms 1267G/27, ForgeClans 1153G/31, maintain 1153G, StarborneSeekers 438G/10 | 0.25 | 0.25 | WartimeRelease 1 |
| Auric Bazaar | Gold | 4 | 134.00 | 0.2% | 0.0% | 0.2% | 60.3% | 59.9% | 40.5% | 0.0% | 0.19 | 1.25 | ScholarKingdoms 214T, AetherianVanguard 200T, RiverLeague 118T, JadeCovenant 4T | RiverLeague 182T, JadeCovenant 106T | AetherianVanguard 77T | JadeCovenant 4041G/32, RiverLeague 3788G/78, maintain 1621G, AetherianVanguard 2077G/54, maintain 1699G, ScholarKingdoms 1578G/35, maintain 1153G | 0.25 | 0.25 | Investment 1 |
| Brassmoon Mint | Gold | 10 | 129.40 | 0.9% | 0.0% | 0.9% | 71.5% | 68.2% | 40.0% | 1.5% | 0.54 | 1.40 | ForgeClans 463T, JadeCovenant 398T, StarborneSeekers 181T, ScholarKingdoms 167T, RiverLeague 60T, AetherianVanguard 25T | JadeCovenant 199T, ForgeClans 142T, RiverLeague 125T, StarborneSeekers 47T, AetherianVanguard 18T, ScholarKingdoms 7T | JadeCovenant 130T, ScholarKingdoms 73T, ForgeClans 52T, StarborneSeekers 1T | JadeCovenant 12789G/182, maintain 4474G, StarborneSeekers 5316G/74, maintain 1053G, ScholarKingdoms 5035G/98, maintain 2111G, ForgeClans 3588G/77, maintain 1629G, AetherianVanguard 2815G/45, RiverLeague 1818G/36, maintain 39G | 0.70 | 0.70 | Other 3, Investment 2, WartimeRelease 2 |
| Coinfire Crossing | Gold | 7 | 102.71 | 1.5% | 0.0% | 1.5% | 41.3% | 39.2% | 66.1% | 0.0% | 0.56 | 1.57 | ScholarKingdoms 266T, StarborneSeekers 146T, AetherianVanguard 132T, JadeCovenant 122T, RiverLeague 27T, ForgeClans 26T | ForgeClans 177T, JadeCovenant 132T, RiverLeague 35T, StarborneSeekers 22T | AetherianVanguard 45T, ScholarKingdoms 25T, StarborneSeekers 25T, ForgeClans 22T, JadeCovenant 1T | RiverLeague 4014G/47, ForgeClans 3473G/31, maintain 490G, JadeCovenant 3324G/51, maintain 546G, AetherianVanguard 1543G/41, maintain 1543G, StarborneSeekers 1330G/22, maintain 104G, ScholarKingdoms 724G/20, maintain 724G | 0.57 | 0.57 | WartimeRelease 3, Investment 1 |
| Cresset Exchange | Gold | 3 | 109.33 | 0.0% | 0.0% | 0.0% | 42.7% | 42.7% | 57.3% | 0.0% | 0.00 | 1.00 | RiverLeague 236T, ForgeClans 81T, StarborneSeekers 11T | JadeCovenant 78T | None | StarborneSeekers 4041G/32, JadeCovenant 2633G/27, RiverLeague 1777G/36, maintain 646G, AetherianVanguard 916G/16, ForgeClans 217G/7, maintain 217G | 0.00 | 0.00 | None |
| Crownmarket | Gold | 6 | 166.67 | 2.6% | 0.0% | 2.6% | 67.6% | 61.1% | 53.2% | 0.0% | 0.30 | 1.33 | StarborneSeekers 650T, JadeCovenant 174T, ScholarKingdoms 147T, AetherianVanguard 28T, ForgeClans 1T | JadeCovenant 230T, ForgeClans 181T, RiverLeague 98T, ScholarKingdoms 9T | StarborneSeekers 30T, JadeCovenant 12T, ScholarKingdoms 11T | JadeCovenant 10053G/97, maintain 1568G, RiverLeague 7359G/52, ForgeClans 5932G/74, StarborneSeekers 2958G/80, maintain 2928G, ScholarKingdoms 1501G/40, maintain 1231G, AetherianVanguard 997G/20 | 0.50 | 0.50 | Investment 2, Other 1 |
| Embermint | Gold | 8 | 156.75 | 0.2% | 0.0% | 0.2% | 40.0% | 39.2% | 61.3% | 0.0% | 0.24 | 1.25 | StarborneSeekers 297T, RiverLeague 287T, ScholarKingdoms 287T, AetherianVanguard 237T, ForgeClans 146T | AetherianVanguard 304T, JadeCovenant 107T, ScholarKingdoms 27T, RiverLeague 11T | StarborneSeekers 50T, ScholarKingdoms 17T, AetherianVanguard 5T | AetherianVanguard 8626G/78, maintain 1019G, JadeCovenant 6764G/42, ScholarKingdoms 6431G/103, maintain 1448G, StarborneSeekers 1804G/48, maintain 1582G, RiverLeague 1683G/40, maintain 607G | 0.38 | 0.38 | Investment 2, WartimeRelease 1 |
| Gildenspire | Gold | 7 | 163.43 | 1.3% | 0.0% | 1.3% | 60.1% | 53.1% | 58.5% | 1.6% | 0.61 | 1.43 | StarborneSeekers 483T, ForgeClans 318T, JadeCovenant 141T, AetherianVanguard 105T, ScholarKingdoms 97T | AetherianVanguard 385T, JadeCovenant 297T, StarborneSeekers 99T | AetherianVanguard 97T, StarborneSeekers 15T, JadeCovenant 5T | StarborneSeekers 11000G/157, maintain 3396G, AetherianVanguard 10689G/111, maintain 2197G, JadeCovenant 5533G/59, maintain 178G, ForgeClans 2989G/79, maintain 2891G, ScholarKingdoms 1217G/27, maintain 24G | 1.00 | 1.00 | Investment 4, WartimeRelease 3 |
| Golden Mirage | Gold | 4 | 180.25 | 0.1% | 0.0% | 0.1% | 59.2% | 59.2% | 40.8% | 0.0% | 0.00 | 1.00 | AetherianVanguard 241T, ForgeClans 228T, RiverLeague 202T, ScholarKingdoms 50T | StarborneSeekers 227T, JadeCovenant 138T, ScholarKingdoms 4T | AetherianVanguard 46T, RiverLeague 43T, ForgeClans 31T | JadeCovenant 12574G/46, RiverLeague 5898G/73, maintain 1504G, StarborneSeekers 4394G/33, AetherianVanguard 1348G/36, maintain 1348G, ForgeClans 958G/26, maintain 958G, ScholarKingdoms 420G/11 | 0.00 | 0.00 | None |
| Kingsmerch | Gold | 7 | 104.57 | 0.8% | 0.0% | 0.8% | 31.1% | 30.7% | 69.4% | 0.0% | 0.27 | 1.29 | RiverLeague 401T, ForgeClans 273T, StarborneSeekers 58T | ForgeClans 123T, RiverLeague 98T, JadeCovenant 64T, StarborneSeekers 7T | RiverLeague 51T | ForgeClans 3728G/53, maintain 63G, RiverLeague 2537G/59, maintain 1621G, StarborneSeekers 1387G/36, maintain 1136G, JadeCovenant 916G/16 | 0.29 | 0.29 | WartimeRelease 2 |
| Opaline Vault | Gold | 5 | 110.20 | 0.4% | 0.0% | 0.4% | 77.9% | 77.9% | 22.1% | 0.0% | 0.00 | 1.00 | RiverLeague 385T, ForgeClans 166T | StarborneSeekers 116T, JadeCovenant 35T | ForgeClans 86T | StarborneSeekers 4616G/51, AetherianVanguard 3714G/31, ForgeClans 3593G/77, maintain 2072G, RiverLeague 2384G/64, maintain 2384G, JadeCovenant 1673G/22 | 0.00 | 0.00 | None |
| Radiant Hoard | Gold | 8 | 135.25 | 0.7% | 0.0% | 0.7% | 63.8% | 60.8% | 44.5% | 0.0% | 0.37 | 1.38 | RiverLeague 336T, ForgeClans 273T, JadeCovenant 248T, ScholarKingdoms 152T, AetherianVanguard 73T | ForgeClans 428T, JadeCovenant 300T, AetherianVanguard 238T, ScholarKingdoms 43T | RiverLeague 101T, JadeCovenant 74T, ForgeClans 31T, ScholarKingdoms 2T | ForgeClans 6550G/101, maintain 568G, AetherianVanguard 5838G/72, maintain 109G, JadeCovenant 5096G/93, maintain 1721G, RiverLeague 2397G/62, maintain 2267G, ScholarKingdoms 1534G/35, maintain 507G, StarborneSeekers 222G/6 | 0.50 | 0.50 | WartimeRelease 4 |
| Saffron Treasury | Gold | 7 | 148.43 | 0.3% | 0.0% | 0.3% | 64.6% | 62.2% | 42.5% | 0.0% | 0.19 | 1.29 | AetherianVanguard 357T, ForgeClans 255T, JadeCovenant 170T, StarborneSeekers 155T, ScholarKingdoms 102T | ScholarKingdoms 267T, JadeCovenant 153T, StarborneSeekers 93T, RiverLeague 7T, AetherianVanguard 2T | ForgeClans 85T, AetherianVanguard 74T, StarborneSeekers 26T, JadeCovenant 25T | JadeCovenant 6506G/90, maintain 819G, ScholarKingdoms 6042G/86, StarborneSeekers 3394G/69, maintain 1721G, AetherianVanguard 2484G/68, maintain 2484G, ForgeClans 841G/23, maintain 841G, RiverLeague 333G/9 | 0.29 | 0.29 | WartimeRelease 2 |
| Starcoin Port | Gold | 7 | 112.86 | 3.2% | 0.0% | 3.2% | 83.8% | 81.3% | 24.6% | 6.2% | 1.27 | 1.29 | StarborneSeekers 225T, ScholarKingdoms 224T, RiverLeague 216T, ForgeClans 70T, AetherianVanguard 55T | RiverLeague 412T, StarborneSeekers 90T, JadeCovenant 20T, ScholarKingdoms 17T, ForgeClans 15T | ScholarKingdoms 67T, RiverLeague 2T, StarborneSeekers 1T | RiverLeague 8980G/100, maintain 1485G, ForgeClans 6805G/59, StarborneSeekers 4248G/79, maintain 1385G, AetherianVanguard 3285G/40, maintain 412G, ScholarKingdoms 2479G/54, maintain 1348G, JadeCovenant 919G/20 | 1.43 | 1.43 | Investment 8, Other 2 |
| Suncoin Citadel | Gold | 3 | 80.33 | 0.0% | 0.0% | 0.0% | 17.0% | 17.0% | 83.0% | 0.0% | 0.41 | 1.33 | AetherianVanguard 113T, ScholarKingdoms 75T, StarborneSeekers 43T, ForgeClans 10T | JadeCovenant 29T | StarborneSeekers 28T | JadeCovenant 820G/15, StarborneSeekers 763G/21, maintain 763G, AetherianVanguard 378G/9 | 0.33 | 0.33 | WartimeRelease 1 |
| Velvet Ledger | Gold | 7 | 118.57 | 0.6% | 0.0% | 0.6% | 63.1% | 62.3% | 38.4% | 0.0% | 0.48 | 1.43 | StarborneSeekers 263T, AetherianVanguard 210T, RiverLeague 207T, ScholarKingdoms 132T, JadeCovenant 18T | ScholarKingdoms 159T, RiverLeague 99T, StarborneSeekers 41T, AetherianVanguard 10T | RiverLeague 41T, ScholarKingdoms 25T | RiverLeague 9933G/119, maintain 1916G, JadeCovenant 7631G/58, AetherianVanguard 3855G/44, maintain 195G, ScholarKingdoms 2695G/39, maintain 490G, StarborneSeekers 1946G/27, maintain 109G, ForgeClans 1251G/19 | 0.57 | 0.57 | WartimeRelease 4 |
| Ashen Bellows | Production | 8 | 153.13 | 0.3% | 0.0% | 0.3% | 64.1% | 61.7% | 41.5% | 0.0% | 0.08 | 1.13 | StarborneSeekers 383T, AetherianVanguard 299T, JadeCovenant 286T, ScholarKingdoms 147T, RiverLeague 110T | ForgeClans 474T, AetherianVanguard 172T, StarborneSeekers 61T, JadeCovenant 26T, RiverLeague 23T | StarborneSeekers 161T, AetherianVanguard 94T, JadeCovenant 6T, RiverLeague 4T | ForgeClans 7570G/87, AetherianVanguard 6264G/116, maintain 2579G, StarborneSeekers 6068G/119, maintain 3008G, RiverLeague 2357G/37, maintain 142G, JadeCovenant 2172G/48, maintain 1153G, ScholarKingdoms 136G/4 | 0.13 | 0.13 | WartimeRelease 1 |
| Blackglass Armory | Production | 3 | 181.33 | 1.1% | 0.0% | 1.1% | 73.5% | 73.2% | 29.8% | 0.0% | 0.00 | 1.00 | ForgeClans 253T, RiverLeague 185T, AetherianVanguard 106T | ScholarKingdoms 353T, StarborneSeekers 137T | ForgeClans 89T, RiverLeague 85T | ForgeClans 3486G/55, maintain 1075G, ScholarKingdoms 2003G/39, RiverLeague 1465G/39, maintain 1465G, JadeCovenant 820G/15, StarborneSeekers 573G/12, AetherianVanguard 24G/1, maintain 24G | 0.00 | 0.00 | None |
| Brasshollow | Production | 5 | 99.00 | 1.8% | 0.0% | 1.8% | 80.6% | 80.6% | 19.4% | 0.0% | 0.20 | 1.20 | ForgeClans 324T, RiverLeague 84T, AetherianVanguard 66T, JadeCovenant 21T | RiverLeague 232T, JadeCovenant 63T, ScholarKingdoms 54T | RiverLeague 32T, ForgeClans 25T | JadeCovenant 4650G/41, maintain 256G, RiverLeague 4123G/79, maintain 1192G, ForgeClans 4104G/84, maintain 2267G, ScholarKingdoms 2772G/40 | 0.20 | 0.20 | WartimeRelease 1 |
| Cinderhold | Production | 5 | 104.40 | 0.4% | 0.0% | 0.4% | 37.5% | 36.6% | 65.9% | 0.0% | 0.19 | 1.20 | RiverLeague 221T, JadeCovenant 170T, StarborneSeekers 72T, AetherianVanguard 59T | ScholarKingdoms 51T, StarborneSeekers 5T | AetherianVanguard 25T, JadeCovenant 25T | ScholarKingdoms 5186G/35, StarborneSeekers 3132G/29, JadeCovenant 1717G/38, maintain 897G, ForgeClans 731G/14, AetherianVanguard 514G/15, maintain 451G, RiverLeague 256G/8, maintain 256G | 0.20 | 0.20 | WartimeRelease 1 |
| Dawnsmelt Keep | Production | 2 | 142.50 | 1.1% | 0.0% | 1.1% | 77.9% | 77.9% | 22.1% | 0.0% | 0.00 | 1.00 | ForgeClans 226T, RiverLeague 59T | RiverLeague 222T, JadeCovenant 151T, AetherianVanguard 24T | ForgeClans 127T | JadeCovenant 5186G/35, AetherianVanguard 2014G/24, RiverLeague 2014G/24, ForgeClans 1231G/33, maintain 1231G | 0.00 | 0.00 | None |
| Emberforge Bastion | Production | 11 | 136.09 | 0.4% | 0.0% | 0.4% | 61.7% | 61.6% | 39.1% | 1.1% | 0.27 | 1.09 | ScholarKingdoms 605T, JadeCovenant 447T, StarborneSeekers 274T, RiverLeague 106T, ForgeClans 65T | ForgeClans 580T, JadeCovenant 250T, StarborneSeekers 192T, ScholarKingdoms 178T, AetherianVanguard 95T, RiverLeague 39T | JadeCovenant 102T, RiverLeague 52T, ScholarKingdoms 26T, ForgeClans 5T | ForgeClans 13903G/113, maintain 178G, JadeCovenant 7650G/115, maintain 2200G, RiverLeague 6984G/88, maintain 1270G, StarborneSeekers 4151G/46, ScholarKingdoms 3775G/63, maintain 725G, AetherianVanguard 1499G/28 | 0.36 | 0.36 | Other 2, Investment 1, WartimeRelease 1 |
| Flintspire Works | Production | 6 | 158.17 | 0.9% | 0.0% | 0.9% | 44.2% | 41.5% | 60.7% | 10.6% | 1.26 | 1.17 | ForgeClans 471T, JadeCovenant 405T, AetherianVanguard 73T | RiverLeague 268T, ScholarKingdoms 42T | JadeCovenant 70T | ForgeClans 5652G/75, maintain 958G, AetherianVanguard 5070G/36, maintain 661G, RiverLeague 3635G/40, ScholarKingdoms 2955G/35, JadeCovenant 1721G/47, maintain 1721G | 2.00 | 2.00 | Investment 10, Other 1, WartimeRelease 1 |
| Gearstorm Hold | Production | 7 | 130.00 | 0.4% | 0.0% | 0.4% | 29.7% | 27.9% | 73.8% | 0.0% | 0.11 | 1.14 | ForgeClans 377T, AetherianVanguard 274T, JadeCovenant 228T, ScholarKingdoms 31T | ForgeClans 155T, AetherianVanguard 60T, ScholarKingdoms 44T, JadeCovenant 43T | JadeCovenant 59T, ForgeClans 37T, ScholarKingdoms 10T | JadeCovenant 3011G/51, maintain 997G, ForgeClans 2523G/57, maintain 1504G, ScholarKingdoms 2037G/35, maintain 373G, AetherianVanguard 1131G/24, maintain 78G | 0.14 | 0.14 | WartimeRelease 1 |
| Hammerdeep | Production | 5 | 184.20 | 0.4% | 0.0% | 0.4% | 32.2% | 32.2% | 67.8% | 0.0% | 0.11 | 1.20 | StarborneSeekers 363T, JadeCovenant 252T, AetherianVanguard 231T, ScholarKingdoms 70T, ForgeClans 5T | RiverLeague 250T, ScholarKingdoms 218T, StarborneSeekers 185T, AetherianVanguard 2T | JadeCovenant 80T, ForgeClans 2T | StarborneSeekers 10593G/62, maintain 685G, ScholarKingdoms 3456G/44, RiverLeague 2205G/25, JadeCovenant 1582G/42, maintain 1582G, AetherianVanguard 98G/3, ForgeClans 78G/3, maintain 78G | 0.20 | 0.20 | WartimeRelease 1 |
| Ironwyrm Foundry | Production | 9 | 131.67 | 0.3% | 0.0% | 0.3% | 46.3% | 45.2% | 55.9% | 0.0% | 0.25 | 1.22 | ScholarKingdoms 322T, ForgeClans 285T, AetherianVanguard 195T, RiverLeague 151T, StarborneSeekers 119T, JadeCovenant 113T | AetherianVanguard 339T, StarborneSeekers 263T, ScholarKingdoms 125T | ForgeClans 163T, ScholarKingdoms 115T, AetherianVanguard 2T | AetherianVanguard 14667G/103, maintain 334G, StarborneSeekers 11051G/52, ScholarKingdoms 5813G/60, maintain 1012G, ForgeClans 1589G/44, maintain 1526G, JadeCovenant 795G/18 | 0.33 | 0.33 | WartimeRelease 2, Investment 1 |
| Molten Crown | Production | 8 | 184.63 | 0.2% | 0.0% | 0.2% | 40.2% | 40.0% | 60.3% | 0.0% | 0.20 | 1.38 | JadeCovenant 706T, ForgeClans 376T, RiverLeague 242T, ScholarKingdoms 100T, AetherianVanguard 53T | StarborneSeekers 263T, ScholarKingdoms 239T, ForgeClans 171T, JadeCovenant 49T, AetherianVanguard 44T | JadeCovenant 46T, ForgeClans 43T | ForgeClans 8592G/104, maintain 1721G, StarborneSeekers 6890G/68, JadeCovenant 6000G/125, maintain 3437G, AetherianVanguard 3143G/35, RiverLeague 2633G/27, ScholarKingdoms 2610G/41 | 0.38 | 0.38 | WartimeRelease 3 |
| Obsidian Kiln | Production | 3 | 66.00 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 111T, JadeCovenant 71T, StarborneSeekers 16T | None | None | None | 0.00 | 0.00 | None |
| Runehammer Gate | Production | 12 | 130.00 | 1.1% | 0.0% | 1.1% | 51.9% | 50.2% | 53.7% | 1.2% | 0.32 | 1.17 | RiverLeague 480T, ScholarKingdoms 420T, JadeCovenant 282T, AetherianVanguard 183T, ForgeClans 110T, StarborneSeekers 85T | ScholarKingdoms 442T, ForgeClans 291T, AetherianVanguard 148T, JadeCovenant 54T | RiverLeague 130T, StarborneSeekers 62T, JadeCovenant 25T, ScholarKingdoms 25T, AetherianVanguard 12T | ForgeClans 8604G/79, ScholarKingdoms 6323G/118, maintain 1790G, RiverLeague 4532G/106, maintain 3281G, JadeCovenant 3293G/62, maintain 1426G, AetherianVanguard 3030G/51, maintain 471G, StarborneSeekers 1309G/35, maintain 1309G | 0.42 | 0.42 | Investment 4, WartimeRelease 1 |
| Skyfurnace | Production | 5 | 164.40 | 0.9% | 0.0% | 0.9% | 66.3% | 63.9% | 40.9% | 0.0% | 0.12 | 1.20 | StarborneSeekers 415T, RiverLeague 294T, ScholarKingdoms 113T | StarborneSeekers 178T, JadeCovenant 171T, ScholarKingdoms 100T, AetherianVanguard 62T | RiverLeague 31T, StarborneSeekers 22T | StarborneSeekers 12894G/140, maintain 2930G, JadeCovenant 5186G/35, ScholarKingdoms 3132G/29, RiverLeague 1916G/52, maintain 1916G, AetherianVanguard 1019G/17, ForgeClans 438G/10 | 0.20 | 0.20 | WartimeRelease 1 |
| Stonewake Crucible | Production | 5 | 91.40 | 1.1% | 0.0% | 1.1% | 67.2% | 63.2% | 38.3% | 9.8% | 3.06 | 1.40 | ScholarKingdoms 331T, ForgeClans 58T, JadeCovenant 53T, AetherianVanguard 15T | StarborneSeekers 170T, ScholarKingdoms 63T, AetherianVanguard 26T, JadeCovenant 15T, RiverLeague 15T | ScholarKingdoms 108T | ScholarKingdoms 4015G/79, maintain 1621G, ForgeClans 3823G/35, maintain 109G, JadeCovenant 3714G/31, AetherianVanguard 2397G/36, maintain 28G, StarborneSeekers 2205G/25, RiverLeague 731G/14 | 2.80 | 2.80 | Other 8, Investment 5, WartimeRelease 1 |
| Thunder Anvil | Production | 5 | 103.80 | 0.2% | 0.0% | 0.2% | 81.3% | 81.3% | 18.7% | 0.0% | 0.00 | 1.00 | AetherianVanguard 274T, StarborneSeekers 156T, ScholarKingdoms 89T | RiverLeague 222T, ScholarKingdoms 74T, JadeCovenant 23T | AetherianVanguard 70T, ScholarKingdoms 37T | RiverLeague 10280G/64, AetherianVanguard 6997G/103, maintain 2540G, ScholarKingdoms 2573G/52, maintain 1192G, JadeCovenant 2014G/24, StarborneSeekers 1308G/36, maintain 1086G, ForgeClans 98G/3 | 0.00 | 0.00 | None |
| Aetherquill | Science | 6 | 132.83 | 0.6% | 0.0% | 0.6% | 51.3% | 49.1% | 56.1% | 2.0% | 0.50 | 1.17 | RiverLeague 269T, ForgeClans 218T, AetherianVanguard 133T, JadeCovenant 82T, ScholarKingdoms 72T, StarborneSeekers 23T | JadeCovenant 210T, RiverLeague 118T, ForgeClans 78T, AetherianVanguard 75T | ForgeClans 110T, AetherianVanguard 82T, RiverLeague 26T, JadeCovenant 2T | JadeCovenant 9481G/66, maintain 616G, RiverLeague 7251G/79, maintain 1621G, ForgeClans 2674G/59, maintain 1543G, AetherianVanguard 1565G/40, maintain 1295G, ScholarKingdoms 63G/2 | 0.67 | 0.67 | Investment 3, WartimeRelease 1 |
| Arcstar Repository | Science | 8 | 130.75 | 1.3% | 0.0% | 1.3% | 75.0% | 73.8% | 30.3% | 0.0% | 0.10 | 1.13 | StarborneSeekers 368T, RiverLeague 359T, ScholarKingdoms 222T, ForgeClans 97T | ScholarKingdoms 256T, AetherianVanguard 227T, JadeCovenant 110T, ForgeClans 97T, RiverLeague 70T, StarborneSeekers 3T | StarborneSeekers 63T, RiverLeague 31T, ScholarKingdoms 21T | ScholarKingdoms 5449G/77, maintain 568G, AetherianVanguard 4799G/53, RiverLeague 4091G/89, maintain 2011G, StarborneSeekers 3200G/66, maintain 1543G, JadeCovenant 1837G/23, ForgeClans 731G/14 | 0.13 | 0.13 | WartimeRelease 1 |
| Celestine Scriptorium | Science | 2 | 55.50 | 0.9% | 0.0% | 0.9% | 59.5% | 59.5% | 40.5% | 0.0% | 0.00 | 1.00 | StarborneSeekers 72T, ScholarKingdoms 39T | ScholarKingdoms 53T | StarborneSeekers 34T | ScholarKingdoms 1521G/21, StarborneSeekers 1192G/32, maintain 1192G, RiverLeague 503G/11 | 0.00 | 0.00 | None |
| Dreaming Calculus | Science | 9 | 94.00 | 0.2% | 0.0% | 0.2% | 42.1% | 42.1% | 58.0% | 0.2% | 0.59 | 1.22 | AetherianVanguard 282T, ScholarKingdoms 192T, JadeCovenant 183T, RiverLeague 171T, ForgeClans 16T, StarborneSeekers 2T | ForgeClans 192T | ScholarKingdoms 61T, JadeCovenant 57T | AetherianVanguard 6110G/37, ForgeClans 4177G/36, ScholarKingdoms 3021G/58, maintain 1348G, JadeCovenant 1348G/36, maintain 1348G, StarborneSeekers 91G/3, maintain 28G, RiverLeague 30G/1 | 0.56 | 0.56 | Investment 3, Other 2 |
| Eclipsed Theorem | Science | 5 | 116.80 | 1.0% | 0.0% | 1.0% | 81.3% | 78.9% | 27.1% | 3.1% | 0.86 | 1.40 | ForgeClans 221T, JadeCovenant 145T, StarborneSeekers 139T, AetherianVanguard 79T | StarborneSeekers 205T, ScholarKingdoms 135T, RiverLeague 116T, ForgeClans 113T, AetherianVanguard 28T, JadeCovenant 1T | ForgeClans 76T, JadeCovenant 44T, StarborneSeekers 25T, AetherianVanguard 1T | RiverLeague 3891G/36, JadeCovenant 3261G/77, maintain 2735G, StarborneSeekers 2171G/33, maintain 334G, AetherianVanguard 1489G/28, ForgeClans 1420G/32, maintain 635G, ScholarKingdoms 1238G/24 | 1.00 | 1.00 | Investment 4, WartimeRelease 1 |
| Halcyon Loom | Science | 4 | 86.25 | 0.0% | 0.0% | 0.0% | 59.4% | 59.4% | 40.6% | 0.0% | 0.29 | 1.25 | RiverLeague 112T, ForgeClans 108T, JadeCovenant 61T, StarborneSeekers 36T, AetherianVanguard 28T | StarborneSeekers 205T | None | StarborneSeekers 6612G/57, JadeCovenant 3412G/30, RiverLeague 1504G/40, maintain 1504G, ForgeClans 646G/18, maintain 646G | 0.25 | 0.25 | WartimeRelease 1 |
| Lunarchive | Science | 6 | 129.50 | 0.3% | 0.0% | 0.3% | 22.8% | 22.8% | 77.9% | 0.0% | 0.13 | 1.17 | ForgeClans 223T, JadeCovenant 188T, AetherianVanguard 186T, StarborneSeekers 180T | ForgeClans 37T, StarborneSeekers 3T | AetherianVanguard 31T, StarborneSeekers 29T | StarborneSeekers 5038G/59, maintain 997G, ForgeClans 1692G/43, maintain 919G, JadeCovenant 1673G/22, AetherianVanguard 1153G/31, maintain 1153G | 0.17 | 0.17 | WartimeRelease 1 |
| Meridian of Runes | Science | 1 | 179.00 | 0.6% | 0.0% | 0.6% | 98.3% | 98.3% | 1.7% | 0.0% | 0.00 | 1.00 | ForgeClans 179T | None | ForgeClans 25T | StarborneSeekers 4394G/33, ForgeClans 217G/7, maintain 217G | 0.00 | 0.00 | None |
| Nyx Codex | Science | 5 | 172.80 | 0.9% | 0.0% | 0.9% | 64.1% | 58.2% | 53.7% | 0.0% | 0.23 | 1.40 | AetherianVanguard 301T, StarborneSeekers 217T, JadeCovenant 159T, ScholarKingdoms 151T, ForgeClans 36T | ForgeClans 212T, StarborneSeekers 121T, RiverLeague 34T, AetherianVanguard 19T | ScholarKingdoms 53T, StarborneSeekers 30T, JadeCovenant 25T, ForgeClans 19T, AetherianVanguard 8T | RiverLeague 5115G/53, StarborneSeekers 4559G/61, maintain 1177G, JadeCovenant 1663G/39, maintain 1014G, ScholarKingdoms 1621G/43, maintain 1621G, AetherianVanguard 1431G/38, maintain 1209G, ForgeClans 372G/10, maintain 256G | 0.40 | 0.40 | WartimeRelease 2 |
| Observatory of Whispers | Science | 5 | 184.00 | 0.0% | 0.0% | 0.0% | 42.2% | 42.2% | 57.8% | 0.0% | 0.22 | 1.40 | ForgeClans 390T, RiverLeague 192T, StarborneSeekers 153T, ScholarKingdoms 118T, JadeCovenant 67T | ScholarKingdoms 192T, StarborneSeekers 123T, AetherianVanguard 89T, ForgeClans 65T, RiverLeague 22T | JadeCovenant 25T, StarborneSeekers 22T, ScholarKingdoms 1T | StarborneSeekers 11830G/95, maintain 1892G, RiverLeague 4140G/58, AetherianVanguard 3714G/31, ScholarKingdoms 1750G/31, ForgeClans 1301G/21, maintain 50G, JadeCovenant 1097G/25, maintain 412G | 0.40 | 0.40 | Investment 1, WartimeRelease 1 |
| Prism Oracle | Science | 7 | 189.14 | 0.6% | 0.0% | 0.6% | 54.8% | 49.5% | 62.5% | 1.4% | 0.38 | 1.29 | JadeCovenant 528T, RiverLeague 252T, ForgeClans 207T, AetherianVanguard 172T, ScholarKingdoms 162T, StarborneSeekers 3T | AetherianVanguard 308T, StarborneSeekers 277T, ForgeClans 264T, JadeCovenant 1T | JadeCovenant 137T, ForgeClans 60T, ScholarKingdoms 11T, StarborneSeekers 1T | StarborneSeekers 7641G/62, maintain 28G, ForgeClans 4745G/93, maintain 2540G, JadeCovenant 3700G/96, maintain 3164G, AetherianVanguard 3130G/74, maintain 1404G, RiverLeague 1673G/22, ScholarKingdoms 519G/13, maintain 373G | 0.71 | 0.71 | Investment 4, WartimeRelease 1 |
| Quillspire | Science | 7 | 150.14 | 3.0% | 0.0% | 3.0% | 66.6% | 62.8% | 44.5% | 4.9% | 1.43 | 1.57 | ForgeClans 355T, StarborneSeekers 298T, AetherianVanguard 221T, JadeCovenant 103T, ScholarKingdoms 60T, RiverLeague 14T | RiverLeague 330T, JadeCovenant 287T, StarborneSeekers 265T, ForgeClans 187T, ScholarKingdoms 145T | StarborneSeekers 27T, ScholarKingdoms 22T, ForgeClans 13T, JadeCovenant 9T, RiverLeague 4T | StarborneSeekers 5963G/86, maintain 1774G, ForgeClans 3666G/63, maintain 999G, JadeCovenant 3640G/68, maintain 1365G, ScholarKingdoms 3550G/53, maintain 490G, RiverLeague 3082G/50, maintain 217G, AetherianVanguard 2129G/50, maintain 1309G | 2.14 | 2.14 | Investment 10, Other 3, WartimeRelease 2 |
| Radiant Lexicon | Science | 8 | 69.25 | 0.4% | 0.0% | 0.4% | 46.2% | 46.2% | 53.8% | 0.0% | 0.18 | 1.13 | ForgeClans 160T, ScholarKingdoms 158T, AetherianVanguard 105T, JadeCovenant 97T, RiverLeague 23T, StarborneSeekers 11T | RiverLeague 147T | ForgeClans 25T, JadeCovenant 25T, RiverLeague 1T | RiverLeague 5468G/61, JadeCovenant 3109G/50, maintain 904G, ScholarKingdoms 880G/24, maintain 880G, ForgeClans 648G/20, maintain 512G, StarborneSeekers 78G/3, maintain 78G, AetherianVanguard 30G/1 | 0.13 | 0.13 | WartimeRelease 1 |
| Sapphire Mnemos | Science | 7 | 166.71 | 1.5% | 0.0% | 1.5% | 70.0% | 67.9% | 37.1% | 0.0% | 0.09 | 1.14 | AetherianVanguard 353T, JadeCovenant 312T, RiverLeague 272T, ForgeClans 115T, StarborneSeekers 115T | ScholarKingdoms 429T, RiverLeague 305T, StarborneSeekers 83T, ForgeClans 30T | AetherianVanguard 76T, RiverLeague 53T, ForgeClans 39T, JadeCovenant 31T | ScholarKingdoms 9560G/61, JadeCovenant 6708G/85, maintain 1933G, RiverLeague 6436G/89, maintain 802G, StarborneSeekers 4071G/70, maintain 1660G, ForgeClans 3769G/67, maintain 1387G, AetherianVanguard 3320G/88, maintain 3320G | 0.14 | 0.14 | WartimeRelease 1 |
| Starglass Athenaeum | Science | 10 | 150.70 | 0.5% | 0.0% | 0.5% | 58.8% | 58.2% | 42.7% | 0.0% | 0.20 | 1.30 | AetherianVanguard 695T, RiverLeague 316T, StarborneSeekers 307T, ScholarKingdoms 129T, ForgeClans 42T, JadeCovenant 18T | ForgeClans 523T, StarborneSeekers 381T, AetherianVanguard 272T, RiverLeague 226T | StarborneSeekers 83T, AetherianVanguard 75T, RiverLeague 24T | ForgeClans 20659G/101, AetherianVanguard 13820G/147, maintain 4612G, StarborneSeekers 10486G/117, maintain 1426G, RiverLeague 8684G/90, maintain 1036G | 0.30 | 0.30 | Investment 1, Other 1, WartimeRelease 1 |
| Voidlight Archive | Science | 8 | 135.75 | 2.3% | 0.0% | 2.3% | 70.9% | 67.9% | 36.9% | 5.3% | 1.29 | 1.38 | ForgeClans 435T, RiverLeague 399T, JadeCovenant 98T, StarborneSeekers 95T, ScholarKingdoms 45T, AetherianVanguard 14T | StarborneSeekers 331T, JadeCovenant 206T, ForgeClans 98T | ForgeClans 29T, JadeCovenant 23T, StarborneSeekers 16T, ScholarKingdoms 14T, AetherianVanguard 4T | RiverLeague 7979G/113, maintain 2384G, StarborneSeekers 7183G/83, maintain 1022G, ForgeClans 6635G/127, maintain 2485G, JadeCovenant 5342G/41, maintain 256G, AetherianVanguard 3274G/34, maintain 142G, ScholarKingdoms 759G/19, maintain 256G | 1.75 | 1.75 | Investment 11, Other 2, WartimeRelease 1 |

## Notes
- "Maintenance Gold" counts investment spend that occurred while the investor was the incumbent suzerain for that city-state.
- "Safe-maintenance" counts incumbent spend made while the city-state lead was already above the safe upkeep threshold.
- "Turnover-window" counts challenger spend made while the incumbent lead was within three influence purchases.
- "Deep-challenge" counts challenger spend made outside the turnover window.
- "Neutral-claim" counts spend into city-states with no incumbent suzerain.
- "Passive contestation pulses" count end-of-round influence pressure applications. "Passive-assisted" counts later non-passive suzerainty changes that landed within two turns of a passive close-race pulse.
- "Pair-fatigue-triggered" counts challenger spend where repeated two-civ reclaim fatigue reduced the reclaim bonus or pressure.
- "No Suz Share" counts turns where the city-state had no suzerain.
- "Close-Race Share" counts turns where a suzerain existed but first/second influence were within the contest margin.
- "Flip Rate /100T" is suzerain changes per 100 active turns.
- "True ownership turnover" counts only changes from one suzerain civ directly to another, excluding drops to no suzerain.
- "Hotspot Share" counts turns where the city-state had entered a recent repeated-flip streak.
- "Hotspot Instances" are the primary per-simulation diagnostic. "Hotspot City Names" remains a cross-simulation aggregate by city-state name.
- Correlations are participant-level across telemetry simulations and should be treated as directional, not causal.

