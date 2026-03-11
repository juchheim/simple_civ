# City-State Simulation Report

Generated: 2026-03-11T18:12:03.721Z

## Data Coverage
- Simulations processed: 200
- Simulations with city-state telemetry: 200
- Simulations missing city-state telemetry: 0
- Total city-states created: 765
- Total city-state active turns: 104627
- Total contested turns: 831 (No Suz: 4, Close-race: 827)
- Total turnover-window turns: 62980
- Total flip-window turns: 61042
- Total safe-lead incumbent turns: 47557
- Total hotspot turns: 1079
- Contest telemetry coverage (city-state entries): 765 with split fields, 0 legacy-only
- Global suzerain flip rate: 0.40 per 100 active turns
- True ownership turnover rate: 0.39 per 100 active turns
- Average unique suzerains per city-state: 1.24
- Average city-states created per telemetry simulation: 3.83
- Average surviving city-states at game end (telemetry sims): 3.79



## Creation Timing
- Simulations with at least one city-state created: 178/200 (89.0%)
- First city-state creation turn (min / p25 / median / p75 / max): 61 / 105 / 128 / 162 / 290
- First city-state creation turn (average, sims with any): 137.6

## Map-Size Creation Rates
| Map | Sims | Telemetry Sims | Sims with >=1 CS | Share with >=1 CS | Total Created | Avg Created / Telemetry Sim | Avg First CS Turn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tiny | 40 | 40 | 32 | 80.0% | 55 | 1.38 | 141.2 |
| Small | 40 | 40 | 28 | 70.0% | 53 | 1.32 | 137.6 |
| Standard | 40 | 40 | 39 | 97.5% | 146 | 3.65 | 138.4 |
| Large | 40 | 40 | 40 | 100.0% | 229 | 5.72 | 127.0 |
| Huge | 40 | 40 | 39 | 97.5% | 282 | 7.05 | 144.7 |

## Camp-Clearing Activation Funnel
- Camp-clearing episodes observed: 9342
- Direct starts in Ready: 3575 (38.3%)
- Episodes that reached Ready: 5444 (58.3%)
- Episodes with sighting telemetry: 5055 (54.1%)
- Sighted -> prep start (avg / median): 110.62 / 87 turns
- Prep start -> first Ready (avg / median): 2.79 / 0 turns
- Prep start -> self clear (avg / median): 14.40 / 9 turns
- Total prep duration (avg / median): 7.63 / 0 turns
- Timeouts after reaching Ready: 283 (17.9% of timeouts)
- Ready turn diagnostics: no contact 11329, adjacent contact 1611, attack opportunity 5446, stalled opportunity 3049, power disadvantage 3362, progress 3109
- Ready-timeout primary breakdown: no contact 191, declined attack 57, power collapse 35, other 0
- War-interrupted episodes: 2890 (30.9%)
- Cleared-by-other breakdown: lacked military 79, late start 184, other 63
- Initial prep state mix: Buildup 2309, Gathering 138, Positioning 3320, Ready 3575

### Camp Outcomes
| Outcome | Episodes | Share |
| --- | --- | --- |
| ClearedBySelf | 725 | 7.8% |
| ClearedByOther | 326 | 3.5% |
| TimedOut | 1579 | 16.9% |
| WartimeEmergencyCancelled | 2890 | 30.9% |
| OtherCancelled | 3699 | 39.6% |
| StillActive | 123 | 1.3% |

### Camp Funnel By Readiness
| Readiness | Episodes | Self Clears | Self Clear Rate | Timeouts | Timeout Rate | Avg Prep Turns | Avg Prep->Ready | Reached Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PreArmy | 1994 | 28 | 1.4% | 760 | 38.1% | 9.43 | 7.95 | 22.0% |
| ArmyTech | 4235 | 243 | 5.7% | 547 | 12.9% | 6.88 | 2.06 | 78.5% |
| ArmyFielded | 3113 | 454 | 14.6% | 272 | 8.7% | 7.49 | 2.87 | 54.0% |

### Slowest Prep Episodes
| Map | Seed | Civ | Outcome | Readiness | Initial State | Sighted->Prep | Total Prep | Prep->Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Huge | 427027 | RiverLeague | StillActive | ArmyTech | Buildup | n/a | 218T | n/a |
| Standard | 224024 | RiverLeague | ClearedByOther | ArmyTech | Positioning | 100 | 211T | n/a |
| Huge | 403003 | RiverLeague | ClearedBySelf | ArmyTech | Buildup | n/a | 187T | 18 |
| Huge | 406006 | JadeCovenant | ClearedByOther | ArmyFielded | Positioning | 155 | 186T | n/a |
| Large | 335035 | ForgeClans | ClearedByOther | PreArmy | Buildup | n/a | 172T | n/a |
| Standard | 237037 | AetherianVanguard | StillActive | ArmyFielded | Buildup | 180 | 162T | n/a |
| Huge | 414014 | StarborneSeekers | StillActive | ArmyFielded | Positioning | 191 | 151T | n/a |
| Huge | 419019 | JadeCovenant | ClearedBySelf | PreArmy | Buildup | n/a | 140T | 5 |
| Huge | 408008 | JadeCovenant | StillActive | ArmyFielded | Buildup | 74 | 117T | 34 |
| Huge | 429029 | StarborneSeekers | ClearedByOther | ArmyTech | Positioning | 41 | 112T | 21 |

## Suzerainty vs Winning
- Winner average suzerain turns: 182.06
- Non-winner average suzerain turns: 107.97
- Winner average city-state investment: 4517.4G
- Non-winner average city-state investment: 2619.4G
- Winners with any suzerainty: 140/188 (74.5%)
- Winners with any city-state investment: 146/188 (77.7%)
- Participant win rate with any suzerainty: 28.1%
- Participant win rate without suzerainty: 14.1%
- Participant win rate with any city-state investment: 23.0%
- Correlation (suzerain turns -> win flag): 0.180
- Correlation (city-state gold invested -> win flag): 0.206
- Winner share of sim-wide suzerain turns (when any suzerainty existed): 45.9%

## Investment Mix
- Total city-state investment: 2557106G across 34337 actions
- Maintenance investment: 515979G (20.2%) across 13926 actions (40.6%)
- Challenger investment: 2041127G (79.8%) across 20411 actions (59.4%)
- Maintenance gold per suzerain turn: 4.93
- Maintenance actions per 100 suzerain turns: 13.31

## Turnover Diagnostics
- Turnover-window challenger investment: 1978100G across 19180 actions
- Flip-window challenger investment: 1955050G across 18897 actions
- Deep-challenge investment: 62997G across 1230 actions
- Neutral-claim investment: 30G across 1 actions
- Passive contestation pulses: 34195
- Passive contestation close-race pulses: 27256
- Passive openings observed: 1
- Passive openings with treasury to invest: 1 (100.0%)
- Passive openings with reserve-safe invest: 0 (0.0%)
- Passive openings avg nominated turn-order delay: 3.00 turns
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
- Passive-assisted suzerainty changes: 124 (30.0% of non-passive changes)
- Passive-assisted true ownership turnovers: 124 (30.1% of ownership turnover)
- Passive-assisted ownership conversion per 100 close-race pulses: 0.45
- Passive-involved ownership conversion per 100 close-race pulses: 0.45
- Passive-assisted ownership causes: WartimeRelease 99, Other 23, Investment 2
- Pair-fatigue-triggered investment: 70475G across 986 actions
- Pair-fatigue share of challenger spend: 3.5%
- Safe-maintenance investment: 89G across 3 actions
- Focus turns: 78463 (challenge 64202, maintenance 14261)
- Focus assignments: 1473, focus switches: 189
- Flip conversion per 100 turnover-window turns: 0.66
- True ownership conversion per 100 turnover-window turns: 0.65
- Flip conversion per 100 challenge-focus turns: 0.64
- Safe-maintenance share of maintenance spend: 0.0%

## Flip Cause Summary
| Cause | Suzerainty Changes | True Ownership Turnovers | State Change Share | Ownership Share |
| --- | --- | --- | --- | --- |
| Investment | 210 | 210 | 50.7% | 51.0% |
| PassiveContestation | 0 | 0 | 0.0% | 0.0% |
| WartimeRelease | 106 | 105 | 25.6% | 25.5% |
| WarBreak | 0 | 0 | 0.0% | 0.0% |
| Other | 98 | 97 | 23.7% | 23.5% |

## Hotspot Diagnostics
- Hotspot turn share of active turns: 1.0%
- City-state instances with any hotspot time: 32/765
- True ownership turnovers occurring in hotspot instances: 228 / 412

## Hotspot Instances
| Map | Seed | City-State | Yield | Created | Active | Hotspot | Hotspot Share | Ownership Turnovers | Suz Changes | Turnover Pair | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Huge | 408008 | Radiant Lexicon | Science | 290 | 62T | 56T | 90.3% | 14 | 14 | JadeCovenant <> ScholarKingdoms 14 | Other 9, Investment 5 |
| Huge | 420020 | Starglass Athenaeum | Science | 102 | 203T | 78T | 38.4% | 13 | 13 | ForgeClans <> JadeCovenant 13 | Investment 10, Other 3 |
| Large | 312012 | Coinfire Crossing | Gold | 245 | 206T | 84T | 40.8% | 12 | 12 | ScholarKingdoms <> JadeCovenant 12 | Investment 9, Other 3 |
| Large | 301001 | Dawnsmelt Keep | Production | 126 | 235T | 55T | 23.4% | 12 | 12 | AetherianVanguard <> ScholarKingdoms 12 | Investment 11, Other 1 |
| Huge | 424024 | Observatory of Whispers | Science | 133 | 292T | 52T | 17.8% | 11 | 11 | RiverLeague <> JadeCovenant 11 | Investment 6, Other 4, WartimeRelease 1 |
| Huge | 440040 | Radiant Lexicon | Science | 111 | 189T | 43T | 22.8% | 10 | 10 | ForgeClans <> RiverLeague 9, RiverLeague <> StarborneSeekers 1 | Investment 5, Other 4, WartimeRelease 1 |
| Huge | 420020 | Obsidian Kiln | Production | 103 | 203T | 38T | 18.7% | 10 | 10 | AetherianVanguard <> RiverLeague 9, StarborneSeekers <> AetherianVanguard 1 | Investment 5, Other 4, WartimeRelease 1 |
| Huge | 416016 | Dawnsmelt Keep | Production | 175 | 222T | 60T | 27.0% | 9 | 9 | AetherianVanguard <> ForgeClans 9 | Investment 8, Other 1 |
| Large | 312012 | Quillspire | Science | 348 | 103T | 48T | 46.6% | 9 | 9 | ScholarKingdoms <> JadeCovenant 7, ScholarKingdoms <> ForgeClans 2 | Investment 6, Other 2, WartimeRelease 1 |
| Large | 312012 | Rainpetal Court | Food | 235 | 216T | 44T | 20.4% | 8 | 8 | AetherianVanguard <> StarborneSeekers 8 | Investment 7, WartimeRelease 1 |
| Standard | 215015 | Radiant Hoard | Gold | 130 | 223T | 35T | 15.7% | 8 | 8 | AetherianVanguard <> JadeCovenant 8 | Investment 8 |
| Huge | 429029 | Cinderhold | Production | 136 | 192T | 32T | 16.7% | 8 | 8 | RiverLeague <> JadeCovenant 8 | Investment 8 |
| Standard | 235035 | Wildroot Sanctum | Food | 286 | 105T | 32T | 30.5% | 8 | 8 | JadeCovenant <> ForgeClans 8 | Other 5, Investment 3 |
| Huge | 417017 | Sunseed Haven | Food | 124 | 238T | 0T | 0.0% | 8 | 8 | JadeCovenant <> RiverLeague 7, AetherianVanguard <> RiverLeague 1 | Investment 4, Other 3, WartimeRelease 1 |
| Huge | 403003 | Opaline Vault | Gold | 224 | 213T | 32T | 15.0% | 7 | 7 | StarborneSeekers <> JadeCovenant 7 | Investment 7 |
| Huge | 412012 | Lunarchive | Science | 96 | 221T | 21T | 9.5% | 7 | 7 | ForgeClans <> StarborneSeekers 7 | Investment 7 |

## Hotspot City Names (Cross-Sim Aggregate)
| City-State | Yield | Avg Hotspot Turns | Hotspot Share | Avg Ownership Turnovers | Avg Suz Changes | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- |
| Radiant Lexicon | Science | 10.5T | 8.3% | 2.55 | 2.55 | Investment 13, Other 13, WartimeRelease 2 |
| Dawnsmelt Keep | Production | 7.2T | 5.2% | 1.56 | 1.56 | Investment 20, WartimeRelease 3, Other 2 |
| Wildroot Sanctum | Food | 3.5T | 2.3% | 1.24 | 1.35 | Other 12, Investment 6, WartimeRelease 3 |
| Obsidian Kiln | Production | 4.6T | 3.5% | 1.67 | 1.67 | Investment 11, Other 8, WartimeRelease 1 |
| Quillspire | Science | 4.0T | 3.1% | 0.89 | 0.89 | Investment 12, WartimeRelease 3, Other 2 |
| Starglass Athenaeum | Science | 11.1T | 6.7% | 2.14 | 2.14 | Investment 10, Other 5 |
| Coinfire Crossing | Gold | 7.0T | 5.0% | 1.08 | 1.08 | Investment 9, Other 4 |
| Skyfurnace | Production | 3.2T | 1.6% | 1.09 | 1.09 | WartimeRelease 5, Investment 4, Other 3 |
| Observatory of Whispers | Science | 5.2T | 3.7% | 1.10 | 1.10 | Investment 6, Other 4, WartimeRelease 1 |
| Hammerdeep | Production | 3.1T | 2.7% | 0.85 | 0.85 | Investment 6, Other 3, WartimeRelease 2 |
| Sunseed Haven | Food | 0.0T | 0.0% | 1.10 | 1.10 | Investment 5, Other 3, WartimeRelease 3 |
| Opaline Vault | Gold | 2.1T | 1.9% | 0.67 | 0.67 | Investment 8, WartimeRelease 2 |

## Civ Performance
| Civ | Games | Wins | Win% | Avg Suz Turns | Avg Invested Gold | Avg Maintenance Gold | Avg Invest Actions | Win% (Suz>0) | Win% (Suz=0) | Top Suz Claims |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 139 | 36 | 25.9% | 151.83 | 2603.1 | 666.5 | 39.34 | 29.3% | 21.1% | 132 |
| ScholarKingdoms | 145 | 33 | 22.8% | 137.34 | 2388.6 | 631.0 | 37.90 | 27.6% | 12.8% | 155 |
| RiverLeague | 140 | 25 | 17.9% | 140.17 | 3651.5 | 842.3 | 49.10 | 28.2% | 1.8% | 152 |
| AetherianVanguard | 147 | 36 | 24.5% | 80.12 | 2762.1 | 314.9 | 32.15 | 32.0% | 16.7% | 91 |
| StarborneSeekers | 137 | 34 | 24.8% | 101.32 | 3130.1 | 476.7 | 39.03 | 32.4% | 15.9% | 91 |
| JadeCovenant | 132 | 24 | 18.2% | 138.79 | 3809.6 | 775.1 | 48.69 | 20.0% | 14.9% | 138 |

## Turnover Pressure By Civ
| Civ | Avg Turnover Gold | Avg Deep Gold | Avg Neutral Gold | Avg Pair-Fatigue Gold | Avg Safe Maint Gold | Avg Focus Challenge T | Avg Focus Maint T | Focus Switches / Game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 1874.1 | 62.5 | 0.0 | 43.3 | 0.3 | 62.10 | 29.34 | 0.33 |
| ScholarKingdoms | 1679.2 | 78.5 | 0.0 | 55.2 | 0.0 | 75.26 | 20.99 | 0.27 |
| RiverLeague | 2739.5 | 69.6 | 0.0 | 47.5 | 0.2 | 79.53 | 15.46 | 0.24 |
| AetherianVanguard | 2380.6 | 66.6 | 0.0 | 97.2 | 0.2 | 76.47 | 7.48 | 0.10 |
| StarborneSeekers | 2575.1 | 78.2 | 0.0 | 99.8 | 0.0 | 94.21 | 11.91 | 0.16 |
| JadeCovenant | 2938.2 | 96.1 | 0.2 | 165.6 | 0.0 | 71.02 | 17.00 | 0.26 |

## Yield-Type Summary
| Yield | City-States | Avg Active Turns | Contested Turn Share | No Suz Share | Close-Race Share | Flip Rate /100T | Avg Unique Suz | Surviving | Removed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Science | 188 | 137.35 | 0.7% | 0.0% | 0.7% | 0.45 | 1.24 | 187 | 1 |
| Production | 188 | 137.65 | 0.8% | 0.0% | 0.8% | 0.46 | 1.27 | 187 | 1 |
| Food | 195 | 136.29 | 0.9% | 0.0% | 0.8% | 0.35 | 1.25 | 194 | 1 |
| Gold | 194 | 135.83 | 0.9% | 0.0% | 0.9% | 0.32 | 1.20 | 189 | 5 |

## Yield Turnover Windows
| Yield | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share |
| --- | --- | --- | --- | --- |
| Science | 59.7% | 57.8% | 46.5% | 1.4% |
| Production | 60.8% | 58.9% | 44.6% | 1.3% |
| Food | 60.3% | 58.3% | 45.6% | 0.5% |
| Gold | 60.0% | 58.4% | 45.1% | 1.0% |

## City-State Suzerainty Ledger
| City-State | Yield | Appearances | Avg Active Turns | Contested Share | No Suz Share | Close-Race Share | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share | Flip Rate /100T | Avg Unique Suz | Suzerain Turns by Civ | Focus Challenge by Civ | Focus Maintenance by Civ | Investment by Civ (Gold/Actions) | Avg Suz Changes | Avg Ownership Turnovers | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amber Orchard | Food | 12 | 85.75 | 1.2% | 0.0% | 1.2% | 48.1% | 46.7% | 56.7% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 334T, RiverLeague 333T, StarborneSeekers 161T, AetherianVanguard 126T, JadeCovenant 75T | ScholarKingdoms 245T, ForgeClans 31T, JadeCovenant 16T | RiverLeague 66T, ScholarKingdoms 57T, StarborneSeekers 6T | ScholarKingdoms 5417G/96, maintain 1278G, RiverLeague 4917G/122, maintain 3537G, StarborneSeekers 2783G/55, maintain 607G, AetherianVanguard 1353G/24, JadeCovenant 876G/22, maintain 373G, ForgeClans 322G/8 | 0.00 | 0.00 | None |
| Bloomtide | Food | 19 | 127.58 | 0.4% | 0.0% | 0.4% | 64.7% | 62.7% | 41.2% | 0.0% | 0.21 | 1.21 | ForgeClans 750T, JadeCovenant 572T, RiverLeague 477T, ScholarKingdoms 330T, AetherianVanguard 267T, StarborneSeekers 28T | StarborneSeekers 570T, JadeCovenant 267T, ForgeClans 145T, RiverLeague 121T, AetherianVanguard 116T, ScholarKingdoms 4T | ForgeClans 302T, JadeCovenant 48T, StarborneSeekers 3T, RiverLeague 2T | JadeCovenant 17393G/229, maintain 2969G, RiverLeague 15874G/156, maintain 1348G, StarborneSeekers 11267G/93, maintain 231G, ForgeClans 10423G/177, maintain 4556G, AetherianVanguard 6764G/102, maintain 1799G, ScholarKingdoms 1689G/44, maintain 1404G | 0.26 | 0.26 | WartimeRelease 3, Other 2 |
| Bramble Feast | Food | 10 | 116.40 | 0.4% | 0.0% | 0.4% | 72.9% | 72.0% | 29.7% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 343T, RiverLeague 304T, StarborneSeekers 253T, JadeCovenant 173T, ForgeClans 87T, AetherianVanguard 4T | JadeCovenant 299T, RiverLeague 167T, AetherianVanguard 58T | StarborneSeekers 60T, JadeCovenant 45T, RiverLeague 32T, ScholarKingdoms 26T | RiverLeague 9256G/136, maintain 2657G, JadeCovenant 5636G/108, maintain 1916G, AetherianVanguard 3272G/43, maintain 24G, ScholarKingdoms 1877G/51, maintain 1877G, StarborneSeekers 676G/19, maintain 646G, ForgeClans 649G/13 | 0.00 | 0.00 | None |
| Dawnharvest | Food | 13 | 167.31 | 0.5% | 0.0% | 0.5% | 51.9% | 51.6% | 48.6% | 1.2% | 0.41 | 1.31 | StarborneSeekers 975T, RiverLeague 413T, ForgeClans 311T, JadeCovenant 260T, ScholarKingdoms 177T, AetherianVanguard 39T | RiverLeague 277T, StarborneSeekers 192T, JadeCovenant 163T, AetherianVanguard 145T, ForgeClans 108T | StarborneSeekers 88T, ForgeClans 44T, JadeCovenant 26T, AetherianVanguard 1T | JadeCovenant 12302G/146, maintain 1919G, StarborneSeekers 10313G/171, maintain 3548G, ForgeClans 9099G/95, maintain 1192G, AetherianVanguard 9023G/83, RiverLeague 7085G/124, maintain 1660G, ScholarKingdoms 1071G/27, maintain 568G | 0.69 | 0.69 | Investment 6, WartimeRelease 3 |
| Evergrain Vale | Food | 11 | 152.82 | 0.4% | 0.0% | 0.4% | 43.0% | 42.5% | 57.7% | 0.0% | 0.06 | 1.09 | ForgeClans 599T, JadeCovenant 581T, RiverLeague 409T, StarborneSeekers 78T, ScholarKingdoms 14T | ScholarKingdoms 344T, StarborneSeekers 77T, RiverLeague 73T, JadeCovenant 39T | JadeCovenant 46T, RiverLeague 30T, ForgeClans 29T | RiverLeague 8779G/108, maintain 1799G, StarborneSeekers 5993G/68, maintain 1359G, ScholarKingdoms 4517G/78, JadeCovenant 3583G/90, maintain 2852G, ForgeClans 2877G/73, maintain 2228G, AetherianVanguard 1251G/19 | 0.09 | 0.09 | Other 1 |
| Fernsong | Food | 7 | 139.57 | 0.6% | 0.0% | 0.6% | 69.3% | 69.3% | 30.7% | 0.0% | 0.10 | 1.14 | ForgeClans 427T, ScholarKingdoms 192T, AetherianVanguard 191T, RiverLeague 90T, JadeCovenant 77T | JadeCovenant 313T, ScholarKingdoms 271T, RiverLeague 162T, StarborneSeekers 156T, AetherianVanguard 75T | ForgeClans 81T, ScholarKingdoms 37T | ForgeClans 9367G/147, maintain 4083G, JadeCovenant 7224G/85, maintain 1168G, ScholarKingdoms 7189G/90, maintain 1270G, StarborneSeekers 5525G/51, RiverLeague 3200G/47, AetherianVanguard 1673G/22 | 0.14 | 0.14 | Investment 1 |
| Greenstar Hollow | Food | 13 | 177.54 | 0.5% | 0.0% | 0.5% | 65.7% | 64.9% | 36.6% | 0.0% | 0.26 | 1.46 | AetherianVanguard 758T, JadeCovenant 598T, ScholarKingdoms 335T, StarborneSeekers 221T, ForgeClans 208T, RiverLeague 188T | JadeCovenant 660T, AetherianVanguard 597T, StarborneSeekers 263T, RiverLeague 242T, ScholarKingdoms 114T | ScholarKingdoms 180T, ForgeClans 128T, AetherianVanguard 117T, JadeCovenant 63T, StarborneSeekers 25T | JadeCovenant 40143G/256, maintain 2852G, AetherianVanguard 19277G/229, maintain 3637G, StarborneSeekers 16352G/117, maintain 529G, ForgeClans 7237G/94, maintain 1192G, RiverLeague 5632G/94, maintain 1309G, ScholarKingdoms 2979G/72, maintain 1721G | 0.46 | 0.46 | WartimeRelease 5, Other 1 |
| Hearthbloom | Food | 9 | 156.56 | 1.8% | 0.0% | 1.8% | 65.4% | 60.7% | 49.0% | 0.0% | 0.35 | 1.44 | JadeCovenant 389T, StarborneSeekers 367T, ForgeClans 331T, ScholarKingdoms 206T, RiverLeague 116T | AetherianVanguard 403T, ScholarKingdoms 241T, ForgeClans 120T, JadeCovenant 81T, StarborneSeekers 76T | JadeCovenant 42T, RiverLeague 33T, ScholarKingdoms 25T, StarborneSeekers 21T, ForgeClans 2T | RiverLeague 10853G/127, maintain 1558G, AetherianVanguard 5552G/76, StarborneSeekers 5280G/101, maintain 2869G, JadeCovenant 4367G/90, maintain 1877G, ScholarKingdoms 3602G/54, maintain 188G, ForgeClans 3594G/61, maintain 373G | 0.56 | 0.56 | Other 2, WartimeRelease 2, Investment 1 |
| Moonmeadow | Food | 14 | 148.29 | 0.9% | 0.0% | 0.9% | 60.6% | 56.5% | 51.0% | 0.0% | 0.34 | 1.29 | RiverLeague 748T, ForgeClans 578T, AetherianVanguard 454T, JadeCovenant 141T, ScholarKingdoms 127T, StarborneSeekers 28T | ForgeClans 324T, StarborneSeekers 322T, AetherianVanguard 278T, ScholarKingdoms 105T, JadeCovenant 99T, RiverLeague 25T | RiverLeague 68T, ForgeClans 57T, StarborneSeekers 23T, AetherianVanguard 2T | ScholarKingdoms 7889G/109, maintain 817G, AetherianVanguard 7689G/137, maintain 2791G, JadeCovenant 7526G/78, maintain 78G, StarborneSeekers 7148G/73, maintain 473G, RiverLeague 7142G/178, maintain 4969G, ForgeClans 4732G/98, maintain 1721G | 0.50 | 0.50 | WartimeRelease 4, Investment 3 |
| Nectarwind | Food | 13 | 153.38 | 0.4% | 0.0% | 0.4% | 73.6% | 71.0% | 32.9% | 0.0% | 0.50 | 1.23 | ForgeClans 749T, StarborneSeekers 297T, JadeCovenant 276T, ScholarKingdoms 266T, AetherianVanguard 244T, RiverLeague 162T | StarborneSeekers 741T, ScholarKingdoms 586T, JadeCovenant 337T, RiverLeague 289T, ForgeClans 266T, AetherianVanguard 113T | ForgeClans 267T, JadeCovenant 137T, RiverLeague 65T, ScholarKingdoms 35T, StarborneSeekers 22T | StarborneSeekers 22414G/206, maintain 1270G, ScholarKingdoms 13884G/156, maintain 2462G, ForgeClans 10750G/148, maintain 4122G, JadeCovenant 8527G/98, maintain 1504G, RiverLeague 8087G/80, maintain 1361G, AetherianVanguard 941G/22 | 0.77 | 0.77 | Other 4, Investment 3, WartimeRelease 3 |
| Rainpetal Court | Food | 9 | 125.56 | 2.2% | 0.0% | 2.2% | 69.7% | 66.2% | 42.6% | 3.9% | 0.80 | 1.22 | RiverLeague 508T, JadeCovenant 229T, AetherianVanguard 210T, ForgeClans 108T, StarborneSeekers 52T, ScholarKingdoms 23T | StarborneSeekers 321T, AetherianVanguard 148T, ScholarKingdoms 94T, ForgeClans 37T, JadeCovenant 19T | JadeCovenant 61T, AetherianVanguard 34T, ForgeClans 25T, RiverLeague 20T, StarborneSeekers 10T | StarborneSeekers 7721G/88, maintain 209G, AetherianVanguard 5997G/104, maintain 1443G, JadeCovenant 5105G/121, maintain 3437G, ScholarKingdoms 4229G/57, RiverLeague 3774G/96, maintain 3125G, ForgeClans 3241G/33, maintain 109G | 1.00 | 1.00 | Investment 7, WartimeRelease 2 |
| Silverbarley | Food | 12 | 108.67 | 1.2% | 0.0% | 1.2% | 79.7% | 77.9% | 27.3% | 0.0% | 0.08 | 1.08 | RiverLeague 494T, JadeCovenant 353T, AetherianVanguard 191T, ScholarKingdoms 144T, ForgeClans 122T | ForgeClans 285T, JadeCovenant 192T, AetherianVanguard 159T, StarborneSeekers 129T, ScholarKingdoms 77T, RiverLeague 25T | RiverLeague 114T, ForgeClans 60T, ScholarKingdoms 55T, JadeCovenant 31T | ForgeClans 12731G/117, maintain 1370G, JadeCovenant 8868G/126, maintain 2025G, StarborneSeekers 8370G/106, RiverLeague 8118G/135, maintain 2897G, ScholarKingdoms 6528G/106, maintain 1660G, AetherianVanguard 3132G/29 | 0.08 | 0.08 | Other 1 |
| Sunseed Haven | Food | 10 | 155.10 | 0.4% | 0.0% | 0.4% | 58.9% | 57.1% | 45.9% | 0.0% | 0.71 | 1.50 | ScholarKingdoms 529T, RiverLeague 351T, StarborneSeekers 317T, ForgeClans 256T, AetherianVanguard 73T, JadeCovenant 25T | JadeCovenant 430T, RiverLeague 346T, ScholarKingdoms 268T, AetherianVanguard 141T, StarborneSeekers 116T | AetherianVanguard 57T, ScholarKingdoms 50T, StarborneSeekers 26T, JadeCovenant 4T, RiverLeague 3T | JadeCovenant 16452G/129, maintain 351G, ScholarKingdoms 13275G/120, maintain 319G, RiverLeague 11309G/142, maintain 2284G, AetherianVanguard 6027G/58, maintain 841G, StarborneSeekers 5018G/85, maintain 1565G, ForgeClans 437G/13, maintain 271G | 1.10 | 1.10 | Investment 5, Other 3, WartimeRelease 3 |
| Thistleheart | Food | 16 | 112.88 | 1.3% | 0.0% | 1.3% | 48.4% | 43.5% | 66.6% | 0.0% | 0.28 | 1.31 | AetherianVanguard 645T, JadeCovenant 475T, ScholarKingdoms 420T, ForgeClans 261T, RiverLeague 5T | RiverLeague 265T, ScholarKingdoms 264T, ForgeClans 203T, AetherianVanguard 134T, JadeCovenant 78T | ForgeClans 97T, ScholarKingdoms 48T, JadeCovenant 27T, AetherianVanguard 14T | ScholarKingdoms 6804G/140, maintain 2143G, ForgeClans 6424G/87, maintain 2350G, JadeCovenant 4932G/104, maintain 2657G, RiverLeague 4911G/54, AetherianVanguard 1572G/37, maintain 824G | 0.31 | 0.31 | WartimeRelease 3, Investment 1, Other 1 |
| Verdant Myth | Food | 10 | 96.20 | 1.2% | 0.0% | 1.2% | 41.5% | 41.1% | 60.0% | 0.0% | 0.10 | 1.10 | ScholarKingdoms 337T, StarborneSeekers 281T, RiverLeague 131T, JadeCovenant 125T, AetherianVanguard 88T | ScholarKingdoms 349T, RiverLeague 239T, JadeCovenant 27T, AetherianVanguard 6T | StarborneSeekers 112T, RiverLeague 49T | RiverLeague 4293G/72, maintain 1660G, ScholarKingdoms 3322G/53, StarborneSeekers 1582G/42, maintain 1582G, ForgeClans 1251G/19, JadeCovenant 503G/11, AetherianVanguard 379G/11, maintain 109G | 0.10 | 0.10 | WartimeRelease 1 |
| Wildroot Sanctum | Food | 17 | 152.18 | 1.2% | 0.2% | 1.0% | 54.3% | 52.6% | 50.1% | 2.3% | 0.89 | 1.47 | ForgeClans 1055T, JadeCovenant 411T, RiverLeague 409T, ScholarKingdoms 264T, AetherianVanguard 230T, StarborneSeekers 214T | JadeCovenant 412T, ForgeClans 391T, ScholarKingdoms 338T, RiverLeague 307T, AetherianVanguard 141T, StarborneSeekers 46T | ForgeClans 135T, ScholarKingdoms 68T, JadeCovenant 31T, AetherianVanguard 20T, RiverLeague 2T, StarborneSeekers 1T | JadeCovenant 21835G/183, maintain 2078G, ForgeClans 11094G/180, maintain 1772G, ScholarKingdoms 11015G/177, maintain 2952G, AetherianVanguard 8328G/89, maintain 256G, StarborneSeekers 6872G/103, maintain 1100G, RiverLeague 3401G/71, maintain 647G | 1.35 | 1.24 | Other 12, Investment 6, WartimeRelease 3 |
| Aureate Crown | Gold | 14 | 176.43 | 0.9% | 0.0% | 0.9% | 73.1% | 71.0% | 32.0% | 0.0% | 0.28 | 1.43 | StarborneSeekers 817T, JadeCovenant 538T, RiverLeague 423T, ScholarKingdoms 260T, AetherianVanguard 217T, ForgeClans 215T | ScholarKingdoms 383T, JadeCovenant 378T, AetherianVanguard 327T, StarborneSeekers 228T, ForgeClans 161T, RiverLeague 123T | StarborneSeekers 211T, ForgeClans 87T, RiverLeague 81T, ScholarKingdoms 60T, AetherianVanguard 42T, JadeCovenant 28T | JadeCovenant 16994G/192, maintain 2704G, StarborneSeekers 15073G/260, maintain 6779G, AetherianVanguard 12823G/132, maintain 997G, ScholarKingdoms 10358G/130, maintain 927G, RiverLeague 9241G/120, maintain 3101G, ForgeClans 7726G/119, maintain 1465G | 0.50 | 0.50 | WartimeRelease 4, Other 2, Investment 1 |
| Auric Bazaar | Gold | 12 | 124.92 | 0.4% | 0.0% | 0.4% | 65.5% | 65.4% | 34.8% | 1.8% | 0.27 | 1.08 | JadeCovenant 503T, ScholarKingdoms 273T, AetherianVanguard 264T, RiverLeague 264T, StarborneSeekers 107T, ForgeClans 88T | StarborneSeekers 458T, RiverLeague 290T, AetherianVanguard 89T, JadeCovenant 60T | JadeCovenant 79T, ScholarKingdoms 72T, RiverLeague 40T, AetherianVanguard 36T | JadeCovenant 13519G/153, maintain 2462G, StarborneSeekers 12423G/98, RiverLeague 9079G/131, maintain 1641G, ForgeClans 6203G/48, AetherianVanguard 3191G/60, maintain 1131G, ScholarKingdoms 2384G/64, maintain 2384G | 0.33 | 0.33 | Investment 2, Other 2 |
| Brassmoon Mint | Gold | 12 | 152.25 | 0.9% | 0.0% | 0.9% | 62.1% | 60.8% | 42.4% | 1.0% | 0.49 | 1.25 | RiverLeague 669T, ScholarKingdoms 608T, StarborneSeekers 334T, ForgeClans 216T | ScholarKingdoms 336T, RiverLeague 300T, ForgeClans 296T, AetherianVanguard 173T, StarborneSeekers 107T, JadeCovenant 41T | ForgeClans 155T, ScholarKingdoms 130T, RiverLeague 39T | AetherianVanguard 13567G/97, ForgeClans 11256G/142, maintain 2306G, RiverLeague 9359G/174, maintain 3944G, ScholarKingdoms 8571G/160, maintain 3442G, StarborneSeekers 3938G/52, maintain 670G, JadeCovenant 1837G/23 | 0.75 | 0.75 | Other 5, Investment 3, WartimeRelease 1 |
| Coinfire Crossing | Gold | 12 | 139.33 | 1.3% | 0.0% | 1.3% | 47.1% | 44.7% | 59.7% | 5.0% | 0.78 | 1.17 | ScholarKingdoms 390T, RiverLeague 380T, ForgeClans 345T, StarborneSeekers 303T, JadeCovenant 254T | ForgeClans 339T, ScholarKingdoms 180T, JadeCovenant 131T, AetherianVanguard 50T, StarborneSeekers 20T, RiverLeague 18T | ScholarKingdoms 48T, JadeCovenant 42T, ForgeClans 26T | ForgeClans 12032G/142, maintain 824G, JadeCovenant 8894G/125, maintain 2732G, ScholarKingdoms 5429G/86, maintain 1510G, RiverLeague 2576G/57, maintain 1309G, StarborneSeekers 2089G/54, maintain 1621G, AetherianVanguard 1019G/17 | 1.08 | 1.08 | Investment 9, Other 4 |
| Cresset Exchange | Gold | 12 | 134.50 | 0.3% | 0.0% | 0.3% | 37.5% | 36.5% | 66.0% | 0.0% | 0.12 | 1.17 | ForgeClans 449T, ScholarKingdoms 428T, AetherianVanguard 421T, RiverLeague 204T, StarborneSeekers 112T | ScholarKingdoms 147T, RiverLeague 93T, JadeCovenant 81T, AetherianVanguard 40T, ForgeClans 20T | ForgeClans 41T, StarborneSeekers 28T, RiverLeague 12T, AetherianVanguard 7T | RiverLeague 9601G/112, maintain 646G, JadeCovenant 5012G/53, AetherianVanguard 4201G/90, maintain 2321G, ScholarKingdoms 2526G/40, maintain 512G, ForgeClans 1472G/38, maintain 763G, StarborneSeekers 1310G/29, maintain 490G | 0.17 | 0.17 | Investment 1, WartimeRelease 1 |
| Crownmarket | Gold | 12 | 131.00 | 1.0% | 0.0% | 1.0% | 77.2% | 75.1% | 30.9% | 1.6% | 0.45 | 1.17 | RiverLeague 629T, ForgeClans 420T, JadeCovenant 192T, StarborneSeekers 172T, ScholarKingdoms 146T, AetherianVanguard 13T | StarborneSeekers 406T, RiverLeague 149T, AetherianVanguard 138T, ForgeClans 108T, ScholarKingdoms 79T | RiverLeague 143T, ForgeClans 47T, ScholarKingdoms 3T | ForgeClans 9526G/164, maintain 3245G, RiverLeague 8231G/189, maintain 6187G, StarborneSeekers 6835G/85, maintain 596G, AetherianVanguard 5630G/36, ScholarKingdoms 3670G/58, maintain 178G, JadeCovenant 2116G/53, maintain 1543G | 0.58 | 0.58 | Investment 7 |
| Embermint | Gold | 8 | 132.00 | 0.8% | 0.0% | 0.8% | 60.2% | 59.0% | 43.5% | 0.0% | 0.00 | 1.00 | ForgeClans 368T, StarborneSeekers 210T, JadeCovenant 182T, RiverLeague 154T, ScholarKingdoms 138T, AetherianVanguard 4T | RiverLeague 226T, AetherianVanguard 203T, ScholarKingdoms 139T, ForgeClans 138T | ForgeClans 75T, StarborneSeekers 38T, JadeCovenant 35T | ScholarKingdoms 13558G/95, maintain 1504G, RiverLeague 5562G/96, maintain 1582G, AetherianVanguard 4663G/49, ForgeClans 3553G/61, maintain 1348G, JadeCovenant 1646G/45, maintain 1646G, StarborneSeekers 1465G/39, maintain 1465G | 0.00 | 0.00 | None |
| Gildenspire | Gold | 14 | 137.29 | 1.9% | 0.0% | 1.9% | 51.7% | 48.3% | 60.0% | 0.0% | 0.21 | 1.21 | JadeCovenant 638T, StarborneSeekers 473T, RiverLeague 408T, ScholarKingdoms 362T, AetherianVanguard 40T, ForgeClans 1T | ScholarKingdoms 430T, AetherianVanguard 186T, ForgeClans 115T, StarborneSeekers 63T, RiverLeague 61T, JadeCovenant 26T | JadeCovenant 51T, AetherianVanguard 11T, StarborneSeekers 2T | ScholarKingdoms 16286G/160, maintain 1621G, AetherianVanguard 7769G/61, maintain 256G, JadeCovenant 5823G/149, maintain 4637G, RiverLeague 4264G/90, maintain 1685G, StarborneSeekers 4099G/93, maintain 2267G, ForgeClans 3382G/53 | 0.29 | 0.29 | Investment 2, WartimeRelease 2 |
| Golden Mirage | Gold | 6 | 150.83 | 1.2% | 0.0% | 1.2% | 79.3% | 79.1% | 23.8% | 0.0% | 0.22 | 1.33 | JadeCovenant 275T, ScholarKingdoms 247T, RiverLeague 208T, StarborneSeekers 175T | StarborneSeekers 422T, ForgeClans 175T, AetherianVanguard 45T, RiverLeague 6T | ScholarKingdoms 108T, JadeCovenant 45T, RiverLeague 25T, StarborneSeekers 1T | StarborneSeekers 7602G/100, maintain 1504G, ForgeClans 5536G/65, JadeCovenant 2523G/69, maintain 2523G, ScholarKingdoms 1978G/52, maintain 1948G, RiverLeague 1647G/42, maintain 1114G, AetherianVanguard 322G/8 | 0.33 | 0.33 | Investment 1, WartimeRelease 1 |
| Kingsmerch | Gold | 6 | 81.50 | 0.0% | 0.0% | 0.0% | 33.3% | 33.3% | 66.9% | 0.0% | 0.61 | 1.33 | ScholarKingdoms 308T, JadeCovenant 139T, ForgeClans 42T | JadeCovenant 92T, StarborneSeekers 67T, AetherianVanguard 54T, ForgeClans 26T | ScholarKingdoms 41T, ForgeClans 19T | AetherianVanguard 4775G/34, JadeCovenant 3584G/49, maintain 78G, ScholarKingdoms 2596G/57, maintain 1465G, StarborneSeekers 2059G/29, ForgeClans 1513G/27, maintain 232G, RiverLeague 30G/1 | 0.50 | 0.50 | Investment 1, Other 1, WartimeRelease 1 |
| Opaline Vault | Gold | 15 | 110.67 | 1.5% | 0.0% | 1.5% | 52.5% | 50.8% | 53.6% | 1.9% | 0.60 | 1.27 | ScholarKingdoms 666T, StarborneSeekers 481T, AetherianVanguard 322T, JadeCovenant 66T, RiverLeague 64T, ForgeClans 61T | JadeCovenant 391T, StarborneSeekers 215T, ForgeClans 198T, AetherianVanguard 150T, ScholarKingdoms 69T, RiverLeague 58T | StarborneSeekers 98T, ForgeClans 37T, ScholarKingdoms 35T, RiverLeague 18T, JadeCovenant 2T | JadeCovenant 14665G/88, maintain 242G, ScholarKingdoms 6773G/123, maintain 2891G, AetherianVanguard 6132G/65, maintain 351G, ForgeClans 5152G/100, maintain 1426G, StarborneSeekers 3824G/76, maintain 2178G, RiverLeague 3800G/70, maintain 1203G | 0.67 | 0.67 | Investment 8, WartimeRelease 2 |
| Radiant Hoard | Gold | 13 | 126.85 | 1.4% | 0.0% | 1.4% | 75.4% | 74.2% | 28.2% | 2.1% | 0.49 | 1.08 | StarborneSeekers 393T, JadeCovenant 380T, RiverLeague 338T, ForgeClans 259T, AetherianVanguard 146T, ScholarKingdoms 133T | ScholarKingdoms 458T, AetherianVanguard 216T, ForgeClans 115T, StarborneSeekers 89T, JadeCovenant 8T | RiverLeague 95T, ForgeClans 75T, JadeCovenant 71T, StarborneSeekers 29T, AetherianVanguard 28T | RiverLeague 9977G/152, maintain 4317G, ScholarKingdoms 9625G/109, ForgeClans 6378G/89, maintain 919G, AetherianVanguard 5460G/81, maintain 1284G, JadeCovenant 5439G/105, maintain 2582G, StarborneSeekers 1768G/39, maintain 749G | 0.62 | 0.62 | Investment 8 |
| Saffron Treasury | Gold | 21 | 143.24 | 0.4% | 0.0% | 0.4% | 49.2% | 47.6% | 54.5% | 0.6% | 0.27 | 1.19 | ScholarKingdoms 773T, AetherianVanguard 587T, ForgeClans 583T, JadeCovenant 448T, RiverLeague 415T, StarborneSeekers 202T | StarborneSeekers 710T, JadeCovenant 579T, RiverLeague 489T, AetherianVanguard 151T, ScholarKingdoms 127T, ForgeClans 113T | ForgeClans 166T, AetherianVanguard 114T, ScholarKingdoms 108T, RiverLeague 40T | StarborneSeekers 25683G/171, maintain 412G, JadeCovenant 18859G/131, RiverLeague 17855G/193, maintain 1916G, ScholarKingdoms 9572G/186, maintain 4083G, AetherianVanguard 8060G/129, maintain 2874G, ForgeClans 3843G/99, maintain 2243G | 0.38 | 0.38 | Investment 5, WartimeRelease 2, Other 1 |
| Starcoin Port | Gold | 17 | 129.88 | 0.5% | 0.0% | 0.5% | 57.7% | 53.6% | 54.1% | 1.3% | 0.32 | 1.29 | ForgeClans 670T, ScholarKingdoms 551T, RiverLeague 469T, AetherianVanguard 314T, JadeCovenant 186T, StarborneSeekers 18T | RiverLeague 400T, ScholarKingdoms 250T, ForgeClans 207T, JadeCovenant 135T, StarborneSeekers 128T, AetherianVanguard 82T | RiverLeague 103T, ForgeClans 86T, ScholarKingdoms 68T, JadeCovenant 61T, AetherianVanguard 1T | RiverLeague 12802G/172, maintain 3103G, JadeCovenant 9613G/130, maintain 2050G, ForgeClans 7932G/116, maintain 2594G, ScholarKingdoms 7912G/106, maintain 1256G, StarborneSeekers 4177G/57, AetherianVanguard 3899G/52, maintain 78G | 0.41 | 0.41 | Investment 3, WartimeRelease 3, Other 1 |
| Suncoin Citadel | Gold | 9 | 88.22 | 0.3% | 0.0% | 0.3% | 40.2% | 40.2% | 59.9% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 281T, AetherianVanguard 250T, JadeCovenant 163T, RiverLeague 100T | RiverLeague 162T, ForgeClans 131T, AetherianVanguard 125T, StarborneSeekers 80T, JadeCovenant 5T | ScholarKingdoms 25T | RiverLeague 7217G/40, AetherianVanguard 2139G/39, maintain 618G, StarborneSeekers 1743G/27, ForgeClans 1704G/30, ScholarKingdoms 724G/20, maintain 724G, JadeCovenant 63G/2 | 0.00 | 0.00 | None |
| Velvet Ledger | Gold | 11 | 182.36 | 0.5% | 0.0% | 0.5% | 79.1% | 79.1% | 20.9% | 0.0% | 0.05 | 1.09 | RiverLeague 844T, ForgeClans 711T, JadeCovenant 356T, ScholarKingdoms 95T | StarborneSeekers 748T, AetherianVanguard 454T, RiverLeague 327T, JadeCovenant 276T, ScholarKingdoms 207T, ForgeClans 61T | RiverLeague 146T, ForgeClans 110T, JadeCovenant 57T, ScholarKingdoms 25T | StarborneSeekers 22356G/148, AetherianVanguard 21191G/159, RiverLeague 15145G/209, maintain 5609G, JadeCovenant 9186G/121, maintain 1621G, ForgeClans 5521G/114, maintain 2759G, ScholarKingdoms 3210G/32, maintain 78G | 0.09 | 0.09 | WartimeRelease 1 |
| Ashen Bellows | Production | 11 | 147.09 | 1.1% | 0.0% | 1.1% | 65.4% | 64.8% | 36.2% | 0.0% | 0.06 | 1.09 | ScholarKingdoms 713T, ForgeClans 446T, StarborneSeekers 270T, RiverLeague 107T, AetherianVanguard 82T | AetherianVanguard 341T, RiverLeague 244T, ScholarKingdoms 239T, ForgeClans 186T | ScholarKingdoms 207T, ForgeClans 143T | RiverLeague 10142G/104, maintain 878G, AetherianVanguard 7374G/85, ScholarKingdoms 5214G/120, maintain 3693G, ForgeClans 3846G/99, maintain 2757G, StarborneSeekers 706G/20, maintain 529G, JadeCovenant 98G/3 | 0.09 | 0.09 | Investment 1 |
| Blackglass Armory | Production | 12 | 147.75 | 0.2% | 0.0% | 0.2% | 60.3% | 60.3% | 39.9% | 0.0% | 0.23 | 1.33 | ForgeClans 965T, JadeCovenant 296T, ScholarKingdoms 173T, AetherianVanguard 147T, StarborneSeekers 126T, RiverLeague 66T | AetherianVanguard 380T, StarborneSeekers 306T, ForgeClans 167T, ScholarKingdoms 151T, JadeCovenant 132T | ForgeClans 137T, StarborneSeekers 18T | AetherianVanguard 12836G/126, JadeCovenant 8103G/107, maintain 133G, StarborneSeekers 5989G/91, maintain 109G, ForgeClans 4235G/90, maintain 2368G, ScholarKingdoms 3720G/65, maintain 856G, RiverLeague 2410G/35 | 0.33 | 0.33 | Investment 2, WartimeRelease 2 |
| Brasshollow | Production | 9 | 147.11 | 0.2% | 0.0% | 0.2% | 50.2% | 49.4% | 52.3% | 0.0% | 0.15 | 1.22 | RiverLeague 499T, ForgeClans 342T, JadeCovenant 217T, ScholarKingdoms 196T, StarborneSeekers 48T, AetherianVanguard 22T | StarborneSeekers 378T, ForgeClans 189T, AetherianVanguard 96T | JadeCovenant 77T, StarborneSeekers 1T | StarborneSeekers 9086G/80, JadeCovenant 7861G/116, maintain 3086G, ForgeClans 7101G/75, maintain 1441G, AetherianVanguard 4845G/49, RiverLeague 1673G/22, ScholarKingdoms 142G/5, maintain 142G | 0.22 | 0.22 | Investment 1, WartimeRelease 1 |
| Cinderhold | Production | 9 | 148.44 | 1.0% | 0.0% | 1.0% | 58.5% | 57.3% | 45.7% | 2.4% | 0.67 | 1.22 | RiverLeague 564T, JadeCovenant 388T, ForgeClans 243T, ScholarKingdoms 141T | ForgeClans 435T, JadeCovenant 196T, RiverLeague 192T, AetherianVanguard 180T, StarborneSeekers 156T, ScholarKingdoms 74T | JadeCovenant 66T, RiverLeague 54T, ForgeClans 32T | ForgeClans 7476G/120, maintain 1582G, RiverLeague 5334G/125, maintain 3107G, JadeCovenant 5093G/116, maintain 2799G, StarborneSeekers 4410G/50, AetherianVanguard 3891G/36, ScholarKingdoms 1673G/22 | 1.00 | 1.00 | Investment 8, WartimeRelease 1 |
| Dawnsmelt Keep | Production | 16 | 139.06 | 1.0% | 0.0% | 1.0% | 57.8% | 53.8% | 52.7% | 5.2% | 1.12 | 1.31 | StarborneSeekers 654T, ScholarKingdoms 606T, ForgeClans 394T, AetherianVanguard 351T, JadeCovenant 161T, RiverLeague 59T | ScholarKingdoms 477T, RiverLeague 300T, ForgeClans 265T, AetherianVanguard 255T, JadeCovenant 128T, StarborneSeekers 73T | ScholarKingdoms 163T, ForgeClans 99T, StarborneSeekers 50T, AetherianVanguard 13T | ForgeClans 15057G/163, maintain 2409G, AetherianVanguard 14349G/156, maintain 1929G, ScholarKingdoms 9899G/172, maintain 3138G, RiverLeague 8313G/98, JadeCovenant 3850G/40, StarborneSeekers 2743G/71, maintain 2094G | 1.56 | 1.56 | Investment 20, WartimeRelease 3, Other 2 |
| Emberforge Bastion | Production | 14 | 161.50 | 0.8% | 0.0% | 0.8% | 68.5% | 66.2% | 38.0% | 0.8% | 0.40 | 1.36 | RiverLeague 578T, ForgeClans 485T, StarborneSeekers 382T, ScholarKingdoms 301T, AetherianVanguard 284T, JadeCovenant 231T | StarborneSeekers 419T, RiverLeague 347T, ForgeClans 298T, ScholarKingdoms 201T, AetherianVanguard 197T, JadeCovenant 89T | RiverLeague 144T, JadeCovenant 74T, ForgeClans 52T, ScholarKingdoms 15T, StarborneSeekers 9T, AetherianVanguard 2T | JadeCovenant 12554G/93, maintain 1691G, RiverLeague 10769G/168, maintain 3381G, StarborneSeekers 9889G/143, maintain 1476G, AetherianVanguard 9725G/116, maintain 390G, ForgeClans 5371G/118, maintain 3094G, ScholarKingdoms 5008G/85, maintain 1897G | 0.64 | 0.64 | Investment 4, WartimeRelease 4, Other 1 |
| Flintspire Works | Production | 11 | 106.55 | 0.4% | 0.0% | 0.4% | 45.6% | 44.5% | 58.7% | 0.0% | 0.26 | 1.27 | JadeCovenant 444T, ScholarKingdoms 321T, RiverLeague 183T, StarborneSeekers 122T, ForgeClans 91T, AetherianVanguard 11T | RiverLeague 163T, AetherianVanguard 87T, JadeCovenant 82T, ScholarKingdoms 11T | JadeCovenant 59T, ScholarKingdoms 27T | RiverLeague 9317G/104, maintain 217G, JadeCovenant 8337G/125, maintain 1808G, ScholarKingdoms 2485G/60, maintain 1660G, ForgeClans 1498G/40, maintain 1168G, AetherianVanguard 503G/11 | 0.27 | 0.27 | WartimeRelease 2, Investment 1 |
| Gearstorm Hold | Production | 11 | 119.91 | 1.7% | 0.0% | 1.7% | 69.7% | 65.7% | 43.5% | 0.8% | 0.68 | 1.36 | ScholarKingdoms 738T, JadeCovenant 208T, ForgeClans 196T, StarborneSeekers 139T, AetherianVanguard 29T, RiverLeague 9T | ForgeClans 317T, RiverLeague 283T, StarborneSeekers 117T, ScholarKingdoms 13T, AetherianVanguard 3T | ScholarKingdoms 83T, StarborneSeekers 19T, JadeCovenant 13T, RiverLeague 6T | RiverLeague 10696G/102, maintain 217G, ForgeClans 8320G/107, maintain 256G, StarborneSeekers 6809G/88, maintain 312G, ScholarKingdoms 5328G/143, maintain 4690G, JadeCovenant 5220G/80, maintain 1192G, AetherianVanguard 669G/18 | 0.82 | 0.82 | Investment 3, Other 3, WartimeRelease 3 |
| Hammerdeep | Production | 13 | 113.77 | 0.5% | 0.0% | 0.5% | 29.7% | 28.9% | 73.4% | 2.7% | 0.74 | 1.31 | ForgeClans 442T, RiverLeague 418T, ScholarKingdoms 259T, AetherianVanguard 192T, StarborneSeekers 129T, JadeCovenant 39T | AetherianVanguard 65T, JadeCovenant 53T, ScholarKingdoms 34T, StarborneSeekers 24T, ForgeClans 3T | ScholarKingdoms 16T, StarborneSeekers 9T | AetherianVanguard 6039G/82, maintain 262G, JadeCovenant 4721G/48, ForgeClans 4036G/56, maintain 50G, StarborneSeekers 3538G/63, maintain 1115G, ScholarKingdoms 3020G/73, maintain 1301G, RiverLeague 2546G/68, maintain 2516G | 0.85 | 0.85 | Investment 6, Other 3, WartimeRelease 2 |
| Ironwyrm Foundry | Production | 14 | 120.43 | 0.6% | 0.0% | 0.6% | 61.6% | 60.3% | 41.6% | 1.1% | 0.36 | 1.14 | RiverLeague 603T, AetherianVanguard 463T, ScholarKingdoms 239T, JadeCovenant 175T, ForgeClans 144T, StarborneSeekers 62T | StarborneSeekers 512T, JadeCovenant 133T, ScholarKingdoms 110T, AetherianVanguard 48T, RiverLeague 2T | RiverLeague 129T, AetherianVanguard 78T, ScholarKingdoms 49T, ForgeClans 21T, JadeCovenant 2T | StarborneSeekers 7899G/105, JadeCovenant 7847G/63, maintain 64G, RiverLeague 6129G/144, maintain 4356G, ScholarKingdoms 5164G/84, maintain 1370G, AetherianVanguard 3637G/88, maintain 2307G, ForgeClans 721G/20, maintain 451G | 0.43 | 0.43 | Investment 4, Other 2 |
| Molten Crown | Production | 9 | 128.56 | 0.6% | 0.0% | 0.6% | 73.0% | 71.9% | 30.2% | 0.0% | 0.09 | 1.11 | ForgeClans 485T, JadeCovenant 378T, ScholarKingdoms 162T, StarborneSeekers 93T, AetherianVanguard 39T | AetherianVanguard 307T, ScholarKingdoms 201T, StarborneSeekers 164T, ForgeClans 118T | ForgeClans 185T, JadeCovenant 53T, AetherianVanguard 1T | AetherianVanguard 7585G/88, ForgeClans 6486G/99, maintain 2445G, StarborneSeekers 3778G/45, maintain 475G, ScholarKingdoms 2327G/42, maintain 256G, JadeCovenant 1504G/40, maintain 1504G, RiverLeague 660G/16 | 0.11 | 0.11 | Other 1 |
| Obsidian Kiln | Production | 12 | 129.58 | 0.6% | 0.0% | 0.6% | 77.1% | 72.5% | 34.5% | 3.5% | 1.29 | 1.42 | RiverLeague 389T, AetherianVanguard 371T, ScholarKingdoms 367T, JadeCovenant 255T, ForgeClans 104T, StarborneSeekers 69T | RiverLeague 393T, ScholarKingdoms 384T, AetherianVanguard 332T, StarborneSeekers 178T, ForgeClans 106T | ScholarKingdoms 200T, AetherianVanguard 104T, ForgeClans 29T, RiverLeague 1T, StarborneSeekers 1T | RiverLeague 12653G/120, maintain 1511G, AetherianVanguard 9016G/134, maintain 2802G, ForgeClans 7824G/124, maintain 1231G, StarborneSeekers 7511G/91, ScholarKingdoms 6467G/101, maintain 1752G, JadeCovenant 1885G/50, maintain 1855G | 1.67 | 1.67 | Investment 11, Other 8, WartimeRelease 1 |
| Runehammer Gate | Production | 12 | 108.25 | 1.5% | 0.0% | 1.5% | 67.4% | 65.7% | 37.3% | 0.0% | 0.23 | 1.25 | AetherianVanguard 428T, ScholarKingdoms 320T, ForgeClans 241T, StarborneSeekers 182T, JadeCovenant 111T, RiverLeague 17T | ScholarKingdoms 306T, ForgeClans 211T, RiverLeague 200T, AetherianVanguard 191T, JadeCovenant 107T, StarborneSeekers 35T | ScholarKingdoms 68T, ForgeClans 52T, StarborneSeekers 37T, AetherianVanguard 30T, RiverLeague 11T | ForgeClans 13875G/101, maintain 590G, AetherianVanguard 9029G/126, maintain 1955G, StarborneSeekers 5083G/106, maintain 2518G, ScholarKingdoms 4875G/71, maintain 852G, JadeCovenant 4426G/55, maintain 178G, RiverLeague 1197G/29, maintain 412G | 0.25 | 0.25 | WartimeRelease 3 |
| Skyfurnace | Production | 11 | 194.55 | 0.7% | 0.0% | 0.7% | 61.9% | 57.8% | 49.8% | 1.6% | 0.56 | 1.64 | ForgeClans 1033T, ScholarKingdoms 331T, JadeCovenant 323T, RiverLeague 295T, StarborneSeekers 157T, AetherianVanguard 1T | ScholarKingdoms 595T, JadeCovenant 462T, StarborneSeekers 444T, ForgeClans 186T, AetherianVanguard 162T, RiverLeague 6T | ForgeClans 157T, JadeCovenant 87T, RiverLeague 44T, ScholarKingdoms 10T, AetherianVanguard 1T, StarborneSeekers 1T | RiverLeague 13661G/128, maintain 1387G, StarborneSeekers 13405G/117, maintain 39G, JadeCovenant 8627G/133, maintain 3108G, ScholarKingdoms 7110G/113, maintain 1306G, ForgeClans 4671G/95, maintain 1658G, AetherianVanguard 177G/5 | 1.09 | 1.09 | WartimeRelease 5, Investment 4, Other 3 |
| Stonewake Crucible | Production | 13 | 130.08 | 0.8% | 0.0% | 0.8% | 62.1% | 61.8% | 39.7% | 0.0% | 0.12 | 1.08 | RiverLeague 754T, JadeCovenant 474T, StarborneSeekers 280T, ScholarKingdoms 176T, AetherianVanguard 7T | AetherianVanguard 223T, ScholarKingdoms 211T, StarborneSeekers 130T, ForgeClans 115T, RiverLeague 45T | JadeCovenant 141T, ScholarKingdoms 52T, RiverLeague 26T | AetherianVanguard 10538G/91, ForgeClans 9463G/85, JadeCovenant 7861G/163, maintain 4008G, RiverLeague 5569G/131, maintain 3498G, StarborneSeekers 5390G/63, ScholarKingdoms 4612G/70, maintain 671G | 0.15 | 0.15 | Other 2 |
| Thunder Anvil | Production | 11 | 167.55 | 0.3% | 0.0% | 0.3% | 59.7% | 59.4% | 41.0% | 0.0% | 0.11 | 1.18 | JadeCovenant 595T, ForgeClans 547T, ScholarKingdoms 535T, AetherianVanguard 91T, RiverLeague 75T | AetherianVanguard 339T, ScholarKingdoms 263T, ForgeClans 206T, RiverLeague 17T | ScholarKingdoms 136T, JadeCovenant 98T, ForgeClans 94T, RiverLeague 39T | RiverLeague 11616G/102, maintain 1738G, AetherianVanguard 10502G/108, JadeCovenant 5461G/122, maintain 2618G, ScholarKingdoms 4499G/106, maintain 2852G, StarborneSeekers 4394G/33, ForgeClans 3402G/76, maintain 1548G | 0.18 | 0.18 | Other 1, WartimeRelease 1 |
| Aetherquill | Science | 15 | 167.00 | 1.2% | 0.0% | 1.2% | 82.0% | 80.7% | 24.2% | 0.6% | 0.24 | 1.20 | JadeCovenant 685T, ForgeClans 642T, StarborneSeekers 481T, RiverLeague 389T, ScholarKingdoms 272T, AetherianVanguard 36T | AetherianVanguard 795T, StarborneSeekers 645T, RiverLeague 331T, ScholarKingdoms 98T, JadeCovenant 49T, ForgeClans 33T | JadeCovenant 218T, StarborneSeekers 152T, ForgeClans 147T, ScholarKingdoms 65T, RiverLeague 44T | AetherianVanguard 30088G/190, maintain 78G, StarborneSeekers 23039G/251, maintain 3364G, RiverLeague 17106G/206, maintain 1660G, JadeCovenant 12433G/221, maintain 5058G, ScholarKingdoms 8351G/129, maintain 2596G, ForgeClans 6430G/159, maintain 4941G | 0.40 | 0.40 | Investment 4, WartimeRelease 2 |
| Arcstar Repository | Science | 10 | 121.80 | 1.6% | 0.0% | 1.6% | 48.7% | 47.7% | 55.3% | 0.0% | 0.08 | 1.10 | AetherianVanguard 569T, JadeCovenant 328T, ScholarKingdoms 182T, StarborneSeekers 139T | ForgeClans 326T, AetherianVanguard 314T, JadeCovenant 208T, RiverLeague 16T | AetherianVanguard 90T, ScholarKingdoms 40T, JadeCovenant 4T | JadeCovenant 8698G/137, maintain 2479G, ForgeClans 6544G/59, AetherianVanguard 5592G/68, maintain 824G, ScholarKingdoms 1942G/50, maintain 1504G, RiverLeague 574G/14 | 0.10 | 0.10 | WartimeRelease 1 |
| Celestine Scriptorium | Science | 10 | 98.30 | 0.3% | 0.0% | 0.3% | 75.0% | 75.0% | 25.0% | 0.0% | 0.00 | 1.00 | StarborneSeekers 233T, ForgeClans 198T, ScholarKingdoms 187T, AetherianVanguard 165T, RiverLeague 142T, JadeCovenant 58T | StarborneSeekers 197T, RiverLeague 185T, AetherianVanguard 138T | AetherianVanguard 87T, ForgeClans 63T, ScholarKingdoms 50T, RiverLeague 27T, StarborneSeekers 4T, JadeCovenant 2T | RiverLeague 14976G/106, maintain 1075G, AetherianVanguard 5257G/72, maintain 1543G, StarborneSeekers 5003G/91, maintain 1763G, ScholarKingdoms 3792G/53, maintain 919G, ForgeClans 1465G/39, maintain 1465G, JadeCovenant 78G/3, maintain 78G | 0.00 | 0.00 | None |
| Dreaming Calculus | Science | 14 | 152.50 | 0.4% | 0.0% | 0.4% | 50.2% | 49.3% | 53.5% | 0.0% | 0.09 | 1.14 | StarborneSeekers 460T, JadeCovenant 432T, AetherianVanguard 412T, ScholarKingdoms 351T, ForgeClans 250T, RiverLeague 230T | RiverLeague 412T, JadeCovenant 346T, ForgeClans 334T, StarborneSeekers 184T, AetherianVanguard 127T, ScholarKingdoms 81T | JadeCovenant 109T, StarborneSeekers 77T, RiverLeague 69T | RiverLeague 18513G/144, maintain 1892G, JadeCovenant 13349G/178, maintain 3303G, AetherianVanguard 7357G/72, maintain 1217G, StarborneSeekers 4123G/87, maintain 1892G, ForgeClans 3469G/62, maintain 880G, ScholarKingdoms 2715G/47 | 0.14 | 0.14 | Investment 2 |
| Eclipsed Theorem | Science | 13 | 136.38 | 0.6% | 0.0% | 0.6% | 39.1% | 37.5% | 65.0% | 0.0% | 0.45 | 1.46 | ForgeClans 450T, ScholarKingdoms 422T, JadeCovenant 324T, StarborneSeekers 258T, AetherianVanguard 204T, RiverLeague 115T | ScholarKingdoms 218T, RiverLeague 144T, JadeCovenant 143T, ForgeClans 64T, StarborneSeekers 31T, AetherianVanguard 2T | ForgeClans 81T, JadeCovenant 16T, AetherianVanguard 2T | RiverLeague 7630G/95, maintain 78G, JadeCovenant 5596G/87, maintain 397G, ForgeClans 3012G/73, maintain 1409G, AetherianVanguard 2360G/60, maintain 1651G, ScholarKingdoms 2314G/36, StarborneSeekers 1650G/41, maintain 1178G | 0.62 | 0.62 | WartimeRelease 5, Investment 2, Other 1 |
| Halcyon Loom | Science | 11 | 168.36 | 0.4% | 0.0% | 0.4% | 56.6% | 55.9% | 45.6% | 0.0% | 0.27 | 1.36 | ForgeClans 689T, JadeCovenant 510T, RiverLeague 252T, StarborneSeekers 162T, AetherianVanguard 137T, ScholarKingdoms 102T | RiverLeague 345T, AetherianVanguard 249T, ScholarKingdoms 173T, JadeCovenant 154T, StarborneSeekers 4T | ForgeClans 159T, StarborneSeekers 28T, ScholarKingdoms 25T, RiverLeague 6T | AetherianVanguard 13156G/135, maintain 546G, RiverLeague 12252G/85, maintain 671G, JadeCovenant 8303G/121, maintain 1077G, StarborneSeekers 4845G/82, maintain 1385G, ForgeClans 4269G/96, maintain 2655G, ScholarKingdoms 1736G/31, maintain 54G | 0.45 | 0.45 | Investment 3, WartimeRelease 2 |
| Lunarchive | Science | 12 | 135.67 | 0.6% | 0.0% | 0.6% | 64.9% | 61.0% | 47.4% | 1.3% | 0.61 | 1.25 | RiverLeague 493T, ScholarKingdoms 429T, ForgeClans 340T, JadeCovenant 208T, AetherianVanguard 111T, StarborneSeekers 47T | StarborneSeekers 449T, ScholarKingdoms 190T, RiverLeague 162T, JadeCovenant 158T, AetherianVanguard 117T, ForgeClans 49T | JadeCovenant 62T, ForgeClans 60T, ScholarKingdoms 50T, RiverLeague 41T, StarborneSeekers 6T | JadeCovenant 10336G/153, maintain 2540G, StarborneSeekers 7272G/89, maintain 173G, RiverLeague 5176G/112, maintain 3203G, ForgeClans 4185G/94, maintain 2290G, ScholarKingdoms 3513G/85, maintain 2111G, AetherianVanguard 1196G/22 | 0.83 | 0.83 | Investment 7, WartimeRelease 3 |
| Meridian of Runes | Science | 14 | 130.93 | 0.1% | 0.0% | 0.1% | 36.1% | 36.1% | 64.0% | 0.0% | 0.00 | 1.00 | AetherianVanguard 511T, ForgeClans 353T, RiverLeague 353T, JadeCovenant 328T, ScholarKingdoms 184T, StarborneSeekers 104T | StarborneSeekers 305T, JadeCovenant 252T, RiverLeague 84T, AetherianVanguard 51T, ForgeClans 27T | AetherianVanguard 55T, ForgeClans 44T, JadeCovenant 28T, RiverLeague 25T | StarborneSeekers 12360G/117, ForgeClans 11457G/104, maintain 490G, JadeCovenant 9974G/142, maintain 2423G, RiverLeague 5418G/74, maintain 451G, AetherianVanguard 4860G/125, maintain 3849G, ScholarKingdoms 1861G/24, maintain 24G | 0.00 | 0.00 | None |
| Nyx Codex | Science | 9 | 114.44 | 0.4% | 0.0% | 0.4% | 46.7% | 46.3% | 55.0% | 0.0% | 0.29 | 1.33 | RiverLeague 381T, JadeCovenant 366T, StarborneSeekers 175T, ScholarKingdoms 38T, AetherianVanguard 36T, ForgeClans 34T | AetherianVanguard 261T, StarborneSeekers 188T, JadeCovenant 51T, ScholarKingdoms 34T, RiverLeague 18T | RiverLeague 96T, StarborneSeekers 50T, ScholarKingdoms 18T, ForgeClans 5T, JadeCovenant 3T | StarborneSeekers 14626G/119, maintain 1853G, AetherianVanguard 6347G/63, JadeCovenant 3663G/63, maintain 109G, RiverLeague 3416G/83, maintain 2596G, ScholarKingdoms 1048G/18, maintain 295G, ForgeClans 595G/16, maintain 459G | 0.33 | 0.33 | Investment 1, Other 1, WartimeRelease 1 |
| Observatory of Whispers | Science | 10 | 141.50 | 1.3% | 0.0% | 1.3% | 64.0% | 61.9% | 45.8% | 3.7% | 0.78 | 1.10 | JadeCovenant 598T, RiverLeague 400T, StarborneSeekers 245T, ScholarKingdoms 172T | AetherianVanguard 245T, RiverLeague 184T, JadeCovenant 171T, ForgeClans 154T, ScholarKingdoms 86T | JadeCovenant 70T, RiverLeague 39T, ScholarKingdoms 30T, StarborneSeekers 25T | RiverLeague 9969G/166, maintain 4267G, AetherianVanguard 8443G/41, ScholarKingdoms 5238G/106, maintain 1738G, JadeCovenant 4406G/92, maintain 2184G, ForgeClans 2955G/35, StarborneSeekers 646G/18, maintain 646G | 1.10 | 1.10 | Investment 6, Other 4, WartimeRelease 1 |
| Prism Oracle | Science | 9 | 104.00 | 0.0% | 0.0% | 0.0% | 40.0% | 40.0% | 60.0% | 0.0% | 0.00 | 1.00 | ForgeClans 260T, AetherianVanguard 241T, RiverLeague 241T, ScholarKingdoms 194T | RiverLeague 120T, ScholarKingdoms 96T, JadeCovenant 88T, StarborneSeekers 70T | AetherianVanguard 27T, ForgeClans 1T | RiverLeague 9291G/102, maintain 1660G, JadeCovenant 4775G/34, StarborneSeekers 3456G/44, ScholarKingdoms 3424G/66, maintain 1489G, ForgeClans 2314G/54, maintain 1398G, AetherianVanguard 802G/22, maintain 802G | 0.00 | 0.00 | None |
| Quillspire | Science | 19 | 129.11 | 0.9% | 0.0% | 0.9% | 58.9% | 54.1% | 55.3% | 3.1% | 0.69 | 1.21 | RiverLeague 611T, ScholarKingdoms 502T, StarborneSeekers 455T, JadeCovenant 351T, AetherianVanguard 330T, ForgeClans 204T | ScholarKingdoms 415T, AetherianVanguard 294T, ForgeClans 199T, JadeCovenant 158T, RiverLeague 64T | StarborneSeekers 107T, ScholarKingdoms 88T, ForgeClans 86T, AetherianVanguard 62T, RiverLeague 40T, JadeCovenant 22T | JadeCovenant 18255G/161, maintain 3298G, ScholarKingdoms 11735G/194, maintain 2387G, RiverLeague 10699G/164, maintain 3910G, AetherianVanguard 8972G/167, maintain 2830G, ForgeClans 7764G/109, maintain 746G, StarborneSeekers 2891G/77, maintain 2891G | 0.89 | 0.89 | Investment 12, WartimeRelease 3, Other 2 |
| Radiant Lexicon | Science | 11 | 126.00 | 1.5% | 0.0% | 1.5% | 65.4% | 62.0% | 43.4% | 8.3% | 2.02 | 1.45 | AetherianVanguard 357T, ForgeClans 346T, JadeCovenant 226T, ScholarKingdoms 216T, StarborneSeekers 158T, RiverLeague 83T | StarborneSeekers 547T, RiverLeague 209T, AetherianVanguard 193T, JadeCovenant 168T, ForgeClans 103T, ScholarKingdoms 17T | ForgeClans 181T, AetherianVanguard 51T, RiverLeague 30T, ScholarKingdoms 13T, StarborneSeekers 7T, JadeCovenant 2T | StarborneSeekers 8614G/119, maintain 529G, RiverLeague 8307G/76, maintain 967G, ScholarKingdoms 6558G/69, maintain 520G, ForgeClans 5573G/123, maintain 3028G, JadeCovenant 5483G/68, maintain 137G, AetherianVanguard 3628G/68, maintain 1281G | 2.55 | 2.55 | Investment 13, Other 13, WartimeRelease 2 |
| Sapphire Mnemos | Science | 14 | 153.64 | 0.3% | 0.0% | 0.3% | 73.6% | 71.9% | 32.4% | 0.0% | 0.19 | 1.29 | ScholarKingdoms 702T, StarborneSeekers 654T, RiverLeague 368T, ForgeClans 249T, JadeCovenant 166T, AetherianVanguard 12T | RiverLeague 778T, StarborneSeekers 486T, JadeCovenant 290T, ForgeClans 4T | ScholarKingdoms 146T, StarborneSeekers 145T, RiverLeague 67T, JadeCovenant 2T, ForgeClans 1T | RiverLeague 17521G/223, maintain 3576G, StarborneSeekers 9236G/172, maintain 3047G, ScholarKingdoms 7608G/134, maintain 3537G, JadeCovenant 5658G/89, maintain 1053G, ForgeClans 136G/4 | 0.29 | 0.29 | WartimeRelease 3, Other 1 |
| Starglass Athenaeum | Science | 7 | 167.00 | 0.9% | 0.0% | 0.9% | 81.5% | 78.3% | 28.7% | 6.7% | 1.28 | 1.43 | ForgeClans 500T, ScholarKingdoms 480T, JadeCovenant 97T, RiverLeague 92T | RiverLeague 535T, StarborneSeekers 115T, JadeCovenant 96T, ForgeClans 60T | ForgeClans 62T, ScholarKingdoms 58T, JadeCovenant 4T | RiverLeague 9416G/65, maintain 24G, ForgeClans 8354G/151, maintain 3904G, JadeCovenant 5535G/59, maintain 571G, ScholarKingdoms 4985G/99, maintain 2750G, StarborneSeekers 2652G/39, AetherianVanguard 2411G/26 | 2.14 | 2.14 | Investment 10, Other 5 |
| Voidlight Archive | Science | 10 | 135.40 | 0.7% | 0.0% | 0.7% | 62.5% | 59.0% | 46.8% | 0.0% | 0.44 | 1.60 | StarborneSeekers 528T, JadeCovenant 268T, ScholarKingdoms 204T, ForgeClans 162T, RiverLeague 151T, AetherianVanguard 41T | ForgeClans 364T, AetherianVanguard 252T, ScholarKingdoms 130T, RiverLeague 115T, JadeCovenant 26T | ScholarKingdoms 131T, StarborneSeekers 81T, ForgeClans 36T, AetherianVanguard 12T, RiverLeague 1T | JadeCovenant 7832G/101, maintain 685G, AetherianVanguard 7771G/82, maintain 388G, ScholarKingdoms 7532G/114, maintain 1955G, RiverLeague 5242G/73, maintain 507G, StarborneSeekers 4023G/100, maintain 3203G, ForgeClans 2966G/52, maintain 473G | 0.60 | 0.60 | WartimeRelease 4, Investment 1, Other 1 |

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

