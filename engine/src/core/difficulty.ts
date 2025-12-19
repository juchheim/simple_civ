/**
 * Difficulty System
 * 
 * Provides AI bonuses at different difficulty levels.
 * Selected at game setup, hidden from player, fixed for game duration.
 */

export type DifficultyLevel = "Easy" | "Normal" | "Hard" | "Expert";

export type DifficultyBonuses = {
    production: number;  // Multiplier for AI city production
    combat: number;      // Multiplier for AI attack damage
    research: number;    // Multiplier for AI research output
    startingUnits: number; // Extra military units AI starts with
};

export const DIFFICULTY_BONUSES: Record<DifficultyLevel, DifficultyBonuses> = {
    Easy: { production: 0.8, combat: 0.9, research: 0.85, startingUnits: 0 },
    Normal: { production: 1.0, combat: 1.0, research: 1.0, startingUnits: 0 },
    Hard: { production: 1.25, combat: 1.1, research: 1.2, startingUnits: 1 },
    Expert: { production: 1.5, combat: 1.2, research: 1.4, startingUnits: 2 }
};

export const DEFAULT_DIFFICULTY: DifficultyLevel = "Normal";

/**
 * Get bonuses for a player based on game difficulty
 * Only AI players get bonuses; human player always has 1.0 multipliers
 */
export function getDifficultyBonuses(difficulty: DifficultyLevel, isHuman: boolean): DifficultyBonuses {
    if (isHuman) {
        return { production: 1.0, combat: 1.0, research: 1.0, startingUnits: 0 };
    }
    return DIFFICULTY_BONUSES[difficulty];
}
