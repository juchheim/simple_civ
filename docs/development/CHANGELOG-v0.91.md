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

