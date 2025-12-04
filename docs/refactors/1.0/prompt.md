kickoff the refactor series for client-app.md, client-gamemap.md, engine-action-units.md, engine-river-generation.md, and engine-turn-lifecycle.md.

- Before any code moves: capture baselines from the refactor docs (action error strings, auto-move limits, vision
    timing; turn lifecycle side-effect order and RNG/ID semantics; river metrics/constants; client tile-click outcomes
    and shortcut/menu behavior; GameMap layer order, ref API, memoization patterns, geometry constants). Save short
    notes/screenshots to compare later.
  - Sequence:
      1. Engine actions/units: add shared lookup/validation helpers and typed payloads, then move movement/link/swap,
         then combat, then automation; keep error strings stable and test after each slice.
      2. Engine turn-lifecycle: add capability/spawn helpers, then extract start-of-turn, movement reset/auto behaviors,
         city economy, build processing, research/victory in that order; preserve RNG/ID behavior.
      3. Engine river-generation: introduce precompute helpers, then start/target selection, then pathfinding module,
         wiring them in stages while comparing river counts/lengths on fixed seeds.
      4. Client app: wrap with AppShell, extract interaction controller (keep behavior), split handlers, move hotkeys,
         then clean up session command API; keep alerts/flows unchanged until tests pass.
      5. Client GameMap: extract controller hook, then visibility selector, then render-data hook, then split SVG layers;
         maintain layer order and ref API.
  - Work one step per PR/commit, run targeted tests each time (npm test -w engine; client interaction tests when added);
    avoid touching multiple hotspots in the same change to limit drift.