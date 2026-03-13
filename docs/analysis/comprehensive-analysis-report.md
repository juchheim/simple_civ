# Comprehensive Simulation Analysis Report

**Date:** 2026-03-13
**Simulations:** 600 total (Tiny: 120, Small: 120, Standard: 120, Large: 120, Huge: 120) (AI vs AI)
**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)

## Titan Analysis
- **Total Titans Spawned:** 227
- **Average Spawn Turn:** 214.3
- **Median Spawn Turn:** 195
- **Spawn Turn Range:** [99, 476]
- **Average Units on Creation:** 12.6
- **Median Units on Creation:** 12
- **Range:** [5, 31]

---

## 1. Victory Analysis

### Overall Statistics
- **Total Victories:** 525 of 600 (87.5%)
- **Average Victory Turn:** 293.0
- **Median Victory Turn:** 311
- **Victory Turn Range:** [29, 499]

### Victory Types
- **Conquest:** 294 (49.0%)
- **Progress:** 231 (38.5%)
- **None:** 75 (12.5%)

### Victories by Civilization (with Victory Type Breakdown)
- **AetherianVanguard:** 107 wins (25.1% of games played)
  - Conquest: 89, Progress: 18
- **StarborneSeekers:** 101 wins (24.0% of games played)
  - Conquest: 19, Progress: 82
- **ForgeClans:** 85 wins (20.5% of games played)
  - Conquest: 49, Progress: 36
- **RiverLeague:** 84 wins (20.0% of games played)
  - Conquest: 52, Progress: 32
- **ScholarKingdoms:** 74 wins (17.5% of games played)
  - Conquest: 30, Progress: 44
- **JadeCovenant:** 74 wins (17.7% of games played)
  - Conquest: 55, Progress: 19

## 2. Warfare Analysis

### War Statistics
- **Total Unique Wars:** 3446
- **Total Peace Treaties:** 3355
- **Average Wars per Game:** 5.7

### War Durations
- **Total Wars Tracked:** 3446
- **Average Duration:** 108.7 turns
- **Median Duration:** 77 turns
- **Range:** [0, 477] turns

### War Initiation by Civilization
- **ForgeClans:** Initiated 723 (1.7/game), Received 429 (1.0/game)
- **ScholarKingdoms:** Initiated 661 (1.6/game), Received 511 (1.2/game)
- **RiverLeague:** Initiated 677 (1.6/game), Received 475 (1.1/game)
- **AetherianVanguard:** Initiated 518 (1.2/game), Received 579 (1.4/game)
- **StarborneSeekers:** Initiated 335 (0.8/game), Received 857 (2.0/game)
- **JadeCovenant:** Initiated 532 (1.3/game), Received 595 (1.4/game)

### War-to-Win Conversion by Civilization
- **ForgeClans:** 264/1367 initiated wars led to captures (19.3%), 0.32 cities per initiated war, 0.05 eliminations per initiated war, 82/206 wins after any capture (39.8%), 28/36 Progress wins after prior captures
- **ScholarKingdoms:** 155/1186 initiated wars led to captures (13.1%), 0.19 cities per initiated war, 0.03 eliminations per initiated war, 50/164 wins after any capture (30.5%), 15/44 Progress wins after prior captures
- **RiverLeague:** 266/1250 initiated wars led to captures (21.3%), 0.33 cities per initiated war, 0.06 eliminations per initiated war, 81/205 wins after any capture (39.5%), 25/32 Progress wins after prior captures
- **AetherianVanguard:** 255/735 initiated wars led to captures (34.7%), 0.67 cities per initiated war, 0.12 eliminations per initiated war, 105/233 wins after any capture (45.1%), 14/18 Progress wins after prior captures
- **StarborneSeekers:** 98/512 initiated wars led to captures (19.1%), 0.26 cities per initiated war, 0.04 eliminations per initiated war, 57/143 wins after any capture (39.9%), 27/82 Progress wins after prior captures
- **JadeCovenant:** 207/1038 initiated wars led to captures (19.9%), 0.30 cities per initiated war, 0.05 eliminations per initiated war, 72/199 wins after any capture (36.2%), 14/19 Progress wins after prior captures

### ForgeClans Conversion Focus
- **Average Declaration Power Ratio:** 2.50
- **Median Turns from Declared War to First Capture:** 37.0
- **Median First Capture Turn:** wins 200.5, losses 243.0
- **Median 25-Turn Capture Burst:** wins 1.5, losses 1.0
- **First-Capture Win Rate:** 55/97 (56.7%)
- **Progress Wins With Prior Captures:** 28/36 (77.8%), avg 2.0 captures before first progress project

## 3. Unit Combat Analysis

### Unit Deaths
- **Total Units Killed:** 84659
- **Average per Game:** 141.1

### Deaths by Unit Type
- **SpearGuard:** 21160 deaths (20693 produced, 19199 of produced died, 7.2% produced survival)
- **BowGuard:** 17140 deaths (18298 produced, 16793 of produced died, 8.2% produced survival)
- **Trebuchet:** 9560 deaths (11870 produced, 9560 of produced died, 19.5% produced survival)
- **ArmyBowGuard:** 8607 deaths (12901 produced, 8606 of produced died, 33.3% produced survival)
- **ArmySpearGuard:** 6100 deaths (9420 produced, 6099 of produced died, 35.3% produced survival)
- **NativeArcher:** 4712 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **ArmyRiders:** 3999 deaths (5896 produced, 3999 of produced died, 32.2% produced survival)
- **Scout:** 3137 deaths (740 produced, 702 of produced died, 5.1% produced survival)
- **Lorekeeper:** 2588 deaths (5099 produced, 2588 of produced died, 49.2% produced survival)
- **NativeChampion:** 2396 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **Settler:** 1947 deaths (8838 produced, 1930 of produced died, 78.2% produced survival)
- **Landship:** 1888 deaths (6003 produced, 1888 of produced died, 68.5% produced survival)
- **Riders:** 1283 deaths (1483 produced, 1283 of produced died, 13.5% produced survival)
- **Titan:** 140 deaths (227 produced, 140 of produced died, 38.3% produced survival)
- **Airship:** 2 deaths (487 produced, 2 of produced died, 99.6% produced survival)

### Unit Production by Type
- **SpearGuard:** 20693 produced
- **BowGuard:** 18298 produced
- **ArmyBowGuard:** 12901 produced
- **Trebuchet:** 11870 produced
- **ArmySpearGuard:** 9420 produced
- **Settler:** 8838 produced
- **Landship:** 6003 produced
- **ArmyRiders:** 5896 produced
- **Lorekeeper:** 5099 produced
- **Riders:** 1483 produced
- **Scout:** 740 produced
- **Airship:** 487 produced
- **Titan:** 227 produced

## 4. City Growth & Development

### City Statistics
- **Total Cities Founded:** 10785
- **Total Cities Captured:** 3063
- **Total Cities Razed:** 270
- **Cities Reaching Pop 10:** 3305

### Population Milestones (Average Turn)
- **Pop 3:** 120.2 (7930 cities)
- **Pop 5:** 145.1 (7679 cities)
- **Pop 7:** 174.7 (7248 cities)
- **Pop 10:** 336.1 (3305 cities) [Range: 125-499]

### City Activity by Civilization
- **ForgeClans:** Founded 1396 (3.4/game), Captured 607, Lost 528
- **ScholarKingdoms:** Founded 1611 (3.8/game), Captured 342, Lost 440
- **RiverLeague:** Founded 1430 (3.4/game), Captured 547, Lost 548
- **AetherianVanguard:** Founded 1416 (3.3/game), Captured 807, Lost 552
- **StarborneSeekers:** Founded 1257 (3.0/game), Captured 264, Lost 498
- **JadeCovenant:** Founded 1483 (3.6/game), Captured 496, Lost 471

## 5. Technology Progression

### Tech Statistics
- **Total Techs Researched:** 28822
- **Average per Game:** 48.0
- **Total Techs in Tree:** 20

### Tech Tree Completion Rate by Civilization
- **ForgeClans:** 55.7% average tree completion
- **ScholarKingdoms:** 62.4% average tree completion
- **RiverLeague:** 53.2% average tree completion
- **AetherianVanguard:** 57.8% average tree completion
- **StarborneSeekers:** 61.9% average tree completion
- **JadeCovenant:** 56.0% average tree completion

### Tech Timing (Average Turn Researched)
- **ScriptLore:** Turn 54.1
- **Fieldcraft:** Turn 65.5
- **FormationTraining:** Turn 83.2
- **StoneworkHalls:** Turn 107.0
- **DrilledRanks:** Turn 129.5
- **Wellworks:** Turn 129.9
- **ArmyDoctrine:** Turn 187.1
- **ScholarCourts:** Turn 190.1
- **UrbanPlans:** Turn 213.9
- **TimberMills:** Turn 229.8
- **SignalRelay:** Turn 235.3
- **CityWards:** Turn 235.5
- **CompositeArmor:** Turn 242.3
- **StarCharts:** Turn 260.1
- **SteamForges:** Turn 268.8
- **TrailMaps:** Turn 277.0
- **PlasmaShields:** Turn 291.6
- **ZeroPointEnergy:** Turn 295.1
- **Aerodynamics:** Turn 314.7
- **DimensionalGate:** Turn 331.5

## 6. Project Completion

### Project Statistics
- **Total Projects Completed:** 2449
- **Average per Game:** 4.1

### Project Breakdown
- **Progress Chain (Observatory/Academy/Experiment):** 1527
- **Unique Building Markers:** 922

### Progress Chain Timing
- **Observatory:** 793 completions, avg turn 298.3
- **GrandAcademy:** 501 completions, avg turn 335.7
- **GrandExperiment:** 233 completions, avg turn 370.8

### Army Unit Production
- **ArmySpearGuard:** 9420 produced, 6100 killed (35.2% survival)
- **ArmyBowGuard:** 12901 produced, 8607 killed (33.3% survival)
- **ArmyRiders:** 5896 produced, 3999 killed (32.2% survival)
- **Total Army Units:** 28217 produced, 18706 killed

## 7. Building Construction

### Buildings by Type
- **TradingPost:** 7591 built (avg turn 135.5)
- **MarketHall:** 6483 built (avg turn 186.7)
- **Bank:** 2265 built (avg turn 251.0)
- **Exchange:** 1051 built (avg turn 294.7)
- **Bulwark:** 695 built (avg turn 74.9)
- **ShieldGenerator:** 418 built (avg turn 275.7)

## 8. Civilization Performance

### Win Rates & Statistics

#### AetherianVanguard
- **Games Played:** 426
- **Wins:** 107 (25.1% win rate)
  - Conquest: 89, Progress: 18
- **Eliminations:** 72
- **Avg Cities:** 3.9
- **Avg Population:** 32.9
- **Avg Techs:** 11.5
- **Avg Projects:** 0.9
- **Avg Military Power:** 134.0

#### StarborneSeekers
- **Games Played:** 421
- **Wins:** 101 (24.0% win rate)
  - Conquest: 19, Progress: 82
- **Eliminations:** 94
- **Avg Cities:** 2.3
- **Avg Population:** 21.0
- **Avg Techs:** 12.3
- **Avg Projects:** 2.0
- **Avg Military Power:** 58.7

#### ForgeClans
- **Games Played:** 415
- **Wins:** 85 (20.5% win rate)
  - Conquest: 49, Progress: 36
- **Eliminations:** 66
- **Avg Cities:** 3.5
- **Avg Population:** 30.9
- **Avg Techs:** 11.0
- **Avg Projects:** 0.5
- **Avg Military Power:** 157.8

#### RiverLeague
- **Games Played:** 419
- **Wins:** 84 (20.0% win rate)
  - Conquest: 52, Progress: 32
- **Eliminations:** 88
- **Avg Cities:** 3.3
- **Avg Population:** 30.1
- **Avg Techs:** 10.4
- **Avg Projects:** 0.5
- **Avg Military Power:** 139.7

#### ScholarKingdoms
- **Games Played:** 422
- **Wins:** 74 (17.5% win rate)
  - Conquest: 30, Progress: 44
- **Eliminations:** 51
- **Avg Cities:** 3.5
- **Avg Population:** 31.0
- **Avg Techs:** 12.4
- **Avg Projects:** 1.4
- **Avg Military Power:** 129.3

#### JadeCovenant
- **Games Played:** 417
- **Wins:** 74 (17.7% win rate)
  - Conquest: 55, Progress: 19
- **Eliminations:** 71
- **Avg Cities:** 3.5
- **Avg Population:** 31.7
- **Avg Techs:** 11.1
- **Avg Projects:** 0.4
- **Avg Military Power:** 142.1

## 9. City-State Systems

### Telemetry Coverage
- **Simulations with City-State Telemetry:** 600/600
- **Simulations Missing City-State Telemetry:** 0
- **Total City-States Created:** 2192
- **Average City-States Created per Telemetry Sim:** 3.65
- **Average Surviving City-States at Game End (Telemetry Sims):** 3.60

### Activation & Turnover
- **Total City-State Active Turns:** 365275
- **First City-State Creation Turn (min / p25 / median / p75 / max):** 35 / 89 / 113 / 148 / 345
- **First City-State Creation Turn (average, sims with any):** 124.4
- **Global Suzerainty Flip Rate:** 0.35 per 100 active turns
- **True Ownership Turnover Rate:** 0.34 per 100 active turns
- **Average Unique Suzerains per City-State:** 1.25
- **Total Contested Turns:** 2893 (No Suz: 225, Close-race: 2668)
- **Contested Share of Active Turns:** 0.79%
- **Turnover-Window Turns:** 227256 (62.22% of active turns)
- **Flip-Window Turns:** 220873 (60.47% of active turns)
- **Safe-Lead Incumbent Turns:** 156644 (42.88% of active turns)
- **Hotspot Turns:** 2939 (0.80% of active turns)
- **Passive Contestation Pulses:** 123013
- **Passive Contestation Close-Race Pulses:** 100430
- **City-States with Zero Suzerainty Flips:** 1678/2192
- **Contested-but-Zero-Flip City-States:** 618/2192
- **Top 4 City-States Share of True Ownership Turnovers:** 7.2%
- **True Ownership Turnover Rate Outside Top 4 Turnover City-States:** 0.32 per 100 active turns
- **Top Turnover City-States:** Halcyon Loom [Huge 503103] (29 ownership, 29 total), Lunarchive [Large 416116] (26 ownership, 26 total), Sapphire Mnemos [Huge 439039] (19 ownership, 19 total), Rainpetal Court [Huge 402002] (16 ownership, 16 total)

### Camp-Clearing Activation Funnel
- **Camp-Clearing Episodes:** 25193
- **Direct Starts in Ready:** 9817 (39.0%)
- **Episodes Reaching Ready:** 15059 (59.8%)
- **Episodes with Sighting Telemetry:** 14004 (55.6%)
- **Sighted -> Prep Start (avg / median):** 104.28 / 84 turns
- **Prep Start -> Ready (avg / median):** 2.76 / 0 turns
- **Prep Start -> Self Clear (avg / median):** 13.92 / 10 turns
- **Total Prep Duration (avg / median):** 7.80 / 0 turns
- **Timeouts After Ready:** 831 (19.4% of timeouts)
- **Ready Turn Diagnostics:** no contact 30459, adjacent contact 4681, attack opportunity 15468, stalled opportunity 8684, power disadvantage 9615, progress 9050
- **Ready-Timeout Primary Breakdown:** no contact 520, declined attack 184, power collapse 127, other 0
- **War-Interrupted Episodes:** 7573 (30.1%)
- **Cleared-By-Other Breakdown:** lacked military 177, late start 394, other 213
- **Episode Outcomes:** ClearedBySelf 2066, ClearedByOther 784, TimedOut 4288, WartimeEmergencyCancelled 7573, OtherCancelled 10152, StillActive 330
- **Readiness Breakdown:** PreArmy 90/5035 clears, 1954 timeouts, ArmyTech 770/12951 clears, 1597 timeouts, ArmyFielded 1206/7207 clears, 737 timeouts

### Investment Mix
- **Total City-State Investment:** 6883901G across 102138 actions
- **Maintenance Investment:** 1597141G (23.2%) across 43081 actions (42.2%)
- **Challenger Investment:** 5286760G (76.8%) across 59057 actions (57.8%)
- **Maintenance Gold per Suzerainty Turn:** 4.38
- **Maintenance Actions per 100 Suzerainty Turns:** 11.80

### Turnover Diagnostics
- **Turnover-Window Challenger Investment:** 5115630G across 55649 actions
- **Flip-Window Challenger Investment:** 5038952G across 54707 actions
- **Deep-Challenge Investment:** 170913G across 3404 actions
- **Neutral-Claim Investment:** 217G across 4 actions
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
- **Passive-Assisted Suzerainty Changes:** 375 (29.7% of non-passive changes)
- **Passive-Assisted True Ownership Turnovers:** 370 (29.6% of ownership turnover)
- **Passive-Assisted Ownership Conversion per 100 Close-Race Pulses:** 0.37
- **Passive-Involved Ownership Conversion per 100 Close-Race Pulses:** 0.37
- **Passive-Assisted Ownership Causes:** Investment 3, WartimeRelease 332, Other 35
- **Pair-Fatigue-Triggered Investment:** 217057G across 2883 actions
- **Pair-Fatigue Share of Challenger Spend:** 4.1%
- **Safe-Maintenance Investment:** 290G across 9 actions
- **Focus Turns:** 281034 (challenge 231388, maintenance 49646)
- **Focus Assignments / Switches:** 4627 / 521
- **Flip Conversion per 100 Turnover-Window Turns:** 0.56
- **True Ownership Conversion per 100 Turnover-Window Turns:** 0.55
- **Safe-Maintenance Share of Maintenance Spend:** 0.0%

### Flip Cause Summary
- **Investment:** 623 suzerainty changes, 621 true ownership turnovers (49.7% of ownership turnover)
- **PassiveContestation:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **WartimeRelease:** 352 suzerainty changes, 346 true ownership turnovers (27.7% of ownership turnover)
- **WarBreak:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **Other:** 287 suzerainty changes, 283 true ownership turnovers (22.6% of ownership turnover)

### Hotspot Diagnostics
- **Hotspot Share of Active Turns:** 0.80%
- **City-State Instances with Any Hotspot Time:** 85/2192
- **True Ownership Turnovers Occurring in Hotspot Instances:** 732/1250
- **Flip Causes:** Investment 623, WartimeRelease 352, Other 287
- **Ownership Causes:** Investment 621, WartimeRelease 346, Other 283
- **Top Hotspot Instances:** Halcyon Loom [Huge 503103] (29 ownership, hotspot 49.5%, fatigue 5813G/50, JadeCovenant <> ForgeClans 18, ForgeClans <> ScholarKingdoms 9, JadeCovenant <> ScholarKingdoms 2); Lunarchive [Large 416116] (26 ownership, hotspot 27.6%, fatigue 1319G/19, ForgeClans <> RiverLeague 12, ForgeClans <> ScholarKingdoms 7, ScholarKingdoms <> RiverLeague 7); Sapphire Mnemos [Huge 439039] (19 ownership, hotspot 59.5%, fatigue 6226G/31, ScholarKingdoms <> JadeCovenant 19); Saffron Treasury [Huge 467067] (16 ownership, hotspot 94.9%, fatigue 6838G/55, ForgeClans <> ScholarKingdoms 16); Rainpetal Court [Huge 402002] (16 ownership, hotspot 7.2%, fatigue 2637G/14, AetherianVanguard <> StarborneSeekers 16); Eclipsed Theorem [Large 414114] (15 ownership, hotspot 31.3%, fatigue 3058G/31, AetherianVanguard <> StarborneSeekers 14, AetherianVanguard <> ForgeClans 1)

### Map-Size City-State Activation
- **Tiny:** 93/120 sims with >=1 city-state (77.5%), avg created 1.30, avg first CS turn 144.1
- **Small:** 84/120 sims with >=1 city-state (70.0%), avg created 1.31, avg first CS turn 132.5
- **Standard:** 117/120 sims with >=1 city-state (97.5%), avg created 3.21, avg first CS turn 116.4
- **Large:** 120/120 sims with >=1 city-state (100.0%), avg created 5.75, avg first CS turn 107.4
- **Huge:** 118/120 sims with >=1 city-state (98.3%), avg created 6.70, avg first CS turn 128.4

### Yield-Type Turnover Summary
- **Science:** 554 city-states, contested 0.75% (No Suz 0.04%, Close-race 0.71%), turnover window 64.81%, flip window 63.03%, safe lead 40.09%, hotspot 1.15%, flip rate 0.44/100T, ownership turnover 0.44/100T, avg unique suzerains 1.25
- **Production:** 534 city-states, contested 0.96% (No Suz 0.19%, Close-race 0.77%), turnover window 61.43%, flip window 59.65%, safe lead 43.74%, hotspot 0.71%, flip rate 0.34/100T, ownership turnover 0.34/100T, avg unique suzerains 1.27
- **Food:** 552 city-states, contested 0.74% (No Suz 0.00%, Close-race 0.74%), turnover window 63.57%, flip window 61.85%, safe lead 41.76%, hotspot 0.77%, flip rate 0.33/100T, ownership turnover 0.33/100T, avg unique suzerains 1.24
- **Gold:** 552 city-states, contested 0.72% (No Suz 0.02%, Close-race 0.70%), turnover window 59.03%, flip window 57.32%, safe lead 45.95%, hotspot 0.59%, flip rate 0.27/100T, ownership turnover 0.27/100T, avg unique suzerains 1.23

### Suzerainty vs Winning (Directional)
- **Winner Average Suzerainty Turns:** 203.64
- **Non-Winner Average Suzerainty Turns:** 129.39
- **Winners with Any Suzerainty:** 378/525 (72.0%)
- **Participant Win Rate with Any Suzerainty:** 25.3%
- **Participant Win Rate without Suzerainty:** 14.4%

## 10. Stalls & Issues

### Games Without Victory
- **Count:** 75 of 600 (12.5%)

### Stall Diagnostics

#### Stalled Game 1 (Tiny, seed 16016)
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

#### Stalled Game 2 (Tiny, seed 35035)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 13
- **War Declarations:** 4
- **City Captures:** 1
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 15
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 10, power 27.46666666666667, 8 techs
  - ScholarKingdoms: 3 cities, pop 30, power 107.2, 11 techs

#### Stalled Game 3 (Tiny, seed 30030)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 7
- **Final Units:** 21
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 40
- **Civ Details:**
  - ScholarKingdoms: 3 cities, pop 29, power 109, 9 techs
  - ForgeClans: 3 cities, pop 31, power 146, 12 techs

#### Stalled Game 4 (Tiny, seed 47047)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 7
- **Final Units:** 23
- **War Declarations:** 2
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 39
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 20, power 60.93333333333333, 13 techs
  - JadeCovenant: 5 cities, pop 48, power 195.84, 20 techs

#### Stalled Game 5 (Tiny, seed 43043)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 28
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 28
- **Civ Details:**
  - RiverLeague: 6 cities, pop 55, power 181.8, 20 techs
  - ScholarKingdoms: 5 cities, pop 45, power 167, 20 techs

#### Stalled Game 6 (Tiny, seed 53053)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 31
- **War Declarations:** 2
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 23
- **Civ Details:**
  - ForgeClans: 8 cities, pop 67, power 378.3333333333333, 15 techs
  - RiverLeague: 3 cities, pop 31, power 112, 20 techs

#### Stalled Game 7 (Tiny, seed 72072)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 7
- **Final Units:** 22
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 24
- **Civ Details:**
  - ScholarKingdoms: 4 cities, pop 38, power 191.53333333333336, 14 techs
  - StarborneSeekers: 1 cities, pop 11, power 35, 6 techs

#### Stalled Game 8 (Tiny, seed 76076)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 12
- **Final Units:** 25
- **War Declarations:** 6
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 36
- **Civ Details:**
  - ScholarKingdoms: 5 cities, pop 49, power 219, 18 techs
  - AetherianVanguard: 5 cities, pop 48, power 121, 13 techs

#### Stalled Game 9 (Tiny, seed 74074)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 15
- **Final Units:** 36
- **War Declarations:** 3
- **City Captures:** 2
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 37
- **Civ Details:**
  - RiverLeague: 8 cities, pop 79, power 423.9333333333333, 20 techs
  - ScholarKingdoms: 4 cities, pop 38, power 146.06666666666666, 16 techs

#### Stalled Game 10 (Tiny, seed 107107)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 5
- **Final Units:** 16
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 28
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 20, power 63.8, 12 techs
  - StarborneSeekers: 3 cities, pop 29, power 60, 18 techs

#### Stalled Game 11 (Tiny, seed 118118)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 12
- **Final Units:** 20
- **War Declarations:** 4
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 35
- **Civ Details:**
  - JadeCovenant: 3 cities, pop 28, power 113, 10 techs
  - ForgeClans: 6 cities, pop 46, power 184.66666666666666, 13 techs

#### Stalled Game 12 (Tiny, seed 117117)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 12
- **Final Units:** 30
- **War Declarations:** 1
- **City Captures:** 13
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - RiverLeague: 7 cities, pop 63, power 309, 18 techs
  - ForgeClans: 3 cities, pop 28, power 88.73333333333333, 12 techs

#### Stalled Game 13 (Small, seed 104004)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 7
- **Final Units:** 38
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 21
- **Civ Details:**
  - ForgeClans: 3 cities, pop 31, power 232.46666666666667, 13 techs
  - ScholarKingdoms: 2 cities, pop 21, power 88.4, 7 techs
  - StarborneSeekers: 1 cities, pop 10, power 28, 6 techs

#### Stalled Game 14 (Small, seed 106006)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 14
- **Final Units:** 39
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 26
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 19, power 84.6, 8 techs
  - ForgeClans: 4 cities, pop 34, power 232, 12 techs
  - JadeCovenant: 5 cities, pop 44, power 140, 12 techs

#### Stalled Game 15 (Small, seed 112012)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 8
- **Final Units:** 45
- **War Declarations:** 3
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 30
- **Civ Details:**
  - ForgeClans: 4 cities, pop 40, power 423, 16 techs
  - ScholarKingdoms: 0 cities, pop 0, power 14, 0 techs
  - RiverLeague: 3 cities, pop 32, power 157.44, 19 techs

#### Stalled Game 16 (Small, seed 113013)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 4
- **Final Units:** 30
- **War Declarations:** 3
- **City Captures:** 1
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 31
- **Civ Details:**
  - ScholarKingdoms: 1 cities, pop 11, power 31, 7 techs
  - ForgeClans: 1 cities, pop 10, power 59, 1 techs
  - RiverLeague: 2 cities, pop 19, power 26, 6 techs

#### Stalled Game 17 (Small, seed 116016)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 4
- **Final Units:** 35
- **War Declarations:** 0
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 8
- **Civ Details:**
  - JadeCovenant: 2 cities, pop 21, power 74, 7 techs
  - ScholarKingdoms: 1 cities, pop 10, power 39, 9 techs
  - StarborneSeekers: 1 cities, pop 10, power 29, 10 techs

#### Stalled Game 18 (Small, seed 141041)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 19
- **Final Units:** 42
- **War Declarations:** 9
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 36
- **Civ Details:**
  - JadeCovenant: 5 cities, pop 49, power 183.33333333333334, 11 techs
  - StarborneSeekers: 6 cities, pop 58, power 223.06666666666666, 20 techs
  - RiverLeague: 4 cities, pop 39, power 116.2, 18 techs

#### Stalled Game 19 (Small, seed 165065)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 19
- **Final Units:** 47
- **War Declarations:** 8
- **City Captures:** 11
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 64
- **Civ Details:**
  - RiverLeague: 9 cities, pop 84, power 514.4666666666667, 19 techs
  - AetherianVanguard: 4 cities, pop 39, power 141, 20 techs
  - ScholarKingdoms: 2 cities, pop 20, power 93, 20 techs

#### Stalled Game 20 (Small, seed 189089)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 47
- **War Declarations:** 9
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 41
- **Civ Details:**
  - StarborneSeekers: 4 cities, pop 38, power 89.13333333333333, 19 techs
  - JadeCovenant: 6 cities, pop 58, power 318.06666666666666, 19 techs
  - ForgeClans: 3 cities, pop 28, power 230, 12 techs

#### Stalled Game 21 (Small, seed 213113)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 20
- **Final Units:** 55
- **War Declarations:** 7
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - ForgeClans: 3 cities, pop 32, power 232.12, 12 techs
  - ScholarKingdoms: 8 cities, pop 76, power 401, 20 techs
  - JadeCovenant: 6 cities, pop 56, power 277.33333333333337, 20 techs

#### Stalled Game 22 (Standard, seed 201001)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 18
- **Final Units:** 43
- **War Declarations:** 8
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 48
- **Civ Details:**
  - StarborneSeekers: 6 cities, pop 61, power 146.46666666666667, 20 techs
  - ScholarKingdoms: 3 cities, pop 26, power 81, 12 techs
  - ForgeClans: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - RiverLeague: 5 cities, pop 50, power 225.53333333333333, 14 techs

#### Stalled Game 23 (Standard, seed 207007)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 18
- **Final Units:** 40
- **War Declarations:** 7
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 50
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - JadeCovenant: 2 cities, pop 20, power 63.2, 9 techs
  - StarborneSeekers: 5 cities, pop 53, power 225, 20 techs
  - ForgeClans: 7 cities, pop 68, power 240.8, 20 techs

#### Stalled Game 24 (Standard, seed 204004)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 26
- **Final Units:** 60
- **War Declarations:** 14
- **City Captures:** 20
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 89
- **Civ Details:**
  - JadeCovenant: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - RiverLeague: 16 cities, pop 153, power 690.4666666666666, 20 techs
  - ForgeClans: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - ScholarKingdoms: 6 cities, pop 58, power 250, 18 techs

#### Stalled Game 25 (Standard, seed 211011)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 13
- **Final Units:** 45
- **War Declarations:** 7
- **City Captures:** 4
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 47
- **Civ Details:**
  - RiverLeague: 4 cities, pop 38, power 125.2, 7 techs
  - ForgeClans: 4 cities, pop 35, power 273.4, 13 techs
  - ScholarKingdoms: 2 cities, pop 21, power 136.89333333333335, 12 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)

#### Stalled Game 26 (Standard, seed 218018)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 21
- **Final Units:** 47
- **War Declarations:** 18
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 67
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 21, power 35.2, 17 techs
  - ForgeClans: 7 cities, pop 69, power 312.6, 18 techs
  - RiverLeague: 4 cities, pop 40, power 180.6, 12 techs
  - ScholarKingdoms: 3 cities, pop 29, power 182, 19 techs

#### Stalled Game 27 (Standard, seed 223023)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 22
- **Final Units:** 59
- **War Declarations:** 16
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 62
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 21, power 45.266666666666666, 12 techs
  - ScholarKingdoms: 10 cities, pop 99, power 615.7333333333333, 20 techs
  - RiverLeague: 5 cities, pop 50, power 218.13333333333333, 12 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)

#### Stalled Game 28 (Standard, seed 231031)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 20
- **Final Units:** 53
- **War Declarations:** 12
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 60
- **Civ Details:**
  - AetherianVanguard: 7 cities, pop 69, power 365.20000000000005, 20 techs
  - RiverLeague: 2 cities, pop 19, power 79.26666666666667, 7 techs
  - StarborneSeekers: 4 cities, pop 37, power 135, 20 techs
  - JadeCovenant: 2 cities, pop 19, power 144.86666666666667, 10 techs

#### Stalled Game 29 (Standard, seed 235035)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 17
- **Final Units:** 44
- **War Declarations:** 7
- **City Captures:** 6
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 30
- **Civ Details:**
  - JadeCovenant: 7 cities, pop 65, power 304.44, 11 techs
  - RiverLeague: 0 cities, pop 0, power 0, 18 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - ForgeClans: 6 cities, pop 58, power 353.4666666666667, 13 techs

#### Stalled Game 30 (Standard, seed 236036)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 21
- **Final Units:** 51
- **War Declarations:** 12
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 36
- **Civ Details:**
  - RiverLeague: 10 cities, pop 99, power 534.8533333333334, 20 techs
  - JadeCovenant: 4 cities, pop 39, power 192, 20 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - ForgeClans: 1 cities, pop 11, power 103, 7 techs

#### Stalled Game 31 (Standard, seed 239039)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 14
- **Final Units:** 36
- **War Declarations:** 7
- **City Captures:** 4
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 28
- **Civ Details:**
  - JadeCovenant: 6 cities, pop 62, power 221, 20 techs
  - StarborneSeekers: 3 cities, pop 27, power 82.75999999999999, 12 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 19, power 100, 12 techs

#### Stalled Game 32 (Standard, seed 242042)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 50
- **War Declarations:** 12
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 65
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)
  - ForgeClans: 4 cities, pop 40, power 269.4, 15 techs
  - ScholarKingdoms: 8 cities, pop 76, power 349.3466666666667, 18 techs
  - StarborneSeekers: 2 cities, pop 21, power 24, 17 techs

#### Stalled Game 33 (Standard, seed 243043)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 20
- **Final Units:** 56
- **War Declarations:** 6
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 49
- **Civ Details:**
  - ForgeClans: 3 cities, pop 32, power 304.8, 11 techs
  - AetherianVanguard: 7 cities, pop 66, power 348.8666666666667, 20 techs
  - ScholarKingdoms: 3 cities, pop 28, power 59.026666666666664, 18 techs
  - StarborneSeekers: 3 cities, pop 30, power 141.26666666666665, 13 techs

#### Stalled Game 34 (Standard, seed 246046)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 20
- **Final Units:** 41
- **War Declarations:** 6
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 62
- **Civ Details:**
  - ForgeClans: 3 cities, pop 30, power 148.86666666666667, 10 techs
  - RiverLeague: 6 cities, pop 52, power 174, 20 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - ScholarKingdoms: 6 cities, pop 52, power 255.33333333333337, 11 techs

#### Stalled Game 35 (Standard, seed 262062)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 21
- **Final Units:** 41
- **War Declarations:** 7
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 53
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 31, power 70, 13 techs
  - RiverLeague: 5 cities, pop 50, power 229.86666666666667, 17 techs
  - ForgeClans: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - ScholarKingdoms: 7 cities, pop 68, power 262.06666666666666, 20 techs

#### Stalled Game 36 (Standard, seed 266066)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 11
- **Final Units:** 44
- **War Declarations:** 3
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 43
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 20, power 53, 10 techs
  - RiverLeague: 2 cities, pop 19, power 79, 8 techs
  - ForgeClans: 2 cities, pop 21, power 96.76, 10 techs
  - AetherianVanguard: 2 cities, pop 20, power 106, 11 techs

#### Stalled Game 37 (Standard, seed 261061)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 26
- **Final Units:** 70
- **War Declarations:** 14
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 94
- **Civ Details:**
  - RiverLeague: 3 cities, pop 30, power 179.00000000000003, 20 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 5 techs (ELIMINATED)
  - ForgeClans: 12 cities, pop 111, power 660.4, 20 techs
  - ScholarKingdoms: 6 cities, pop 58, power 259.5333333333333, 20 techs

#### Stalled Game 38 (Standard, seed 267067)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 17
- **Final Units:** 59
- **War Declarations:** 7
- **City Captures:** 12
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 76
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 13 techs (ELIMINATED)
  - JadeCovenant: 7 cities, pop 67, power 380, 20 techs
  - AetherianVanguard: 9 cities, pop 84, power 477, 20 techs

#### Stalled Game 39 (Standard, seed 269069)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 43
- **War Declarations:** 7
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 66
- **Civ Details:**
  - ScholarKingdoms: 2 cities, pop 22, power 116.26666666666667, 10 techs
  - StarborneSeekers: 2 cities, pop 12, power 32, 12 techs
  - JadeCovenant: 9 cities, pop 77, power 335.50666666666666, 19 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)

#### Stalled Game 40 (Standard, seed 277077)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 23
- **Final Units:** 52
- **War Declarations:** 9
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 70
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 20, power 53, 18 techs
  - AetherianVanguard: 5 cities, pop 44, power 264.4666666666667, 14 techs
  - JadeCovenant: 5 cities, pop 44, power 188, 20 techs
  - ForgeClans: 6 cities, pop 57, power 219.88, 13 techs

#### Stalled Game 41 (Standard, seed 286086)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 50
- **War Declarations:** 6
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 62
- **Civ Details:**
  - ScholarKingdoms: 3 cities, pop 29, power 144.66666666666669, 18 techs
  - ForgeClans: 6 cities, pop 59, power 275, 14 techs
  - AetherianVanguard: 5 cities, pop 45, power 225.93333333333334, 15 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 10 techs (ELIMINATED)

#### Stalled Game 42 (Standard, seed 293093)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 16
- **Final Units:** 37
- **War Declarations:** 9
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 62
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - JadeCovenant: 5 cities, pop 50, power 194, 19 techs
  - StarborneSeekers: 7 cities, pop 58, power 231.13333333333333, 19 techs
  - ForgeClans: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)

#### Stalled Game 43 (Standard, seed 292092)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 21
- **Final Units:** 48
- **War Declarations:** 11
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 53
- **Civ Details:**
  - JadeCovenant: 4 cities, pop 39, power 156.33333333333334, 14 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - RiverLeague: 10 cities, pop 90, power 474, 20 techs
  - ForgeClans: 3 cities, pop 31, power 124.33333333333333, 12 techs

#### Stalled Game 44 (Standard, seed 294094)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 23
- **Final Units:** 57
- **War Declarations:** 23
- **City Captures:** 14
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 55
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 19 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 13 techs (ELIMINATED)
  - JadeCovenant: 9 cities, pop 84, power 390.2, 20 techs
  - ForgeClans: 10 cities, pop 96, power 460.33333333333337, 17 techs

#### Stalled Game 45 (Standard, seed 289089)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 24
- **Final Units:** 57
- **War Declarations:** 8
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 56
- **Civ Details:**
  - ForgeClans: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - AetherianVanguard: 10 cities, pop 95, power 405.66666666666663, 20 techs
  - JadeCovenant: 5 cities, pop 50, power 207.33333333333334, 19 techs
  - ScholarKingdoms: 5 cities, pop 51, power 220.2, 13 techs

#### Stalled Game 46 (Standard, seed 304104)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 21
- **Final Units:** 57
- **War Declarations:** 8
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 62
- **Civ Details:**
  - StarborneSeekers: 3 cities, pop 32, power 194, 20 techs
  - RiverLeague: 7 cities, pop 67, power 379, 20 techs
  - ForgeClans: 4 cities, pop 41, power 194, 13 techs
  - ScholarKingdoms: 2 cities, pop 20, power 82, 11 techs

#### Stalled Game 47 (Standard, seed 302102)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 23
- **Final Units:** 62
- **War Declarations:** 10
- **City Captures:** 5
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 68
- **Civ Details:**
  - JadeCovenant: 9 cities, pop 90, power 436, 20 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - ForgeClans: 2 cities, pop 20, power 97, 19 techs
  - ScholarKingdoms: 8 cities, pop 76, power 359.4, 20 techs

#### Stalled Game 48 (Standard, seed 309109)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 16
- **Final Units:** 60
- **War Declarations:** 6
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 39
- **Civ Details:**
  - ForgeClans: 3 cities, pop 32, power 429, 13 techs
  - RiverLeague: 4 cities, pop 41, power 184.04, 11 techs
  - StarborneSeekers: 3 cities, pop 30, power 79.66666666666667, 17 techs
  - AetherianVanguard: 4 cities, pop 42, power 246.04000000000002, 12 techs

#### Stalled Game 49 (Standard, seed 314114)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 20
- **Final Units:** 40
- **War Declarations:** 7
- **City Captures:** 0
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 38
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 11, power 36, 10 techs
  - JadeCovenant: 5 cities, pop 44, power 177.4, 15 techs
  - ScholarKingdoms: 5 cities, pop 49, power 201, 20 techs
  - RiverLeague: 4 cities, pop 39, power 111.33333333333333, 17 techs

#### Stalled Game 50 (Standard, seed 318118)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 11
- **Final Units:** 35
- **War Declarations:** 11
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 40
- **Civ Details:**
  - AetherianVanguard: 4 cities, pop 38, power 214.73333333333335, 20 techs
  - JadeCovenant: 2 cities, pop 20, power 83.2, 14 techs
  - RiverLeague: 0 cities, pop 0, power 0, 0 techs (ELIMINATED)
  - StarborneSeekers: 2 cities, pop 20, power 63.733333333333334, 18 techs

#### Stalled Game 51 (Standard, seed 316116)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 20
- **Final Units:** 57
- **War Declarations:** 15
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 61
- **Civ Details:**
  - StarborneSeekers: 7 cities, pop 66, power 218, 20 techs
  - AetherianVanguard: 1 cities, pop 9, power 16, 5 techs
  - RiverLeague: 2 cities, pop 22, power 100, 7 techs
  - ScholarKingdoms: 7 cities, pop 63, power 381.3333333333333, 20 techs

#### Stalled Game 52 (Standard, seed 315115)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 19
- **Final Units:** 50
- **War Declarations:** 9
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 41
- **Civ Details:**
  - AetherianVanguard: 4 cities, pop 32, power 79, 14 techs
  - StarborneSeekers: 6 cities, pop 55, power 192, 18 techs
  - ScholarKingdoms: 5 cities, pop 51, power 263.3333333333333, 20 techs
  - RiverLeague: 0 cities, pop 0, power 0, 2 techs (ELIMINATED)

#### Stalled Game 53 (Large, seed 307007)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 25
- **Final Units:** 59
- **War Declarations:** 17
- **City Captures:** 12
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 52
- **Civ Details:**
  - ScholarKingdoms: 5 cities, pop 50, power 208, 13 techs
  - ForgeClans: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 13 techs (ELIMINATED)
  - AetherianVanguard: 9 cities, pop 81, power 445.53333333333336, 20 techs
  - RiverLeague: 1 cities, pop 10, power 35.08, 18 techs
  - JadeCovenant: 3 cities, pop 32, power 108.08, 11 techs

#### Stalled Game 54 (Large, seed 306006)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 23
- **Final Units:** 68
- **War Declarations:** 21
- **City Captures:** 15
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 48
- **Civ Details:**
  - AetherianVanguard: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - ScholarKingdoms: 1 cities, pop 11, power 54, 12 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ForgeClans: 9 cities, pop 84, power 398.8933333333334, 20 techs
  - RiverLeague: 6 cities, pop 58, power 307, 18 techs
  - JadeCovenant: 3 cities, pop 29, power 81.26666666666667, 9 techs

#### Stalled Game 55 (Large, seed 308008)
- **Turn Reached:** 451
- **Surviving Civs:** 6
- **Final Cities:** 26
- **Final Units:** 69
- **War Declarations:** 28
- **City Captures:** 13
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 86
- **Civ Details:**
  - ScholarKingdoms: 1 cities, pop 11, power 38, 16 techs
  - RiverLeague: 2 cities, pop 20, power 103, 8 techs
  - ForgeClans: 2 cities, pop 20, power 116, 10 techs
  - StarborneSeekers: 1 cities, pop 11, power 12, 14 techs
  - AetherianVanguard: 6 cities, pop 44, power 211, 10 techs
  - JadeCovenant: 8 cities, pop 80, power 404.33333333333337, 20 techs

#### Stalled Game 56 (Large, seed 312012)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 22
- **Final Units:** 63
- **War Declarations:** 28
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 81
- **Civ Details:**
  - AetherianVanguard: 2 cities, pop 20, power 124.53333333333333, 19 techs
  - ScholarKingdoms: 6 cities, pop 55, power 219.20000000000002, 20 techs
  - StarborneSeekers: 2 cities, pop 20, power 44.6, 11 techs
  - RiverLeague: 3 cities, pop 30, power 232.13333333333333, 12 techs
  - JadeCovenant: 2 cities, pop 20, power 104.46666666666667, 9 techs
  - ForgeClans: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)

#### Stalled Game 57 (Large, seed 316016)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 28
- **Final Units:** 55
- **War Declarations:** 38
- **City Captures:** 14
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 102
- **Civ Details:**
  - RiverLeague: 2 cities, pop 21, power 39, 8 techs
  - StarborneSeekers: 2 cities, pop 19, power 27, 8 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 15 techs (ELIMINATED)
  - ScholarKingdoms: 0 cities, pop 0, power 0, 14 techs (ELIMINATED)
  - AetherianVanguard: 12 cities, pop 115, power 429, 20 techs
  - ForgeClans: 4 cities, pop 39, power 255.06666666666663, 11 techs

#### Stalled Game 58 (Large, seed 324024)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 16
- **Final Units:** 45
- **War Declarations:** 12
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - StarborneSeekers: 2 cities, pop 22, power 42, 14 techs
  - ForgeClans: 2 cities, pop 21, power 118, 8 techs
  - JadeCovenant: 2 cities, pop 18, power 105, 10 techs
  - AetherianVanguard: 1 cities, pop 11, power 24, 7 techs
  - RiverLeague: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - ScholarKingdoms: 3 cities, pop 32, power 129.33333333333334, 18 techs

#### Stalled Game 59 (Large, seed 340040)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 24
- **Final Units:** 73
- **War Declarations:** 23
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 46
- **Civ Details:**
  - ForgeClans: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - ScholarKingdoms: 4 cities, pop 40, power 182.73333333333332, 14 techs
  - JadeCovenant: 5 cities, pop 52, power 260, 20 techs
  - StarborneSeekers: 7 cities, pop 71, power 286, 20 techs
  - RiverLeague: 0 cities, pop 0, power 0, 4 techs (ELIMINATED)
  - AetherianVanguard: 3 cities, pop 31, power 236, 11 techs

#### Stalled Game 60 (Large, seed 344044)
- **Turn Reached:** 451
- **Surviving Civs:** 6
- **Final Cities:** 21
- **Final Units:** 96
- **War Declarations:** 23
- **City Captures:** 11
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 58
- **Civ Details:**
  - RiverLeague: 6 cities, pop 60, power 368.6666666666667, 18 techs
  - AetherianVanguard: 3 cities, pop 31, power 283.8666666666667, 11 techs
  - ForgeClans: 1 cities, pop 11, power 51, 12 techs
  - ScholarKingdoms: 4 cities, pop 41, power 198.02666666666667, 13 techs
  - JadeCovenant: 1 cities, pop 11, power 26, 11 techs
  - StarborneSeekers: 4 cities, pop 43, power 120, 20 techs

#### Stalled Game 61 (Large, seed 348048)
- **Turn Reached:** 451
- **Surviving Civs:** 6
- **Final Cities:** 27
- **Final Units:** 50
- **War Declarations:** 28
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 75
- **Civ Details:**
  - RiverLeague: 3 cities, pop 31, power 62, 17 techs
  - JadeCovenant: 3 cities, pop 24, power 111.93333333333334, 15 techs
  - AetherianVanguard: 7 cities, pop 65, power 254.58666666666667, 20 techs
  - ForgeClans: 3 cities, pop 29, power 141.81333333333333, 11 techs
  - ScholarKingdoms: 2 cities, pop 21, power 79.93333333333334, 19 techs
  - StarborneSeekers: 1 cities, pop 11, power 38, 10 techs

#### Stalled Game 62 (Large, seed 359059)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 24
- **Final Units:** 54
- **War Declarations:** 32
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 60
- **Civ Details:**
  - RiverLeague: 3 cities, pop 32, power 229.26666666666665, 12 techs
  - JadeCovenant: 6 cities, pop 57, power 301.96000000000004, 20 techs
  - StarborneSeekers: 3 cities, pop 32, power 90.66666666666666, 20 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - AetherianVanguard: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - ForgeClans: 4 cities, pop 41, power 228.66666666666666, 14 techs

#### Stalled Game 63 (Large, seed 365065)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 18
- **Final Units:** 47
- **War Declarations:** 21
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 64
- **Civ Details:**
  - ForgeClans: 2 cities, pop 21, power 180.4, 11 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 16 techs (ELIMINATED)
  - RiverLeague: 2 cities, pop 22, power 94, 4 techs
  - AetherianVanguard: 2 cities, pop 22, power 34.4, 14 techs
  - JadeCovenant: 5 cities, pop 52, power 221.13333333333333, 16 techs
  - ScholarKingdoms: 1 cities, pop 9, power 24, 7 techs

#### Stalled Game 64 (Large, seed 361061)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 30
- **Final Units:** 84
- **War Declarations:** 16
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 74
- **Civ Details:**
  - AetherianVanguard: 1 cities, pop 11, power 140.93333333333334, 10 techs
  - RiverLeague: 7 cities, pop 65, power 361.18666666666667, 20 techs
  - ScholarKingdoms: 2 cities, pop 17, power 53.4, 11 techs
  - JadeCovenant: 2 cities, pop 19, power 149.73333333333332, 11 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 7 techs (ELIMINATED)
  - ForgeClans: 9 cities, pop 79, power 385.4, 20 techs

#### Stalled Game 65 (Large, seed 376076)
- **Turn Reached:** 451
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 39
- **War Declarations:** 24
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 48
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 18 techs (ELIMINATED)
  - JadeCovenant: 5 cities, pop 53, power 216, 16 techs
  - StarborneSeekers: 4 cities, pop 40, power 83.2, 18 techs
  - ForgeClans: 3 cities, pop 32, power 182, 11 techs
  - AetherianVanguard: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)

#### Stalled Game 66 (Large, seed 375075)
- **Turn Reached:** 451
- **Surviving Civs:** 5
- **Final Cities:** 17
- **Final Units:** 73
- **War Declarations:** 18
- **City Captures:** 6
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 76
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ScholarKingdoms: 4 cities, pop 42, power 271.08000000000004, 11 techs
  - AetherianVanguard: 2 cities, pop 22, power 119.46666666666667, 12 techs
  - ForgeClans: 1 cities, pop 11, power 34.13333333333333, 8 techs
  - JadeCovenant: 3 cities, pop 30, power 74.06666666666666, 7 techs
  - RiverLeague: 4 cities, pop 40, power 315.4, 12 techs

#### Stalled Game 67 (Large, seed 406106)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 27
- **Final Units:** 74
- **War Declarations:** 24
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 76
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - ScholarKingdoms: 6 cities, pop 55, power 267, 20 techs
  - RiverLeague: 4 cities, pop 43, power 216.4, 15 techs
  - AetherianVanguard: 7 cities, pop 64, power 359.1866666666666, 20 techs
  - JadeCovenant: 3 cities, pop 28, power 113.46666666666667, 8 techs
  - ForgeClans: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)

#### Stalled Game 68 (Large, seed 410110)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 15
- **Final Units:** 46
- **War Declarations:** 4
- **City Captures:** 6
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 59
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - JadeCovenant: 3 cities, pop 30, power 105, 20 techs
  - ForgeClans: 4 cities, pop 40, power 219.97333333333333, 14 techs
  - RiverLeague: 0 cities, pop 0, power 0, 0 techs (ELIMINATED)
  - AetherianVanguard: 1 cities, pop 10, power 73.46666666666667, 10 techs
  - ScholarKingdoms: 3 cities, pop 31, power 36, 11 techs

#### Stalled Game 69 (Huge, seed 434034)
- **Turn Reached:** 501
- **Surviving Civs:** 4
- **Final Cities:** 18
- **Final Units:** 79
- **War Declarations:** 24
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 44
- **Civ Details:**
  - ForgeClans: 0 cities, pop 0, power 0, 13 techs (ELIMINATED)
  - RiverLeague: 2 cities, pop 20, power 131.41333333333336, 17 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)
  - AetherianVanguard: 8 cities, pop 82, power 519.8, 20 techs
  - JadeCovenant: 2 cities, pop 21, power 87, 19 techs
  - StarborneSeekers: 2 cities, pop 22, power 57.8, 19 techs

#### Stalled Game 70 (Huge, seed 448048)
- **Turn Reached:** 501
- **Surviving Civs:** 4
- **Final Cities:** 23
- **Final Units:** 85
- **War Declarations:** 7
- **City Captures:** 7
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 49
- **Civ Details:**
  - JadeCovenant: 14 cities, pop 138, power 811.4, 20 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - RiverLeague: 1 cities, pop 11, power 9, 6 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 0 techs (ELIMINATED)
  - AetherianVanguard: 1 cities, pop 8, power 25, 13 techs
  - ForgeClans: 1 cities, pop 10, power 32.46666666666667, 9 techs

#### Stalled Game 71 (Huge, seed 446046)
- **Turn Reached:** 501
- **Surviving Civs:** 2
- **Final Cities:** 26
- **Final Units:** 84
- **War Declarations:** 10
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 61
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 19 techs (ELIMINATED)
  - AetherianVanguard: 0 cities, pop 0, power 0, 0 techs (ELIMINATED)
  - RiverLeague: 0 cities, pop 0, power 0, 0 techs (ELIMINATED)
  - JadeCovenant: 0 cities, pop 0, power 0, 19 techs (ELIMINATED)
  - ScholarKingdoms: 9 cities, pop 88, power 321.04, 20 techs
  - ForgeClans: 12 cities, pop 114, power 615.6, 20 techs

#### Stalled Game 72 (Huge, seed 451051)
- **Turn Reached:** 501
- **Surviving Civs:** 3
- **Final Cities:** 30
- **Final Units:** 83
- **War Declarations:** 17
- **City Captures:** 19
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 62
- **Civ Details:**
  - JadeCovenant: 10 cities, pop 106, power 488, 20 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 19 techs (ELIMINATED)
  - AetherianVanguard: 0 cities, pop 0, power 0, 20 techs (ELIMINATED)
  - RiverLeague: 7 cities, pop 73, power 434.2, 19 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 18 techs (ELIMINATED)
  - ForgeClans: 4 cities, pop 42, power 227.8, 20 techs

#### Stalled Game 73 (Huge, seed 476076)
- **Turn Reached:** 501
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 61
- **War Declarations:** 9
- **City Captures:** 10
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 70
- **Civ Details:**
  - ForgeClans: 5 cities, pop 52, power 283.44000000000005, 20 techs
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ScholarKingdoms: 2 cities, pop 17, power 69.86666666666667, 14 techs
  - AetherianVanguard: 4 cities, pop 42, power 227, 18 techs
  - JadeCovenant: 2 cities, pop 21, power 57.2, 8 techs
  - StarborneSeekers: 0 cities, pop 0, power 0, 8 techs (ELIMINATED)

#### Stalled Game 74 (Huge, seed 482082)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 30
- **Final Units:** 78
- **War Declarations:** 29
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 85
- **Civ Details:**
  - ForgeClans: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - ScholarKingdoms: 6 cities, pop 63, power 412.73333333333323, 18 techs
  - StarborneSeekers: 1 cities, pop 11, power 47.2, 17 techs
  - RiverLeague: 4 cities, pop 43, power 180.66666666666666, 20 techs
  - AetherianVanguard: 5 cities, pop 33, power 144.93333333333334, 11 techs
  - JadeCovenant: 4 cities, pop 43, power 251.93333333333334, 20 techs

#### Stalled Game 75 (Huge, seed 514114)
- **Turn Reached:** 501
- **Surviving Civs:** 3
- **Final Cities:** 31
- **Final Units:** 58
- **War Declarations:** 25
- **City Captures:** 11
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 58
- **Civ Details:**
  - ForgeClans: 5 cities, pop 46, power 246.16, 20 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 16 techs (ELIMINATED)
  - RiverLeague: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - StarborneSeekers: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - ScholarKingdoms: 6 cities, pop 62, power 283.66666666666663, 20 techs
  - AetherianVanguard: 9 cities, pop 91, power 332, 20 techs

## 11. Map Size Analysis

### Tiny Maps
- **Simulations:** 120
- **Victories:** 108 (90.0%)
  - Conquest: 98, Progress: 10
- **Average Victory Turn:** 237.3
- **Victory Turn Range:** [46, 395]

### Small Maps
- **Simulations:** 120
- **Victories:** 111 (92.5%)
  - Conquest: 102, Progress: 9
- **Average Victory Turn:** 200.1
- **Victory Turn Range:** [29, 396]

### Standard Maps
- **Simulations:** 120
- **Victories:** 89 (74.2%)
  - Conquest: 49, Progress: 40
- **Average Victory Turn:** 299.9
- **Victory Turn Range:** [135, 399]

### Large Maps
- **Simulations:** 120
- **Victories:** 104 (86.7%)
  - Conquest: 24, Progress: 80
- **Average Victory Turn:** 352.8
- **Victory Turn Range:** [170, 450]

### Huge Maps
- **Simulations:** 120
- **Victories:** 113 (94.2%)
  - Conquest: 21, Progress: 92
- **Average Victory Turn:** 377.0
- **Victory Turn Range:** [219, 499]

## 12. Balance Observations

### Victory Timing vs Pop 10
- Average Victory Turn: 293.0
- Average Pop 10 Turn: 336.1
- **Gap:** 43.1 turns (Pop 10 happens AFTER victory)

### Civilization Balance
- Highest Win Rate: AetherianVanguard (25.1%)
- Lowest Win Rate: ScholarKingdoms (17.5%)
- **Win Rate Spread:** 7.6 percentage points

### Settler Survival
- Settlers Produced: 8838
- Settlers Killed: 1947
- **Settler Survival Rate:** 78.0%

