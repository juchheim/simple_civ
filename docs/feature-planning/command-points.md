# Command Point (CP) System — Implementation Plan

## Summary

Adds a per-turn pool of "Command Points" (CP) that let a player grant one extra action (move OR attack) to a military unit that has already expended its standard action. CP pools scale with the player's current era (0–4). The "Rule of Two" hard-cap prevents any unit from taking more than 2 actions per turn.

### Clarifications captured from design review
- "Standard action" means **any** use of moves or attack (spending all `movesLeft`, or attacking).
- Spending 1 CP lets the targeted unit take **exactly one more action** (move or attack), then that unit becomes **Exhausted** for the rest of the turn.
- CP spend requires a **confirmation modal** (not automatic).
- CP pools reset to 0 for Primitive-era players; non-primitive pools refresh to their era max at start of turn.
- Exhausted state clears at start of next turn along with all other unit state resets.

---

## Era → CP Mapping

| Era       | Max CP |
|-----------|--------|
| Primitive | 0      |
| Hearth    | 1      |
| Banner    | 2      |
| Engine    | 3      |
| Aether    | 4      |

---

## Proposed Changes

---

### Engine — Core Types

#### [MODIFY] [types.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/core/types.ts)

**`Unit` — add two optional fields:**
```ts
cpGranted?: boolean;    // Unit has been granted a CP action this turn (1 action remaining)
hasUsedCP?: boolean;    // Unit has already consumed a CP this turn (Rule of Two enforcement)
```

**`Player` — add two optional fields:**
```ts
commandPoints?: number;    // Available CPs for this turn
maxCommandPoints?: number; // Max CPs (era-derived, informational only for UI)
```

**`Action` union — add one new variant:**
```ts
| { type: "GrantCommandPoint"; playerId: string; unitId: string }
```

---

### Engine — Constants

#### [MODIFY] [constants.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/core/constants.ts)

Add an era-to-CP lookup map:
```ts
export const ERA_COMMAND_POINTS: Record<EraId, number> = {
    [EraId.Primitive]: 0,
    [EraId.Hearth]:    1,
    [EraId.Banner]:    2,
    [EraId.Engine]:    3,
    [EraId.Aether]:    4,
};
```

---

### Engine — Turn Reset

#### [MODIFY] [turn-movement.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/helpers/turn-movement.ts)

In `resetUnitsForTurn`, clear CP fields alongside existing resets:
```ts
unit.cpGranted = false;
unit.hasUsedCP = false;
```

#### [MODIFY] [turn-lifecycle.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/turn-lifecycle.ts)

In `startPlayerTurn`, after `resetUnitsForTurn`, refresh the CP pool:
```ts
import { ERA_COMMAND_POINTS } from "../core/constants.js";
// ...
const maxCp = ERA_COMMAND_POINTS[player.currentEra] ?? 0;
player.commandPoints    = maxCp;
player.maxCommandPoints = maxCp;
```

---

### Engine — New Action Handler

#### [NEW] [unit-cp.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/actions/unit-cp.ts)

```ts
export function handleGrantCommandPoint(
    state: GameState,
    action: Extract<Action, { type: "GrantCommandPoint" }>
): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error("Player not found");
    if ((player.commandPoints ?? 0) <= 0) throw new Error("No Command Points available");

    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);

    if (unit.hasUsedCP) throw new Error("Unit has already used a Command Point this turn");

    // Restore one action's worth of capability
    unit.movesLeft  = Math.max(unit.movesLeft, 1);
    unit.hasAttacked = false;
    unit.cpGranted   = true;

    player.commandPoints = (player.commandPoints ?? 0) - 1;
    return state;
}
```

---

### Engine — Action Dispatcher

#### [MODIFY] [turn-loop.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/turn-loop.ts)

Import `handleGrantCommandPoint` and add a `case "GrantCommandPoint":` to the `switch` in `applyAction`. Does **not** trigger influence-map invalidation.

#### [MODIFY] [units.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/actions/units.ts)

Re-export `handleGrantCommandPoint` from `unit-cp.ts`.

---

### Engine — Exhaust-on-Use Hook (Rule of Two enforcement)

When a unit with `cpGranted === true` uses any move or attack, it must be exhausted immediately after the action.

#### [MODIFY] [unit-movement.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/actions/unit-movement.ts)

At the end of `handleMoveUnit`, after `executeUnitMove`:
```ts
if (unit.cpGranted) {
    unit.movesLeft  = 0;
    unit.hasAttacked = true;
    unit.cpGranted  = false;
    unit.hasUsedCP  = true;
}
```

#### [MODIFY] [unit-combat.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/actions/unit-combat.ts)

After `attacker.hasAttacked = true; attacker.movesLeft = 0;` (both in the unit-vs-unit and unit-vs-city paths), add the same exhaust check:
```ts
if (attacker.cpGranted) {
    attacker.cpGranted = false;
    attacker.hasUsedCP = true;
}
```

> **Why not just check `movesLeft === 0 && hasAttacked`?**  
> Units with multiple natural moves (Riders, Scouts) may have `movesLeft = 0` after a normal move without having used a CP. The dedicated `cpGranted` flag is unambiguous.

---

### Engine — Export

#### [MODIFY] [index.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/index.ts)

No changes needed — client will use `applyAction` as it does today; CP state on `Player` and `Unit` is already visible via `GameState`.

---

### Client — HUD CP Indicator

#### [MODIFY] [TurnSummary.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/HUD/sections/TurnSummary.tsx)

Add a CP pip row (up to 4 pips) above the End Turn button. Each pip is a small circle, filled if CP is available, empty (outline) if spent. Only rendered when `maxCommandPoints > 0`. Label reads "Command Points".

Pass `player.commandPoints` and `player.maxCommandPoints` down from `TurnStack` / `HUDLayout`.

#### [MODIFY] [HUDLayoutSections.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/HUD/HUDLayoutSections.tsx)

Extend `TurnStackProps` and `TurnStack` to accept `commandPoints?: number` and `maxCommandPoints?: number`, forwarding them to `TurnSummary`.

#### [MODIFY] [HUDLayout.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/HUD/HUDLayout.tsx)

Pass `commandPoints` / `maxCommandPoints` from `gameState.players.find(p => p.id === playerId)` into `TurnStack`.

#### [MODIFY] [hud.css](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/HUD/hud.css)

New styles — `.cp-pips`, `.cp-pip`, `.cp-pip.filled`, `.cp-pip.empty`.

---

### Client — Unit Panel "Spend CP" Button + Modal

A unit is eligible for CP if **all three** conditions hold:
1. `isMyTurn`
2. `unit.movesLeft <= 0 || unit.hasAttacked` (unit is fully spent)
3. `!unit.hasUsedCP`
4. `(player.commandPoints ?? 0) > 0`

#### [MODIFY] [UnitPanel.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/HUD/sections/UnitPanel.tsx)

- Add `commandPoints` and `onGrantCP` props.
- Inside `UnitActions`, add a highlighted "Spend CP" button that is enabled only when CP conditions are met.
- Clicking opens a `CPConfirmModal`.

#### New `CPConfirmModal` (inline in UnitPanel.tsx or as separate small component):

```tsx
// Reuses existing Modal.tsx pattern – see Modal.tsx
// Prompt: "Spend 1 Command Point to grant [Unit Name] an extra action this turn? (X CP remaining)"
// Two buttons: Confirm (primary) / Cancel
```

Pass `onGrantCP` as a callback from `HUDLayout → SelectionStack → UnitPanel`.

---

### Client — Exhausted Unit Visual

#### [MODIFY] [GameMap.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/GameMap.tsx)

When rendering a friendly unit token, apply a dimming CSS class if the unit is exhausted:  
`unit.movesLeft <= 0 && unit.hasAttacked && !unit.cpGranted`  
(A unit with `cpGranted=true` still has its bonus action pending — do not dim it.)

Add `.unit-exhausted { opacity: 0.45; filter: grayscale(60%); }` to hud.css / relevant CSS.

---

### AI — CP Integration in Tactical Planner

#### [MODIFY] [tactical-planner.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai2/tactical-planner.ts)

After `executeTacticalActions` runs (all normal actions executed), add a **CP pass**:

```
function runAiCpPass(state, playerId): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player || (player.commandPoints ?? 0) <= 0) return state;

    // Find candidate units: already attacked, no CP used, military
    const candidates = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.hasAttacked &&
        !u.hasUsedCP &&
        !u.cpGranted
    );

    // Score each candidate by: would the granted action produce a kill? then by damage dealt.
    // (Reuses bestAttackForUnit / getCombatPreviewUnitVsUnit)

    // For each candidate (highest score first), consume 1 CP and re-run a tactical
    // attack-only pass for that unit if score > threshold.
    // Stop when CPs are exhausted.
    ...
}
```

The AI respects the Rule of Two because the engine enforces `hasUsedCP` — if an AI tries to grant CP twice to the same unit the handler will throw.

---

## Verification Plan

### Unit Tests (run with `cd engine && npm test`)

**New file:** `engine/src/game/cp.test.ts`

Test cases to write:
1. **CP pool resets on turn start** — after `advancePlayerTurn`, a Hearth-era player has `commandPoints = 1`.
2. **Primitive era gets 0 CP** — `commandPoints = 0` for Primitive player.
3. **CP granted restores 1 action** — after a unit attacks (movesLeft=0, hasAttacked=true), `handleGrantCommandPoint` sets `movesLeft=1, hasAttacked=false, cpGranted=true` and decrements player pool.
4. **Rule of Two: unit exhausted after CP action** — after granting CP and then moving, unit has `cpGranted=false, hasUsedCP=true, movesLeft=0`.
5. **Rule of Two: cannot grant CP to same unit twice** — second `handleGrantCommandPoint` on unit with `hasUsedCP=true` throws.
6. **No CP when pool is empty** — `handleGrantCommandPoint` throws when `commandPoints === 0`.
7. **CP fields clear on next turn** — after `EndTurn` cycle, unit has `cpGranted=false, hasUsedCP=false`.
8. **CP cannot be granted to enemy unit** — throws ownership error.

### Manual Smoke Test (browser)

> Start the game, set Era via tech research or dev tools if available. Alternatively, test in Hearth era (1 CP) early game.

1. Start a new game as any civ.
2. Move a military unit (e.g. SpearGuard) until `movesLeft = 0`.
3. Select the unit — verify a **"Spend CP"** button appears in the Unit Panel (if you have ≥1 CP and it's Hearth era).
4. Click "Spend CP" — verify a **confirmation modal** appears showing cost and remaining CP.
5. Confirm — verify the unit's move counter refreshes (can move again or attack).
6. Take the second action — verify the unit dims on the map immediately after.
7. Verify the CP pip indicator near the End Turn button decrements by 1.
8. Verify "Spend CP" button is now **gone** from that unit's panel (`hasUsedCP = true`).
9. End the turn and start a new one — verify CP pips are refilled and the unit is no longer dimmed.
10. In Primitive Era (turn 1 before any tech), verify the CP section is **not shown** at all in the HUD (0 max CP).
