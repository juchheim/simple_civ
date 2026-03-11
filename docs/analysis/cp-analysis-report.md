# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 200 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 200
- **Total CPs Spent Across All Civs & Sims**: 32351
- **Average Network-Wide CPs Spent Per Game**: 161.8

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| ScholarKingdoms | 145                 | 7906            | 54.52                  |
| StarborneSeekers | 137                 | 7003            | 51.12                  |
| RiverLeague  | 140                 | 4938            | 35.27                  |
| JadeCovenant | 132                 | 4546            | 34.44                  |
| ForgeClans   | 139                 | 4502            | 32.39                  |
| AetherianVanguard | 147                 | 3456            | 23.51                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
