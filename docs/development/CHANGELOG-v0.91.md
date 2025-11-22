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
- **New Type**: `RiverSegmentDescriptor` with `tile`, `cornerA`, `cornerB`, `start`, and `end` fields
- **New Field**: `map.riverPolylines` in `GameState` containing pre-calculated river geometry
- **Architecture**: Engine calculates exact corner points; client renders verbatim

### Impact
- Rivers now render correctly without visual artifacts (zigzags, gaps, double-backs)
- Improved visual quality and consistency
- Simplified client-side rendering code

## Version Updates
- All package versions updated to 0.91.0
- Game version constant updated to "0.91"
- Documentation references updated to v0.91

