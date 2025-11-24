# Map Generator Refactor & Client Retirement Plan

## Background

`engine/src/map/map-generator.ts` is a ~36 KB monolith that handles world seeding, biome noise, river carving, overlay placement, and start-site selection inside one file. The client preserved an older copy at `client/src/utils/map-generator.ts` to keep in-browser parity, but Phase 3 of the turn-loop refactor established the engine as the single source of truth. Carrying both implementations now wastes maintenance effort and blocks further enhancements (terrain heuristics, configurable generators).

## Goals

- Decompose the engine map generator into logical modules (terrain noise/biomes, river generation, start placement, seed helpers) while preserving deterministic behavior and the public API.
- Retire the client’s `utils/map-generator.ts`, replacing it with imports from the engine package (plus any lightweight adapters needed for browser bundles).
- Ensure downstream code (AI, tests, docs) references the new module structure and that the client still initializes games seamlessly.

## Constraints

- Maintain deterministic outputs for existing seeds/maps during the refactor; no breaking change to `generateWorld(settings)` signature.
- Keep the engine generator self-contained (no Node-only APIs) so the client can import it directly after retirement.
- Keep diffs reviewable (<500 LOC per phase); avoid mixing behavior changes with file moves.

## Proposed Phases

### Phase 0 – Inventory & Safeguards
1. Document current generator responsibilities (biome noise, overlays, river polylines, start heuristics, visibility seeding) and note untested edge cases.
2. Augment tests in `engine/src/map/map-generator.test.ts` to lock representative behaviors:
   - River polyline determinism for a fixed seed.
   - Start-site spacing & food/prod guarantees.
   - Overlay placement counts per terrain type.
3. Note any client-only helpers still relying on the duplicate file (e.g., type aliases, custom random utilities).

_Exit criteria_: Added documentation + tests that guard the current behavior before refactoring begins.

#### Phase 0 status – 2025-11-24
- Added deterministic Vitest coverage for the river polyline geometry (seed `1337`), the `MIN_START_DIST` spacing plus food/production guarantees, and overlay counts per terrain (including river-edge overlays on land tiles). These live in `engine/src/map/map-generator.test.ts`.
- Remaining uncovered behaviors to document/watch:
  - Terrain mask/noise thresholds (coast vs. inland vs. plains/forest/hills mixes) and mountain-cluster seeding remain unguarded.
  - Player visibility/contact seeding plus diplomacy initialization still rely on indirect coverage from turn-loop specs.
  - River target selection and mouth detection (how many rivers spawn per map size) are still only spot-checked via rivers.e2e tests.

### Phase 1 – Extract Engine Helper Modules
1. Split `engine/src/map/map-generator.ts` into:
   - `engine/src/map/generation/terrain.ts` (noise generation, overlay assignment).
   - `engine/src/map/generation/rivers.ts` (edge graph, polylines).
   - `engine/src/map/generation/starts.ts` (candidate scoring, spacing enforcement).
   - `engine/src/map/generation/seeding.ts` (seed helpers, random utilities).
2. Keep `generateWorld` as a thin orchestrator importing the new helpers.
3. Update `engine/src/index.ts` to expose any new modules needed by tests.
4. Run `npm test -w engine` after each extraction.

_Exit criteria_: Engine generator is modularized without changing behavior; tests remain green.

#### Phase 1 status – 2025-11-24
- Terrain noise/overlay logic now lives in `engine/src/map/generation/terrain.ts`, and `generateWorld` calls it as the first step after building tile grids.
- Seed management moved into `engine/src/map/generation/seeding.ts` (`resolveSeed` + `WorldRng`), so the generator no longer embeds its own RNG class.
- Start-site selection (spacing guarantees + scoring loop) sits in `engine/src/map/generation/starts.ts`; `generateWorld` asks it for placements before spawning units.
- River carving/pathfinding plus polyline assembly now happens inside `engine/src/map/generation/rivers.ts`, which mutates tiles with `RiverEdge` overlays and returns the graph/polylines consumed by `generateWorld`.
- Helper follow-up: confirm no downstream modules relied on legacy river helpers before trimming any remaining glue still in `map-generator.ts`.

#### Phase 2 status – 2025-11-24
- `client/src/App.tsx` now imports `generateWorld` from `@simple-civ/engine`, and `client/src/utils/map-generator.ts` has been deleted.
- Docs (`docs/codebase_info/client.md`, `docs/codebase_info/engine.md`, this plan, and `docs/memory.md`) have been updated to reference the shared implementation.
- Next step: run `npm run build -w client` in CI and audit any straggling markdown references before fully closing the phase.

### Phase 2 – Client Wiring & Duplicate Retirement
1. Audit client imports of `./utils/map-generator` (App init, tests, helper scripts).
2. Replace those imports with `generateWorld` (and any required settings/types) from `@simple-civ/engine`.
3. Remove `client/src/utils/map-generator.ts` and adjust docs referencing it. ✅ (2025-11-24)
4. `npm run build -w client` to confirm the browser bundle uses the engine implementation.

_Exit criteria_: Client runs entirely on the engine generator; no duplicated map-gen code remains.

### Phase 3 – Cleanup & Follow-ups
1. Prune any now-unused helpers in `client/src/utils` (random utilities, local constants duplicated from the engine).
2. Document the new generator layout in:
   - `docs/refactors/map-generator-refactor-plan.md` (this file, updated with status).
   - `docs/codebase_info/engine.md` (module map).
   - `docs/codebase_info/client.md` (client now imports the engine generator).
3. Update changelog/drift reports to reflect the retirement of the client copy.

_Exit criteria_: Docs and memory reflect the single-source generator; tests/builds remain green.

#### Phase 3 status – 2025-11-24
- Removed the remaining client-only helpers (`client/src/utils/{engine-types.ts,constants.ts,rules.ts,ai*.ts}`) so the UI now imports types, constants, rules, and AI directly from `@simple-civ/engine`.
- Updated docs (`codebase_info/*`, this plan, changelogs, drift reports, memory) to describe the single-source generator/AI and note that the client utilities are gone.
- Client build verified after the cleanup (`npm run build -w client`).

## Testing Strategy

- Engine: `npm test -w engine` after each helper extraction.
- Client: `npm run build -w client` after switching to the engine generator.
- Consider adding a golden-map snapshot test (serialize a known seed before/after refactor) for extra safety.

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Behavior drift while splitting helpers | Lock representative behavior via Phase 0 tests; avoid logic tweaks during file moves. |
| Client bundle pulls in heavy modules (noise libraries) | Keep generator dependencies minimal and tree-shake friendly; consider ESM-only helpers if needed. |
| Shared types diverge | Re-use `@simple-civ/engine` exports wherever possible; delete client-specific type aliases after the swap. |

## Next Steps

1. Run Phase 0: expand map-generator tests + document current behavior.
2. Begin Phase 1 extractions (terrain helper first).
3. Coordinate with the client team before deleting `client/src/utils/map-generator.ts`. ✅

