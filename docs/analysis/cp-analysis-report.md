# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 600 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 600
- **Total CPs Spent Across All Civs & Sims**: 96180
- **Average Network-Wide CPs Spent Per Game**: 160.3

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| ScholarKingdoms | 422                 | 25883           | 61.33                  |
| StarborneSeekers | 421                 | 19328           | 45.91                  |
| ForgeClans   | 415                 | 13921           | 33.54                  |
| JadeCovenant | 417                 | 13769           | 33.02                  |
| RiverLeague  | 419                 | 12426           | 29.66                  |
| AetherianVanguard | 426                 | 10853           | 25.48                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
