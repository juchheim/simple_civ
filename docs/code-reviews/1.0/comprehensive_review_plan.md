# Comprehensive Codebase Review Plan for Rulebook v1.0 Verification

## Goal
To review the entire codebase in extreme detail to confirm that the `simple-civ_v1.0_rulebook.md` is completely up to date and does not require additions, deletions, or modifications.

## Methodology
We will systematically review each section of the rulebook and verify its implementation in the codebase. We will check both the `engine` (logic) and `client` (UI/Data) to ensure consistency.

## Review Sections

### 1. Vision & Pillars
*   **Rulebook Section**: 1. Vision & Pillars
*   **Verification**: High-level assessment. Ensure no "bloat" features have crept in.

### 2. Core Loop & Victory
*   **Rulebook Section**: 3. Core Loop & Victory
*   **Files to Check**:
    *   `engine/src/game/turn-lifecycle.ts` (Loop)
    *   `engine/src/game/victory.ts` (Victory conditions)

### 3. Setup & Start State
*   **Rulebook Section**: 4. Setup & Start State
*   **Files to Check**:
    *   `engine/src/game/setup.ts` (Initial state)
    *   `engine/src/map/map-generator.ts` (Map sizes, civ caps)
    *   `client/src/data/civs.ts` (Starting units check)

### 4. Turn Structure
*   **Rulebook Section**: 5. Turn Structure
*   **Files to Check**:
    *   `engine/src/game/turn-lifecycle.ts` (Start/End turn logic)
    *   `engine/src/game/actions/**` (Action phases)

### 5. Yields & Economy
*   **Rulebook Section**: 6. Yields & Economy
*   **Files to Check**:
    *   `engine/src/game/economy.ts` (Yield calculations)
    *   `engine/src/game/city.ts` (Growth, Production, Science)

### 6. Cities
*   **Rulebook Section**: 7. Cities
*   **Files to Check**:
    *   `engine/src/game/city.ts` (City logic)
    *   `engine/src/game/actions/cities.ts` (Founding, attacking)

### 7. Terrain & Features
*   **Rulebook Section**: 8. Terrain & Features
*   **Files to Check**:
    *   `engine/src/map/terrain.ts` (Terrain types, yields, costs)

### 8. Units
*   **Rulebook Section**: 9. Units
*   **Files to Check**:
    *   `engine/src/game/units.ts` (Unit definitions, stats)
    *   `client/src/data/units.ts` (Frontend data)

### 9. Movement & Combat
*   **Rulebook Section**: 10. Movement & Combat
*   **Files to Check**:
    *   `engine/src/game/movement.ts` (Pathfinding, costs)
    *   `engine/src/game/combat.ts` (Damage model, attacks)

### 10. Technology
*   **Rulebook Section**: 11. Technology
*   **Files to Check**:
    *   `engine/src/game/research.ts` (Tech tree, costs)
    *   `client/src/data/techs.ts` (Frontend data)

### 11. Buildings
*   **Rulebook Section**: 12. Buildings
*   **Files to Check**:
    *   `engine/src/game/buildings.ts` (Building effects, costs)
    *   `client/src/data/buildings.ts` (Frontend data)

### 12. Projects & Wonders
*   **Rulebook Section**: 13. Projects & Wonders
*   **Files to Check**:
    *   `engine/src/game/projects.ts` (Project logic)

### 13. Civilizations & Traits
*   **Rulebook Section**: 14. Civilizations & Traits
*   **Files to Check**:
    *   `engine/src/game/civs.ts` (Civ traits implementation)
    *   `client/src/data/civs.ts` (Frontend data)

### 14. Map & Generation
*   **Rulebook Section**: 15. Map & Generation
*   **Files to Check**:
    *   `engine/src/map/map-generator.ts` (Generation logic)

### 15. Diplomacy
*   **Rulebook Section**: 16. Diplomacy
*   **Files to Check**:
    *   `engine/src/game/diplomacy.ts` (War, Peace, Vision)

### 16. Victory, Ties, Elimination
*   **Rulebook Section**: 17. Victory, Ties, Elimination
*   **Files to Check**:
    *   `engine/src/game/victory.ts` (Resolution logic)

### 17. State Indicators & UI Standards
*   **Rulebook Section**: 18. State Indicators & UI Standards
*   **Files to Check**:
    *   `client/src/components/**` (UI implementation)

## Execution
1.  Iterate through each section.
2.  Read the relevant code files.
3.  Compare values, logic, and rules against the rulebook.
4.  Note any discrepancies.
5.  If discrepancies are found, determine if the code or the rulebook is correct (usually code is authoritative, rulebook needs update, OR code is buggy). Default to the code being authoritative.
6.  Compile a final report.
