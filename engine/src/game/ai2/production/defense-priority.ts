// Defense vs expansion decision helpers for AI production.
import { City, DiplomacyState, GameState, TechId } from "../../../core/types.js";
import { estimateMilitaryPower } from "../../ai/goals.js";
import { assessCityThreatLevel } from "../defense-situation/scoring.js";

export type DefenseDecision = "defend" | "expand" | "interleave";

type WarPowerSnapshot = {
    warEnemies: GameState["players"];
    atWar: boolean;
    powerRatio: number;
    maxEnemyPower: number;
};

function getWarEnemies(state: GameState, playerId: string): GameState["players"] {
    return state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

function getMaxEnemyPower(state: GameState, enemies: GameState["players"]): number {
    let maxEnemyPower = 0;
    for (const enemy of enemies) {
        const enemyPower = estimateMilitaryPower(enemy.id, state);
        if (enemyPower > maxEnemyPower) maxEnemyPower = enemyPower;
    }
    return maxEnemyPower;
}

function getWarPowerSnapshot(state: GameState, playerId: string): WarPowerSnapshot {
    const warEnemies = getWarEnemies(state, playerId);
    const atWar = warEnemies.length > 0;
    const myPower = estimateMilitaryPower(playerId, state);
    const maxEnemyPower = getMaxEnemyPower(state, warEnemies);
    const powerRatio = maxEnemyPower > 0 ? myPower / maxEnemyPower : Infinity;

    return { warEnemies, atWar, powerRatio, maxEnemyPower };
}

/**
 * v7.2: Intelligent Expansion vs Defense Decision
 * 
 * Determines whether a city should prioritize building defensive units over settlers.
 * Uses multiple factors: power ratio, threat level, war status, game phase, and randomness.
 * 
 * Returns: "defend" | "expand" | "interleave"
 * - "defend" = Build defensive unit
 * - "expand" = Build settler/economy
 * - "interleave" = Use weighted random (60% expand, 40% defend by default)
 */
export function shouldPrioritizeDefense(
    state: GameState,
    city: City,
    playerId: string,
    phase: "Expand" | "Develop" | "Execute",
    isCoordVisible?: (coord: { q: number; r: number }) => boolean
): DefenseDecision {
    const threatLevel = assessCityThreatLevel(state, city, playerId, 5, 2, isCoordVisible);
    const myCities = state.cities.filter(c => c.ownerId === playerId);

    const { atWar, powerRatio } = getWarPowerSnapshot(state, playerId);

    // ==== DECISION LOGIC ====

    // 1. ASSAULT THREAT: Always defend
    if (threatLevel === "assault") {
        return "defend";
    }

    // 1.5. STARCHARTS: Civs with StarCharts should pursue Progress victory
    // Don't let defense priority block Grand Experiment production
    const player = state.players.find(p => p.id === playerId);
    if (player?.techs?.includes(TechId.StarCharts)) {
        return "expand"; // Let production logic build Observatory/Academy/Experiment
    }

    // 2. STRONG POSITION + NOT AT WAR: Favor expansion
    if (powerRatio >= 2.0 && !atWar) {
        return "expand";
    }

    // 2.5: COUNTER-ATTACK TRANSITION (Item 6)
    // If we are significantly stronger than the enemy even during war,
    // transition to expansion/offense to close out the game.
    if (atWar && powerRatio >= 1.5) {
        return "expand";
    }

    // 3. EARLY GAME: Expansion is critical (need cities first)
    if (phase === "Expand" && myCities.length < 3 && (threatLevel === "none" || threatLevel === "probe")) {
        return "expand";
    }

    // 4. AT WAR + RAID THREAT: Defend urgently
    if (atWar && threatLevel === "raid") {
        return "defend";
    }

    // 5. WEAK POSITION (power ratio < 1.0): Prioritize defense
    if (powerRatio < 1.0 && atWar) {
        return "defend";
    }

    // 6. NO THREAT + PEACE: Expansion friendly
    if (threatLevel === "none" && !atWar) {
        return "expand";
    }

    // 7. UNCERTAIN SITUATIONS: Interleave
    // Uses weighted random based on power ratio
    // Higher power = more expansion, lower power = more defense
    return "interleave";
}

/**
 * Execute the interleave decision with weighted randomness
 * Returns true if should build defender, false if should expand
 * v7.2: Added cityIndex for per-city random seed (different cities make different decisions)
 */
export function resolveInterleave(state: GameState, playerId: string, cityIndex: number = 0): boolean {
    // Calculate defense weight based on power ratio
    const { powerRatio, maxEnemyPower } = getWarPowerSnapshot(state, playerId);

    // Defense weight: 0.3 (strong) to 0.7 (weak)
    // powerRatio >= 2.0 = 0.3 defense weight (30% chance to defend)
    // powerRatio <= 0.5 = 0.7 defense weight (70% chance to defend)
    let defenseWeight = 0.5; // Default 50/50
    if (maxEnemyPower > 0) {
        defenseWeight = Math.max(0.3, Math.min(0.7, 1.1 - powerRatio * 0.4));
    }

    // v7.2: Use turn number + cityIndex as pseudo-random seed
    // This ensures each city makes a different decision, enabling true interleaving
    const pseudoRandom = ((state.turn * 7 + cityIndex * 13) % 100) / 100;

    return pseudoRandom < defenseWeight;
}
