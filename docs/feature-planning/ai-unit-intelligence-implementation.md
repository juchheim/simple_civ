# AI Unit Intelligence Implementation Plan

## Goal
Increase AI unit competence across peace and war by adding defensive posture, garrisons, and smarter movement without rewriting the whole AI loop.

## Priorities
1) City safety: ensure garrisons in peace and war; respond to nearby threats; keep cities firing.
2) Peace stance: stop aimless idling—explore fog with scouts, keep units on defensive tiles, avoid provoking wars.
3) War efficiency: reduce suicides, focus fire, and avoid getting stuck on terrain/domain.
4) Formation discipline: keep ranged at standoff, use terrain defense, and prevent over-stacking.

## Status by phase
- Phase 1 (complete):
  - City-defense pass: auto-garrison empty cities; pull defenders toward threatened cities (enemies within ~3 tiles).
  - Threat-aware positions: keep at least one defender within 2 tiles of threatened cities before marching out.
  - Turn order wiring: defense/rotation run before diplomacy/attacks.
  - Light pathfinding accepted for marching.
- Phase 2 (in progress):
  - Peace posture: scouts explore fog; defenders stay near cities and avoid provocative border adjacency.
  - War posture upgrades: odds-aware/focus-fire attacks, wounded retreat, capture routing to 0-HP cities, garrison rotation (adjacent + ring-3 pulls with threat checks), primary siege focus persisted across turns, ranged standoff/spacing/defense bias, overexposure avoidance, and stack filtering.
  - Domain-aware movement: land/naval pathfinding in use; chokepoint jam avoidance improved via stack filter; naval parity partially applied (coastal targeting + spacing).

## Testing notes
- Add/regress AI unit tests that assert: (1) empty cities get garrisoned when a defender is adjacent; (2) threats pull a defender within 2 tiles; (3) the new pass runs before attacks so city fire is enabled. Keep seeds deterministic.
- Coverage added for: garrison rotation (ring-3 pull with threat check), ranged reposition, capture routing, naval coastal targeting, and multi-turn AI rules compliance with trace logging. Future: add persistence checks for siege focus/stack filters under varied seeds and richer combat scenarios.
- Add coverage for stack filters and ranged repositioning (no >2 adjacent friends; avoid ending adjacent to enemies).

## Progress
- Implemented Phase 1 garrison/threat pass and wired it into the AI turn sequence.
- Added peace-time patrol/exploration: scouts walk toward unrevealed tiles (avoid ending adjacent to foreign cities), and idle defenders stay within 2 tiles of a friendly city while leaving escorts/settlers alone.
- War march now uses pathfinding toward target cities (with greedy fallback) to reduce stalls on terrain/domain.
- Added wounded retreat to the nearest friendly city while at war to keep units alive for city defense.
- Added capture routing: steer the nearest capture-capable unit toward any 0-HP enemy city.
- Attacks now prefer kill shots, avoid very low-value trades (expected damage vs counter), and focus on a primary war city when multiple are in range.
- Added garrison rotation: if a garrison is low HP and an adjacent healthier defender exists, the wounded unit steps out and the healthy unit steps in to keep city attacks online.
- Began formation discipline: ranged units hold standoff when already in range, and march-order tile choice favors better defense when distance is tied.
- Garrison rotation can now pull healthier replacements from ring 3 (skipping if the donor is pinning nearby enemies), and ranged march ordering prefers ending near desired range, lower crowding, and better defense.
- Siege focus now persists per AI: a primary target city is remembered across turns for movement/attacks; ranged pathing prefers less-crowded, better-defense tiles when distances tie.
- Added choke/stack controls: war marching filters out steps with >2 adjacent friendlies; ranged units reposition out of crowds or adjacency to enemies when possible and avoid non-lethal shots when adjacent enemies remain.
- Naval parity improvements: naval units target coastal cities, pathfind, and honor spacing rules similarly to land units.
- Added trace harness (`runAiTurnSequenceWithTrace`) and compliance test to log per-action decisions; diplomacy can be bypassed in tests to observe sustained movement/combat without peace spam.
