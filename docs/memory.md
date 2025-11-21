# Working Memory

- Added river generation (RiverEdge overlays) in engine and client map generation; marked the river gap as completed in docs/doc_drift_report.md.
- Implemented city territory claim (radius 2, no-sharing) and auto tile working with multi-growth support; marked corresponding drift items as done.
- Added city capture/raze flow and fortify/heal behavior in engine and client; city ranged attack implemented via CityAttack action.
- Implemented tech passives (FormationTraining/DrilledRanks/SignalRelay) and progress project bonuses; Form Army now validates base units and transforms them on completion.
- Implemented end-of-round victory (progress/conquest) checks and elimination sweep (removes units) in engine/client.
- UI parity: build menus now show all units/buildings/projects; city ranged/raze exposed; manual worked-tile selection and diplomacy toggles added; fog-of-war rendering respects per-player visibility/reveal and is surfaced via a legend.
- Added fog shroud rendering with toggleable unseen hexes (question-mark shroud, tinted fog that preserves terrain hue) so unexplored areas are indicated instead of blank voids.
- Added shared-vision diplomacy pact: peace-time offers/accept/revoke wired through actions/UI; vision is merged while active and breaks automatically on war.
- Fixed city attack bug: handleTileClick in App.tsx now checks for enemy cities and triggers Attack action with targetType: "City" when unit is in range, preventing "Can only move 1 tile at a time" error for ranged units attacking cities. Also added line-of-sight check for city attacks in client turn-loop to match engine behavior.
- Remaining gaps: deeper diplomacy beyond war/peace/vision sharing; tile assignment could still use richer visual cues.
- When a drift item is completed, mark it in docs/doc_drift_report.md.
- Wired a `unitImages` asset map in the client, swapped unit circles for Settler PNG sprites, and staged a placeholder Settler image plus slot comments for future asset expansion.
