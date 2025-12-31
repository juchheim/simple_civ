# Legacy AI Features Ported to UtilityV2

All features from Phase 1 (enhancements) and Phase 2 (implementations) are complete.

---

## ✅ Phase 1: Enhanced Partial Features

| # | Feature | Change Summary |
|---|---------|---------------|
| 3 | Movement Safety | `countThreatsToTile()` penalty in `attackScoreVsUnit()` |
| 5 | War Preparation | `warPrepPhase` fields in `AiPlayerMemoryV2` |
| 8 | Skirmish Positioning | Ranged skirmishing pass with `getBestSkirmishPosition()` |
| 9 | City Threat Assessment | `getThreatLevel()` in `buildDefenseAssessment` for all cities |
| 10 | Deathball Pre-Rally | Titan Core detection with `titanCoreCityId` |

---

## ✅ Phase 2: Implemented Missing Features

| # | Feature | Implementation |
|---|---------|---------------|
| 1 | Battle Group Coordination | `identifyBattleGroups()` + `coordinateGroupAttack()` in attack pass |
| 2 | Aid Vulnerable Units | `aidVulnerableUnits()` before attacks |
| 4 | Ranged Repositioning | `repositionRanged()` after attacks |
| 6 | Camp Clearing | `manageCampClearing()` in turn-runner |
| 7 | Scout Exploration | `patrolAndExplore()` after combat |
| 13 | City Razing | `considerRazing()` after tactics |
| 15 | Early Rush Chance | `earlyRushChance` in profiles with RNG check |

---

## Files Modified

- `engine/src/game/ai2/tactics.ts` - battle groups, aid vulnerable, ranged repositioning, skirmishing
- `engine/src/game/ai2/defense.ts` - graduated threat levels
- `engine/src/game/ai2/memory.ts` - war prep phases, titan core tracking
- `engine/src/game/ai2/turn-runner.ts` - camp clearing, scout exploration, city razing
- `engine/src/game/ai2/diplomacy.ts` - early rush chance integration
- `engine/src/game/ai2/rules.ts` - earlyRushChance field, ForgeClans value
