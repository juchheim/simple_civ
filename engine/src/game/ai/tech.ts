import { BUILDINGS, TECHS } from "../../core/constants.js";
import { AiVictoryGoal, GameState, TechId } from "../../core/types.js";
import { getPersonalityForPlayer, AiPersonality } from "./personality.js";
import { tryAction } from "./shared/actions.js";

function meetsEraGate(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    const hearthCount = playerTechs.filter(t => TECHS[t].era === "Hearth").length;
    const bannerCount = playerTechs.filter(t => TECHS[t].era === "Banner").length;
    if (data.era === "Banner" && hearthCount < 2) return false;
    if (data.era === "Engine" && bannerCount < 2) return false;
    return true;
}

function canResearch(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    return data.prereqTechs.every(t => playerTechs.includes(t)) && meetsEraGate(playerTechs, techId);
}

function availableTechs(playerTechs: TechId[]): TechId[] {
    return Object.values(TechId).filter(t => !playerTechs.includes(t) && canResearch(playerTechs, t));
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

function getAllPrereqs(techId: TechId): TechId[] {
    const data = TECHS[techId];
    if (!data.prereqTechs || data.prereqTechs.length === 0) return [];

    let prereqs: TechId[] = [...data.prereqTechs];
    for (const p of data.prereqTechs) {
        prereqs = [...prereqs, ...getAllPrereqs(p)];
    }
    return [...new Set(prereqs)];
}

function rushTechs(personality: AiPersonality): TechId[] {
    if (!personality.projectRush) return [];

    let targetTech: TechId | undefined;
    if (personality.projectRush.type === "Building") {
        targetTech = BUILDINGS[personality.projectRush.id].techReq;
    } else {
        const entry = Object.entries(TECHS).find(([, data]) => data.unlock.type === "Project" && data.unlock.id === personality.projectRush?.id);
        if (entry) targetTech = entry[0] as TechId;
    }

    if (!targetTech) return [];

    // Return target AND all its prerequisites so we beeline the whole chain
    return [targetTech, ...getAllPrereqs(targetTech)];
}

export function aiChooseTech(playerId: string, state: GameState, goal: AiVictoryGoal): TechId | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.currentTech) return null;
    const personality = getPersonalityForPlayer(state, playerId);
    const hasTech = (t: TechId) => player.techs.includes(t);
    const path = goalTechPath(goal);
    const rushTargets = rushTechs(personality);

    for (const techId of path) {
        if (!hasTech(techId) && canResearch(player.techs, techId)) {
            return techId;
        }
    }

    const available = availableTechs(player.techs)
        .map(t => {
            const pathIdx = path.indexOf(t);
            const pathScore = pathIdx >= 0 ? 200 - pathIdx * 10 : 0;
            const weight = personality.techWeights[t] ? personality.techWeights[t]! * 50 : 0;
            const rushScore = rushTargets.includes(t) ? 150 : 0;
            const costTiebreaker = -TECHS[t].cost;
            return { t, score: pathScore + weight + rushScore + costTiebreaker };
        })
        .sort((a, b) => b.score - a.score);

    return available[0]?.t ?? null;
}

export function chooseFallbackTech(playerId: string, state: GameState): TechId | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;
    const available = availableTechs(player.techs);
    if (available.length === 0) return null;
    return available.sort((a, b) => TECHS[a].cost - TECHS[b].cost)[0];
}

export function pickTech(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    const techId = aiChooseTech(playerId, state, goal);
    if (!techId) return state;
    return tryAction(state, { type: "ChooseTech", playerId, techId });
}
