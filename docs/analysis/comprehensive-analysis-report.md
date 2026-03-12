# Comprehensive Simulation Analysis Report

**Date:** 2026-03-12
**Simulations:** 600 total (Tiny: 120, Small: 120, Standard: 120, Large: 120, Huge: 120) (AI vs AI)
**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)

## Titan Analysis
- **Total Titans Spawned:** 222
- **Average Spawn Turn:** 208.0
- **Median Spawn Turn:** 203
- **Spawn Turn Range:** [92, 440]
- **Average Units on Creation:** 12.7
- **Median Units on Creation:** 12
- **Range:** [4, 30]

---

## 1. Victory Analysis

### Overall Statistics
- **Total Victories:** 540 of 600 (90.0%)
- **Average Victory Turn:** 293.4
- **Median Victory Turn:** 317
- **Victory Turn Range:** [29, 491]

### Victory Types
- **Conquest:** 299 (49.8%)
- **Progress:** 241 (40.2%)
- **None:** 60 (10.0%)

### Victories by Civilization (with Victory Type Breakdown)
- **AetherianVanguard:** 110 wins (25.8% of games played)
  - Conquest: 89, Progress: 21
- **ScholarKingdoms:** 103 wins (24.4% of games played)
  - Conquest: 31, Progress: 72
- **RiverLeague:** 90 wins (21.5% of games played)
  - Conquest: 54, Progress: 36
- **ForgeClans:** 89 wins (21.4% of games played)
  - Conquest: 53, Progress: 36
- **StarborneSeekers:** 80 wins (19.0% of games played)
  - Conquest: 25, Progress: 55
- **JadeCovenant:** 68 wins (16.3% of games played)
  - Conquest: 47, Progress: 21

## 2. Warfare Analysis

### War Statistics
- **Total Unique Wars:** 3277
- **Total Peace Treaties:** 3032
- **Average Wars per Game:** 5.5

### War Durations
- **Total Wars Tracked:** 3277
- **Average Duration:** 105.4 turns
- **Median Duration:** 78 turns
- **Range:** [0, 463] turns

### War Initiation by Civilization
- **ForgeClans:** Initiated 811 (2.0/game), Received 343 (0.8/game)
- **ScholarKingdoms:** Initiated 147 (0.3/game), Received 834 (2.0/game)
- **RiverLeague:** Initiated 728 (1.7/game), Received 421 (1.0/game)
- **AetherianVanguard:** Initiated 546 (1.3/game), Received 517 (1.2/game)
- **StarborneSeekers:** Initiated 442 (1.0/game), Received 649 (1.5/game)
- **JadeCovenant:** Initiated 603 (1.4/game), Received 513 (1.2/game)

### War-to-Win Conversion by Civilization
- **ForgeClans:** 294/1464 initiated wars led to captures (20.1%), 0.31 cities per initiated war, 0.06 eliminations per initiated war, 87/220 wins after any capture (39.5%), 32/36 Progress wins after prior captures
- **ScholarKingdoms:** 63/231 initiated wars led to captures (27.3%), 0.38 cities per initiated war, 0.09 eliminations per initiated war, 56/141 wins after any capture (39.7%), 16/72 Progress wins after prior captures
- **RiverLeague:** 264/1293 initiated wars led to captures (20.4%), 0.34 cities per initiated war, 0.05 eliminations per initiated war, 88/218 wins after any capture (40.4%), 33/36 Progress wins after prior captures
- **AetherianVanguard:** 281/772 initiated wars led to captures (36.4%), 0.70 cities per initiated war, 0.11 eliminations per initiated war, 109/238 wins after any capture (45.8%), 16/21 Progress wins after prior captures
- **StarborneSeekers:** 130/745 initiated wars led to captures (17.4%), 0.23 cities per initiated war, 0.04 eliminations per initiated war, 53/147 wins after any capture (36.1%), 16/55 Progress wins after prior captures
- **JadeCovenant:** 219/1116 initiated wars led to captures (19.6%), 0.32 cities per initiated war, 0.06 eliminations per initiated war, 63/197 wins after any capture (32.0%), 13/21 Progress wins after prior captures

### ForgeClans Conversion Focus
- **Average Declaration Power Ratio:** 2.34
- **Median Turns from Declared War to First Capture:** 33.0
- **Median First Capture Turn:** wins 184.0, losses 214.0
- **Median 25-Turn Capture Burst:** wins 1.0, losses 1.0
- **First-Capture Win Rate:** 63/108 (58.3%)
- **Progress Wins With Prior Captures:** 32/36 (88.9%), avg 2.2 captures before first progress project

## 3. Unit Combat Analysis

### Unit Deaths
- **Total Units Killed:** 81539
- **Average per Game:** 135.9

### Deaths by Unit Type
- **SpearGuard:** 18457 deaths (17802 produced, 16499 of produced died, 7.3% produced survival)
- **BowGuard:** 15176 deaths (16174 produced, 14847 of produced died, 8.2% produced survival)
- **Trebuchet:** 9135 deaths (11437 produced, 9135 of produced died, 20.1% produced survival)
- **ArmyBowGuard:** 8859 deaths (13430 produced, 8859 of produced died, 34.0% produced survival)
- **ArmySpearGuard:** 6426 deaths (9994 produced, 6426 of produced died, 35.7% produced survival)
- **NativeArcher:** 4969 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **ArmyRiders:** 4009 deaths (5902 produced, 4009 of produced died, 32.1% produced survival)
- **Lorekeeper:** 3178 deaths (5882 produced, 3178 of produced died, 46.0% produced survival)
- **Scout:** 3156 deaths (754 produced, 707 of produced died, 6.2% produced survival)
- **NativeChampion:** 2498 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **Settler:** 2422 deaths (10039 produced, 2404 of produced died, 76.1% produced survival)
- **Landship:** 2123 deaths (6813 produced, 2123 of produced died, 68.8% produced survival)
- **Riders:** 989 deaths (1193 produced, 989 of produced died, 17.1% produced survival)
- **Titan:** 132 deaths (222 produced, 132 of produced died, 40.5% produced survival)
- **Airship:** 10 deaths (673 produced, 10 of produced died, 98.5% produced survival)

### Unit Production by Type
- **SpearGuard:** 17802 produced
- **BowGuard:** 16174 produced
- **ArmyBowGuard:** 13430 produced
- **Trebuchet:** 11437 produced
- **Settler:** 10039 produced
- **ArmySpearGuard:** 9994 produced
- **Landship:** 6813 produced
- **ArmyRiders:** 5902 produced
- **Lorekeeper:** 5882 produced
- **Riders:** 1193 produced
- **Scout:** 754 produced
- **Airship:** 673 produced
- **Titan:** 222 produced

## 4. City Growth & Development

### City Statistics
- **Total Cities Founded:** 11451
- **Total Cities Captured:** 3245
- **Total Cities Razed:** 261
- **Cities Reaching Pop 10:** 3377

### Population Milestones (Average Turn)
- **Pop 3:** 130.1 (8478 cities)
- **Pop 5:** 155.7 (8202 cities)
- **Pop 7:** 185.4 (7665 cities)
- **Pop 10:** 338.0 (3377 cities) [Range: 125-491]

### City Activity by Civilization
- **ForgeClans:** Founded 1406 (3.4/game), Captured 666, Lost 486
- **ScholarKingdoms:** Founded 1896 (4.5/game), Captured 269, Lost 514
- **RiverLeague:** Founded 1428 (3.4/game), Captured 599, Lost 549
- **AetherianVanguard:** Founded 1526 (3.6/game), Captured 839, Lost 619
- **StarborneSeekers:** Founded 1377 (3.3/game), Captured 300, Lost 566
- **JadeCovenant:** Founded 1494 (3.6/game), Captured 572, Lost 484

## 5. Technology Progression

### Tech Statistics
- **Total Techs Researched:** 28817
- **Average per Game:** 48.0
- **Total Techs in Tree:** 20

### Tech Tree Completion Rate by Civilization
- **ForgeClans:** 57.2% average tree completion
- **ScholarKingdoms:** 65.7% average tree completion
- **RiverLeague:** 52.9% average tree completion
- **AetherianVanguard:** 57.3% average tree completion
- **StarborneSeekers:** 59.0% average tree completion
- **JadeCovenant:** 55.0% average tree completion

### Tech Timing (Average Turn Researched)
- **ScriptLore:** Turn 50.8
- **Fieldcraft:** Turn 65.9
- **FormationTraining:** Turn 75.6
- **StoneworkHalls:** Turn 96.1
- **DrilledRanks:** Turn 120.4
- **Wellworks:** Turn 164.2
- **ScholarCourts:** Turn 183.3
- **ArmyDoctrine:** Turn 183.3
- **TimberMills:** Turn 202.2
- **CityWards:** Turn 220.5
- **SignalRelay:** Turn 231.7
- **CompositeArmor:** Turn 232.7
- **StarCharts:** Turn 253.3
- **SteamForges:** Turn 257.5
- **UrbanPlans:** Turn 259.8
- **TrailMaps:** Turn 272.9
- **PlasmaShields:** Turn 283.2
- **ZeroPointEnergy:** Turn 290.7
- **Aerodynamics:** Turn 307.0
- **DimensionalGate:** Turn 322.4

## 6. Project Completion

### Project Statistics
- **Total Projects Completed:** 2454
- **Average per Game:** 4.1

### Project Breakdown
- **Progress Chain (Observatory/Academy/Experiment):** 1525
- **Unique Building Markers:** 929

### Progress Chain Timing
- **Observatory:** 780 completions, avg turn 293.9
- **GrandAcademy:** 502 completions, avg turn 334.0
- **GrandExperiment:** 243 completions, avg turn 371.8

### Army Unit Production
- **ArmySpearGuard:** 9994 produced, 6426 killed (35.7% survival)
- **ArmyBowGuard:** 13430 produced, 8859 killed (34.0% survival)
- **ArmyRiders:** 5902 produced, 4009 killed (32.1% survival)
- **Total Army Units:** 29326 produced, 19294 killed

## 7. Building Construction

### Buildings by Type
- **TradingPost:** 8003 built (avg turn 141.4)
- **MarketHall:** 6170 built (avg turn 218.1)
- **Bank:** 1661 built (avg turn 293.5)
- **Exchange:** 893 built (avg turn 318.2)
- **Bulwark:** 707 built (avg turn 76.2)
- **ShieldGenerator:** 297 built (avg turn 282.5)

## 8. Civilization Performance

### Win Rates & Statistics

#### AetherianVanguard
- **Games Played:** 426
- **Wins:** 110 (25.8% win rate)
  - Conquest: 89, Progress: 21
- **Eliminations:** 92
- **Avg Cities:** 4.0
- **Avg Population:** 33.6
- **Avg Techs:** 11.4
- **Avg Projects:** 0.9
- **Avg Military Power:** 136.7

#### ScholarKingdoms
- **Games Played:** 422
- **Wins:** 103 (24.4% win rate)
  - Conquest: 31, Progress: 72
- **Eliminations:** 68
- **Avg Cities:** 3.8
- **Avg Population:** 32.7
- **Avg Techs:** 13.0
- **Avg Projects:** 1.8
- **Avg Military Power:** 129.9

#### RiverLeague
- **Games Played:** 419
- **Wins:** 90 (21.5% win rate)
  - Conquest: 54, Progress: 36
- **Eliminations:** 74
- **Avg Cities:** 3.4
- **Avg Population:** 30.7
- **Avg Techs:** 10.4
- **Avg Projects:** 0.5
- **Avg Military Power:** 148.6

#### ForgeClans
- **Games Played:** 415
- **Wins:** 89 (21.4% win rate)
  - Conquest: 53, Progress: 36
- **Eliminations:** 58
- **Avg Cities:** 3.8
- **Avg Population:** 33.4
- **Avg Techs:** 11.2
- **Avg Projects:** 0.5
- **Avg Military Power:** 166.5

#### StarborneSeekers
- **Games Played:** 421
- **Wins:** 80 (19.0% win rate)
  - Conquest: 25, Progress: 55
- **Eliminations:** 107
- **Avg Cities:** 2.5
- **Avg Population:** 22.0
- **Avg Techs:** 11.7
- **Avg Projects:** 1.6
- **Avg Military Power:** 80.9

#### JadeCovenant
- **Games Played:** 417
- **Wins:** 68 (16.3% win rate)
  - Conquest: 47, Progress: 21
- **Eliminations:** 61
- **Avg Cities:** 3.7
- **Avg Population:** 33.1
- **Avg Techs:** 10.9
- **Avg Projects:** 0.5
- **Avg Military Power:** 158.0

## 9. City-State Systems

### Telemetry Coverage
- **Simulations with City-State Telemetry:** 600/600
- **Simulations Missing City-State Telemetry:** 0
- **Total City-States Created:** 2324
- **Average City-States Created per Telemetry Sim:** 3.87
- **Average Surviving City-States at Game End (Telemetry Sims):** 3.82

### Activation & Turnover
- **Total City-State Active Turns:** 363892
- **First City-State Creation Turn (min / p25 / median / p75 / max):** 35 / 91 / 114 / 146 / 401
- **First City-State Creation Turn (average, sims with any):** 124.9
- **Global Suzerainty Flip Rate:** 0.34 per 100 active turns
- **True Ownership Turnover Rate:** 0.33 per 100 active turns
- **Average Unique Suzerains per City-State:** 1.26
- **Total Contested Turns:** 2846 (No Suz: 66, Close-race: 2780)
- **Contested Share of Active Turns:** 0.78%
- **Turnover-Window Turns:** 223181 (61.33% of active turns)
- **Flip-Window Turns:** 216841 (59.59% of active turns)
- **Safe-Lead Incumbent Turns:** 159556 (43.85% of active turns)
- **Hotspot Turns:** 2593 (0.71% of active turns)
- **Passive Contestation Pulses:** 121982
- **Passive Contestation Close-Race Pulses:** 98472
- **City-States with Zero Suzerainty Flips:** 1762/2324
- **Contested-but-Zero-Flip City-States:** 642/2324
- **Top 4 City-States Share of True Ownership Turnovers:** 7.2%
- **True Ownership Turnover Rate Outside Top 4 Turnover City-States:** 0.31 per 100 active turns
- **Top Turnover City-States:** Voidlight Archive [Huge 503103] (34 ownership, 34 total), Embermint [Huge 411011] (19 ownership, 19 total), Brassmoon Mint [Huge 494094] (18 ownership, 18 total), Aetherquill [Huge 432032] (17 ownership, 17 total)

### Camp-Clearing Activation Funnel
- **Camp-Clearing Episodes:** 24931
- **Direct Starts in Ready:** 9941 (39.9%)
- **Episodes Reaching Ready:** 15179 (60.9%)
- **Episodes with Sighting Telemetry:** 13588 (54.5%)
- **Sighted -> Prep Start (avg / median):** 100.82 / 83 turns
- **Prep Start -> Ready (avg / median):** 2.80 / 0 turns
- **Prep Start -> Self Clear (avg / median):** 13.65 / 9 turns
- **Total Prep Duration (avg / median):** 8.17 / 1 turns
- **Timeouts After Ready:** 837 (19.1% of timeouts)
- **Ready Turn Diagnostics:** no contact 32166, adjacent contact 4929, attack opportunity 15839, stalled opportunity 8647, power disadvantage 9993, progress 9650
- **Ready-Timeout Primary Breakdown:** no contact 505, declined attack 204, power collapse 128, other 0
- **War-Interrupted Episodes:** 6826 (27.4%)
- **Cleared-By-Other Breakdown:** lacked military 206, late start 421, other 279
- **Episode Outcomes:** ClearedBySelf 2195, ClearedByOther 906, TimedOut 4376, WartimeEmergencyCancelled 6826, OtherCancelled 10270, StillActive 358
- **Readiness Breakdown:** PreArmy 82/4871 clears, 2028 timeouts, ArmyTech 822/12454 clears, 1556 timeouts, ArmyFielded 1291/7606 clears, 792 timeouts

### Investment Mix
- **Total City-State Investment:** 8175094G across 113035 actions
- **Maintenance Investment:** 1750891G (21.4%) across 47158 actions (41.7%)
- **Challenger Investment:** 6424203G (78.6%) across 65877 actions (58.3%)
- **Maintenance Gold per Suzerainty Turn:** 4.81
- **Maintenance Actions per 100 Suzerainty Turns:** 12.96

### Turnover Diagnostics
- **Turnover-Window Challenger Investment:** 6176022G across 61675 actions
- **Flip-Window Challenger Investment:** 6095458G across 60792 actions
- **Deep-Challenge Investment:** 248140G across 4201 actions
- **Neutral-Claim Investment:** 41G across 1 actions
- **Passive Openings Observed:** 2
- **Passive Openings with Treasury to Invest:** 2 (100.0%)
- **Passive Openings with Reserve-Safe Invest:** 1 (50.0%)
- **Passive Opening Avg Nominated Turn-Order Delay:** 3.00 turns
- **Passive Openings Attempted by Nominated Challenger:** 2 (100.0%)
- **Passive Opening Avg Delay to First Nominated Attempt:** 0.00 turns
- **Passive Openings Resolved Before Expiry:** 0 (0.0%)
- **Passive Openings Won by Nominated Challenger:** 0 (0.0% of openings, 0.0% of resolved)
- **Passive Openings Lost to Someone Else:** 0
- **Passive Openings Expired Unresolved:** 2
- **Passive Opening Resolutions by Cause:** none
- **Passive Opening Nominated Wins by Cause:** none
- **Passive Openings with No Nominated Attempt:** 0 (0.0%)
- **No-Attempt Reasons:** Treasury blocked 0, Reserve blocked 0, No-attempt despite capacity 0
- **Passive Direct Flip Conversion per 100 Close-Race Pulses:** 0.00
- **Passive-Assisted Suzerainty Changes:** 448 (36.7% of non-passive changes)
- **Passive-Assisted True Ownership Turnovers:** 446 (36.6% of ownership turnover)
- **Passive-Assisted Ownership Conversion per 100 Close-Race Pulses:** 0.45
- **Passive-Involved Ownership Conversion per 100 Close-Race Pulses:** 0.45
- **Passive-Assisted Ownership Causes:** Investment 3, WartimeRelease 393, Other 50
- **Pair-Fatigue-Triggered Investment:** 204590G across 2703 actions
- **Pair-Fatigue Share of Challenger Spend:** 3.2%
- **Safe-Maintenance Investment:** 343G across 11 actions
- **Focus Turns:** 273150 (challenge 224691, maintenance 48459)
- **Focus Assignments / Switches:** 4638 / 615
- **Flip Conversion per 100 Turnover-Window Turns:** 0.55
- **True Ownership Conversion per 100 Turnover-Window Turns:** 0.55
- **Safe-Maintenance Share of Maintenance Spend:** 0.0%

### Flip Cause Summary
- **Investment:** 525 suzerainty changes, 524 true ownership turnovers (43.0% of ownership turnover)
- **PassiveContestation:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **WartimeRelease:** 416 suzerainty changes, 414 true ownership turnovers (34.0% of ownership turnover)
- **WarBreak:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **Other:** 280 suzerainty changes, 280 true ownership turnovers (23.0% of ownership turnover)

### Hotspot Diagnostics
- **Hotspot Share of Active Turns:** 0.71%
- **City-State Instances with Any Hotspot Time:** 81/2324
- **True Ownership Turnovers Occurring in Hotspot Instances:** 616/1218
- **Flip Causes:** Investment 525, WartimeRelease 416, Other 280
- **Ownership Causes:** Investment 524, WartimeRelease 414, Other 280
- **Top Hotspot Instances:** Voidlight Archive [Huge 503103] (34 ownership, hotspot 92.9%, fatigue 2286G/24, JadeCovenant <> ScholarKingdoms 17, JadeCovenant <> ForgeClans 9, ForgeClans <> ScholarKingdoms 8); Embermint [Huge 411011] (19 ownership, hotspot 31.2%, fatigue 3004G/18, ForgeClans <> ScholarKingdoms 19); Brassmoon Mint [Huge 494094] (18 ownership, hotspot 42.6%, fatigue 2267G/23, RiverLeague <> ForgeClans 18); Aetherquill [Huge 432032] (17 ownership, hotspot 28.8%, fatigue 5038G/45, RiverLeague <> AetherianVanguard 17); Kingsmerch [Huge 501101] (16 ownership, hotspot 61.5%, fatigue 5096G/46, AetherianVanguard <> JadeCovenant 16); Kingsmerch [Huge 410010] (15 ownership, hotspot 32.7%, fatigue 4848G/48, JadeCovenant <> ForgeClans 15)

### Map-Size City-State Activation
- **Tiny:** 90/120 sims with >=1 city-state (75.0%), avg created 1.43, avg first CS turn 139.8
- **Small:** 92/120 sims with >=1 city-state (76.7%), avg created 1.51, avg first CS turn 127.3
- **Standard:** 119/120 sims with >=1 city-state (99.2%), avg created 3.57, avg first CS turn 115.9
- **Large:** 120/120 sims with >=1 city-state (100.0%), avg created 5.82, avg first CS turn 114.3
- **Huge:** 119/120 sims with >=1 city-state (99.2%), avg created 7.05, avg first CS turn 131.3

### Yield-Type Turnover Summary
- **Science:** 579 city-states, contested 0.80% (No Suz 0.00%, Close-race 0.80%), turnover window 62.56%, flip window 60.81%, safe lead 42.81%, hotspot 0.74%, flip rate 0.39/100T, ownership turnover 0.39/100T, avg unique suzerains 1.26
- **Production:** 580 city-states, contested 0.76% (No Suz 0.07%, Close-race 0.69%), turnover window 59.90%, flip window 58.39%, safe lead 44.32%, hotspot 0.56%, flip rate 0.29/100T, ownership turnover 0.29/100T, avg unique suzerains 1.26
- **Food:** 586 city-states, contested 0.66% (No Suz 0.00%, Close-race 0.66%), turnover window 61.57%, flip window 60.16%, safe lead 42.62%, hotspot 0.66%, flip rate 0.31/100T, ownership turnover 0.30/100T, avg unique suzerains 1.26
- **Gold:** 579 city-states, contested 0.90% (No Suz 0.00%, Close-race 0.90%), turnover window 61.28%, flip window 59.00%, safe lead 45.65%, hotspot 0.89%, flip rate 0.36/100T, ownership turnover 0.36/100T, avg unique suzerains 1.26

### Suzerainty vs Winning (Directional)
- **Winner Average Suzerainty Turns:** 221.09
- **Non-Winner Average Suzerainty Turns:** 123.45
- **Winners with Any Suzerainty:** 416/540 (77.0%)
- **Participant Win Rate with Any Suzerainty:** 27.0%
- **Participant Win Rate without Suzerainty:** 12.6%

## 10. Stalls & Issues

### Games Without Victory
- **Count:** 60 of 600 (10.0%)

### Stall Diagnostics

#### Stalled Game 1 (Tiny, seed 15015)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 3
- **Final Units:** 18
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 18
- **Civ Details:**
  - ForgeClans: 2 cities, pop 21, power 76, 11 techs
  - JadeCovenant: 1 cities, pop 10, power 46.2, 9 techs

#### Stalled Game 2 (Tiny, seed 14014)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 6
- **Final Units:** 20
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 27
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 23, power 55, 13 techs
  - RiverLeague: 2 cities, pop 22, power 155, 11 techs

#### Stalled Game 3 (Tiny, seed 19019)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 19
- **War Declarations:** 6
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 20
- **Civ Details:**
  - ForgeClans: 2 cities, pop 21, power 102, 13 techs
  - AetherianVanguard: 2 cities, pop 19, power 91.06666666666666, 10 techs

#### Stalled Game 4 (Tiny, seed 16016)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 16
- **Final Units:** 27
- **War Declarations:** 3
- **City Captures:** 8
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 52
- **Civ Details:**
  - JadeCovenant: 8 cities, pop 77, power 291, 20 techs
  - ForgeClans: 6 cities, pop 61, power 235.53333333333333, 17 techs

#### Stalled Game 5 (Tiny, seed 44044)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 11
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 13
- **Civ Details:**
  - ScholarKingdoms: 2 cities, pop 21, power 85.33333333333333, 8 techs
  - RiverLeague: 1 cities, pop 11, power 36, 5 techs

#### Stalled Game 6 (Tiny, seed 39039)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 10
- **Final Units:** 21
- **War Declarations:** 2
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 30
- **Civ Details:**
  - StarborneSeekers: 4 cities, pop 39, power 148.66666666666666, 15 techs
  - AetherianVanguard: 4 cities, pop 39, power 115.86666666666666, 20 techs

#### Stalled Game 7 (Tiny, seed 33033)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 18
- **Final Units:** 45
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 66
- **Civ Details:**
  - ForgeClans: 6 cities, pop 57, power 234.53333333333333, 13 techs
  - ScholarKingdoms: 10 cities, pop 89, power 408.1333333333333, 20 techs

#### Stalled Game 8 (Tiny, seed 41041)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 30
- **War Declarations:** 5
- **City Captures:** 2
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - ScholarKingdoms: 7 cities, pop 62, power 297, 17 techs
  - RiverLeague: 5 cities, pop 50, power 235.33333333333334, 13 techs

#### Stalled Game 9 (Tiny, seed 46046)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 12
- **Final Units:** 21
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 23
- **Civ Details:**
  - JadeCovenant: 6 cities, pop 60, power 226.93333333333334, 17 techs
  - StarborneSeekers: 3 cities, pop 30, power 95.8, 18 techs

#### Stalled Game 10 (Tiny, seed 43043)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 16
- **Final Units:** 34
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 43
- **Civ Details:**
  - RiverLeague: 5 cities, pop 46, power 147.76, 18 techs
  - ScholarKingdoms: 8 cities, pop 70, power 279.26666666666665, 20 techs

#### Stalled Game 11 (Tiny, seed 59059)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 24
- **War Declarations:** 5
- **City Captures:** 2
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 15
- **Civ Details:**
  - JadeCovenant: 2 cities, pop 21, power 129, 11 techs
  - ForgeClans: 2 cities, pop 20, power 147, 14 techs

#### Stalled Game 12 (Tiny, seed 60060)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 15
- **Final Units:** 34
- **War Declarations:** 2
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 40
- **Civ Details:**
  - StarborneSeekers: 4 cities, pop 39, power 124.53333333333333, 14 techs
  - ScholarKingdoms: 9 cities, pop 82, power 258.2, 20 techs

#### Stalled Game 13 (Tiny, seed 67067)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 6
- **Final Units:** 15
- **War Declarations:** 3
- **City Captures:** 5
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 21
- **Civ Details:**
  - RiverLeague: 2 cities, pop 19, power 83.6, 11 techs
  - JadeCovenant: 3 cities, pop 30, power 61, 10 techs

#### Stalled Game 14 (Tiny, seed 92092)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 9
- **Final Units:** 18
- **War Declarations:** 3
- **City Captures:** 1
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 36
- **Civ Details:**
  - JadeCovenant: 4 cities, pop 32, power 128, 7 techs
  - ScholarKingdoms: 2 cities, pop 18, power 77.73333333333333, 7 techs

#### Stalled Game 15 (Tiny, seed 99099)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 15
- **Final Units:** 34
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 27
- **Civ Details:**
  - StarborneSeekers: 8 cities, pop 78, power 341.53333333333336, 20 techs
  - JadeCovenant: 5 cities, pop 50, power 184.93333333333334, 20 techs

#### Stalled Game 16 (Tiny, seed 102102)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 16
- **Final Units:** 22
- **War Declarations:** 3
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 36
- **Civ Details:**
  - RiverLeague: 7 cities, pop 60, power 149.86666666666667, 20 techs
  - JadeCovenant: 7 cities, pop 67, power 249.89333333333332, 20 techs

#### Stalled Game 17 (Tiny, seed 108108)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 31
- **War Declarations:** 3
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 32
- **Civ Details:**
  - JadeCovenant: 1 cities, pop 11, power 0, 7 techs
  - StarborneSeekers: 11 cities, pop 87, power 451.8, 20 techs

#### Stalled Game 18 (Tiny, seed 110110)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 15
- **Final Units:** 46
- **War Declarations:** 4
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 24
- **Civ Details:**
  - ScholarKingdoms: 9 cities, pop 87, power 660.2666666666667, 20 techs
  - JadeCovenant: 3 cities, pop 30, power 66, 20 techs

#### Stalled Game 19 (Small, seed 112012)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 7
- **Final Units:** 66
- **War Declarations:** 4
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 16
- **Civ Details:**
  - ForgeClans: 2 cities, pop 21, power 375, 12 techs
  - ScholarKingdoms: 0 cities, pop 0, power 19, 0 techs
  - RiverLeague: 4 cities, pop 42, power 534, 20 techs

#### Stalled Game 20 (Small, seed 113013)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 17
- **Final Units:** 45
- **War Declarations:** 3
- **City Captures:** 3
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 48
- **Civ Details:**
  - ScholarKingdoms: 4 cities, pop 39, power 150.33333333333331, 14 techs
  - ForgeClans: 9 cities, pop 81, power 459.6, 18 techs
  - RiverLeague: 1 cities, pop 10, power 6, 6 techs

#### Stalled Game 21 (Small, seed 125025)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 7
- **Final Units:** 38
- **War Declarations:** 0
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 30
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 10, power 54.266666666666666, 12 techs
  - RiverLeague: 2 cities, pop 21, power 98, 8 techs
  - ScholarKingdoms: 3 cities, pop 30, power 111.8, 16 techs

#### Stalled Game 22 (Small, seed 146046)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 18
- **Final Units:** 43
- **War Declarations:** 4
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 41
- **Civ Details:**
  - ForgeClans: 3 cities, pop 30, power 200.36, 18 techs
  - JadeCovenant: 3 cities, pop 29, power 73.53333333333333, 7 techs
  - StarborneSeekers: 8 cities, pop 75, power 317.8, 20 techs

#### Stalled Game 23 (Standard, seed 201001)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 19
- **Final Units:** 40
- **War Declarations:** 7
- **City Captures:** 1
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 56
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 32, power 145, 14 techs
  - ScholarKingdoms: 3 cities, pop 26, power 111.33333333333334, 11 techs
  - ForgeClans: 3 cities, pop 30, power 130, 12 techs
  - RiverLeague: 4 cities, pop 41, power 268.72, 11 techs

#### Stalled Game 24 (Standard, seed 207007)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 14
- **Final Units:** 49
- **War Declarations:** 6
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 49
- **Civ Details:**
  - RiverLeague: 5 cities, pop 51, power 227, 18 techs
  - JadeCovenant: 3 cities, pop 25, power 201.08, 10 techs
  - StarborneSeekers: 1 cities, pop 11, power 26.4, 6 techs
  - ForgeClans: 2 cities, pop 20, power 166, 20 techs

#### Stalled Game 25 (Standard, seed 211011)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 16
- **Final Units:** 41
- **War Declarations:** 6
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 55
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 6 cities, pop 46, power 276.4, 19 techs
  - ScholarKingdoms: 6 cities, pop 57, power 201.4, 19 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)

#### Stalled Game 26 (Standard, seed 212012)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 43
- **War Declarations:** 10
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 37
- **Civ Details:**
  - ForgeClans: 3 cities, pop 24, power 143, 9 techs
  - RiverLeague: 3 cities, pop 31, power 92, 20 techs
  - ScholarKingdoms: 6 cities, pop 60, power 381.79999999999995, 20 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)

#### Stalled Game 27 (Standard, seed 215015)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 22
- **Final Units:** 63
- **War Declarations:** 6
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 53
- **Civ Details:**
  - ForgeClans: 1 cities, pop 10, power 99.53333333333333, 12 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - JadeCovenant: 15 cities, pop 140, power 721.3333333333333, 20 techs
  - RiverLeague: 2 cities, pop 19, power 23, 6 techs

#### Stalled Game 28 (Standard, seed 222022)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 25
- **Final Units:** 60
- **War Declarations:** 10
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 58
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - ScholarKingdoms: 12 cities, pop 114, power 572.2, 20 techs
  - RiverLeague: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)
  - StarborneSeekers: 9 cities, pop 90, power 343.8666666666667, 20 techs

#### Stalled Game 29 (Standard, seed 226026)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 20
- **Final Units:** 64
- **War Declarations:** 18
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 77
- **Civ Details:**
  - JadeCovenant: 9 cities, pop 88, power 554.6933333333334, 20 techs
  - ScholarKingdoms: 2 cities, pop 18, power 38, 18 techs
  - StarborneSeekers: 6 cities, pop 58, power 320.46666666666664, 20 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)

#### Stalled Game 30 (Standard, seed 229029)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 27
- **Final Units:** 65
- **War Declarations:** 14
- **City Captures:** 18
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 87
- **Civ Details:**
  - AetherianVanguard: 5 cities, pop 49, power 62, 20 techs
  - ScholarKingdoms: 3 cities, pop 30, power 137, 16 techs
  - JadeCovenant: 7 cities, pop 71, power 394.44, 20 techs
  - RiverLeague: 8 cities, pop 70, power 427, 18 techs

#### Stalled Game 31 (Standard, seed 235035)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 50
- **War Declarations:** 9
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 41
- **Civ Details:**
  - JadeCovenant: 7 cities, pop 66, power 334, 15 techs
  - RiverLeague: 6 cities, pop 59, power 258.6, 20 techs
  - StarborneSeekers: 2 cities, pop 18, power 57, 12 techs
  - ForgeClans: 1 cities, pop 10, power 90.46666666666667, 11 techs

#### Stalled Game 32 (Standard, seed 237037)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 24
- **Final Units:** 59
- **War Declarations:** 10
- **City Captures:** 18
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 60
- **Civ Details:**
  - RiverLeague: 8 cities, pop 81, power 452.26666666666665, 20 techs
  - JadeCovenant: 5 cities, pop 48, power 240, 20 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - ForgeClans: 7 cities, pop 63, power 246.53333333333333, 20 techs

#### Stalled Game 33 (Standard, seed 242042)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 19
- **Final Units:** 47
- **War Declarations:** 16
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 42
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - ForgeClans: 3 cities, pop 31, power 128, 14 techs
  - ScholarKingdoms: 5 cities, pop 49, power 293.4666666666667, 20 techs
  - StarborneSeekers: 6 cities, pop 58, power 205, 12 techs

#### Stalled Game 34 (Standard, seed 255055)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 24
- **Final Units:** 66
- **War Declarations:** 8
- **City Captures:** 17
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 111
- **Civ Details:**
  - ScholarKingdoms: 3 cities, pop 30, power 130, 18 techs
  - ForgeClans: 12 cities, pop 118, power 578.7333333333333, 20 techs
  - RiverLeague: 5 cities, pop 48, power 189.68, 19 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 20 techs (ELIMINATED)

#### Stalled Game 35 (Standard, seed 263063)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 14
- **Final Units:** 45
- **War Declarations:** 9
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - ScholarKingdoms: 6 cities, pop 60, power 311.66666666666663, 20 techs
  - RiverLeague: 1 cities, pop 10, power 36, 8 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 5 cities, pop 52, power 210.4, 12 techs

#### Stalled Game 36 (Standard, seed 266066)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 15
- **Final Units:** 39
- **War Declarations:** 7
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 57
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 29, power 89.6, 12 techs
  - RiverLeague: 1 cities, pop 11, power 98, 6 techs
  - ForgeClans: 3 cities, pop 28, power 142.06666666666666, 12 techs
  - AetherianVanguard: 2 cities, pop 20, power 104.53333333333333, 10 techs

#### Stalled Game 37 (Standard, seed 268068)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 11
- **Final Units:** 34
- **War Declarations:** 5
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 48
- **Civ Details:**
  - StarborneSeekers: 4 cities, pop 23, power 94.26666666666667, 17 techs
  - ScholarKingdoms: 2 cities, pop 22, power 101.36, 18 techs
  - JadeCovenant: 1 cities, pop 11, power 39, 10 techs
  - AetherianVanguard: 1 cities, pop 10, power 35, 6 techs

#### Stalled Game 38 (Standard, seed 267067)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 20
- **Final Units:** 51
- **War Declarations:** 4
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 45
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - StarborneSeekers: 5 cities, pop 49, power 105.64, 12 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 20 techs (ELIMINATED)
  - AetherianVanguard: 12 cities, pop 112, power 614.8666666666667, 20 techs

#### Stalled Game 39 (Standard, seed 280080)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 48
- **War Declarations:** 15
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 60
- **Civ Details:**
  - RiverLeague: 3 cities, pop 32, power 66, 17 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - JadeCovenant: 3 cities, pop 30, power 123.33333333333333, 17 techs
  - ForgeClans: 8 cities, pop 84, power 547.2, 14 techs

#### Stalled Game 40 (Standard, seed 277077)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 27
- **Final Units:** 50
- **War Declarations:** 8
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 58
- **Civ Details:**
  - StarborneSeekers: 4 cities, pop 38, power 144, 20 techs
  - AetherianVanguard: 13 cities, pop 120, power 594.6666666666666, 20 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - ForgeClans: 3 cities, pop 30, power 74, 12 techs

#### Stalled Game 41 (Standard, seed 281081)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 25
- **Final Units:** 54
- **War Declarations:** 19
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 75
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 19, power 58, 18 techs
  - RiverLeague: 5 cities, pop 48, power 212.33333333333334, 19 techs
  - JadeCovenant: 6 cities, pop 60, power 213, 11 techs
  - AetherianVanguard: 7 cities, pop 61, power 333.4666666666667, 19 techs

#### Stalled Game 42 (Standard, seed 288088)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 24
- **Final Units:** 50
- **War Declarations:** 8
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 48
- **Civ Details:**
  - ForgeClans: 5 cities, pop 46, power 188.15999999999997, 11 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - JadeCovenant: 6 cities, pop 59, power 234.76, 20 techs
  - ScholarKingdoms: 8 cities, pop 73, power 296.06666666666666, 20 techs

#### Stalled Game 43 (Standard, seed 296096)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 44
- **War Declarations:** 8
- **City Captures:** 7
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 29
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - ScholarKingdoms: 6 cities, pop 57, power 326.2, 17 techs
  - ForgeClans: 4 cities, pop 36, power 214.4, 13 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)

#### Stalled Game 44 (Standard, seed 294094)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 23
- **Final Units:** 67
- **War Declarations:** 9
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 52
- **Civ Details:**
  - ScholarKingdoms: 6 cities, pop 61, power 275.92, 20 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - JadeCovenant: 10 cities, pop 97, power 566.5333333333333, 20 techs
  - ForgeClans: 4 cities, pop 40, power 169, 12 techs

#### Stalled Game 45 (Standard, seed 302102)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 26
- **Final Units:** 60
- **War Declarations:** 12
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 100
- **Civ Details:**
  - JadeCovenant: 9 cities, pop 88, power 335, 19 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - ForgeClans: 6 cities, pop 60, power 326.29333333333335, 20 techs
  - ScholarKingdoms: 6 cities, pop 61, power 250.14666666666668, 20 techs

#### Stalled Game 46 (Standard, seed 318118)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 17
- **Final Units:** 45
- **War Declarations:** 8
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 34
- **Civ Details:**
  - AetherianVanguard: 10 cities, pop 86, power 473.46666666666664, 20 techs
  - JadeCovenant: 3 cities, pop 30, power 225.28, 17 techs
  - RiverLeague: 0 cities, pop 0, power 0, 0 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 13 techs (ELIMINATED)

#### Stalled Game 47 (Large, seed 307007)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 21
- **Final Units:** 59
- **War Declarations:** 14
- **City Captures:** 19
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 69
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - ForgeClans: 1 cities, pop 11, power 67, 18 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - AetherianVanguard: 11 cities, pop 107, power 390.36, 20 techs
  - RiverLeague: 2 cities, pop 20, power 103, 17 techs
  - JadeCovenant: 3 cities, pop 31, power 152.86666666666667, 10 techs

#### Stalled Game 48 (Large, seed 311011)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 21
- **Final Units:** 42
- **War Declarations:** 14
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 38
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - AetherianVanguard: 7 cities, pop 64, power 157, 19 techs
  - StarborneSeekers: 1 cities, pop 11, power 48, 18 techs
  - RiverLeague: 2 cities, pop 21, power 122, 8 techs
  - ForgeClans: 2 cities, pop 20, power 90.66666666666666, 7 techs
  - JadeCovenant: 2 cities, pop 18, power 123.8, 16 techs

#### Stalled Game 49 (Large, seed 314014)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 23
- **Final Units:** 60
- **War Declarations:** 30
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 80
- **Civ Details:**
  - AetherianVanguard: 6 cities, pop 48, power 193.35, 17 techs
  - RiverLeague: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - JadeCovenant: 1 cities, pop 11, power 65, 9 techs
  - StarborneSeekers: 0 cities, pop 0, power 4, 15 techs
  - ScholarKingdoms: 2 cities, pop 19, power 121.46666666666667, 12 techs
  - ForgeClans: 8 cities, pop 72, power 330.73333333333335, 20 techs

#### Stalled Game 50 (Large, seed 318018)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 51
- **War Declarations:** 19
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 71
- **Civ Details:**
  - ScholarKingdoms: 2 cities, pop 17, power 71.66666666666667, 13 techs
  - RiverLeague: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - AetherianVanguard: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - JadeCovenant: 3 cities, pop 33, power 191.33333333333331, 18 techs
  - StarborneSeekers: 9 cities, pop 89, power 343.4666666666667, 20 techs
  - ForgeClans: 2 cities, pop 16, power 60, 9 techs

#### Stalled Game 51 (Large, seed 354054)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 18
- **Final Units:** 88
- **War Declarations:** 37
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 51
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 21, power 138, 17 techs
  - AetherianVanguard: 2 cities, pop 21, power 44, 14 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - RiverLeague: 0 cities, pop 0, power 4, 16 techs
  - ForgeClans: 4 cities, pop 41, power 234.44, 12 techs
  - JadeCovenant: 7 cities, pop 72, power 620.3333333333333, 20 techs

#### Stalled Game 52 (Large, seed 359059)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 23
- **Final Units:** 78
- **War Declarations:** 24
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 50
- **Civ Details:**
  - RiverLeague: 2 cities, pop 21, power 297.4666666666667, 6 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - StarborneSeekers: 6 cities, pop 59, power 262.6, 20 techs
  - ScholarKingdoms: 5 cities, pop 50, power 293, 20 techs
  - AetherianVanguard: 4 cities, pop 43, power 103, 20 techs
  - ForgeClans: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)

#### Stalled Game 53 (Large, seed 365065)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 16
- **Final Units:** 60
- **War Declarations:** 13
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 49
- **Civ Details:**
  - ForgeClans: 3 cities, pop 30, power 296.8, 13 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - RiverLeague: 1 cities, pop 11, power 49.46666666666667, 5 techs
  - AetherianVanguard: 4 cities, pop 42, power 225, 14 techs
  - JadeCovenant: 3 cities, pop 30, power 165.53333333333333, 9 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)

#### Stalled Game 54 (Large, seed 361061)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 26
- **Final Units:** 82
- **War Declarations:** 17
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 47
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 19, power 94.53333333333333, 10 techs
  - RiverLeague: 8 cities, pop 70, power 375, 20 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - JadeCovenant: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - StarborneSeekers: 1 cities, pop 11, power 24, 17 techs
  - ForgeClans: 9 cities, pop 86, power 548.1333333333333, 20 techs

#### Stalled Game 55 (Large, seed 370070)
- **Turn Reached:** 451
- **Surviving Civs:** 3
- **Final Cities:** 23
- **Final Units:** 63
- **War Declarations:** 20
- **City Captures:** 20
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 66
- **Civ Details:**
  - JadeCovenant: 9 cities, pop 87, power 485, 20 techs
  - ForgeClans: 7 cities, pop 68, power 310.9733333333333, 11 techs
  - AetherianVanguard: 2 cities, pop 20, power 62.6, 19 techs
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - ScholarKingdoms: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)

#### Stalled Game 56 (Large, seed 414114)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 22
- **Final Units:** 67
- **War Declarations:** 12
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 58
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - AetherianVanguard: 3 cities, pop 32, power 153, 20 techs
  - StarborneSeekers: 2 cities, pop 14, power 16, 8 techs
  - JadeCovenant: 4 cities, pop 43, power 238.93333333333334, 19 techs
  - ForgeClans: 3 cities, pop 31, power 179.12, 14 techs
  - ScholarKingdoms: 5 cities, pop 49, power 150, 19 techs

#### Stalled Game 57 (Large, seed 416116)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 26
- **Final Units:** 84
- **War Declarations:** 51
- **City Captures:** 14
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 86
- **Civ Details:**
  - JadeCovenant: 9 cities, pop 88, power 522.6666666666666, 20 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - ForgeClans: 2 cities, pop 19, power 74.86666666666667, 9 techs
  - StarborneSeekers: 1 cities, pop 11, power 36, 18 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - RiverLeague: 9 cities, pop 86, power 481.1333333333333, 20 techs

#### Stalled Game 58 (Huge, seed 410010)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 22
- **Final Units:** 82
- **War Declarations:** 14
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 51
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - AetherianVanguard: 8 cities, pop 78, power 450.8, 20 techs
  - JadeCovenant: 3 cities, pop 31, power 202.4, 14 techs
  - RiverLeague: 2 cities, pop 21, power 123.2, 6 techs
  - ForgeClans: 1 cities, pop 9, power 65.12, 14 techs
  - ScholarKingdoms: 1 cities, pop 11, power 53, 11 techs

#### Stalled Game 59 (Huge, seed 484084)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 21
- **Final Units:** 74
- **War Declarations:** 25
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 56
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - ForgeClans: 1 cities, pop 11, power 50.36, 9 techs
  - RiverLeague: 3 cities, pop 31, power 219.69333333333333, 16 techs
  - ScholarKingdoms: 4 cities, pop 39, power 179, 10 techs
  - StarborneSeekers: 2 cities, pop 21, power 41, 17 techs
  - JadeCovenant: 6 cities, pop 61, power 262.6933333333334, 20 techs

#### Stalled Game 60 (Huge, seed 493093)
- **Turn Reached:** 501
- **Surviving Civs:** 6
- **Final Cities:** 30
- **Final Units:** 82
- **War Declarations:** 19
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 65
- **Civ Details:**
  - AetherianVanguard: 4 cities, pop 37, power 132, 14 techs
  - ScholarKingdoms: 3 cities, pop 29, power 88, 9 techs
  - JadeCovenant: 6 cities, pop 58, power 377, 20 techs
  - RiverLeague: 1 cities, pop 11, power 143.28, 11 techs
  - StarborneSeekers: 2 cities, pop 20, power 71.38666666666667, 20 techs
  - ForgeClans: 5 cities, pop 40, power 108, 16 techs

## 11. Map Size Analysis

### Tiny Maps
- **Simulations:** 120
- **Victories:** 102 (85.0%)
  - Conquest: 99, Progress: 3
- **Average Victory Turn:** 226.5
- **Victory Turn Range:** [45, 392]

### Small Maps
- **Simulations:** 120
- **Victories:** 116 (96.7%)
  - Conquest: 106, Progress: 10
- **Average Victory Turn:** 202.2
- **Victory Turn Range:** [29, 390]

### Standard Maps
- **Simulations:** 120
- **Victories:** 96 (80.0%)
  - Conquest: 53, Progress: 43
- **Average Victory Turn:** 301.1
- **Victory Turn Range:** [133, 400]

### Large Maps
- **Simulations:** 120
- **Victories:** 109 (90.8%)
  - Conquest: 24, Progress: 85
- **Average Victory Turn:** 359.3
- **Victory Turn Range:** [180, 449]

### Huge Maps
- **Simulations:** 120
- **Victories:** 117 (97.5%)
  - Conquest: 17, Progress: 100
- **Average Victory Turn:** 374.4
- **Victory Turn Range:** [177, 491]

## 12. Balance Observations

### Victory Timing vs Pop 10
- Average Victory Turn: 293.4
- Average Pop 10 Turn: 338.0
- **Gap:** 44.6 turns (Pop 10 happens AFTER victory)

### Civilization Balance
- Highest Win Rate: AetherianVanguard (25.8%)
- Lowest Win Rate: JadeCovenant (16.3%)
- **Win Rate Spread:** 9.5 percentage points

### Settler Survival
- Settlers Produced: 10039
- Settlers Killed: 2422
- **Settler Survival Rate:** 75.9%

