# Enhanced Comprehensive Analysis Report

**Date:** 2025-11-27
**Simulations:** 50 total (10 per map size)

---

## 1. Which Civs Win by Which Victory Type

### Victory Distribution by Civilization

#### ForgeClans
- **Total Wins:** 10
- **Conquest Victories:** 4 (40.0%)
- **Progress Victories:** 6 (60.0%)

#### RiverLeague
- **Total Wins:** 8
- **Conquest Victories:** 1 (12.5%)
- **Progress Victories:** 7 (87.5%)

#### StarborneSeekers
- **Total Wins:** 7
- **Conquest Victories:** 2 (28.6%)
- **Progress Victories:** 5 (71.4%)

#### ScholarKingdoms
- **Total Wins:** 6
- **Conquest Victories:** 0 (0.0%)
- **Progress Victories:** 6 (100.0%)

#### AetherianVanguard
- **Total Wins:** 6
- **Conquest Victories:** 5 (83.3%)
- **Progress Victories:** 1 (16.7%)

#### JadeCovenant
- **Total Wins:** 6
- **Conquest Victories:** 5 (83.3%)
- **Progress Victories:** 1 (16.7%)

## 2. Accurate Participation & Win Rates per Civ

#### ScholarKingdoms
- **Games Participated:** 36
- **Wins:** 6 (16.7% win rate)
- **Eliminations:** 15 (41.7% elimination rate)
- **Avg Final Cities:** 1.4
- **Avg Final Population:** 9.9

#### AetherianVanguard
- **Games Participated:** 36
- **Wins:** 6 (16.7% win rate)
- **Eliminations:** 8 (22.2% elimination rate)
- **Avg Final Cities:** 2.9
- **Avg Final Population:** 20.6

#### RiverLeague
- **Games Participated:** 35
- **Wins:** 8 (22.9% win rate)
- **Eliminations:** 7 (20.0% elimination rate)
- **Avg Final Cities:** 3.6
- **Avg Final Population:** 26.8

#### JadeCovenant
- **Games Participated:** 35
- **Wins:** 6 (17.1% win rate)
- **Eliminations:** 14 (40.0% elimination rate)
- **Avg Final Cities:** 3.5
- **Avg Final Population:** 27.0

#### ForgeClans
- **Games Participated:** 34
- **Wins:** 10 (29.4% win rate)
- **Eliminations:** 8 (23.5% elimination rate)
- **Avg Final Cities:** 6.5
- **Avg Final Population:** 46.1

#### StarborneSeekers
- **Games Participated:** 34
- **Wins:** 7 (20.6% win rate)
- **Eliminations:** 13 (38.2% elimination rate)
- **Avg Final Cities:** 2.0
- **Avg Final Population:** 12.9

## 3. Why Smaller Maps Stall - Detailed Diagnostics

### Tiny Maps
- **Games Without Victory:** 5 of 10 (50%)
- **Detected Stalls:** 4

#### No-Victory Game Details:
- **Seed 4004:** Reached turn 201, 2 civs, 6 cities, 50 total pop, 11 events in last 10 turns
- **Seed 5005:** Reached turn 201, 2 civs, 5 cities, 46 total pop, 6 events in last 10 turns
- **Seed 6006:** Reached turn 201, 2 civs, 4 cities, 37 total pop, 13 events in last 10 turns
- **Seed 8008:** Reached turn 201, 2 civs, 5 cities, 41 total pop, 23 events in last 10 turns
- **Seed 10010:** Reached turn 201, 2 civs, 6 cities, 46 total pop, 12 events in last 10 turns

#### Detailed Diagnostics:
**Seed 4004 (Turn 201):**
- Recent wars: 0
- Recent techs: 2
- Recent projects: 0
- Civs at end:
  - AetherianVanguard: 4 cities, 32 pop, 15 techs, 64 projects, 591 power
  - ScholarKingdoms: 2 cities, 18 pop, 13 techs, 7 projects, 0 power

**Seed 5005 (Turn 201):**
- Recent wars: 0
- Recent techs: 2
- Recent projects: 1
- Civs at end:
  - AetherianVanguard: 3 cities, 27 pop, 15 techs, 67 projects, 513 power
  - ScholarKingdoms: 2 cities, 19 pop, 13 techs, 3 projects, 31 power

**Seed 6006 (Turn 201):**
- Recent wars: 0
- Recent techs: 5
- Recent projects: 1
- Civs at end:
  - ScholarKingdoms: 2 cities, 17 pop, 14 techs, 11 projects, 4 power
  - StarborneSeekers: 2 cities, 20 pop, 13 techs, 47 projects, 435 power

### Small Maps
- **Games Without Victory:** 0 of 10 (0%)
- **Detected Stalls:** 0

### Standard Maps
- **Games Without Victory:** 1 of 10 (10%)
- **Detected Stalls:** 0

#### No-Victory Game Details:
- **Seed 210010:** Reached turn 201, 4 civs, 14 cities, 100 total pop, 42 events in last 10 turns

#### Detailed Diagnostics:
**Seed 210010 (Turn 201):**
- Recent wars: 1
- Recent techs: 3
- Recent projects: 1
- Civs at end:
  - RiverLeague: 7 cities, 45 pop, 15 techs, 99 projects, 667 power
  - ForgeClans: 6 cities, 51 pop, 15 techs, 167 projects, 1378 power
  - ScholarKingdoms: 0 cities, 0 pop, 6 techs, 0 projects, 0 power (ELIMINATED)
  - JadeCovenant: 1 cities, 4 pop, 9 techs, 19 projects, 0 power

### Large Maps
- **Games Without Victory:** 1 of 10 (10%)
- **Detected Stalls:** 0

#### No-Victory Game Details:
- **Seed 305005:** Reached turn 201, 6 civs, 16 cities, 129 total pop, 70 events in last 10 turns

#### Detailed Diagnostics:
**Seed 305005 (Turn 201):**
- Recent wars: 2
- Recent techs: 3
- Recent projects: 2
- Civs at end:
  - AetherianVanguard: 3 cities, 29 pop, 13 techs, 58 projects, 126 power
  - StarborneSeekers: 1 cities, 7 pop, 5 techs, 1 projects, 0 power
  - RiverLeague: 4 cities, 32 pop, 15 techs, 72 projects, 122 power
  - ForgeClans: 8 cities, 61 pop, 15 techs, 170 projects, 934 power
  - ScholarKingdoms: 0 cities, 0 pop, 8 techs, 7 projects, 0 power (ELIMINATED)
  - JadeCovenant: 0 cities, 0 pop, 2 techs, 0 projects, 0 power (ELIMINATED)

### Huge Maps
- **Games Without Victory:** 0 of 10 (0%)
- **Detected Stalls:** 0

## 4. Settler Death Rates vs Production

### Overall Statistics
- **Total Settlers (produced + starting):** 1344 (924 produced + 420 starting)
- **Total Settlers Killed:** 173
- **Death Rate:** 12.9%

### By Civilization
- **ForgeClans:** 200 total (132 produced + 68 starting), 32 killed (16.0% death rate), 149 cities founded
- **ScholarKingdoms:** 200 total (128 produced + 72 starting), 31 killed (15.5% death rate), 95 cities founded
- **RiverLeague:** 239 total (169 produced + 70 starting), 32 killed (13.4% death rate), 137 cities founded
- **AetherianVanguard:** 262 total (190 produced + 72 starting), 25 killed (9.5% death rate), 122 cities founded
- **StarborneSeekers:** 200 total (132 produced + 68 starting), 16 killed (8.0% death rate), 110 cities founded
- **JadeCovenant:** 243 total (173 produced + 70 starting), 37 killed (15.2% death rate), 113 cities founded

## 5. Army Usage Patterns

### Overall Statistics
- **Army Formations (via projects):** 336
- **Army Units Killed:** 1882
- **Average Deaths per Formation:** 5.6

### By Civilization
- **ForgeClans:** 69 formed, 510 killed
- **ScholarKingdoms:** 41 formed, 99 killed
- **RiverLeague:** 58 formed, 550 killed
- **AetherianVanguard:** 66 formed, 393 killed
- **StarborneSeekers:** 47 formed, 169 killed
- **JadeCovenant:** 55 formed, 161 killed

## 6. Pop 10 vs Victory Timing Gap

### Overall Statistics
- **Games with Pop 10 Cities:** 19 of 43 victories
- **Average Victory Turn:** 172.7
- **Average Pop 10 Turn:** 161.7
- **Average Gap:** 11.0 turns (pop 10 before victory)

### By Map Size
- **Small:** 2 games, avg gap 5.5 turns
- **Standard:** 6 games, avg gap 12.0 turns
- **Large:** 3 games, avg gap 22.4 turns
- **Huge:** 8 games, avg gap 7.4 turns

### By Victory Type
- **Conquest:** 3 games, avg gap 5.3 turns
- **Progress:** 16 games, avg gap 12.1 turns
