# End Game Experience Review (Engineering Fix Plan)
**Status: Resolved (Implemented v1.0)**

Context: Review of current end-game UX implementation (Victory/Defeat overlay, replay, stats) and supporting engine data. Issues are listed with targeted fixes.

## Issues and Resolution Plan

- **Simulation keeps running after victory (turns/stats drift)**  
  - Cause: `useGameSession` autoskips AI turns without checking `winnerId`; `handleEndTurn` advances to the next player and starts their turn even when a winner is already set.  
  - Plan: Gate the AI autoskip loop on `winnerId`; short-circuit `handleEndTurn`/`advancePlayerTurn` when `state.winnerId` is present (no new turn increment, no processing). Lock the final turn number for UI from the victory moment.

- **Replay map lacks initial vision (blank opening)**  
  - Cause: `ReplayMap` rebuilds fog from `history.playerFog` deltas but no baseline is recorded at world gen or on the first vision refresh.  
  - Plan: Write an initial fog snapshot/delta for each player at world generation (or first `refreshPlayerVision`) to seed turn 1 visibility; ensure `playerFog[turn]` always includes starting reveals so scrubber shows the opening map.

- **Final stats/score are stale on the winning turn**  
  - Cause: Turn stats are captured at start-of-turn before city production/research; a win on that turn doesn’t update the “final” stats used by the overlay.  
  - Plan: Record a stats snapshot after city/research processing or when victory is detected; ensure the end-game view pulls the latest per-player stats from that final write.

- **Turn count shown is inflated**  
  - Cause: `state.turn` increments even after victory and the overlay uses the live turn field; continued autoskip worsens the drift.  
  - Plan: Stop incrementing once `winnerId` is set; capture and surface a fixed `endTurn` at victory for UI/graphs; ensure replay/stats use that frozen value.

- **Key events missing from the replay timeline**  
  - Cause: Several declared event types aren’t logged (WonderBuilt, CityRazed, CivContact, UnitPromoted, Victory) so they never appear in the replay ribbon.  
  - Plan: Add `logEvent` calls at wonder completion, raze, first contact, promotions, and when victory is resolved. Optionally tag events with summary text for the overlay.
