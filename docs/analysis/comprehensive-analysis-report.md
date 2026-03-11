# Comprehensive Simulation Analysis Report

**Date:** 2026-03-11
**Simulations:** 200 total (Tiny: 40, Small: 40, Standard: 40, Large: 40, Huge: 40) (AI vs AI)
**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)

## Titan Analysis
- **Total Titans Spawned:** 65
- **Average Spawn Turn:** 225.7
- **Median Spawn Turn:** 212
- **Spawn Turn Range:** [111, 458]
- **Average Units on Creation:** 11.4
- **Median Units on Creation:** 11
- **Range:** [4, 27]

---

## 1. Victory Analysis

### Overall Statistics
- **Total Victories:** 188 of 200 (94.0%)
- **Average Victory Turn:** 287.5
- **Median Victory Turn:** 313
- **Victory Turn Range:** [36, 460]

### Victory Types
- **Conquest:** 110 (55.0%)
- **Progress:** 78 (39.0%)
- **None:** 12 (6.0%)

### Victories by Civilization (with Victory Type Breakdown)
- **AetherianVanguard:** 36 wins (24.5% of games played)
  - Conquest: 27, Progress: 9
- **ForgeClans:** 36 wins (25.9% of games played)
  - Conquest: 23, Progress: 13
- **StarborneSeekers:** 34 wins (24.8% of games played)
  - Conquest: 13, Progress: 21
- **ScholarKingdoms:** 33 wins (22.8% of games played)
  - Conquest: 14, Progress: 19
- **RiverLeague:** 25 wins (17.9% of games played)
  - Conquest: 13, Progress: 12
- **JadeCovenant:** 24 wins (18.2% of games played)
  - Conquest: 20, Progress: 4

## 2. Warfare Analysis

### War Statistics
- **Total Unique Wars:** 1090
- **Total Peace Treaties:** 1041
- **Average Wars per Game:** 5.5

### War Durations
- **Total Wars Tracked:** 1090
- **Average Duration:** 93.5 turns
- **Median Duration:** 62 turns
- **Range:** [0, 406] turns

### War Initiation by Civilization
- **ForgeClans:** Initiated 272 (2.0/game), Received 110 (0.8/game)
- **ScholarKingdoms:** Initiated 50 (0.3/game), Received 294 (2.0/game)
- **RiverLeague:** Initiated 250 (1.8/game), Received 127 (0.9/game)
- **AetherianVanguard:** Initiated 173 (1.2/game), Received 171 (1.2/game)
- **StarborneSeekers:** Initiated 154 (1.1/game), Received 217 (1.6/game)
- **JadeCovenant:** Initiated 191 (1.4/game), Received 171 (1.3/game)

### War-to-Win Conversion by Civilization
- **ForgeClans:** 98/493 initiated wars led to captures (19.9%), 0.31 cities per initiated war, 0.04 eliminations per initiated war, 35/72 wins after any capture (48.6%), 12/13 Progress wins after prior captures
- **ScholarKingdoms:** 19/81 initiated wars led to captures (23.5%), 0.32 cities per initiated war, 0.01 eliminations per initiated war, 21/41 wins after any capture (51.2%), 4/19 Progress wins after prior captures
- **RiverLeague:** 83/455 initiated wars led to captures (18.2%), 0.30 cities per initiated war, 0.05 eliminations per initiated war, 25/69 wins after any capture (36.2%), 11/12 Progress wins after prior captures
- **AetherianVanguard:** 71/241 initiated wars led to captures (29.5%), 0.61 cities per initiated war, 0.10 eliminations per initiated war, 36/71 wins after any capture (50.7%), 9/9 Progress wins after prior captures
- **StarborneSeekers:** 36/265 initiated wars led to captures (13.6%), 0.20 cities per initiated war, 0.03 eliminations per initiated war, 18/47 wins after any capture (38.3%), 2/21 Progress wins after prior captures
- **JadeCovenant:** 70/373 initiated wars led to captures (18.8%), 0.31 cities per initiated war, 0.05 eliminations per initiated war, 24/64 wins after any capture (37.5%), 3/4 Progress wins after prior captures

### ForgeClans Conversion Focus
- **Average Declaration Power Ratio:** 2.48
- **Median Turns from Declared War to First Capture:** 30.5
- **Median First Capture Turn:** wins 184.0, losses 237.0
- **Median 25-Turn Capture Burst:** wins 1.0, losses 1.0
- **First-Capture Win Rate:** 29/47 (61.7%)
- **Progress Wins With Prior Captures:** 12/13 (92.3%), avg 2.5 captures before first progress project

## 3. Unit Combat Analysis

### Unit Deaths
- **Total Units Killed:** 27014
- **Average per Game:** 135.1

### Deaths by Unit Type
- **SpearGuard:** 6409 deaths (6211 produced, 5775 of produced died, 7.0% produced survival)
- **BowGuard:** 4904 deaths (5197 produced, 4782 of produced died, 8.0% produced survival)
- **ArmyBowGuard:** 3107 deaths (4693 produced, 3107 of produced died, 33.8% produced survival)
- **Trebuchet:** 2935 deaths (3715 produced, 2935 of produced died, 21.0% produced survival)
- **ArmySpearGuard:** 2044 deaths (3251 produced, 2044 of produced died, 37.1% produced survival)
- **NativeArcher:** 1652 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **ArmyRiders:** 1275 deaths (1915 produced, 1275 of produced died, 33.4% produced survival)
- **Scout:** 1053 deaths (260 produced, 245 of produced died, 5.8% produced survival)
- **Lorekeeper:** 920 deaths (1755 produced, 920 of produced died, 47.6% produced survival)
- **Settler:** 873 deaths (3376 produced, 870 of produced died, 74.2% produced survival)
- **NativeChampion:** 828 deaths (0 produced, 0 of produced died, N/A% produced survival)
- **Landship:** 624 deaths (2171 produced, 624 of produced died, 71.3% produced survival)
- **Riders:** 339 deaths (387 produced, 339 of produced died, 12.4% produced survival)
- **Titan:** 38 deaths (65 produced, 38 of produced died, 41.5% produced survival)
- **Airship:** 13 deaths (245 produced, 13 of produced died, 94.7% produced survival)

### Unit Production by Type
- **SpearGuard:** 6211 produced
- **BowGuard:** 5197 produced
- **ArmyBowGuard:** 4693 produced
- **Trebuchet:** 3715 produced
- **Settler:** 3376 produced
- **ArmySpearGuard:** 3251 produced
- **Landship:** 2171 produced
- **ArmyRiders:** 1915 produced
- **Lorekeeper:** 1755 produced
- **Riders:** 387 produced
- **Scout:** 260 produced
- **Airship:** 245 produced
- **Titan:** 65 produced

## 4. City Growth & Development

### City Statistics
- **Total Cities Founded:** 3769
- **Total Cities Captured:** 995
- **Total Cities Razed:** 105
- **Cities Reaching Pop 10:** 1052

### Population Milestones (Average Turn)
- **Pop 3:** 131.9 (2754 cities)
- **Pop 5:** 158.4 (2658 cities)
- **Pop 7:** 185.3 (2459 cities)
- **Pop 10:** 333.6 (1052 cities) [Range: 125-460]

### City Activity by Civilization
- **ForgeClans:** Founded 446 (3.2/game), Captured 205, Lost 153
- **ScholarKingdoms:** Founded 602 (4.2/game), Captured 67, Lost 151
- **RiverLeague:** Founded 487 (3.5/game), Captured 196, Lost 168
- **AetherianVanguard:** Founded 532 (3.6/game), Captured 230, Lost 186
- **StarborneSeekers:** Founded 477 (3.5/game), Captured 104, Lost 195
- **JadeCovenant:** Founded 460 (3.5/game), Captured 193, Lost 135

## 5. Technology Progression

### Tech Statistics
- **Total Techs Researched:** 9300
- **Average per Game:** 46.5
- **Total Techs in Tree:** 20

### Tech Tree Completion Rate by Civilization
- **ForgeClans:** 53.7% average tree completion
- **ScholarKingdoms:** 61.5% average tree completion
- **RiverLeague:** 51.4% average tree completion
- **AetherianVanguard:** 54.5% average tree completion
- **StarborneSeekers:** 60.5% average tree completion
- **JadeCovenant:** 53.5% average tree completion

### Tech Timing (Average Turn Researched)
- **ScriptLore:** Turn 51.2
- **Fieldcraft:** Turn 65.7
- **FormationTraining:** Turn 75.8
- **StoneworkHalls:** Turn 97.5
- **DrilledRanks:** Turn 123.7
- **Wellworks:** Turn 167.4
- **ArmyDoctrine:** Turn 182.0
- **ScholarCourts:** Turn 182.7
- **TimberMills:** Turn 203.0
- **CityWards:** Turn 219.6
- **CompositeArmor:** Turn 229.6
- **SignalRelay:** Turn 230.4
- **StarCharts:** Turn 253.8
- **SteamForges:** Turn 258.1
- **UrbanPlans:** Turn 264.8
- **TrailMaps:** Turn 272.3
- **PlasmaShields:** Turn 279.1
- **ZeroPointEnergy:** Turn 285.5
- **Aerodynamics:** Turn 305.7
- **DimensionalGate:** Turn 315.2

## 6. Project Completion

### Project Statistics
- **Total Projects Completed:** 798
- **Average per Game:** 4.0

### Project Breakdown
- **Progress Chain (Observatory/Academy/Experiment):** 507
- **Unique Building Markers:** 291

### Progress Chain Timing
- **Observatory:** 262 completions, avg turn 285.5
- **GrandAcademy:** 167 completions, avg turn 321.4
- **GrandExperiment:** 78 completions, avg turn 360.3

### Army Unit Production
- **ArmySpearGuard:** 3251 produced, 2044 killed (37.1% survival)
- **ArmyBowGuard:** 4693 produced, 3107 killed (33.8% survival)
- **ArmyRiders:** 1915 produced, 1275 killed (33.4% survival)
- **Total Army Units:** 9859 produced, 6426 killed

## 7. Building Construction

### Buildings by Type
- **TradingPost:** 2493 built (avg turn 141.5)
- **MarketHall:** 1759 built (avg turn 213.0)
- **Bank:** 648 built (avg turn 282.6)
- **Exchange:** 429 built (avg turn 303.8)
- **Bulwark:** 226 built (avg turn 78.2)
- **ShieldGenerator:** 97 built (avg turn 291.2)

## 8. Civilization Performance

### Win Rates & Statistics

#### ForgeClans
- **Games Played:** 139
- **Wins:** 36 (25.9% win rate)
  - Conquest: 23, Progress: 13
- **Eliminations:** 24
- **Avg Cities:** 3.6
- **Avg Population:** 30.0
- **Avg Techs:** 10.4
- **Avg Projects:** 0.5
- **Avg Military Power:** 156.8

#### AetherianVanguard
- **Games Played:** 147
- **Wins:** 36 (24.5% win rate)
  - Conquest: 27, Progress: 9
- **Eliminations:** 25
- **Avg Cities:** 3.8
- **Avg Population:** 30.9
- **Avg Techs:** 10.9
- **Avg Projects:** 0.9
- **Avg Military Power:** 138.2

#### StarborneSeekers
- **Games Played:** 137
- **Wins:** 34 (24.8% win rate)
  - Conquest: 13, Progress: 21
- **Eliminations:** 23
- **Avg Cities:** 2.6
- **Avg Population:** 22.7
- **Avg Techs:** 12.1
- **Avg Projects:** 1.8
- **Avg Military Power:** 86.2

#### ScholarKingdoms
- **Games Played:** 145
- **Wins:** 33 (22.8% win rate)
  - Conquest: 14, Progress: 19
- **Eliminations:** 16
- **Avg Cities:** 3.4
- **Avg Population:** 28.7
- **Avg Techs:** 12.2
- **Avg Projects:** 1.6
- **Avg Military Power:** 120.4

#### RiverLeague
- **Games Played:** 140
- **Wins:** 25 (17.9% win rate)
  - Conquest: 13, Progress: 12
- **Eliminations:** 26
- **Avg Cities:** 3.6
- **Avg Population:** 31.9
- **Avg Techs:** 10.2
- **Avg Projects:** 0.5
- **Avg Military Power:** 163.1

#### JadeCovenant
- **Games Played:** 132
- **Wins:** 24 (18.2% win rate)
  - Conquest: 20, Progress: 4
- **Eliminations:** 21
- **Avg Cities:** 3.9
- **Avg Population:** 33.4
- **Avg Techs:** 10.5
- **Avg Projects:** 0.4
- **Avg Military Power:** 158.1

## 9. City-State Systems

### Telemetry Coverage
- **Simulations with City-State Telemetry:** 200/200
- **Simulations Missing City-State Telemetry:** 0
- **Total City-States Created:** 765
- **Average City-States Created per Telemetry Sim:** 3.83
- **Average Surviving City-States at Game End (Telemetry Sims):** 3.79

### Activation & Turnover
- **Total City-State Active Turns:** 104627
- **First City-State Creation Turn (min / p25 / median / p75 / max):** 61 / 105 / 128 / 162 / 290
- **First City-State Creation Turn (average, sims with any):** 137.6
- **Global Suzerainty Flip Rate:** 0.40 per 100 active turns
- **True Ownership Turnover Rate:** 0.39 per 100 active turns
- **Average Unique Suzerains per City-State:** 1.24
- **Total Contested Turns:** 831 (No Suz: 4, Close-race: 827)
- **Contested Share of Active Turns:** 0.79%
- **Turnover-Window Turns:** 62980 (60.19% of active turns)
- **Flip-Window Turns:** 61042 (58.34% of active turns)
- **Safe-Lead Incumbent Turns:** 47557 (45.45% of active turns)
- **Hotspot Turns:** 1079 (1.03% of active turns)
- **Passive Contestation Pulses:** 34195
- **Passive Contestation Close-Race Pulses:** 27256
- **City-States with Zero Suzerainty Flips:** 595/765
- **Contested-but-Zero-Flip City-States:** 205/765
- **Top 4 City-States Share of True Ownership Turnovers:** 12.4%
- **True Ownership Turnover Rate Outside Top 4 Turnover City-States:** 0.35 per 100 active turns
- **Top Turnover City-States:** Radiant Lexicon [Huge 408008] (14 ownership, 14 total), Starglass Athenaeum [Huge 420020] (13 ownership, 13 total), Dawnsmelt Keep [Large 301001] (12 ownership, 12 total), Coinfire Crossing [Large 312012] (12 ownership, 12 total)

### Camp-Clearing Activation Funnel
- **Camp-Clearing Episodes:** 9342
- **Direct Starts in Ready:** 3575 (38.3%)
- **Episodes Reaching Ready:** 5444 (58.3%)
- **Episodes with Sighting Telemetry:** 5055 (54.1%)
- **Sighted -> Prep Start (avg / median):** 110.62 / 87 turns
- **Prep Start -> Ready (avg / median):** 2.79 / 0 turns
- **Prep Start -> Self Clear (avg / median):** 14.40 / 9 turns
- **Total Prep Duration (avg / median):** 7.63 / 0 turns
- **Timeouts After Ready:** 283 (17.9% of timeouts)
- **Ready Turn Diagnostics:** no contact 11329, adjacent contact 1611, attack opportunity 5446, stalled opportunity 3049, power disadvantage 3362, progress 3109
- **Ready-Timeout Primary Breakdown:** no contact 191, declined attack 57, power collapse 35, other 0
- **War-Interrupted Episodes:** 2890 (30.9%)
- **Cleared-By-Other Breakdown:** lacked military 79, late start 184, other 63
- **Episode Outcomes:** ClearedBySelf 725, ClearedByOther 326, TimedOut 1579, WartimeEmergencyCancelled 2890, OtherCancelled 3699, StillActive 123
- **Readiness Breakdown:** PreArmy 28/1994 clears, 760 timeouts, ArmyTech 243/4235 clears, 547 timeouts, ArmyFielded 454/3113 clears, 272 timeouts

### Investment Mix
- **Total City-State Investment:** 2557106G across 34337 actions
- **Maintenance Investment:** 515979G (20.2%) across 13926 actions (40.6%)
- **Challenger Investment:** 2041127G (79.8%) across 20411 actions (59.4%)
- **Maintenance Gold per Suzerainty Turn:** 4.93
- **Maintenance Actions per 100 Suzerainty Turns:** 13.31

### Turnover Diagnostics
- **Turnover-Window Challenger Investment:** 1978100G across 19180 actions
- **Flip-Window Challenger Investment:** 1955050G across 18897 actions
- **Deep-Challenge Investment:** 62997G across 1230 actions
- **Neutral-Claim Investment:** 30G across 1 actions
- **Passive Openings Observed:** 1
- **Passive Openings with Treasury to Invest:** 1 (100.0%)
- **Passive Openings with Reserve-Safe Invest:** 0 (0.0%)
- **Passive Opening Avg Nominated Turn-Order Delay:** 3.00 turns
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
- **Passive-Assisted Suzerainty Changes:** 124 (30.0% of non-passive changes)
- **Passive-Assisted True Ownership Turnovers:** 124 (30.1% of ownership turnover)
- **Passive-Assisted Ownership Conversion per 100 Close-Race Pulses:** 0.45
- **Passive-Involved Ownership Conversion per 100 Close-Race Pulses:** 0.45
- **Passive-Assisted Ownership Causes:** Investment 2, WartimeRelease 99, Other 23
- **Pair-Fatigue-Triggered Investment:** 70475G across 986 actions
- **Pair-Fatigue Share of Challenger Spend:** 3.5%
- **Safe-Maintenance Investment:** 89G across 3 actions
- **Focus Turns:** 78463 (challenge 64202, maintenance 14261)
- **Focus Assignments / Switches:** 1473 / 189
- **Flip Conversion per 100 Turnover-Window Turns:** 0.66
- **True Ownership Conversion per 100 Turnover-Window Turns:** 0.65
- **Safe-Maintenance Share of Maintenance Spend:** 0.0%

### Flip Cause Summary
- **Investment:** 210 suzerainty changes, 210 true ownership turnovers (51.0% of ownership turnover)
- **PassiveContestation:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **WartimeRelease:** 106 suzerainty changes, 105 true ownership turnovers (25.5% of ownership turnover)
- **WarBreak:** 0 suzerainty changes, 0 true ownership turnovers (0.0% of ownership turnover)
- **Other:** 98 suzerainty changes, 97 true ownership turnovers (23.5% of ownership turnover)

### Hotspot Diagnostics
- **Hotspot Share of Active Turns:** 1.03%
- **City-State Instances with Any Hotspot Time:** 32/765
- **True Ownership Turnovers Occurring in Hotspot Instances:** 228/412
- **Flip Causes:** Investment 210, WartimeRelease 106, Other 98
- **Ownership Causes:** Investment 210, WartimeRelease 105, Other 97
- **Top Hotspot Instances:** Radiant Lexicon [Huge 408008] (14 ownership, hotspot 90.3%, fatigue 2392G/22, JadeCovenant <> ScholarKingdoms 14); Starglass Athenaeum [Huge 420020] (13 ownership, hotspot 38.4%, fatigue 3582G/39, ForgeClans <> JadeCovenant 13); Coinfire Crossing [Large 312012] (12 ownership, hotspot 40.8%, fatigue 2399G/30, ScholarKingdoms <> JadeCovenant 12); Dawnsmelt Keep [Large 301001] (12 ownership, hotspot 23.4%, fatigue 1568G/21, AetherianVanguard <> ScholarKingdoms 12); Observatory of Whispers [Huge 424024] (11 ownership, hotspot 17.8%, fatigue 2597G/34, RiverLeague <> JadeCovenant 11); Radiant Lexicon [Huge 440040] (10 ownership, hotspot 22.8%, fatigue 1468G/25, ForgeClans <> RiverLeague 9, RiverLeague <> StarborneSeekers 1)

### Map-Size City-State Activation
- **Tiny:** 32/40 sims with >=1 city-state (80.0%), avg created 1.38, avg first CS turn 141.2
- **Small:** 28/40 sims with >=1 city-state (70.0%), avg created 1.32, avg first CS turn 137.6
- **Standard:** 39/40 sims with >=1 city-state (97.5%), avg created 3.65, avg first CS turn 138.4
- **Large:** 40/40 sims with >=1 city-state (100.0%), avg created 5.72, avg first CS turn 127.0
- **Huge:** 39/40 sims with >=1 city-state (97.5%), avg created 7.05, avg first CS turn 144.7

### Yield-Type Turnover Summary
- **Science:** 188 city-states, contested 0.71% (No Suz 0.00%, Close-race 0.71%), turnover window 59.69%, flip window 57.78%, safe lead 46.51%, hotspot 1.39%, flip rate 0.45/100T, ownership turnover 0.45/100T, avg unique suzerains 1.24
- **Production:** 188 city-states, contested 0.75% (No Suz 0.00%, Close-race 0.75%), turnover window 60.79%, flip window 58.94%, safe lead 44.60%, hotspot 1.26%, flip rate 0.46/100T, ownership turnover 0.46/100T, avg unique suzerains 1.27
- **Food:** 195 city-states, contested 0.85% (No Suz 0.02%, Close-race 0.84%), turnover window 60.29%, flip window 58.28%, safe lead 45.64%, hotspot 0.49%, flip rate 0.35/100T, ownership turnover 0.35/100T, avg unique suzerains 1.25
- **Gold:** 194 city-states, contested 0.85% (No Suz 0.00%, Close-race 0.85%), turnover window 60.01%, flip window 58.37%, safe lead 45.07%, hotspot 1.01%, flip rate 0.32/100T, ownership turnover 0.32/100T, avg unique suzerains 1.20

### Suzerainty vs Winning (Directional)
- **Winner Average Suzerainty Turns:** 182.06
- **Non-Winner Average Suzerainty Turns:** 107.97
- **Winners with Any Suzerainty:** 140/188 (74.5%)
- **Participant Win Rate with Any Suzerainty:** 28.1%
- **Participant Win Rate without Suzerainty:** 14.1%

## 10. Stalls & Issues

### Games Without Victory
- **Count:** 12 of 200 (6.0%)

### Stall Diagnostics

#### Stalled Game 1 (Tiny, seed 28028)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 12
- **Final Units:** 21
- **War Declarations:** 7
- **City Captures:** 1
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 35
- **Civ Details:**
  - JadeCovenant: 5 cities, pop 48, power 175.20000000000002, 14 techs
  - StarborneSeekers: 4 cities, pop 37, power 131, 16 techs

#### Stalled Game 2 (Tiny, seed 29029)
- **Turn Reached:** 401
- **Surviving Civs:** 2
- **Final Cities:** 14
- **Final Units:** 31
- **War Declarations:** 2
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 33
- **Civ Details:**
  - ForgeClans: 5 cities, pop 48, power 165, 13 techs
  - ScholarKingdoms: 6 cities, pop 53, power 254.53333333333333, 20 techs

#### Stalled Game 3 (Small, seed 116016)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 10
- **Final Units:** 29
- **War Declarations:** 1
- **City Captures:** 0
- **Observatory Completed:** No
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 24
- **Civ Details:**
  - JadeCovenant: 4 cities, pop 40, power 169.12, 14 techs
  - ScholarKingdoms: 2 cities, pop 11, power 45.6, 8 techs
  - StarborneSeekers: 2 cities, pop 11, power 26, 9 techs

#### Stalled Game 4 (Standard, seed 201001)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 21
- **Final Units:** 84
- **War Declarations:** 4
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 67
- **Civ Details:**
  - StarborneSeekers: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - ScholarKingdoms: 3 cities, pop 26, power 124.80000000000001, 13 techs
  - ForgeClans: 3 cities, pop 31, power 299.3333333333333, 11 techs
  - RiverLeague: 9 cities, pop 88, power 916.5333333333333, 20 techs

#### Stalled Game 5 (Standard, seed 211011)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 14
- **Final Units:** 39
- **War Declarations:** 3
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** No
- **Events in Last 50 Turns:** 28
- **Civ Details:**
  - RiverLeague: 1 cities, pop 11, power 50, 8 techs
  - ForgeClans: 4 cities, pop 35, power 225.7866666666667, 15 techs
  - ScholarKingdoms: 4 cities, pop 34, power 175.8, 14 techs
  - JadeCovenant: 0 cities, pop 0, power 0, 3 techs (ELIMINATED)

#### Stalled Game 6 (Standard, seed 228028)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 22
- **Final Units:** 85
- **War Declarations:** 4
- **City Captures:** 3
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 78
- **Civ Details:**
  - ScholarKingdoms: 10 cities, pop 97, power 755.6666666666666, 20 techs
  - StarborneSeekers: 1 cities, pop 10, power 21, 11 techs
  - JadeCovenant: 3 cities, pop 23, power 168, 9 techs
  - RiverLeague: 4 cities, pop 38, power 103, 11 techs

#### Stalled Game 7 (Standard, seed 232032)
- **Turn Reached:** 401
- **Surviving Civs:** 4
- **Final Cities:** 21
- **Final Units:** 57
- **War Declarations:** 13
- **City Captures:** 17
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 73
- **Civ Details:**
  - AetherianVanguard: 6 cities, pop 60, power 234, 20 techs
  - RiverLeague: 2 cities, pop 22, power 89.26666666666667, 17 techs
  - ForgeClans: 7 cities, pop 69, power 460.32, 20 techs
  - StarborneSeekers: 2 cities, pop 21, power 34.2, 8 techs

#### Stalled Game 8 (Standard, seed 239039)
- **Turn Reached:** 401
- **Surviving Civs:** 3
- **Final Cities:** 16
- **Final Units:** 47
- **War Declarations:** 10
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 48
- **Civ Details:**
  - JadeCovenant: 7 cities, pop 69, power 370.73333333333335, 15 techs
  - StarborneSeekers: 4 cities, pop 34, power 83.13333333333333, 20 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 9 techs (ELIMINATED)
  - AetherianVanguard: 3 cities, pop 28, power 117, 14 techs

#### Stalled Game 9 (Large, seed 312012)
- **Turn Reached:** 451
- **Surviving Civs:** 6
- **Final Cities:** 22
- **Final Units:** 65
- **War Declarations:** 11
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 74
- **Civ Details:**
  - AetherianVanguard: 4 cities, pop 39, power 148.85, 14 techs
  - ScholarKingdoms: 7 cities, pop 62, power 307.26666666666665, 20 techs
  - StarborneSeekers: 1 cities, pop 8, power 16.2, 11 techs
  - RiverLeague: 2 cities, pop 19, power 79, 9 techs
  - JadeCovenant: 2 cities, pop 18, power 65, 9 techs
  - ForgeClans: 1 cities, pop 9, power 44, 6 techs

#### Stalled Game 10 (Large, seed 316016)
- **Turn Reached:** 451
- **Surviving Civs:** 4
- **Final Cities:** 27
- **Final Units:** 62
- **War Declarations:** 17
- **City Captures:** 8
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 72
- **Civ Details:**
  - RiverLeague: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - StarborneSeekers: 2 cities, pop 19, power 50.266666666666666, 6 techs
  - JadeCovenant: 6 cities, pop 59, power 256.5333333333333, 18 techs
  - ScholarKingdoms: 0 cities, pop 0, power 0, 6 techs (ELIMINATED)
  - AetherianVanguard: 9 cities, pop 83, power 369, 20 techs
  - ForgeClans: 2 cities, pop 20, power 198.93333333333334, 13 techs

#### Stalled Game 11 (Huge, seed 409009)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 30
- **Final Units:** 104
- **War Declarations:** 18
- **City Captures:** 9
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 103
- **Civ Details:**
  - StarborneSeekers: 10 cities, pop 102, power 647.4, 20 techs
  - AetherianVanguard: 5 cities, pop 53, power 190, 18 techs
  - JadeCovenant: 1 cities, pop 11, power 25.36, 15 techs
  - RiverLeague: 3 cities, pop 30, power 314, 8 techs
  - ForgeClans: 0 cities, pop 0, power 0, 11 techs (ELIMINATED)
  - ScholarKingdoms: 3 cities, pop 31, power 80, 12 techs

#### Stalled Game 12 (Huge, seed 418018)
- **Turn Reached:** 501
- **Surviving Civs:** 5
- **Final Cities:** 21
- **Final Units:** 71
- **War Declarations:** 13
- **City Captures:** 1
- **Observatory Completed:** Yes
- **Grand Academy Completed:** Yes
- **Events in Last 50 Turns:** 72
- **Civ Details:**
  - ScholarKingdoms: 0 cities, pop 0, power 0, 12 techs (ELIMINATED)
  - AetherianVanguard: 2 cities, pop 20, power 76.8, 12 techs
  - JadeCovenant: 0 cities, pop 0, power 14, 0 techs
  - StarborneSeekers: 2 cities, pop 12, power 34.53333333333333, 17 techs
  - ForgeClans: 3 cities, pop 30, power 209.62666666666667, 13 techs
  - RiverLeague: 6 cities, pop 51, power 365.1333333333333, 10 techs

## 11. Map Size Analysis

### Tiny Maps
- **Simulations:** 40
- **Victories:** 38 (95.0%)
  - Conquest: 36, Progress: 2
- **Average Victory Turn:** 233.7
- **Victory Turn Range:** [36, 389]

### Small Maps
- **Simulations:** 40
- **Victories:** 39 (97.5%)
  - Conquest: 38, Progress: 1
- **Average Victory Turn:** 191.9
- **Victory Turn Range:** [40, 388]

### Standard Maps
- **Simulations:** 40
- **Victories:** 35 (87.5%)
  - Conquest: 22, Progress: 13
- **Average Victory Turn:** 312.7
- **Victory Turn Range:** [184, 399]

### Large Maps
- **Simulations:** 40
- **Victories:** 38 (95.0%)
  - Conquest: 8, Progress: 30
- **Average Victory Turn:** 348.3
- **Victory Turn Range:** [146, 432]

### Huge Maps
- **Simulations:** 40
- **Victories:** 38 (95.0%)
  - Conquest: 6, Progress: 32
- **Average Victory Turn:** 355.3
- **Victory Turn Range:** [235, 460]

## 12. Balance Observations

### Victory Timing vs Pop 10
- Average Victory Turn: 287.5
- Average Pop 10 Turn: 333.6
- **Gap:** 46.2 turns (Pop 10 happens AFTER victory)

### Civilization Balance
- Highest Win Rate: ForgeClans (25.9%)
- Lowest Win Rate: RiverLeague (17.9%)
- **Win Rate Spread:** 8.0 percentage points

### Settler Survival
- Settlers Produced: 3376
- Settlers Killed: 873
- **Settler Survival Rate:** 74.1%

