# Turn Loop Refactor Plan

## Background

The engine (`engine/src/game/turn-loop.ts`) historically shared a ~1.3k-line duplicate in the client (`client/src/utils/turn-loop.ts`), forcing every logic tweak to be mirrored manually and multiplying drift risk. This refactor collapses the duplicates so the client consumes the engine implementation directly while keeping the game playable throughout.

## Goals

- Reduce the engine’s turn-loop surface into cohesive modules without changing behavior.
- Eliminate the duplicated client copy by consuming the shared engine implementation in-browser.
- Preserve determinism (RNG, state cloning) and existing public APIs (`Action`, `GameState`).
- Leave a paper trail (docs/tests) so future contributors understand the new layout.

## Non-Goals

- Redesigning game rules, combat math, or diplomacy systems.
- Introducing new networking or persistence behavior.
- Replacing the current RNG approach (state.seed).

## Constraints & Preparation

- Maintain green `npm test -w engine` runs between phases; add missing coverage first.
- Client bundle must remain self-contained (engine package already ships TypeScript ready for Vite).
- No breaking changes to `Action` unions or serialized `GameState` shape mid-refactor.
- Keep diffs reviewable (<500 lines/commit) to ease code review.

## Refactor Sequence

### Phase 0 – Safeguards & Baseline

1. **Inventory current behavior**: list supported actions and side effects; capture any known edge cases (linked units, settler capture, diplomacy offers).
2. **Augment tests**: extend `engine/src/game/turn-loop.test.ts` (and targeted `.test.ts` files) to cover:
   - Linked unit move + unlink paths.
   - CityAttack LOS and damage clamps.
   - Diplomacy offer acceptance and shared vision auto-revocation.
   - _2025-11-24 status_: `engine/src/game/turn-loop.test.ts` now includes dedicated specs for linked stack movement/unlink, city ranged LOS + min-damage clamp, and accepting/revoking shared-vision offers to lock these behaviors ahead of file splits.
3. **Freeze client copy**: block merge of speculative edits to `client/src/utils/turn-loop.ts` until the refactor lands (communicate in docs or PR description).

_Exit criteria_: New tests pass; we have a written checklist of behaviors to defend.

#### Phase 0 behavior inventory (2025-11-24 snapshot)

- **Movement & linking**
  - `MoveUnit` enforces adjacency, terrain movement cost, embarked vs. land transitions, friendly occupancy swaps, and settler auto-capture (moving onto an enemy settler converts it and ends movement).
  - Linked stacks move at the slowest unit’s speed, inherit combat state (fortify/heal break on move), and auto-unlink when destination validity differs (e.g., one unit cannot enter water, one is stunned, or the chain is broken by capture).
  - Zone-of-control prevents non-scout units from bypassing adjacent enemies; roads/river-crossings adjust cost, and fog updates occur per step.
- **Combat**
  - `Attack` resolves unit-vs-unit melee/ranged fights, applying promotions, terrain modifiers, fortify bonuses, retaliation damage, and death handling (linked partners auto-unlink on casualty).
  - `CityAttack` performs ranged strikes from cities with LOS checks against blocking terrain/units, clamps outgoing damage to `[1, city.attackStrength]`, and respects ammo/cooldown so cities cannot fire twice per turn.
  - `Attack` also handles pillaging (clear improvements on victory) and barbarian targeting logic.
- **City management**
  - `FoundCity` claims radius-2 territory, auto-assigns worked tiles, and queues default builds; prohibits founding on occupied/invalid tiles.
  - `SetCityBuild` validates prerequisites (tech, resources), consumes project production, and `RazeCity` converts the tile to ruins while releasing territory.
  - `SetWorkedTiles` enforces population limits, prevents duplicates, and immediately recomputes yields and starvation checks.
  - End-of-turn upkeep runs food/growth, applies starvation damage, and completes builds/project rewards.
- **Research & tech**
  - `ChooseTech` sets the active research queue, carries over overflow science, and unlocks tech passives (FormationTraining, DrilledRanks, SignalRelay) the moment research completes.
- **Diplomacy & vision**
  - `SetDiplomacy`, `ProposePeace`, and `AcceptPeace` gate war/peace state changes, auto-cancel vision sharing on war, and clear outstanding offers.
  - `ProposeVisionShare`, `AcceptVisionShare`, and `RevokeVisionShare` manage shared-vision pacts, merge fog-of-war views immediately on acceptance, and re-run elimination checks when revoked.
  - Offers store proposer/recipient metadata, and only matching counterparties can accept; duplicates overwrite pending offers.
- **Turn lifecycle & victory**
  - `EndTurn` advances to the next player, refreshes movement, re-triggers healing, applies status effects, and, at round end, runs victory checks (progress/conquest) plus elimination sweeps to remove defeated civs and their units.
  - Visibility cache recalculates per player each tick to align with shared vision pacts and newly founded cities/outposts.


### Phase 1 – Shared Helpers & Type Alignment

1. **Extract helper namespaces** inside the engine file (still in `turn-loop.ts`):
   - `movement` (context creation, occupancy checks, linked unit utilities).
   - `combat` (damage math, effective stats, LOS helpers).
   - `cities` (worked tiles, build completion, territory claims).
2. **Export these helpers** via `engine/src/game/index.ts` (or re-export through `src/index.ts`) so the client can import them later.
3. **Verify TypeScript compatibility** between engine exports and the client’s current `engine-types.ts`; resolve mismatches now to avoid double work.
   - _2025-11-24 status_: Movement, combat, and city helper namespaces are now defined in `engine/src/game/turn-loop.ts` and exported via `@simple-civ/engine` so the client can consume them without touching the duplicated loop yet.

_Exit criteria_: Engine builds/tests pass; helper functions are exported but `applyAction` still resides in one file; client remains untouched.

### Phase 2 – Engine Module Decomposition

1. **Physically split files** under `engine/src/game/`:
   - `actions/units.ts` (MoveUnit, Link/Unlink, Attack).
   - `actions/cities.ts` (FoundCity, SetCityBuild, RazeCity, SetWorkedTiles).
   - `actions/diplomacy.ts` (SetDiplomacy, offers, vision).
   - `turn-lifecycle.ts` (EndTurn, advancePlayerTurn, runEndOfRound).
   - `vision.ts` (visibility, LOS).
   - `helpers/` for movement/combat/city utilities if they are reused cross-action.
2. **Keep `applyAction` thin**: import the action handlers and dispatch by `action.type`.
3. **Update tests/import paths**; ensure Vitest suites reference the new modules.
4. **Document architecture** in `docs/codebase_info/engine.md` (brief note about new module layout).
   - _2025-11-24 status_: `turn-loop.ts` now delegates to `actions/units|cities|diplomacy`, `turn-lifecycle.ts`, and `vision.ts`, with shared helpers housed under `game/helpers/`. The old monolith only owns `applyAction` and `handleChooseTech`, so downstream imports can pivot to the new modules without touching the client copy yet.
   - _Notes_: Documented the new structure in `docs/codebase_info/engine.md#turn-loop-modules` so reviewers can map each action type to its file without reading the entire history.

_Exit criteria_: Engine-only change set that reorganizes code without behavior drift; tests remain green.

### Phase 3 – Client Integration with Engine Turn Loop

1. **Replace client copy**:
   - Import `applyAction` (and any needed helpers) from `@simple-civ/engine`.
   - Remove `client/src/utils/turn-loop.ts`.
   - Point existing client imports (AI, App, tests) to the engine package.
2. **Bridge incentives**:
   - If tree-shaking/pure ESM causes bundler friction, add a client-facing re-export (e.g., `engine/src/browser/turn-loop.ts`) that preserves the existing default/namespace style.
3. **Run client dev build** (`npm run dev -w client`) to confirm size and behavior.

   - _2025-11-24 status_: `App.tsx` now imports `applyAction` directly from `@simple-civ/engine`, the legacy `client/src/utils/turn-loop.ts` file has been deleted, and the client build runs against the shared engine logic.

_Exit criteria_: Client runs entirely on engine logic; no duplicate turn-loop code remains, documentation points at the shared entry point, and client builds stay green.

### Phase 4 – Cleanup & Follow-ups

1. **Prune unused exports** that the client copy previously needed but are now redundant.
2. **Update docs** (`docs/doc_drift_report.md`, `docs/memory.md`, `docs/codebase_info/client.md`) to reflect the single-source-of-truth.
3. **Optional polish**: add barrel files for `actions/*` if ergonomics warrant it and consider generating API docs for the engine package.

## Testing Strategy

- Engine: `npm test -w engine` after every phase; add new targeted cases before file moves.
- Client smoke tests: manual scenario (move, attack, diplomacy, city growth) after Phase 3.
- Regression guard: consider adding a deterministic replay test that loads a saved `GameState`, replays a script of actions, and asserts final diff.

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Behavior drift during module moves | Phase 0 tests + incremental commits; no logic edits while splitting files. |
| Client bundler pulling in Node-specific code | Keep engine pure TS (already no Node APIs); verify Vite build after each import change. |
| Circular dependencies between new modules | Group helpers carefully (e.g., movement helpers should not import action modules); add lint rule for circulars if needed. |
| Large PRs hard to review | Phase the work into 3–4 PRs matching phases above; land tests first. |

## Rollback Plan

Each phase is isolated to either engine or client. If an issue surfaces:

1. Revert the latest phase (single PR) while retaining earlier green phases.
2. Hotfix via cherry-picking the stable commits back onto `main`.
3. Keep the pre-refactor client copy in git history for quick restoration if necessary.


