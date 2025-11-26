## AI Autoplay Stall on Huge Map (Seed 321, 200-turn cap)

### What was run
- Headless AI-only autoplay via `engine/src/sim/ai-autoplay.ts`:
  - Command: `node engine/dist/sim/ai-autoplay.js --seed=321 --turns=200 --size=Huge`
  - Civs: all six (ForgeClans, ScholarKingdoms, RiverLeague, AetherianVanguard, StarborneSeekers, JadeCovenant)
  - Turn cap: 200 (ended at turn 201 with no victory)

### Observed outcomes
- No winner; no wars or city captures; no eliminations.
- City counts: 1–3 per civ over 200 turns.
- Tech progression stalled for several civs:
  - ScholarKingdoms: 1 tech
  - StarborneSeekers: 1 tech
  - JadeCovenant: 1 tech
- Unique projects not built (Titan, Spirit Observatory, Jade Granary) and no Progress chain.
- Max city pop mostly 9–12; pop 10 reached between turns ~69–168.
- No AI-visible aggression despite personalities.

### Problems discovered
1) Severe tech stagnation for multiple civs (stuck after first tech) despite long game length.
2) No combat: aggression thresholds/distance or contact logic preventing wars/captures on Huge.
3) Project rushes and tech weights not expressing (uniques/Progress chain unused).
4) Minimal expansion: 1–3 cities per civ suggests settler/build heuristics may be underweight or blocked.

### Next steps proposed
- Debug tech selection/Science accumulation to find why players stop researching after first tech.
- Inspect AI build/settler priorities and war/peace thresholds to ensure expansion and conflict happen.
- Re-run autoplay after fixes to confirm wars, tech progress, and project completions occur before turn cap.
