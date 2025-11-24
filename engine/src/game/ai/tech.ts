import { TECHS } from "../../core/constants.js";
import { AiVictoryGoal, GameState, TechId } from "../../core/types.js";
import { tryAction } from "./shared/actions.js";

function canResearch(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    return data.prereqTechs.every(t => playerTechs.includes(t));
}

function goalTechPath(goal: AiVictoryGoal): TechId[] {
    if (goal === "Progress") {
        return [TechId.ScriptLore, TechId.ScholarCourts, TechId.StarCharts];
    }
    if (goal === "Conquest") {
        return [TechId.FormationTraining, TechId.DrilledRanks, TechId.ArmyDoctrine];
    }
    return [];
}

export function aiChooseTech(playerId: string, state: GameState, goal: AiVictoryGoal): TechId | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.currentTech) return null;

    const hasTech = (t: TechId) => player.techs.includes(t);
    const path = goalTechPath(goal);

    for (const techId of path) {
        if (!hasTech(techId) && canResearch(player.techs, techId)) {
            return techId;
        }
    }

    const available = Object.values(TechId)
        .filter(t => !hasTech(t) && canResearch(player.techs, t))
        .sort((a, b) => TECHS[a].cost - TECHS[b].cost);

    return available[0] ?? null;
}

export function pickTech(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    const techId = aiChooseTech(playerId, state, goal);
    if (!techId) return state;
    return tryAction(state, { type: "ChooseTech", playerId, techId });
}

