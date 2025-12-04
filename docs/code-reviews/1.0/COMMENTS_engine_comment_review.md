# Engine Code Comment Review Findings

## Core Module (`engine/src/core`)

### `constants.ts`
- **Strengths**: Good use of comments to explain "magic numbers" and balance history (e.g., `// Was 20 - easier to capture`).
- **Weaknesses**: Missing TSDoc for exported constants. `GROWTH_FACTORS` lacks explanation of the `f` property.
- **Action**: Add TSDoc to exported constants.

### `hex.ts`
- **Strengths**: Clear section markers.
- **Weaknesses**: Almost all exported functions (`addHex`, `hexNeighbor`, etc.) lack TSDoc. This is a utility library and should be well-documented for AI usage.
- **Action**: Add TSDoc to all exported functions.

### `types.ts`
*(Pending review)*

## Map Module (`engine/src/map`)

### `map-generator.ts`
- **Strengths**: Good high-level comments explaining the generation steps (`// 1. Generate Base Map`). Excellent context on balance changes (`// v1.8: Restored starting SpearGuard...`).
- **Weaknesses**: `generateWorld` lacks TSDoc.
- **Action**: Add TSDoc to `generateWorld`.

### `rivers.ts`
- **Strengths**: Good fallback context comment.
- **Weaknesses**: Missing TSDoc for helper functions. `EDGE_TO_CORNER_INDICES` needs explanation.
- **Action**: Add TSDoc to exported functions.

## Game Module (`engine/src/game`)

### `rules.ts`
- **Strengths**: Good section markers. `getGrowthCost` has clear algorithmic explanation.
- **Weaknesses**:
    - Missing TSDoc for critical functions like `canBuild`, `getTileYields`.
    - **Ghost Comment**: Line 164 `// v1.0: ScholarKingdoms "Fortified Knowledge" - Science Bonus` appears to be an empty block.
- **Action**: Add TSDoc. Investigate and fix the ghost comment.

### `turn-lifecycle.ts`
- **Strengths**: Good "why" comments for fixes and specific rules (e.g., Titan regeneration).
- **Weaknesses**: Missing TSDoc for main lifecycle functions (`handleEndTurn`, `startPlayerTurn`).
- **Action**: Add TSDoc.

### `ai-decisions.ts`
- **Strengths**: **Best in class** for intent documentation. Comments explain *why* logic exists (e.g., "This fixes stalled games where dominant civs sit at peace").
- **Weaknesses**: `aiWarPeaceDecision` lacks formal TSDoc despite having great internal comments.
- **Action**: Add formal TSDoc to `aiWarPeaceDecision`.
