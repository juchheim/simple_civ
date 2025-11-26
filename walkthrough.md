# AI City Naming Fix

I have updated the AI city founding logic to use the civilization's default city names instead of generic "AI City X" names.

## Changes

### Engine

#### [units.ts](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/engine/src/game/ai/units.ts)

- Imported `CITY_NAMES` from `../../core/constants.js`.
- Updated `moveSettlersAndFound` to:
    - Retrieve the player's civilization name.
    - Look up the corresponding city name list.
    - Select the first unused name from the list.
    - Fallback to the generic name if all default names are taken.

## Verification Results

### Automated Tests

- Ran `npm test` in `engine/`.
- All 71 tests passed, confirming no regressions.

---

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

---

# Unit Color Outlines

I have implemented color outlines for units to help distinguish between different civilizations.

## Changes

### Client

#### [UnitLayer.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/GameMap/UnitLayer.tsx)
- Added `color` property to `UnitDescriptor`.
- Updated `UnitSprite` to apply a multi-layered CSS `drop-shadow` filter to the unit image, creating a strong, glowing outline in the civ's color.

#### [GameMap.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/GameMap.tsx)
- Updated `unitRenderData` to retrieve the unit owner's color from `playerColorMap` and pass it to the `UnitDescriptor`.

## Verification Results

### Automated Tests
- Ran `npm run build` in `client` directory.
- Build passed successfully.

### Manual Verification
- Verified that units now have a strong, dominant glowing color outline matching their civilization's color.
- Verified that the outline follows the unit's shape and is highly visible.

---

# Esc Key Deselection

I have implemented the ability to deselect units and tiles using the `Esc` key.

## Changes

### Client

#### [App.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/App.tsx)
- Added a global `keydown` event listener.
- When `Esc` is pressed, `selectedCoord` and `selectedUnitId` are set to `null`, effectively clearing the current selection.

## Verification Results

### Automated Tests
- Ran `npm run build` in `client` directory.
- Build passed successfully.

### Manual Verification
- Verified that pressing `Esc` deselects the currently selected unit.
- Verified that pressing `Esc` deselects the currently selected tile.

---

# City Menu Unit Selection

I have added the ability to select the garrisoned unit directly from the city menu.

## Changes

### Client

#### [CityPanel.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/HUD/sections/CityPanel.tsx)
- Updated the "Defense & Actions" section to display a clickable button for the garrisoned unit.
- Clicking the button selects the unit and closes the city menu.

#### [HUD.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/components/HUD.tsx)
- Passed the `onSelectUnit` and `onClose` callbacks to the `CityPanel` component.

## Verification Results

### Automated Tests
- Ran `npm run build` in `client` directory.
- Build passed successfully.

### Manual Verification
- Verified that the garrisoned unit is listed in the city menu.
- Verified that clicking the unit button selects the unit and closes the menu.

---

# Fix Unit Movement from City Menu

I have fixed an issue where units selected from the city menu could not move because the selection logic required a selected tile.

## Changes

### Client

#### [App.tsx](file:///Users/ejuchheim/Projects/Simple-Civ/SimpleCiv/client/src/App.tsx)
- Updated `handleTileClick` to allow unit movement actions if `selectedUnitId` is set, even if `selectedCoord` is null.

## Verification Results

### Automated Tests
- Ran `npm run build` in `client` directory.
- Build passed successfully.

### Manual Verification
- Verified that selecting a unit from the city menu and then clicking a destination tile correctly moves the unit.
