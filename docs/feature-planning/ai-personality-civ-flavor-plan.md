## Scope
- Add a thin, data-only `AiPersonality` layer that plugs into existing AI decision points (war/peace, settling, tech/build priorities, unit postures).
- Give each civ distinct behavior aligned with its trait/unique and likely victory path without bespoke logic branches.
- Keep defaults for future civs and ensure behavior remains deterministic and testable.

## Personality Schema (data, no scripts)
- `warPowerThreshold`: multiplier vs enemy power to declare war ( <1 = bolder, >1 = cautious ); used in `aiWarPeaceDecision`.
- `warDistanceMax`: max hex distance to consider war viable.
- `peacePowerThreshold`: multiplier when losing to seek/accept peace.
- `aggressionSpikeTrigger?`: optional trigger that swaps to `warPowerThresholdLate` (e.g., "TitanBuilt", "ProgressLead").
- `settleBias`: `{ hills?: number; rivers?: number }` weights added to site scoring.
- `expansionDesire`: multiplier for desired city/settler weight.
- `techWeights`: partial map `TechId -> weight` for `aiChooseTech`.
- `projectRush?`: `ProjectId` to prioritize (Titan's Core, Spirit Observatory, Jade Granary).
- `unitBias`: `{ navalWeight?: number; hillHold?: boolean; rangedSafety?: number }` informing build weights and positioning heuristics.
- Default profile should be neutral (warPowerThreshold ~1.0, distance 8, peace 0.9, no biases).

## Civ Profiles (using above knobs)
- ForgeClans: warPowerThreshold 0.9, warDistanceMax 8, settleBias.hills +1, unitBias.hillHold true.
- Scholar Kingdoms: warPowerThreshold 1.2, peacePowerThreshold 1.1, techWeights favor science line, unitBias.rangedSafety +1.
- River League: warPowerThreshold 1.0, expansionDesire 1.3, settleBias.rivers +1.5, unitBias.navalWeight +1.
- Aetherian Vanguard: early warPowerThreshold 1.15, aggressionSpikeTrigger "TitanBuilt" → warPowerThresholdLate 0.8, projectRush Titan's Core.
- Starborne Seekers: warPowerThreshold 1.3, peacePowerThreshold 1.2, techWeights favor Star Charts/Progress chain, projectRush Spirit Observatory.
- Jade Covenant: expansionDesire 1.5, peacePowerThreshold 1.1, projectRush Jade Granary, techWeights favor Wellworks.

## Integration Steps
1) Add `engine/src/game/ai/personality.ts` exporting schema, default profile, per-civ profile map, and `getPersonality(civId)`.
2) War/Peace: thread personality into `aiWarPeaceDecision` to replace hardcoded power/distance thresholds and honor `aggressionSpikeTrigger` for Aetherian-style flips.
3) Victory bias: in `aiVictoryBias`, tilt toward Progress when `projectRush`/techWeights match (Starborne, Scholar) and toward Conquest when aggression is high (ForgeClans post-spike).
4) Settling/Expansion: inject `settleBias` and `expansionDesire` into city-site scoring and settler build weighting.
5) Tech/Projects: apply `techWeights` and `projectRush` in `aiChooseTech` and build/project prioritization so uniques are pursued (Titan, Spirit Observatory, Jade Granary).
6) Unit posture/build: use `unitBias` to increase naval scouting/blockades (River), prefer hill holds (ForgeClans), and safer ranged spacing (Scholar/Starborne).
7) Defaults: ensure any civ without an entry falls back to default profile with no behavior change.

## Tests (Vitest, engine)
- War/peace decisions respect `warPowerThreshold`/`warDistanceMax` per personality and flip after triggers.
- Settling picks river/hill sites when biases exist and reverts to neutral otherwise.
- Tech choice prioritizes weighted targets and project rushes fire (Titan, Spirit Observatory, Jade Granary).
- Ranged safety/naval weight alter positioning/build selection for respective civs.

## Risks & Mitigations
- Parameter creep: keep schema small and mapped to specific functions; avoid per-civ conditionals outside `getPersonality`.
- Flavor drift: add regression tests for each profile’s key behaviors.
- Over-commit to uniques: ensure fallbacks if a wonder is already built or blocked.
