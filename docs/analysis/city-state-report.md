# City-State Simulation Report

Generated: 2026-03-07T14:30:00.151Z

## Data Coverage
- Simulations processed: 50
- Simulations with city-state telemetry: 50
- Simulations missing city-state telemetry: 0
- Total city-states created: 188
- Total city-state active turns: 22094
- Total contested turns: 220 (No Suz: 19, Close-race: 201)
- Total turnover-window turns: 12945
- Total flip-window turns: 12518
- Total safe-lead incumbent turns: 10578
- Total hotspot turns: 223
- Contest telemetry coverage (city-state entries): 188 with split fields, 0 legacy-only
- Global suzerain flip rate: 0.35 per 100 active turns
- True ownership turnover rate: 0.35 per 100 active turns
- Average unique suzerains per city-state: 1.16
- Average city-states created per telemetry simulation: 3.76
- Average surviving city-states at game end (telemetry sims): 3.72



## Creation Timing
- Simulations with at least one city-state created: 48/50 (96.0%)
- First city-state creation turn (min / p25 / median / p75 / max): 70 / 101 / 130 / 171 / 318
- First city-state creation turn (average, sims with any): 140.4

## Map-Size Creation Rates
| Map | Sims | Telemetry Sims | Sims with >=1 CS | Share with >=1 CS | Total Created | Avg Created / Telemetry Sim | Avg First CS Turn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tiny | 10 | 10 | 9 | 90.0% | 14 | 1.40 | 138.7 |
| Small | 10 | 10 | 9 | 90.0% | 15 | 1.50 | 153.2 |
| Standard | 10 | 10 | 10 | 100.0% | 42 | 4.20 | 121.0 |
| Large | 10 | 10 | 10 | 100.0% | 67 | 6.70 | 139.8 |
| Huge | 10 | 10 | 10 | 100.0% | 50 | 5.00 | 150.3 |

## Camp-Clearing Activation Funnel
- Camp-clearing episodes observed: 2095
- Direct starts in Ready: 1036 (49.5%)
- Episodes that reached Ready: 1477 (70.5%)
- Episodes with sighting telemetry: 1204 (57.5%)
- Sighted -> prep start (avg / median): 80.49 / 70 turns
- Prep start -> first Ready (avg / median): 2.51 / 0 turns
- Prep start -> self clear (avg / median): 14.53 / 10 turns
- Total prep duration (avg / median): 7.94 / 1 turns
- Timeouts after reaching Ready: 59 (16.7% of timeouts)
- Ready turn diagnostics: no contact 2741, adjacent contact 365, attack opportunity 1290, stalled opportunity 721, power disadvantage 936, progress 739
- Ready-timeout primary breakdown: no contact 37, declined attack 12, power collapse 10, other 0
- War-interrupted episodes: 354 (16.9%)
- Cleared-by-other breakdown: lacked military 10, late start 32, other 25
- Initial prep state mix: Buildup 475, Gathering 36, Positioning 548, Ready 1036

### Camp Outcomes
| Outcome | Episodes | Share |
| --- | --- | --- |
| ClearedBySelf | 178 | 8.5% |
| ClearedByOther | 67 | 3.2% |
| TimedOut | 353 | 16.8% |
| WartimeEmergencyCancelled | 354 | 16.9% |
| OtherCancelled | 1112 | 53.1% |
| StillActive | 31 | 1.5% |

### Camp Funnel By Readiness
| Readiness | Episodes | Self Clears | Self Clear Rate | Timeouts | Timeout Rate | Avg Prep Turns | Avg Prep->Ready | Reached Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PreArmy | 439 | 7 | 1.6% | 174 | 39.6% | 9.90 | 8.71 | 25.7% |
| ArmyTech | 1230 | 69 | 5.6% | 125 | 10.2% | 6.25 | 1.65 | 87.7% |
| ArmyFielded | 426 | 102 | 23.9% | 54 | 12.7% | 10.82 | 3.32 | 66.9% |

### Slowest Prep Episodes
| Map | Seed | Civ | Outcome | Readiness | Initial State | Sighted->Prep | Total Prep | Prep->Ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Huge | 405005 | JadeCovenant | StillActive | ArmyTech | Positioning | 93 | 190T | n/a |
| Huge | 405005 | RiverLeague | OtherCancelled | ArmyTech | Positioning | n/a | 128T | 4 |
| Standard | 210010 | RiverLeague | ClearedByOther | ArmyTech | Positioning | 95 | 104T | 9 |
| Large | 307007 | AetherianVanguard | TimedOut | ArmyFielded | Positioning | n/a | 97T | 3 |
| Large | 308008 | ScholarKingdoms | WartimeEmergencyCancelled | ArmyFielded | Positioning | 5 | 82T | 24 |
| Huge | 407007 | RiverLeague | WartimeEmergencyCancelled | ArmyTech | Positioning | n/a | 80T | 25 |
| Standard | 208008 | AetherianVanguard | StillActive | ArmyFielded | Positioning | 161 | 76T | n/a |
| Large | 307007 | RiverLeague | TimedOut | ArmyTech | Positioning | n/a | 76T | 10 |
| Large | 301001 | ScholarKingdoms | TimedOut | PreArmy | Buildup | 103 | 74T | 10 |
| Standard | 208008 | ScholarKingdoms | TimedOut | ArmyTech | Positioning | 123 | 70T | 22 |

## Suzerainty vs Winning
- Winner average suzerain turns: 184.55
- Non-winner average suzerain turns: 82.21
- Winner average city-state investment: 3333.3G
- Non-winner average city-state investment: 2080.5G
- Winners with any suzerainty: 40/47 (85.1%)
- Winners with any city-state investment: 37/47 (78.7%)
- Participant win rate with any suzerainty: 33.1%
- Participant win rate without suzerainty: 7.9%
- Participant win rate with any city-state investment: 24.7%
- Correlation (suzerain turns -> win flag): 0.289
- Correlation (city-state gold invested -> win flag): 0.161
- Winner share of sim-wide suzerain turns (when any suzerainty existed): 55.5%

## Investment Mix
- Total city-state investment: 495782G across 7048 actions
- Maintenance investment: 114048G (23.0%) across 3092 actions (43.9%)
- Challenger investment: 381734G (77.0%) across 3956 actions (56.1%)
- Maintenance gold per suzerain turn: 5.17
- Maintenance actions per 100 suzerain turns: 14.01

## Turnover Diagnostics
- Turnover-window challenger investment: 374041G across 3761 actions
- Flip-window challenger investment: 370574G across 3707 actions
- Deep-challenge investment: 7693G across 195 actions
- Neutral-claim investment: 0G across 0 actions
- Passive contestation pulses: 6702
- Passive contestation close-race pulses: 5499
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
- Passive-assisted suzerainty changes: 14 (17.9% of non-passive changes)
- Passive-assisted true ownership turnovers: 14 (18.2% of ownership turnover)
- Passive-assisted ownership conversion per 100 close-race pulses: 0.25
- Passive-involved ownership conversion per 100 close-race pulses: 0.25
- Passive-assisted ownership causes: WartimeRelease 14
- Pair-fatigue-triggered investment: 10949G across 149 actions
- Pair-fatigue share of challenger spend: 2.9%
- Safe-maintenance investment: 39G across 1 actions
- Focus turns: 15368 (challenge 12043, maintenance 3325)
- Focus assignments: 337, focus switches: 32
- Flip conversion per 100 turnover-window turns: 0.60
- True ownership conversion per 100 turnover-window turns: 0.59
- Flip conversion per 100 challenge-focus turns: 0.65
- Safe-maintenance share of maintenance spend: 0.0%

## Flip Cause Summary
| Cause | Suzerainty Changes | True Ownership Turnovers | State Change Share | Ownership Share |
| --- | --- | --- | --- | --- |
| Investment | 41 | 41 | 52.6% | 53.2% |
| PassiveContestation | 0 | 0 | 0.0% | 0.0% |
| WartimeRelease | 15 | 14 | 19.2% | 18.2% |
| WarBreak | 0 | 0 | 0.0% | 0.0% |
| Other | 22 | 22 | 28.2% | 28.6% |

## Hotspot Diagnostics
- Hotspot turn share of active turns: 1.0%
- City-state instances with any hotspot time: 9/188
- True ownership turnovers occurring in hotspot instances: 55 / 77

## Hotspot Instances
| Map | Seed | City-State | Yield | Created | Active | Hotspot | Hotspot Share | Ownership Turnovers | Suz Changes | Turnover Pair | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Huge | 401001 | Blackglass Armory | Production | 120 | 166T | 44T | 26.5% | 11 | 11 | RiverLeague <> ForgeClans 11 | Other 6, Investment 5 |
| Huge | 408008 | Hammerdeep | Production | 185 | 117T | 31T | 26.5% | 7 | 7 | JadeCovenant <> ScholarKingdoms 7 | Investment 4, Other 3 |
| Huge | 402002 | Bramble Feast | Food | 135 | 135T | 21T | 15.6% | 7 | 7 | StarborneSeekers <> ScholarKingdoms 6, AetherianVanguard <> StarborneSeekers 1 | Investment 6, WartimeRelease 1 |
| Huge | 401001 | Dawnharvest | Food | 176 | 110T | 26T | 23.6% | 6 | 6 | ScholarKingdoms <> StarborneSeekers 6 | Investment 6 |
| Tiny | 2002 | Kingsmerch | Gold | 141 | 162T | 26T | 16.0% | 6 | 6 | StarborneSeekers <> RiverLeague 6 | Investment 3, Other 3 |
| Tiny | 9009 | Dawnharvest | Food | 150 | 140T | 24T | 17.1% | 6 | 6 | AetherianVanguard <> RiverLeague 6 | Other 4, Investment 2 |
| Huge | 410010 | Bloomtide | Food | 108 | 247T | 19T | 7.7% | 6 | 6 | JadeCovenant <> ForgeClans 6 | Investment 6 |
| Tiny | 9009 | Auric Bazaar | Gold | 159 | 130T | 16T | 12.3% | 3 | 3 | AetherianVanguard <> RiverLeague 3 | Other 2, Investment 1 |
| Tiny | 9009 | Starglass Athenaeum | Science | 162 | 127T | 16T | 12.6% | 3 | 3 | AetherianVanguard <> RiverLeague 3 | Other 2, Investment 1 |
| Huge | 404004 | Ironwyrm Foundry | Production | 214 | 124T | 0T | 0.0% | 2 | 2 | JadeCovenant <> RiverLeague 2 | Investment 2 |
| Large | 302002 | Kingsmerch | Gold | 273 | 69T | 0T | 0.0% | 2 | 2 | JadeCovenant <> StarborneSeekers 1, ScholarKingdoms <> StarborneSeekers 1 | Other 1, WartimeRelease 1 |
| Large | 309009 | Sunseed Haven | Food | 197 | 57T | 0T | 0.0% | 2 | 2 | RiverLeague <> AetherianVanguard 1, RiverLeague <> ScholarKingdoms 1 | Investment 1, WartimeRelease 1 |
| Large | 302002 | Bloomtide | Food | 235 | 107T | 0T | 0.0% | 1 | 1 | ForgeClans <> ScholarKingdoms 1 | WartimeRelease 1 |
| Large | 301001 | Dawnsmelt Keep | Production | 209 | 59T | 0T | 0.0% | 1 | 1 | RiverLeague <> StarborneSeekers 1 | WartimeRelease 1 |
| Large | 301001 | Flintspire Works | Production | 126 | 142T | 0T | 0.0% | 1 | 1 | AetherianVanguard <> ScholarKingdoms 1 | Investment 1 |
| Large | 309009 | Golden Mirage | Gold | 199 | 55T | 0T | 0.0% | 1 | 1 | ForgeClans <> StarborneSeekers 1 | WartimeRelease 1 |

## Hotspot City Names (Cross-Sim Aggregate)
| City-State | Yield | Avg Hotspot Turns | Hotspot Share | Avg Ownership Turnovers | Avg Suz Changes | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- |
| Dawnharvest | Food | 12.5T | 8.8% | 3.00 | 3.00 | Investment 8, Other 4 |
| Blackglass Armory | Production | 8.8T | 7.9% | 2.20 | 2.20 | Other 6, Investment 5 |
| Kingsmerch | Gold | 5.2T | 5.5% | 1.60 | 1.60 | Other 4, Investment 3, WartimeRelease 1 |
| Bloomtide | Food | 4.8T | 2.7% | 2.00 | 2.00 | Investment 6, WartimeRelease 2 |
| Hammerdeep | Production | 15.5T | 8.0% | 3.50 | 3.50 | Investment 4, Other 3 |
| Bramble Feast | Food | 5.3T | 4.9% | 1.75 | 1.75 | Investment 6, WartimeRelease 1 |
| Auric Bazaar | Gold | 8.0T | 7.2% | 1.50 | 1.50 | Other 2, Investment 1 |
| Starglass Athenaeum | Science | 4.0T | 5.0% | 0.75 | 0.75 | Other 2, Investment 1 |
| Sunseed Haven | Food | 0.0T | 0.0% | 1.00 | 1.00 | WartimeRelease 2, Investment 1 |
| Aureate Crown | Gold | 0.0T | 0.0% | 0.67 | 0.67 | Investment 1, Other 1 |
| Ironwyrm Foundry | Production | 0.0T | 0.0% | 0.40 | 0.40 | Investment 2 |
| Radiant Lexicon | Science | 0.0T | 0.0% | 0.40 | 0.40 | Investment 1, WartimeRelease 1 |

## Civ Performance
| Civ | Games | Wins | Win% | Avg Suz Turns | Avg Invested Gold | Avg Maintenance Gold | Avg Invest Actions | Win% (Suz>0) | Win% (Suz=0) | Top Suz Claims |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 34 | 10 | 29.4% | 145.29 | 1897.4 | 691.7 | 33.50 | 33.3% | 20.0% | 42 |
| ScholarKingdoms | 36 | 7 | 19.4% | 111.89 | 1745.3 | 526.2 | 30.36 | 31.8% | 0.0% | 38 |
| RiverLeague | 35 | 9 | 25.7% | 87.14 | 2888.1 | 476.3 | 35.14 | 40.0% | 6.7% | 27 |
| AetherianVanguard | 36 | 8 | 22.2% | 43.22 | 1874.1 | 126.0 | 21.83 | 33.3% | 14.3% | 17 |
| StarborneSeekers | 34 | 8 | 23.5% | 123.24 | 2769.9 | 740.3 | 40.44 | 31.8% | 8.3% | 32 |
| JadeCovenant | 35 | 5 | 14.3% | 123.17 | 3020.3 | 720.3 | 40.71 | 27.8% | 0.0% | 30 |

## Turnover Pressure By Civ
| Civ | Avg Turnover Gold | Avg Deep Gold | Avg Neutral Gold | Avg Pair-Fatigue Gold | Avg Safe Maint Gold | Avg Focus Challenge T | Avg Focus Maint T | Focus Switches / Game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ForgeClans | 1140.3 | 65.4 | 0.0 | 39.8 | 0.0 | 55.47 | 25.71 | 0.24 |
| ScholarKingdoms | 1178.9 | 40.1 | 0.0 | 29.9 | 0.0 | 59.67 | 20.94 | 0.19 |
| RiverLeague | 2381.2 | 30.7 | 0.0 | 107.3 | 0.0 | 62.57 | 8.80 | 0.11 |
| AetherianVanguard | 1709.4 | 38.7 | 0.0 | 30.8 | 1.1 | 57.42 | 4.22 | 0.14 |
| StarborneSeekers | 2002.3 | 27.3 | 0.0 | 50.6 | 0.0 | 54.79 | 20.03 | 0.09 |
| JadeCovenant | 2282.1 | 18.0 | 0.0 | 55.4 | 0.0 | 53.97 | 15.89 | 0.14 |

## Yield-Type Summary
| Yield | City-States | Avg Active Turns | Contested Turn Share | No Suz Share | Close-Race Share | Flip Rate /100T | Avg Unique Suz | Surviving | Removed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Science | 46 | 119.87 | 0.7% | 0.0% | 0.7% | 0.09 | 1.07 | 45 | 1 |
| Production | 51 | 114.39 | 0.9% | 0.0% | 0.9% | 0.43 | 1.16 | 50 | 1 |
| Food | 45 | 117.89 | 1.4% | 0.4% | 1.1% | 0.62 | 1.27 | 45 | 0 |
| Gold | 46 | 118.28 | 1.0% | 0.0% | 1.0% | 0.28 | 1.17 | 46 | 0 |

## Yield Turnover Windows
| Yield | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share |
| --- | --- | --- | --- | --- |
| Science | 54.4% | 52.8% | 51.3% | 0.3% |
| Production | 62.0% | 59.4% | 46.3% | 1.3% |
| Food | 59.0% | 56.6% | 49.1% | 1.7% |
| Gold | 58.7% | 57.7% | 44.8% | 0.8% |

## City-State Suzerainty Ledger
| City-State | Yield | Appearances | Avg Active Turns | Contested Share | No Suz Share | Close-Race Share | Turnover Window Share | Flip Window Share | Safe Lead Share | Hotspot Share | Flip Rate /100T | Avg Unique Suz | Suzerain Turns by Civ | Focus Challenge by Civ | Focus Maintenance by Civ | Investment by Civ (Gold/Actions) | Avg Suz Changes | Avg Ownership Turnovers | Ownership Causes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amber Orchard | Food | 2 | 170.00 | 2.1% | 0.0% | 2.1% | 47.6% | 37.4% | 86.5% | 0.0% | 0.29 | 1.50 | ForgeClans 285T, ScholarKingdoms 55T | ScholarKingdoms 117T, ForgeClans 55T | ForgeClans 17T, ScholarKingdoms 1T | ForgeClans 2271G/45, maintain 1253G, ScholarKingdoms 1372G/33, maintain 663G, RiverLeague 222G/6 | 0.50 | 0.50 | WartimeRelease 1 |
| Bloomtide | Food | 4 | 179.00 | 1.3% | 0.0% | 1.3% | 92.2% | 89.7% | 17.5% | 2.7% | 1.12 | 1.75 | JadeCovenant 556T, ScholarKingdoms 89T, ForgeClans 70T, StarborneSeekers 1T | RiverLeague 313T, ScholarKingdoms 246T, ForgeClans 234T, JadeCovenant 3T | JadeCovenant 68T, ScholarKingdoms 6T, ForgeClans 3T | ScholarKingdoms 8619G/59, maintain 326G, RiverLeague 5630G/36, JadeCovenant 3415G/89, maintain 2931G, StarborneSeekers 1673G/22, ForgeClans 1508G/30, maintain 298G | 2.00 | 2.00 | Investment 6, WartimeRelease 2 |
| Bramble Feast | Food | 4 | 107.25 | 2.1% | 0.0% | 2.1% | 47.6% | 44.1% | 66.9% | 4.9% | 1.63 | 1.50 | JadeCovenant 166T, StarborneSeekers 128T, ScholarKingdoms 122T, AetherianVanguard 13T | AetherianVanguard 122T, ScholarKingdoms 108T, StarborneSeekers 11T | AetherianVanguard 9T, StarborneSeekers 7T, ScholarKingdoms 1T | ForgeClans 2873G/28, StarborneSeekers 2647G/58, maintain 1287G, AetherianVanguard 1298G/20, maintain 295G, ScholarKingdoms 1019G/17, JadeCovenant 177G/5 | 1.75 | 1.75 | Investment 6, WartimeRelease 1 |
| Dawnharvest | Food | 4 | 142.25 | 1.4% | 0.0% | 1.4% | 61.0% | 55.4% | 53.6% | 8.8% | 2.11 | 1.50 | ScholarKingdoms 259T, ForgeClans 162T, RiverLeague 134T, StarborneSeekers 8T, AetherianVanguard 6T | AetherianVanguard 141T, StarborneSeekers 98T, RiverLeague 6T, ScholarKingdoms 6T | ScholarKingdoms 29T, StarborneSeekers 1T | JadeCovenant 3714G/31, AetherianVanguard 3473G/38, maintain 106G, StarborneSeekers 2853G/28, maintain 67G, ScholarKingdoms 1008G/25, maintain 649G, RiverLeague 854G/21, maintain 479G, ForgeClans 24G/1, maintain 24G | 3.00 | 3.00 | Investment 8, Other 4 |
| Evergrain Vale | Food | 1 | 64.00 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.00 | 1.00 | AetherianVanguard 64T | None | None | None | 0.00 | 0.00 | None |
| Fernsong | Food | 1 | 166.00 | 11.4% | 11.4% | 0.0% | 63.3% | 63.3% | 25.3% | 0.0% | 0.60 | 1.00 | AetherianVanguard 147T | ForgeClans 60T | AetherianVanguard 52T | ForgeClans 820G/15, StarborneSeekers 731G/14, AetherianVanguard 217G/7, maintain 217G | 1.00 | 0.00 | None |
| Greenstar Hollow | Food | 5 | 100.80 | 0.4% | 0.0% | 0.4% | 65.5% | 65.5% | 34.5% | 0.0% | 0.00 | 1.00 | StarborneSeekers 196T, ForgeClans 155T, AetherianVanguard 105T, ScholarKingdoms 48T | AetherianVanguard 186T, JadeCovenant 180T, ScholarKingdoms 72T | StarborneSeekers 101T | AetherianVanguard 5808G/42, maintain 178G, JadeCovenant 5426G/54, StarborneSeekers 4020G/64, maintain 1387G, ScholarKingdoms 946G/25, maintain 568G, ForgeClans 270G/7 | 0.00 | 0.00 | None |
| Hearthbloom | Food | 3 | 153.33 | 0.2% | 0.0% | 0.2% | 28.5% | 28.5% | 71.5% | 0.0% | 0.00 | 1.00 | JadeCovenant 199T, StarborneSeekers 168T, ScholarKingdoms 93T | AetherianVanguard 111T, RiverLeague 91T | None | RiverLeague 1457G/27, JadeCovenant 1309G/35, maintain 1309G, AetherianVanguard 438G/10 | 0.00 | 0.00 | None |
| Moonmeadow | Food | 3 | 129.67 | 1.3% | 0.0% | 1.3% | 55.3% | 52.7% | 55.0% | 0.0% | 0.00 | 1.00 | StarborneSeekers 184T, JadeCovenant 118T, ScholarKingdoms 87T | ScholarKingdoms 71T, ForgeClans 55T, JadeCovenant 27T | JadeCovenant 37T, ScholarKingdoms 34T | ScholarKingdoms 2186G/50, maintain 1270G, JadeCovenant 1852G/49, maintain 1582G, AetherianVanguard 1131G/18, StarborneSeekers 256G/8, maintain 256G, ForgeClans 222G/6, RiverLeague 63G/2 | 0.00 | 0.00 | None |
| Nectarwind | Food | 3 | 104.67 | 1.3% | 0.0% | 1.3% | 76.8% | 72.9% | 40.4% | 0.0% | 0.00 | 1.00 | StarborneSeekers 250T, JadeCovenant 53T, RiverLeague 11T | ScholarKingdoms 201T | JadeCovenant 35T, StarborneSeekers 28T | ScholarKingdoms 3535G/45, StarborneSeekers 1582G/42, maintain 1582G, JadeCovenant 256G/8, maintain 256G | 0.00 | 0.00 | None |
| Rainpetal Court | Food | 3 | 147.00 | 0.0% | 0.0% | 0.0% | 61.7% | 60.8% | 41.3% | 0.0% | 0.23 | 1.33 | ForgeClans 238T, StarborneSeekers 133T, ScholarKingdoms 39T, AetherianVanguard 31T | StarborneSeekers 237T, RiverLeague 37T | StarborneSeekers 19T | StarborneSeekers 5112G/60, maintain 894G, ForgeClans 1465G/39, maintain 1465G, RiverLeague 438G/10, ScholarKingdoms 30G/1 | 0.33 | 0.33 | WartimeRelease 1 |
| Silverbarley | Food | 1 | 74.00 | 0.0% | 0.0% | 0.0% | 51.4% | 51.4% | 48.6% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 74T | ForgeClans 30T | None | RiverLeague 4041G/32, ForgeClans 378G/9, ScholarKingdoms 78G/3, maintain 78G | 0.00 | 0.00 | None |
| Sunseed Haven | Food | 3 | 71.67 | 4.2% | 0.0% | 4.2% | 82.8% | 80.5% | 24.2% | 0.0% | 1.40 | 2.00 | StarborneSeekers 121T, ScholarKingdoms 43T, ForgeClans 35T, AetherianVanguard 12T, RiverLeague 4T | AetherianVanguard 41T, ForgeClans 6T, ScholarKingdoms 3T | ScholarKingdoms 13T | ScholarKingdoms 2160G/53, maintain 1083G, AetherianVanguard 1948G/32, maintain 24G, RiverLeague 438G/10, ForgeClans 63G/2 | 1.00 | 1.00 | WartimeRelease 2, Investment 1 |
| Thistleheart | Food | 5 | 73.40 | 0.5% | 0.0% | 0.5% | 30.8% | 30.8% | 69.2% | 0.0% | 0.00 | 1.00 | JadeCovenant 200T, ScholarKingdoms 94T, ForgeClans 73T | ForgeClans 53T, JadeCovenant 42T | None | ForgeClans 4864G/55, maintain 646G, JadeCovenant 2504G/38, maintain 490G, ScholarKingdoms 178G/6, maintain 178G | 0.00 | 0.00 | None |
| Verdant Myth | Food | 2 | 58.00 | 0.0% | 0.0% | 0.0% | 47.4% | 47.4% | 52.6% | 0.0% | 0.00 | 1.00 | AetherianVanguard 116T | RiverLeague 14T | None | RiverLeague 1521G/21, AetherianVanguard 724G/20, maintain 724G | 0.00 | 0.00 | None |
| Wildroot Sanctum | Food | 1 | 141.00 | 0.7% | 0.0% | 0.7% | 57.4% | 57.4% | 42.6% | 0.0% | 0.00 | 1.00 | RiverLeague 141T | JadeCovenant 81T | RiverLeague 58T | JadeCovenant 1837G/23, RiverLeague 1582G/42, maintain 1582G | 0.00 | 0.00 | None |
| Aureate Crown | Gold | 3 | 100.00 | 0.3% | 0.0% | 0.3% | 62.0% | 62.0% | 39.3% | 0.0% | 0.67 | 1.67 | ForgeClans 196T, JadeCovenant 63T, ScholarKingdoms 41T | JadeCovenant 60T | ForgeClans 50T, ScholarKingdoms 18T | JadeCovenant 2205G/25, RiverLeague 1657G/25, ForgeClans 1474G/41, maintain 1346G, ScholarKingdoms 253G/8, maintain 193G | 0.67 | 0.67 | Investment 1, Other 1 |
| Auric Bazaar | Gold | 2 | 110.50 | 4.5% | 0.0% | 4.5% | 80.5% | 71.5% | 51.6% | 7.2% | 1.36 | 1.50 | RiverLeague 99T, StarborneSeekers 91T, AetherianVanguard 31T | AetherianVanguard 79T, RiverLeague 5T | StarborneSeekers 33T, RiverLeague 26T, AetherianVanguard 4T | AetherianVanguard 1638G/22, maintain 142G, StarborneSeekers 1582G/42, maintain 1582G, RiverLeague 1509G/39, maintain 1287G, ScholarKingdoms 916G/16 | 1.50 | 1.50 | Other 2, Investment 1 |
| Brassmoon Mint | Gold | 8 | 124.13 | 0.2% | 0.0% | 0.2% | 68.4% | 68.4% | 31.6% | 0.0% | 0.00 | 1.00 | StarborneSeekers 353T, ForgeClans 329T, ScholarKingdoms 132T, RiverLeague 117T, JadeCovenant 62T | JadeCovenant 453T, AetherianVanguard 97T, StarborneSeekers 96T | StarborneSeekers 185T, ForgeClans 25T | JadeCovenant 14535G/105, AetherianVanguard 4248G/49, StarborneSeekers 4041G/99, maintain 3125G, ScholarKingdoms 916G/16, ForgeClans 301G/11, maintain 301G | 0.00 | 0.00 | None |
| Coinfire Crossing | Gold | 3 | 114.67 | 0.6% | 0.0% | 0.6% | 63.1% | 63.1% | 36.9% | 0.0% | 0.00 | 1.00 | JadeCovenant 171T, ScholarKingdoms 100T, StarborneSeekers 73T | ForgeClans 118T | JadeCovenant 73T, ScholarKingdoms 25T | AetherianVanguard 4775G/34, JadeCovenant 3635G/67, maintain 1621G, ForgeClans 1186G/23, ScholarKingdoms 245G/8, maintain 109G | 0.00 | 0.00 | None |
| Cresset Exchange | Gold | 3 | 162.33 | 0.4% | 0.0% | 0.4% | 48.3% | 45.2% | 61.0% | 0.0% | 0.00 | 1.00 | RiverLeague 231T, JadeCovenant 180T, ScholarKingdoms 76T | ScholarKingdoms 168T, JadeCovenant 55T | JadeCovenant 39T, RiverLeague 12T | ScholarKingdoms 4375G/42, maintain 334G, JadeCovenant 1573G/42, maintain 1543G, RiverLeague 587G/17, maintain 451G, ForgeClans 378G/9 | 0.00 | 0.00 | None |
| Crownmarket | Gold | 1 | 45.00 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.00 | 1.00 | ForgeClans 45T | None | None | None | 0.00 | 0.00 | None |
| Embermint | Gold | 1 | 198.00 | 1.5% | 0.0% | 1.5% | 83.3% | 83.3% | 16.7% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 198T | JadeCovenant 165T, StarborneSeekers 131T | ScholarKingdoms 25T | StarborneSeekers 3714G/31, JadeCovenant 2014G/24, ScholarKingdoms 958G/26, maintain 958G | 0.00 | 0.00 | None |
| Gildenspire | Gold | 1 | 202.00 | 0.5% | 0.0% | 0.5% | 33.7% | 33.7% | 66.3% | 0.0% | 0.00 | 1.00 | AetherianVanguard 202T | StarborneSeekers 68T | AetherianVanguard 25T | StarborneSeekers 820G/15, AetherianVanguard 490G/14, maintain 490G | 0.00 | 0.00 | None |
| Golden Mirage | Gold | 2 | 115.00 | 0.9% | 0.0% | 0.9% | 71.7% | 71.7% | 28.3% | 0.0% | 0.43 | 1.50 | StarborneSeekers 205T, ForgeClans 25T | AetherianVanguard 138T | StarborneSeekers 47T | AetherianVanguard 2411G/26, StarborneSeekers 1606G/43, maintain 1606G, ForgeClans 177G/5 | 0.50 | 0.50 | WartimeRelease 1 |
| Kingsmerch | Gold | 5 | 95.00 | 2.3% | 0.0% | 2.3% | 68.6% | 66.5% | 36.4% | 5.5% | 1.68 | 1.60 | ForgeClans 233T, StarborneSeekers 190T, JadeCovenant 23T, RiverLeague 20T, ScholarKingdoms 9T | RiverLeague 186T, ForgeClans 32T, JadeCovenant 32T, StarborneSeekers 9T | StarborneSeekers 66T, ForgeClans 64T, RiverLeague 1T | RiverLeague 9095G/71, maintain 145G, AetherianVanguard 5186G/35, StarborneSeekers 3189G/82, maintain 2759G, ForgeClans 3165G/78, maintain 2345G, JadeCovenant 1131G/18, ScholarKingdoms 438G/10 | 1.60 | 1.60 | Other 4, Investment 3, WartimeRelease 1 |
| Opaline Vault | Gold | 2 | 109.50 | 0.5% | 0.0% | 0.5% | 17.4% | 16.0% | 92.2% | 0.0% | 0.00 | 1.00 | JadeCovenant 110T, RiverLeague 109T | AetherianVanguard 38T | JadeCovenant 11T | JadeCovenant 607G/17, maintain 607G, AetherianVanguard 177G/5 | 0.00 | 0.00 | None |
| Radiant Hoard | Gold | 6 | 85.67 | 0.2% | 0.0% | 0.2% | 47.3% | 47.3% | 52.7% | 0.0% | 0.00 | 1.00 | ForgeClans 263T, AetherianVanguard 92T, JadeCovenant 75T, ScholarKingdoms 63T, StarborneSeekers 21T | AetherianVanguard 70T, RiverLeague 34T | AetherianVanguard 33T, JadeCovenant 26T | RiverLeague 3652G/44, AetherianVanguard 2050G/36, maintain 529G, JadeCovenant 1734G/44, maintain 1231G, ForgeClans 1582G/42, maintain 1582G, StarborneSeekers 763G/21, maintain 763G | 0.00 | 0.00 | None |
| Saffron Treasury | Gold | 2 | 93.00 | 0.5% | 0.0% | 0.5% | 73.1% | 73.1% | 26.9% | 0.0% | 0.00 | 1.00 | ForgeClans 96T, ScholarKingdoms 90T | ForgeClans 72T, RiverLeague 58T, JadeCovenant 31T | ScholarKingdoms 48T | ForgeClans 1133G/23, maintain 217G, JadeCovenant 1131G/18, ScholarKingdoms 1075G/29, maintain 1075G, RiverLeague 1019G/17, StarborneSeekers 573G/12 | 0.00 | 0.00 | None |
| Starcoin Port | Gold | 4 | 152.00 | 1.5% | 0.0% | 1.5% | 77.6% | 77.0% | 24.8% | 0.0% | 0.00 | 1.00 | JadeCovenant 211T, RiverLeague 175T, StarborneSeekers 160T, ForgeClans 62T | RiverLeague 178T, ScholarKingdoms 137T, ForgeClans 118T, JadeCovenant 109T | RiverLeague 62T, JadeCovenant 40T, StarborneSeekers 5T | RiverLeague 14195G/89, maintain 1621G, JadeCovenant 4753G/72, maintain 1621G, StarborneSeekers 2225G/51, maintain 1309G, AetherianVanguard 2205G/25, ScholarKingdoms 1809G/26, ForgeClans 876G/22, maintain 373G | 0.00 | 0.00 | None |
| Suncoin Citadel | Gold | 1 | 119.00 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.00 | 1.00 | RiverLeague 119T | None | None | None | 0.00 | 0.00 | None |
| Velvet Ledger | Gold | 2 | 150.00 | 2.0% | 0.0% | 2.0% | 29.3% | 28.7% | 75.3% | 0.0% | 0.33 | 1.50 | ScholarKingdoms 184T, RiverLeague 115T, StarborneSeekers 1T | JadeCovenant 30T, ScholarKingdoms 1T | ScholarKingdoms 35T, RiverLeague 30T | JadeCovenant 2633G/27, StarborneSeekers 1837G/23, RiverLeague 1348G/36, maintain 1348G, ScholarKingdoms 826G/23, maintain 763G | 0.50 | 0.50 | WartimeRelease 1 |
| Ashen Bellows | Production | 2 | 65.50 | 0.0% | 0.0% | 0.0% | 55.0% | 55.0% | 45.0% | 0.0% | 0.00 | 1.00 | RiverLeague 79T, StarborneSeekers 52T | ScholarKingdoms 72T | None | RiverLeague 1465G/39, maintain 1465G, ScholarKingdoms 1019G/17 | 0.00 | 0.00 | None |
| Blackglass Armory | Production | 5 | 111.80 | 1.8% | 0.0% | 1.8% | 47.4% | 45.3% | 59.2% | 7.9% | 1.97 | 1.20 | RiverLeague 300T, ForgeClans 184T, AetherianVanguard 75T | RiverLeague 95T, ForgeClans 48T | ForgeClans 19T, RiverLeague 1T | RiverLeague 7328G/41, maintain 571G, StarborneSeekers 2873G/28, ForgeClans 2498G/55, maintain 1454G, ScholarKingdoms 322G/8, AetherianVanguard 142G/5, maintain 142G | 2.20 | 2.20 | Other 6, Investment 5 |
| Brasshollow | Production | 1 | 213.00 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.00 | 1.00 | StarborneSeekers 213T | None | None | None | 0.00 | 0.00 | None |
| Cinderhold | Production | 3 | 51.67 | 0.6% | 0.0% | 0.6% | 48.4% | 48.4% | 51.6% | 0.0% | 0.00 | 1.00 | ForgeClans 72T, ScholarKingdoms 65T, RiverLeague 18T | ForgeClans 56T, JadeCovenant 44T, AetherianVanguard 19T | ScholarKingdoms 51T, ForgeClans 18T | JadeCovenant 4775G/34, AetherianVanguard 649G/13, ForgeClans 604G/17, maintain 334G, ScholarKingdoms 490G/14, maintain 490G | 0.00 | 0.00 | None |
| Dawnsmelt Keep | Production | 5 | 66.80 | 0.0% | 0.0% | 0.0% | 46.1% | 46.1% | 53.9% | 0.0% | 0.30 | 1.20 | ScholarKingdoms 104T, AetherianVanguard 98T, ForgeClans 48T, RiverLeague 43T, StarborneSeekers 41T | ScholarKingdoms 91T, StarborneSeekers 51T | None | ScholarKingdoms 4728G/43, maintain 334G, StarborneSeekers 4152G/41, AetherianVanguard 247G/8, maintain 217G, RiverLeague 130G/4, maintain 24G | 0.20 | 0.20 | WartimeRelease 1 |
| Emberforge Bastion | Production | 3 | 62.00 | 1.6% | 0.0% | 1.6% | 76.3% | 76.3% | 23.7% | 0.0% | 0.00 | 1.00 | ForgeClans 158T, JadeCovenant 28T | ScholarKingdoms 75T, JadeCovenant 49T, StarborneSeekers 38T | ForgeClans 73T | StarborneSeekers 2873G/28, JadeCovenant 2124G/35, maintain 451G, ForgeClans 1487G/41, maintain 1487G, RiverLeague 1251G/19, ScholarKingdoms 916G/16 | 0.00 | 0.00 | None |
| Flintspire Works | Production | 3 | 126.00 | 1.3% | 0.0% | 1.3% | 79.9% | 75.9% | 31.0% | 0.0% | 0.26 | 1.33 | StarborneSeekers 179T, ScholarKingdoms 77T, AetherianVanguard 65T, RiverLeague 57T | AetherianVanguard 220T, ForgeClans 60T | ScholarKingdoms 48T, RiverLeague 10T | AetherianVanguard 6707G/61, RiverLeague 763G/21, maintain 763G, ForgeClans 731G/14, ScholarKingdoms 496G/14, maintain 466G, JadeCovenant 136G/4 | 0.33 | 0.33 | Investment 1 |
| Gearstorm Hold | Production | 1 | 165.00 | 0.0% | 0.0% | 0.0% | 31.5% | 31.5% | 68.5% | 0.0% | 0.00 | 1.00 | AetherianVanguard 165T | None | AetherianVanguard 15T | RiverLeague 1381G/20, AetherianVanguard 919G/25, maintain 919G | 0.00 | 0.00 | None |
| Hammerdeep | Production | 2 | 193.50 | 1.6% | 0.0% | 1.6% | 95.9% | 91.0% | 21.2% | 8.0% | 1.81 | 1.50 | StarborneSeekers 270T, JadeCovenant 103T, ScholarKingdoms 14T | ForgeClans 260T, ScholarKingdoms 100T, RiverLeague 60T, JadeCovenant 8T | StarborneSeekers 25T, JadeCovenant 7T | ForgeClans 2873G/28, JadeCovenant 1673G/38, maintain 1034G, ScholarKingdoms 1186G/19, maintain 111G, RiverLeague 731G/14, StarborneSeekers 451G/13, maintain 451G | 3.50 | 3.50 | Investment 4, Other 3 |
| Ironwyrm Foundry | Production | 5 | 145.40 | 0.8% | 0.0% | 0.8% | 78.4% | 73.7% | 34.9% | 0.0% | 0.28 | 1.20 | ScholarKingdoms 380T, ForgeClans 173T, JadeCovenant 123T, AetherianVanguard 50T, RiverLeague 1T | StarborneSeekers 162T, ForgeClans 160T, RiverLeague 154T, AetherianVanguard 95T | ScholarKingdoms 149T, JadeCovenant 10T | JadeCovenant 8845G/67, maintain 958G, StarborneSeekers 7467G/59, RiverLeague 7456G/67, ForgeClans 7237G/41, maintain 50G, ScholarKingdoms 2696G/72, maintain 2696G, AetherianVanguard 2411G/26 | 0.40 | 0.40 | Investment 2 |
| Molten Crown | Production | 3 | 57.67 | 0.6% | 0.0% | 0.6% | 23.7% | 23.7% | 76.3% | 0.0% | 0.58 | 1.33 | JadeCovenant 114T, ScholarKingdoms 45T, AetherianVanguard 14T | ForgeClans 22T, ScholarKingdoms 13T, AetherianVanguard 4T | JadeCovenant 22T, AetherianVanguard 13T, ScholarKingdoms 1T | ForgeClans 2205G/25, ScholarKingdoms 731G/14, AetherianVanguard 659G/15, maintain 412G, JadeCovenant 295G/9, maintain 295G, StarborneSeekers 98G/3 | 0.33 | 0.33 | WartimeRelease 1 |
| Obsidian Kiln | Production | 2 | 112.00 | 1.3% | 0.0% | 1.3% | 37.9% | 34.8% | 70.5% | 0.0% | 0.00 | 1.00 | RiverLeague 125T, ScholarKingdoms 99T | RiverLeague 59T | ScholarKingdoms 35T, RiverLeague 3T | RiverLeague 2967G/37, maintain 334G, ScholarKingdoms 607G/17, maintain 607G, StarborneSeekers 98G/3, JadeCovenant 63G/2 | 0.00 | 0.00 | None |
| Runehammer Gate | Production | 5 | 157.40 | 1.4% | 0.0% | 1.4% | 64.7% | 62.1% | 44.9% | 0.0% | 0.13 | 1.20 | ForgeClans 242T, ScholarKingdoms 217T, JadeCovenant 196T, StarborneSeekers 132T | StarborneSeekers 377T, RiverLeague 139T, AetherianVanguard 78T | ForgeClans 75T, JadeCovenant 31T, StarborneSeekers 29T | StarborneSeekers 14174G/108, maintain 1363G, ForgeClans 2231G/55, maintain 1582G, JadeCovenant 1582G/42, maintain 1582G, RiverLeague 747G/16, AetherianVanguard 649G/13, ScholarKingdoms 322G/8 | 0.20 | 0.20 | Investment 1 |
| Skyfurnace | Production | 4 | 125.75 | 0.2% | 0.0% | 0.2% | 63.6% | 63.6% | 36.4% | 0.0% | 0.00 | 1.00 | ForgeClans 260T, ScholarKingdoms 161T, AetherianVanguard 82T | RiverLeague 158T, JadeCovenant 123T, ForgeClans 31T | ForgeClans 93T | JadeCovenant 9201G/63, ForgeClans 2713G/60, maintain 1582G, RiverLeague 2590G/35, ScholarKingdoms 1465G/39, maintain 1465G, StarborneSeekers 820G/15 | 0.00 | 0.00 | None |
| Stonewake Crucible | Production | 4 | 170.25 | 0.7% | 0.0% | 0.7% | 68.7% | 62.4% | 53.5% | 0.0% | 0.15 | 1.25 | JadeCovenant 586T, ForgeClans 79T, AetherianVanguard 16T | AetherianVanguard 263T, ScholarKingdoms 226T, StarborneSeekers 149T, RiverLeague 140T, ForgeClans 133T | JadeCovenant 80T, AetherianVanguard 1T | ForgeClans 4041G/32, JadeCovenant 3203G/85, maintain 3203G, AetherianVanguard 2873G/28, RiverLeague 2411G/26, StarborneSeekers 1837G/23, ScholarKingdoms 648G/16 | 0.25 | 0.25 | WartimeRelease 1 |
| Thunder Anvil | Production | 3 | 77.00 | 0.4% | 0.0% | 0.4% | 82.3% | 82.3% | 17.7% | 0.0% | 0.00 | 1.00 | ForgeClans 196T, StarborneSeekers 20T, ScholarKingdoms 15T | RiverLeague 180T | ForgeClans 52T | StarborneSeekers 1809G/26, RiverLeague 1381G/20, ForgeClans 568G/16, maintain 568G, ScholarKingdoms 320G/9, maintain 50G, AetherianVanguard 270G/7 | 0.00 | 0.00 | None |
| Aetherquill | Science | 2 | 111.50 | 0.4% | 0.0% | 0.4% | 19.7% | 19.7% | 80.3% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 114T, ForgeClans 109T | RiverLeague 44T | ScholarKingdoms 26T | RiverLeague 2633G/27, ScholarKingdoms 412G/12, maintain 412G | 0.00 | 0.00 | None |
| Arcstar Repository | Science | 4 | 96.00 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% | 0.0% | 0.00 | 1.00 | RiverLeague 201T, StarborneSeekers 85T, ForgeClans 53T, AetherianVanguard 45T | None | None | None | 0.00 | 0.00 | None |
| Celestine Scriptorium | Science | 1 | 125.00 | 0.0% | 0.0% | 0.0% | 96.8% | 96.8% | 3.2% | 0.0% | 0.00 | 1.00 | ScholarKingdoms 125T | ForgeClans 112T | ScholarKingdoms 47T | ForgeClans 2873G/28, ScholarKingdoms 529G/15, maintain 529G, JadeCovenant 177G/5, RiverLeague 98G/3 | 0.00 | 0.00 | None |
| Dreaming Calculus | Science | 4 | 122.00 | 0.2% | 0.0% | 0.2% | 63.7% | 63.7% | 36.3% | 0.0% | 0.00 | 1.00 | ForgeClans 369T, ScholarKingdoms 119T | ScholarKingdoms 173T, JadeCovenant 81T, StarborneSeekers 61T | ForgeClans 213T | JadeCovenant 5337G/54, ForgeClans 3503G/85, maintain 2484G, ScholarKingdoms 2392G/33, StarborneSeekers 1019G/17 | 0.00 | 0.00 | None |
| Eclipsed Theorem | Science | 4 | 133.00 | 0.4% | 0.0% | 0.4% | 56.0% | 56.0% | 44.0% | 0.0% | 0.00 | 1.00 | ForgeClans 221T, JadeCovenant 192T, ScholarKingdoms 119T | StarborneSeekers 219T, RiverLeague 79T, AetherianVanguard 51T | ScholarKingdoms 76T, ForgeClans 52T | RiverLeague 2411G/26, StarborneSeekers 2014G/24, ScholarKingdoms 1660G/44, maintain 1660G, ForgeClans 919G/25, maintain 919G, AetherianVanguard 438G/10 | 0.00 | 0.00 | None |
| Halcyon Loom | Science | 1 | 144.00 | 0.0% | 0.0% | 0.0% | 91.7% | 91.7% | 8.3% | 0.0% | 0.00 | 1.00 | ForgeClans 144T | None | None | StarborneSeekers 3714G/31, ForgeClans 1621G/43, maintain 1621G | 0.00 | 0.00 | None |
| Lunarchive | Science | 4 | 107.00 | 0.9% | 0.0% | 0.9% | 33.4% | 31.8% | 71.5% | 0.0% | 0.00 | 1.00 | StarborneSeekers 179T, RiverLeague 100T, ForgeClans 88T, JadeCovenant 61T | None | RiverLeague 9T | StarborneSeekers 1913G/51, maintain 1777G, RiverLeague 1182G/27, maintain 451G, AetherianVanguard 30G/1, ForgeClans 30G/1 | 0.00 | 0.00 | None |
| Meridian of Runes | Science | 3 | 101.67 | 0.7% | 0.0% | 0.7% | 65.2% | 57.0% | 64.3% | 0.0% | 0.00 | 1.00 | ForgeClans 159T, RiverLeague 146T | ScholarKingdoms 187T, AetherianVanguard 12T | ForgeClans 39T, RiverLeague 11T | RiverLeague 1231G/33, maintain 1231G, ScholarKingdoms 1052G/20, ForgeClans 590G/18, maintain 590G, AetherianVanguard 136G/4, StarborneSeekers 30G/1 | 0.00 | 0.00 | None |
| Nyx Codex | Science | 4 | 168.00 | 0.1% | 0.0% | 0.1% | 53.1% | 53.1% | 46.9% | 0.0% | 0.00 | 1.00 | StarborneSeekers 357T, JadeCovenant 286T, AetherianVanguard 29T | JadeCovenant 164T, StarborneSeekers 133T, RiverLeague 44T | StarborneSeekers 42T | AetherianVanguard 4394G/33, JadeCovenant 3865G/69, maintain 1660G, StarborneSeekers 3440G/62, maintain 1426G, ScholarKingdoms 1837G/23, RiverLeague 820G/15, ForgeClans 270G/7 | 0.00 | 0.00 | None |
| Observatory of Whispers | Science | 3 | 120.00 | 1.1% | 0.0% | 1.1% | 62.5% | 62.2% | 39.2% | 0.0% | 0.00 | 1.00 | StarborneSeekers 130T, JadeCovenant 122T, ScholarKingdoms 108T | AetherianVanguard 147T, StarborneSeekers 20T | StarborneSeekers 46T, ScholarKingdoms 24T, JadeCovenant 15T | StarborneSeekers 4071G/70, maintain 1660G, AetherianVanguard 3354G/35, RiverLeague 1521G/21, JadeCovenant 997G/27, maintain 997G, ScholarKingdoms 78G/3, maintain 78G | 0.00 | 0.00 | None |
| Prism Oracle | Science | 4 | 114.25 | 0.4% | 0.0% | 0.4% | 30.4% | 27.4% | 80.1% | 0.0% | 0.00 | 1.00 | StarborneSeekers 164T, RiverLeague 119T, JadeCovenant 96T, ScholarKingdoms 78T | JadeCovenant 77T | StarborneSeekers 6T | JadeCovenant 2014G/24, StarborneSeekers 568G/16, maintain 568G, ForgeClans 438G/10, ScholarKingdoms 355G/11, maintain 178G | 0.00 | 0.00 | None |
| Quillspire | Science | 1 | 224.00 | 3.1% | 0.0% | 3.1% | 95.1% | 84.4% | 50.4% | 0.0% | 0.00 | 1.00 | RiverLeague 224T | ForgeClans 169T | RiverLeague 17T | RiverLeague 2089G/55, maintain 2089G, ScholarKingdoms 1837G/23, ForgeClans 916G/16 | 0.00 | 0.00 | None |
| Radiant Lexicon | Science | 5 | 127.80 | 0.5% | 0.0% | 0.5% | 76.7% | 74.3% | 26.6% | 0.0% | 0.31 | 1.40 | ScholarKingdoms 292T, RiverLeague 263T, JadeCovenant 84T | AetherianVanguard 153T, JadeCovenant 75T, StarborneSeekers 3T, ForgeClans 2T | ScholarKingdoms 62T, JadeCovenant 50T, RiverLeague 30T | JadeCovenant 4298G/57, maintain 1153G, AetherianVanguard 4028G/49, ScholarKingdoms 2270G/56, maintain 1621G, RiverLeague 1766G/48, maintain 1736G, StarborneSeekers 222G/6, ForgeClans 136G/4 | 0.40 | 0.40 | Investment 1, WartimeRelease 1 |
| Starglass Athenaeum | Science | 4 | 80.50 | 3.4% | 0.0% | 3.4% | 66.1% | 64.3% | 42.5% | 5.0% | 0.93 | 1.25 | RiverLeague 99T, AetherianVanguard 98T, StarborneSeekers 85T, JadeCovenant 40T | ScholarKingdoms 81T, AetherianVanguard 2T | StarborneSeekers 41T, RiverLeague 38T, JadeCovenant 12T | ScholarKingdoms 1521G/26, AetherianVanguard 1346G/20, maintain 142G, RiverLeague 1314G/34, maintain 1092G, StarborneSeekers 1309G/35, maintain 1309G, JadeCovenant 685G/19, maintain 685G | 0.75 | 0.75 | Other 2, Investment 1 |
| Voidlight Archive | Science | 2 | 105.50 | 0.5% | 0.0% | 0.5% | 55.0% | 55.0% | 45.0% | 0.0% | 0.00 | 1.00 | ForgeClans 118T, JadeCovenant 93T | RiverLeague 116T | ForgeClans 81T | RiverLeague 6110G/37, ForgeClans 997G/27, maintain 997G | 0.00 | 0.00 | None |

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

