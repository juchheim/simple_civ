## Doc Drift Report (v0.92)

- Scope: mismatches between the shipped code and the rules/spec docs in `docs/`.

### Rulebook & Dev Spec (docs/rules/simple-civ_v0.9_rulebook.md, docs/rules/simple-civ_v0.9_dev_spec.md)
- ✅ City territory and tile working: cities now claim radius-2 territory on founding (no-sharing enforced) and auto-assign worked tiles up to Pop, re-evaluated on growth and population loss (`engine/src/game/turn-loop.ts`, consumed directly in the client via `@simple-civ/engine/applyAction`).
- ✅ City capture/raze: MoveUnit now captures enemy cities at 0 HP (melee/cav only), resets HP/pop, transfers territory, and a Raze action clears the city/territory (same shared engine entry point used by the client).
- ✅ City ranged attack: cities with a friendly garrison can make one ranged attack per turn (range 2, CityWard bonus applied) via a CityAttack action in engine/client turn loop.
- ✅ Fortify/healing: units that end turn idle become Fortified; start-of-turn healing now applies on friendly tiles/cities before refresh (`engine/src/game/turn-loop.ts`, client mirror).
- ✅ Growth handling: growth now loops to allow multiple pops per turn and reassigns worked tiles immediately (`engine/src/game/turn-loop.ts`, surfaced in the client via the shared engine import).
- ✅ River rules unblocked: map gen now persists rivers as edge graphs (`map.rivers`) and still mirrors overlays for legacy saves; adjacency bonuses read the edge data and the client renders continuous river segments instead of blue dots (`engine/src/map/rivers.ts`, `client/src/components/GameMap.tsx`).
- ✅ River geometry source of truth: the engine now emits fully ordered corner polylines (`map.riverPolylines`) with explicit start/end coordinates per segment, and the client renders those verbatim (previous docs assumed the client rebuilt geometry heuristically).
- ✅ Progress projects: Observatory now grants +1 Science in its city and GrandAcademy grants +1 Science per city; milestones recorded on completion.
- ✅ Tech passives: FormationTraining/DrilledRanks now modify unit combat stats; SignalRelay adds +1 Science per city. ArmyDoctrine remains a gating tech only.
- ✅ Form Army flow: availability requires a full-HP base unit within city borders; completion transforms that unit to the Army variant (`engine/src/game/rules.ts`, `engine/src/game/turn-loop.ts`, with the client executing the same logic through `@simple-civ/engine`).
- ✅ City Wards prereq: CityWards tech now accepts StoneworkHalls OR FormationTraining when choosing the tech.
- ✅ Victory/elimination: end-of-round now checks Progress (GrandExperiment + city), Conquest (owns all capitals), and eliminates civs only when they have zero cities **and no Settlers** (removing their units).
- ✅ Diplomacy/FoW: war/peace state tracks and auto-declares on attacks/captures; peace can be proposed/accepted (reciprocal offers insta-peace). Fog-of-war uses per-player visibility/reveal with fog shading, shroud indicators, and a toggle to show unseen tiles. (Code also adds a mutual vision-sharing pact that is not described in the docs.)
- ✅ Civ traits: ForgeClans (+1P if working Hills), ScholarKingdoms (+1S at Pop ≥3), and RiverLeague (+1F on river-adj worked tiles) applied during city yields.

### Dev Spec modules in docs/dev-spec/v0.9/*.ts.md
- Map generation ignores `mapGenParams.ts.md`/`generateMap.ts.md`: no mountain clusters, coast bias, overlay density toggles, or start guarantees (food/prod tiles, min 6-tile spacing); engine uses simple noise and 4-tile spacing (`engine/src/map/map-generator.ts:85-201`).
- Type shapes largely align again: `map.rivers` now exposes edge data alongside tile overlays, so spec hooks that consume river graphs can function.
- City utilities from `cities.ts.md` (capture reset to 10 HP, pop loss, raze, project effects) and `states.ts.md` (fortify/heal helpers) are not present in the engine.
- Diplomacy/visibility logic lives directly in the turn loop (war/peace state, auto-declare, FoW visibility/reveal, new mutual vision sharing), not in the dev-spec helper modules.
- ✅ AI hooks now live in `game/ai/{goals,tech,cities,city-heuristics,units,diplomacy,turn-runner}.ts`, with `ai-heuristics.ts` and `ai-decisions.ts` supplying the documented scoring/war heuristics and `game/ai.ts` delegating to the shared runner.

### Client/UI gaps against docs
- Build menus now expose full unit/building/project lists; manual worked-tile selection has center enforcement/feedback; fog-of-war shows tinted fog for seen tiles, renders unseen shroud hexes (toggleable), and keeps a legend.

### docs/IMPLEMENTATION_STATUS.md accuracy issues
- Listed as “Fully Implemented”: Map generation, city system, combat system, and unit system, but the engine still lacks map-gen guarantees/spec features, diplomacy/fog-of-war, and AI (see above). Most city/combat/tech items are now implemented.
- “Partially Implemented: City capture mechanics (damage implemented, capture not)” is outdated; capture/ownership transfer and raze now exist.
