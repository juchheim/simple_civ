# Efficiency & Redundancy Findings

## Core Principle: Zero Drift
**"Do No Harm"**: The primary constraint of this review (and subsequent refactoring) is to maintain exact functional parity.
*   **Mitigation Strategy**: Every identified issue must be accompanied by a specific plan to verify that fixing it will not change game behavior.
*   **Verification**: Existing tests must pass. If a behavior is not covered by tests, a new "baseline" test must be written *before* any refactoring occurs.

## Area 1: Engine: Core Loop & Turn Processing
*   **[turn-lifecycle.ts] - O(U * T) Complexity in `applyAttrition`**
    *   **Issue**: `applyAttrition` iterates all units, and for each unit performs `state.map.tiles.find` to locate the tile. This is a linear scan of the entire map (thousands of tiles) for every unit.
    *   **Proposed Fix**: Create a `Map<string, Tile>` lookup at the start of the function or pass a pre-built lookup.
    *   **Drift Mitigation**: Verify attrition damage is identical in a test case with units in/out of Jade Covenant territory.
*   **[turn-lifecycle.ts] - Redundant `ensureWorkedTiles` calls**
    *   **Issue**: `processCityForTurn` calls `ensureWorkedTiles` up to 3 times (start, growth loop, expansion). This function sorts tiles by yield score, which is expensive.
    *   **Proposed Fix**: Consolidate calls. Only recalculate once at the end of processing, or only if `pop` or `territory` changed.
    *   **Drift Mitigation**: Verify city yields and worked tiles match exactly before/after change.
*   **[turn-lifecycle.ts] - Redundant Victory Checks**
    *   **Issue**: `checkConquestVictory` and `eliminationSweep` iterate over all cities/units multiple times.
    *   **Proposed Fix**: Maintain cached `cityCount` and `unitCount` on Player objects, or compute these stats once per turn pass.
    *   **Drift Mitigation**: Verify victory/elimination triggers on the exact same turn in replay tests.

## Area 2: Engine: Pathfinding & Movement
*   **[movement.ts] - O(N * T) Complexity in `expelUnitsFromTerritory`**
    *   **Issue**: The BFS loop performs `state.map.tiles.find` (linear scan) for every visited neighbor.
    *   **Proposed Fix**: Use a spatial lookup for tiles.
    *   **Drift Mitigation**: Verify expulsion destinations match exactly in a test case with crowded borders.
*   **[movement.ts] - O(U + C + T) Complexity in `validateTileOccupancy`**
    *   **Issue**: Called every move step. Performs linear scans of Units, Cities, and Tiles.
    *   **Proposed Fix**: Use spatial lookups.
    *   **Drift Mitigation**: Verify movement validation passes/fails exactly the same set of moves.

## Area 3: Engine: AI Logic
*   **[unit-automation.ts] - O(U * T * Path) Complexity in `processAutoExplore`**
    *   **Issue**: For each explorer, the code iterates *all* unexplored tiles and calls `findPath` (A*) to them.
    *   **Proposed Fix**: Use Dijkstra/Flood-fill from the unit to find the *nearest* unexplored tile in a single pass, rather than A* to all candidates.
    *   **Drift Mitigation**: Verify explorers still choose the closest valid target in a deterministic scenario.
*   **[unit-automation.ts] - Linear Tile Scan in `processAutoMovement`**
    *   **Issue**: Inside the movement loop, `state.map.tiles.find` is called to validate targets.
    *   **Proposed Fix**: Use spatial lookup.
    *   **Drift Mitigation**: Standard movement verification.

## Area 4: Engine: Combat & Actions
*   **[unit-combat.ts] - Redundant Lookups**
    *   **Issue**: `handleAttack` performs multiple `state.units.find` and `state.cities.find` calls.
    *   **Proposed Fix**: Use spatial lookups.
    *   **Drift Mitigation**: Verify combat outcomes match exactly.

## Area 5: Client: Rendering & State Management
*   **[App.tsx] - Excessive Re-renders due to `hoveredCoord`**
    *   **Issue**: `hoveredCoord` is state in the root `App` component. Every time the mouse moves over a new tile, `App` re-renders, causing `GameMap`, `HUD`, and all children to re-render (unless strictly memoized).
    *   **Proposed Fix**: Move `hoveredCoord` state down into `GameMap` or `HUD` (wherever it's needed), or use a Context/Signal that doesn't trigger root re-render.
    *   **Drift Mitigation**: Visual verification that hover tooltips still appear correctly.
*   **[App.tsx] - `gameState` Prop Propagation**
    *   **Issue**: `gameState` is passed as a prop to `GameMap` and `HUD`. If `useGameSession` returns a new `gameState` object every tick (even if data hasn't changed), it forces re-renders.
    *   **Proposed Fix**: Use `React.memo` on expensive components and ensure `gameState` reference stability or deep comparison.
    *   **Drift Mitigation**: Performance profiling (React DevTools) to confirm reduced render counts.

## Area 6: Shared: Constants & Types
*   **[types.ts] - Redundant `features` alias in `Tile`**
    *   **Issue**: `Tile` type has `features` as an alias for `overlays`. This increases memory usage slightly per tile and adds confusion.
    *   **Proposed Fix**: Remove `features` and standardize on `overlays`.
    *   **Drift Mitigation**: Compiler check to ensure no code relies on `features`.
*   **[constants.ts] - Unused/Empty Configuration Arrays**
    *   **Issue**: `AETHERIAN_EXTRA_STARTING_UNITS` and `STARBORNE_EXTRA_STARTING_UNITS` are empty but still iterated in generation logic.
    *   **Proposed Fix**: Remove if permanently deprecated, or comment out usage in generator to save cycles.
    *   **Drift Mitigation**: None needed (no functional change).
