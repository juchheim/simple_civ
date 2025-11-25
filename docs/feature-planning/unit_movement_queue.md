# Unit Movement Queue & Adaptive Pathfinding Implementation Plan

## Overview
This document outlines the implementation of a "Unit Movement Queue" feature. This allows players to select a unit, click an arbitrary point on the map (even in the Fog of War), and have the unit automatically travel to that destination over multiple turns.

The core challenge is handling movement into unknown territory. To address this, we will use an **Adaptive Auto-Movement** system driven by an **Optimistic A* Pathfinding** algorithm.

## Core Concepts

### 1. Dynamic Target vs. Static Queue
Instead of calculating a full list of steps and storing them (which fails when hidden obstacles are revealed), we will store a single **Auto-Move Target**.
*   **Static Queue:** Fragile. Requires constant invalidation and recalculation when the map changes.
*   **Dynamic Target:** Robust. The unit knows *where* it wants to go, but decides *how* to get there step-by-step, re-evaluating the path every time it moves.

### 2. Optimistic A* Pathfinding
Standard pathfinding fails in Fog of War because it either "cheats" (uses full map knowledge) or refuses to enter unknown tiles. We need an **Optimistic** approach:
*   **Visible Tiles:** Use actual terrain movement costs (e.g., Forest = 2, Mountain = Infinity).
*   **Hidden Tiles (Fog/Shroud):** Use a default "Optimistic" cost (e.g., 1, equivalent to Plains).
*   **Result:** The pathfinder assumes the unknown is passable. The unit will walk in a "direct" line through the darkness until it hits an obstacle, at which point it will "see" the obstacle and route around it.

## Implementation Details

### 1. Data Structures (`src/core/types.ts`)

#### Update `Unit` Type
Remove any concept of a "queue" array. Simply store the destination.
```typescript
export type Unit = {
    // ... existing fields
    autoMoveTarget?: HexCoord; // The final destination
};
```

#### New Actions
```typescript
export type Action =
    | ...
    | { type: "SetAutoMoveTarget"; playerId: string; unitId: string; target: HexCoord }
    | { type: "ClearAutoMoveTarget"; playerId: string; unitId: string }; // Explicit cancel
```

### 2. Algorithms (`src/game/helpers/pathfinding.ts`)

#### `getMovementCost(tile: Tile, unit: Unit, gameState: GameState): number`
*   Helper to determine the cost of entering a tile based on visibility.
*   If `tile` is visible to `unit.ownerId`: Return actual terrain cost.
*   If `tile` is hidden: Return `1`.

#### `findPath(start: HexCoord, end: HexCoord, unit: Unit, gameState: GameState): HexCoord[]`
*   Implementation of A* (A-Star).
*   Uses `getMovementCost` for the $g$ (cost) function.
*   Uses `hexDistance` for the $h$ (heuristic) function.
*   Returns the sequence of coordinates to the target.

### 3. Engine Logic (`src/game/turn-lifecycle.ts`)

We need a "Step-Evaluation Loop" that runs at the start of the turn (and potentially after every move action).

#### `processAutoMovement(gameState: GameState, playerId: string)`
Called within `advancePlayerTurn`.

1.  **Filter:** Get all units for `playerId` that have an `autoMoveTarget`.
2.  **Iterate:** For each unit:
    *   **Loop:** `while (unit.movesLeft > 0 && unit.coord !== unit.autoMoveTarget)`
        1.  **Calculate Path:** Run `findPath` from `unit.coord` to `unit.autoMoveTarget`.
        2.  **Check Path Existence:** If no path is found (target unreachable), clear `autoMoveTarget` and break.
        3.  **Validate Next Step:** Look at `path[0]`.
            *   Is it blocked by a newly revealed Mountain?
            *   Is it blocked by another unit?
            *   **If Blocked:** Break the loop. (The unit waits for the obstacle to clear or for the next turn to re-route).
        4.  **Execute Move:** Move the unit to `path[0]`.
            *   *Note:* This must trigger `refreshPlayerVision`.
        5.  **Update Vision:** Vision updates immediately.
        6.  **Repeat:** The loop continues. The next `findPath` call (Step 1) will now use the *new* vision data, allowing the unit to react to what it just saw.

### 4. Client & UI (`src/components/GameMap.tsx`)

#### Interaction
*   **Hover:** When a unit is selected and the user hovers over a tile:
    *   Run `findPath` locally using the client's `gameState`.
    *   This provides immediate visual feedback of the "Optimistic" path.
*   **Click:**
    *   Dispatch `SetAutoMoveTarget` action with the clicked coordinate.

#### Visualization
*   **Path Rendering:**
    *   Draw a line or series of dots along the calculated path.
    *   **Color Coding:**
        *   **Green:** Steps reachable within the *current* turn (based on `movesLeft`).
        *   **White/Grey:** Steps that will take future turns.
    *   **Target Marker:** Draw a distinct icon or highlight on the `autoMoveTarget` hex.

### 5. Edge Cases & Rules

*   **Combat Interrupt:** If a unit is attacked or attacks, `autoMoveTarget` should be cleared to give the player control.
*   **Manual Override:** If the player issues a manual `MoveUnit` command, `autoMoveTarget` is cleared.
*   **Fog Traps:** If a unit walks into a cul-de-sac of mountains, the pathfinder will eventually return "no path," and the unit will stop.
*   **Friendly Collision:** If a friendly unit blocks the path, the auto-mover simply stops for the turn. It does *not* clear the target, assuming the friend will move later.
