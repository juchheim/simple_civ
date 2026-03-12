# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 600 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 600
- **Total CPs Spent Across All Civs & Sims**: 93895
- **Average Network-Wide CPs Spent Per Game**: 156.5

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| ScholarKingdoms | 422                 | 22861           | 54.17                  |
| StarborneSeekers | 421                 | 18800           | 44.66                  |
| JadeCovenant | 417                 | 13976           | 33.52                  |
| ForgeClans   | 415                 | 13871           | 33.42                  |
| RiverLeague  | 419                 | 12996           | 31.02                  |
| AetherianVanguard | 426                 | 11391           | 26.74                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
