Unit Linking System Implementation Plan

> **Status:** Implemented in v0.91 (engine + client). Document retained for historical context.

Goal Description
Implement a Unit Linking System that allows players to link two units (e.g., a settler and a military unit) so they move together. The linked units share movement points based on the slower unit, automatically unlink when they become separated, and provide UI controls for linking/unlinking with visual indicators.

Proposed Changes
Backend (engine)
[MODIFY] 
engine/src/core/types.ts
Add optional linkedUnitId?: string to the Unit type.
Ensure the field is serialized/deserialized correctly.
[MODIFY] 
engine/src/game/turn-loop.ts
Add new action types LinkUnits and UnlinkUnits to the 
Action
 union.
Implement handlers:
LinkUnits: Verify both units belong to the same player, occupy the same hex, are not already linked, and are not combat‑engaged. Set linkedUnitId on both units to each other's 
id
.
UnlinkUnits: Clear linkedUnitId on both units.
MoveUnit: If the moving unit has a linkedUnitId, move the linked partner to the same destination (if possible). Consume movement equal to the slower unit’s 
move
 value (use Math.max of the two units’ 
move
 stats). If the partner cannot move (blocked or out of movement), automatically unlink both units.
Ensure auto‑unlink when linked units end up on different hexes after any action.
Client (frontend)
[MODIFY] 
client/src/utils/engine-types.ts
Mirror the linkedUnitId?: string addition to the Unit interface.
[MODIFY] 
client/src/utils/turn-loop.ts
Add client‑side handling for the new actions LinkUnits and UnlinkUnits mirroring the engine logic.
Update the moveUnit reducer to handle linked movement and auto‑unlink.
UI Additions
HUD / Unit Panel (
client/src/components/HUD.tsx
 or similar)
Add Link and Unlink buttons when a unit is selected.
Buttons are enabled only when:
The selected unit and a second unit share the same hex.
Both belong to the current player.
Neither is already linked (for Link) or both share the same linkedUnitId (for Unlink).
**GameMap (
client/src/components/GameMap.tsx
)
Render a small chain icon (e.g., a linked‑rings SVG) on top of any unit that has a linkedUnitId.
When a unit is selected, also highlight its linked partner (e.g., a glow or border).
Ensure the icon does not interfere with existing unit sprites.
Verification Plan
Automated Tests
Engine unit tests (
engine/src/game/ai.test.ts
 or new file):
Create two friendly units on the same hex, dispatch LinkUnits, assert both units have each other's 
id
 in linkedUnitId.
Move the slower unit one tile, verify the faster unit also moves to the same destination and both consume the slower unit’s movement.
Attempt to move a linked unit into an occupied enemy tile; expect auto‑unlink and only the moving unit proceeds.
Dispatch UnlinkUnits and confirm linkedUnitId cleared.
Client integration test (if using Jest/React Testing Library):
Simulate selecting a unit, clicking Link, verify the UI shows the chain icon.
Simulate moving the linked unit and ensure the partner follows.
Manual Verification
Start a game with two units (e.g., Settler + Warrior) on the same hex.
Click Link in the unit panel; a chain icon should appear on both units.
Issue a move command for the Warrior; the Settler should move with it, consuming only the Warrior’s movement cost.
Move the pair into a tile where the Warrior cannot move (blocked by enemy); both units should automatically unlink and the Warrior should still move if possible.
Click Unlink; the chain icon disappears.
Verify that linking works across turns (state persists after EndTurn).
Additional Notes
Safety: Linking should not allow stacking more than two units; the linkedUnitId field is a single string, so each unit can be linked to at most one partner.
Performance: The extra checks are O(1) per move because we only look up the partner via its ID.
Future Extensions: The same system can be reused for other mechanics (e.g., transport ships) by reusing the linkedUnitId field.
User Review Required
Confirm the overall design and any UI style preferences (e.g., icon design, button placement).
Approve proceeding to implementation.