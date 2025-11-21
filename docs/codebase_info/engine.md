# Engine Internals

The `@simple-civ/engine` workspace holds all deterministic game logic. Everything else (UI, API) depends on exports re-exported in `engine/src/index.ts`.

## Module Map
```mermaid
graph TD
  Types[core/types.ts] --> MapGen[map/map-generator.ts]
  Types --> Rules[game/rules.ts]
  Types --> Turn[game/turn-loop.ts]
  Hex[core/hex.ts] --> MapGen
  Hex --> Rules
  Hex --> Turn
  Const[core/constants.ts] --> MapGen
  Const --> Rules
  Const --> Turn
  MapGen --> Turn
  Rules --> Turn
  Turn --> AI[game/ai.ts]
  Heur[game/ai-heuristics.ts] --> Decisions[game/ai-decisions.ts]
  Decisions --> AI
  Rules --> Decisions
```

## State & Entities
- `GameState` (see `core/types.ts`): map tiles (`terrain`, `overlays`, `ownerId`), units (type/hp/moves/owner/flags), cities (pop, yields, builds, worked tiles), players (techs, projects, traits), diplomacy (contacts, offers, shared vision), visibility arrays, RNG seed.
- `constants.ts` encodes raw rules: terrain yields/move costs, unit/building stats, tech/project data, map sizes, city work radius, and combat tuning.
- Hex math lives in `core/hex.ts` (neighbors, distance, lines, spirals) and underpins movement, vision, river placement, and city work radius checks.

## Action & Turn Flow
- Entry: `applyAction(state, action)` in `game/turn-loop.ts` clones state, validates player/turn, and dispatches handlers.
- Supported actions: `MoveUnit`, `Attack`, `CityAttack`, `FoundCity`, `ChooseTech`, `SetCityBuild` (unit/building/project), `RazeCity`, `SetWorkedTiles`, `SetDiplomacy`, `ProposePeace/AcceptPeace`, `ProposeVisionShare/AcceptVisionShare/RevokeVisionShare`, `EndTurn`.
- Movement enforces adjacency, terrain/domain rules, and occupancy (military vs civilian stacking). Combat uses `ATTACK_RANDOM_BAND`, `DAMAGE_MIN/MAX` to bound rolls.
- End turn: rotate `currentPlayerId`, refill moves, tick production/tech, apply growth checks (`getGrowthCost`), recalc visibility from units/cities, clear fire/attack flags.
- Errors throw (e.g., wrong turn, impassable terrain); callers must catch.

```mermaid
stateDiagram-v2
  [*] --> StartTurn
  StartTurn --> ActionLoop: player issues actions
  ActionLoop --> EndTurn: EndTurn action
  EndTurn --> StartTurn: next player
```

## Yields & City Rules
- `game/rules.ts` centralizes yield math: base terrain + overlay bonuses, city center minimums, river adjacency bonus (+1 Food when worked), buildings with conditional bonuses (Reservoir if river-adjacent, LumberMill if working forest), base +1 Science per city, and project/civ trait modifiers.
- `canBuild` gates builds based on tech unlocks, existing structures, project prerequisites, and domain (e.g., naval units disallowed on landlocked cities via terrain checks elsewhere).
- Growth costs depend on population, `GROWTH_FACTORS`, and city yields; city work radius is constrained by `CITY_WORK_RADIUS_RINGS`.

## Map Generation (`map/map-generator.ts`)
- Seedable PRNG; reproducible when `settings.seed` is provided.
- Builds hex grid sized by `MAP_DIMS`; biases coasts to edges, randomizes interior biomes (Forest/Hills/Marsh/Desert), and sprinkles overlays (RichSoil/OreVein/SacredSite).
- Traces river edges by stepping through land tiles and recording edge pairs (`rivers`); overlays tiles touched with `RiverEdge`.
- Picks starting spots with guarantees (food/prod tiles in radius 2, workable land nearby) and min separation; scores candidates with `scoreCitySite`.
- Seeds per-player units (Settler + Scout), initializes visibility/contact/shared-vision/diplomacy matrices, assigns game id, and returns the initial `GameState`.

## AI Loop
- `ai-heuristics.ts` scores city sites and threats; `ai-decisions.ts` plans build/move/tech choices; `ai.ts` orchestrates a turn by applying a sequence of actions through `applyAction`.
- Client auto-skips AI turns in `App.tsx` by repeatedly calling `runAiTurn` until a human is current (safety-limited to 10 iterations).

## Extending the Engine
- Add a new action: update `Action` in `core/types.ts`, implement handler in `turn-loop.ts`, add any rule helpers/constants needed, and cover with Vitest.
- Add terrain/overlay/unit/building/tech/project: extend `constants.ts` and related enums, adjust rules/AI heuristics if yields or movement change, and ensure map gen or UI surfaces the new content.
- Keep pure: avoid I/O or timers; the engine should be deterministic given a state/action (aside from explicit RNG inside combat or map gen where seeds are available).

## Testing
- Vitest specs live beside code: `game/turn-loop.test.ts`, `game/ai.e2e.test.ts`, `map/map-generator.test.ts`, `game/rules.test.ts`. Add new cases adjacent to the module you change and seed randomness when possible.***
