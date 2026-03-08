# Comprehensive Simulation Analysis Report

**Date:** 2026-03-08
**Simulations:** 100 total (Tiny: 20, Small: 20, Standard: 20, Large: 20, Huge: 20) (AI vs AI)
**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)

## Titan Analysis
- **Total Titans Spawned:** 50
- **Average Spawn Turn:** 217.4
- **Median Spawn Turn:** 216
- **Spawn Turn Range:** [111, 450]
- **Average Units on Creation:** 10.0
- **Median Units on Creation:** 10
- **Range:** [2, 20]

---

## 1. Victory Analysis

### Overall Statistics
- **Total Victories:** 92 of 100 (92.0%)
- **Average Victory Turn:** 267.1
- **Median Victory Turn:** 287
- **Victory Turn Range:** [40, 473]

### Victory Types
- **Conquest:** 58 (58.0%)
- **Progress:** 34 (34.0%)
- **None:** 8 (8.0%)

### Victories by Civilization (with Victory Type Breakdown)
- **AetherianVanguard:** 22 wins (31.0% of games played)
  - Conquest: 18, Progress: 4
- **ForgeClans:** 19 wins (25.7% of games played)
  - Conquest: 11, Progress: 8
- **StarborneSeekers:** 18 wins (26.5% of games played)
  - Conquest: 5, Progress: 13
- **RiverLeague:** 13 wins (18.6% of games played)
  - Conquest: 11, Progress: 2
- **ScholarKingdoms:** 11 wins (15.7% of games played)
  - Conquest: 5, Progress: 6
- **JadeCovenant:** 9 wins (13.4% of games played)
  - Conquest: 8, Progress: 1

## 2. Warfare Analysis

### War Statistics
- **Total Unique Wars:** 512
- **Total Peace Treaties:** 353
- **Average Wars per Game:** 5.1

### War Durations
- **Total Wars Tracked:** 512
- **Average Duration:** 97.9 turns
- **Median Duration:** 75 turns
- **Range:** [0, 418] turns

### War Initiation by Civilization
- **ForgeClans:** Initiated 135 (1.8/game), Received 47 (0.6/game)
- **ScholarKingdoms:** Initiated 18 (0.3/game), Received 123 (1.8/game)
- **RiverLeague:** Initiated 104 (1.5/game), Received 78 (1.1/game)
- **AetherianVanguard:** Initiated 84 (1.2/game), Received 86 (1.2/game)
- **StarborneSeekers:** Initiated 87 (1.3/game), Received 96 (1.4/game)
- **JadeCovenant:** Initiated 84 (1.3/game), Received 82 (1.2/game)

### War-to-Win Conversion by Civilization
- **ForgeClans:** 56/204 initiated wars led to captures (27.5%), 0.42 cities per initiated war, 0.07 eliminations per initiated war, 19/38 wins after any capture (50.0%), 6/8 Progress wins after prior captures
- **ScholarKingdoms:** 10/33 initiated wars led to captures (30.3%), 0.48 cities per initiated war, 0.09 eliminations per initiated war, 6/19 wins after any capture (31.6%), 0/6 Progress wins after prior captures
- **RiverLeague:** 34/166 initiated wars led to captures (20.5%), 0.36 cities per initiated war, 0.05 eliminations per initiated war, 13/30 wins after any capture (43.3%), 2/2 Progress wins after prior captures
- **AetherianVanguard:** 40/115 initiated wars led to captures (34.8%), 0.60 cities per initiated war, 0.16 eliminations per initiated war, 22/42 wins after any capture (52.4%), 4/4 Progress wins after prior captures
- **StarborneSeekers:** 17/122 initiated wars led to captures (13.9%), 0.22 cities per initiated war, 0.03 eliminations per initiated war, 8/19 wins after any capture (42.1%), 2/13 Progress wins after prior captures
- **JadeCovenant:** 27/142 initiated wars led to captures (19.0%), 0.27 cities per initiated war, 0.05 eliminations per initiated war, 9/26 wins after any capture (34.6%), 0/1 Progress wins after prior captures

### ForgeClans Conversion Focus
- **Average Declaration Power Ratio:** 2.42
- **Median Turns from Declared War to First Capture:** 42.0
- **Median First Capture Turn:** wins 199.0, losses 208.0
- **Median 25-Turn Capture Burst:** wins 1.0, losses 1.0
- **First-Capture Win Rate:** 14/24 (58.3%)
- **Progress Wins With Prior Captures:** 6/8 (75.0%), avg 1.4 captures before first progress project

## 3. Unit Combat Analysis

### Unit Deaths
- **Total Units Killed:** 12898
- **Average per Game:** 129.0

### Deaths by Unit Type
- **SpearGuard:** 3338 deaths (3270 produced, 3020 of produced died, 7.6% produced survival)
- **BowGuard:** 2268 deaths (2437 produced, 2208 of produced died, 9.4% produced survival)
- **Trebuchet:** 1372 deaths (1722 produced, 1372 of produced died, 20.3% produced survival)
- **ArmyBowGuard:** 1363 deaths (2030 produced, 1363 of produced died, 32.9% produced survival)
- **ArmySpearGuard:** 1006 deaths (1546 produced, 1006 of produced died, 34.9% produced survival)
- **NativeArcher:** 762 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **ArmyRiders:** 553 deaths (826 produced, 553 of produced died, 33.1% produced survival)
- **Scout:** 515 deaths (119 produced, 112 of produced died, 5.9% produced survival)
- **Settler:** 482 deaths (1607 produced, 481 of produced died, 70.1% produced survival)
- **NativeChampion:** 399 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **Lorekeeper:** 383 deaths (748 produced, 383 of produced died, 48.8% produced survival)
- **Landship:** 296 deaths (928 produced, 296 of produced died, 68.1% produced survival)
- **Riders:** 133 deaths (163 produced, 133 of produced died, 18.4% produced survival)
- **Titan:** 28 deaths (50 produced, 28 of produced died, 44.0% produced survival)

### Unit Production by Type
- **SpearGuard:** 3270 produced
- **BowGuard:** 2437 produced
- **ArmyBowGuard:** 2030 produced
- **Trebuchet:** 1722 produced
- **Settler:** 1607 produced
- **ArmySpearGuard:** 1546 produced
- **Landship:** 928 produced
- **ArmyRiders:** 826 produced
- **Lorekeeper:** 748 produced
- **Riders:** 163 produced
- **Scout:** 119 produced
- **Airship:** 103 produced
- **Titan:** 50 produced

## 4. City Growth & Development

### City Statistics
- **Total Cities Founded:** 1717
- **Total Cities Captured:** 469
- **Total Cities Razed:** 37
- **Cities Reaching Pop 10:** 422

### Population Milestones (Average Turn)
- **Pop 3:** 130.6 (1251 cities)
- **Pop 5:** 156.6 (1197 cities)
- **Pop 7:** 184.5 (1111 cities)
- **Pop 10:** 329.6 (422 cities) [Range: 150-473]

### City Activity by Civilization
- **ForgeClans:** Founded 235 (3.2/game), Captured 109, Lost 83
- **ScholarKingdoms:** Founded 238 (3.4/game), Captured 32, Lost 66
- **RiverLeague:** Founded 225 (3.2/game), Captured 83, Lost 88
- **AetherianVanguard:** Founded 219 (3.1/game), Captured 133, Lost 80
- **StarborneSeekers:** Founded 238 (3.5/game), Captured 43, Lost 87
- **JadeCovenant:** Founded 203 (3.0/game), Captured 69, Lost 60

## 5. Technology Progression

### Tech Statistics
- **Total Techs Researched:** 4300
- **Average per Game:** 43.0
- **Total Techs in Tree:** 20

### Tech Tree Completion Rate by Civilization
- **ForgeClans:** 52.0% average tree completion
- **ScholarKingdoms:** 52.1% average tree completion
- **RiverLeague:** 46.8% average tree completion
- **AetherianVanguard:** 52.7% average tree completion
- **StarborneSeekers:** 59.7% average tree completion
- **JadeCovenant:** 45.2% average tree completion

### Tech Timing (Average Turn Researched)
- **ScriptLore:** Turn 54.1
- **Fieldcraft:** Turn 68.2
- **FormationTraining:** Turn 82.8
- **StoneworkHalls:** Turn 91.6
- **DrilledRanks:** Turn 132.6
- **Wellworks:** Turn 162.1
- **ScholarCourts:** Turn 177.1
- **ArmyDoctrine:** Turn 190.5
- **TimberMills:** Turn 196.8
- **CityWards:** Turn 219.9
- **SignalRelay:** Turn 232.8
- **CompositeArmor:** Turn 240.2
- **StarCharts:** Turn 252.5
- **SteamForges:** Turn 252.6
- **UrbanPlans:** Turn 265.6
- **TrailMaps:** Turn 274.4
- **PlasmaShields:** Turn 279.4
- **ZeroPointEnergy:** Turn 292.4
- **Aerodynamics:** Turn 312.6
- **DimensionalGate:** Turn 334.1

## 6. Project Completion

### Project Statistics
- **Total Projects Completed:** 384
- **Average per Game:** 3.8

### Project Breakdown
- **Progress Chain (Observatory/Academy/Experiment):** 217
- **Unique Building Markers:** 167

### Progress Chain Timing
- **Observatory:** 113 completions, avg turn 288.0
- **GrandAcademy:** 70 completions, avg turn 327.6
- **GrandExperiment:** 34 completions, avg turn 357.8

### Army Unit Production
- **ArmySpearGuard:** 1546 produced, 1006 killed (34.9% survival)
- **ArmyBowGuard:** 2030 produced, 1363 killed (32.9% survival)
- **ArmyRiders:** 826 produced, 553 killed (33.1% survival)
- **Total Army Units:** 4402 produced, 2922 killed

## 7. Building Construction

### Buildings by Type
- **TradingPost:** 1136 built (avg turn 139.2)
- **MarketHall:** 747 built (avg turn 212.0)
- **Bank:** 256 built (avg turn 285.6)
- **Exchange:** 165 built (avg turn 308.9)
- **Bulwark:** 117 built (avg turn 76.9)
- **ShieldGenerator:** 44 built (avg turn 281.8)

## 8. Civilization Performance

### Win Rates & Statistics

#### AetherianVanguard
- **Games Played:** 71
- **Wins:** 22 (31.0% win rate)
  - Conquest: 18, Progress: 4
- **Eliminations:** 10
- **Avg Cities:** 3.7
- **Avg Population:** 29.2
- **Avg Techs:** 10.5
- **Avg Projects:** 1.1
- **Avg Military Power:** 120.3

#### ForgeClans
- **Games Played:** 74
- **Wins:** 19 (25.7% win rate)
  - Conquest: 11, Progress: 8
- **Eliminations:** 13
- **Avg Cities:** 3.4
- **Avg Population:** 28.9
- **Avg Techs:** 10.4
- **Avg Projects:** 0.5
- **Avg Military Power:** 156.7

#### StarborneSeekers
- **Games Played:** 68
- **Wins:** 18 (26.5% win rate)
  - Conquest: 5, Progress: 13
- **Eliminations:** 11
- **Avg Cities:** 2.8
- **Avg Population:** 22.8
- **Avg Techs:** 11.9
- **Avg Projects:** 1.8
- **Avg Military Power:** 84.4

#### RiverLeague
- **Games Played:** 70
- **Wins:** 13 (18.6% win rate)
  - Conquest: 11, Progress: 2
- **Eliminations:** 15
- **Avg Cities:** 3.0
- **Avg Population:** 26.2
- **Avg Techs:** 9.2
- **Avg Projects:** 0.3
- **Avg Military Power:** 123.0

#### ScholarKingdoms
- **Games Played:** 70
- **Wins:** 11 (15.7% win rate)
  - Conquest: 5, Progress: 6
- **Eliminations:** 14
- **Avg Cities:** 2.8
- **Avg Population:** 23.4
- **Avg Techs:** 10.3
- **Avg Projects:** 1.3
- **Avg Military Power:** 97.0

#### JadeCovenant
- **Games Played:** 67
- **Wins:** 9 (13.4% win rate)
  - Conquest: 8, Progress: 1
- **Eliminations:** 10
- **Avg Cities:** 3.1
- **Avg Population:** 27.0
- **Avg Techs:** 9.0
- **Avg Projects:** 0.3
- **Avg Military Power:** 131.4

## 9. City-State Systems

### Telemetry Coverage
- **Simulations with City-State Telemetry:** 100/100
- **Simulations Missing City-State Telemetry:** 0
- **Total City-States Created:** 359
- **Average City-States Created per Telemetry Sim:** 3.59
- **Average Surviving City-States at Game End (Telemetry Sims):** 3.53

### Activation & Turnover
- **Total City-State Active Turns:** 47194
- **First City-State Creation Turn (min / p25 / median / p75 / max):** 70 / 100 / 135 / 166 / 320
- **First City-State Creation Turn (average, sims with any):** 140.7
- **Global Suzerainty Flip Rate:** 0.48 per 100 active turns
- **True Ownership Turnover Rate:** 0.48 per 100 active turns
- **Average Unique Suzerains per City-State:** 1.20
- **Total Contested Turns:** 441 (No Suz: 5, Close-race: 436)
- **Contested Share of Active Turns:** 0.93%
- **Turnover-Window Turns:** 26545 (56.25% of active turns)
- **Flip-Window Turns:** 25651 (54.35% of active turns)
- **Safe-Lead Incumbent Turns:** 23335 (49.44% of active turns)
- **Hotspot Turns:** 642 (1.36% of active turns)
- **Passive Contestation Pulses:** 14340
- **Passive Contestation Close-Race Pulses:** 11307
- **City-States with Zero Suzerainty Flips:** 292/359
- **Contested-but-Zero-Flip City-States:** 93/359
- **Top 4 City-States Share of True Ownership Turnovers:** 24.8%
- **True Ownership Turnover Rate Outside Top 4 Turnover City-States:** 0.37 per 100 active turns
- **Top Turnover City-States:** Moonmeadow [Large 312012] (21 ownership, 21 total), Radiant Lexicon [Large 312012] (13 ownership, 13 total), Ashen Bellows [Huge 416016] (12 ownership, 12 total), Nectarwind [Standard 218018] (10 ownership, 10 total)

### Camp-Clearing Activation Funnel
- **Camp-Clearing Episodes:** 4582
- **Direct Starts in Ready:** 1863 (40.7%)
- **Episodes Reaching Ready:** 2797 (61.0%)
- **Episodes with Sighting Telemetry:** 2419 (52.8%)
- **Sighted -> Prep Start (avg / median):** 108.37 / 83 turns
- **Prep Start -> Ready (avg / median):** 2.74 / 0 turns
- **Prep Start -> Self Clear (avg / median):** 12.85 / 10 turns
- **Total Prep Duration (avg / median):** 7.70 / 1 turns
- **Timeouts After Ready:** 141 (16.9% of timeouts)
- **Ready Turn Diagnostics:** no contact 5691, adjacent contact 808, attack opportunity 2525, stalled opportunity 1407, power disadvantage 1834, progress 1526
- **Ready-Timeout Primary Breakdown:** no contact 77, declined attack 44, power collapse 20, other 0
- **War-Interrupted Episodes:** 1216 (26.5%)
- **Cleared-By-Other Breakdown:** lacked military 32, late start 73, other 38
- **Episode Outcomes:** ClearedBySelf 337, ClearedByOther 143, TimedOut 835, WartimeEmergencyCancelled 1216, OtherCancelled 1984, StillActive 67
- **Readiness Breakdown:** PreArmy 9/1105 clears, 442 timeouts, ArmyTech 112/2163 clears, 249 timeouts, ArmyFielded 216/1314 clears, 144 timeouts

### Investment Mix
- **Total City-State Investment:** 1059547G across 14504 actions
- **Maintenance Investment:** 218656G (20.6%) across 5905 actions (40.7%)
- **Challenger Investment:** 840891G (79.4%) across 8599 actions (59.3%)
- **Maintenance Gold per Suzerainty Turn:** 4.63
- **Maintenance Actions per 100 Suzerainty Turns:** 12.51

### Turnover Diagnostics
- **Turnover-Window Challenger Investment:** 818109G across 8072 actions
- **Flip-Window Challenger Investment:** 805829G across 7911 actions
- **Deep-Challenge Investment:** 22782G across 527 actions
- **Neutral-Claim Investment:** 0G across 0 actions
- **Passive Openings Observed:** 1
- **Passive Openings with Treasury to Invest:** 1 (100.0%)
- **Passive Openings with Reserve-Safe Invest:** 0 (0.0%)
- **Passive Opening Avg Nominated Turn-Order Delay:** 1.00 turns
- **Passive Openings Attempted by Nominated Challenger:** 0 (0.0%)
- **Passive Opening Avg Delay to First Nominated Attempt:** 0.00 turns
- **Passive Openings Resolved Before Expiry:** 0 (0.0%)
- **Passive Openings Won by Nominated Challenger:** 0 (0.0% of openings, 0.0% of resolved)
- **Passive Openings Lost to Someone Else:** 0
- **Passive Openings Expired Unresolved:** 1
- **Passive Opening Resolutions by Cause:** none
- **Passive Opening Nominated Wins by Cause:** none
- **Passive Openings with No Nominated Attempt:** 1 (100.0%)
- **No-Attempt Reasons:** Treasury blocked 0, Reserve blocked 1, No-attempt despite capacity 0
- **Passive Direct Flip Conversion per 100 Close-Race Pulses:** 0.00
- **Passive-Assisted Suzerainty Changes:** 47 (20.7% of non-passive changes)
- **Passive-Assisted True Ownership Turnovers:** 47 (20.8% of ownership turnover)
- **Passive-Assisted Ownership Conversion per 100 Close-Race Pulses:** 0.42
- **Passive-Involved Ownership Conversion per 100 Close-Race Pulses:** 0.42
- **Passive-Assisted Ownership Causes:** WartimeRelease 43, Other 4
- **Pair-Fatigue-Triggered Investment:** 40226G across 508 actions
- **Pair-Fatigue Share of Challenger Spend:** 4.8%
- **Safe-Maintenance Investment:** 0G across 0 actions
- **Focus Turns:** 32403 (challenge 26261, maintenance 6142)
- **Focus Assignments / Switches:** 708 / 78
- **Flip Conversion per 100 Turnover-Window Turns:** 0.86
- **True Ownership Conversion per 100 Turnover-Window Turns:** 0.85
- **Safe-Maintenance Share of Maintenance Spend:** 0.0%

### Flip Cause Summary
- **Investment:** 128 suzerainty changes, 128 true ownership turnovers (56.6% of ownership turnover)
- **PassiveContestation:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **WartimeRelease:** 45 suzerainty changes, 45 true ownership turnovers (19.9% of ownership turnover)
- **WarBreak:** 1 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **Other:** 53 suzerainty changes, 53 true ownership turnovers (23.5% of ownership turnover)

### Hotspot Diagnostics
- **Hotspot Share of Active Turns:** 1.36%
- **City-State Instances with Any Hotspot Time:** 19/359
- **True Ownership Turnovers Occurring in Hotspot Instances:** 158/226
- **Flip Causes:** Investment 128, WartimeRelease 45, WarBreak 1, Other 53
- **Ownership Causes:** Investment 128, WartimeRelease 45, Other 53
- **Top Hotspot Instances:** Moonmeadow [Large 312012] (21 ownership, hotspot 30.1%, fatigue 6127G/40, ScholarKingdoms <> JadeCovenant 21); Radiant Lexicon [Large 312012] (13 ownership, hotspot 58.8%, fatigue 4016G/40, ScholarKingdoms <> RiverLeague 13); Ashen Bellows [Huge 416016] (12 ownership, hotspot 47.2%, fatigue 1772G/26, AetherianVanguard <> ForgeClans 12); Nectarwind [Standard 218018] (10 ownership, hotspot 25.6%, fatigue 640G/10, RiverLeague <> ScholarKingdoms 10); Starglass Athenaeum [Huge 420020] (10 ownership, hotspot 17.8%, fatigue 1955G/28, ForgeClans <> JadeCovenant 10); Saffron Treasury [Huge 411011] (10 ownership, hotspot 14.0%, fatigue 731G/9, ForgeClans <> ScholarKingdoms 10)

### Map-Size City-State Activation
- **Tiny:** 13/20 sims with >=1 city-state (65.0%), avg created 1.00, avg first CS turn 150.5
- **Small:** 14/20 sims with >=1 city-state (70.0%), avg created 1.25, avg first CS turn 145.1
- **Standard:** 20/20 sims with >=1 city-state (100.0%), avg created 3.30, avg first CS turn 127.7
- **Large:** 19/20 sims with >=1 city-state (95.0%), avg created 5.75, avg first CS turn 131.3
- **Huge:** 20/20 sims with >=1 city-state (100.0%), avg created 6.65, avg first CS turn 153.4

### Yield-Type Turnover Summary
- **Science:** 88 city-states, contested 0.95% (No Suz 0.00%, Close-race 0.95%), turnover window 62.65%, flip window 60.68%, safe lead 42.97%, hotspot 1.39%, flip rate 0.57/100T, ownership turnover 0.57/100T, avg unique suzerains 1.19
- **Production:** 90 city-states, contested 0.88% (No Suz 0.00%, Close-race 0.88%), turnover window 53.01%, flip window 51.28%, safe lead 52.21%, hotspot 1.45%, flip rate 0.46/100T, ownership turnover 0.46/100T, avg unique suzerains 1.22
- **Food:** 91 city-states, contested 0.88% (No Suz 0.04%, Close-race 0.84%), turnover window 55.30%, flip window 53.62%, safe lead 49.92%, hotspot 1.39%, flip rate 0.48/100T, ownership turnover 0.48/100T, avg unique suzerains 1.19
- **Gold:** 90 city-states, contested 1.02% (No Suz 0.00%, Close-race 1.02%), turnover window 53.99%, flip window 51.79%, safe lead 52.74%, hotspot 1.20%, flip rate 0.40/100T, ownership turnover 0.40/100T, avg unique suzerains 1.20

### Suzerainty vs Winning (Directional)
- **Winner Average Suzerainty Turns:** 170.50
- **Non-Winner Average Suzerainty Turns:** 96.05
- **Winners with Any Suzerainty:** 67/92 (72.8%)
- **Participant Win Rate with Any Suzerainty:** 28.2%
- **Participant Win Rate without Suzerainty:** 13.7%

## 10. Stalls & Issues

### Games Without Victory
- **Count:** 8 of 100 (8.0%)

### Stall Diagnostics

#### Stalled Game 1 (Tiny, seed 14014)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 16
- **War Declarations:** 3
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 12
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 29, power 109.46666666666667, 18 techs
  - RiverLeague: 1 cities, pop 10, power 76.4, 6 techs

#### Stalled Game 2 (Tiny, seed 17017)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 7
- **Final Units:** 18
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 29
- **Civ Details:**
  - JadeCovenant: 3 cities, pop 31, power 193.46666666666667, 14 techs
  - ForgeClans: 2 cities, pop 17, power 99, 7 techs

#### Stalled Game 3 (Small, seed 116016)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 13
- **Final Units:** 36
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 37
- **Civ Details:**
  - JadeCovenant: 6 cities, pop 49, power 279.9866666666667, 13 techs
  - ScholarKingdoms: 2 cities, pop 14, power 63.266666666666666, 9 techs
  - StarborneSeekers: 3 cities, pop 21, power 69.33333333333334, 11 techs

#### Stalled Game 4 (Standard, seed 207007)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 15
- **Final Units:** 43
- **War Declarations:** 6
- **City Captures:** 12
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 51
- **Civ Details:**
  - RiverLeague: 6 cities, pop 55, power 342.33333333333337, 20 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - ForgeClans: 6 cities, pop 58, power 271, 17 techs

#### Stalled Game 5 (Standard, seed 208008)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 12
- **Final Units:** 33
- **War Declarations:** 7
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 45
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 16 techs (ELIMINATED)
  - JadeCovenant: 6 cities, pop 60, power 207, 19 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)
  - ForgeClans: 4 cities, pop 39, power 238.66666666666669, 12 techs

#### Stalled Game 6 (Standard, seed 206006)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 18
- **Final Units:** 82
- **War Declarations:** 7
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 68
- **Civ Details:**
  - JadeCovenant: 7 cities, pop 69, power 285.4666666666667, 20 techs
  - RiverLeague: 1 cities, pop 9, power 18, 6 techs
  - ScholarKingdoms: 7 cities, pop 67, power 793.2000000000002, 20 techs
  - StarborneSeekers: 1 cities, pop 10, power 33, 7 techs

#### Stalled Game 7 (Large, seed 320020)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 19
- **Final Units:** 63
- **War Declarations:** 22
- **City Captures:** 13
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 113
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - RiverLeague: 1 cities, pop 11, power 59.266666666666666, 8 techs
  - JadeCovenant: 4 cities, pop 39, power 202, 20 techs
  - StarborneSeekers: 2 cities, pop 20, power 75.2, 7 techs
  - ForgeClans: 7 cities, pop 71, power 347.8933333333333, 20 techs
  - ScholarKingdoms: 2 cities, pop 19, power 76, 20 techs

#### Stalled Game 8 (Huge, seed 403003)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 22
- **Final Units:** 94
- **War Declarations:** 6
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 71
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 11, power 175.33333333333334, 9 techs
  - RiverLeague: 2 cities, pop 21, power 75, 7 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - JadeCovenant: 4 cities, pop 36, power 182.73333333333332, 10 techs
  - ScholarKingdoms: 4 cities, pop 38, power 139.4, 20 techs
  - ForgeClans: 5 cities, pop 48, power 493.3333333333333, 19 techs

## 11. Map Size Analysis

### Tiny Maps
- **Simulations:** 20
- **Victories:** 18 (90.0%)
  - Conquest: 18, Progress: 0
- **Average Victory Turn:** 171.4
- **Victory Turn Range:** [40, 281]

### Small Maps
- **Simulations:** 20
- **Victories:** 19 (95.0%)
  - Conquest: 18, Progress: 1
- **Average Victory Turn:** 191.5
- **Victory Turn Range:** [42, 365]

### Standard Maps
- **Simulations:** 20
- **Victories:** 17 (85.0%)
  - Conquest: 9, Progress: 8
- **Average Victory Turn:** 292.8
- **Victory Turn Range:** [174, 399]

### Large Maps
- **Simulations:** 20
- **Victories:** 19 (95.0%)
  - Conquest: 6, Progress: 13
- **Average Victory Turn:** 325.5
- **Victory Turn Range:** [160, 447]

### Huge Maps
- **Simulations:** 20
- **Victories:** 19 (95.0%)
  - Conquest: 7, Progress: 12
- **Average Victory Turn:** 352.0
- **Victory Turn Range:** [171, 473]

## 12. Balance Observations

### Victory Timing vs Pop 10
- Average Victory Turn: 267.1
- Average Pop 10 Turn: 329.6
- **Gap:** 62.5 turns (Pop 10 happens AFTER victory)

### Civilization Balance
- Highest Win Rate: AetherianVanguard (31.0%)
- Lowest Win Rate: JadeCovenant (13.4%)
- **Win Rate Spread:** 17.6 percentage points

### Settler Survival
- Settlers Produced: 1607
- Settlers Killed: 482
- **Settler Survival Rate:** 70.0%

