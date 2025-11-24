## Scope
- Confirm AI Settlers can found cities and outline fixes if gaps exist.
- Define a growth rule for city territory (currently all rings are claimed immediately).
- Plan integration for civ selection/perks and unique colors at game start (human + AI).

## 1) AI Settlers Founding Cities
**What exists**
- AI settling logic lives in `engine/src/game/ai/units.ts` (`manageSettlers`). It:
  - Checks the current tile and calls `FoundCity` if `validCityTile` and `settleHereIsBest`.
  - Searches up to radius 8 for `scoreCitySite` candidates, moves toward best sites, and retries `FoundCity` after moving.
  - Uses `tryAction` → `handleFoundCity` (`engine/src/game/actions/cities.ts`) to actually found.
- Site scoring uses `scoreCitySite` (`engine/src/game/ai-heuristics.ts`), same heuristic as player starts.

**Gaps to verify**
- Ensure `validCityTile` matches rulebook constraints (not on mountains/coast/deep sea; not on occupied city).
- Confirm Settlers retain moves to execute the `FoundCity` action (it is free today).
- Confirm visibility/shroud is not blocking site scoring for AI (it shouldn’t).

**Plan to validate/fix**
1) Add a focused test: generate a map with a Settler-only AI, step `manageSettlers`, assert a city is founded on a valid site within N turns.
2) Instrument (temporary logs or debug hooks) if the test fails to see why `settleHereIsBest` rejects tiles (e.g., heuristic thresholds).
3) If scoring is too strict, lower the threshold or add a fallback “if best tile score > 0, found” branch.
4) Ensure escorts (`manageSettlerEscorts`) do not block founding (they only move military).
5) Keep `FoundCity` name generation simple (`AI City X`) unless a naming table is needed later.

## 2) City Territory Growth Rule
**Current behavior**
- `claimCityTerritory` (`engine/src/game/helpers/cities.ts`) claims all tiles in `CITY_WORK_RADIUS_RINGS = 2` immediately on founding.

**Proposed rule (needs approval)**
- On founding: claim center + ring 1 only (city hex + 6 adjacent).
- Growth unlocks ring 2 (and beyond if added later) at population milestones:
  - Pop 1–2: center + ring 1.
  - Pop 3+: add ring 2 tiles (still respecting blocking terrain and map bounds).
- If city loses population (e.g., damage/capture), keep already-claimed territory (no shrink) unless we want more complexity.

**Implementation plan**
1) Change `claimCityTerritory` to accept a `maxRing` parameter; on found, pass `1`.
2) Add a growth hook (in `turn-lifecycle` after growth resolution) to expand territory when pop crosses thresholds; call `claimCityTerritory` with `maxRing = 2` when pop ≥ 3.
3) Ensure `ownerCityId`/`ownerId` update correctly without stealing other cities’ tiles unless contested rules are added.
4) Update tests (existing city tests + new growth test) to assert territory size per pop milestone.
5) UI: bounds overlay already reads `ownerCityId`; it will expand automatically once engine claims more tiles.

## 3) Civilization Selection & Perks
**Rulebook civs (v0.93, 3.6):**
- ForgeClans: +1 Production if city works Hills.
- ScholarKingdoms: +1 Science if city pop ≥ 3.
- RiverLeague: +1 Food from each worked river-adjacent tile.
Engine already applies these in `getCityYields` via `getCivTrait` (keyed by `player.civName`).

**Plan**
1) At game start, assign each player (human + AI) a civ from the rulebook set:
   - UI flow for human: selection dialog before map generation.
   - AI: random unique pick from remaining civs.
2) Ensure `player.civName` is set before `generateWorld` returns or immediately after, so trait logic works from turn 1.
3) Colors: assign a unique color per player (map from civ -> default color, fallback to palette if collisions). Apply to:
   - City outlines/bounds, units, HUD accents, and Vision Key indicators.
4) Persistence: include civ + color in save/load payloads (already part of `Player`).
5) Tests: verify `getCityYields` trait effects fire when `player.civName` is set, and selection flow sets unique civs/colors for all players.

**Open items for approval**
- Territory growth milestones (pop 3 unlocks ring 2; no shrink on loss). 
--this is correct. as tiles are added, auto-choose the best tile based on yields. tie breakers: food > production > science.
- Whether AI civ selection should be weighted (e.g., terrain synergy) or random unique for now. 
--For now, just apply perks as stated above. 