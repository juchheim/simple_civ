# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 100 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 100
- **Total CPs Spent Across All Civs & Sims**: 14897
- **Average Network-Wide CPs Spent Per Game**: 149.0

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| StarborneSeekers | 68                  | 3501            | 51.49                  |
| ScholarKingdoms | 70                  | 2874            | 41.06                  |
| RiverLeague  | 70                  | 2391            | 34.16                  |
| JadeCovenant | 67                  | 2156            | 32.18                  |
| ForgeClans   | 74                  | 2306            | 31.16                  |
| AetherianVanguard | 71                  | 1669            | 23.51                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
