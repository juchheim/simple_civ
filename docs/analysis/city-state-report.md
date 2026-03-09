# City-State Simulation Report

Generated: 2026-03-09T21:07:49.289Z

## Data Coverage
- Simulations processed: 100
- Simulations with city-state telemetry: 100
- Simulations missing city-state telemetry: 0
- Total city-states created: 368
- Total city-state active turns: 49307
- Total contested turns: 635 (No Suz: 122, Close-race: 513)
- Total turnover-window turns: 29514
- Total flip-window turns: 28506
- Total safe-lead incumbent turns: 22899
- Total hotspot turns: 827
- Contest telemetry coverage (city-state entries): 368 with split fields, 0 legacy-only
- Global suzerain flip rate: 0.60 per 100 active turns
- True ownership turnover rate: 0.60 per 100 active turns
- Average unique suzerains per city-state: 1.23
- Average city-states created per telemetry simulation: 3.68
- Average surviving city-states at game end (telemetry sims): 3.65



## Creation Timing
- Simulations with at least one city-state created: 84/100 (84.0%)
- First city-state creation turn (min / p25 / median / p75 / max): 70 / 99 / 136 / 173 / 332
- First city-state creation turn (average, sims with any): 143.3

## Map-Size Creation Rates
| Map | Sims | Telemetry Sims | Sims with >=1 CS | Share with >=1 CS | Total Created | Avg Created / Telemetry Sim | Avg First CS Turn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tiny | 20 | 20 | 13 | 65.0% | 20 | 1.00 | 165.5 |
| Small | 20 | 20 | 12 | 60.0% | 23 | 1.15 | 157.4 |
| Standard | 20 | 20 | 19 | 95.0% | 69 | 3.45 | 124.9 |
| Large | 20 | 20 | 20 | 100.0% | 110 | 5.50 | 125.2 |
| Huge | 20 | 20 | 20 | 100.0% | 146 | 7.30 | 156.1 |

## Camp-Clearing Activation Funnel
- Camp-clearing episodes observed: 5501
- Direct starts in Ready: 1989 (36.2%)
- Episodes that reached Ready: 2976 (54.1%)
- Episodes with sighting telemetry: 2649 (48.2%)
- Sighted -> prep start (avg / median): 113.92 / 98 turns
- Prep start -> first Ready (avg / median): 2.64 / 0 turns
- Prep start -> self clear (avg / median): 13.70 / 10 turns
- Total prep duration (avg / median): 6.55 / 0 turns
- Timeouts after reaching Ready: 119 (14.9% of timeouts)
- Ready turn diagnostics: no contact 5232, adjacent contact 806, attack opportunity 2629, stalled opportunity 1460, power disadvantage 1605, progress 1533
- Ready-timeout primary breakdown: no contact 76, declined attack 24, power collapse 19, other 0
- War-interrupted episodes: 1970 (35.8%)
- Cleared-by-other breakdown: lacked military 33, late start 73, other 40
- Initial prep state mix: Buildup 1295, Gathering 49, Positioning 2168, Ready 1989

### Camp Outcomes
| Outcome | Episodes | Share |
| --- | --- | --- |
| ClearedBySelf | 346 | 6.3% |
| ClearedByOther | 146 | 2.7% |
| TimedOut | 797 | 14.5% |
| WartimeEmergencyCancelled | 1970 | 35.8% |
| OtherCancelled | 2163 | 39.3% |
| StillActive | 79 | 1.4% |

### Camp Funnel By Readiness
| Readiness | Episodes | Self Clears | Self Clear Rate | Timeouts | Timeout Rate | Avg Prep Turns | Avg Prep->Ready | Reached Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PreArmy | 1100 | 9 | 0.8% | 424 | 38.5% | 8.80 | 8.20 | 19.6% |
| ArmyTech | 2394 | 114 | 4.8% | 248 | 10.4% | 5.86 | 1.90 | 77.5% |
| ArmyFielded | 2007 | 223 | 11.1% | 125 | 6.2% | 6.16 | 2.82 | 45.0% |

### Slowest Prep Episodes
| Map | Seed | Civ | Outcome | Readiness | Initial State | Sighted->Prep | Total Prep | Prep->Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Huge | 419019 | JadeCovenant | StillActive | ArmyFielded | Positioning | n/a | 197T | n/a |
| Large | 301001 | RiverLeague | StillActive | ArmyFielded | Positioning | 131 | 192T | 21 |
| Large | 307007 | ForgeClans | StillActive | ArmyTech | Buildup | n/a | 189T | n/a |
| Huge | 414014 | JadeCovenant | StillActive | ArmyFielded | Ready | n/a | 172T | 0 |
| Standard | 207007 | JadeCovenant | StillActive | ArmyFielded | Positioning | 164 | 153T | n/a |
| Huge | 401001 | JadeCovenant | StillActive | ArmyFielded | Positioning | 200 | 143T | n/a |
| Large | 307007 | AetherianVanguard | StillActive | ArmyFielded | Ready | n/a | 136T | 0 |
| Large | 302002 | ForgeClans | StillActive | ArmyFielded | Positioning | n/a | 127T | n/a |
| Huge | 410010 | AetherianVanguard | TimedOut | ArmyTech | Positioning | n/a | 122T | 27 |
| Large | 318018 | JadeCovenant | ClearedBySelf | PreArmy | Buildup | n/a | 102T | 15 |

## Suzerainty vs Winning
- Winner average suzerain turns: 168.72
- Non-winner average suzerain turns: 102.43
- Winner average city-state investment: 4299.6G
- Non-winner average city-state investment: 2489.2G
- Winners with any suzerainty: 68/93 (73.1%)
- Winners with any city-state investment: 71/93 (76.3%)
- Participant win rate with any suzerainty: 27.8%
- Participant win rate without suzerainty: 14.3%
- Participant win rate with any city-state investment: 22.8%
- Correlation (suzerain turns -> win flag): 0.159
- Correlation (city-state gold invested -> win flag): 0.194
- Winner share of sim-wide suzerain turns (when any suzerainty existed): 45.8%

## Investment Mix
- Total city-state investment: 1213815G across 16120 actions
- Maintenance investment: 236916G (19.5%) across 6402 actions (39.7%)
- Challenger investment: 976899G (80.5%) across 9718 actions (60.3%)
- Maintenance gold per suzerain turn: 4.82
- Maintenance actions per 100 suzerain turns: 13.02

## Turnover Diagnostics
- Turnover-window challenger investment: 952180G across 9204 actions
- Flip-window challenger investment: 937450G across 9019 actions
- Deep-challenge investment: 24674G across 513 actions
- Neutral-claim investment: 45G across 1 actions
- Passive contestation pulses: 15794
- Passive contestation close-race pulses: 12355
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
- Passive-assisted suzerainty changes: 48 (16.2% of non-passive changes)
- Passive-assisted true ownership turnovers: 47 (15.9% of ownership turnover)
- Passive-assisted ownership conversion per 100 close-race pulses: 0.38
- Passive-involved ownership conversion per 100 close-race pulses: 0.38
- Passive-assisted ownership causes: WartimeRelease 38, Other 9
- Pair-fatigue-triggered investment: 43630G across 593 actions
- Pair-fatigue share of challenger spend: 4.5%
- Safe-maintenance investment: 39G across 1 actions
- Focus turns: 36013 (challenge 29409, maintenance 6604)
- Focus assignments: 747, focus switches: 61
- Flip conversion per 100 turnover-window turns: 1.01
- True ownership conversion per 100 turnover-window turns: 1.00
- Flip conversion per 100 challenge-focus turns: 1.01
- Safe-maintenance share of maintenance spend: 0.0%

## Flip Cause Summary
| Cause | Suzerainty Changes | True Ownership Turnovers | State Change Share | Ownership Share |
| --- | --- | --- | --- | --- |
| Investment | 173 | 172 | 58.2% | 58.3% |
| PassiveContestation | 0 | 0 | 0.0% | 0.0% |
| WartimeRelease | 43 | 42 | 14.5% | 14.2% |
| WarBreak | 0 | 0 | 0.0% | 0.0% |
| Other | 81 | 81 | 27.3% | 27.5% |

## Hotspot Diagnostics
- Hotspot turn share of active turns: 1.7%
- City-state instances with any hotspot time: 22/368
- True ownership turnovers occurring in hotspot instances: 225 / 295

## Hotspot Instances
| Map | Seed | City-State | Yield | Created | Active | Hotspot | Hotspot Share | Ownership Turnovers | Suz Changes | Turnover Pair | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Huge | 403003 | Quillspire | Science | 207 | 159T | 126T | 79.2% | 36 | 36 | RiverLeague <> JadeCovenant 13, AetherianVanguard <> RiverLeague 12, AetherianVanguard <> JadeCovenant 10, RiverLeague <> ForgeClans 1 | Investment 23, Other 13 |
| Huge | 408008 | Lunarchive | Science | 202 | 264T | 81T | 30.7% | 27 | 27 | JadeCovenant <> ScholarKingdoms 14, JadeCovenant <> RiverLeague 9, RiverLeague <> ScholarKingdoms 4 | Investment 17, Other 10 |
| Large | 312012 | Silverbarley | Food | 218 | 176T | 52T | 29.5% | 22 | 22 | RiverLeague <> JadeCovenant 10, ScholarKingdoms <> RiverLeague 8, ScholarKingdoms <> JadeCovenant 4 | Investment 20, Other 2 |
| Huge | 410010 | Opaline Vault | Gold | 213 | 145T | 34T | 23.4% | 15 | 15 | StarborneSeekers <> ForgeClans 15 | Investment 13, Other 2 |
| Huge | 420020 | Lunarchive | Science | 108 | 152T | 94T | 61.8% | 13 | 13 | ForgeClans <> JadeCovenant 13 | Investment 11, Other 2 |
| Huge | 403003 | Saffron Treasury | Gold | 135 | 230T | 66T | 28.7% | 13 | 13 | StarborneSeekers <> JadeCovenant 8, JadeCovenant <> ForgeClans 5 | Investment 8, Other 4, WartimeRelease 1 |
| Huge | 410010 | Amber Orchard | Food | 115 | 243T | 64T | 26.3% | 13 | 13 | JadeCovenant <> ForgeClans 13 | Investment 11, Other 2 |
| Standard | 218018 | Evergrain Vale | Food | 97 | 231T | 40T | 17.3% | 10 | 10 | RiverLeague <> ScholarKingdoms 10 | Other 5, Investment 4, WartimeRelease 1 |
| Huge | 402002 | Halcyon Loom | Science | 216 | 280T | 16T | 5.7% | 9 | 9 | RiverLeague <> ForgeClans 9 | Other 5, Investment 4 |
| Huge | 402002 | Hearthbloom | Food | 226 | 270T | 33T | 12.2% | 8 | 8 | RiverLeague <> JadeCovenant 8 | Investment 8 |
| Huge | 420020 | Starglass Athenaeum | Science | 210 | 51T | 31T | 60.8% | 7 | 7 | AetherianVanguard <> RiverLeague 7 | Investment 4, Other 3 |
| Tiny | 2002 | Kingsmerch | Gold | 141 | 211T | 26T | 12.3% | 6 | 6 | StarborneSeekers <> RiverLeague 6 | Investment 3, Other 3 |
| Small | 106006 | Thistleheart | Food | 243 | 58T | 25T | 43.1% | 6 | 6 | AetherianVanguard <> JadeCovenant 6 | Other 4, Investment 2 |
| Standard | 215015 | Brasshollow | Production | 156 | 184T | 24T | 13.0% | 6 | 6 | AetherianVanguard <> JadeCovenant 6 | Investment 5, Other 1 |
| Huge | 413013 | Quillspire | Science | 232 | 106T | 22T | 20.8% | 6 | 6 | AetherianVanguard <> StarborneSeekers 6 | Investment 3, WartimeRelease 2, Other 1 |
| Large | 308008 | Wildroot Sanctum | Food | 165 | 126T | 22T | 17.5% | 5 | 5 | ScholarKingdoms <> StarborneSeekers 5 | Investment 5 |

## Hotspot City Names (Cross-Sim Aggregate)
| City-State | Yield | Avg Hotspot Turns | Hotspot Share | Avg Ownership Turnovers | Avg Suz Changes | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- |
| Lunarchive | Science | 17.5T | 13.1% | 4.30 | 4.30 | Investment 31, Other 12 |
| Quillspire | Science | 37.0T | 26.8% | 10.50 | 10.50 | Investment 26, Other 14, WartimeRelease 2 |
| Silverbarley | Food | 5.2T | 3.6% | 2.70 | 2.70 | Investment 22, Other 3, WartimeRelease 2 |
| Saffron Treasury | Gold | 13.2T | 6.8% | 3.20 | 3.20 | Investment 8, Other 4, WartimeRelease 4 |
| Opaline Vault | Gold | 4.3T | 3.2% | 1.88 | 1.88 | Investment 13, Other 2 |
| Amber Orchard | Food | 10.7T | 7.6% | 2.17 | 2.17 | Investment 11, Other 2 |
| Evergrain Vale | Food | 10.0T | 6.9% | 2.50 | 2.50 | Other 5, Investment 4, WartimeRelease 1 |
| Kingsmerch | Gold | 2.4T | 1.7% | 0.91 | 0.91 | Other 4, Investment 3, WartimeRelease 3 |
| Embermint | Gold | 2.8T | 2.5% | 1.13 | 1.13 | Investment 5, Other 3, WartimeRelease 1 |
| Halcyon Loom | Science | 2.3T | 1.2% | 1.29 | 1.29 | Other 5, Investment 4 |
| Hearthbloom | Food | 11.0T | 6.5% | 2.67 | 2.67 | Investment 8 |
| Starglass Athenaeum | Science | 3.4T | 2.9% | 0.89 | 0.89 | Investment 4, Other 3, WartimeRelease 1 |

## Civ Performance
| Civ | Games | Wins | Win% | Avg Suz Turns | Avg Invested Gold | Avg Maintenance Gold | Avg Invest Actions | Win% (Suz>0) | Win% (Suz=0) | Top Suz Claims |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 74 | 16 | 21.6% | 121.57 | 2052.1 | 437.6 | 31.58 | 16.7% | 28.1% | 69 |
| ScholarKingdoms | 70 | 10 | 14.3% | 97.97 | 1968.9 | 394.8 | 30.36 | 23.3% | 0.0% | 58 |
| RiverLeague | 70 | 15 | 21.4% | 150.66 | 3693.5 | 794.1 | 46.07 | 22.2% | 20.0% | 68 |
| AetherianVanguard | 71 | 21 | 29.6% | 103.03 | 2746.0 | 508.4 | 37.46 | 36.8% | 21.2% | 58 |
| StarborneSeekers | 68 | 20 | 29.4% | 117.01 | 3560.6 | 636.2 | 44.21 | 43.9% | 7.4% | 61 |
| JadeCovenant | 67 | 11 | 16.4% | 112.13 | 3410.4 | 626.1 | 41.30 | 25.0% | 6.5% | 53 |

## Turnover Pressure By Civ
| Civ | Avg Turnover Gold | Avg Deep Gold | Avg Neutral Gold | Avg Pair-Fatigue Gold | Avg Safe Maint Gold | Avg Focus Challenge T | Avg Focus Maint T | Focus Switches / Game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 1546.5 | 68.0 | 0.0 | 57.6 | 0.0 | 66.04 | 16.00 | 0.15 |
| ScholarKingdoms | 1518.0 | 55.4 | 0.6 | 92.0 | 0.0 | 78.80 | 9.53 | 0.13 |
| RiverLeague | 2835.9 | 63.5 | 0.0 | 92.6 | 0.0 | 70.90 | 20.19 | 0.24 |
| AetherianVanguard | 2192.2 | 45.4 | 0.0 | 86.2 | 0.5 | 57.96 | 15.18 | 0.10 |
| StarborneSeekers | 2846.8 | 77.6 | 0.0 | 93.6 | 0.0 | 79.26 | 15.19 | 0.12 |
| JadeCovenant | 2742.3 | 42.0 | 0.0 | 208.4 | 0.0 | 67.73 | 18.34 | 0.13 |

## Yield-Type Summary
| Yield | City-States | Avg Active Turns | Contested Turn Share | No Suz Share | Close-Race Share | Flip Rate /100T | Avg Unique Suz | Surviving | Removed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Science | 88 | 130.38 | 1.3% | 0.0% | 1.3% | 0.99 | 1.20 | 86 | 2 |
| Production | 95 | 138.91 | 0.7% | 0.0% | 0.7% | 0.23 | 1.17 | 95 | 0 |
| Food | 96 | 124.86 | 2.0% | 1.0% | 1.0% | 0.75 | 1.23 | 95 | 1 |
| Gold | 89 | 142.15 | 1.1% | 0.0% | 1.1% | 0.50 | 1.30 | 89 | 0 |

## Yield Turnover Windows
| Yield | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share |
| --- | --- | --- | --- | --- |
| Science | 60.4% | 58.1% | 46.8% | 3.2% |
| Production | 52.3% | 50.9% | 52.0% | 0.3% |
| Food | 61.2% | 58.9% | 45.1% | 2.2% |
| Gold | 66.0% | 63.6% | 41.6% | 1.2% |

## City-State Suzerainty Ledger
| City-State | Yield | Appearances | Avg Active Turns | Contested Share | No Suz Share | Close-Race Share | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share | Flip Rate /100T | Avg Unique Suz | Suzerain Turns by Civ | Focus Challenge by Civ | Focus Maintenance by Civ | Investment by Civ (Gold/Actions) | Avg Suz Changes | Avg Ownership Turnovers | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amber Orchard | Food | 6 | 141.00 | 2.0% | 0.0% | 2.0% | 68.4% | 61.3% | 55.0% | 7.6% | 1.54 | 1.17 | AetherianVanguard 389T, JadeCovenant 212T, RiverLeague 94T, ForgeClans 93T, StarborneSeekers 58T | ForgeClans 470T, StarborneSeekers 213T, RiverLeague 59T, JadeCovenant 12T | AetherianVanguard 99T, ForgeClans 2T, JadeCovenant 2T | StarborneSeekers 8443G/41, JadeCovenant 7301G/73, maintain 995G, ForgeClans 2448G/37, maintain 72G, AetherianVanguard 1448G/40, maintain 1448G, RiverLeague 503G/11 | 2.17 | 2.17 | Investment 11, Other 2 |
| Bramble Feast | Food | 9 | 148.11 | 0.1% | 0.0% | 0.1% | 63.2% | 62.5% | 38.9% | 1.2% | 0.45 | 1.33 | AetherianVanguard 720T, JadeCovenant 425T, StarborneSeekers 53T, RiverLeague 49T, ScholarKingdoms 49T, ForgeClans 37T | StarborneSeekers 463T, JadeCovenant 261T, ScholarKingdoms 242T, ForgeClans 237T, RiverLeague 208T, AetherianVanguard 19T | JadeCovenant 79T, AetherianVanguard 64T, ScholarKingdoms 1T | ForgeClans 14777G/78, StarborneSeekers 9902G/90, maintain 919G, RiverLeague 7069G/78, maintain 234G, JadeCovenant 6761G/110, maintain 1760G, ScholarKingdoms 5047G/54, maintain 78G, AetherianVanguard 4705G/120, maintain 3526G | 0.67 | 0.67 | Investment 3, Other 2, WartimeRelease 1 |
| Dawnharvest | Food | 8 | 113.25 | 0.3% | 0.0% | 0.3% | 65.7% | 65.6% | 34.5% | 0.0% | 0.11 | 1.13 | RiverLeague 325T, ForgeClans 272T, ScholarKingdoms 140T, JadeCovenant 131T, AetherianVanguard 38T | AetherianVanguard 251T, StarborneSeekers 195T, ScholarKingdoms 125T, RiverLeague 124T, JadeCovenant 84T | RiverLeague 145T, JadeCovenant 26T, AetherianVanguard 1T | RiverLeague 8221G/124, maintain 3008G, StarborneSeekers 6764G/42, AetherianVanguard 5413G/54, maintain 50G, JadeCovenant 1434G/35, maintain 763G, ScholarKingdoms 1359G/32, maintain 295G, ForgeClans 50G/2, maintain 50G | 0.13 | 0.13 | WartimeRelease 1 |
| Evergrain Vale | Food | 4 | 145.25 | 1.9% | 0.0% | 1.9% | 57.8% | 53.9% | 51.3% | 6.9% | 1.72 | 1.25 | RiverLeague 247T, ForgeClans 182T, ScholarKingdoms 152T | ScholarKingdoms 78T, RiverLeague 13T | RiverLeague 4T, ScholarKingdoms 2T | ScholarKingdoms 3223G/46, maintain 265G, ForgeClans 2851G/43, maintain 646G, RiverLeague 2780G/64, maintain 1922G, StarborneSeekers 1131G/18 | 2.50 | 2.50 | Other 5, Investment 4, WartimeRelease 1 |
| Fernsong | Food | 9 | 132.44 | 0.8% | 0.0% | 0.8% | 54.0% | 49.7% | 60.2% | 1.3% | 0.42 | 1.22 | ScholarKingdoms 374T, RiverLeague 330T, ForgeClans 193T, JadeCovenant 165T, StarborneSeekers 130T | AetherianVanguard 150T, StarborneSeekers 123T, JadeCovenant 20T, ScholarKingdoms 14T | JadeCovenant 25T | ScholarKingdoms 6601G/112, maintain 2137G, StarborneSeekers 4825G/36, maintain 50G, RiverLeague 3726G/83, maintain 1760G, ForgeClans 607G/19, maintain 287G, AetherianVanguard 573G/12, JadeCovenant 439G/11, maintain 117G | 0.56 | 0.56 | Investment 2, Other 2, WartimeRelease 1 |
| Greenstar Hollow | Food | 3 | 85.33 | 0.4% | 0.0% | 0.4% | 90.2% | 90.2% | 9.8% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 150T, JadeCovenant 101T, AetherianVanguard 5T | RiverLeague 147T | None | RiverLeague 12436G/60, ScholarKingdoms 1976G/28, maintain 109G, JadeCovenant 109G/4, maintain 109G | 0.00 | 0.00 | None |
| Hearthbloom | Food | 3 | 168.33 | 1.0% | 0.0% | 1.0% | 65.5% | 64.6% | 41.2% | 6.5% | 1.58 | 1.33 | JadeCovenant 271T, RiverLeague 215T, AetherianVanguard 19T | JadeCovenant 1T | JadeCovenant 45T | StarborneSeekers 6859G/57, JadeCovenant 6427G/77, maintain 2033G, RiverLeague 1034G/26, maintain 689G | 2.67 | 2.67 | Investment 8 |
| Moonmeadow | Food | 6 | 124.00 | 0.3% | 0.0% | 0.3% | 46.1% | 46.1% | 53.9% | 0.0% | 0.00 | 1.00 | RiverLeague 236T, JadeCovenant 199T, StarborneSeekers 198T, ScholarKingdoms 111T | AetherianVanguard 314T, StarborneSeekers 171T, RiverLeague 148T | JadeCovenant 2T | AetherianVanguard 7296G/74, StarborneSeekers 2285G/37, maintain 109G, RiverLeague 1131G/18, ScholarKingdoms 802G/22, maintain 802G, JadeCovenant 529G/15, maintain 529G, ForgeClans 98G/3 | 0.00 | 0.00 | None |
| Nectarwind | Food | 5 | 141.80 | 17.5% | 17.2% | 0.3% | 49.9% | 47.2% | 40.3% | 0.0% | 0.71 | 1.20 | AetherianVanguard 263T, ScholarKingdoms 149T, ForgeClans 139T, RiverLeague 36T | JadeCovenant 97T, StarborneSeekers 64T, ForgeClans 17T | ForgeClans 50T, AetherianVanguard 27T, ScholarKingdoms 25T | AetherianVanguard 8109G/98, maintain 1480G, JadeCovenant 2692G/39, StarborneSeekers 2633G/27, RiverLeague 573G/12, ForgeClans 529G/15, maintain 529G, ScholarKingdoms 409G/12, maintain 142G | 1.00 | 0.60 | Investment 2, WartimeRelease 1 |
| Rainpetal Court | Food | 10 | 97.00 | 0.6% | 0.0% | 0.6% | 57.7% | 56.5% | 46.0% | 0.0% | 0.10 | 1.10 | JadeCovenant 281T, RiverLeague 259T, ForgeClans 159T, ScholarKingdoms 122T, AetherianVanguard 76T, StarborneSeekers 73T | JadeCovenant 118T, ScholarKingdoms 57T, StarborneSeekers 50T, AetherianVanguard 38T | JadeCovenant 44T, RiverLeague 42T, StarborneSeekers 5T | JadeCovenant 9889G/125, maintain 3125G, StarborneSeekers 5334G/70, maintain 178G, RiverLeague 3782G/77, maintain 1582G, AetherianVanguard 2887G/44, ScholarKingdoms 1310G/29, maintain 490G, ForgeClans 731G/14 | 0.10 | 0.10 | WartimeRelease 1 |
| Silverbarley | Food | 10 | 144.80 | 2.5% | 0.0% | 2.5% | 79.8% | 75.4% | 35.2% | 3.6% | 1.86 | 1.60 | JadeCovenant 765T, RiverLeague 225T, StarborneSeekers 169T, ForgeClans 166T, AetherianVanguard 120T, ScholarKingdoms 3T | ScholarKingdoms 333T, RiverLeague 260T, JadeCovenant 138T, AetherianVanguard 118T, StarborneSeekers 80T, ForgeClans 35T | JadeCovenant 252T, RiverLeague 79T, AetherianVanguard 74T, ForgeClans 25T, StarborneSeekers 19T, ScholarKingdoms 1T | JadeCovenant 12172G/206, maintain 5563G, RiverLeague 9766G/93, maintain 772G, StarborneSeekers 5892G/94, maintain 1738G, ForgeClans 4660G/82, maintain 1931G, AetherianVanguard 4243G/76, maintain 1465G, ScholarKingdoms 2774G/46, maintain 64G | 2.70 | 2.70 | Investment 22, Other 3, WartimeRelease 2 |
| Sunseed Haven | Food | 9 | 136.44 | 1.0% | 0.0% | 1.0% | 66.1% | 66.0% | 35.0% | 0.0% | 0.24 | 1.33 | StarborneSeekers 607T, RiverLeague 313T, ForgeClans 170T, AetherianVanguard 92T, ScholarKingdoms 46T | ForgeClans 669T, AetherianVanguard 278T, StarborneSeekers 219T, RiverLeague 185T, JadeCovenant 8T | StarborneSeekers 124T, RiverLeague 48T, ForgeClans 36T, ScholarKingdoms 25T, AetherianVanguard 1T | RiverLeague 12339G/88, maintain 1580G, StarborneSeekers 11299G/154, maintain 2579G, ForgeClans 5778G/80, maintain 437G, AetherianVanguard 4464G/57, ScholarKingdoms 1798G/37, maintain 490G, JadeCovenant 1509G/27 | 0.33 | 0.33 | WartimeRelease 2, Investment 1 |
| Thistleheart | Food | 7 | 99.00 | 0.6% | 0.0% | 0.6% | 19.2% | 17.0% | 85.1% | 3.6% | 0.87 | 1.14 | JadeCovenant 304T, StarborneSeekers 291T, ForgeClans 83T, AetherianVanguard 15T | AetherianVanguard 20T, JadeCovenant 15T | JadeCovenant 10T, AetherianVanguard 1T | StarborneSeekers 2014G/24, JadeCovenant 1848G/36, maintain 785G, AetherianVanguard 1042G/21, maintain 156G, ForgeClans 109G/4, maintain 109G | 0.86 | 0.86 | Other 4, Investment 2 |
| Verdant Myth | Food | 5 | 69.20 | 0.6% | 0.0% | 0.6% | 66.2% | 66.2% | 33.8% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 241T, AetherianVanguard 57T, RiverLeague 48T | ForgeClans 110T, JadeCovenant 61T, ScholarKingdoms 43T | ScholarKingdoms 43T, RiverLeague 25T | JadeCovenant 6133G/47, ScholarKingdoms 3064G/62, maintain 1543G, AetherianVanguard 1995G/30, ForgeClans 1308G/23, RiverLeague 178G/6, maintain 178G | 0.00 | 0.00 | None |
| Wildroot Sanctum | Food | 2 | 115.00 | 3.9% | 0.0% | 3.9% | 85.2% | 77.8% | 34.3% | 9.6% | 2.17 | 1.50 | RiverLeague 104T, StarborneSeekers 95T, ScholarKingdoms 31T | ScholarKingdoms 166T, StarborneSeekers 4T | RiverLeague 53T, StarborneSeekers 15T | ScholarKingdoms 4126G/46, maintain 101G, StarborneSeekers 2992G/61, maintain 1312G, RiverLeague 919G/25, maintain 919G | 2.50 | 2.50 | Investment 5 |
| Aureate Crown | Gold | 3 | 242.67 | 1.2% | 0.0% | 1.2% | 80.6% | 78.8% | 25.1% | 0.0% | 0.00 | 1.00 | StarborneSeekers 331T, ForgeClans 259T, ScholarKingdoms 138T | JadeCovenant 316T, RiverLeague 303T, ScholarKingdoms 187T | StarborneSeekers 25T, ForgeClans 13T | JadeCovenant 13297G/76, RiverLeague 6674G/59, AetherianVanguard 5759G/47, ForgeClans 1504G/40, maintain 1504G, StarborneSeekers 958G/26, maintain 958G, ScholarKingdoms 946G/23, maintain 373G | 0.00 | 0.00 | None |
| Auric Bazaar | Gold | 4 | 122.75 | 0.8% | 0.0% | 0.8% | 96.1% | 96.1% | 4.1% | 0.0% | 0.20 | 1.25 | AetherianVanguard 269T, RiverLeague 134T, ForgeClans 86T, JadeCovenant 2T | JadeCovenant 149T, AetherianVanguard 131T, ScholarKingdoms 84T, StarborneSeekers 84T | RiverLeague 104T, AetherianVanguard 83T, ForgeClans 25T | JadeCovenant 10824G/59, AetherianVanguard 7631G/78, maintain 1491G, StarborneSeekers 3932G/47, RiverLeague 1543G/41, maintain 1543G, ScholarKingdoms 438G/10, ForgeClans 334G/10, maintain 334G | 0.25 | 0.25 | Investment 1 |
| Brassmoon Mint | Gold | 6 | 90.83 | 0.7% | 0.0% | 0.7% | 60.7% | 58.0% | 47.5% | 0.0% | 0.37 | 1.33 | ForgeClans 165T, JadeCovenant 154T, ScholarKingdoms 105T, RiverLeague 77T, AetherianVanguard 44T | ScholarKingdoms 173T, ForgeClans 103T, RiverLeague 81T, AetherianVanguard 4T | JadeCovenant 103T, AetherianVanguard 33T, ForgeClans 26T, ScholarKingdoms 1T | StarborneSeekers 6628G/38, RiverLeague 6205G/52, ScholarKingdoms 2798G/44, maintain 312G, ForgeClans 2491G/45, maintain 349G, AetherianVanguard 1552G/40, maintain 1114G, JadeCovenant 1426G/38, maintain 1426G | 0.33 | 0.33 | WartimeRelease 2 |
| Coinfire Crossing | Gold | 5 | 173.00 | 0.2% | 0.0% | 0.2% | 47.4% | 47.4% | 52.7% | 0.0% | 0.12 | 1.20 | ScholarKingdoms 415T, ForgeClans 323T, RiverLeague 127T | ScholarKingdoms 155T, JadeCovenant 102T | ForgeClans 28T | ScholarKingdoms 4910G/79, maintain 802G, RiverLeague 4775G/34, ForgeClans 1844G/50, maintain 1814G, JadeCovenant 1521G/21 | 0.20 | 0.20 | Investment 1 |
| Cresset Exchange | Gold | 4 | 187.00 | 2.4% | 0.0% | 2.4% | 52.3% | 50.0% | 54.7% | 0.0% | 0.40 | 1.75 | RiverLeague 344T, AetherianVanguard 236T, StarborneSeekers 87T, ScholarKingdoms 69T, JadeCovenant 11T, ForgeClans 1T | ScholarKingdoms 110T, StarborneSeekers 87T, JadeCovenant 62T, ForgeClans 10T, AetherianVanguard 9T | StarborneSeekers 85T, AetherianVanguard 33T, ScholarKingdoms 18T, JadeCovenant 10T | AetherianVanguard 6903G/90, maintain 2128G, StarborneSeekers 4410G/70, maintain 1465G, ScholarKingdoms 2313G/37, maintain 702G, RiverLeague 2244G/26, maintain 39G, JadeCovenant 1334G/28, maintain 388G, ForgeClans 533G/12 | 0.75 | 0.75 | WartimeRelease 2, Other 1 |
| Crownmarket | Gold | 4 | 122.25 | 0.6% | 0.0% | 0.6% | 72.0% | 72.0% | 28.0% | 0.0% | 0.00 | 1.00 | RiverLeague 303T, AetherianVanguard 119T, ForgeClans 65T, ScholarKingdoms 2T | JadeCovenant 186T, ScholarKingdoms 73T, AetherianVanguard 61T, RiverLeague 28T | RiverLeague 79T, ForgeClans 43T | JadeCovenant 6410G/45, StarborneSeekers 4394G/33, ScholarKingdoms 3436G/31, maintain 24G, RiverLeague 3294G/65, maintain 1621G, ForgeClans 1543G/41, maintain 1543G, AetherianVanguard 1123G/29, maintain 685G | 0.00 | 0.00 | None |
| Embermint | Gold | 8 | 110.00 | 0.2% | 0.0% | 0.2% | 54.3% | 53.0% | 49.4% | 2.5% | 1.02 | 1.63 | ScholarKingdoms 309T, StarborneSeekers 249T, ForgeClans 162T, AetherianVanguard 113T, RiverLeague 47T | RiverLeague 249T, ForgeClans 81T, JadeCovenant 61T, ScholarKingdoms 7T | AetherianVanguard 25T, StarborneSeekers 25T, ScholarKingdoms 16T | RiverLeague 6628G/38, JadeCovenant 5915G/54, ScholarKingdoms 3812G/69, maintain 607G, ForgeClans 3244G/47, maintain 156G, AetherianVanguard 2446G/53, maintain 1285G, StarborneSeekers 1049G/28, maintain 986G | 1.13 | 1.13 | Investment 5, Other 3, WartimeRelease 1 |
| Gildenspire | Gold | 5 | 156.40 | 0.6% | 0.0% | 0.6% | 87.5% | 87.0% | 14.1% | 0.0% | 0.00 | 1.00 | StarborneSeekers 285T, ForgeClans 217T, RiverLeague 170T, AetherianVanguard 110T | RiverLeague 283T, StarborneSeekers 201T, JadeCovenant 192T, AetherianVanguard 134T, ScholarKingdoms 108T, ForgeClans 66T | StarborneSeekers 81T, RiverLeague 70T | AetherianVanguard 9643G/88, maintain 1075G, JadeCovenant 5186G/35, StarborneSeekers 5179G/70, maintain 1465G, RiverLeague 3909G/56, maintain 1036G, ScholarKingdoms 1843G/29, ForgeClans 1358G/36, maintain 1036G | 0.00 | 0.00 | None |
| Golden Mirage | Gold | 7 | 128.14 | 1.0% | 0.0% | 1.0% | 71.7% | 67.4% | 43.1% | 0.0% | 0.11 | 1.14 | StarborneSeekers 286T, ScholarKingdoms 189T, AetherianVanguard 187T, RiverLeague 109T, JadeCovenant 108T, ForgeClans 18T | ForgeClans 191T, JadeCovenant 170T, AetherianVanguard 130T, ScholarKingdoms 113T, RiverLeague 1T | StarborneSeekers 38T, RiverLeague 31T, JadeCovenant 16T, ForgeClans 4T | RiverLeague 8722G/84, maintain 1075G, JadeCovenant 7390G/88, maintain 1075G, AetherianVanguard 5772G/77, maintain 1284G, StarborneSeekers 2423G/65, maintain 2423G, ForgeClans 2250G/36, maintain 78G, ScholarKingdoms 2007G/51, maintain 1504G | 0.14 | 0.14 | WartimeRelease 1 |
| Kingsmerch | Gold | 11 | 143.09 | 1.5% | 0.0% | 1.5% | 54.3% | 51.5% | 54.1% | 1.7% | 0.64 | 1.45 | AetherianVanguard 497T, StarborneSeekers 456T, RiverLeague 323T, JadeCovenant 225T, ScholarKingdoms 42T, ForgeClans 31T | RiverLeague 284T, ScholarKingdoms 179T, StarborneSeekers 169T, AetherianVanguard 120T, JadeCovenant 35T | StarborneSeekers 121T, AetherianVanguard 49T, RiverLeague 39T, ScholarKingdoms 25T | RiverLeague 20311G/154, maintain 1788G, AetherianVanguard 6838G/140, maintain 2869G, StarborneSeekers 6775G/154, maintain 4582G, JadeCovenant 4775G/34, ScholarKingdoms 1815G/36, maintain 193G, ForgeClans 1578G/35, maintain 24G | 0.91 | 0.91 | Other 4, Investment 3, WartimeRelease 3 |
| Opaline Vault | Gold | 8 | 131.75 | 1.9% | 0.0% | 1.9% | 74.2% | 68.8% | 41.9% | 3.2% | 1.42 | 1.13 | RiverLeague 311T, ScholarKingdoms 295T, AetherianVanguard 258T, StarborneSeekers 135T, JadeCovenant 45T, ForgeClans 10T | StarborneSeekers 215T, ScholarKingdoms 204T, JadeCovenant 163T, ForgeClans 42T | RiverLeague 45T, AetherianVanguard 25T, ScholarKingdoms 17T, StarborneSeekers 1T | StarborneSeekers 12948G/77, maintain 869G, ScholarKingdoms 5922G/74, maintain 1528G, ForgeClans 4895G/66, RiverLeague 3906G/97, maintain 3086G, JadeCovenant 2106G/40, AetherianVanguard 1258G/33, maintain 880G | 1.88 | 1.88 | Investment 13, Other 2 |
| Radiant Hoard | Gold | 4 | 131.00 | 0.6% | 0.0% | 0.6% | 55.3% | 55.2% | 46.0% | 0.0% | 0.19 | 1.25 | StarborneSeekers 244T, ScholarKingdoms 137T, ForgeClans 113T, AetherianVanguard 30T | None | ScholarKingdoms 59T, StarborneSeekers 48T | ForgeClans 2150G/35, StarborneSeekers 1621G/43, maintain 1621G, ScholarKingdoms 763G/21, maintain 763G, AetherianVanguard 649G/13 | 0.25 | 0.25 | WartimeRelease 1 |
| Saffron Treasury | Gold | 5 | 195.00 | 2.3% | 0.0% | 2.3% | 82.4% | 76.2% | 38.8% | 6.8% | 1.64 | 1.60 | RiverLeague 443T, StarborneSeekers 228T, ScholarKingdoms 87T, AetherianVanguard 84T, JadeCovenant 77T, ForgeClans 56T | JadeCovenant 270T, ForgeClans 159T, RiverLeague 129T, StarborneSeekers 96T, ScholarKingdoms 9T, AetherianVanguard 3T | RiverLeague 77T, JadeCovenant 19T, ScholarKingdoms 11T, ForgeClans 2T, AetherianVanguard 1T, StarborneSeekers 1T | JadeCovenant 10367G/110, maintain 766G, RiverLeague 4958G/112, maintain 3437G, StarborneSeekers 4360G/61, maintain 819G, ForgeClans 4188G/72, maintain 496G, AetherianVanguard 1893G/38, maintain 855G, ScholarKingdoms 1376G/24, maintain 568G | 3.20 | 3.20 | Investment 8, Other 4, WartimeRelease 4 |
| Starcoin Port | Gold | 4 | 168.50 | 0.4% | 0.0% | 0.4% | 79.8% | 75.4% | 36.1% | 0.0% | 0.15 | 1.25 | RiverLeague 277T, ForgeClans 238T, AetherianVanguard 159T | ScholarKingdoms 257T, StarborneSeekers 203T, ForgeClans 201T, RiverLeague 117T, JadeCovenant 1T | RiverLeague 116T, ForgeClans 86T, AetherianVanguard 23T | RiverLeague 6101G/108, maintain 2969G, ForgeClans 4570G/74, maintain 1114G, ScholarKingdoms 3920G/53, StarborneSeekers 2873G/28, AetherianVanguard 1621G/43, maintain 1621G, JadeCovenant 63G/2 | 0.25 | 0.25 | WartimeRelease 1 |
| Suncoin Citadel | Gold | 6 | 145.83 | 0.7% | 0.0% | 0.7% | 61.7% | 60.9% | 39.3% | 0.0% | 0.11 | 1.17 | RiverLeague 652T, StarborneSeekers 175T, AetherianVanguard 48T | JadeCovenant 302T, ForgeClans 111T, ScholarKingdoms 62T, StarborneSeekers 47T, AetherianVanguard 24T | RiverLeague 111T, StarborneSeekers 7T | JadeCovenant 9312G/61, ForgeClans 4957G/48, RiverLeague 4707G/125, maintain 4707G, ScholarKingdoms 3132G/29, StarborneSeekers 1804G/45, maintain 1487G, AetherianVanguard 477G/11, maintain 39G | 0.17 | 0.17 | Other 1 |
| Velvet Ledger | Gold | 5 | 110.00 | 1.8% | 0.0% | 1.8% | 35.1% | 34.7% | 66.0% | 0.0% | 0.36 | 1.40 | ScholarKingdoms 199T, JadeCovenant 133T, ForgeClans 90T, RiverLeague 88T, StarborneSeekers 40T | StarborneSeekers 55T, ScholarKingdoms 33T, RiverLeague 22T, AetherianVanguard 14T, ForgeClans 5T | ScholarKingdoms 31T, RiverLeague 25T, JadeCovenant 13T | RiverLeague 4195G/49, maintain 217G, ForgeClans 3412G/30, StarborneSeekers 3030G/52, maintain 390G, ScholarKingdoms 1755G/34, maintain 624G, AetherianVanguard 1142G/23, JadeCovenant 902G/26, maintain 902G | 0.40 | 0.40 | Other 1, WartimeRelease 1 |
| Ashen Bellows | Production | 9 | 160.56 | 0.7% | 0.0% | 0.7% | 46.4% | 44.4% | 60.0% | 0.0% | 0.14 | 1.22 | RiverLeague 605T, StarborneSeekers 347T, ScholarKingdoms 268T, ForgeClans 225T | ForgeClans 241T, RiverLeague 118T, StarborneSeekers 93T, JadeCovenant 72T, AetherianVanguard 67T | StarborneSeekers 102T, ScholarKingdoms 25T, RiverLeague 10T | RiverLeague 7481G/112, maintain 2309G, ForgeClans 5525G/87, ScholarKingdoms 3314G/44, maintain 178G, JadeCovenant 3298G/53, StarborneSeekers 3077G/57, maintain 1877G, AetherianVanguard 1014G/19 | 0.22 | 0.22 | WartimeRelease 2 |
| Blackglass Armory | Production | 5 | 193.00 | 0.3% | 0.0% | 0.3% | 64.2% | 64.2% | 35.8% | 0.0% | 0.00 | 1.00 | JadeCovenant 420T, StarborneSeekers 263T, ForgeClans 215T, AetherianVanguard 67T | StarborneSeekers 277T, ScholarKingdoms 255T, JadeCovenant 162T, ForgeClans 49T | JadeCovenant 27T, StarborneSeekers 25T | StarborneSeekers 6902G/89, maintain 607G, JadeCovenant 6260G/74, maintain 1387G, AetherianVanguard 4399G/50, maintain 685G, ScholarKingdoms 2720G/47, ForgeClans 2346G/41, maintain 451G, RiverLeague 1381G/20 | 0.00 | 0.00 | None |
| Brasshollow | Production | 4 | 118.75 | 0.4% | 0.0% | 0.4% | 72.6% | 70.9% | 34.1% | 5.1% | 1.26 | 1.25 | JadeCovenant 327T, ScholarKingdoms 107T, ForgeClans 36T, AetherianVanguard 5T | AetherianVanguard 278T, ForgeClans 37T, StarborneSeekers 20T, JadeCovenant 5T | JadeCovenant 37T, ScholarKingdoms 25T, ForgeClans 17T | AetherianVanguard 3193G/42, maintain 114G, JadeCovenant 2684G/70, maintain 2362G, StarborneSeekers 1750G/31, ForgeClans 994G/25, maintain 178G, RiverLeague 750G/17, ScholarKingdoms 568G/16, maintain 568G | 1.50 | 1.50 | Investment 5, Other 1 |
| Cinderhold | Production | 5 | 106.00 | 2.8% | 0.0% | 2.8% | 72.3% | 69.6% | 40.2% | 0.0% | 0.19 | 1.20 | JadeCovenant 275T, StarborneSeekers 149T, AetherianVanguard 61T, ScholarKingdoms 43T, ForgeClans 2T | RiverLeague 202T, StarborneSeekers 156T, ForgeClans 86T, ScholarKingdoms 17T | ScholarKingdoms 40T, JadeCovenant 20T | StarborneSeekers 3007G/47, maintain 802G, AetherianVanguard 2205G/25, JadeCovenant 2011G/53, maintain 2011G, ScholarKingdoms 1375G/37, maintain 1153G, ForgeClans 1019G/17, RiverLeague 916G/16 | 0.20 | 0.20 | WartimeRelease 1 |
| Dawnsmelt Keep | Production | 6 | 125.67 | 0.0% | 0.0% | 0.0% | 14.1% | 14.1% | 85.9% | 0.0% | 0.00 | 1.00 | JadeCovenant 298T, ScholarKingdoms 237T, RiverLeague 161T, StarborneSeekers 58T | AetherianVanguard 106T | None | AetherianVanguard 2014G/24, RiverLeague 1114G/30, maintain 1114G | 0.00 | 0.00 | None |
| Emberforge Bastion | Production | 8 | 126.00 | 0.4% | 0.0% | 0.4% | 30.6% | 30.2% | 69.8% | 0.0% | 0.20 | 1.25 | ForgeClans 381T, AetherianVanguard 259T, RiverLeague 187T, StarborneSeekers 120T, ScholarKingdoms 61T | ForgeClans 88T, RiverLeague 85T, ScholarKingdoms 63T, StarborneSeekers 38T | None | StarborneSeekers 6413G/98, maintain 724G, ForgeClans 2633G/27, RiverLeague 2014G/24, AetherianVanguard 1686G/41, maintain 685G, ScholarKingdoms 1507G/27, maintain 256G | 0.25 | 0.25 | WartimeRelease 2 |
| Flintspire Works | Production | 6 | 126.33 | 1.6% | 0.0% | 1.6% | 40.0% | 38.1% | 67.0% | 2.1% | 0.66 | 1.17 | AetherianVanguard 263T, RiverLeague 254T, ScholarKingdoms 198T, StarborneSeekers 43T | ScholarKingdoms 25T, AetherianVanguard 12T, RiverLeague 9T | ScholarKingdoms 6T | RiverLeague 1903G/49, maintain 1465G, ForgeClans 1837G/23, AetherianVanguard 1718G/42, maintain 936G, JadeCovenant 1053G/22, ScholarKingdoms 645G/17, maintain 228G, StarborneSeekers 222G/6 | 0.83 | 0.83 | Investment 5 |
| Gearstorm Hold | Production | 5 | 188.00 | 0.5% | 0.0% | 0.5% | 30.7% | 30.6% | 69.5% | 0.0% | 0.11 | 1.20 | RiverLeague 553T, AetherianVanguard 236T, ForgeClans 86T, JadeCovenant 65T | ForgeClans 149T, StarborneSeekers 99T, AetherianVanguard 78T | AetherianVanguard 58T, ForgeClans 25T | StarborneSeekers 5630G/36, AetherianVanguard 4843G/54, maintain 802G, JadeCovenant 4394G/33, ForgeClans 1511G/32, maintain 217G, RiverLeague 880G/24, maintain 880G | 0.20 | 0.20 | WartimeRelease 1 |
| Hammerdeep | Production | 8 | 158.88 | 0.2% | 0.0% | 0.2% | 48.8% | 48.8% | 51.2% | 0.0% | 0.00 | 1.00 | StarborneSeekers 557T, ForgeClans 390T, RiverLeague 210T, ScholarKingdoms 114T | ForgeClans 508T, AetherianVanguard 160T | RiverLeague 25T | ForgeClans 10418G/80, JadeCovenant 5506G/55, StarborneSeekers 4939G/89, maintain 2306G, AetherianVanguard 4775G/34, RiverLeague 1406G/38, maintain 1270G, ScholarKingdoms 1153G/32, maintain 1153G | 0.00 | 0.00 | None |
| Ironwyrm Foundry | Production | 9 | 114.78 | 0.6% | 0.0% | 0.6% | 66.3% | 66.3% | 33.7% | 0.0% | 0.10 | 1.11 | ScholarKingdoms 307T, ForgeClans 302T, JadeCovenant 240T, RiverLeague 119T, StarborneSeekers 64T, AetherianVanguard 1T | AetherianVanguard 332T, StarborneSeekers 162T, RiverLeague 157T | JadeCovenant 60T, RiverLeague 41T, ScholarKingdoms 32T, StarborneSeekers 1T | StarborneSeekers 10399G/90, AetherianVanguard 7193G/72, RiverLeague 3937G/82, maintain 1465G, JadeCovenant 2402G/57, maintain 1582G, ScholarKingdoms 1755G/49, maintain 1755G, ForgeClans 142G/5, maintain 142G | 0.11 | 0.11 | WartimeRelease 1 |
| Molten Crown | Production | 5 | 127.00 | 2.2% | 0.0% | 2.2% | 91.0% | 81.1% | 38.9% | 0.0% | 0.63 | 1.20 | RiverLeague 530T, ScholarKingdoms 69T, AetherianVanguard 27T, ForgeClans 9T | ForgeClans 397T, ScholarKingdoms 180T, StarborneSeekers 119T, AetherianVanguard 54T | RiverLeague 43T, ScholarKingdoms 38T, AetherianVanguard 11T, ForgeClans 1T | ForgeClans 4684G/58, RiverLeague 3196G/84, maintain 3101G, ScholarKingdoms 2768G/57, maintain 1387G, AetherianVanguard 1890G/29, maintain 217G, StarborneSeekers 1019G/17 | 0.80 | 0.80 | Investment 2, Other 2 |
| Obsidian Kiln | Production | 10 | 126.10 | 0.2% | 0.0% | 0.2% | 62.5% | 61.1% | 42.2% | 0.0% | 0.16 | 1.20 | ForgeClans 446T, AetherianVanguard 281T, JadeCovenant 277T, StarborneSeekers 178T, ScholarKingdoms 79T | RiverLeague 347T, ScholarKingdoms 286T, StarborneSeekers 171T, AetherianVanguard 95T, ForgeClans 93T | JadeCovenant 143T, AetherianVanguard 62T, ForgeClans 54T, StarborneSeekers 23T | RiverLeague 12097G/89, StarborneSeekers 5751G/83, maintain 1320G, ForgeClans 4278G/75, maintain 1489G, AetherianVanguard 3915G/56, maintain 1012G, ScholarKingdoms 3167G/44, JadeCovenant 3008G/80, maintain 3008G | 0.20 | 0.20 | Investment 1, Other 1 |
| Runehammer Gate | Production | 5 | 173.40 | 0.3% | 0.0% | 0.3% | 68.1% | 68.1% | 31.9% | 0.0% | 0.12 | 1.20 | AetherianVanguard 316T, ForgeClans 259T, ScholarKingdoms 144T, StarborneSeekers 110T, JadeCovenant 38T | JadeCovenant 302T, StarborneSeekers 159T, AetherianVanguard 74T, ScholarKingdoms 38T, ForgeClans 35T | ForgeClans 62T, JadeCovenant 32T, AetherianVanguard 28T | JadeCovenant 6744G/66, maintain 1114G, AetherianVanguard 4950G/55, maintain 217G, ForgeClans 2133G/47, maintain 1114G, ScholarKingdoms 1521G/21, StarborneSeekers 1490G/24, maintain 109G | 0.20 | 0.20 | Other 1 |
| Skyfurnace | Production | 4 | 103.75 | 1.4% | 0.0% | 1.4% | 65.5% | 63.6% | 36.6% | 0.0% | 0.24 | 1.25 | RiverLeague 186T, ForgeClans 174T, AetherianVanguard 41T, StarborneSeekers 14T | StarborneSeekers 219T, JadeCovenant 53T, AetherianVanguard 11T | ForgeClans 42T, RiverLeague 31T, AetherianVanguard 19T, StarborneSeekers 11T | StarborneSeekers 6881G/56, maintain 373G, ForgeClans 1231G/33, maintain 1231G, JadeCovenant 1019G/17, AetherianVanguard 810G/20, maintain 195G, RiverLeague 451G/13, maintain 451G | 0.25 | 0.25 | Other 1 |
| Stonewake Crucible | Production | 1 | 130.00 | 6.2% | 0.0% | 6.2% | 100.0% | 93.8% | 21.5% | 0.0% | 0.00 | 1.00 | ForgeClans 130T | StarborneSeekers 130T, RiverLeague 21T | ForgeClans 28T | StarborneSeekers 2014G/24, ForgeClans 1582G/42, maintain 1582G, RiverLeague 1381G/20 | 0.00 | 0.00 | None |
| Thunder Anvil | Production | 5 | 141.80 | 0.3% | 0.0% | 0.3% | 29.9% | 28.3% | 75.0% | 0.1% | 0.56 | 1.40 | ScholarKingdoms 279T, AetherianVanguard 209T, ForgeClans 137T, JadeCovenant 84T | ScholarKingdoms 79T, StarborneSeekers 33T, ForgeClans 11T | JadeCovenant 54T, AetherianVanguard 24T, ScholarKingdoms 1T | StarborneSeekers 4457G/35, ForgeClans 1316G/33, maintain 607G, AetherianVanguard 1097G/31, maintain 1097G, ScholarKingdoms 1092G/23, JadeCovenant 915G/22, maintain 763G | 0.80 | 0.80 | Other 3, Investment 1 |
| Aetherquill | Science | 6 | 131.83 | 0.4% | 0.0% | 0.4% | 59.8% | 59.8% | 40.2% | 0.0% | 0.13 | 1.17 | ScholarKingdoms 279T, AetherianVanguard 198T, StarborneSeekers 131T, JadeCovenant 88T, RiverLeague 54T, ForgeClans 41T | JadeCovenant 228T, RiverLeague 113T, ForgeClans 48T | ScholarKingdoms 83T, StarborneSeekers 41T, AetherianVanguard 25T, JadeCovenant 24T, ForgeClans 1T | RiverLeague 11076G/68, JadeCovenant 6152G/81, maintain 685G, AetherianVanguard 3388G/37, maintain 256G, ScholarKingdoms 1684G/45, maintain 1684G, StarborneSeekers 1465G/39, maintain 1465G, ForgeClans 1238G/24 | 0.17 | 0.17 | Other 1 |
| Arcstar Repository | Science | 3 | 128.67 | 0.3% | 0.0% | 0.3% | 76.2% | 76.2% | 23.8% | 0.0% | 0.00 | 1.00 | RiverLeague 301T, StarborneSeekers 79T, ForgeClans 6T | AetherianVanguard 294T | RiverLeague 50T | JadeCovenant 5630G/36, RiverLeague 1426G/38, maintain 1426G, AetherianVanguard 649G/13 | 0.00 | 0.00 | None |
| Celestine Scriptorium | Science | 5 | 186.60 | 1.3% | 0.0% | 1.3% | 60.9% | 60.5% | 41.6% | 0.0% | 0.00 | 1.00 | ForgeClans 545T, RiverLeague 260T, AetherianVanguard 128T | RiverLeague 402T, ScholarKingdoms 355T, JadeCovenant 163T | ForgeClans 50T, RiverLeague 49T | RiverLeague 10139G/107, maintain 1933G, JadeCovenant 6628G/38, ForgeClans 2754G/58, maintain 1373G, ScholarKingdoms 2663G/37, AetherianVanguard 1837G/23, StarborneSeekers 1131G/18 | 0.00 | 0.00 | None |
| Dreaming Calculus | Science | 1 | 40.00 | 10.0% | 0.0% | 10.0% | 45.0% | 42.5% | 72.5% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 40T | None | None | AetherianVanguard 177G/5, ScholarKingdoms 78G/3, maintain 78G | 0.00 | 0.00 | None |
| Eclipsed Theorem | Science | 4 | 104.50 | 0.5% | 0.0% | 0.5% | 86.8% | 86.8% | 13.2% | 0.0% | 0.00 | 1.00 | ForgeClans 161T, StarborneSeekers 153T, ScholarKingdoms 61T, AetherianVanguard 43T | StarborneSeekers 159T, ScholarKingdoms 147T, RiverLeague 41T | StarborneSeekers 79T, ForgeClans 63T | StarborneSeekers 5389G/68, maintain 1348G, ScholarKingdoms 5186G/35, RiverLeague 1251G/19, ForgeClans 1231G/33, maintain 1231G, AetherianVanguard 270G/7 | 0.00 | 0.00 | None |
| Halcyon Loom | Science | 7 | 192.57 | 0.7% | 0.0% | 0.7% | 75.7% | 73.6% | 32.3% | 1.2% | 0.67 | 1.14 | ForgeClans 491T, JadeCovenant 237T, ScholarKingdoms 227T, AetherianVanguard 222T, StarborneSeekers 119T, RiverLeague 52T | StarborneSeekers 487T, JadeCovenant 299T, AetherianVanguard 75T | AetherianVanguard 123T, ForgeClans 86T, ScholarKingdoms 52T, JadeCovenant 25T | StarborneSeekers 12904G/123, maintain 1387G, AetherianVanguard 9096G/118, maintain 1504G, JadeCovenant 7840G/70, maintain 373G, ForgeClans 5619G/108, maintain 2861G, RiverLeague 3446G/40, ScholarKingdoms 1943G/51, maintain 1621G | 1.29 | 1.29 | Other 5, Investment 4 |
| Lunarchive | Science | 10 | 133.90 | 2.9% | 0.0% | 2.9% | 53.6% | 50.6% | 54.7% | 13.1% | 3.21 | 1.40 | ForgeClans 423T, JadeCovenant 287T, AetherianVanguard 237T, ScholarKingdoms 159T, RiverLeague 137T, StarborneSeekers 96T | RiverLeague 194T, ScholarKingdoms 186T, JadeCovenant 179T, ForgeClans 109T, AetherianVanguard 37T | ForgeClans 94T, AetherianVanguard 54T, JadeCovenant 31T, ScholarKingdoms 16T, RiverLeague 1T | RiverLeague 11122G/62, maintain 39G, JadeCovenant 7303G/107, maintain 1803G, ForgeClans 5755G/87, maintain 1806G, ScholarKingdoms 5312G/72, maintain 685G, AetherianVanguard 3235G/72, maintain 1558G, StarborneSeekers 1521G/21 | 4.30 | 4.30 | Investment 31, Other 12 |
| Meridian of Runes | Science | 3 | 91.00 | 1.8% | 0.0% | 1.8% | 92.3% | 86.8% | 26.0% | 0.0% | 0.00 | 1.00 | StarborneSeekers 177T, RiverLeague 96T | ScholarKingdoms 117T, AetherianVanguard 82T | StarborneSeekers 100T | AetherianVanguard 8443G/41, RiverLeague 1309G/35, maintain 1309G, ScholarKingdoms 951G/21, StarborneSeekers 841G/23, maintain 841G | 0.00 | 0.00 | None |
| Nyx Codex | Science | 4 | 101.00 | 0.5% | 0.0% | 0.5% | 20.8% | 18.1% | 82.9% | 0.0% | 0.25 | 1.25 | StarborneSeekers 314T, ScholarKingdoms 58T, AetherianVanguard 32T | None | StarborneSeekers 11T | AetherianVanguard 4356G/41, maintain 217G, RiverLeague 649G/13, StarborneSeekers 554G/17, maintain 554G, ScholarKingdoms 98G/3 | 0.25 | 0.25 | WartimeRelease 1 |
| Observatory of Whispers | Science | 7 | 170.00 | 0.4% | 0.0% | 0.4% | 53.4% | 49.8% | 57.2% | 0.0% | 0.08 | 1.00 | ForgeClans 759T, RiverLeague 294T, AetherianVanguard 137T | AetherianVanguard 228T, JadeCovenant 225T, StarborneSeekers 211T, ScholarKingdoms 180T | ForgeClans 282T | ScholarKingdoms 11783G/66, StarborneSeekers 6296G/55, JadeCovenant 4041G/32, ForgeClans 3994G/108, maintain 3964G, AetherianVanguard 2633G/27, RiverLeague 295G/9, maintain 295G | 0.14 | 0.14 | Other 1 |
| Prism Oracle | Science | 8 | 77.13 | 1.6% | 0.0% | 1.6% | 78.8% | 75.4% | 32.1% | 0.0% | 0.81 | 1.25 | JadeCovenant 240T, StarborneSeekers 213T, ForgeClans 87T, AetherianVanguard 36T, RiverLeague 36T, ScholarKingdoms 5T | ScholarKingdoms 283T, AetherianVanguard 96T, RiverLeague 45T, StarborneSeekers 5T | JadeCovenant 80T, ForgeClans 14T, StarborneSeekers 10T, AetherianVanguard 1T, ScholarKingdoms 1T | StarborneSeekers 6141G/118, maintain 2913G, AetherianVanguard 4353G/51, JadeCovenant 3310G/72, maintain 1621G, ScholarKingdoms 2901G/48, ForgeClans 1036G/28, maintain 1036G, RiverLeague 573G/12 | 0.63 | 0.63 | Other 2, WartimeRelease 2, Investment 1 |
| Quillspire | Science | 4 | 138.00 | 5.4% | 0.0% | 5.4% | 61.8% | 60.3% | 46.4% | 26.8% | 7.61 | 2.00 | AetherianVanguard 251T, StarborneSeekers 168T, JadeCovenant 93T, RiverLeague 37T, ForgeClans 3T | ForgeClans 156T, StarborneSeekers 69T, AetherianVanguard 55T, RiverLeague 44T, JadeCovenant 2T | AetherianVanguard 46T, StarborneSeekers 12T, RiverLeague 6T, JadeCovenant 1T | AetherianVanguard 3498G/61, maintain 1033G, RiverLeague 3328G/30, maintain 199G, JadeCovenant 2879G/37, maintain 507G, StarborneSeekers 2294G/27, maintain 396G, ForgeClans 761G/15 | 10.50 | 10.50 | Investment 26, Other 14, WartimeRelease 2 |
| Radiant Lexicon | Science | 6 | 112.00 | 1.2% | 0.0% | 1.2% | 51.0% | 45.5% | 65.3% | 0.0% | 0.45 | 1.33 | JadeCovenant 338T, AetherianVanguard 192T, ScholarKingdoms 110T, RiverLeague 32T | ScholarKingdoms 161T, AetherianVanguard 133T, RiverLeague 102T, ForgeClans 56T | ScholarKingdoms 73T, JadeCovenant 18T, RiverLeague 3T, AetherianVanguard 2T | AetherianVanguard 6121G/57, maintain 362G, RiverLeague 4070G/56, maintain 624G, ForgeClans 3195G/31, ScholarKingdoms 3040G/68, maintain 1463G, JadeCovenant 2178G/53, maintain 1270G | 0.50 | 0.50 | WartimeRelease 2, Investment 1 |
| Sapphire Mnemos | Science | 5 | 173.00 | 1.3% | 0.0% | 1.3% | 50.3% | 47.5% | 59.2% | 0.0% | 0.00 | 1.00 | JadeCovenant 401T, StarborneSeekers 229T, ForgeClans 195T, RiverLeague 40T | ScholarKingdoms 226T, RiverLeague 147T, ForgeClans 146T | JadeCovenant 31T | RiverLeague 3136G/38, JadeCovenant 1933G/51, maintain 1933G, ForgeClans 1354G/26, ScholarKingdoms 1019G/17, StarborneSeekers 217G/7, maintain 217G | 0.00 | 0.00 | None |
| Starglass Athenaeum | Science | 9 | 118.89 | 0.8% | 0.0% | 0.8% | 63.3% | 61.4% | 43.5% | 2.9% | 0.75 | 1.22 | RiverLeague 516T, ScholarKingdoms 337T, ForgeClans 165T, AetherianVanguard 34T, JadeCovenant 18T | RiverLeague 295T, ForgeClans 138T, StarborneSeekers 44T, AetherianVanguard 30T, ScholarKingdoms 17T | RiverLeague 61T, ForgeClans 25T | RiverLeague 15192G/215, maintain 3548G, ForgeClans 5667G/77, maintain 590G, StarborneSeekers 3458G/46, AetherianVanguard 3105G/51, maintain 566G, ScholarKingdoms 1338G/36, maintain 835G, JadeCovenant 1131G/18 | 0.89 | 0.89 | Investment 4, Other 3, WartimeRelease 1 |
| Voidlight Archive | Science | 6 | 95.83 | 0.7% | 0.0% | 0.7% | 37.9% | 37.6% | 63.1% | 0.0% | 0.17 | 1.17 | StarborneSeekers 185T, JadeCovenant 178T, ScholarKingdoms 121T, AetherianVanguard 91T | ScholarKingdoms 89T, ForgeClans 33T, JadeCovenant 24T | AetherianVanguard 86T, StarborneSeekers 23T | ScholarKingdoms 4570G/39, maintain 78G, StarborneSeekers 3203G/74, maintain 2072G, ForgeClans 2804G/40, JadeCovenant 2108G/48, maintain 1192G, AetherianVanguard 1222G/33, maintain 1192G | 0.17 | 0.17 | WartimeRelease 1 |

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

