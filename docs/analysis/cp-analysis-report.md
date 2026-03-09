# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 100 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 100
- **Total CPs Spent Across All Civs & Sims**: 13751
- **Average Network-Wide CPs Spent Per Game**: 137.5

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| StarborneSeekers | 68                  | 2970            | 43.68                  |
| ScholarKingdoms | 70                  | 2664            | 38.06                  |
| JadeCovenant | 67                  | 2380            | 35.52                  |
| ForgeClans   | 74                  | 2200            | 29.73                  |
| RiverLeague  | 70                  | 1902            | 27.17                  |
| AetherianVanguard | 71                  | 1635            | 23.03                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
