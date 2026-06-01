# Comprehensive Simulation Analysis Report

**Date:** 2026-03-15
**Simulations:** 600 total (Tiny: 120, Small: 120, Standard: 120, Large: 120, Huge: 120) (AI vs AI)
**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)

## Titan Analysis
- **Total Titans Spawned:** 220
- **Average Spawn Turn:** 210.3
- **Median Spawn Turn:** 198
- **Spawn Turn Range:** [101, 428]
- **Average Units on Creation:** 12.9
- **Median Units on Creation:** 12
- **Range:** [4, 29]

---

## 1. Victory Analysis

### Overall Statistics
- **Total Victories:** 541 of 600 (90.2%)
- **Average Victory Turn:** 297.7
- **Median Victory Turn:** 323
- **Victory Turn Range:** [29, 479]

### Victory Types
- **Conquest:** 261 (43.5%)
- **Progress:** 280 (46.7%)
- **None:** 59 (9.8%)

### Victories by Civilization (with Victory Type Breakdown)
- **ScholarKingdoms:** 113 wins (26.8% of games played)
  - Conquest: 32, Progress: 81
- **StarborneSeekers:** 106 wins (25.2% of games played)
  - Conquest: 16, Progress: 90
- **ForgeClans:** 103 wins (24.8% of games played)
  - Conquest: 70, Progress: 33
- **AetherianVanguard:** 84 wins (19.7% of games played)
  - Conquest: 66, Progress: 18
- **RiverLeague:** 71 wins (16.9% of games played)
  - Conquest: 34, Progress: 37
- **JadeCovenant:** 64 wins (15.3% of games played)
  - Conquest: 43, Progress: 21

## 2. Warfare Analysis

### War Statistics
- **Total Unique Wars:** 3252
- **Total Peace Treaties:** 3477
- **Average Wars per Game:** 5.4

### War Durations
- **Total Wars Tracked:** 3252
- **Average Duration:** 102.9 turns
- **Median Duration:** 70 turns
- **Range:** [0, 427] turns

### War Initiation by Civilization
- **ForgeClans:** Initiated 824 (2.0/game), Received 314 (0.8/game)
- **ScholarKingdoms:** Initiated 152 (0.4/game), Received 856 (2.0/game)
- **RiverLeague:** Initiated 769 (1.8/game), Received 389 (0.9/game)
- **AetherianVanguard:** Initiated 531 (1.2/game), Received 479 (1.1/game)
- **StarborneSeekers:** Initiated 393 (0.9/game), Received 699 (1.7/game)
- **JadeCovenant:** Initiated 583 (1.4/game), Received 515 (1.2/game)

### War-to-Win Conversion by Civilization
- **ForgeClans:** 325/1652 initiated wars led to captures (19.7%), 0.31 cities per initiated war, 0.05 eliminations per initiated war, 102/233 wins after any capture (43.8%), 28/33 Progress wins after prior captures
- **ScholarKingdoms:** 80/230 initiated wars led to captures (34.8%), 0.55 cities per initiated war, 0.07 eliminations per initiated war, 76/171 wins after any capture (44.4%), 32/81 Progress wins after prior captures
- **RiverLeague:** 248/1530 initiated wars led to captures (16.2%), 0.26 cities per initiated war, 0.04 eliminations per initiated war, 68/199 wins after any capture (34.2%), 28/37 Progress wins after prior captures
- **AetherianVanguard:** 215/766 initiated wars led to captures (28.1%), 0.54 cities per initiated war, 0.08 eliminations per initiated war, 83/228 wins after any capture (36.4%), 15/18 Progress wins after prior captures
- **StarborneSeekers:** 95/583 initiated wars led to captures (16.3%), 0.25 cities per initiated war, 0.03 eliminations per initiated war, 46/138 wins after any capture (33.3%), 24/90 Progress wins after prior captures
- **JadeCovenant:** 209/1253 initiated wars led to captures (16.7%), 0.27 cities per initiated war, 0.03 eliminations per initiated war, 62/180 wins after any capture (34.4%), 16/21 Progress wins after prior captures

### ForgeClans Conversion Focus
- **Average Declaration Power Ratio:** 2.46
- **Median Turns from Declared War to First Capture:** 24.0
- **Median First Capture Turn:** wins 199.5, losses 243.0
- **Median 25-Turn Capture Burst:** wins 1.0, losses 1.0
- **First-Capture Win Rate:** 67/106 (63.2%)
- **Progress Wins With Prior Captures:** 28/33 (84.8%), avg 1.9 captures before first progress project

## 3. Unit Combat Analysis

### Unit Deaths
- **Total Units Killed:** 89592
- **Average per Game:** 149.3

### Deaths by Unit Type
- **SpearGuard:** 26911 deaths (27042 produced, 24995 of produced died, 7.6% produced survival)
- **BowGuard:** 18196 deaths (19416 produced, 17865 of produced died, 8.0% produced survival)
- **Trebuchet:** 9278 deaths (11663 produced, 9278 of produced died, 20.4% produced survival)
- **ArmyBowGuard:** 8663 deaths (13350 produced, 8662 of produced died, 35.1% produced survival)
- **ArmySpearGuard:** 5825 deaths (9236 produced, 5824 of produced died, 36.9% produced survival)
- **NativeArcher:** 4814 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **ArmyRiders:** 4001 deaths (5865 produced, 4001 of produced died, 31.8% produced survival)
- **Scout:** 3102 deaths (706 produced, 659 of produced died, 6.7% produced survival)
- **NativeChampion:** 2446 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **Settler:** 2029 deaths (9050 produced, 2011 of produced died, 77.8% produced survival)
- **Landship:** 1579 deaths (5639 produced, 1579 of produced died, 72.0% produced survival)
- **Riders:** 1366 deaths (1508 produced, 1366 of produced died, 9.4% produced survival)
- **Lorekeeper:** 1222 deaths (3107 produced, 1222 of produced died, 60.7% produced survival)
- **Titan:** 149 deaths (220 produced, 149 of produced died, 32.3% produced survival)
- **Airship:** 11 deaths (565 produced, 11 of produced died, 98.1% produced survival)

### Unit Production by Type
- **SpearGuard:** 27042 produced
- **BowGuard:** 19416 produced
- **ArmyBowGuard:** 13350 produced
- **Trebuchet:** 11663 produced
- **ArmySpearGuard:** 9236 produced
- **Settler:** 9050 produced
- **ArmyRiders:** 5865 produced
- **Landship:** 5639 produced
- **Lorekeeper:** 3107 produced
- **Riders:** 1508 produced
- **Scout:** 706 produced
- **Airship:** 565 produced
- **Titan:** 220 produced

## 4. City Growth & Development

### City Statistics
- **Total Cities Founded:** 10909
- **Total Cities Captured:** 3041
- **Total Cities Razed:** 267
- **Cities Reaching Pop 10:** 3559

### Population Milestones (Average Turn)
- **Pop 3:** 121.6 (8062 cities)
- **Pop 5:** 146.5 (7814 cities)
- **Pop 7:** 175.8 (7353 cities)
- **Pop 10:** 334.0 (3559 cities) [Range: 125-479]

### City Activity by Civilization
- **ForgeClans:** Founded 1419 (3.4/game), Captured 670, Lost 471
- **ScholarKingdoms:** Founded 1677 (4.0/game), Captured 335, Lost 539
- **RiverLeague:** Founded 1457 (3.5/game), Captured 579, Lost 546
- **AetherianVanguard:** Founded 1375 (3.2/game), Captured 689, Lost 534
- **StarborneSeekers:** Founded 1301 (3.1/game), Captured 250, Lost 491
- **JadeCovenant:** Founded 1435 (3.4/game), Captured 518, Lost 437

## 5. Technology Progression

### Tech Statistics
- **Total Techs Researched:** 29538
- **Average per Game:** 49.2
- **Total Techs in Tree:** 20

### Tech Tree Completion Rate by Civilization
- **ForgeClans:** 55.9% average tree completion
- **ScholarKingdoms:** 67.7% average tree completion
- **RiverLeague:** 54.6% average tree completion
- **AetherianVanguard:** 58.1% average tree completion
- **StarborneSeekers:** 63.6% average tree completion
- **JadeCovenant:** 55.5% average tree completion

### Tech Timing (Average Turn Researched)
- **ScriptLore:** Turn 51.4
- **Fieldcraft:** Turn 61.3
- **FormationTraining:** Turn 100.9
- **StoneworkHalls:** Turn 108.8
- **Wellworks:** Turn 126.3
- **DrilledRanks:** Turn 143.5
- **ScholarCourts:** Turn 170.5
- **ArmyDoctrine:** Turn 197.1
- **UrbanPlans:** Turn 206.5
- **SignalRelay:** Turn 219.6
- **TimberMills:** Turn 227.0
- **StarCharts:** Turn 247.2
- **CompositeArmor:** Turn 247.6
- **SteamForges:** Turn 260.3
- **CityWards:** Turn 267.7
- **TrailMaps:** Turn 268.7
- **ZeroPointEnergy:** Turn 281.7
- **PlasmaShields:** Turn 292.1
- **Aerodynamics:** Turn 305.0
- **DimensionalGate:** Turn 320.1

## 6. Project Completion

### Project Statistics
- **Total Projects Completed:** 2466
- **Average per Game:** 4.1

### Project Breakdown
- **Progress Chain (Observatory/Academy/Experiment):** 1760
- **Unique Building Markers:** 706

### Progress Chain Timing
- **Observatory:** 897 completions, avg turn 284.6
- **GrandAcademy:** 583 completions, avg turn 324.3
- **GrandExperiment:** 280 completions, avg turn 363.2

### Army Unit Production
- **ArmySpearGuard:** 9236 produced, 5825 killed (36.9% survival)
- **ArmyBowGuard:** 13350 produced, 8663 killed (35.1% survival)
- **ArmyRiders:** 5865 produced, 4001 killed (31.8% survival)
- **Total Army Units:** 28451 produced, 18489 killed

## 7. Building Construction

### Buildings by Type
- **TradingPost:** 7695 built (avg turn 128.6)
- **MarketHall:** 6591 built (avg turn 180.1)
- **Bank:** 2320 built (avg turn 243.4)
- **Exchange:** 1061 built (avg turn 278.2)
- **Bulwark:** 486 built (avg turn 108.9)
- **ShieldGenerator:** 280 built (avg turn 264.7)

## 8. Civilization Performance

### Win Rates & Statistics

#### ScholarKingdoms
- **Games Played:** 422
- **Wins:** 113 (26.8% win rate)
  - Conquest: 32, Progress: 81
- **Eliminations:** 65
- **Avg Cities:** 3.4
- **Avg Population:** 29.1
- **Avg Techs:** 13.5
- **Avg Projects:** 1.4
- **Avg Military Power:** 101.0

#### StarborneSeekers
- **Games Played:** 421
- **Wins:** 106 (25.2% win rate)
  - Conquest: 16, Progress: 90
- **Eliminations:** 83
- **Avg Cities:** 2.4
- **Avg Population:** 21.0
- **Avg Techs:** 12.6
- **Avg Projects:** 2.1
- **Avg Military Power:** 60.8

#### ForgeClans
- **Games Played:** 415
- **Wins:** 103 (24.8% win rate)
  - Conquest: 70, Progress: 33
- **Eliminations:** 56
- **Avg Cities:** 3.9
- **Avg Population:** 33.9
- **Avg Techs:** 11.0
- **Avg Projects:** 0.4
- **Avg Military Power:** 170.5

#### AetherianVanguard
- **Games Played:** 426
- **Wins:** 84 (19.7% win rate)
  - Conquest: 66, Progress: 18
- **Eliminations:** 59
- **Avg Cities:** 3.5
- **Avg Population:** 31.0
- **Avg Techs:** 11.6
- **Avg Projects:** 1.0
- **Avg Military Power:** 131.2

#### RiverLeague
- **Games Played:** 419
- **Wins:** 71 (16.9% win rate)
  - Conquest: 34, Progress: 37
- **Eliminations:** 66
- **Avg Cities:** 3.4
- **Avg Population:** 31.9
- **Avg Techs:** 10.7
- **Avg Projects:** 0.5
- **Avg Military Power:** 153.7

#### JadeCovenant
- **Games Played:** 417
- **Wins:** 64 (15.3% win rate)
  - Conquest: 43, Progress: 21
- **Eliminations:** 57
- **Avg Cities:** 3.5
- **Avg Population:** 31.9
- **Avg Techs:** 10.9
- **Avg Projects:** 0.4
- **Avg Military Power:** 145.6

## 9. City-State Systems

### Telemetry Coverage
- **Simulations with City-State Telemetry:** 600/600
- **Simulations Missing City-State Telemetry:** 0
- **Total City-States Created:** 2245
- **Average City-States Created per Telemetry Sim:** 3.74
- **Average Surviving City-States at Game End (Telemetry Sims):** 3.69

### Activation & Turnover
- **Total City-State Active Turns:** 361207
- **First City-State Creation Turn (min / p25 / median / p75 / max):** 35 / 88 / 109 / 145 / 386
- **First City-State Creation Turn (average, sims with any):** 123.6
- **Global Suzerainty Flip Rate:** 0.40 per 100 active turns
- **True Ownership Turnover Rate:** 0.40 per 100 active turns
- **Average Unique Suzerains per City-State:** 1.28
- **Total Contested Turns:** 3256 (No Suz: 155, Close-race: 3101)
- **Contested Share of Active Turns:** 0.90%
- **Turnover-Window Turns:** 222177 (61.51% of active turns)
- **Flip-Window Turns:** 214762 (59.46% of active turns)
- **Safe-Lead Incumbent Turns:** 161217 (44.63% of active turns)
- **Hotspot Turns:** 3107 (0.86% of active turns)
- **Passive Contestation Pulses:** 121651
- **Passive Contestation Close-Race Pulses:** 95550
- **City-States with Zero Suzerainty Flips:** 1683/2245
- **Contested-but-Zero-Flip City-States:** 584/2245
- **Top 4 City-States Share of True Ownership Turnovers:** 10.3%
- **True Ownership Turnover Rate Outside Top 4 Turnover City-States:** 0.35 per 100 active turns
- **Top Turnover City-States:** Runehammer Gate [Huge 504104] (39 ownership, 39 total), Hammerdeep [Huge 497097] (38 ownership, 38 total), Suncoin Citadel [Huge 503103] (38 ownership, 38 total), Brasshollow [Huge 403003] (32 ownership, 32 total)

### Camp-Clearing Activation Funnel
- **Camp-Clearing Episodes:** 25724
- **Direct Starts in Ready:** 10080 (39.2%)
- **Episodes Reaching Ready:** 15723 (61.1%)
- **Episodes with Sighting Telemetry:** 15558 (60.5%)
- **Sighted -> Prep Start (avg / median):** 112.93 / 91 turns
- **Prep Start -> Ready (avg / median):** 2.90 / 0 turns
- **Prep Start -> Self Clear (avg / median):** 14.68 / 10 turns
- **Total Prep Duration (avg / median):** 8.19 / 1 turns
- **Timeouts After Ready:** 901 (20.1% of timeouts)
- **Ready Turn Diagnostics:** no contact 32138, adjacent contact 4706, attack opportunity 15644, stalled opportunity 8721, power disadvantage 10000, progress 9476
- **Ready-Timeout Primary Breakdown:** no contact 575, declined attack 204, power collapse 122, other 0
- **War-Interrupted Episodes:** 6897 (26.8%)
- **Cleared-By-Other Breakdown:** lacked military 165, late start 448, other 188
- **Episode Outcomes:** ClearedBySelf 2111, ClearedByOther 801, TimedOut 4492, WartimeEmergencyCancelled 6897, OtherCancelled 11053, StillActive 370
- **Readiness Breakdown:** PreArmy 101/6000 clears, 2100 timeouts, ArmyTech 762/12997 clears, 1630 timeouts, ArmyFielded 1248/6727 clears, 762 timeouts

### Investment Mix
- **Total City-State Investment:** 7069908G across 104545 actions
- **Maintenance Investment:** 1670465G (23.6%) across 45003 actions (43.0%)
- **Challenger Investment:** 5399443G (76.4%) across 59542 actions (57.0%)
- **Maintenance Gold per Suzerainty Turn:** 4.63
- **Maintenance Actions per 100 Suzerainty Turns:** 12.46

### Turnover Diagnostics
- **Turnover-Window Challenger Investment:** 5177575G across 55564 actions
- **Flip-Window Challenger Investment:** 5074517G across 54506 actions
- **Deep-Challenge Investment:** 221778G across 3976 actions
- **Neutral-Claim Investment:** 90G across 2 actions
- **Passive Openings Observed:** 3
- **Passive Openings with Treasury to Invest:** 0 (0.0%)
- **Passive Openings with Reserve-Safe Invest:** 0 (0.0%)
- **Passive Opening Avg Nominated Turn-Order Delay:** 2.00 turns
- **Passive Openings Attempted by Nominated Challenger:** 0 (0.0%)
- **Passive Opening Avg Delay to First Nominated Attempt:** 0.00 turns
- **Passive Openings Resolved Before Expiry:** 3 (100.0%)
- **Passive Openings Won by Nominated Challenger:** 3 (100.0% of openings, 100.0% of resolved)
- **Passive Openings Lost to Someone Else:** 0
- **Passive Openings Expired Unresolved:** 0
- **Passive Opening Resolutions by Cause:** Other 3
- **Passive Opening Nominated Wins by Cause:** Other 3
- **Passive Openings with No Nominated Attempt:** 3 (100.0%)
- **No-Attempt Reasons:** Treasury blocked 3, Reserve blocked 0, No-attempt despite capacity 0
- **Passive Direct Flip Conversion per 100 Close-Race Pulses:** 0.00
- **Passive-Assisted Suzerainty Changes:** 464 (32.4% of non-passive changes)
- **Passive-Assisted True Ownership Turnovers:** 459 (32.2% of ownership turnover)
- **Passive-Assisted Ownership Conversion per 100 Close-Race Pulses:** 0.48
- **Passive-Involved Ownership Conversion per 100 Close-Race Pulses:** 0.48
- **Passive-Assisted Ownership Causes:** Investment 5, WartimeRelease 388, Other 66
- **Pair-Fatigue-Triggered Investment:** 226690G across 2727 actions
- **Pair-Fatigue Share of Challenger Spend:** 4.2%
- **Safe-Maintenance Investment:** 135G across 4 actions
- **Focus Turns:** 270329 (challenge 221679, maintenance 48650)
- **Focus Assignments / Switches:** 4844 / 591
- **Flip Conversion per 100 Turnover-Window Turns:** 0.64
- **True Ownership Conversion per 100 Turnover-Window Turns:** 0.64
- **Safe-Maintenance Share of Maintenance Spend:** 0.0%

### Flip Cause Summary
- **Investment:** 661 suzerainty changes, 660 true ownership turnovers (46.3% of ownership turnover)
- **PassiveContestation:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **WartimeRelease:** 400 suzerainty changes, 396 true ownership turnovers (27.8% of ownership turnover)
- **WarBreak:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **Other:** 372 suzerainty changes, 371 true ownership turnovers (26.0% of ownership turnover)

### Hotspot Diagnostics
- **Hotspot Share of Active Turns:** 0.86%
- **City-State Instances with Any Hotspot Time:** 79/2245
- **True Ownership Turnovers Occurring in Hotspot Instances:** 794/1427
- **Flip Causes:** Investment 661, WartimeRelease 400, Other 372
- **Ownership Causes:** Investment 660, WartimeRelease 396, Other 371
- **Top Hotspot Instances:** Runehammer Gate [Huge 504104] (39 ownership, hotspot 31.7%, fatigue 2527G/23, JadeCovenant <> ScholarKingdoms 14, AetherianVanguard <> ScholarKingdoms 13, JadeCovenant <> AetherianVanguard 12); Hammerdeep [Huge 497097] (38 ownership, hotspot 96.3%, fatigue 2934G/32, RiverLeague <> StarborneSeekers 15, AetherianVanguard <> StarborneSeekers 13, RiverLeague <> AetherianVanguard 10); Suncoin Citadel [Huge 503103] (38 ownership, hotspot 94.5%, fatigue 2298G/24, JadeCovenant <> ForgeClans 13, JadeCovenant <> ScholarKingdoms 13, ForgeClans <> ScholarKingdoms 12); Brasshollow [Huge 403003] (32 ownership, hotspot 75.6%, fatigue 3718G/32, RiverLeague <> ForgeClans 11, StarborneSeekers <> ForgeClans 11, RiverLeague <> StarborneSeekers 9, RiverLeague <> JadeCovenant 1); Thistleheart [Huge 477077] (22 ownership, hotspot 70.6%, fatigue 12522G/68, JadeCovenant <> ForgeClans 21, RiverLeague <> ForgeClans 1); Observatory of Whispers [Huge 476076] (21 ownership, hotspot 19.0%, fatigue 2178G/17, RiverLeague <> StarborneSeekers 20, RiverLeague <> AetherianVanguard 1)

### Map-Size City-State Activation
- **Tiny:** 91/120 sims with >=1 city-state (75.8%), avg created 1.38, avg first CS turn 136.2
- **Small:** 88/120 sims with >=1 city-state (73.3%), avg created 1.39, avg first CS turn 126.1
- **Standard:** 116/120 sims with >=1 city-state (96.7%), avg created 3.40, avg first CS turn 116.4
- **Large:** 120/120 sims with >=1 city-state (100.0%), avg created 5.90, avg first CS turn 110.5
- **Huge:** 119/120 sims with >=1 city-state (99.2%), avg created 6.64, avg first CS turn 132.4

### Yield-Type Turnover Summary
- **Science:** 570 city-states, contested 0.82% (No Suz 0.00%, Close-race 0.82%), turnover window 60.01%, flip window 57.82%, safe lead 46.57%, hotspot 0.89%, flip rate 0.40/100T, ownership turnover 0.40/100T, avg unique suzerains 1.29
- **Production:** 555 city-states, contested 0.93% (No Suz 0.16%, Close-race 0.77%), turnover window 61.03%, flip window 59.46%, safe lead 43.39%, hotspot 0.94%, flip rate 0.42/100T, ownership turnover 0.42/100T, avg unique suzerains 1.28
- **Food:** 551 city-states, contested 0.84% (No Suz 0.00%, Close-race 0.84%), turnover window 63.54%, flip window 61.54%, safe lead 42.37%, hotspot 0.75%, flip rate 0.37/100T, ownership turnover 0.37/100T, avg unique suzerains 1.29
- **Gold:** 569 city-states, contested 1.02% (No Suz 0.01%, Close-race 1.01%), turnover window 61.45%, flip window 59.01%, safe lead 46.16%, hotspot 0.86%, flip rate 0.40/100T, ownership turnover 0.39/100T, avg unique suzerains 1.27

### Suzerainty vs Winning (Directional)
- **Winner Average Suzerainty Turns:** 196.85
- **Non-Winner Average Suzerainty Turns:** 128.63
- **Winners with Any Suzerainty:** 412/541 (76.2%)
- **Participant Win Rate with Any Suzerainty:** 26.6%
- **Participant Win Rate without Suzerainty:** 13.3%

## 10. Stalls & Issues

### Games Without Victory
- **Count:** 59 of 600 (9.8%)

### Stall Diagnostics

#### Stalled Game 1 (Tiny, seed 1001)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 11
- **Final Units:** 34
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 36
- **Civ Details:**
  - RiverLeague: 2 cities, pop 21, power 100, 8 techs
  - ScholarKingdoms: 7 cities, pop 66, power 303.26666666666665, 20 techs

#### Stalled Game 2 (Tiny, seed 15015)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 3
- **Final Units:** 19
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 17
- **Civ Details:**
  - ForgeClans: 2 cities, pop 21, power 109.88, 11 techs
  - JadeCovenant: 1 cities, pop 10, power 34.8, 9 techs

#### Stalled Game 3 (Tiny, seed 25025)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 9
- **Final Units:** 12
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 23
- **Civ Details:**
  - JadeCovenant: 2 cities, pop 21, power 50, 14 techs
  - ScholarKingdoms: 4 cities, pop 40, power 108.92, 20 techs

#### Stalled Game 4 (Tiny, seed 16016)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 16
- **Final Units:** 29
- **War Declarations:** 3
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 40
- **Civ Details:**
  - JadeCovenant: 8 cities, pop 77, power 334.84, 20 techs
  - ForgeClans: 6 cities, pop 60, power 215.2, 17 techs

#### Stalled Game 5 (Tiny, seed 28028)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 10
- **Final Units:** 20
- **War Declarations:** 2
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 20
- **Civ Details:**
  - JadeCovenant: 4 cities, pop 41, power 181.25333333333333, 16 techs
  - StarborneSeekers: 3 cities, pop 30, power 136, 16 techs

#### Stalled Game 6 (Tiny, seed 32032)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 11
- **Final Units:** 23
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 30
- **Civ Details:**
  - ForgeClans: 2 cities, pop 20, power 34.4, 7 techs
  - ScholarKingdoms: 7 cities, pop 56, power 192.00000000000003, 15 techs

#### Stalled Game 7 (Tiny, seed 29029)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 13
- **Final Units:** 28
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 28
- **Civ Details:**
  - ForgeClans: 5 cities, pop 45, power 100, 13 techs
  - ScholarKingdoms: 5 cities, pop 49, power 271.93333333333334, 20 techs

#### Stalled Game 8 (Tiny, seed 43043)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 25
- **War Declarations:** 2
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 38
- **Civ Details:**
  - RiverLeague: 6 cities, pop 55, power 226.66666666666669, 20 techs
  - ScholarKingdoms: 5 cities, pop 44, power 99, 19 techs

#### Stalled Game 9 (Tiny, seed 71071)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 10
- **Final Units:** 19
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 24
- **Civ Details:**
  - RiverLeague: 6 cities, pop 59, power 183, 20 techs
  - StarborneSeekers: 2 cities, pop 20, power 61.2, 14 techs

#### Stalled Game 10 (Tiny, seed 68068)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 13
- **Final Units:** 27
- **War Declarations:** 1
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 39
- **Civ Details:**
  - ScholarKingdoms: 3 cities, pop 25, power 94.75999999999999, 16 techs
  - RiverLeague: 8 cities, pop 72, power 366.3066666666667, 19 techs

#### Stalled Game 11 (Tiny, seed 74074)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 34
- **War Declarations:** 1
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 27
- **Civ Details:**
  - RiverLeague: 4 cities, pop 42, power 174, 19 techs
  - ScholarKingdoms: 7 cities, pop 63, power 247.39999999999998, 20 techs

#### Stalled Game 12 (Tiny, seed 84084)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 4
- **Final Units:** 25
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 25
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 20, power 102, 11 techs
  - RiverLeague: 1 cities, pop 11, power 38, 2 techs

#### Stalled Game 13 (Tiny, seed 92092)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 9
- **Final Units:** 25
- **War Declarations:** 4
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 23
- **Civ Details:**
  - JadeCovenant: 3 cities, pop 28, power 88.86666666666667, 8 techs
  - ScholarKingdoms: 3 cities, pop 25, power 111.4, 9 techs

#### Stalled Game 14 (Tiny, seed 105105)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 4
- **Final Units:** 16
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 23
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 22, power 53, 12 techs
  - StarborneSeekers: 2 cities, pop 20, power 55.666666666666664, 18 techs

#### Stalled Game 15 (Tiny, seed 102102)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 36
- **War Declarations:** 3
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 28
- **Civ Details:**
  - RiverLeague: 4 cities, pop 42, power 66.13333333333333, 20 techs
  - JadeCovenant: 8 cities, pop 76, power 514.36, 20 techs

#### Stalled Game 16 (Tiny, seed 106106)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 13
- **Final Units:** 33
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 55
- **Civ Details:**
  - ScholarKingdoms: 8 cities, pop 81, power 220.53333333333333, 20 techs
  - AetherianVanguard: 4 cities, pop 40, power 115, 20 techs

#### Stalled Game 17 (Small, seed 106006)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 13
- **Final Units:** 36
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 80
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 11, power 93.86666666666666, 6 techs
  - ForgeClans: 4 cities, pop 23, power 185, 11 techs
  - JadeCovenant: 5 cities, pop 28, power 134, 8 techs

#### Stalled Game 18 (Small, seed 112012)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 5
- **Final Units:** 46
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 25
- **Civ Details:**
  - ForgeClans: 2 cities, pop 20, power 101, 13 techs
  - ScholarKingdoms: 0 cities, pop 0, power 19, 0 techs
  - RiverLeague: 3 cities, pop 32, power 290.93333333333334, 8 techs

#### Stalled Game 19 (Small, seed 113013)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 2
- **Final Units:** 49
- **War Declarations:** 2
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 24
- **Civ Details:**
  - ScholarKingdoms: 1 cities, pop 11, power 39, 6 techs
  - ForgeClans: 1 cities, pop 10, power 156, 1 techs
  - RiverLeague: 0 cities, pop 0, power 14, 0 techs

#### Stalled Game 20 (Small, seed 136036)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 9
- **Final Units:** 38
- **War Declarations:** 4
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 37
- **Civ Details:**
  - JadeCovenant: 2 cities, pop 22, power 178, 8 techs
  - AetherianVanguard: 4 cities, pop 41, power 133.41333333333336, 20 techs
  - StarborneSeekers: 2 cities, pop 18, power 50, 10 techs

#### Stalled Game 21 (Small, seed 156056)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 18
- **Final Units:** 41
- **War Declarations:** 9
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 67
- **Civ Details:**
  - RiverLeague: 9 cities, pop 92, power 255.16, 20 techs
  - ScholarKingdoms: 4 cities, pop 40, power 186.41333333333333, 20 techs
  - ForgeClans: 4 cities, pop 39, power 152, 17 techs

#### Stalled Game 22 (Small, seed 202102)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 13
- **Final Units:** 38
- **War Declarations:** 9
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 44
- **Civ Details:**
  - ForgeClans: 6 cities, pop 56, power 243.53333333333333, 14 techs
  - JadeCovenant: 2 cities, pop 20, power 96, 11 techs
  - StarborneSeekers: 3 cities, pop 31, power 123.06666666666666, 19 techs

#### Stalled Game 23 (Small, seed 198098)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 13
- **Final Units:** 33
- **War Declarations:** 7
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 41
- **Civ Details:**
  - ForgeClans: 3 cities, pop 31, power 128, 10 techs
  - JadeCovenant: 3 cities, pop 31, power 59.8, 14 techs
  - ScholarKingdoms: 5 cities, pop 50, power 175.6, 19 techs

#### Stalled Game 24 (Standard, seed 201001)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 21
- **Final Units:** 43
- **War Declarations:** 7
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 66
- **Civ Details:**
  - StarborneSeekers: 1 cities, pop 11, power 12, 13 techs
  - ScholarKingdoms: 4 cities, pop 37, power 135, 9 techs
  - ForgeClans: 5 cities, pop 52, power 333.2933333333333, 14 techs
  - RiverLeague: 4 cities, pop 40, power 198.25333333333336, 17 techs

#### Stalled Game 25 (Standard, seed 205005)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 20
- **Final Units:** 46
- **War Declarations:** 19
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 62
- **Civ Details:**
  - RiverLeague: 3 cities, pop 32, power 90.26666666666667, 8 techs
  - JadeCovenant: 4 cities, pop 40, power 107.26666666666667, 11 techs
  - StarborneSeekers: 6 cities, pop 59, power 187, 20 techs
  - ScholarKingdoms: 2 cities, pop 20, power 114, 13 techs

#### Stalled Game 26 (Standard, seed 202002)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 24
- **Final Units:** 61
- **War Declarations:** 25
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 64
- **Civ Details:**
  - StarborneSeekers: 7 cities, pop 68, power 257.4, 20 techs
  - ScholarKingdoms: 3 cities, pop 30, power 79.2, 20 techs
  - ForgeClans: 6 cities, pop 60, power 268.56, 14 techs
  - RiverLeague: 5 cities, pop 50, power 218.24, 18 techs

#### Stalled Game 27 (Standard, seed 203003)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 23
- **Final Units:** 58
- **War Declarations:** 15
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 51
- **Civ Details:**
  - JadeCovenant: 5 cities, pop 50, power 128, 19 techs
  - RiverLeague: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - ForgeClans: 8 cities, pop 76, power 488.8, 20 techs
  - ScholarKingdoms: 7 cities, pop 66, power 208.06666666666666, 20 techs

#### Stalled Game 28 (Standard, seed 213013)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 19
- **Final Units:** 48
- **War Declarations:** 12
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 56
- **Civ Details:**
  - AetherianVanguard: 7 cities, pop 62, power 225.46666666666667, 18 techs
  - JadeCovenant: 6 cities, pop 61, power 301.36, 13 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 13 techs (ELIMINATED)
  - RiverLeague: 3 cities, pop 31, power 138.2, 20 techs

#### Stalled Game 29 (Standard, seed 223023)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 18
- **Final Units:** 54
- **War Declarations:** 4
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 44
- **Civ Details:**
  - AetherianVanguard: 3 cities, pop 30, power 219, 15 techs
  - ScholarKingdoms: 6 cities, pop 56, power 246, 19 techs
  - RiverLeague: 3 cities, pop 27, power 125.46666666666667, 8 techs
  - StarborneSeekers: 2 cities, pop 21, power 69.6, 17 techs

#### Stalled Game 30 (Standard, seed 235035)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 15
- **Final Units:** 41
- **War Declarations:** 4
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 57
- **Civ Details:**
  - JadeCovenant: 7 cities, pop 68, power 380.4, 20 techs
  - RiverLeague: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - ForgeClans: 4 cities, pop 41, power 189.26666666666665, 12 techs

#### Stalled Game 31 (Standard, seed 232032)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 20
- **Final Units:** 49
- **War Declarations:** 7
- **City Captures:** 23
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 57
- **Civ Details:**
  - AetherianVanguard: 5 cities, pop 51, power 216.93333333333334, 20 techs
  - RiverLeague: 4 cities, pop 42, power 228.93333333333334, 11 techs
  - ForgeClans: 6 cities, pop 56, power 257.5333333333333, 13 techs
  - StarborneSeekers: 1 cities, pop 10, power 19, 11 techs

#### Stalled Game 32 (Standard, seed 231031)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 19
- **Final Units:** 55
- **War Declarations:** 10
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 43
- **Civ Details:**
  - AetherianVanguard: 8 cities, pop 72, power 382.5333333333333, 20 techs
  - RiverLeague: 3 cities, pop 30, power 165, 11 techs
  - StarborneSeekers: 3 cities, pop 28, power 110.26666666666667, 17 techs
  - JadeCovenant: 1 cities, pop 11, power 101, 11 techs

#### Stalled Game 33 (Standard, seed 245045)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 42
- **War Declarations:** 12
- **City Captures:** 12
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 66
- **Civ Details:**
  - RiverLeague: 7 cities, pop 72, power 317, 19 techs
  - ForgeClans: 1 cities, pop 7, power 50, 8 techs
  - StarborneSeekers: 2 cities, pop 20, power 86.33333333333333, 18 techs
  - ScholarKingdoms: 5 cities, pop 47, power 165, 18 techs

#### Stalled Game 34 (Standard, seed 262062)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 13
- **Final Units:** 34
- **War Declarations:** 4
- **City Captures:** 2
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 57
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 21, power 33, 10 techs
  - RiverLeague: 7 cities, pop 70, power 269.37333333333333, 16 techs
  - ForgeClans: 1 cities, pop 9, power 11, 6 techs
  - ScholarKingdoms: 1 cities, pop 10, power 65.4, 12 techs

#### Stalled Game 35 (Standard, seed 263063)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 10
- **Final Units:** 49
- **War Declarations:** 10
- **City Captures:** 15
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 63
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - RiverLeague: 5 cities, pop 52, power 237, 11 techs
  - AetherianVanguard: 3 cities, pop 30, power 91.86666666666667, 13 techs
  - ForgeClans: 2 cities, pop 19, power 115, 9 techs

#### Stalled Game 36 (Standard, seed 266066)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 15
- **Final Units:** 39
- **War Declarations:** 3
- **City Captures:** 4
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 40
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - RiverLeague: 2 cities, pop 20, power 124.13333333333333, 7 techs
  - ForgeClans: 2 cities, pop 21, power 169, 11 techs
  - AetherianVanguard: 6 cities, pop 55, power 244.2, 14 techs

#### Stalled Game 37 (Standard, seed 277077)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 21
- **Final Units:** 46
- **War Declarations:** 5
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 83
- **Civ Details:**
  - StarborneSeekers: 1 cities, pop 11, power 53.4, 18 techs
  - AetherianVanguard: 4 cities, pop 32, power 131.10476190476192, 12 techs
  - JadeCovenant: 8 cities, pop 73, power 368.33333333333337, 20 techs
  - ForgeClans: 3 cities, pop 20, power 30, 10 techs

#### Stalled Game 38 (Standard, seed 282082)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 17
- **Final Units:** 58
- **War Declarations:** 17
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 59
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 29, power 59.46666666666667, 20 techs
  - JadeCovenant: 9 cities, pop 88, power 478.73333333333335, 20 techs
  - ScholarKingdoms: 1 cities, pop 10, power 35, 17 techs
  - AetherianVanguard: 3 cities, pop 30, power 117, 13 techs

#### Stalled Game 39 (Standard, seed 285085)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 15
- **Final Units:** 51
- **War Declarations:** 6
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 51
- **Civ Details:**
  - ForgeClans: 5 cities, pop 50, power 279.1333333333333, 14 techs
  - ScholarKingdoms: 4 cities, pop 22, power 148.33333333333331, 13 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - StarborneSeekers: 4 cities, pop 38, power 96, 19 techs

#### Stalled Game 40 (Standard, seed 290090)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 16
- **Final Units:** 71
- **War Declarations:** 11
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 39
- **Civ Details:**
  - JadeCovenant: 0 cities, pop 0, power 46.46666666666667, 6 techs
  - StarborneSeekers: 3 cities, pop 31, power 212, 14 techs
  - RiverLeague: 4 cities, pop 38, power 394.33333333333337, 11 techs
  - ScholarKingdoms: 5 cities, pop 44, power 150, 19 techs

#### Stalled Game 41 (Standard, seed 292092)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 23
- **Final Units:** 53
- **War Declarations:** 13
- **City Captures:** 11
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 79
- **Civ Details:**
  - JadeCovenant: 4 cities, pop 40, power 233, 11 techs
  - StarborneSeekers: 3 cities, pop 29, power 34.8, 20 techs
  - RiverLeague: 5 cities, pop 50, power 202.86666666666667, 20 techs
  - ForgeClans: 7 cities, pop 67, power 384.0666666666667, 18 techs

#### Stalled Game 42 (Standard, seed 295095)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 58
- **War Declarations:** 18
- **City Captures:** 12
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 82
- **Civ Details:**
  - RiverLeague: 1 cities, pop 11, power 40, 12 techs
  - ScholarKingdoms: 8 cities, pop 80, power 272, 20 techs
  - ForgeClans: 4 cities, pop 40, power 168.6, 11 techs
  - StarborneSeekers: 6 cities, pop 59, power 175.2, 20 techs

#### Stalled Game 43 (Standard, seed 298098)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 59
- **War Declarations:** 6
- **City Captures:** 11
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - ScholarKingdoms: 1 cities, pop 9, power 35, 19 techs
  - AetherianVanguard: 9 cities, pop 85, power 237, 20 techs
  - JadeCovenant: 3 cities, pop 30, power 199.26666666666665, 14 techs
  - RiverLeague: 5 cities, pop 49, power 318, 12 techs

#### Stalled Game 44 (Standard, seed 300100)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 18
- **Final Units:** 48
- **War Declarations:** 9
- **City Captures:** 11
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 49
- **Civ Details:**
  - JadeCovenant: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - AetherianVanguard: 8 cities, pop 81, power 260, 20 techs
  - ForgeClans: 5 cities, pop 48, power 309.79999999999995, 20 techs
  - RiverLeague: 2 cities, pop 20, power 95.66666666666667, 9 techs

#### Stalled Game 45 (Standard, seed 306106)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 19
- **Final Units:** 66
- **War Declarations:** 2
- **City Captures:** 8
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 49
- **Civ Details:**
  - AetherianVanguard: 3 cities, pop 31, power 235.73333333333335, 13 techs
  - RiverLeague: 5 cities, pop 50, power 278.24, 14 techs
  - ScholarKingdoms: 3 cities, pop 27, power 96, 13 techs
  - ForgeClans: 4 cities, pop 35, power 192, 12 techs

#### Stalled Game 46 (Standard, seed 312112)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 66
- **War Declarations:** 26
- **City Captures:** 12
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 53
- **Civ Details:**
  - JadeCovenant: 12 cities, pop 118, power 549.5333333333333, 20 techs
  - RiverLeague: 1 cities, pop 10, power 61.56, 11 techs
  - ScholarKingdoms: 6 cities, pop 55, power 217.48000000000002, 20 techs
  - StarborneSeekers: 1 cities, pop 10, power 39, 12 techs

#### Stalled Game 47 (Large, seed 301001)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 29
- **Final Units:** 66
- **War Declarations:** 28
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 76
- **Civ Details:**
  - AetherianVanguard: 6 cities, pop 62, power 277, 20 techs
  - ForgeClans: 5 cities, pop 49, power 272.5333333333333, 20 techs
  - RiverLeague: 4 cities, pop 41, power 166.53333333333333, 17 techs
  - ScholarKingdoms: 4 cities, pop 42, power 201, 20 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - StarborneSeekers: 2 cities, pop 18, power 131.53333333333333, 13 techs

#### Stalled Game 48 (Large, seed 306006)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 22
- **Final Units:** 62
- **War Declarations:** 19
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 86
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - ScholarKingdoms: 1 cities, pop 11, power 60.6, 16 techs
  - StarborneSeekers: 1 cities, pop 9, power 24, 11 techs
  - ForgeClans: 7 cities, pop 73, power 408.6, 20 techs
  - RiverLeague: 6 cities, pop 56, power 168.93333333333334, 14 techs
  - JadeCovenant: 2 cities, pop 20, power 129.69333333333333, 18 techs

#### Stalled Game 49 (Large, seed 314014)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 21
- **Final Units:** 62
- **War Declarations:** 33
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 101
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 19, power 59, 11 techs
  - RiverLeague: 2 cities, pop 20, power 76, 18 techs
  - JadeCovenant: 2 cities, pop 20, power 114.13333333333333, 9 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 17 techs (ELIMINATED)
  - ScholarKingdoms: 3 cities, pop 28, power 78, 17 techs
  - ForgeClans: 6 cities, pop 58, power 312.06666666666666, 14 techs

#### Stalled Game 50 (Large, seed 316016)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 25
- **Final Units:** 64
- **War Declarations:** 34
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 79
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - StarborneSeekers: 3 cities, pop 31, power 165, 20 techs
  - JadeCovenant: 2 cities, pop 22, power 72, 8 techs
  - ScholarKingdoms: 2 cities, pop 22, power 71.2, 10 techs
  - AetherianVanguard: 7 cities, pop 71, power 298.66666666666663, 20 techs
  - ForgeClans: 4 cities, pop 39, power 219.68, 12 techs

#### Stalled Game 51 (Large, seed 315015)
- **Turn Reached:** 451
- **Surviving Civs:** 3
- **Final Cities:** 29
- **Final Units:** 74
- **War Declarations:** 23
- **City Captures:** 20
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 61
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - JadeCovenant: 9 cities, pop 90, power 540, 20 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 16 techs (ELIMINATED)
  - RiverLeague: 8 cities, pop 81, power 393, 20 techs
  - ForgeClans: 5 cities, pop 50, power 221.6, 20 techs

#### Stalled Game 52 (Large, seed 356056)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 53
- **War Declarations:** 18
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 45
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 19, power 67, 10 techs
  - JadeCovenant: 5 cities, pop 48, power 182.46666666666667, 16 techs
  - StarborneSeekers: 3 cities, pop 28, power 109.80000000000001, 20 techs
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ScholarKingdoms: 5 cities, pop 48, power 206.2, 20 techs
  - ForgeClans: 0 cities, pop 0, power 0, 0 techs (ELIMINATED)

#### Stalled Game 53 (Large, seed 358058)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 24
- **Final Units:** 54
- **War Declarations:** 5
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 65
- **Civ Details:**
  - JadeCovenant: 10 cities, pop 99, power 485.4, 20 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 15, power 109.26666666666667, 8 techs
  - ScholarKingdoms: 2 cities, pop 13, power 40, 7 techs
  - RiverLeague: 2 cities, pop 13, power 45, 6 techs
  - ForgeClans: 1 cities, pop 11, power 65.53333333333333, 13 techs

#### Stalled Game 54 (Large, seed 365065)
- **Turn Reached:** 451
- **Surviving Civs:** 3
- **Final Cities:** 18
- **Final Units:** 44
- **War Declarations:** 13
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 57
- **Civ Details:**
  - ForgeClans: 5 cities, pop 49, power 236, 18 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - RiverLeague: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - AetherianVanguard: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - JadeCovenant: 5 cities, pop 50, power 218.8, 14 techs
  - ScholarKingdoms: 2 cities, pop 22, power 84.13333333333333, 10 techs

#### Stalled Game 55 (Large, seed 360060)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 28
- **Final Units:** 63
- **War Declarations:** 29
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 73
- **Civ Details:**
  - RiverLeague: 11 cities, pop 106, power 513.9333333333334, 20 techs
  - StarborneSeekers: 3 cities, pop 27, power 53.333333333333336, 13 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - JadeCovenant: 2 cities, pop 21, power 128, 15 techs
  - AetherianVanguard: 4 cities, pop 39, power 118, 18 techs
  - ForgeClans: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)

#### Stalled Game 56 (Large, seed 401101)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 20
- **Final Units:** 58
- **War Declarations:** 37
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 70
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 28, power 75, 18 techs
  - JadeCovenant: 2 cities, pop 20, power 98.81333333333333, 18 techs
  - RiverLeague: 5 cities, pop 51, power 272, 17 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 20, power 77.6, 15 techs
  - ForgeClans: 3 cities, pop 28, power 78.06666666666666, 7 techs

#### Stalled Game 57 (Huge, seed 403003)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 22
- **Final Units:** 78
- **War Declarations:** 10
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 107
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 20, power 194.01333333333332, 15 techs
  - RiverLeague: 3 cities, pop 33, power 191.04, 10 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - JadeCovenant: 3 cities, pop 24, power 123.6, 9 techs
  - ScholarKingdoms: 3 cities, pop 24, power 81, 17 techs
  - ForgeClans: 4 cities, pop 39, power 265.15999999999997, 12 techs

#### Stalled Game 58 (Huge, seed 418018)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 21
- **Final Units:** 65
- **War Declarations:** 6
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 74
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 13 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 18, power 96, 8 techs
  - JadeCovenant: 1 cities, pop 11, power 11, 6 techs
  - StarborneSeekers: 1 cities, pop 11, power 12, 17 techs
  - ForgeClans: 4 cities, pop 40, power 286.5866666666667, 20 techs
  - RiverLeague: 5 cities, pop 45, power 210.68, 11 techs

#### Stalled Game 59 (Huge, seed 464064)
- **Turn Reached:** 501
- **Surviving Civs:** 4
- **Final Cities:** 32
- **Final Units:** 76
- **War Declarations:** 31
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 95
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 15 techs (ELIMINATED)
  - ForgeClans: 5 cities, pop 48, power 293.38666666666666, 18 techs
  - AetherianVanguard: 3 cities, pop 31, power 156.53333333333333, 20 techs
  - JadeCovenant: 3 cities, pop 28, power 106, 14 techs
  - RiverLeague: 10 cities, pop 100, power 504.8666666666667, 20 techs

## 11. Map Size Analysis

### Tiny Maps
- **Simulations:** 120
- **Victories:** 104 (86.7%)
  - Conquest: 88, Progress: 16
- **Average Victory Turn:** 229.8
- **Victory Turn Range:** [38, 383]

### Small Maps
- **Simulations:** 120
- **Victories:** 113 (94.2%)
  - Conquest: 100, Progress: 13
- **Average Victory Turn:** 201.3
- **Victory Turn Range:** [29, 398]

### Standard Maps
- **Simulations:** 120
- **Victories:** 97 (80.8%)
  - Conquest: 48, Progress: 49
- **Average Victory Turn:** 310.1
- **Victory Turn Range:** [153, 397]

### Large Maps
- **Simulations:** 120
- **Victories:** 110 (91.7%)
  - Conquest: 13, Progress: 97
- **Average Victory Turn:** 367.0
- **Victory Turn Range:** [245, 447]

### Huge Maps
- **Simulations:** 120
- **Victories:** 117 (97.5%)
  - Conquest: 12, Progress: 105
- **Average Victory Turn:** 375.6
- **Victory Turn Range:** [207, 479]

## 12. Balance Observations

### Victory Timing vs Pop 10
- Average Victory Turn: 297.7
- Average Pop 10 Turn: 334.0
- **Gap:** 36.4 turns (Pop 10 happens AFTER victory)

### Civilization Balance
- Highest Win Rate: ScholarKingdoms (26.8%)
- Lowest Win Rate: JadeCovenant (15.3%)
- **Win Rate Spread:** 11.4 percentage points

### Settler Survival
- Settlers Produced: 9050
- Settlers Killed: 2029
- **Settler Survival Rate:** 77.6%

