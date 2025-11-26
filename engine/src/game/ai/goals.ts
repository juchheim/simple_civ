import { hexDistance } from "../../core/hex.js";
import { AiVictoryGoal, BuildingType, City, GameState, ProjectId } from "../../core/types.js";
import { getPersonalityForPlayer } from "./personality.js";

export function setAiGoal(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    return {
        ...state,
        players: state.players.map(p => (p.id === playerId ? { ...p, aiGoal: goal } : p)),
    };
}

function anyEnemyNearCity(city: City, state: GameState, ownerId: string, radius: number): boolean {
    return state.units.some(u => u.ownerId !== ownerId && hexDistance(u.coord, city.coord) <= radius);
}

export function aiVictoryBias(playerId: string, state: GameState): AiVictoryGoal {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return "Balanced";
    const personality = getPersonalityForPlayer(state, playerId);
    const prefersProgress = personality.projectRush?.type === "Building"
        ? personality.projectRush.id === BuildingType.SpiritObservatory
        : personality.projectRush?.id === ProjectId.Observatory;
    const aggressionForward = personality.aggression.warPowerThreshold < 1;
    const fallback = player.aiGoal ?? (prefersProgress ? "Progress" : aggressionForward ? "Conquest" : "Balanced");
    const capitals = state.cities.filter(c => c.ownerId === playerId && c.isCapital);
    const capitalsSafe = capitals.every(c => c.hp >= c.maxHp * 0.6 && !anyEnemyNearCity(c, state, playerId, 2));
    if (player.completedProjects.includes(ProjectId.Observatory) && capitalsSafe) {
        return "Progress";
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
