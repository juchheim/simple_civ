# Code Comment Review Summary & Recommendations

## Overview
A comprehensive review of the Simple-Civ codebase reveals a consistent pattern in commenting styles. The codebase generally excels at documenting **intent** and **history** (especially regarding game balance changes), but lacks formal **structured documentation** (TSDoc) for exported symbols.

## Key Findings

### 1. Strong "Why" Documentation
The codebase contains excellent comments explaining *why* certain values or logic exist.
- **Example**: `// v1.8: Restored starting SpearGuard (win rate dropped to 11.8% without it)` in `map-generator.ts`.
- **Benefit**: This provides crucial context for both human maintainers and AI agents trying to understand the "personality" and design goals of the game.

### 2. Missing TSDoc
Most exported functions, classes, and interfaces lack formal TSDoc / JSDoc comments.
- **Impact**: IDEs cannot show tooltips, and AI agents have to infer function purposes from implementation details rather than clear signatures.
- **Recommendation**: Systematically add TSDoc to all exported symbols in `engine/src` and `client/src`.

### 3. "Ghost" Comments
A few instances of empty or unfinished comments were found.
- **Example**: `engine/src/game/rules.ts` line 164.
- **Recommendation**: Audit and remove/fix these.

## Action Plan

### Phase 1: Engine TSDoc (High Priority)
Focus on `engine/src/core` and `engine/src/game` as these are the "brain" of the application.
- [ ] Add TSDoc to `constants.ts` (explain magic numbers).
- [ ] Add TSDoc to `hex.ts` (math utility documentation is critical).
- [ ] Add TSDoc to `rules.ts` (core game logic).
- [ ] Add TSDoc to `ai-decisions.ts` (formalize the inputs/outputs of decision logic).

### Phase 2: Client TSDoc (Medium Priority)
Focus on reusable hooks and major components.
- [ ] Add TSDoc to `useGameSession.ts` and `useMapController.ts`.
- [ ] Add TSDoc to `GameMap` and `HUD` props.

### Phase 3: Cleanup
- [ ] Remove "Ghost" comments.
- [ ] Standardize version history comments (consider moving older ones to a changelog if they clutter code, though current usage is acceptable for context).
