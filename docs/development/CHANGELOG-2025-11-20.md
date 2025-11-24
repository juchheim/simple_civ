# Changelog - 2025-11-20

## Tech Tree System Implementation

### Added
- **TechTree Component** (`client/src/components/TechTree.tsx`)
  - Full tech tree UI with era-based layout (Hearth, Banner, Engine)
  - Visual indicators for tech status (researched, researching, available, locked)
  - Prerequisites validation and era requirements
  - Interactive tech selection
  - Progress tracking display
  
- **Research Display in HUD** (`client/src/components/HUD.tsx`)
  - "Research" section showing current tech being researched
  - Progress bar (e.g., "15/20")
  - Warning when no research is active
  - "Tech Tree" button to open modal

- **Tech Tree Integration** (`client/src/App.tsx`)
  - Tech tree automatically opens on turn 1
  - `showTechTree` state management
  - `handleChooseTech` action handler
  - Modal can be opened/closed anytime

### Changed
- **Starting Techs** (`client/src/utils/map-generator.ts`, file removed in v0.92 now that the client uses `@simple-civ/engine/generateWorld`)
  - Players now start with `techs: []` (no starting technologies)
  - Forces players to choose their first tech on turn 1
  - Creates more strategic early-game decisions

- **Build Menu Filtering** (`client/src/components/HUD.tsx`)
  - Build options now filtered by `canBuild()` function
  - Only displays units/buildings that player has tech for
  - Added common units: Scout, Spear, Settler
  - Added common buildings: Farmstead, Workshop, Scriptorium
  - Build menu only appears when city is not already building

### Bug Fixes
- **Scout Movement Bug**
  - **Issue**: Player 1's scout only had 1 move on turn 1 instead of 2
  - **Cause**: Units were never refreshed for the first player at game start
  - **Fix**: Added unit initialization in `map-generator.ts` that properly refreshes Player 1's units using UNITS constants
  - **File**: `client/src/utils/map-generator.ts` (legacy client mirror; removed once the shared engine generator shipped)

- **Move After Attack Bug**
  - **Issue**: Units could move after attacking, which should not be allowed
  - **Cause**: Missing `hasAttacked` check in `handleMoveUnit` function
  - **Fix**: Added validation to prevent movement after attacking
  - **File**: `client/src/utils/turn-loop.ts` (legacy reducer removed in v0.92 once the client switched to the shared engine turn loop)

## Tech Research Flow

1. **Turn 1**: Tech tree automatically opens
2. **Choose Tech**: Click any available (green border) tech
3. **Research Progress**: Science from cities accumulates each turn
4. **Completion**: Tech unlocks automatically, player can choose new tech
5. **Build**: Buildings/units only appear in build menu if player has required tech

## Tech Tree Structure

### Hearth Era (Cost: 20)
- Fieldcraft → Farmstead building
- StoneworkHalls → StoneWorkshop building
- ScriptLore → Scriptorium building
- FormationTraining → +1 Def passive
- TrailMaps → RiverBoat unit

### Banner Era (Cost: 50)
- Requires 2 Hearth era techs
- Wellworks, TimberMills, ScholarCourts, DrilledRanks, CityWards

### Engine Era (Cost: 85)
- Requires 2 Banner era techs
- SteamForges, SignalRelay, UrbanPlans, ArmyDoctrine, StarCharts

## Files Modified

### New Files
- `client/src/components/TechTree.tsx` - Complete tech tree UI component

### Modified Files
- `client/src/App.tsx` - Tech tree integration and state management
- `client/src/components/HUD.tsx` - Research display and build filtering
- `client/src/utils/map-generator.ts` - Removed starting tech, added unit initialization (file later removed when the client adopted the engine generator)
- `client/src/utils/turn-loop.ts` - Fixed move-after-attack bug (file later removed in v0.92 when the client adopted `@simple-civ/engine/applyAction`)

## Impact on Gameplay

### Early Game
- Players must choose their first technology, creating strategic choice from turn 1
- Build options are limited until research completes
- Forces prioritization between different tech paths

### Mid Game
- Era requirements (2 techs from previous era) create natural progression
- Tech choices become more meaningful as branches diverge

### UI/UX
- Tech tree provides clear visibility into research options
- Build menu is cleaner and less confusing (no unbuildable options)
- Research progress is always visible in HUD

## Technical Notes

### Component Architecture
- `TechTree` is a modal overlay with full-screen display
- Uses game state for validation and display
- Callbacks to parent for tech selection

### State Management
- `showTechTree` boolean in App component
- Auto-opens based on turn number
- Can be manually opened via HUD button

### Validation
- Prerequisites checked before tech can be researched
- Era requirements validated (need 2 from previous era)
- Build system integrated with tech requirements via `canBuild()`
