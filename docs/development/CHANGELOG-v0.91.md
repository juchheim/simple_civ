# Changelog - v0.91

## River Rendering Improvements

### Changed
- **River Geometry Generation** (`engine/src/map/map-generator.ts`)
  - Engine now owns final river polyline geometry
  - Rivers are emitted as `RiverSegmentDescriptor[]` arrays with explicit pixel coordinates
  - Each segment includes `start` and `end` points in world coordinates
  - Eliminates client-side reconstruction issues that caused zigzagging and disconnections

- **River Rendering** (`client/src/components/GameMap.tsx`)
  - Client now directly renders engine-provided polyline coordinates
  - Removed all client-side river path reconstruction logic
  - Rivers render as continuous, smooth paths following hex edges

### Technical Details
- **New Type**: `RiverSegmentDescriptor` with `tile`, `cornerA`, `cornerB`, `start`, `end`, and optional `isMouth` fields
- **New Field**: `map.riverPolylines` in `GameState` containing pre-calculated river geometry
- **Architecture**: Engine calculates exact corner points; client renders verbatim

### Added
- **River Mouth Asset** (`client/public/terrain/RiverMouth.png`)
  - Dedicated sprite for the final edge where a river meets the sea
  - Asset can be fully transparent when designers want an invisible terminator

### Implementation Notes
- **River Mouth Descriptor Flag**
  - Engine now marks only the final segment touching water with `isMouth: true`
  - Bridge segments inside the last land tile always carry `isMouth: false`
  - Client swaps to the `RiverMouth` texture strictly for those flagged segments
- **Rendering Simplification**
  - Removed historical `hidden`/masking logic from `RiverSegmentDescriptor`
  - All path segments are rendered; visual masking is controlled purely by the mouth sprite

### Impact
- Rivers terminate cleanly on the coastline without hiding inland tiles
- Artists can style or hide the terminator independently of the main river asset
- Fewer edge cases in generator/render sync; every segment shown corresponds to real gameplay data

## Version Updates
- All package versions updated to 0.91.0
- Game version constant updated to "0.91"
- Documentation references updated to v0.91

## Unit Linking & Movement UX

### Added
- **Unit Linking System** (`engine/src/core/types.ts`, `engine/src/game/turn-loop.ts`, `client/src/utils/engine-types.ts`, `client/src/utils/turn-loop.ts`)
  - Units now expose an optional `linkedUnitId` so two friendly units on the same hex can be paired.
  - New `LinkUnits`/`UnlinkUnits` actions validate ownership, co-location, and combat state before toggling the relationship.
  - Engine and client reducers keep both units synchronized, auto-move the partner with the slower move stat, and unlink when blocked or separated.
- **HUD Controls** (`client/src/components/HUD.tsx`)
  - Link/Unlink buttons appear when the selected unit meets the requirements, showing the current partner for quick reference.
  - Tooling prefers already-linked units when auto-selecting from a stacked tile to reduce extra clicks.

### Changed
- **Movement Flow** (`client/src/App.tsx`, `client/src/components/GameMap.tsx`)
  - Path preview now enumerates every reachable hex within the unit’s remaining movement and renders green highlights on the map.
  - Clicking any highlighted hex issues the entire sequence of `MoveUnit` actions, enabling multi-hex moves in a single click.
  - Destination selection respects capture rules so empty enemy cities (HP ≤ 0) can be entered directly once defenses fall.
- **Visual Feedback**
  - Unit sprites now animate between tiles using lightweight transform transitions instead of teleporting.
  - Linked partners display glow rings plus a chain icon, and unit highlights update live while moving.
  - Sprites render only on tiles that are currently visible, keeping hidden enemy units under fog.

### Testing
- `npm test -w engine`
- `npm run build -w client`

