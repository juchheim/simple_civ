/**
 * Civilization helper functions.
 * Centralizes civ-specific checks to avoid duplication across codebase.
 */

/**
 * Returns true if the civ is a "defensive" civ (Scholar Kingdoms or Starborne Seekers).
 * These civs prioritize CityWards tech, Bulwark units, and defensive strategies.
 */
export function isDefensiveCiv(civName: string | undefined): boolean {
    return civName === "ScholarKingdoms" || civName === "StarborneSeekers";
}
