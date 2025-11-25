# Unit Movement Queue Walkthrough

I have implemented the **Unit Movement Queue** with **Adaptive Pathfinding**. This allows players to order units to distant locations, even into the Fog of War, and have them automatically navigate turn-by-turn.

## Features

### 1. Path Visualization
When you select a unit and hover over any tile on the map, a path is instantly calculated and drawn.
*   **Green Dots:** Steps the unit can take *this turn*.
*   **White Dots:** Steps the unit will take in *future turns*.
*   **Target Marker:** A circle indicating the final destination.

### 2. Auto-Movement
Clicking a tile sets the `autoMoveTarget` for the unit.
*   The unit will immediately move as far as it can along the path.
*   At the start of each subsequent turn, the unit will wake up and continue moving towards the target.

### 3. Adaptive Pathfinding (Fog of War)
The pathfinding is **Optimistic**:
*   It assumes unknown tiles (Fog/Shroud) are passable (Cost = 1).
*   The unit will walk in a straight line into the darkness.
*   If it reveals an obstacle (e.g., a Mountain), it stops, re-calculates the path based on the new vision, and goes around it on the next turn.

## Verification Steps

1.  **Select a Unit:** Click on a Scout or Settler.
2.  **Hover:** Move your mouse to a distant tile. Observe the dotted line appearing.
3.  **Click:** Click the distant tile.
    *   *Expected:* The unit moves immediately if it has moves left.
4.  **End Turn:** Press "End Turn".
    *   *Expected:* On the next turn, the unit automatically continues its journey without your input.
5.  **Obstacle Test:** Send a unit towards a hidden area that likely contains mountains.
    *   *Expected:* The unit will walk up to the mountain, stop when it reveals it, and then pathfind around it on the following turn.

## Technical Changes

### Engine
*   **`src/core/types.ts`**: Added `autoMoveTarget` to `Unit` and `SetAutoMoveTarget`/`ClearAutoMoveTarget` actions.
*   **`src/game/helpers/pathfinding.ts`**: Implemented `findPath` using A* with special "Optimistic" cost logic for hidden tiles.
*   **`src/game/turn-lifecycle.ts`**: Added `processAutoMovement` to the turn loop to drive the units.

### Client
*   **`src/components/GameMap/PathLayer.tsx`**: New component to render the SVG path overlay.
*   **`src/components/GameMap.tsx`**: Integrated `PathLayer` and added local path calculation on hover.
*   **`src/App.tsx`**: Updated interaction logic to dispatch `SetAutoMoveTarget` instead of just `MoveUnit` for multi-step paths.
