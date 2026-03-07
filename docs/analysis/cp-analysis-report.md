# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 50 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 50
- **Total CPs Spent Across All Civs & Sims**: 6515
- **Average Network-Wide CPs Spent Per Game**: 130.3

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| StarborneSeekers | 34                  | 1725            | 50.74                  |
| ForgeClans   | 34                  | 1284            | 37.76                  |
| ScholarKingdoms | 36                  | 1097            | 30.47                  |
| JadeCovenant | 35                  | 1037            | 29.63                  |
| RiverLeague  | 35                  | 798             | 22.80                  |
| AetherianVanguard | 36                  | 574             | 15.94                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
