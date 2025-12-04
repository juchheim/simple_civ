# Efficiency & Redundancy Review Plan

## Goal
To perform a deep-dive analysis of the entire codebase (`engine` and `client`) to identify:
1.  **Inefficiencies**: Suboptimal algorithms, unnecessary computations, or performance bottlenecks.
2.  **Redundancies**: Duplicate logic, copy-pasted code, or overlapping responsibilities between modules.

## Core Principle: Zero Drift
**"Do No Harm"**: The primary constraint of this review (and subsequent refactoring) is to maintain exact functional parity.
*   **Mitigation Strategy**: Every identified issue must be accompanied by a specific plan to verify that fixing it will not change game behavior.
*   **Verification**: Existing tests must pass. If a behavior is not covered by tests, a new "baseline" test must be written *before* any refactoring occurs.

## Review Areas

### 1. Engine: Core Loop & Turn Processing — **Completed**
*   **Focus**: `turn-lifecycle.ts`, `turn-loop.ts`.
*   **Completed Work**:
    *   Eliminated repeated `ensureWorkedTiles` calls by caching and recomputing only when population or territory changes.
    *   Replaced per-unit map scans in `applyAttrition` with a tile lookup.
*   **Search For**:
    *   Redundant loops over entities (units/cities).
    *   Recalculation of values that could be cached (e.g., yields, vision).
    *   Inefficient state updates or cloning.
*   **Drift Mitigation**: Use `turn-loop.test.ts` and `sim-war.log` comparisons. Run deterministic simulations before and after changes to ensure identical outcomes.

### 2. Engine: Pathfinding & Movement — **Completed (initial hotspots)**
*   **Focus**: `pathfinding.ts`, `movement.ts`, `hex.ts`.
*   **Completed Work**:
    *   Added shared tile lookups to `validateTileOccupancy` and `handleMoveUnit` to avoid repeated tile scans.
    *   Optimized `expelUnitsFromTerritory` BFS with tile lookups and occupancy tracking.
*   **Search For**:
    *   Repeated pathfinding calls for the same unit/target.
    *   Inefficient neighbor lookups or cost calculations.
    *   Duplicate distance checks.
*   **Drift Mitigation**: Create a "Pathing Benchmark" test suite that asserts exact paths and costs for complex scenarios remain unchanged.

### 3. Engine: AI Logic — **Completed (auto-move hotpaths)**
*   **Focus**: `ai.ts`, `ai-decisions.ts`, `ai-heuristics.ts`.
*   **Completed Work**:
    *   `processAutoExplore` now uses a single reachability pass to pick the nearest valid unexplored tile instead of per-target A* calls.
    *   `processAutoMovement` reuses tile lookups to avoid repeated map scans.
*   **Search For**:
    *   Redundant evaluation of invalid moves.
    *   Overlapping heuristic calculations.
    *   Duplicate logic between different AI behaviors (e.g., expansion vs. conquest).
*   **Drift Mitigation**: Run AI-vs-AI simulations with fixed seeds. The sequence of moves and final game state must be identical.

### 4. Engine: Combat & Actions — **Completed (lookup reuse)**
*   **Focus**: `combat.ts`, `actions/**`.
*   **Completed Work**:
    *   `handleAttack` reuses a tile lookup for defense/retaliation calculations to remove repeated tile scans.
*   **Search For**:
    *   Duplicate validation logic (e.g., "can attack" checks in multiple places).
    *   Inconsistent damage calculation paths.
*   **Drift Mitigation**: Enhance `rules.test.ts` to cover edge cases. Ensure combat outcomes (damage values) are pinned by tests.

### 5. Client: Rendering & State Management — **Completed**
*   **Focus**: `App.tsx`, `components/**`, `hooks/**`.
*   **Completed Work**:
    *   Moved `hoveredCoord` state into `GameMap` so mouse movement no longer re-renders the root `App`/HUD tree.
*   **Search For**:
    *   Unnecessary re-renders (missing `useMemo`/`useCallback`).
    *   Duplicate state derivation (calculating the same thing in multiple components).
    *   Inefficient list rendering (large maps/lists without virtualization if needed).
*   **Drift Mitigation**: Visual regression testing (manual or automated screenshots). Verify UI responsiveness does not degrade.

### 6. Shared: Constants & Types — **Completed**
*   **Focus**: `constants.ts`, `types.ts`.
*   **Completed Work**:
    *   Removed the redundant `features` alias on `Tile` and normalized generation/tests to use `overlays` only.
*   **Search For**:
    *   Unused constants or types.
    *   Duplicate definitions (e.g., similar interfaces used in different contexts).
*   **Drift Mitigation**: TypeScript compiler checks. `grep` searches to ensure removal doesn't break usage.

## Execution Steps
1.  **Scan**: Systematically read through the target files for each area.
2.  **Log**: Record findings in a new artifact: `/docs/code-reviews/efficiency_findings.md`.
    *   Format: `[File/Component] - [Issue Description] - [Proposed Fix] - [Drift Mitigation Plan]`
3.  **Analyze**: Group findings by impact (High/Medium/Low) and risk.
4.  **Report**: Present the prioritized list for approval before any code is touched.

## Success Criteria
*   A comprehensive list of actionable improvements.
*   A clear verification strategy for each improvement to guarantee zero functional regression.
