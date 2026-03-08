# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 100 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 100
- **Total CPs Spent Across All Civs & Sims**: 13365
- **Average Network-Wide CPs Spent Per Game**: 133.7

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| ScholarKingdoms | 70                  | 2752            | 39.31                  |
| StarborneSeekers | 68                  | 2652            | 39.00                  |
| JadeCovenant | 67                  | 2100            | 31.34                  |
| ForgeClans   | 74                  | 2316            | 31.30                  |
| RiverLeague  | 70                  | 1878            | 26.83                  |
| AetherianVanguard | 71                  | 1667            | 23.48                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
