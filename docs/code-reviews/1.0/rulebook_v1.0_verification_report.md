# Rulebook v1.0 Verification Report

## Overview
A comprehensive review of the codebase was conducted to verify the accuracy of `simple-civ_v1.0_rulebook.md`. The review covered all sections of the rulebook, comparing them against the `engine` and `client` code.

**Overall Status**: The codebase is largely consistent with the rulebook, but **5 specific discrepancies** were identified where the rulebook needs to be updated to match the authoritative code.

## Discrepancies & Recommendations

### 1. Starting Units (Section 4 vs Section 14)
*   **Rulebook Section 4**: States "Starting units: each civ begins with 1 Settler + 1 Scout."
*   **Code (`map-generator.ts`)**: Starborne Seekers start with an additional **SpearGuard**.
*   **Rulebook Section 14**: Correctly notes that Starborne Seekers start with "Scout + SpearGuard".
*   **Recommendation**: Update Section 4 to acknowledge the exception.
    *   *Change*: "Starting units: each civ begins with 1 Settler + 1 Scout (Starborne Seekers start with an additional SpearGuard)."

### 2. City Razing Requirements (Section 7)
*   **Rulebook Section 7**: States "Non-capitals may be razed by owner."
*   **Code (`actions/cities.ts`)**: Requires a **garrisoned unit** to be present in the city to raze it.
*   **Recommendation**: Update Section 7 to reflect this requirement.
    *   *Change*: "Non-capitals may be razed by owner **if a garrison is present**."

### 3. Settler Defense Stats (Section 9)
*   **Rulebook Section 9**: Lists Settler stats as "0/0/1/1/1/18" (Defense 0).
*   **Code (`constants.ts`)**: Settler Defense is **2**.
*   **Recommendation**: Update Section 9 to match the code.
    *   *Change*: "Settler: 0/**2**/1/1/1/18..."

### 4. Fortify Bonus Consistency (Section 10)
*   **Rulebook Section 10**: Contradicts itself.
    *   Line 173: "Grants **+2** Defense bonus."
    *   Line 184: "Fortified state adds **+1** defense."
*   **Code (`constants.ts`)**: Fortify bonus is **+1**.
*   **Recommendation**: Update Line 173 to match the code and Line 184.
    *   *Change*: "Grants **+1** Defense bonus."

### 5. Observatory Project Cost (Section 13)
*   **Rulebook Section 13**: Lists Observatory cost as **300**.
*   **Code (`constants.ts`)**: Observatory cost is **220**.
*   **Recommendation**: Update Section 13 to match the code.
    *   *Change*: "Observatory (**220**, Star Charts)..."

## Verified Sections
The following sections were verified and found to be **completely accurate**:
*   1. Vision & Pillars
*   2. How to Read & Terminology
*   3. Core Loop & Victory (Note: Code includes a logical "blocker" check for Conquest victory regarding un-founded players, which is consistent with the spirit of the rules).
*   5. Turn Structure
*   6. Yields & Economy
*   8. Terrain & Features
*   11. Technology
*   12. Buildings
*   15. Map & Generation
*   16. Diplomacy
*   17. Victory, Ties, Elimination
*   18. State Indicators & UI Standards

## Conclusion
The codebase is robust and follows the rules closely. The identified discrepancies are minor documentation errors or unlisted edge cases. Updating the rulebook as recommended will restore 100% consistency.
