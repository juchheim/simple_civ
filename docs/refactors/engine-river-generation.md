# Engine River Generation Refactor Plan

- Scope: `engine/src/map/generation/rivers.ts` (start selection, coast entry, pathfinding, polyline assembly).
- Problems: 600+ lines mixing tuning constants, elevation/water distance maps, start selection, A*-style search, deduplication, and segment output. Hard to tune or test; little reuse with other map gen pieces.

## Goals
- Separate concerns: inputs/precomputed maps, start selection, target selection, pathfinding, edge/polylines emission.
- Make generation deterministic per RNG seed and easier to tune via parameter object.
- Provide unit tests for each stage (start picking, pathfinding constraints, degree limits).
- Apply changes in staged order to avoid regressions in map output.

## Proposed Approach (low-drift order)
1) **Precompute layer first:** ✅ Added standalone utilities (`buildElevationMap`, `buildWaterDistance`, `makeRiverEdgeKey`) with tests; generator now imports them.
2) **Start/target selection:** ✅ Introduced `selectRiverStarts` + `buildCoastEntries` with spacing/coast-distance tests; generator uses them.
3) **Pathfinding module:** ✅ Built `findRiverPathToCoast` module; generator can toggle legacy vs module; parity test ensures identical metrics.
4) **Wire generator incrementally:** ✅ Generator swapped to helpers, pathfinder toggle defaults to module, metrics emitted on demand.
5) **Polyline/output cleanup:** ✅ Moved edge→polyline and overlay marking into `rivers-polylines` helper; added Small/Standard polyline snapshots and overlay-count guards (Small/Standard/Large).
6) **Parameters/tuning:** ✅ Constants centralized in `rivers-params.ts` (values unchanged) so tuning can be gated by metrics/snapshots.

## Baseline to capture before coding
- Current target counts per map size and typical river length distribution (min/median) from a fixed seed sample.
- Existing constants (band allowance, plateau limits, min start spacing) and how they influence rejection rates.
- Edge ordering/duplication rules and polyline orientation expected by the renderer.
- Performance characteristics on largest map (rough iteration counts) to avoid regressions.

## Testing
- Unit tests for helpers (elevation/water-distance/edge keys), start selection, pathfinder parity (legacy vs module), and polyline snapshots.
- Metrics snapshots for synthetic maps: Small seed 12345 (requested 5, paths 4, lengths [6,6,6,6]), Standard 98765 (requested 8, paths 7, lengths [7,7,7,6,12,6,6]); overlay counts: Small 24, Standard 51, Large 65.
- Existing `map-generator`/river tests continue to pass under the modular pathfinder default.

## Risks / Notes
- Maintain compatibility with existing render expectations (edge ordering, segment orientation).
- Watch performance; large maps should avoid O(N*M) scans—cache neighbors and distance maps.
- Swap components one at a time and compare river counts/length distributions to reduce drift.
