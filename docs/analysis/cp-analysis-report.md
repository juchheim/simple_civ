# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of 600 simulated games.

## Overall Summary

- **Total Sims Analyzed**: 600
- **Total CPs Spent Across All Civs & Sims**: 97293
- **Average Network-Wide CPs Spent Per Game**: 162.2

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
| ScholarKingdoms | 422                 | 21592           | 51.17                  |
| StarborneSeekers | 421                 | 19875           | 47.21                  |
| JadeCovenant | 417                 | 15773           | 37.82                  |
| ForgeClans   | 415                 | 14544           | 35.05                  |
| RiverLeague  | 419                 | 13481           | 32.17                  |
| AetherianVanguard | 426                 | 12028           | 28.23                  |

## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the `bestAttackForUnit()` AI heuristic thresholds inside `tactical-planner.ts`.
