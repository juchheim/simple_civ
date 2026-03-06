# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 600 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 600
- **Total CPs Spent Across All Civs & Sims**: 80523
- **Average Network-Wide CPs Spent Per Game**: 134.2

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| StarborneSeekers | 421                 | 17338           | 41.18                  |
| ScholarKingdoms | 422                 | 16795           | 39.80                  |
| JadeCovenant | 417                 | 13156           | 31.55                  |
| ForgeClans   | 415                 | 12359           | 29.78                  |
| RiverLeague  | 419                 | 11551           | 27.57                  |
| AetherianVanguard | 426                 | 9324            | 21.89                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
