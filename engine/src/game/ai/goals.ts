import { hexDistance } from "../../core/hex.js";
import { AiVictoryGoal, BuildingType, City, GameState, ProjectId, UnitType } from "../../core/types.js";
import { getPersonalityForPlayer } from "./personality.js";
import { CITY_DEFENSE_BASE, CITY_WARD_DEFENSE_BONUS, UNITS } from "../../core/constants.js";

export function setAiGoal(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    return {
        ...state,
        players: state.players.map(p => (p.id === playerId ? { ...p, aiGoal: goal } : p)),
    };
}

function anyEnemyNearCity(city: City, state: GameState, ownerId: string, radius: number): boolean {
    return state.units.some(u => u.ownerId !== ownerId && hexDistance(u.coord, city.coord) <= radius);
}

/**
 * v0.97: Check if player has a Titan unit
 */
function hasTitan(playerId: string, state: GameState): boolean {
    return state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
}

/**
 * v0.98 Update 4: Estimate military power for a player
 */
export function estimateMilitaryPower(playerId: string, state: GameState): number {
    const units = state.units.filter(u => u.ownerId === playerId);
    const unitPower = units.reduce((sum, u) => {
        const stats = UNITS[u.type];
        const atk = stats.atk * 2;
        const def = stats.def * 1.5;
        const hp = stats.hp * 0.25;
        const formationBonus = u.type.startsWith("Army") ? 1.25 : 1;
        return sum + (atk + def + hp) * formationBonus;
    }, 0);

    const cities = state.cities.filter(c => c.ownerId === playerId);
    const cityPower = cities.reduce((sum, c) => {
        const ward = c.buildings?.includes(BuildingType.CityWard) ? CITY_WARD_DEFENSE_BONUS : 0;
        return sum + (CITY_DEFENSE_BASE + ward) * 2 + (c.hp ?? 0) * 0.3;
    }, 0);

    return unitPower + cityPower;
}

/**
 * v0.98 Update 4: Check if player has overwhelming military dominance (2x power over all enemies)
 */
function hasOverwhelmingPower(playerId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const activePlayers = state.players.filter(p => !p.isEliminated && p.id !== playerId);
    
    if (activePlayers.length === 0) return false;
    
    // Check if we have 2x the power of every remaining civ
    return activePlayers.every(p => {
        const theirPower = estimateMilitaryPower(p.id, state);
        return myPower >= theirPower * 2;
    });
}

/**
 * v0.98 Update 4: Find weak enemies (1-2 cities) that should be finished off
 */
export function findFinishableEnemies(playerId: string, state: GameState): string[] {
    const activePlayers = state.players.filter(p => !p.isEliminated && p.id !== playerId);
    const myPower = estimateMilitaryPower(playerId, state);
    
    return activePlayers
        .filter(p => {
            const theirCities = state.cities.filter(c => c.ownerId === p.id);
            const theirPower = estimateMilitaryPower(p.id, state);
            // Finishable: 1-2 cities AND we have at least 1.5x their power
            return theirCities.length <= 2 && theirCities.length > 0 && myPower >= theirPower * 1.5;
        })
        .map(p => p.id);
}

export function aiVictoryBias(playerId: string, state: GameState): AiVictoryGoal {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return "Balanced";
    const personality = getPersonalityForPlayer(state, playerId);
    
    // v0.97: AetherianVanguard with a Titan ALWAYS goes Conquest mode
    // The Titan is too powerful to not use aggressively
    if (player.civName === "AetherianVanguard" && hasTitan(playerId, state)) {
        console.info(`[AI Goal] ${playerId} (AetherianVanguard) switching to Conquest - Titan unleashed!`);
        return "Conquest";
    }
    
    const prefersProgress = personality.projectRush?.type === "Building"
        ? personality.projectRush.id === BuildingType.SpiritObservatory
        : personality.projectRush?.id === ProjectId.Observatory;
    const aggressionForward = personality.aggression.warPowerThreshold < 1;
    const fallback = player.aiGoal ?? (prefersProgress ? "Progress" : aggressionForward ? "Conquest" : "Balanced");
    const capitals = state.cities.filter(c => c.ownerId === playerId && c.isCapital);
    const capitalsSafe = capitals.every(c => c.hp >= (c.maxHp ?? 15) * 0.6 && !anyEnemyNearCity(c, state, playerId, 2));
    
    // Observatory + safe capital = commit to Progress path (takes priority over aggressive options)
    if (player.completedProjects.includes(ProjectId.Observatory) && capitalsSafe) {
        return "Progress";
    }
    
    // v0.98 Update 4: Overwhelming power (2x all enemies) → aggressive Conquest
    // This addresses stalled games where dominant civs fail to finish off weak opponents
    if (hasOverwhelmingPower(playerId, state)) {
        console.info(`[AI Goal] ${playerId} has overwhelming power (2x all enemies) - switching to Conquest!`);
        return "Conquest";
    }
    
    // v0.98 Update 4: "Finish him" - if any enemy has 1-2 cities and we're stronger, go Conquest
    const finishableEnemies = findFinishableEnemies(playerId, state);
    if (finishableEnemies.length > 0) {
        console.info(`[AI Goal] ${playerId} has finishable enemies (${finishableEnemies.length} with 1-2 cities) - switching to Conquest!`);
        return "Conquest";
    }

    const hasArmies = state.units.some(u => u.ownerId === playerId && u.type.startsWith("Army"));
    const enemyCapitalInStrikeRange = state.cities.some(c => {
        if (c.ownerId === playerId || !c.isCapital) return false;
        return state.units.some(u => u.ownerId === playerId && hexDistance(u.coord, c.coord) <= 4);
    });
    if (hasArmies && enemyCapitalInStrikeRange) {
        return "Conquest";
    }

    return fallback;
}
