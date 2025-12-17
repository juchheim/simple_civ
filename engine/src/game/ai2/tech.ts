import { BUILDINGS, TECHS, ENABLE_AETHER_ERA } from "../../core/constants.js";
import { aiInfo } from "../ai/debug-logging.js";
import { AiVictoryGoal, BuildingType, GameState, ProjectId, TechId } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { pickBest } from "./util.js";

function meetsEraGate(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    const hearthCount = playerTechs.filter(t => TECHS[t].era === "Hearth").length;
    const bannerCount = playerTechs.filter(t => TECHS[t].era === "Banner").length;
    // Match current global pacing: Banner requires 3 Hearth, Engine requires 2 Banner.
    if (data.era === "Banner" && hearthCount < 3) return false;
    if (data.era === "Engine" && bannerCount < 2) return false;
    return true;
}

function canResearch(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    return data.prereqTechs.every(t => playerTechs.includes(t)) && meetsEraGate(playerTechs, techId);
}


function availableTechs(playerTechs: TechId[]): TechId[] {
    return Object.values(TechId).filter(t => {
        if (!ENABLE_AETHER_ERA && TECHS[t].era === "Aether") return false;
        return !playerTechs.includes(t) && canResearch(playerTechs, t);
    });
}

function goalPathScore(goal: AiVictoryGoal, techId: TechId, path: TechId[] | undefined): number {
    if (!path || path.length === 0) return 0;
    const idx = path.indexOf(techId);
    if (idx < 0) return 0;
    // Earlier in the path is higher.
    return 120 - idx * 10;
}

function uniqueRushScore(state: GameState, playerId: string, techId: TechId): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return 0;
    const civ = player.civName;

    // If civ has a unique building to rush, boost its tech prereq chain.
    const uniqueBuilding = civ === "AetherianVanguard"
        ? BuildingType.TitansCore
        : civ === "StarborneSeekers"
            ? BuildingType.SpiritObservatory
            : civ === "JadeCovenant"
                ? BuildingType.JadeGranary
                : null;

    if (!uniqueBuilding) return 0;
    const req = BUILDINGS[uniqueBuilding]?.techReq;
    if (!req) return 0;

    if (techId === req) return 140;

    // Small boost for prerequisites of the unique tech (one hop).
    const reqData = TECHS[req];
    if (reqData.prereqTechs.includes(techId)) return 60;
    return 0;
}

export function chooseTechV2(state: GameState, playerId: string, goal: AiVictoryGoal): TechId | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.currentTech) return null;
    const profile = getAiProfileV2(state, playerId);

    const avail = availableTechs(player.techs);
    if (avail.length === 0) return null;

    // v2.1: Force AetherianVanguard custom path (Titan Rush)
    if (profile.civName === "AetherianVanguard") {
        const titanPath = [
            TechId.FormationTraining,  // Hearth #1 - Military first
            TechId.ScriptLore,         // Hearth #2 - Science boost
            TechId.StoneworkHalls,     // Hearth #3 - Titan prereq (Completion of Era Gate)
            TechId.DrilledRanks,       // Banner #1 - Enables Form Army
            TechId.TimberMills,        // Banner #2 - Unlocks Engine era
            TechId.SteamForges,        // Engine - Unlocks Titan's Core
        ];
        for (const t of titanPath) {
            if (!player.techs.includes(t) && avail.includes(t)) return t;
        }
    }

    const path = profile.tech.pathsByGoal[goal] ?? [];
    const scored = avail.map(t => {
        const weight = (profile.tech.weights[t] ?? 0) * 100;
        const pathS = goalPathScore(goal, t, path);
        const unique = uniqueRushScore(state, playerId, t);
        // Cheapness tie-breaker
        const cost = TECHS[t].cost;
        const cheap = -cost * 0.05;

        let score = weight + pathS + unique + cheap;

        // v6.0: Aether Era Randomization
        // If it's an Aether tech, randomize the score heavily to diversify endgame
        // v6.0: Aether Era Randomization
        // If it's an Aether tech, randomize the score heavily to diversify endgame
        if (TECHS[t].era === "Aether") {
            score += 80; // Baseline weight to compete with other options (otherwise might default to 0 weight from profile)
            // Add a random buffer of +/- 30 to make choice unpredictable
            const randomFactor = (state.seed * 997 + cost) % 60 - 30;
            score += randomFactor;
        }

        return { item: t, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const pick = scored[0];

    // Log top 3 choices for debugging progress stalls
    if (true) {
        const top3 = scored.slice(0, 3).map(s => `${s.item} (${s.score.toFixed(1)})`).join(", ");
        aiInfo(`[AI Tech] ${playerId} choosing tech. Top 3: ${top3}. EraGate Banner: ${player.techs.filter(t => TECHS[t].era === "Banner").length}, Hearth: ${player.techs.filter(t => TECHS[t].era === "Hearth").length}`);
    }

    return pick?.item ?? null;
}





