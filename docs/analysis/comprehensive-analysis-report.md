# Comprehensive Simulation Analysis Report

**Date:** 2025-12-01
**Simulations:** 250 total (10 per map size) (AI vs AI)
**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)

---

## 1. Victory Analysis

### Overall Statistics
- **Total Victories:** 184 of 250 (73.6%)
- **Average Victory Turn:** 111.7
- **Median Victory Turn:** 144
- **Victory Turn Range:** [2, 201]

### Victory Types
- **Conquest:** 124 (49.6%)
- **Progress:** 60 (24.0%)
- **None:** 66 (26.4%)

### Victories by Civilization (with Victory Type Breakdown)
- **AetherianVanguard:** 48 wins (27.3% of games played)
  - Conquest: 47, Progress: 1
- **StarborneSeekers:** 41 wins (23.3% of games played)
  - Conquest: 16, Progress: 25
- **ForgeClans:** 27 wins (15.6% of games played)
  - Conquest: 22, Progress: 5
- **RiverLeague:** 24 wins (13.6% of games played)
  - Conquest: 13, Progress: 11
- **JadeCovenant:** 23 wins (13.3% of games played)
  - Conquest: 19, Progress: 4
- **ScholarKingdoms:** 21 wins (11.9% of games played)
  - Conquest: 7, Progress: 14

## 2. Warfare Analysis

### War Statistics
- **Total Unique Wars:** 1778
- **Total Peace Treaties:** 1534
- **Average Wars per Game:** 7.1

### War Durations
- **Total Wars Tracked:** 1778
- **Average Duration:** 59.9 turns
- **Median Duration:** 28 turns
- **Range:** [0, 189] turns

### War Initiation by Civilization
- **ForgeClans:** Initiated 283 (1.6/game), Received 315 (1.8/game)
- **ScholarKingdoms:** Initiated 286 (1.6/game), Received 301 (1.7/game)
- **RiverLeague:** Initiated 311 (1.8/game), Received 290 (1.6/game)
- **AetherianVanguard:** Initiated 306 (1.7/game), Received 277 (1.6/game)
- **StarborneSeekers:** Initiated 299 (1.7/game), Received 296 (1.7/game)
- **JadeCovenant:** Initiated 293 (1.7/game), Received 299 (1.7/game)

## 3. Unit Combat Analysis

### Unit Deaths
- **Total Units Killed:** 9572
- **Average per Game:** 38.3

### Deaths by Unit Type
- **ArmyBowGuard:** 3497 deaths (19899 produced, 82.4% survival)
- **BowGuard:** 2168 deaths (14540 produced, 85.1% survival)
- **Scout:** 1000 deaths (1447 produced, 30.9% survival)
- **Riders:** 908 deaths (1539 produced, 41.0% survival)
- **SpearGuard:** 835 deaths (2077 produced, 59.8% survival)
- **ArmySpearGuard:** 438 deaths (2994 produced, 85.4% survival)
- **Settler:** 436 deaths (4652 produced, 90.6% survival)
- **ArmyRiders:** 238 deaths (339 produced, 29.8% survival)
- **RiverBoat:** 47 deaths (795 produced, 94.1% survival)
- **Titan:** 5 deaths (209 produced, 97.6% survival)

### Unit Production by Type
- **ArmyBowGuard:** 19899 produced
- **BowGuard:** 14540 produced
- **Settler:** 4652 produced
- **ArmySpearGuard:** 2994 produced
- **SpearGuard:** 2077 produced
- **Riders:** 1539 produced
- **Scout:** 1447 produced
- **RiverBoat:** 795 produced
- **ArmyRiders:** 339 produced
- **Titan:** 209 produced

## 4. City Growth & Development

### City Statistics
- **Total Cities Founded:** 2473
- **Total Cities Captured:** 973
- **Total Cities Razed:** 40
- **Cities Reaching Pop 10:** 562

### Population Milestones (Average Turn)
- **Pop 3:** 85.7 (2238 cities)
- **Pop 5:** 104.9 (2095 cities)
- **Pop 7:** 125.0 (1841 cities)
- **Pop 10:** 162.5 (562 cities) [Range: 75-200]

### City Activity by Civilization
- **ForgeClans:** Founded 445 (2.6/game), Captured 181, Lost 159
- **ScholarKingdoms:** Founded 268 (1.5/game), Captured 62, Lost 169
- **RiverLeague:** Founded 426 (2.4/game), Captured 110, Lost 184
- **AetherianVanguard:** Founded 413 (2.3/game), Captured 294, Lost 139
- **StarborneSeekers:** Founded 351 (2.0/game), Captured 96, Lost 196
- **JadeCovenant:** Founded 570 (3.3/game), Captured 230, Lost 126

## 5. Technology Progression

### Tech Statistics
- **Total Techs Researched:** 8054
- **Average per Game:** 32.2
- **Total Techs in Tree:** 15

### Tech Tree Completion Rate by Civilization
- **ForgeClans:** 60.0% average tree completion
- **ScholarKingdoms:** 56.2% average tree completion
- **RiverLeague:** 64.4% average tree completion
- **AetherianVanguard:** 56.7% average tree completion
- **StarborneSeekers:** 53.4% average tree completion
- **JadeCovenant:** 64.1% average tree completion

### Tech Timing (Average Turn Researched)
- **ScriptLore:** Turn 28.0
- **FormationTraining:** Turn 47.6
- **Fieldcraft:** Turn 60.1
- **DrilledRanks:** Turn 76.9
- **StoneworkHalls:** Turn 87.5
- **TrailMaps:** Turn 91.8
- **ScholarCourts:** Turn 105.1
- **Wellworks:** Turn 105.1
- **ArmyDoctrine:** Turn 117.1
- **CityWards:** Turn 131.9
- **TimberMills:** Turn 137.7
- **StarCharts:** Turn 143.0
- **UrbanPlans:** Turn 147.6
- **SteamForges:** Turn 150.5
- **SignalRelay:** Turn 157.9

## 6. Project Completion

### Project Statistics
- **Total Projects Completed:** 10274
- **Average per Game:** 41.1

### Project Breakdown
- **Progress Chain (Observatory/Academy/Experiment):** 395
- **Form Army Projects:** 9734
- **Unique Building Markers:** 145

### Progress Chain Timing
- **Observatory:** 207 completions, avg turn 156.4
- **GrandAcademy:** 128 completions, avg turn 166.2
- **GrandExperiment:** 60 completions, avg turn 177.6

### Form Army Usage by Type
- **FormArmy_SpearGuard:** 1036
- **FormArmy_BowGuard:** 8232
- **FormArmy_Riders:** 466

## 7. Building Construction

### Buildings by Type
- **TitansCore:** 209 built (avg turn 164.7)
- **JadeGranary:** 145 built (avg turn 61.4)
- **SpiritObservatory:** 1 built (avg turn 185.0)

## 8. Civilization Performance

### Win Rates & Statistics

#### AetherianVanguard
- **Games Played:** 176
- **Wins:** 48 (27.3% win rate)
  - Conquest: 47, Progress: 1
- **Eliminations:** 27
- **Avg Cities:** 3.2
- **Avg Population:** 22.7
- **Avg Techs:** 7.2
- **Avg Projects:** 8.8
- **Avg Military Power:** 90.8

#### StarborneSeekers
- **Games Played:** 176
- **Wins:** 41 (23.3% win rate)
  - Conquest: 16, Progress: 25
- **Eliminations:** 45
- **Avg Cities:** 1.4
- **Avg Population:** 10.1
- **Avg Techs:** 6.9
- **Avg Projects:** 6.6
- **Avg Military Power:** 25.7

#### ForgeClans
- **Games Played:** 173
- **Wins:** 27 (15.6% win rate)
  - Conquest: 22, Progress: 5
- **Eliminations:** 36
- **Avg Cities:** 2.7
- **Avg Population:** 19.3
- **Avg Techs:** 7.8
- **Avg Projects:** 16.2
- **Avg Military Power:** 96.9

#### RiverLeague
- **Games Played:** 176
- **Wins:** 24 (13.6% win rate)
  - Conquest: 13, Progress: 11
- **Eliminations:** 40
- **Avg Cities:** 1.9
- **Avg Population:** 15.1
- **Avg Techs:** 8.5
- **Avg Projects:** 11.4
- **Avg Military Power:** 56.5

#### JadeCovenant
- **Games Played:** 173
- **Wins:** 23 (13.3% win rate)
  - Conquest: 19, Progress: 4
- **Eliminations:** 12
- **Avg Cities:** 3.8
- **Avg Population:** 31.6
- **Avg Techs:** 8.3
- **Avg Projects:** 12.8
- **Avg Military Power:** 151.1

#### ScholarKingdoms
- **Games Played:** 176
- **Wins:** 21 (11.9% win rate)
  - Conquest: 7, Progress: 14
- **Eliminations:** 60
- **Avg Cities:** 0.9
- **Avg Population:** 6.5
- **Avg Techs:** 7.4
- **Avg Projects:** 3.0
- **Avg Military Power:** 13.5

## 9. Stalls & Issues

### Games Without Victory
- **Count:** 66 of 250 (26.4%)

### Stall Diagnostics

#### Stalled Game 1 (Tiny, seed 1001)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 3
- **Final Units:** 15
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 21
- **Civ Details:**
  - RiverLeague: 2 cities, pop 17, power 136, 9 techs
  - ScholarKingdoms: 1 cities, pop 10, power 4, 10 techs

#### Stalled Game 2 (Tiny, seed 17017)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 2
- **Final Units:** 17
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 26
- **Civ Details:**
  - JadeCovenant: 1 cities, pop 11, power 101.33333333333333, 9 techs
  - ForgeClans: 1 cities, pop 9, power 101.2, 6 techs

#### Stalled Game 3 (Tiny, seed 13013)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 3
- **Final Units:** 19
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 21
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 17, power 114, 7 techs
  - AetherianVanguard: 1 cities, pop 8, power 40, 6 techs

#### Stalled Game 4 (Tiny, seed 33033)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 21
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 25
- **Civ Details:**
  - ForgeClans: 4 cities, pop 28, power 199.06666666666666, 10 techs
  - ScholarKingdoms: 1 cities, pop 9, power 8, 10 techs

#### Stalled Game 5 (Tiny, seed 19019)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 33
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 140
- **Civ Details:**
  - ForgeClans: 4 cities, pop 32, power 297, 14 techs
  - AetherianVanguard: 1 cities, pop 8, power 24.4, 6 techs

#### Stalled Game 6 (Tiny, seed 30030)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 3
- **Final Units:** 18
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 11
- **Civ Details:**
  - ScholarKingdoms: 2 cities, pop 18, power 106, 12 techs
  - ForgeClans: 1 cities, pop 9, power 21, 6 techs

#### Stalled Game 7 (Tiny, seed 50050)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 10
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 39
- **Civ Details:**
  - JadeCovenant: 2 cities, pop 22, power 59.33333333333333, 8 techs
  - RiverLeague: 3 cities, pop 28, power 35.4, 14 techs

#### Stalled Game 8 (Tiny, seed 47047)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 4
- **Final Units:** 28
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 34
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 15, power 94.06666666666666, 8 techs
  - JadeCovenant: 2 cities, pop 20, power 226, 8 techs

#### Stalled Game 9 (Small, seed 112012)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 9
- **Final Units:** 42
- **War Declarations:** 4
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 70
- **Civ Details:**
  - ForgeClans: 5 cities, pop 39, power 416.06666666666666, 14 techs
  - ScholarKingdoms: 3 cities, pop 24, power 16.133333333333333, 13 techs
  - RiverLeague: 1 cities, pop 10, power 0, 6 techs

#### Stalled Game 10 (Small, seed 118018)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 18
- **War Declarations:** 8
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - JadeCovenant: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - StarborneSeekers: 3 cities, pop 23, power 88.33333333333333, 11 techs
  - ForgeClans: 2 cities, pop 19, power 35.333333333333336, 6 techs

#### Stalled Game 11 (Small, seed 121021)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 8
- **Final Units:** 25
- **War Declarations:** 6
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 65
- **Civ Details:**
  - JadeCovenant: 2 cities, pop 21, power 109.46666666666667, 12 techs
  - RiverLeague: 4 cities, pop 38, power 102.6, 15 techs
  - ForgeClans: 2 cities, pop 19, power 46.266666666666666, 10 techs

#### Stalled Game 12 (Small, seed 125025)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 7
- **Final Units:** 20
- **War Declarations:** 4
- **City Captures:** 7
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 52
- **Civ Details:**
  - AetherianVanguard: 4 cities, pop 34, power 181.36, 13 techs
  - RiverLeague: 3 cities, pop 22, power 93.13333333333334, 14 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 1 techs (ELIMINATED)

#### Stalled Game 13 (Small, seed 130030)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 7
- **Final Units:** 35
- **War Declarations:** 3
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 50
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 8, 3 techs
  - ForgeClans: 6 cities, pop 40, power 333.8, 14 techs
  - ScholarKingdoms: 1 cities, pop 9, power 4, 10 techs

#### Stalled Game 14 (Small, seed 134034)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 5
- **Final Units:** 27
- **War Declarations:** 7
- **City Captures:** 2
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 59
- **Civ Details:**
  - RiverLeague: 2 cities, pop 19, power 118.60000000000001, 13 techs
  - JadeCovenant: 2 cities, pop 21, power 148.6, 12 techs
  - AetherianVanguard: 1 cities, pop 10, power 8, 7 techs

#### Stalled Game 15 (Small, seed 135035)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 8
- **Final Units:** 28
- **War Declarations:** 9
- **City Captures:** 2
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 68
- **Civ Details:**
  - RiverLeague: 3 cities, pop 27, power 95.46666666666667, 13 techs
  - JadeCovenant: 5 cities, pop 42, power 197.26666666666665, 11 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)

#### Stalled Game 16 (Small, seed 147047)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 8
- **Final Units:** 30
- **War Declarations:** 9
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 65
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 24, power 70.4, 15 techs
  - JadeCovenant: 2 cities, pop 18, power 88, 11 techs
  - ForgeClans: 3 cities, pop 23, power 142.93333333333334, 8 techs

#### Stalled Game 17 (Standard, seed 205005)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 13
- **Final Units:** 31
- **War Declarations:** 13
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 83
- **Civ Details:**
  - RiverLeague: 3 cities, pop 30, power 53.866666666666674, 15 techs
  - JadeCovenant: 8 cities, pop 70, power 280, 15 techs
  - StarborneSeekers: 1 cities, pop 5, power 0, 9 techs
  - ScholarKingdoms: 1 cities, pop 5, power 0, 8 techs

#### Stalled Game 18 (Standard, seed 208008)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 9
- **Final Units:** 33
- **War Declarations:** 11
- **City Captures:** 3
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 76
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 9, power 24.8, 7 techs
  - JadeCovenant: 3 cities, pop 31, power 226.8, 10 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 5 cities, pop 37, power 108.06666666666666, 10 techs

#### Stalled Game 19 (Standard, seed 207007)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 10
- **Final Units:** 43
- **War Declarations:** 10
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 76
- **Civ Details:**
  - RiverLeague: 3 cities, pop 21, power 165.86666666666667, 12 techs
  - JadeCovenant: 4 cities, pop 36, power 264, 15 techs
  - StarborneSeekers: 2 cities, pop 17, power 8, 5 techs
  - ForgeClans: 1 cities, pop 10, power 4, 6 techs

#### Stalled Game 20 (Standard, seed 206006)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 10
- **Final Units:** 37
- **War Declarations:** 12
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 77
- **Civ Details:**
  - JadeCovenant: 3 cities, pop 28, power 167.46666666666667, 8 techs
  - RiverLeague: 4 cities, pop 39, power 196.2666666666667, 15 techs
  - ScholarKingdoms: 2 cities, pop 20, power 12, 13 techs
  - StarborneSeekers: 1 cities, pop 8, power 0, 4 techs

#### Stalled Game 21 (Standard, seed 204004)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 13
- **Final Units:** 76
- **War Declarations:** 7
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 260
- **Civ Details:**
  - JadeCovenant: 0 cities, pop 0, power 22, 3 techs
  - RiverLeague: 2 cities, pop 18, power 0, 10 techs
  - ForgeClans: 10 cities, pop 74, power 682.6666666666666, 15 techs
  - ScholarKingdoms: 1 cities, pop 10, power 5, 10 techs

#### Stalled Game 22 (Standard, seed 209009)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 14
- **Final Units:** 35
- **War Declarations:** 10
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 76
- **Civ Details:**
  - AetherianVanguard: 7 cities, pop 62, power 323.38666666666677, 15 techs
  - JadeCovenant: 6 cities, pop 47, power 128.33333333333331, 15 techs
  - ScholarKingdoms: 1 cities, pop 7, power 35, 11 techs
  - ForgeClans: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)

#### Stalled Game 23 (Standard, seed 213013)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 7
- **Final Units:** 33
- **War Declarations:** 11
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 68
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 10, 2 techs
  - JadeCovenant: 2 cities, pop 22, power 167.20000000000002, 10 techs
  - ScholarKingdoms: 2 cities, pop 14, power 31.133333333333333, 13 techs
  - RiverLeague: 3 cities, pop 27, power 128.26666666666665, 15 techs

#### Stalled Game 24 (Standard, seed 210010)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 13
- **Final Units:** 39
- **War Declarations:** 10
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 286
- **Civ Details:**
  - RiverLeague: 4 cities, pop 32, power 108, 12 techs
  - ForgeClans: 9 cities, pop 67, power 294.3333333333333, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - JadeCovenant: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)

#### Stalled Game 25 (Standard, seed 212012)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 12
- **Final Units:** 40
- **War Declarations:** 11
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 85
- **Civ Details:**
  - ForgeClans: 7 cities, pop 41, power 275.79999999999995, 15 techs
  - RiverLeague: 3 cities, pop 29, power 88.53333333333332, 12 techs
  - ScholarKingdoms: 1 cities, pop 7, power 0, 9 techs
  - AetherianVanguard: 1 cities, pop 6, power 0, 7 techs

#### Stalled Game 26 (Standard, seed 223023)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 11
- **Final Units:** 25
- **War Declarations:** 8
- **City Captures:** 4
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 84
- **Civ Details:**
  - AetherianVanguard: 6 cities, pop 48, power 233.33333333333334, 13 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - RiverLeague: 5 cities, pop 37, power 114.33333333333333, 15 techs
  - StarborneSeekers: 0 cities, pop 0, power 4, 4 techs

#### Stalled Game 27 (Standard, seed 221021)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 12
- **Final Units:** 19
- **War Declarations:** 11
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 79
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 19, power 18.2, 10 techs
  - RiverLeague: 7 cities, pop 58, power 128.26666666666665, 15 techs
  - ForgeClans: 3 cities, pop 18, power 15, 9 techs

#### Stalled Game 28 (Standard, seed 226026)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 12
- **Final Units:** 35
- **War Declarations:** 15
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 270
- **Civ Details:**
  - JadeCovenant: 10 cities, pop 82, power 331.4, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 4, 7 techs
  - StarborneSeekers: 2 cities, pop 19, power 0, 15 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)

#### Stalled Game 29 (Standard, seed 232032)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 9
- **Final Units:** 44
- **War Declarations:** 12
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 64
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 10, power 0, 11 techs
  - RiverLeague: 4 cities, pop 36, power 271.0666666666666, 15 techs
  - ForgeClans: 1 cities, pop 11, power 4, 6 techs
  - StarborneSeekers: 3 cities, pop 22, power 117.53333333333333, 10 techs

#### Stalled Game 30 (Standard, seed 236036)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 10
- **Final Units:** 42
- **War Declarations:** 10
- **City Captures:** 4
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 94
- **Civ Details:**
  - RiverLeague: 4 cities, pop 36, power 123.93333333333331, 15 techs
  - JadeCovenant: 4 cities, pop 39, power 287.9333333333333, 12 techs
  - StarborneSeekers: 1 cities, pop 6, power 4, 4 techs
  - ForgeClans: 1 cities, pop 9, power 8, 6 techs

#### Stalled Game 31 (Standard, seed 238038)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 12
- **Final Units:** 48
- **War Declarations:** 11
- **City Captures:** 5
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 98
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - JadeCovenant: 7 cities, pop 63, power 384.5333333333333, 14 techs
  - ForgeClans: 4 cities, pop 34, power 121.26666666666668, 12 techs
  - AetherianVanguard: 1 cities, pop 8, power 4, 8 techs

#### Stalled Game 32 (Standard, seed 243043)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 10
- **Final Units:** 35
- **War Declarations:** 11
- **City Captures:** 4
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 84
- **Civ Details:**
  - ForgeClans: 5 cities, pop 39, power 238.86666666666667, 12 techs
  - AetherianVanguard: 4 cities, pop 33, power 51.60000000000001, 11 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - StarborneSeekers: 1 cities, pop 6, power 22.933333333333334, 4 techs

#### Stalled Game 33 (Standard, seed 241041)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 12
- **Final Units:** 40
- **War Declarations:** 8
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 80
- **Civ Details:**
  - JadeCovenant: 3 cities, pop 27, power 157.4, 11 techs
  - ForgeClans: 2 cities, pop 18, power 88.66666666666666, 11 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)
  - AetherianVanguard: 7 cities, pop 64, power 358.7066666666667, 15 techs

#### Stalled Game 34 (Standard, seed 249049)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 10
- **Final Units:** 36
- **War Declarations:** 9
- **City Captures:** 3
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 93
- **Civ Details:**
  - RiverLeague: 3 cities, pop 31, power 110.73333333333333, 15 techs
  - JadeCovenant: 2 cities, pop 20, power 99, 8 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - ForgeClans: 5 cities, pop 41, power 160.93333333333334, 13 techs

#### Stalled Game 35 (Large, seed 302002)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 12
- **Final Units:** 34
- **War Declarations:** 21
- **City Captures:** 3
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 137
- **Civ Details:**
  - ForgeClans: 7 cities, pop 49, power 222.73333333333332, 14 techs
  - AetherianVanguard: 2 cities, pop 18, power 77.84, 11 techs
  - RiverLeague: 1 cities, pop 9, power 12, 9 techs
  - ScholarKingdoms: 2 cities, pop 12, power 17.53333333333333, 11 techs
  - JadeCovenant: 0 cities, pop 0, power 8, 0 techs
  - StarborneSeekers: 0 cities, pop 0, power 8, 3 techs

#### Stalled Game 36 (Large, seed 304004)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 12
- **Final Units:** 32
- **War Declarations:** 33
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 118
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 26, power 38.53333333333333, 10 techs
  - AetherianVanguard: 4 cities, pop 23, power 60.4, 9 techs
  - RiverLeague: 0 cities, pop 0, power 22, 7 techs
  - ForgeClans: 2 cities, pop 16, power 24.666666666666664, 9 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - JadeCovenant: 3 cities, pop 30, power 220.66666666666666, 9 techs

#### Stalled Game 37 (Large, seed 303003)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 19
- **Final Units:** 42
- **War Declarations:** 29
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 109
- **Civ Details:**
  - AetherianVanguard: 11 cities, pop 68, power 343.1333333333334, 15 techs
  - JadeCovenant: 4 cities, pop 29, power 126.6, 11 techs
  - RiverLeague: 1 cities, pop 9, power 8, 10 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 3 cities, pop 14, power 76.93333333333334, 6 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)

#### Stalled Game 38 (Large, seed 306006)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 14
- **Final Units:** 52
- **War Declarations:** 28
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 462
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 4, 6 techs
  - ScholarKingdoms: 2 cities, pop 19, power 8, 11 techs
  - StarborneSeekers: 3 cities, pop 27, power 63.86666666666666, 13 techs
  - ForgeClans: 7 cities, pop 47, power 279.40000000000003, 15 techs
  - RiverLeague: 1 cities, pop 9, power 47.333333333333336, 11 techs
  - JadeCovenant: 1 cities, pop 10, power 66, 7 techs

#### Stalled Game 39 (Large, seed 307007)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 14
- **Final Units:** 39
- **War Declarations:** 28
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 111
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 3 cities, pop 21, power 117.93333333333335, 12 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - AetherianVanguard: 5 cities, pop 44, power 162.89333333333335, 12 techs
  - RiverLeague: 4 cities, pop 38, power 60.2, 15 techs
  - JadeCovenant: 2 cities, pop 21, power 130.26666666666665, 8 techs

#### Stalled Game 40 (Large, seed 309009)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 10
- **Final Units:** 45
- **War Declarations:** 25
- **City Captures:** 2
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 108
- **Civ Details:**
  - RiverLeague: 3 cities, pop 25, power 58.53333333333333, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 8, 0 techs
  - ForgeClans: 4 cities, pop 39, power 145.60000000000002, 12 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 19, power 109.60000000000001, 9 techs
  - JadeCovenant: 1 cities, pop 11, power 75.86666666666666, 9 techs

#### Stalled Game 41 (Large, seed 312012)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 13
- **Final Units:** 58
- **War Declarations:** 29
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 108
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 9, power 52, 7 techs
  - ScholarKingdoms: 1 cities, pop 8, power 8, 10 techs
  - StarborneSeekers: 2 cities, pop 19, power 26.733333333333334, 5 techs
  - RiverLeague: 2 cities, pop 19, power 104.66666666666666, 11 techs
  - JadeCovenant: 5 cities, pop 45, power 302.8666666666667, 15 techs
  - ForgeClans: 2 cities, pop 15, power 25.066666666666666, 8 techs

#### Stalled Game 42 (Large, seed 314014)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 15
- **Final Units:** 31
- **War Declarations:** 27
- **City Captures:** 4
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 91
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 1 techs (ELIMINATED)
  - RiverLeague: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - JadeCovenant: 12 cities, pop 76, power 266.6, 14 techs
  - StarborneSeekers: 2 cities, pop 14, power 34.266666666666666, 5 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 1 cities, pop 9, power 32.06666666666666, 6 techs

#### Stalled Game 43 (Large, seed 317017)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 15
- **Final Units:** 48
- **War Declarations:** 21
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 107
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)
  - RiverLeague: 0 cities, pop 0, power 8, 7 techs
  - JadeCovenant: 9 cities, pop 87, power 339.6, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)
  - AetherianVanguard: 4 cities, pop 32, power 37, 10 techs
  - ForgeClans: 2 cities, pop 18, power 8, 9 techs

#### Stalled Game 44 (Large, seed 315015)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 14
- **Final Units:** 57
- **War Declarations:** 27
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 127
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 16, power 18.066666666666666, 9 techs
  - StarborneSeekers: 1 cities, pop 4, power 4, 5 techs
  - JadeCovenant: 1 cities, pop 11, power 110, 5 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - RiverLeague: 4 cities, pop 33, power 94.86666666666667, 15 techs
  - ForgeClans: 6 cities, pop 54, power 374.79999999999995, 13 techs

#### Stalled Game 45 (Large, seed 321021)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 13
- **Final Units:** 41
- **War Declarations:** 25
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 96
- **Civ Details:**
  - RiverLeague: 1 cities, pop 8, power 32.53333333333333, 10 techs
  - ForgeClans: 1 cities, pop 2, power 0, 0 techs
  - StarborneSeekers: 4 cities, pop 26, power 101.73333333333332, 10 techs
  - AetherianVanguard: 1 cities, pop 9, power 33, 7 techs
  - JadeCovenant: 4 cities, pop 36, power 146.8, 8 techs
  - ScholarKingdoms: 2 cities, pop 14, power 27, 12 techs

#### Stalled Game 46 (Large, seed 323023)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 13
- **Final Units:** 43
- **War Declarations:** 27
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 132
- **Civ Details:**
  - ForgeClans: 5 cities, pop 47, power 185.66666666666666, 12 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - JadeCovenant: 5 cities, pop 45, power 168.86666666666667, 13 techs
  - AetherianVanguard: 1 cities, pop 5, power 8, 5 techs
  - RiverLeague: 1 cities, pop 4, power 27.933333333333334, 6 techs
  - ScholarKingdoms: 1 cities, pop 9, power 21.400000000000002, 10 techs

#### Stalled Game 47 (Large, seed 319019)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 17
- **Final Units:** 53
- **War Declarations:** 18
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 73
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 4, 8 techs
  - JadeCovenant: 16 cities, pop 140, power 389.4666666666667, 15 techs
  - AetherianVanguard: 1 cities, pop 6, power 20.53333333333333, 7 techs
  - ForgeClans: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - ScholarKingdoms: 0 cities, pop 0, power 0, 15 techs (ELIMINATED)

#### Stalled Game 48 (Large, seed 328028)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 12
- **Final Units:** 50
- **War Declarations:** 26
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 90
- **Civ Details:**
  - JadeCovenant: 1 cities, pop 11, power 108.39999999999999, 6 techs
  - StarborneSeekers: 0 cities, pop 0, power 4, 3 techs
  - AetherianVanguard: 2 cities, pop 9, power 86.06666666666668, 7 techs
  - ScholarKingdoms: 2 cities, pop 18, power 4, 12 techs
  - ForgeClans: 5 cities, pop 34, power 217.33333333333334, 13 techs
  - RiverLeague: 2 cities, pop 17, power 92.06666666666666, 9 techs

#### Stalled Game 49 (Large, seed 330030)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 14
- **Final Units:** 46
- **War Declarations:** 36
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 120
- **Civ Details:**
  - ForgeClans: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - JadeCovenant: 6 cities, pop 49, power 211.6, 11 techs
  - AetherianVanguard: 2 cities, pop 17, power 143.26666666666668, 8 techs
  - StarborneSeekers: 3 cities, pop 22, power 47.4, 10 techs
  - ScholarKingdoms: 1 cities, pop 10, power 22, 10 techs
  - RiverLeague: 2 cities, pop 20, power 14.066666666666666, 11 techs

#### Stalled Game 50 (Large, seed 331031)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 15
- **Final Units:** 47
- **War Declarations:** 26
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 97
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 9, power 17.53333333333333, 7 techs
  - ForgeClans: 3 cities, pop 22, power 135.46666666666667, 9 techs
  - JadeCovenant: 1 cities, pop 9, power 99, 5 techs
  - StarborneSeekers: 1 cities, pop 8, power 8, 4 techs
  - ScholarKingdoms: 3 cities, pop 21, power 50, 13 techs
  - RiverLeague: 6 cities, pop 49, power 136.33333333333331, 15 techs

#### Stalled Game 51 (Large, seed 338038)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 15
- **Final Units:** 38
- **War Declarations:** 30
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 107
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - StarborneSeekers: 2 cities, pop 16, power 19, 11 techs
  - RiverLeague: 6 cities, pop 53, power 108.86666666666666, 15 techs
  - JadeCovenant: 5 cities, pop 42, power 236.99999999999997, 14 techs
  - ForgeClans: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 16, power 8, 8 techs

#### Stalled Game 52 (Large, seed 342042)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 13
- **Final Units:** 54
- **War Declarations:** 26
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 85
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - JadeCovenant: 11 cities, pop 90, power 402.93333333333334, 15 techs
  - ForgeClans: 0 cities, pop 0, power 4, 3 techs
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - AetherianVanguard: 1 cities, pop 10, power 32.333333333333336, 9 techs
  - StarborneSeekers: 1 cities, pop 9, power 69.53333333333333, 4 techs

#### Stalled Game 53 (Large, seed 343043)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 13
- **Final Units:** 45
- **War Declarations:** 32
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 144
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 4, 5 techs
  - JadeCovenant: 1 cities, pop 2, power 23.2, 6 techs
  - ForgeClans: 8 cities, pop 65, power 258.3333333333333, 14 techs
  - ScholarKingdoms: 1 cities, pop 10, power 29, 12 techs
  - AetherianVanguard: 2 cities, pop 16, power 81.77333333333334, 11 techs
  - StarborneSeekers: 1 cities, pop 8, power 39.13333333333333, 4 techs

#### Stalled Game 54 (Large, seed 346046)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 13
- **Final Units:** 49
- **War Declarations:** 31
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 98
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 4, 7 techs
  - RiverLeague: 4 cities, pop 36, power 193.33333333333331, 15 techs
  - AetherianVanguard: 2 cities, pop 19, power 50.72, 11 techs
  - JadeCovenant: 2 cities, pop 22, power 157, 8 techs
  - ForgeClans: 3 cities, pop 24, power 93.13333333333333, 13 techs
  - StarborneSeekers: 2 cities, pop 17, power 37.33333333333333, 6 techs

#### Stalled Game 55 (Large, seed 347047)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 12
- **Final Units:** 35
- **War Declarations:** 30
- **City Captures:** 12
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 269
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - JadeCovenant: 3 cities, pop 25, power 131.66666666666666, 12 techs
  - AetherianVanguard: 8 cities, pop 65, power 313.8, 14 techs
  - ForgeClans: 1 cities, pop 2, power 34.06666666666666, 9 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)

#### Stalled Game 56 (Large, seed 348048)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 16
- **Final Units:** 56
- **War Declarations:** 22
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 374
- **Civ Details:**
  - RiverLeague: 5 cities, pop 33, power 218.60000000000002, 15 techs
  - JadeCovenant: 6 cities, pop 43, power 258.26666666666665, 15 techs
  - AetherianVanguard: 2 cities, pop 16, power 8, 9 techs
  - ForgeClans: 1 cities, pop 9, power 0, 6 techs
  - ScholarKingdoms: 2 cities, pop 19, power 27.733333333333334, 12 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)

#### Stalled Game 57 (Large, seed 349049)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 13
- **Final Units:** 60
- **War Declarations:** 24
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 98
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 4, 9 techs
  - StarborneSeekers: 2 cities, pop 18, power 27.8, 11 techs
  - AetherianVanguard: 0 cities, pop 0, power 4, 4 techs
  - ForgeClans: 9 cities, pop 71, power 431.5333333333333, 15 techs
  - RiverLeague: 1 cities, pop 2, power 15.733333333333333, 10 techs
  - JadeCovenant: 1 cities, pop 11, power 95, 6 techs

#### Stalled Game 58 (Large, seed 350050)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 15
- **Final Units:** 50
- **War Declarations:** 27
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 129
- **Civ Details:**
  - RiverLeague: 3 cities, pop 22, power 61.46666666666667, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 1 cities, pop 8, power 10.333333333333334, 8 techs
  - StarborneSeekers: 3 cities, pop 24, power 75.26666666666667, 12 techs
  - AetherianVanguard: 3 cities, pop 22, power 137.70666666666665, 12 techs
  - JadeCovenant: 5 cities, pop 47, power 265.8666666666667, 10 techs

#### Stalled Game 59 (Huge, seed 404004)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 20
- **Final Units:** 96
- **War Declarations:** 24
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 120
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 16, power 4, 9 techs
  - ScholarKingdoms: 2 cities, pop 17, power 14.066666666666666, 12 techs
  - JadeCovenant: 10 cities, pop 84, power 547.4666666666667, 15 techs
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 6 cities, pop 57, power 345.5333333333333, 15 techs

#### Stalled Game 60 (Huge, seed 405005)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 22
- **Final Units:** 78
- **War Declarations:** 24
- **City Captures:** 13
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 440
- **Civ Details:**
  - StarborneSeekers: 1 cities, pop 7, power 4, 10 techs
  - JadeCovenant: 13 cities, pop 119, power 476.3333333333333, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 4, 4 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)
  - RiverLeague: 3 cities, pop 20, power 26, 12 techs
  - ForgeClans: 5 cities, pop 47, power 108.26666666666667, 15 techs

#### Stalled Game 61 (Huge, seed 417017)
- **Turn Reached:** 201
- **Surviving Civs:** 6
- **Final Cities:** 18
- **Final Units:** 71
- **War Declarations:** 28
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 148
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 19, power 146.84, 11 techs
  - ScholarKingdoms: 1 cities, pop 7, power 4, 11 techs
  - JadeCovenant: 9 cities, pop 79, power 279.6666666666667, 15 techs
  - ForgeClans: 4 cities, pop 35, power 117.33333333333331, 15 techs
  - StarborneSeekers: 1 cities, pop 9, power 18.333333333333336, 5 techs
  - RiverLeague: 1 cities, pop 8, power 77.93333333333334, 11 techs

#### Stalled Game 62 (Huge, seed 418018)
- **Turn Reached:** 201
- **Surviving Civs:** 4
- **Final Cities:** 19
- **Final Units:** 43
- **War Declarations:** 24
- **City Captures:** 13
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 247
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)
  - AetherianVanguard: 14 cities, pop 120, power 343.44000000000005, 15 techs
  - JadeCovenant: 0 cities, pop 0, power 118.19999999999999, 11 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - ForgeClans: 1 cities, pop 9, power 45.13333333333333, 15 techs
  - RiverLeague: 4 cities, pop 36, power 63, 15 techs

#### Stalled Game 63 (Huge, seed 412012)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 23
- **Final Units:** 83
- **War Declarations:** 21
- **City Captures:** 12
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 109
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)
  - ForgeClans: 6 cities, pop 31, power 243.93333333333328, 15 techs
  - RiverLeague: 1 cities, pop 5, power 9.8, 13 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - JadeCovenant: 16 cities, pop 144, power 445.93333333333334, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)

#### Stalled Game 64 (Huge, seed 437037)
- **Turn Reached:** 201
- **Surviving Civs:** 3
- **Final Cities:** 23
- **Final Units:** 43
- **War Declarations:** 27
- **City Captures:** 18
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 189
- **Civ Details:**
  - ForgeClans: 4 cities, pop 37, power 108.93333333333334, 15 techs
  - AetherianVanguard: 18 cities, pop 145, power 368.96000000000026, 15 techs
  - JadeCovenant: 1 cities, pop 2, power 80.4, 15 techs
  - RiverLeague: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)

#### Stalled Game 65 (Huge, seed 442042)
- **Turn Reached:** 201
- **Surviving Civs:** 2
- **Final Cities:** 20
- **Final Units:** 42
- **War Declarations:** 24
- **City Captures:** 15
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 695
- **Civ Details:**
  - RiverLeague: 5 cities, pop 49, power 114.19999999999999, 15 techs
  - ForgeClans: 0 cities, pop 0, power 0, 15 techs (ELIMINATED)
  - AetherianVanguard: 15 cities, pop 118, power 515.6000000000001, 15 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - JadeCovenant: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)

#### Stalled Game 66 (Huge, seed 446046)
- **Turn Reached:** 201
- **Surviving Civs:** 5
- **Final Cities:** 21
- **Final Units:** 60
- **War Declarations:** 21
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 462
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)
  - AetherianVanguard: 10 cities, pop 83, power 304.6, 15 techs
  - RiverLeague: 0 cities, pop 0, power 8, 15 techs
  - JadeCovenant: 7 cities, pop 63, power 280.79999999999995, 15 techs
  - ScholarKingdoms: 1 cities, pop 10, power 0, 11 techs
  - ForgeClans: 3 cities, pop 26, power 51.666666666666664, 13 techs

## 10. Map Size Analysis

### Tiny Maps
- **Simulations:** 50
- **Victories:** 42 (84.0%)
  - Conquest: 41, Progress: 1
- **Average Victory Turn:** 29.5
- **Victory Turn Range:** [2, 158]

### Small Maps
- **Simulations:** 50
- **Victories:** 42 (84.0%)
  - Conquest: 42, Progress: 0
- **Average Victory Turn:** 70.6
- **Victory Turn Range:** [2, 199]

### Standard Maps
- **Simulations:** 50
- **Victories:** 32 (64.0%)
  - Conquest: 21, Progress: 11
- **Average Victory Turn:** 147.1
- **Victory Turn Range:** [2, 201]

### Large Maps
- **Simulations:** 50
- **Victories:** 26 (52.0%)
  - Conquest: 13, Progress: 13
- **Average Victory Turn:** 162.7
- **Victory Turn Range:** [2, 201]

### Huge Maps
- **Simulations:** 50
- **Victories:** 42 (84.0%)
  - Conquest: 7, Progress: 35
- **Average Victory Turn:** 176.5
- **Victory Turn Range:** [144, 200]

## 11. Balance Observations

### Victory Timing vs Pop 10
- Average Victory Turn: 111.7
- Average Pop 10 Turn: 162.5
- **Gap:** 50.8 turns (Pop 10 happens AFTER victory)

### Civilization Balance
- Highest Win Rate: AetherianVanguard (27.3%)
- Lowest Win Rate: ScholarKingdoms (11.9%)
- **Win Rate Spread:** 15.3 percentage points

### Settler Survival
- Settlers Produced: 4652
- Settlers Killed: 436
- **Settler Survival Rate:** 90.6%

### Army Unit Usage
- Form Army Projects Completed: 9734
- Army Units in Final States: 23232
- Army Unit Deaths: 4173

