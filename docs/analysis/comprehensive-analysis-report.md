# Comprehensive Simulation Analysis Report

**Date:** 2026-03-09
**Simulations:** 100 total (Tiny: 20, Small: 20, Standard: 20, Large: 20, Huge: 20) (AI vs AI)
**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)

## Titan Analysis
- **Total Titans Spawned:** 37
- **Average Spawn Turn:** 226.6
- **Median Spawn Turn:** 210
- **Spawn Turn Range:** [111, 405]
- **Average Units on Creation:** 11.7
- **Median Units on Creation:** 11
- **Range:** [6, 25]

---

## 1. Victory Analysis

### Overall Statistics
- **Total Victories:** 93 of 100 (93.0%)
- **Average Victory Turn:** 276.3
- **Median Victory Turn:** 299
- **Victory Turn Range:** [42, 496]

### Victory Types
- **Conquest:** 53 (53.0%)
- **Progress:** 40 (40.0%)
- **None:** 7 (7.0%)

### Victories by Civilization (with Victory Type Breakdown)
- **AetherianVanguard:** 21 wins (29.6% of games played)
  - Conquest: 16, Progress: 5
- **StarborneSeekers:** 20 wins (29.4% of games played)
  - Conquest: 5, Progress: 15
- **ForgeClans:** 16 wins (21.6% of games played)
  - Conquest: 11, Progress: 5
- **RiverLeague:** 15 wins (21.4% of games played)
  - Conquest: 10, Progress: 5
- **JadeCovenant:** 11 wins (16.4% of games played)
  - Conquest: 9, Progress: 2
- **ScholarKingdoms:** 10 wins (14.3% of games played)
  - Conquest: 2, Progress: 8

## 2. Warfare Analysis

### War Statistics
- **Total Unique Wars:** 547
- **Total Peace Treaties:** 475
- **Average Wars per Game:** 5.5

### War Durations
- **Total Wars Tracked:** 547
- **Average Duration:** 98.3 turns
- **Median Duration:** 73 turns
- **Range:** [1, 394] turns

### War Initiation by Civilization
- **ForgeClans:** Initiated 138 (1.9/game), Received 60 (0.8/game)
- **ScholarKingdoms:** Initiated 22 (0.3/game), Received 139 (2.0/game)
- **RiverLeague:** Initiated 121 (1.7/game), Received 76 (1.1/game)
- **AetherianVanguard:** Initiated 96 (1.4/game), Received 80 (1.1/game)
- **StarborneSeekers:** Initiated 79 (1.2/game), Received 112 (1.6/game)
- **JadeCovenant:** Initiated 91 (1.4/game), Received 80 (1.2/game)

### War-to-Win Conversion by Civilization
- **ForgeClans:** 48/244 initiated wars led to captures (19.7%), 0.29 cities per initiated war, 0.04 eliminations per initiated war, 16/39 wins after any capture (41.0%), 4/5 Progress wins after prior captures
- **ScholarKingdoms:** 4/30 initiated wars led to captures (13.3%), 0.23 cities per initiated war, 0.03 eliminations per initiated war, 4/8 wins after any capture (50.0%), 0/8 Progress wins after prior captures
- **RiverLeague:** 48/228 initiated wars led to captures (21.1%), 0.41 cities per initiated war, 0.06 eliminations per initiated war, 15/38 wins after any capture (39.5%), 5/5 Progress wins after prior captures
- **AetherianVanguard:** 51/147 initiated wars led to captures (34.7%), 0.71 cities per initiated war, 0.12 eliminations per initiated war, 21/39 wins after any capture (53.8%), 5/5 Progress wins after prior captures
- **StarborneSeekers:** 15/117 initiated wars led to captures (12.8%), 0.19 cities per initiated war, 0.02 eliminations per initiated war, 14/24 wins after any capture (58.3%), 5/15 Progress wins after prior captures
- **JadeCovenant:** 22/147 initiated wars led to captures (15.0%), 0.22 cities per initiated war, 0.04 eliminations per initiated war, 11/26 wins after any capture (42.3%), 2/2 Progress wins after prior captures

### ForgeClans Conversion Focus
- **Average Declaration Power Ratio:** 2.53
- **Median Turns from Declared War to First Capture:** 34.5
- **Median First Capture Turn:** wins 177.5, losses 226.0
- **Median 25-Turn Capture Burst:** wins 1.0, losses 1.0
- **First-Capture Win Rate:** 11/20 (55.0%)
- **Progress Wins With Prior Captures:** 4/5 (80.0%), avg 1.8 captures before first progress project

## 3. Unit Combat Analysis

### Unit Deaths
- **Total Units Killed:** 12837
- **Average per Game:** 128.4

### Deaths by Unit Type
- **SpearGuard:** 3205 deaths (3172 produced, 2898 of produced died, 8.6% produced survival)
- **BowGuard:** 2325 deaths (2467 produced, 2263 of produced died, 8.3% produced survival)
- **Trebuchet:** 1385 deaths (1783 produced, 1385 of produced died, 22.3% produced survival)
- **ArmyBowGuard:** 1328 deaths (2032 produced, 1328 of produced died, 34.6% produced survival)
- **ArmySpearGuard:** 969 deaths (1540 produced, 969 of produced died, 37.1% produced survival)
- **NativeArcher:** 791 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **ArmyRiders:** 589 deaths (916 produced, 589 of produced died, 35.7% produced survival)
- **Scout:** 518 deaths (123 produced, 116 of produced died, 5.7% produced survival)
- **Settler:** 476 deaths (1660 produced, 475 of produced died, 71.4% produced survival)
- **Lorekeeper:** 475 deaths (867 produced, 475 of produced died, 45.2% produced survival)
- **NativeChampion:** 397 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **Landship:** 255 deaths (919 produced, 255 of produced died, 72.3% produced survival)
- **Riders:** 104 deaths (122 produced, 104 of produced died, 14.8% produced survival)
- **Titan:** 19 deaths (37 produced, 19 of produced died, 48.6% produced survival)
- **Airship:** 1 deaths (83 produced, 1 of produced died, 98.8% produced survival)

### Unit Production by Type
- **SpearGuard:** 3172 produced
- **BowGuard:** 2467 produced
- **ArmyBowGuard:** 2032 produced
- **Trebuchet:** 1783 produced
- **Settler:** 1660 produced
- **ArmySpearGuard:** 1540 produced
- **Landship:** 919 produced
- **ArmyRiders:** 916 produced
- **Lorekeeper:** 867 produced
- **Scout:** 123 produced
- **Riders:** 122 produced
- **Airship:** 83 produced
- **Titan:** 37 produced

## 4. City Growth & Development

### City Statistics
- **Total Cities Founded:** 1792
- **Total Cities Captured:** 458
- **Total Cities Razed:** 28
- **Cities Reaching Pop 10:** 466

### Population Milestones (Average Turn)
- **Pop 3:** 136.8 (1328 cities)
- **Pop 5:** 160.2 (1255 cities)
- **Pop 7:** 188.8 (1155 cities)
- **Pop 10:** 341.4 (466 cities) [Range: 150-496]

### City Activity by Civilization
- **ForgeClans:** Founded 240 (3.2/game), Captured 85, Lost 70
- **ScholarKingdoms:** Founded 261 (3.7/game), Captured 17, Lost 84
- **RiverLeague:** Founded 237 (3.4/game), Captured 121, Lost 78
- **AetherianVanguard:** Founded 223 (3.1/game), Captured 124, Lost 76
- **StarborneSeekers:** Founded 247 (3.6/game), Captured 55, Lost 88
- **JadeCovenant:** Founded 216 (3.2/game), Captured 56, Lost 59

## 5. Technology Progression

### Tech Statistics
- **Total Techs Researched:** 4465
- **Average per Game:** 44.6
- **Total Techs in Tree:** 20

### Tech Tree Completion Rate by Civilization
- **ForgeClans:** 49.8% average tree completion
- **ScholarKingdoms:** 55.1% average tree completion
- **RiverLeague:** 52.6% average tree completion
- **AetherianVanguard:** 55.2% average tree completion
- **StarborneSeekers:** 63.4% average tree completion
- **JadeCovenant:** 46.7% average tree completion

### Tech Timing (Average Turn Researched)
- **ScriptLore:** Turn 52.6
- **Fieldcraft:** Turn 68.5
- **FormationTraining:** Turn 81.0
- **StoneworkHalls:** Turn 99.6
- **DrilledRanks:** Turn 130.0
- **Wellworks:** Turn 169.4
- **ScholarCourts:** Turn 182.4
- **ArmyDoctrine:** Turn 191.7
- **TimberMills:** Turn 204.8
- **CityWards:** Turn 218.8
- **SignalRelay:** Turn 234.6
- **CompositeArmor:** Turn 243.8
- **StarCharts:** Turn 256.1
- **UrbanPlans:** Turn 266.2
- **SteamForges:** Turn 266.3
- **TrailMaps:** Turn 282.5
- **PlasmaShields:** Turn 283.5
- **ZeroPointEnergy:** Turn 289.1
- **Aerodynamics:** Turn 322.0
- **DimensionalGate:** Turn 327.0

## 6. Project Completion

### Project Statistics
- **Total Projects Completed:** 392
- **Average per Game:** 3.9

### Project Breakdown
- **Progress Chain (Observatory/Academy/Experiment):** 238
- **Unique Building Markers:** 154

### Progress Chain Timing
- **Observatory:** 119 completions, avg turn 296.8
- **GrandAcademy:** 78 completions, avg turn 332.8
- **GrandExperiment:** 41 completions, avg turn 369.7

### Army Unit Production
- **ArmySpearGuard:** 1540 produced, 969 killed (37.1% survival)
- **ArmyBowGuard:** 2032 produced, 1328 killed (34.6% survival)
- **ArmyRiders:** 916 produced, 589 killed (35.7% survival)
- **Total Army Units:** 4488 produced, 2886 killed

## 7. Building Construction

### Buildings by Type
- **TradingPost:** 1183 built (avg turn 142.7)
- **MarketHall:** 792 built (avg turn 216.7)
- **Bank:** 288 built (avg turn 288.8)
- **Exchange:** 179 built (avg turn 305.8)
- **Bulwark:** 117 built (avg turn 82.4)
- **ShieldGenerator:** 46 built (avg turn 290.4)

## 8. Civilization Performance

### Win Rates & Statistics

#### AetherianVanguard
- **Games Played:** 71
- **Wins:** 21 (29.6% win rate)
  - Conquest: 16, Progress: 5
- **Eliminations:** 11
- **Avg Cities:** 3.8
- **Avg Population:** 31.3
- **Avg Techs:** 11.0
- **Avg Projects:** 1.0
- **Avg Military Power:** 138.8

#### StarborneSeekers
- **Games Played:** 68
- **Wins:** 20 (29.4% win rate)
  - Conquest: 5, Progress: 15
- **Eliminations:** 8
- **Avg Cities:** 3.0
- **Avg Population:** 25.6
- **Avg Techs:** 12.7
- **Avg Projects:** 1.9
- **Avg Military Power:** 96.5

#### ForgeClans
- **Games Played:** 74
- **Wins:** 16 (21.6% win rate)
  - Conquest: 11, Progress: 5
- **Eliminations:** 8
- **Avg Cities:** 3.4
- **Avg Population:** 27.3
- **Avg Techs:** 10.0
- **Avg Projects:** 0.4
- **Avg Military Power:** 138.2

#### RiverLeague
- **Games Played:** 70
- **Wins:** 15 (21.4% win rate)
  - Conquest: 10, Progress: 5
- **Eliminations:** 11
- **Avg Cities:** 4.0
- **Avg Population:** 34.6
- **Avg Techs:** 10.1
- **Avg Projects:** 0.5
- **Avg Military Power:** 172.6

#### JadeCovenant
- **Games Played:** 67
- **Wins:** 11 (16.4% win rate)
  - Conquest: 9, Progress: 2
- **Eliminations:** 13
- **Avg Cities:** 3.1
- **Avg Population:** 25.9
- **Avg Techs:** 9.2
- **Avg Projects:** 0.3
- **Avg Military Power:** 121.3

#### ScholarKingdoms
- **Games Played:** 70
- **Wins:** 10 (14.3% win rate)
  - Conquest: 2, Progress: 8
- **Eliminations:** 7
- **Avg Cities:** 2.7
- **Avg Population:** 22.1
- **Avg Techs:** 10.9
- **Avg Projects:** 1.5
- **Avg Military Power:** 89.3

## 9. City-State Systems

### Telemetry Coverage
- **Simulations with City-State Telemetry:** 100/100
- **Simulations Missing City-State Telemetry:** 0
- **Total City-States Created:** 368
- **Average City-States Created per Telemetry Sim:** 3.68
- **Average Surviving City-States at Game End (Telemetry Sims):** 3.65

### Activation & Turnover
- **Total City-State Active Turns:** 49307
- **First City-State Creation Turn (min / p25 / median / p75 / max):** 70 / 99 / 136 / 173 / 332
- **First City-State Creation Turn (average, sims with any):** 143.3
- **Global Suzerainty Flip Rate:** 0.60 per 100 active turns
- **True Ownership Turnover Rate:** 0.60 per 100 active turns
- **Average Unique Suzerains per City-State:** 1.23
- **Total Contested Turns:** 635 (No Suz: 122, Close-race: 513)
- **Contested Share of Active Turns:** 1.29%
- **Turnover-Window Turns:** 29514 (59.86% of active turns)
- **Flip-Window Turns:** 28506 (57.81% of active turns)
- **Safe-Lead Incumbent Turns:** 22899 (46.44% of active turns)
- **Hotspot Turns:** 827 (1.68% of active turns)
- **Passive Contestation Pulses:** 15794
- **Passive Contestation Close-Race Pulses:** 12355
- **City-States with Zero Suzerainty Flips:** 292/368
- **Contested-but-Zero-Flip City-States:** 105/368
- **Top 4 City-States Share of True Ownership Turnovers:** 33.9%
- **True Ownership Turnover Rate Outside Top 4 Turnover City-States:** 0.40 per 100 active turns
- **Top Turnover City-States:** Quillspire [Huge 403003] (36 ownership, 36 total), Lunarchive [Huge 408008] (27 ownership, 27 total), Silverbarley [Large 312012] (22 ownership, 22 total), Opaline Vault [Huge 410010] (15 ownership, 15 total)

### Camp-Clearing Activation Funnel
- **Camp-Clearing Episodes:** 5501
- **Direct Starts in Ready:** 1989 (36.2%)
- **Episodes Reaching Ready:** 2976 (54.1%)
- **Episodes with Sighting Telemetry:** 2649 (48.2%)
- **Sighted -> Prep Start (avg / median):** 113.92 / 98 turns
- **Prep Start -> Ready (avg / median):** 2.64 / 0 turns
- **Prep Start -> Self Clear (avg / median):** 13.70 / 10 turns
- **Total Prep Duration (avg / median):** 6.55 / 0 turns
- **Timeouts After Ready:** 119 (14.9% of timeouts)
- **Ready Turn Diagnostics:** no contact 5232, adjacent contact 806, attack opportunity 2629, stalled opportunity 1460, power disadvantage 1605, progress 1533
- **Ready-Timeout Primary Breakdown:** no contact 76, declined attack 24, power collapse 19, other 0
- **War-Interrupted Episodes:** 1970 (35.8%)
- **Cleared-By-Other Breakdown:** lacked military 33, late start 73, other 40
- **Episode Outcomes:** ClearedBySelf 346, ClearedByOther 146, TimedOut 797, WartimeEmergencyCancelled 1970, OtherCancelled 2163, StillActive 79
- **Readiness Breakdown:** PreArmy 9/1100 clears, 424 timeouts, ArmyTech 114/2394 clears, 248 timeouts, ArmyFielded 223/2007 clears, 125 timeouts

### Investment Mix
- **Total City-State Investment:** 1213815G across 16120 actions
- **Maintenance Investment:** 236916G (19.5%) across 6402 actions (39.7%)
- **Challenger Investment:** 976899G (80.5%) across 9718 actions (60.3%)
- **Maintenance Gold per Suzerainty Turn:** 4.82
- **Maintenance Actions per 100 Suzerainty Turns:** 13.02

### Turnover Diagnostics
- **Turnover-Window Challenger Investment:** 952180G across 9204 actions
- **Flip-Window Challenger Investment:** 937450G across 9019 actions
- **Deep-Challenge Investment:** 24674G across 513 actions
- **Neutral-Claim Investment:** 45G across 1 actions
- **Passive Openings Observed:** 0
- **Passive Openings with Treasury to Invest:** 0 (0.0%)
- **Passive Openings with Reserve-Safe Invest:** 0 (0.0%)
- **Passive Opening Avg Nominated Turn-Order Delay:** 0.00 turns
- **Passive Openings Attempted by Nominated Challenger:** 0 (0.0%)
- **Passive Opening Avg Delay to First Nominated Attempt:** 0.00 turns
- **Passive Openings Resolved Before Expiry:** 0 (0.0%)
- **Passive Openings Won by Nominated Challenger:** 0 (0.0% of openings, 0.0% of resolved)
- **Passive Openings Lost to Someone Else:** 0
- **Passive Openings Expired Unresolved:** 0
- **Passive Opening Resolutions by Cause:** none
- **Passive Opening Nominated Wins by Cause:** none
- **Passive Openings with No Nominated Attempt:** 0 (0.0%)
- **No-Attempt Reasons:** Treasury blocked 0, Reserve blocked 0, No-attempt despite capacity 0
- **Passive Direct Flip Conversion per 100 Close-Race Pulses:** 0.00
- **Passive-Assisted Suzerainty Changes:** 48 (16.2% of non-passive changes)
- **Passive-Assisted True Ownership Turnovers:** 47 (15.9% of ownership turnover)
- **Passive-Assisted Ownership Conversion per 100 Close-Race Pulses:** 0.38
- **Passive-Involved Ownership Conversion per 100 Close-Race Pulses:** 0.38
- **Passive-Assisted Ownership Causes:** WartimeRelease 38, Other 9
- **Pair-Fatigue-Triggered Investment:** 43630G across 593 actions
- **Pair-Fatigue Share of Challenger Spend:** 4.5%
- **Safe-Maintenance Investment:** 39G across 1 actions
- **Focus Turns:** 36013 (challenge 29409, maintenance 6604)
- **Focus Assignments / Switches:** 747 / 61
- **Flip Conversion per 100 Turnover-Window Turns:** 1.01
- **True Ownership Conversion per 100 Turnover-Window Turns:** 1.00
- **Safe-Maintenance Share of Maintenance Spend:** 0.0%

### Flip Cause Summary
- **Investment:** 173 suzerainty changes, 172 true ownership turnovers (58.3% of ownership turnover)
- **PassiveContestation:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **WartimeRelease:** 43 suzerainty changes, 42 true ownership turnovers (14.2% of ownership turnover)
- **WarBreak:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **Other:** 81 suzerainty changes, 81 true ownership turnovers (27.5% of ownership turnover)

### Hotspot Diagnostics
- **Hotspot Share of Active Turns:** 1.68%
- **City-State Instances with Any Hotspot Time:** 22/368
- **True Ownership Turnovers Occurring in Hotspot Instances:** 225/295
- **Flip Causes:** Investment 173, WartimeRelease 43, Other 81
- **Ownership Causes:** Investment 172, WartimeRelease 42, Other 81
- **Top Hotspot Instances:** Quillspire [Huge 403003] (36 ownership, hotspot 79.2%, fatigue 3376G/34, RiverLeague <> JadeCovenant 13, AetherianVanguard <> RiverLeague 12, AetherianVanguard <> JadeCovenant 10, RiverLeague <> ForgeClans 1); Lunarchive [Huge 408008] (27 ownership, hotspot 30.7%, fatigue 2369G/25, JadeCovenant <> ScholarKingdoms 14, JadeCovenant <> RiverLeague 9, RiverLeague <> ScholarKingdoms 4); Silverbarley [Large 312012] (22 ownership, hotspot 29.5%, fatigue 2734G/34, RiverLeague <> JadeCovenant 10, ScholarKingdoms <> RiverLeague 8, ScholarKingdoms <> JadeCovenant 4); Opaline Vault [Huge 410010] (15 ownership, hotspot 23.4%, fatigue 1807G/19, StarborneSeekers <> ForgeClans 15); Lunarchive [Huge 420020] (13 ownership, hotspot 61.8%, fatigue 4451G/43, ForgeClans <> JadeCovenant 13); Saffron Treasury [Huge 403003] (13 ownership, hotspot 28.7%, fatigue 2806G/23, StarborneSeekers <> JadeCovenant 8, JadeCovenant <> ForgeClans 5)

### Map-Size City-State Activation
- **Tiny:** 13/20 sims with >=1 city-state (65.0%), avg created 1.00, avg first CS turn 165.5
- **Small:** 12/20 sims with >=1 city-state (60.0%), avg created 1.15, avg first CS turn 157.4
- **Standard:** 19/20 sims with >=1 city-state (95.0%), avg created 3.45, avg first CS turn 124.9
- **Large:** 20/20 sims with >=1 city-state (100.0%), avg created 5.50, avg first CS turn 125.2
- **Huge:** 20/20 sims with >=1 city-state (100.0%), avg created 7.30, avg first CS turn 156.1

### Yield-Type Turnover Summary
- **Science:** 88 city-states, contested 1.34% (No Suz 0.00%, Close-race 1.34%), turnover window 60.36%, flip window 58.15%, safe lead 46.80%, hotspot 3.22%, flip rate 0.99/100T, ownership turnover 0.99/100T, avg unique suzerains 1.20
- **Production:** 95 city-states, contested 0.72% (No Suz 0.00%, Close-race 0.72%), turnover window 52.29%, flip window 50.95%, safe lead 52.04%, hotspot 0.31%, flip rate 0.23/100T, ownership turnover 0.23/100T, avg unique suzerains 1.17
- **Food:** 96 city-states, contested 2.02% (No Suz 1.02%, Close-race 1.00%), turnover window 61.24%, flip window 58.92%, safe lead 45.08%, hotspot 2.24%, flip rate 0.75/100T, ownership turnover 0.73/100T, avg unique suzerains 1.23
- **Gold:** 89 city-states, contested 1.14% (No Suz 0.00%, Close-race 1.14%), turnover window 65.99%, flip window 63.62%, safe lead 41.57%, hotspot 1.17%, flip rate 0.50/100T, ownership turnover 0.50/100T, avg unique suzerains 1.30

### Suzerainty vs Winning (Directional)
- **Winner Average Suzerainty Turns:** 168.72
- **Non-Winner Average Suzerainty Turns:** 102.43
- **Winners with Any Suzerainty:** 68/93 (73.1%)
- **Participant Win Rate with Any Suzerainty:** 27.8%
- **Participant Win Rate without Suzerainty:** 14.3%

## 10. Stalls & Issues

### Games Without Victory
- **Count:** 7 of 100 (7.0%)

### Stall Diagnostics

#### Stalled Game 1 (Small, seed 103003)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 15
- **Final Units:** 31
- **War Declarations:** 4
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 37
- **Civ Details:**
  - JadeCovenant: 1 cities, pop 11, power 45, 6 techs
  - ForgeClans: 6 cities, pop 42, power 225.8, 12 techs
  - AetherianVanguard: 5 cities, pop 44, power 117.46666666666665, 14 techs

#### Stalled Game 2 (Small, seed 113013)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 8
- **Final Units:** 62
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 23
- **Civ Details:**
  - ScholarKingdoms: 3 cities, pop 30, power 109.93333333333334, 9 techs
  - ForgeClans: 4 cities, pop 40, power 549, 13 techs
  - RiverLeague: 0 cities, pop 0, power 14, 0 techs

#### Stalled Game 3 (Standard, seed 201001)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 21
- **Final Units:** 47
- **War Declarations:** 5
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 63
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - ScholarKingdoms: 1 cities, pop 10, power 85, 13 techs
  - ForgeClans: 4 cities, pop 41, power 167.33333333333334, 10 techs
  - RiverLeague: 9 cities, pop 87, power 531.2, 20 techs

#### Stalled Game 4 (Standard, seed 209009)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 17
- **Final Units:** 32
- **War Declarations:** 8
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 50
- **Civ Details:**
  - AetherianVanguard: 8 cities, pop 73, power 328.8666666666667, 20 techs
  - JadeCovenant: 2 cities, pop 19, power 83.4, 9 techs
  - ScholarKingdoms: 1 cities, pop 10, power 61, 18 techs
  - ForgeClans: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)

#### Stalled Game 5 (Standard, seed 203003)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 27
- **Final Units:** 63
- **War Declarations:** 10
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 89
- **Civ Details:**
  - JadeCovenant: 0 cities, pop 0, power 0, 19 techs (ELIMINATED)
  - RiverLeague: 13 cities, pop 116, power 572.4, 20 techs
  - ForgeClans: 4 cities, pop 32, power 215, 9 techs
  - ScholarKingdoms: 5 cities, pop 44, power 134.39999999999998, 20 techs

#### Stalled Game 6 (Standard, seed 213013)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 17
- **Final Units:** 58
- **War Declarations:** 10
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 54
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 18 techs (ELIMINATED)
  - JadeCovenant: 2 cities, pop 21, power 167.33333333333334, 7 techs
  - ScholarKingdoms: 2 cities, pop 20, power 99.08, 12 techs
  - RiverLeague: 10 cities, pop 95, power 504.8666666666667, 20 techs

#### Stalled Game 7 (Huge, seed 418018)
- **Turn Reached:** 501
- **Surviving Civs:** 6
- **Final Cities:** 16
- **Final Units:** 72
- **War Declarations:** 10
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 57
- **Civ Details:**
  - ScholarKingdoms: 1 cities, pop 11, power 12, 13 techs
  - AetherianVanguard: 1 cities, pop 11, power 29, 7 techs
  - JadeCovenant: 0 cities, pop 0, power 14, 0 techs
  - StarborneSeekers: 1 cities, pop 11, power 77.33333333333334, 18 techs
  - ForgeClans: 2 cities, pop 18, power 311.4666666666667, 15 techs
  - RiverLeague: 4 cities, pop 37, power 163, 8 techs

## 11. Map Size Analysis

### Tiny Maps
- **Simulations:** 20
- **Victories:** 20 (100.0%)
  - Conquest: 19, Progress: 1
- **Average Victory Turn:** 214.8
- **Victory Turn Range:** [42, 377]

### Small Maps
- **Simulations:** 20
- **Victories:** 18 (90.0%)
  - Conquest: 18, Progress: 0
- **Average Victory Turn:** 164.6
- **Victory Turn Range:** [42, 364]

### Standard Maps
- **Simulations:** 20
- **Victories:** 16 (80.0%)
  - Conquest: 11, Progress: 5
- **Average Victory Turn:** 278.3
- **Victory Turn Range:** [185, 376]

### Large Maps
- **Simulations:** 20
- **Victories:** 20 (100.0%)
  - Conquest: 2, Progress: 18
- **Average Victory Turn:** 357.6
- **Victory Turn Range:** [214, 427]

### Huge Maps
- **Simulations:** 20
- **Victories:** 19 (95.0%)
  - Conquest: 3, Progress: 16
- **Average Victory Turn:** 359.4
- **Victory Turn Range:** [199, 496]

## 12. Balance Observations

### Victory Timing vs Pop 10
- Average Victory Turn: 276.3
- Average Pop 10 Turn: 341.4
- **Gap:** 65.1 turns (Pop 10 happens AFTER victory)

### Civilization Balance
- Highest Win Rate: AetherianVanguard (29.6%)
- Lowest Win Rate: ScholarKingdoms (14.3%)
- **Win Rate Spread:** 15.3 percentage points

### Settler Survival
- Settlers Produced: 1660
- Settlers Killed: 476
- **Settler Survival Rate:** 71.3%

