# AI System Refactor Plan

## Background
`engine/src/game/ai.ts` is a ~560 line monolith that owns every aspect of computer-player behavior: goal setting, tech selection, city production choices, tile working, diplomacy decisions, and individual unit moves. The file interleaves state mutations, heuristics, and action dispatching, making it difficult to reason about or unit-test any single concern. Even small tweaks (e.g., tuning city build priorities) require wading through unrelated logic, increasing risk and slowing iteration on AI improvements.

## Goals
1. Break AI responsibilities into focused modules (goal management, tech selection, city management, unit commands, diplomacy) to simplify reasoning and testing.
2. Keep the public API (`runAiTurn` and helper exports) stable for callers such as the turn loop.
3. Establish deterministic tests around key decisions before moving logic to ensure no behavioral drift.
4. Lay groundwork for future AI sophistication (e.g., smarter combat heuristics) by isolating strategy vs. execution layers.

## Constraints & Guidelines
- No gameplay changes during the refactor; this is a structural shuffle only.
- Prefer pure, side-effect-free helpers that accept explicit inputs and return decisions; keep mutation centralized.
- Each new module must have its own focused tests (Vitest in `engine` workspace) covering the behaviors it owns.
- Avoid circular dependencies by keeping shared heuristics in a `ai/shared` utility folder.
- Update documentation (`docs/codebase_info/engine.md`, drift reports) once modules are in place.

## Proposed Phases

### Phase 0 – Inventory & Safeguards
1. Document current AI responsibilities and data flow inside this plan (list existing helper functions, decision branches).
2. Augment `engine/src/game/ai.test.ts` (or create it) with coverage for:
   - Goal selection fallback order.
   - Tech pick determinism for a fixed state.
   - City build priority ordering.
   - Unit action selection (move vs. fortify) for a canned scenario.
3. Capture manual validation steps (e.g., seed 41839 autoplay for 20 turns, ensure no crashes).

_Exit criteria_: Clear test checklist + manual validation steps recorded; failing tests block the refactor.

#### Phase 0 inventory snapshot (2025-11-24)
- **Helper index**: `tryAction` (safe wrapper around `applyAction`), `setAiGoal`, `pickTech`, `buildPriorities`, `pickCityBuilds`, `assignWorkedTiles`, `validCityTile`, `settleHereIsBest`, `assessSettlerSafety`, `detectNearbyDanger`, `moveSettlersAndFound`, `manageSettlerEscorts`, `captureIfPossible`, `attackTargets`, `moveMilitaryTowardTargets`, and `handleDiplomacy`. External heuristics from `ai-decisions.ts` (`aiVictoryBias`, `aiChooseTech`, `aiWarPeaceDecision`) and `ai-heuristics.ts` (`scoreCitySite`, `tileWorkingPriority`, `tilesByPriority`) feed many of these helpers.
- **Data flow**: `runAiTurn` sequences (1) derive goal via `aiVictoryBias` → persist with `setAiGoal`; (2) call `pickTech` to enqueue research; (3) funnel through `pickCityBuilds` and `assignWorkedTiles`; (4) command settlers via `moveSettlersAndFound` plus `manageSettlerEscorts`; (5) run diplomacy decisions in `handleDiplomacy`; (6) resolve combat with `attackTargets` before `moveMilitaryTowardTargets`; (7) finish with `EndTurn`. Each helper mutates state exclusively through `tryAction`, ensuring shared reducer logic remains the single mutation source.
- **Decision branches to guard**:
  - Goal bias priority: Observatory + safe capital ⇒ Progress, else army-in-range capital ⇒ Conquest, else fall back to stored `aiGoal`/Balanced.
  - Tech selection: focus paths per goal (Progress vs. Conquest) before cheapest-tech fallback.
  - City production: `buildPriorities` per goal feed `pickCityBuilds`, short-circuiting once a valid `canBuild` option is found.
  - Tile working: `tileWorkingPriority` chooses yield order, `tilesByPriority` drives `SetWorkedTiles`.
  - Unit flow: settlers avoid danger (`detectNearbyDanger`), evaluate settle sites (`settleHereIsBest`), and fallback-move; escorts run via `assessSettlerSafety`; combat units attack first then march toward wartime targets; `captureIfPossible` opportunistically grabs empty cities.
  - Diplomacy: `handleDiplomacy` loops opponents, calling `aiWarPeaceDecision` and dispatching `SetDiplomacy` / peace offer actions accordingly.
- **Manual validation steps**:
  1. `cd /Users/ejuchheim/Projects/Simple-Civ/SimpleCiv && npm run dev` to launch client/server.
  2. In the client HUD, start a new game using seed `41839`, default civ mix.
  3. End turns (AI auto-plays when it is their turn) for 20 rounds, watching the browser console and terminal for errors.
  4. Confirm AI still settles cities, assigns builds, and conducts wars without crashes or obviously divergent behavior; capture notes if anything regresses.

### Phase 1 – Goal & Tech Management Extraction
1. Create `engine/src/game/ai/goals.ts` to host `setAiGoal`, `aiVictoryBias`, and tech-goal relationships.
2. Create `engine/src/game/ai/tech.ts` to encapsulate `aiChooseTech`, `pickTech`, and tech scoring helpers.
3. Update `ai.ts` to import these modules while keeping the external interface unchanged.
4. Add unit tests for each module (goal fallback, tech choice determinism).

_Exit criteria_: `ai.ts` no longer defines goal/tech helpers inline; tests green.

### Phase 2 – City Management Module
1. Extract city production logic (`buildPriorities`, `canBuild` checks, project/unit/building queuing) into `ai/cities.ts`.
2. Move tile-working heuristics (`tileWorkingPriority`, `tilesByPriority`) into a shared helper file (`ai/city-heuristics.ts`).
3. Ensure `ai.ts` simply orchestrates: gather context → call city module → dispatch actions.
4. Backfill tests covering:
   - Production priority ordering per goal.
   - Manual tile assignment fallback when no valid builds exist.

_Exit criteria_: City production/tile-working code resides in dedicated modules with tests.

### Phase 3 – Unit Command Module
1. Create `ai/units.ts` handling unit selection, movement decisions, and combat heuristics.
2. Isolate reusable math (distance scoring, target evaluation) into `ai/shared/metrics.ts`.
3. Replace inline loops in `ai.ts` with calls into the new module, returning actions to execute via `applyAction`.
4. Add scenario tests verifying unit choices (e.g., settlers prioritize city sites, armies prefer weakest enemy).

_Exit criteria_: Unit decision logic extracted; `ai.ts` delegates execution to the new module.

### Phase 4 – Diplomacy & Turn Orchestration
1. Extract diplomacy decision logic (`aiWarPeaceDecision`, pact handling) into `ai/diplomacy.ts`.
2. Introduce `ai/turn-runner.ts` that sequences: refresh goal → choose tech → manage cities → command units → diplomacy.
3. Shrink `ai.ts` to a thin facade exporting `runAiTurn` from the turn runner.
4. Expand tests to cover diplomacy outcomes and ensure the full turn runner produces the same series of actions as before (use snapshot/log assertions).

_Exit criteria_: `ai.ts` is <150 lines, primarily wiring exports; diplomacy logic modularized.

### Phase 5 – Documentation & Cleanup
1. Update `docs/codebase_info/engine.md` to describe the new AI module layout.
2. Record completion in `docs/memory.md` and relevant drift reports.
3. Remove any dead helpers left in `ai.ts` after extraction.
4. Run `npm test -w engine` and `npm run build -w client` to verify no regressions.

_Exit criteria_: Documentation and memory reflect the new structure; build/test suite remains green.

## Testing & Verification
- Run `npm test -w engine` after each phase.
- Add targeted Vitest files per module for fast iteration.
- Manual regression: autoplay a saved seed (e.g., `41839`) for 20 turns and confirm AI still produces reasonable actions (log comparisons optional).

## Outstanding Questions
- Do we need separate profiles per difficulty level before splitting modules (easier to add later once structure exists)?
- Should city/units modules expose async hooks for future cloud AI, or keep synchronous for now?

## References
- Current AI implementation: `engine/src/game/ai.ts`
- Heuristics helpers: `engine/src/game/ai-heuristics.ts`, `engine/src/game/rules.ts`
- Turn loop entry point: `engine/src/game/turn-lifecycle.ts`

