# City-State Simulation Report

Generated: 2026-03-08T16:55:27.602Z

## Data Coverage
- Simulations processed: 100
- Simulations with city-state telemetry: 100
- Simulations missing city-state telemetry: 0
- Total city-states created: 359
- Total city-state active turns: 47194
- Total contested turns: 441 (No Suz: 5, Close-race: 436)
- Total turnover-window turns: 26545
- Total flip-window turns: 25651
- Total safe-lead incumbent turns: 23335
- Total hotspot turns: 642
- Contest telemetry coverage (city-state entries): 359 with split fields, 0 legacy-only
- Global suzerain flip rate: 0.48 per 100 active turns
- True ownership turnover rate: 0.48 per 100 active turns
- Average unique suzerains per city-state: 1.20
- Average city-states created per telemetry simulation: 3.59
- Average surviving city-states at game end (telemetry sims): 3.53



## Creation Timing
- Simulations with at least one city-state created: 86/100 (86.0%)
- First city-state creation turn (min / p25 / median / p75 / max): 70 / 100 / 135 / 166 / 320
- First city-state creation turn (average, sims with any): 140.7

## Map-Size Creation Rates
| Map | Sims | Telemetry Sims | Sims with >=1 CS | Share with >=1 CS | Total Created | Avg Created / Telemetry Sim | Avg First CS Turn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tiny | 20 | 20 | 13 | 65.0% | 20 | 1.00 | 150.5 |
| Small | 20 | 20 | 14 | 70.0% | 25 | 1.25 | 145.1 |
| Standard | 20 | 20 | 20 | 100.0% | 66 | 3.30 | 127.7 |
| Large | 20 | 20 | 19 | 95.0% | 115 | 5.75 | 131.3 |
| Huge | 20 | 20 | 20 | 100.0% | 133 | 6.65 | 153.4 |

## Camp-Clearing Activation Funnel
- Camp-clearing episodes observed: 4582
- Direct starts in Ready: 1863 (40.7%)
- Episodes that reached Ready: 2797 (61.0%)
- Episodes with sighting telemetry: 2419 (52.8%)
- Sighted -> prep start (avg / median): 108.37 / 83 turns
- Prep start -> first Ready (avg / median): 2.74 / 0 turns
- Prep start -> self clear (avg / median): 12.85 / 10 turns
- Total prep duration (avg / median): 7.70 / 1 turns
- Timeouts after reaching Ready: 141 (16.9% of timeouts)
- Ready turn diagnostics: no contact 5691, adjacent contact 808, attack opportunity 2525, stalled opportunity 1407, power disadvantage 1834, progress 1526
- Ready-timeout primary breakdown: no contact 77, declined attack 44, power collapse 20, other 0
- War-interrupted episodes: 1216 (26.5%)
- Cleared-by-other breakdown: lacked military 32, late start 73, other 38
- Initial prep state mix: Buildup 1286, Gathering 44, Positioning 1389, Ready 1863

### Camp Outcomes
| Outcome | Episodes | Share |
| --- | --- | --- |
| ClearedBySelf | 337 | 7.4% |
| ClearedByOther | 143 | 3.1% |
| TimedOut | 835 | 18.2% |
| WartimeEmergencyCancelled | 1216 | 26.5% |
| OtherCancelled | 1984 | 43.3% |
| StillActive | 67 | 1.5% |

### Camp Funnel By Readiness
| Readiness | Episodes | Self Clears | Self Clear Rate | Timeouts | Timeout Rate | Avg Prep Turns | Avg Prep->Ready | Reached Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PreArmy | 1105 | 9 | 0.8% | 442 | 40.0% | 8.91 | 7.32 | 20.4% |
| ArmyTech | 2163 | 112 | 5.2% | 249 | 11.5% | 6.37 | 1.91 | 79.2% |
| ArmyFielded | 1314 | 216 | 16.4% | 144 | 11.0% | 8.89 | 3.20 | 65.3% |

### Slowest Prep Episodes
| Map | Seed | Civ | Outcome | Readiness | Initial State | Sighted->Prep | Total Prep | Prep->Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Huge | 404004 | ScholarKingdoms | StillActive | ArmyFielded | Positioning | 1 | 225T | n/a |
| Standard | 201001 | ForgeClans | StillActive | ArmyTech | Buildup | n/a | 150T | n/a |
| Huge | 406006 | ForgeClans | StillActive | ArmyFielded | Positioning | n/a | 149T | 4 |
| Large | 312012 | JadeCovenant | TimedOut | ArmyTech | Buildup | n/a | 133T | 21 |
| Standard | 211011 | RiverLeague | ClearedByOther | ArmyTech | Buildup | n/a | 129T | n/a |
| Huge | 419019 | JadeCovenant | StillActive | ArmyFielded | Positioning | 40 | 113T | n/a |
| Standard | 207007 | JadeCovenant | StillActive | ArmyFielded | Positioning | 58 | 108T | n/a |
| Huge | 419019 | JadeCovenant | ClearedBySelf | PreArmy | Buildup | n/a | 104T | 5 |
| Huge | 407007 | RiverLeague | OtherCancelled | ArmyTech | Positioning | n/a | 89T | 5 |
| Large | 314014 | AetherianVanguard | ClearedBySelf | ArmyTech | Buildup | n/a | 83T | 18 |

## Suzerainty vs Winning
- Winner average suzerain turns: 170.50
- Non-winner average suzerain turns: 96.05
- Winner average city-state investment: 3312.5G
- Non-winner average city-state investment: 2301.2G
- Winners with any suzerainty: 67/92 (72.8%)
- Winners with any city-state investment: 61/92 (66.3%)
- Participant win rate with any suzerainty: 28.2%
- Participant win rate without suzerainty: 13.7%
- Participant win rate with any city-state investment: 21.3%
- Correlation (suzerain turns -> win flag): 0.175
- Correlation (city-state gold invested -> win flag): 0.122
- Winner share of sim-wide suzerain turns (when any suzerainty existed): 51.4%

## Investment Mix
- Total city-state investment: 1059547G across 14504 actions
- Maintenance investment: 218656G (20.6%) across 5905 actions (40.7%)
- Challenger investment: 840891G (79.4%) across 8599 actions (59.3%)
- Maintenance gold per suzerain turn: 4.63
- Maintenance actions per 100 suzerain turns: 12.51

## Turnover Diagnostics
- Turnover-window challenger investment: 818109G across 8072 actions
- Flip-window challenger investment: 805829G across 7911 actions
- Deep-challenge investment: 22782G across 527 actions
- Neutral-claim investment: 0G across 0 actions
- Passive contestation pulses: 14340
- Passive contestation close-race pulses: 11307
- Passive openings observed: 1
- Passive openings with treasury to invest: 1 (100.0%)
- Passive openings with reserve-safe invest: 0 (0.0%)
- Passive openings avg nominated turn-order delay: 1.00 turns
- Passive openings attempted by nominated challenger: 0 (0.0%)
- Passive openings avg delay to first nominated attempt: 0.00 turns
- Passive openings resolved before expiry: 0 (0.0%)
- Passive openings won by nominated challenger: 0 (0.0%; 0.0% of resolved)
- Passive openings lost to someone else: 0
- Passive openings expired unresolved: 1
- Passive opening resolutions by cause: None
- Passive opening nominated wins by cause: None
- Passive openings with no nominated attempt: 1 (100.0%)
- No-attempt reasons: treasury blocked 0, reserve blocked 1, no-attempt despite capacity 0
- Passive direct flip conversion per 100 close-race pulses: 0.00
- Passive-assisted suzerainty changes: 47 (20.7% of non-passive changes)
- Passive-assisted true ownership turnovers: 47 (20.8% of ownership turnover)
- Passive-assisted ownership conversion per 100 close-race pulses: 0.42
- Passive-involved ownership conversion per 100 close-race pulses: 0.42
- Passive-assisted ownership causes: WartimeRelease 43, Other 4
- Pair-fatigue-triggered investment: 40226G across 508 actions
- Pair-fatigue share of challenger spend: 4.8%
- Safe-maintenance investment: 0G across 0 actions
- Focus turns: 32403 (challenge 26261, maintenance 6142)
- Focus assignments: 708, focus switches: 78
- Flip conversion per 100 turnover-window turns: 0.86
- True ownership conversion per 100 turnover-window turns: 0.85
- Flip conversion per 100 challenge-focus turns: 0.86
- Safe-maintenance share of maintenance spend: 0.0%

## Flip Cause Summary
| Cause | Suzerainty Changes | True Ownership Turnovers | State Change Share | Ownership Share |
| --- | --- | --- | --- | --- |
| Investment | 128 | 128 | 56.4% | 56.6% |
| PassiveContestation | 0 | 0 | 0.0% | 0.0% |
| WartimeRelease | 45 | 45 | 19.8% | 19.9% |
| WarBreak | 1 | 0 | 0.4% | 0.0% |
| Other | 53 | 53 | 23.3% | 23.5% |

## Hotspot Diagnostics
- Hotspot turn share of active turns: 1.4%
- City-state instances with any hotspot time: 19/359
- True ownership turnovers occurring in hotspot instances: 158 / 226

## Hotspot Instances
| Map | Seed | City-State | Yield | Created | Active | Hotspot | Hotspot Share | Ownership Turnovers | Suz Changes | Turnover Pair | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Large | 312012 | Moonmeadow | Food | 221 | 226T | 68T | 30.1% | 21 | 21 | ScholarKingdoms <> JadeCovenant 21 | Investment 19, Other 1, WartimeRelease 1 |
| Large | 312012 | Radiant Lexicon | Science | 345 | 102T | 60T | 58.8% | 13 | 13 | ScholarKingdoms <> RiverLeague 13 | Investment 13 |
| Huge | 416016 | Ashen Bellows | Production | 291 | 106T | 50T | 47.2% | 12 | 12 | AetherianVanguard <> ForgeClans 12 | Investment 11, Other 1 |
| Standard | 218018 | Nectarwind | Food | 97 | 219T | 56T | 25.6% | 10 | 10 | RiverLeague <> ScholarKingdoms 10 | Investment 5, Other 4, WartimeRelease 1 |
| Huge | 420020 | Starglass Athenaeum | Science | 96 | 191T | 34T | 17.8% | 10 | 10 | ForgeClans <> JadeCovenant 10 | Investment 9, Other 1 |
| Huge | 411011 | Saffron Treasury | Gold | 195 | 178T | 25T | 14.0% | 10 | 10 | ForgeClans <> ScholarKingdoms 10 | Other 5, Investment 4, WartimeRelease 1 |
| Huge | 416016 | Sapphire Mnemos | Science | 181 | 217T | 0T | 0.0% | 10 | 10 | StarborneSeekers <> RiverLeague 10 | Other 5, Investment 4, WartimeRelease 1 |
| Huge | 414014 | Celestine Scriptorium | Science | 412 | 61T | 37T | 60.7% | 9 | 9 | RiverLeague <> JadeCovenant 9 | Investment 6, Other 3 |
| Large | 301001 | Observatory of Whispers | Science | 125 | 265T | 34T | 12.8% | 9 | 9 | AetherianVanguard <> ScholarKingdoms 9 | Investment 7, Other 2 |
| Large | 312012 | Brasshollow | Production | 384 | 64T | 27T | 42.2% | 8 | 8 | ScholarKingdoms <> ForgeClans 7, AetherianVanguard <> ScholarKingdoms 1 | Other 4, Investment 3, WartimeRelease 1 |
| Large | 319019 | Molten Crown | Production | 203 | 139T | 37T | 26.6% | 7 | 7 | JadeCovenant <> ScholarKingdoms 6, RiverLeague <> JadeCovenant 1 | Other 5, Investment 2 |
| Huge | 408008 | Hammerdeep | Production | 185 | 181T | 31T | 17.1% | 7 | 7 | JadeCovenant <> ScholarKingdoms 7 | Investment 4, Other 3 |
| Huge | 419019 | Aureate Crown | Gold | 144 | 241T | 25T | 10.4% | 7 | 7 | ForgeClans <> JadeCovenant 7 | Investment 6, Other 1 |
| Huge | 402002 | Bramble Feast | Food | 135 | 187T | 21T | 11.2% | 7 | 7 | StarborneSeekers <> ScholarKingdoms 6, AetherianVanguard <> StarborneSeekers 1 | Investment 6, WartimeRelease 1 |
| Huge | 414014 | Suncoin Citadel | Gold | 383 | 90T | 37T | 41.1% | 6 | 6 | ForgeClans <> JadeCovenant 5, ForgeClans <> RiverLeague 1 | Investment 5, WartimeRelease 1 |
| Standard | 213013 | Cinderhold | Production | 88 | 246T | 28T | 11.4% | 5 | 5 | JadeCovenant <> RiverLeague 5 | Investment 2, Other 2, WartimeRelease 1 |

## Hotspot City Names (Cross-Sim Aggregate)
| City-State | Yield | Avg Hotspot Turns | Hotspot Share | Avg Ownership Turnovers | Avg Suz Changes | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- |
| Moonmeadow | Food | 10.9T | 8.4% | 3.25 | 3.25 | Investment 22, Other 3, WartimeRelease 1 |
| Radiant Lexicon | Science | 12.0T | 11.2% | 2.60 | 2.60 | Investment 13 |
| Ashen Bellows | Production | 8.3T | 5.6% | 2.00 | 2.00 | Investment 11, Other 1 |
| Celestine Scriptorium | Science | 9.3T | 8.4% | 3.00 | 3.00 | Investment 7, Other 4, WartimeRelease 1 |
| Starglass Athenaeum | Science | 11.3T | 9.2% | 3.67 | 3.67 | Investment 10, Other 1 |
| Saffron Treasury | Gold | 4.2T | 2.7% | 1.83 | 1.83 | Investment 5, Other 5, WartimeRelease 1 |
| Nectarwind | Food | 9.3T | 6.8% | 1.67 | 1.67 | Investment 5, Other 4, WartimeRelease 1 |
| Observatory of Whispers | Science | 4.9T | 3.1% | 1.43 | 1.43 | Investment 8, Other 2 |
| Brasshollow | Production | 2.3T | 1.6% | 0.83 | 0.83 | Other 6, Investment 3, WartimeRelease 1 |
| Sapphire Mnemos | Science | 0.0T | 0.0% | 2.00 | 2.00 | Other 5, Investment 4, WartimeRelease 1 |
| Aureate Crown | Gold | 3.1T | 4.1% | 1.13 | 1.13 | Investment 8, Other 1 |
| Molten Crown | Production | 4.6T | 2.8% | 1.00 | 1.00 | Other 5, Investment 2, WartimeRelease 1 |

## Civ Performance
| Civ | Games | Wins | Win% | Avg Suz Turns | Avg Invested Gold | Avg Maintenance Gold | Avg Invest Actions | Win% (Suz>0) | Win% (Suz=0) | Top Suz Claims |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 74 | 19 | 25.7% | 155.89 | 2443.2 | 683.0 | 35.54 | 29.3% | 21.2% | 79 |
| ScholarKingdoms | 70 | 11 | 15.7% | 115.86 | 2009.9 | 431.8 | 29.46 | 24.4% | 3.4% | 57 |
| RiverLeague | 70 | 13 | 18.6% | 113.54 | 2842.1 | 686.1 | 41.50 | 24.3% | 12.1% | 60 |
| AetherianVanguard | 71 | 22 | 31.0% | 69.20 | 2227.3 | 258.8 | 27.73 | 38.5% | 21.9% | 49 |
| StarborneSeekers | 68 | 18 | 26.5% | 95.25 | 2420.1 | 460.1 | 34.49 | 35.9% | 13.8% | 50 |
| JadeCovenant | 67 | 9 | 13.4% | 122.46 | 3229.9 | 599.9 | 38.70 | 17.1% | 7.7% | 63 |

## Turnover Pressure By Civ
| Civ | Avg Turnover Gold | Avg Deep Gold | Avg Neutral Gold | Avg Pair-Fatigue Gold | Avg Safe Maint Gold | Avg Focus Challenge T | Avg Focus Maint T | Focus Switches / Game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 1720.2 | 39.9 | 0.0 | 73.1 | 0.0 | 58.93 | 23.14 | 0.16 |
| ScholarKingdoms | 1526.1 | 52.1 | 0.0 | 124.3 | 0.0 | 71.16 | 10.21 | 0.14 |
| RiverLeague | 2067.5 | 88.6 | 0.0 | 118.5 | 0.0 | 62.79 | 16.77 | 0.29 |
| AetherianVanguard | 1924.3 | 44.1 | 0.0 | 53.9 | 0.0 | 55.85 | 9.89 | 0.17 |
| StarborneSeekers | 1910.1 | 49.8 | 0.0 | 17.6 | 0.0 | 65.53 | 14.82 | 0.13 |
| JadeCovenant | 2578.3 | 51.7 | 0.0 | 190.9 | 0.0 | 61.24 | 12.40 | 0.22 |

## Yield-Type Summary
| Yield | City-States | Avg Active Turns | Contested Turn Share | No Suz Share | Close-Race Share | Flip Rate /100T | Avg Unique Suz | Surviving | Removed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Science | 88 | 134.80 | 1.0% | 0.0% | 1.0% | 0.57 | 1.19 | 87 | 1 |
| Production | 90 | 132.61 | 0.9% | 0.0% | 0.9% | 0.46 | 1.22 | 89 | 1 |
| Food | 91 | 129.40 | 0.9% | 0.0% | 0.8% | 0.48 | 1.19 | 90 | 1 |
| Gold | 90 | 129.13 | 1.0% | 0.0% | 1.0% | 0.40 | 1.20 | 87 | 3 |

## Yield Turnover Windows
| Yield | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share |
| --- | --- | --- | --- | --- |
| Science | 62.7% | 60.7% | 43.0% | 1.4% |
| Production | 53.0% | 51.3% | 52.2% | 1.4% |
| Food | 55.3% | 53.6% | 49.9% | 1.4% |
| Gold | 54.0% | 51.8% | 52.7% | 1.2% |

## City-State Suzerainty Ledger
| City-State | Yield | Appearances | Avg Active Turns | Contested Share | No Suz Share | Close-Race Share | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share | Flip Rate /100T | Avg Unique Suz | Suzerain Turns by Civ | Focus Challenge by Civ | Focus Maintenance by Civ | Investment by Civ (Gold/Actions) | Avg Suz Changes | Avg Ownership Turnovers | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amber Orchard | Food | 4 | 120.75 | 0.2% | 0.0% | 0.2% | 53.6% | 53.6% | 46.4% | 0.0% | 0.00 | 1.00 | ForgeClans 281T, ScholarKingdoms 150T, StarborneSeekers 52T | RiverLeague 210T, StarborneSeekers 183T, ForgeClans 48T | ForgeClans 25T, StarborneSeekers 25T | ForgeClans 3787G/67, maintain 1582G, StarborneSeekers 2717G/47, maintain 880G, RiverLeague 2205G/25 | 0.00 | 0.00 | None |
| Bloomtide | Food | 6 | 126.33 | 0.3% | 0.0% | 0.3% | 35.0% | 34.8% | 65.3% | 0.0% | 0.13 | 1.17 | AetherianVanguard 307T, RiverLeague 286T, ForgeClans 93T, ScholarKingdoms 72T | JadeCovenant 168T | RiverLeague 75T | JadeCovenant 3307G/51, StarborneSeekers 2633G/27, ScholarKingdoms 2092G/27, maintain 78G, RiverLeague 1582G/42, maintain 1582G, AetherianVanguard 440G/14, maintain 410G, ForgeClans 166G/5 | 0.17 | 0.17 | Investment 1 |
| Bramble Feast | Food | 4 | 136.00 | 3.3% | 0.0% | 3.3% | 48.9% | 46.0% | 63.2% | 3.9% | 1.47 | 1.75 | StarborneSeekers 333T, ForgeClans 195T, AetherianVanguard 13T, ScholarKingdoms 3T | ScholarKingdoms 160T, AetherianVanguard 132T, ForgeClans 70T, StarborneSeekers 11T | StarborneSeekers 46T, AetherianVanguard 9T, ScholarKingdoms 1T | StarborneSeekers 4144G/101, maintain 3257G, JadeCovenant 2633G/27, AetherianVanguard 1438G/21, maintain 295G, ScholarKingdoms 1251G/19, ForgeClans 1019G/17, RiverLeague 322G/8 | 2.00 | 2.00 | Investment 7, WartimeRelease 1 |
| Dawnharvest | Food | 6 | 141.00 | 0.7% | 0.0% | 0.7% | 31.0% | 30.9% | 69.5% | 0.0% | 0.00 | 1.00 | JadeCovenant 512T, ForgeClans 251T, AetherianVanguard 83T | ForgeClans 90T, RiverLeague 61T | None | RiverLeague 7854G/42, AetherianVanguard 3674G/46, JadeCovenant 2618G/70, maintain 2618G, ForgeClans 2411G/26 | 0.00 | 0.00 | None |
| Evergrain Vale | Food | 4 | 83.00 | 0.3% | 0.0% | 0.3% | 30.1% | 29.8% | 71.4% | 0.0% | 0.30 | 1.25 | ForgeClans 141T, ScholarKingdoms 108T, AetherianVanguard 59T, JadeCovenant 16T, StarborneSeekers 8T | AetherianVanguard 8T | None | AetherianVanguard 2014G/24, StarborneSeekers 573G/12, ScholarKingdoms 116G/4, maintain 78G | 0.25 | 0.25 | WartimeRelease 1 |
| Fernsong | Food | 4 | 140.50 | 0.2% | 0.0% | 0.2% | 38.8% | 38.8% | 61.2% | 0.0% | 0.18 | 1.25 | ForgeClans 186T, AetherianVanguard 143T, RiverLeague 128T, JadeCovenant 105T | RiverLeague 75T, ForgeClans 58T | JadeCovenant 55T, AetherianVanguard 52T | StarborneSeekers 3412G/30, RiverLeague 2633G/27, JadeCovenant 1582G/42, maintain 1582G, ForgeClans 820G/15, AetherianVanguard 450G/11, maintain 217G | 0.25 | 0.25 | WartimeRelease 1 |
| Greenstar Hollow | Food | 2 | 94.00 | 0.0% | 0.0% | 0.0% | 72.9% | 72.9% | 27.1% | 0.0% | 0.00 | 1.00 | ForgeClans 188T | RiverLeague 137T | ForgeClans 25T | RiverLeague 2411G/26, ScholarKingdoms 1019G/17, ForgeClans 217G/7, maintain 217G | 0.00 | 0.00 | None |
| Hearthbloom | Food | 8 | 134.38 | 0.7% | 0.0% | 0.7% | 41.4% | 38.7% | 64.3% | 0.0% | 0.28 | 1.25 | ForgeClans 442T, JadeCovenant 314T, RiverLeague 293T, ScholarKingdoms 26T | ForgeClans 183T, StarborneSeekers 138T, JadeCovenant 69T, AetherianVanguard 68T, ScholarKingdoms 6T | JadeCovenant 96T, RiverLeague 12T, ForgeClans 2T | JadeCovenant 5794G/111, maintain 2891G, ForgeClans 3993G/68, maintain 905G, RiverLeague 2339G/50, maintain 1024G, StarborneSeekers 1251G/19, AetherianVanguard 1019G/17, ScholarKingdoms 1005G/19, maintain 156G | 0.38 | 0.38 | WartimeRelease 3 |
| Moonmeadow | Food | 8 | 129.38 | 1.8% | 0.0% | 1.8% | 81.3% | 75.7% | 37.1% | 8.4% | 2.51 | 1.38 | ScholarKingdoms 401T, ForgeClans 266T, AetherianVanguard 194T, JadeCovenant 147T, RiverLeague 27T | JadeCovenant 108T, RiverLeague 104T, ScholarKingdoms 37T | ForgeClans 97T, AetherianVanguard 62T, ScholarKingdoms 9T, JadeCovenant 4T | AetherianVanguard 13604G/125, maintain 1387G, ScholarKingdoms 5658G/87, maintain 2582G, JadeCovenant 4784G/38, maintain 379G, ForgeClans 2981G/72, maintain 2100G, RiverLeague 2834G/39 | 3.25 | 3.25 | Investment 22, Other 3, WartimeRelease 1 |
| Nectarwind | Food | 6 | 137.17 | 1.9% | 0.0% | 1.9% | 49.9% | 48.5% | 56.3% | 6.8% | 1.22 | 1.17 | ForgeClans 240T, RiverLeague 199T, AetherianVanguard 178T, JadeCovenant 117T, ScholarKingdoms 89T | ScholarKingdoms 246T, RiverLeague 22T | ForgeClans 117T, JadeCovenant 82T, RiverLeague 14T, ScholarKingdoms 1T | ScholarKingdoms 6880G/75, maintain 31G, AetherianVanguard 2205G/25, RiverLeague 1985G/45, maintain 1315G, ForgeClans 1543G/41, maintain 1543G, JadeCovenant 1465G/39, maintain 1465G, StarborneSeekers 573G/12 | 1.67 | 1.67 | Investment 5, Other 4, WartimeRelease 1 |
| Rainpetal Court | Food | 5 | 121.00 | 1.5% | 0.8% | 0.7% | 43.5% | 41.7% | 61.2% | 0.0% | 0.50 | 1.40 | StarborneSeekers 265T, ForgeClans 217T, RiverLeague 51T, ScholarKingdoms 38T, AetherianVanguard 29T | StarborneSeekers 211T, RiverLeague 77T | ForgeClans 50T | StarborneSeekers 6296G/55, RiverLeague 1640G/33, maintain 351G, ForgeClans 1156G/33, maintain 1058G, ScholarKingdoms 309G/8, maintain 50G | 0.60 | 0.40 | WartimeRelease 2 |
| Silverbarley | Food | 8 | 106.13 | 0.4% | 0.0% | 0.4% | 52.5% | 52.4% | 47.9% | 0.0% | 0.00 | 1.00 | RiverLeague 237T, StarborneSeekers 233T, AetherianVanguard 187T, JadeCovenant 117T, ScholarKingdoms 75T | ScholarKingdoms 371T, ForgeClans 62T, RiverLeague 24T | StarborneSeekers 111T, RiverLeague 36T | ScholarKingdoms 4750G/52, maintain 24G, RiverLeague 4593G/93, maintain 2579G, StarborneSeekers 1309G/35, maintain 1309G, ForgeClans 867G/18 | 0.00 | 0.00 | None |
| Sunseed Haven | Food | 7 | 141.14 | 1.0% | 0.0% | 1.0% | 67.7% | 65.8% | 37.4% | 0.0% | 0.20 | 1.14 | ForgeClans 285T, ScholarKingdoms 232T, AetherianVanguard 208T, StarborneSeekers 134T, JadeCovenant 74T, RiverLeague 55T | AetherianVanguard 242T, StarborneSeekers 137T, ForgeClans 126T, RiverLeague 126T, ScholarKingdoms 13T | ForgeClans 123T, ScholarKingdoms 49T, StarborneSeekers 25T, AetherianVanguard 13T | AetherianVanguard 7730G/92, maintain 451G, RiverLeague 3454G/54, maintain 412G, ScholarKingdoms 2748G/70, maintain 2245G, StarborneSeekers 2501G/45, maintain 334G, ForgeClans 1592G/35, maintain 646G, JadeCovenant 802G/22, maintain 802G | 0.29 | 0.29 | Other 1, WartimeRelease 1 |
| Thistleheart | Food | 8 | 155.63 | 0.6% | 0.0% | 0.6% | 76.1% | 72.2% | 36.1% | 0.0% | 0.00 | 1.00 | ForgeClans 829T, StarborneSeekers 199T, AetherianVanguard 119T, RiverLeague 70T, ScholarKingdoms 28T | AetherianVanguard 347T, ScholarKingdoms 192T, JadeCovenant 176T, StarborneSeekers 113T | AetherianVanguard 50T, ForgeClans 37T, StarborneSeekers 22T | ScholarKingdoms 8475G/67, maintain 24G, AetherianVanguard 4828G/74, maintain 1036G, ForgeClans 3175G/85, maintain 3175G, StarborneSeekers 2285G/54, maintain 1465G, JadeCovenant 2014G/24, RiverLeague 63G/2 | 0.00 | 0.00 | None |
| Verdant Myth | Food | 6 | 113.17 | 0.3% | 0.0% | 0.3% | 78.4% | 78.4% | 21.6% | 0.0% | 0.15 | 1.17 | JadeCovenant 319T, ScholarKingdoms 174T, StarborneSeekers 94T, AetherianVanguard 62T, RiverLeague 30T | StarborneSeekers 422T, RiverLeague 150T, JadeCovenant 84T | StarborneSeekers 63T, JadeCovenant 44T, ScholarKingdoms 25T | StarborneSeekers 7275G/102, maintain 1231G, RiverLeague 4687G/50, maintain 646G, JadeCovenant 3103G/63, maintain 1582G, ForgeClans 1837G/23, ScholarKingdoms 707G/21, maintain 707G, AetherianVanguard 98G/3 | 0.17 | 0.17 | WartimeRelease 1 |
| Wildroot Sanctum | Food | 5 | 152.60 | 0.1% | 0.0% | 0.1% | 59.0% | 59.0% | 41.0% | 0.0% | 0.13 | 1.20 | StarborneSeekers 252T, ScholarKingdoms 185T, RiverLeague 177T, ForgeClans 149T | ScholarKingdoms 388T, StarborneSeekers 176T | StarborneSeekers 86T, RiverLeague 51T, ScholarKingdoms 47T | ScholarKingdoms 3979G/58, maintain 412G, StarborneSeekers 3828G/76, maintain 1582G, RiverLeague 1582G/42, maintain 1582G, JadeCovenant 1251G/19 | 0.20 | 0.20 | WartimeRelease 1 |
| Aureate Crown | Gold | 8 | 75.63 | 0.5% | 0.0% | 0.5% | 78.5% | 76.2% | 29.6% | 4.1% | 1.49 | 1.25 | ForgeClans 210T, JadeCovenant 202T, AetherianVanguard 162T, ScholarKingdoms 17T, StarborneSeekers 14T | StarborneSeekers 234T, AetherianVanguard 218T, ForgeClans 75T, ScholarKingdoms 74T, RiverLeague 42T, JadeCovenant 5T | ForgeClans 148T, JadeCovenant 47T | AetherianVanguard 11409G/80, maintain 852G, StarborneSeekers 6380G/71, ForgeClans 3745G/93, maintain 2488G, JadeCovenant 2314G/48, maintain 1205G, ScholarKingdoms 2003G/32, maintain 85G, RiverLeague 1019G/17 | 1.13 | 1.13 | Investment 8, Other 1 |
| Auric Bazaar | Gold | 5 | 132.40 | 0.6% | 0.0% | 0.6% | 39.1% | 32.8% | 78.1% | 0.0% | 0.15 | 1.20 | JadeCovenant 384T, StarborneSeekers 123T, RiverLeague 85T, AetherianVanguard 70T | ForgeClans 129T, JadeCovenant 57T | JadeCovenant 28T | StarborneSeekers 5186G/35, JadeCovenant 3942G/62, maintain 1309G, RiverLeague 841G/23, maintain 841G, AetherianVanguard 63G/2, ForgeClans 30G/1 | 0.20 | 0.20 | WartimeRelease 1 |
| Brassmoon Mint | Gold | 3 | 131.33 | 0.0% | 0.0% | 0.0% | 61.2% | 61.2% | 38.8% | 0.0% | 0.00 | 1.00 | ForgeClans 246T, ScholarKingdoms 77T, JadeCovenant 71T | StarborneSeekers 241T, AetherianVanguard 139T | None | StarborneSeekers 3132G/29, AetherianVanguard 2014G/24, ForgeClans 24G/1, maintain 24G | 0.00 | 0.00 | None |
| Coinfire Crossing | Gold | 9 | 164.33 | 0.4% | 0.0% | 0.4% | 48.7% | 48.5% | 51.9% | 1.4% | 0.34 | 1.11 | RiverLeague 371T, ForgeClans 325T, JadeCovenant 299T, ScholarKingdoms 274T, StarborneSeekers 210T | RiverLeague 349T, ScholarKingdoms 289T, JadeCovenant 174T, StarborneSeekers 79T | RiverLeague 156T, ScholarKingdoms 45T | JadeCovenant 22913G/96, RiverLeague 7243G/116, maintain 2234G, ForgeClans 7187G/39, ScholarKingdoms 6350G/76, maintain 1613G, StarborneSeekers 4503G/37, maintain 109G, AetherianVanguard 1837G/23 | 0.56 | 0.56 | Investment 3, Other 1, WartimeRelease 1 |
| Cresset Exchange | Gold | 3 | 99.67 | 4.0% | 0.0% | 4.0% | 50.2% | 46.2% | 64.9% | 5.7% | 1.34 | 1.67 | JadeCovenant 126T, ScholarKingdoms 76T, RiverLeague 73T, AetherianVanguard 14T, StarborneSeekers 10T | StarborneSeekers 81T, RiverLeague 10T | RiverLeague 13T, ScholarKingdoms 7T, StarborneSeekers 1T | StarborneSeekers 2367G/35, maintain 39G, RiverLeague 1704G/41, maintain 1131G, ScholarKingdoms 334G/10, maintain 334G | 1.33 | 1.33 | Investment 3, WartimeRelease 1 |
| Crownmarket | Gold | 9 | 148.00 | 0.4% | 0.0% | 0.4% | 26.5% | 25.9% | 75.4% | 0.0% | 0.08 | 1.11 | ScholarKingdoms 544T, StarborneSeekers 518T, AetherianVanguard 253T, JadeCovenant 17T | ForgeClans 233T, ScholarKingdoms 171T, JadeCovenant 110T | AetherianVanguard 81T, StarborneSeekers 3T, JadeCovenant 1T | ScholarKingdoms 4597G/68, maintain 1465G, ForgeClans 2110G/36, AetherianVanguard 1495G/40, maintain 1465G, JadeCovenant 1019G/17, RiverLeague 820G/15, StarborneSeekers 334G/10, maintain 334G | 0.11 | 0.11 | Other 1 |
| Embermint | Gold | 6 | 172.17 | 0.9% | 0.0% | 0.9% | 46.0% | 44.5% | 56.8% | 0.0% | 0.19 | 1.33 | ScholarKingdoms 346T, ForgeClans 233T, StarborneSeekers 192T, RiverLeague 176T, JadeCovenant 86T | StarborneSeekers 246T, ScholarKingdoms 98T, RiverLeague 86T, JadeCovenant 59T, ForgeClans 15T | ScholarKingdoms 95T, ForgeClans 72T, RiverLeague 1T | StarborneSeekers 6095G/68, RiverLeague 5504G/56, maintain 78G, ScholarKingdoms 4705G/80, maintain 1632G, ForgeClans 2411G/64, maintain 2033G, JadeCovenant 2240G/36, maintain 39G | 0.33 | 0.33 | Other 1, WartimeRelease 1 |
| Gildenspire | Gold | 3 | 138.33 | 1.4% | 0.0% | 1.4% | 80.2% | 76.4% | 32.5% | 0.0% | 0.00 | 1.00 | JadeCovenant 213T, StarborneSeekers 185T, RiverLeague 17T | RiverLeague 212T, JadeCovenant 121T | JadeCovenant 31T | JadeCovenant 8004G/87, maintain 1894G, RiverLeague 2411G/26 | 0.00 | 0.00 | None |
| Golden Mirage | Gold | 5 | 139.20 | 3.0% | 0.0% | 3.0% | 94.3% | 87.8% | 29.5% | 0.0% | 0.14 | 1.20 | JadeCovenant 295T, ForgeClans 131T, RiverLeague 114T, StarborneSeekers 89T, AetherianVanguard 58T, ScholarKingdoms 9T | AetherianVanguard 292T, ScholarKingdoms 187T, StarborneSeekers 111T, RiverLeague 56T, JadeCovenant 33T | StarborneSeekers 83T, AetherianVanguard 32T, JadeCovenant 30T, ForgeClans 25T, RiverLeague 1T | RiverLeague 7753G/84, maintain 934G, StarborneSeekers 3187G/68, maintain 1348G, JadeCovenant 3005G/71, maintain 2089G, AetherianVanguard 2862G/57, maintain 880G, ScholarKingdoms 2090G/36, ForgeClans 178G/6, maintain 178G | 0.20 | 0.20 | Investment 1 |
| Kingsmerch | Gold | 4 | 122.50 | 1.4% | 0.0% | 1.4% | 63.9% | 63.9% | 36.1% | 0.0% | 0.00 | 1.00 | AetherianVanguard 246T, ScholarKingdoms 146T, RiverLeague 98T | ForgeClans 141T, AetherianVanguard 93T, JadeCovenant 74T, StarborneSeekers 40T | RiverLeague 25T, ScholarKingdoms 5T | RiverLeague 4954G/63, maintain 802G, AetherianVanguard 4953G/40, maintain 178G, StarborneSeekers 2633G/27, JadeCovenant 1837G/23, ForgeClans 322G/8, ScholarKingdoms 178G/6, maintain 178G | 0.00 | 0.00 | None |
| Opaline Vault | Gold | 6 | 140.17 | 0.4% | 0.0% | 0.4% | 38.5% | 35.4% | 66.0% | 0.0% | 0.36 | 1.33 | ForgeClans 406T, RiverLeague 156T, StarborneSeekers 144T, ScholarKingdoms 135T | JadeCovenant 149T, ForgeClans 136T, RiverLeague 60T, AetherianVanguard 42T, StarborneSeekers 18T | ForgeClans 47T | ForgeClans 8608G/104, maintain 1955G, RiverLeague 2743G/58, maintain 685G, StarborneSeekers 1741G/41, maintain 1092G, JadeCovenant 1469G/28, ScholarKingdoms 711G/16, maintain 295G, AetherianVanguard 378G/9 | 0.50 | 0.50 | Investment 1, Other 1, WartimeRelease 1 |
| Radiant Hoard | Gold | 7 | 88.71 | 0.6% | 0.0% | 0.6% | 63.0% | 60.5% | 44.0% | 0.0% | 0.00 | 1.00 | RiverLeague 193T, AetherianVanguard 182T, JadeCovenant 166T, StarborneSeekers 80T | StarborneSeekers 229T, ForgeClans 92T, RiverLeague 50T | AetherianVanguard 67T, RiverLeague 50T | RiverLeague 7199G/97, maintain 1582G, StarborneSeekers 6841G/51, AetherianVanguard 2371G/61, maintain 1933G, JadeCovenant 1426G/38, maintain 1426G, ForgeClans 1087G/23, ScholarKingdoms 731G/14 | 0.00 | 0.00 | None |
| Saffron Treasury | Gold | 6 | 155.33 | 2.3% | 0.0% | 2.3% | 71.4% | 65.3% | 50.0% | 2.7% | 1.18 | 1.33 | ScholarKingdoms 491T, RiverLeague 179T, AetherianVanguard 171T, ForgeClans 91T | RiverLeague 232T, ForgeClans 195T, ScholarKingdoms 183T, AetherianVanguard 17T | AetherianVanguard 78T, RiverLeague 25T, ScholarKingdoms 24T, ForgeClans 1T | ScholarKingdoms 9154G/146, maintain 2991G, RiverLeague 3974G/78, maintain 1699G, JadeCovenant 2014G/24, AetherianVanguard 1979G/46, maintain 1129G, ForgeClans 1970G/33, maintain 78G | 1.83 | 1.83 | Investment 5, Other 5, WartimeRelease 1 |
| Starcoin Port | Gold | 5 | 77.60 | 0.3% | 0.0% | 0.3% | 52.1% | 52.1% | 47.9% | 0.0% | 0.00 | 1.00 | JadeCovenant 234T, AetherianVanguard 88T, StarborneSeekers 66T | ForgeClans 77T, RiverLeague 7T | JadeCovenant 55T | ForgeClans 2512G/38, JadeCovenant 1643G/45, maintain 1643G, StarborneSeekers 1360G/23, maintain 109G, RiverLeague 322G/8 | 0.00 | 0.00 | None |
| Suncoin Citadel | Gold | 3 | 155.33 | 2.4% | 0.0% | 2.4% | 41.2% | 40.1% | 61.8% | 7.9% | 1.29 | 1.67 | RiverLeague 311T, AetherianVanguard 110T, JadeCovenant 26T, ForgeClans 19T | ForgeClans 103T, AetherianVanguard 79T, JadeCovenant 72T, RiverLeague 20T | AetherianVanguard 27T, RiverLeague 21T, ForgeClans 1T, JadeCovenant 1T | ForgeClans 5631G/60, maintain 234G, RiverLeague 4791G/75, maintain 2423G, JadeCovenant 4425G/61, maintain 156G, AetherianVanguard 1832G/33, maintain 451G | 2.00 | 2.00 | Investment 5, WartimeRelease 1 |
| Velvet Ledger | Gold | 8 | 121.13 | 0.6% | 0.0% | 0.6% | 54.3% | 54.3% | 45.7% | 1.7% | 0.41 | 1.25 | ForgeClans 616T, AetherianVanguard 159T, StarborneSeekers 79T, RiverLeague 65T, JadeCovenant 27T, ScholarKingdoms 23T | JadeCovenant 265T, ScholarKingdoms 154T, AetherianVanguard 42T, StarborneSeekers 41T, RiverLeague 4T, ForgeClans 1T | ForgeClans 63T, RiverLeague 41T, ScholarKingdoms 19T, JadeCovenant 1T | JadeCovenant 11360G/91, maintain 438G, RiverLeague 3216G/63, maintain 1543G, ForgeClans 2950G/78, maintain 2852G, StarborneSeekers 2340G/34, ScholarKingdoms 2280G/39, maintain 607G, AetherianVanguard 1870G/41, maintain 490G | 0.50 | 0.50 | Other 2, Investment 1, WartimeRelease 1 |
| Ashen Bellows | Production | 6 | 149.17 | 1.7% | 0.0% | 1.7% | 67.5% | 64.9% | 39.4% | 5.6% | 1.34 | 1.17 | ForgeClans 593T, RiverLeague 220T, AetherianVanguard 82T | ForgeClans 224T, AetherianVanguard 190T, RiverLeague 86T | ForgeClans 55T, AetherianVanguard 5T | ForgeClans 9911G/115, maintain 2208G, RiverLeague 7849G/77, maintain 919G, ScholarKingdoms 3132G/29, AetherianVanguard 2279G/44, maintain 605G, StarborneSeekers 1521G/21, JadeCovenant 196G/6 | 2.00 | 2.00 | Investment 11, Other 1 |
| Blackglass Armory | Production | 4 | 156.25 | 1.0% | 0.0% | 1.0% | 65.3% | 60.5% | 49.6% | 0.0% | 0.00 | 1.00 | RiverLeague 306T, JadeCovenant 168T, ForgeClans 151T | ScholarKingdoms 142T | RiverLeague 40T, JadeCovenant 4T | JadeCovenant 3378G/69, maintain 1348G, StarborneSeekers 3132G/29, ScholarKingdoms 1673G/22, RiverLeague 1426G/38, maintain 1426G, ForgeClans 1192G/32, maintain 1192G, AetherianVanguard 916G/16 | 0.00 | 0.00 | None |
| Brasshollow | Production | 12 | 136.58 | 1.3% | 0.0% | 1.3% | 42.8% | 42.0% | 59.5% | 1.6% | 0.61 | 1.25 | ForgeClans 557T, JadeCovenant 429T, ScholarKingdoms 378T, RiverLeague 183T, AetherianVanguard 88T, StarborneSeekers 4T | RiverLeague 210T, ForgeClans 184T, StarborneSeekers 157T, ScholarKingdoms 155T, AetherianVanguard 151T, JadeCovenant 3T | ForgeClans 122T, RiverLeague 53T, JadeCovenant 43T, AetherianVanguard 1T | ForgeClans 5104G/114, maintain 2938G, StarborneSeekers 4394G/47, RiverLeague 3670G/64, maintain 1465G, AetherianVanguard 3188G/40, maintain 117G, ScholarKingdoms 3121G/39, maintain 145G, JadeCovenant 1517G/42, maintain 1340G | 0.83 | 0.83 | Other 6, Investment 3, WartimeRelease 1 |
| Cinderhold | Production | 5 | 86.20 | 0.5% | 0.0% | 0.5% | 55.5% | 54.3% | 46.2% | 6.5% | 1.16 | 1.20 | JadeCovenant 274T, AetherianVanguard 87T, RiverLeague 70T | RiverLeague 148T, ForgeClans 73T, AetherianVanguard 7T, JadeCovenant 5T | JadeCovenant 81T | RiverLeague 4378G/33, maintain 62G, ForgeClans 2411G/26, AetherianVanguard 2255G/27, maintain 50G, JadeCovenant 1479G/38, maintain 1209G | 1.00 | 1.00 | Investment 2, Other 2, WartimeRelease 1 |
| Dawnsmelt Keep | Production | 5 | 178.60 | 0.6% | 0.0% | 0.6% | 65.6% | 63.6% | 41.3% | 0.0% | 0.00 | 1.00 | ForgeClans 354T, AetherianVanguard 344T, RiverLeague 195T | RiverLeague 180T, ForgeClans 141T, StarborneSeekers 105T | ForgeClans 131T, RiverLeague 71T, AetherianVanguard 7T | ForgeClans 6215G/98, maintain 2501G, StarborneSeekers 3412G/30, RiverLeague 2716G/58, maintain 1465G, AetherianVanguard 2339G/46, maintain 958G, JadeCovenant 300G/8 | 0.00 | 0.00 | None |
| Emberforge Bastion | Production | 2 | 185.00 | 1.4% | 0.0% | 1.4% | 91.9% | 88.6% | 17.3% | 0.0% | 0.54 | 2.00 | JadeCovenant 253T, StarborneSeekers 99T, AetherianVanguard 9T, RiverLeague 9T | RiverLeague 206T, AetherianVanguard 111T, ForgeClans 95T, JadeCovenant 88T | JadeCovenant 34T, RiverLeague 2T, AetherianVanguard 1T | RiverLeague 3654G/46, maintain 78G, JadeCovenant 2811G/55, maintain 1192G, ForgeClans 1521G/21, AetherianVanguard 916G/16, StarborneSeekers 373G/11, maintain 373G | 1.00 | 1.00 | WartimeRelease 2 |
| Flintspire Works | Production | 4 | 150.00 | 0.2% | 0.0% | 0.2% | 23.0% | 23.0% | 77.0% | 0.0% | 0.00 | 1.00 | JadeCovenant 209T, ScholarKingdoms 205T, ForgeClans 186T | None | ForgeClans 41T | AetherianVanguard 3132G/29, JadeCovenant 2024G/32, StarborneSeekers 1251G/19, ForgeClans 1231G/33, maintain 1231G, ScholarKingdoms 217G/7, maintain 217G | 0.00 | 0.00 | None |
| Gearstorm Hold | Production | 5 | 104.80 | 0.2% | 0.0% | 0.2% | 39.7% | 39.5% | 60.5% | 0.0% | 0.19 | 1.20 | ScholarKingdoms 330T, ForgeClans 152T, JadeCovenant 32T, AetherianVanguard 10T | ForgeClans 99T, AetherianVanguard 51T, StarborneSeekers 48T | None | ForgeClans 7187G/39, StarborneSeekers 2205G/25, ScholarKingdoms 2161G/59, maintain 2161G, AetherianVanguard 731G/14, RiverLeague 573G/12, JadeCovenant 503G/11 | 0.20 | 0.20 | WartimeRelease 1 |
| Hammerdeep | Production | 9 | 121.33 | 0.7% | 0.0% | 0.7% | 34.3% | 32.0% | 73.8% | 2.8% | 0.73 | 1.22 | JadeCovenant 680T, ScholarKingdoms 265T, StarborneSeekers 120T, RiverLeague 27T | ScholarKingdoms 164T, StarborneSeekers 120T, AetherianVanguard 49T, ForgeClans 17T, JadeCovenant 8T | JadeCovenant 43T, StarborneSeekers 17T | StarborneSeekers 6597G/61, maintain 529G, AetherianVanguard 4394G/33, JadeCovenant 3628G/91, maintain 2989G, RiverLeague 3230G/32, ScholarKingdoms 2424G/29, maintain 189G, ForgeClans 322G/8 | 0.89 | 0.89 | Investment 4, Other 3, WartimeRelease 1 |
| Ironwyrm Foundry | Production | 2 | 61.00 | 0.0% | 0.0% | 0.0% | 58.2% | 58.2% | 41.8% | 0.0% | 0.00 | 1.00 | ForgeClans 80T, ScholarKingdoms 42T | StarborneSeekers 48T, RiverLeague 23T, ScholarKingdoms 4T | None | StarborneSeekers 2205G/25, AetherianVanguard 820G/15, RiverLeague 222G/6, ScholarKingdoms 80G/3, maintain 50G | 0.00 | 0.00 | None |
| Molten Crown | Production | 8 | 163.25 | 1.4% | 0.0% | 1.4% | 63.6% | 60.8% | 45.4% | 2.8% | 0.61 | 1.38 | ScholarKingdoms 469T, StarborneSeekers 284T, RiverLeague 244T, ForgeClans 188T, JadeCovenant 121T | ScholarKingdoms 394T, AetherianVanguard 321T, JadeCovenant 280T, RiverLeague 120T | RiverLeague 53T, StarborneSeekers 45T, ScholarKingdoms 6T, JadeCovenant 2T | JadeCovenant 9402G/84, maintain 371G, AetherianVanguard 8598G/91, RiverLeague 5986G/87, maintain 1170G, ForgeClans 4207G/37, StarborneSeekers 4059G/65, maintain 1426G, ScholarKingdoms 3368G/85, maintain 2142G | 1.00 | 1.00 | Other 5, Investment 2, WartimeRelease 1 |
| Obsidian Kiln | Production | 6 | 71.50 | 0.5% | 0.0% | 0.5% | 70.9% | 70.9% | 29.1% | 0.0% | 0.23 | 1.17 | ForgeClans 216T, AetherianVanguard 87T, ScholarKingdoms 59T, StarborneSeekers 44T, RiverLeague 23T | JadeCovenant 142T, RiverLeague 140T, AetherianVanguard 84T, StarborneSeekers 19T, ScholarKingdoms 2T | ForgeClans 128T, RiverLeague 19T, StarborneSeekers 1T | RiverLeague 6651G/69, maintain 529G, ForgeClans 2891G/77, maintain 2891G, JadeCovenant 2873G/28, AetherianVanguard 2012G/47, maintain 1192G, StarborneSeekers 1517G/24, ScholarKingdoms 222G/6 | 0.17 | 0.17 | WartimeRelease 1 |
| Runehammer Gate | Production | 5 | 65.80 | 0.0% | 0.0% | 0.0% | 9.4% | 9.4% | 90.6% | 0.0% | 0.00 | 1.00 | AetherianVanguard 147T, RiverLeague 123T, JadeCovenant 28T, ScholarKingdoms 22T, ForgeClans 9T | None | AetherianVanguard 21T | JadeCovenant 1019G/17, AetherianVanguard 919G/25, maintain 919G | 0.00 | 0.00 | None |
| Skyfurnace | Production | 4 | 187.25 | 0.9% | 0.0% | 0.9% | 75.7% | 73.0% | 32.7% | 0.0% | 0.53 | 1.75 | RiverLeague 319T, StarborneSeekers 254T, JadeCovenant 150T, ForgeClans 26T | ForgeClans 147T, RiverLeague 15T, JadeCovenant 7T | RiverLeague 29T, StarborneSeekers 28T, JadeCovenant 14T | JadeCovenant 8787G/65, maintain 568G, ForgeClans 7408G/61, RiverLeague 2579G/57, maintain 1079G, AetherianVanguard 2270G/36, ScholarKingdoms 2077G/26, StarborneSeekers 902G/26, maintain 902G | 1.00 | 1.00 | WartimeRelease 2, Investment 1, Other 1 |
| Stonewake Crucible | Production | 11 | 140.45 | 0.7% | 0.0% | 0.7% | 46.0% | 44.7% | 57.5% | 0.0% | 0.06 | 1.09 | JadeCovenant 547T, ScholarKingdoms 388T, StarborneSeekers 312T, ForgeClans 298T | RiverLeague 328T, StarborneSeekers 127T, AetherianVanguard 46T | StarborneSeekers 97T, JadeCovenant 67T, ForgeClans 51T | StarborneSeekers 8422G/127, maintain 2696G, AetherianVanguard 6794G/74, RiverLeague 5867G/58, JadeCovenant 4317G/115, maintain 4317G, ForgeClans 2657G/49, maintain 490G, ScholarKingdoms 1111G/18, maintain 78G | 0.09 | 0.09 | WartimeRelease 1 |
| Thunder Anvil | Production | 2 | 193.00 | 0.8% | 0.0% | 0.8% | 55.4% | 54.9% | 45.3% | 0.0% | 0.78 | 2.00 | ScholarKingdoms 153T, StarborneSeekers 137T, RiverLeague 96T | ScholarKingdoms 104T, RiverLeague 67T, JadeCovenant 65T, StarborneSeekers 28T | ScholarKingdoms 77T, StarborneSeekers 26T | JadeCovenant 2014G/24, ScholarKingdoms 1606G/34, maintain 685G, StarborneSeekers 1327G/28, maintain 507G, RiverLeague 1131G/18 | 1.50 | 1.50 | WartimeRelease 3 |
| Aetherquill | Science | 6 | 138.83 | 0.1% | 0.0% | 0.1% | 46.0% | 46.0% | 54.0% | 0.0% | 0.12 | 1.17 | ScholarKingdoms 298T, StarborneSeekers 268T, RiverLeague 160T, JadeCovenant 107T | JadeCovenant 201T, StarborneSeekers 124T, AetherianVanguard 113T, RiverLeague 101T, ForgeClans 25T, ScholarKingdoms 4T | ScholarKingdoms 43T, StarborneSeekers 25T | StarborneSeekers 4321G/78, maintain 1543G, JadeCovenant 3748G/51, maintain 295G, AetherianVanguard 3282G/40, RiverLeague 2304G/39, maintain 568G, ScholarKingdoms 1573G/42, maintain 1543G, ForgeClans 166G/5 | 0.17 | 0.17 | WartimeRelease 1 |
| Arcstar Repository | Science | 6 | 188.17 | 0.1% | 0.0% | 0.1% | 36.6% | 36.5% | 63.6% | 0.0% | 0.09 | 1.17 | JadeCovenant 363T, ScholarKingdoms 264T, RiverLeague 208T, AetherianVanguard 154T, StarborneSeekers 140T | ForgeClans 127T, JadeCovenant 58T | StarborneSeekers 52T | JadeCovenant 4649G/56, maintain 583G, ForgeClans 3714G/31, StarborneSeekers 3011G/51, maintain 997G, AetherianVanguard 2046G/33, maintain 373G, ScholarKingdoms 2014G/24, RiverLeague 1685G/41, maintain 1036G | 0.17 | 0.17 | WartimeRelease 1 |
| Celestine Scriptorium | Science | 4 | 110.00 | 1.8% | 0.0% | 1.8% | 77.7% | 72.7% | 34.8% | 8.4% | 2.73 | 1.75 | ForgeClans 349T, RiverLeague 42T, JadeCovenant 29T, StarborneSeekers 15T, AetherianVanguard 5T | StarborneSeekers 144T, ForgeClans 29T, JadeCovenant 20T, RiverLeague 12T | ForgeClans 49T, RiverLeague 8T, JadeCovenant 2T | StarborneSeekers 2829G/28, maintain 178G, ForgeClans 2131G/55, maintain 1543G, AetherianVanguard 2007G/24, maintain 31G, RiverLeague 1730G/29, maintain 360G, JadeCovenant 1114G/24, maintain 117G | 3.00 | 3.00 | Investment 7, Other 4, WartimeRelease 1 |
| Dreaming Calculus | Science | 4 | 112.75 | 0.9% | 0.0% | 0.9% | 67.8% | 67.8% | 32.2% | 0.0% | 0.00 | 1.00 | RiverLeague 399T, AetherianVanguard 52T | JadeCovenant 245T, ForgeClans 238T, AetherianVanguard 9T | RiverLeague 90T | ForgeClans 8443G/41, JadeCovenant 6628G/38, ScholarKingdoms 4394G/33, RiverLeague 2228G/60, maintain 2228G, AetherianVanguard 820G/15, StarborneSeekers 177G/5 | 0.00 | 0.00 | None |
| Eclipsed Theorem | Science | 6 | 112.17 | 1.2% | 0.0% | 1.2% | 77.6% | 77.4% | 23.2% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 316T, StarborneSeekers 214T, RiverLeague 75T, ForgeClans 38T, JadeCovenant 30T | ForgeClans 267T, AetherianVanguard 137T, ScholarKingdoms 58T, JadeCovenant 35T | ScholarKingdoms 122T, ForgeClans 24T, RiverLeague 13T, JadeCovenant 12T | ForgeClans 10851G/69, maintain 451G, AetherianVanguard 4139G/35, ScholarKingdoms 2963G/62, maintain 1582G, JadeCovenant 1988G/37, maintain 607G, StarborneSeekers 820G/15, RiverLeague 334G/10, maintain 334G | 0.00 | 0.00 | None |
| Halcyon Loom | Science | 11 | 139.27 | 1.0% | 0.0% | 1.0% | 81.5% | 78.1% | 28.5% | 0.0% | 0.20 | 1.18 | JadeCovenant 365T, ScholarKingdoms 350T, AetherianVanguard 243T, ForgeClans 237T, StarborneSeekers 235T, RiverLeague 102T | JadeCovenant 455T, ForgeClans 444T, StarborneSeekers 326T, ScholarKingdoms 248T, AetherianVanguard 206T, RiverLeague 15T | StarborneSeekers 100T, AetherianVanguard 81T, JadeCovenant 52T, ScholarKingdoms 28T, ForgeClans 25T, RiverLeague 24T | JadeCovenant 13117G/93, maintain 1370G, ForgeClans 9590G/134, maintain 1326G, RiverLeague 7077G/79, maintain 902G, AetherianVanguard 6490G/92, maintain 958G, ScholarKingdoms 5547G/109, maintain 2401G, StarborneSeekers 5194G/101, maintain 2657G | 0.27 | 0.27 | Other 2, WartimeRelease 1 |
| Lunarchive | Science | 10 | 116.40 | 0.9% | 0.0% | 0.9% | 78.7% | 78.3% | 23.3% | 0.0% | 0.00 | 1.00 | RiverLeague 350T, ForgeClans 297T, AetherianVanguard 245T, ScholarKingdoms 221T, StarborneSeekers 51T | RiverLeague 215T, JadeCovenant 210T, ForgeClans 138T, StarborneSeekers 104T, ScholarKingdoms 96T, AetherianVanguard 85T | ForgeClans 100T, ScholarKingdoms 80T, AetherianVanguard 75T, RiverLeague 46T | ForgeClans 12405G/159, maintain 2891G, RiverLeague 8097G/135, maintain 3164G, AetherianVanguard 6904G/98, maintain 1255G, JadeCovenant 6859G/72, ScholarKingdoms 3497G/67, maintain 1660G, StarborneSeekers 320G/9, maintain 50G | 0.00 | 0.00 | None |
| Meridian of Runes | Science | 3 | 181.33 | 0.9% | 0.0% | 0.9% | 55.5% | 53.7% | 51.1% | 0.0% | 0.37 | 1.33 | RiverLeague 279T, JadeCovenant 225T, AetherianVanguard 40T | JadeCovenant 162T, AetherianVanguard 49T, ForgeClans 48T, RiverLeague 40T | AetherianVanguard 38T, RiverLeague 30T | JadeCovenant 6230G/91, maintain 2189G, AetherianVanguard 3055G/29, maintain 271G, RiverLeague 2008G/44, maintain 1092G, StarborneSeekers 1251G/19, ForgeClans 136G/4 | 0.67 | 0.67 | Investment 1, WartimeRelease 1 |
| Nyx Codex | Science | 7 | 108.86 | 0.5% | 0.0% | 0.5% | 50.3% | 50.0% | 50.4% | 0.0% | 0.26 | 1.14 | StarborneSeekers 380T, RiverLeague 146T, AetherianVanguard 122T, ForgeClans 114T | ScholarKingdoms 179T, JadeCovenant 133T, RiverLeague 19T, ForgeClans 2T | StarborneSeekers 29T | ScholarKingdoms 9911G/75, JadeCovenant 7407G/74, RiverLeague 3879G/45, maintain 50G, StarborneSeekers 2274G/55, maintain 1424G, ForgeClans 240G/8, maintain 142G, AetherianVanguard 217G/7, maintain 217G | 0.29 | 0.29 | Other 1, WartimeRelease 1 |
| Observatory of Whispers | Science | 7 | 156.57 | 1.3% | 0.0% | 1.3% | 92.5% | 90.3% | 15.4% | 3.1% | 0.91 | 1.29 | ForgeClans 387T, RiverLeague 310T, ScholarKingdoms 230T, StarborneSeekers 134T, AetherianVanguard 35T | ScholarKingdoms 565T, AetherianVanguard 226T, ForgeClans 210T, StarborneSeekers 136T, RiverLeague 78T | RiverLeague 88T, ForgeClans 69T, StarborneSeekers 64T, ScholarKingdoms 28T, AetherianVanguard 2T | ForgeClans 8298G/108, maintain 2668G, ScholarKingdoms 8105G/122, maintain 1195G, RiverLeague 5539G/117, maintain 3203G, AetherianVanguard 3173G/31, maintain 257G, StarborneSeekers 2085G/50, maintain 1324G, JadeCovenant 177G/5 | 1.43 | 1.43 | Investment 8, Other 2 |
| Prism Oracle | Science | 5 | 154.20 | 0.4% | 0.0% | 0.4% | 30.4% | 29.8% | 72.2% | 0.0% | 0.00 | 1.00 | StarborneSeekers 223T, RiverLeague 183T, ForgeClans 166T, ScholarKingdoms 146T, AetherianVanguard 53T | AetherianVanguard 186T, StarborneSeekers 116T, RiverLeague 62T | StarborneSeekers 36T | AetherianVanguard 6898G/45, StarborneSeekers 4494G/71, maintain 1621G, RiverLeague 3218G/43, ForgeClans 1582G/42, maintain 1582G, JadeCovenant 649G/13 | 0.00 | 0.00 | None |
| Quillspire | Science | 3 | 112.00 | 0.6% | 0.0% | 0.6% | 67.9% | 67.6% | 33.3% | 0.0% | 0.00 | 1.00 | ForgeClans 259T, StarborneSeekers 77T | None | StarborneSeekers 18T | StarborneSeekers 2745G/54, maintain 763G, RiverLeague 2014G/24, ForgeClans 1838G/50, maintain 1838G, JadeCovenant 1521G/21 | 0.00 | 0.00 | None |
| Radiant Lexicon | Science | 5 | 106.80 | 2.8% | 0.0% | 2.8% | 35.2% | 33.0% | 68.5% | 11.2% | 2.43 | 1.20 | JadeCovenant 192T, RiverLeague 185T, ForgeClans 103T, ScholarKingdoms 54T | ScholarKingdoms 82T, AetherianVanguard 51T, RiverLeague 16T, StarborneSeekers 16T | RiverLeague 42T, ScholarKingdoms 1T | ScholarKingdoms 5981G/72, maintain 257G, AetherianVanguard 4775G/34, RiverLeague 3498G/55, maintain 1178G, StarborneSeekers 1673G/22, ForgeClans 109G/4, maintain 109G | 2.60 | 2.60 | Investment 13 |
| Sapphire Mnemos | Science | 5 | 138.80 | 0.9% | 0.0% | 0.9% | 58.8% | 52.3% | 61.7% | 0.0% | 1.44 | 1.20 | RiverLeague 303T, ForgeClans 203T, JadeCovenant 122T, StarborneSeekers 66T | ScholarKingdoms 142T, StarborneSeekers 127T, RiverLeague 60T | ForgeClans 52T, RiverLeague 45T, StarborneSeekers 5T | StarborneSeekers 4102G/52, maintain 429G, RiverLeague 3794G/75, maintain 2276G, ScholarKingdoms 2205G/25, ForgeClans 1426G/38, maintain 1426G, JadeCovenant 916G/16 | 2.00 | 2.00 | Other 5, Investment 4, WartimeRelease 1 |
| Starglass Athenaeum | Science | 3 | 123.00 | 3.8% | 0.0% | 3.8% | 97.3% | 93.0% | 15.7% | 9.2% | 2.98 | 1.67 | ForgeClans 351T, JadeCovenant 14T, StarborneSeekers 3T, AetherianVanguard 1T | JadeCovenant 262T, AetherianVanguard 174T, RiverLeague 68T, ScholarKingdoms 40T, ForgeClans 10T | ForgeClans 31T, JadeCovenant 2T | JadeCovenant 20191G/84, maintain 181G, ForgeClans 3009G/69, maintain 2049G, AetherianVanguard 2205G/25, RiverLeague 503G/11, ScholarKingdoms 136G/4 | 3.67 | 3.67 | Investment 10, Other 1 |
| Voidlight Archive | Science | 3 | 178.00 | 0.4% | 0.0% | 0.4% | 34.6% | 27.5% | 77.9% | 0.0% | 0.56 | 1.67 | ScholarKingdoms 201T, ForgeClans 182T, StarborneSeekers 137T, AetherianVanguard 14T | RiverLeague 72T, ScholarKingdoms 33T, ForgeClans 9T | ScholarKingdoms 3T, ForgeClans 1T | RiverLeague 6432G/45, StarborneSeekers 3055G/53, maintain 780G, ScholarKingdoms 1056G/23, maintain 334G, ForgeClans 270G/7 | 1.00 | 1.00 | WartimeRelease 3 |

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

