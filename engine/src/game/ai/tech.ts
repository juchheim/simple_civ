import { aiInfo } from "./debug-logging.js";
import { BUILDINGS, TECHS } from "../../core/constants.js";
import { AiVictoryGoal, GameState, ProjectId, TechId } from "../../core/types.js";
import { getPersonalityForPlayer, AiPersonality } from "./personality.js";
import { tryAction } from "./shared/actions.js";

function meetsEraGate(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    const hearthCount = playerTechs.filter(t => TECHS[t].era === "Hearth").length;
    const bannerCount = playerTechs.filter(t => TECHS[t].era === "Banner").length;
    // v1.9: Increased era gates from 2 to 3 for slower tech progression
    if (data.era === "Banner" && hearthCount < 3) return false;
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

function goalTechPath(goal: AiVictoryGoal, civName?: string): TechId[] {
    // v2.0: AetherianVanguard gets a custom path that interleaves Conquest + Titan rush
    // Order: FormationTraining → StoneworkHalls → Fieldcraft → DrilledRanks → TimberMills → SteamForges
    // This respects era gates (3 Hearth for Banner, 2 Banner for Engine) while prioritizing military
    if (civName === "AetherianVanguard") {
        return [
            TechId.FormationTraining,  // Hearth #1 - Military first
            TechId.ScriptLore,         // Hearth #2 - Science boost (User requested)
            TechId.StoneworkHalls,     // Hearth #3 - Titan prereq (Completion of Era Gate)
            TechId.DrilledRanks,       // Banner #1 - Enables Form Army
            TechId.TimberMills,        // Banner #2 - Unlocks Engine era
            TechId.SteamForges,        // Engine - Unlocks Titan's Core
        ];
    }

    if (goal === "Progress") {
        // v1.9: Added SignalRelay as prereq for StarCharts
        return [TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts];
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
    const path = goalTechPath(goal, player.civName);
    const rushTargets = rushTechs(personality);

    // v2.0: For civs with a custom tech path (like AetherianVanguard), follow the exact order
    // This ensures the interleaved Conquest + Titan rush path is respected
    if (player.civName === "AetherianVanguard") {
        for (const techId of path) {
            if (!hasTech(techId) && canResearch(player.techs, techId)) {
                aiInfo(`[AI Tech] ${playerId} AetherianVanguard custom path: ${techId} (turn ${state.turn})`);
                return techId;
            }
        }
    }

    // v1.3: If goal is Balanced but personality prefers Progress, boost Progress path techs
    const prefersProgress = personality.projectRush?.type === "Project"
        ? personality.projectRush.id === ProjectId.Observatory
        : false;
    const progressPathBoost = (goal === "Balanced" && prefersProgress) ? 100 : 0;

    // v1.8: Universal StarCharts Priority - ALL civs should work toward Progress option
    // After turn 100 or 8+ techs, boost StarCharts and its prereqs for everyone
    // This ensures civs get StarCharts by turn ~140 instead of ~180, leaving time for Progress chain
    const isLateEnough = state.turn >= 100 || player.techs.length >= 8;
    const starChartsUniversalBoost = isLateEnough ? 120 : 0;

    // v2.1: Large map hybrid boost - 6+ cities on large maps NEED Progress as backup
    // This fixes the issue where conquest civs like ForgeClans have tech weights that
    // deprioritize Progress-adjacent techs (SignalRelay, etc.), blocking their fallback victory path
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const mapSize = state.map.width * state.map.height;
    const isLargeMap = mapSize > 300; // Standard ~391, Large ~475, Huge ~850
    const largeMapHybridBoost = (isLargeMap && myCities.length >= 6 && goal === "Conquest") ? 150 : 0;

    // v2.0: Rush techs get 250 points to beat goal path score (200 max)
    // This ensures AetherianVanguard researches Titan path before Conquest path
    const hasRushTarget = rushTargets.length > 0;

    const available = availableTechs(player.techs)
        .map(t => {
            const pathIdx = path.indexOf(t);
            const pathScore = pathIdx >= 0 ? 200 - pathIdx * 10 : 0;
            const weight = personality.techWeights[t] ? personality.techWeights[t]! * 50 : 0;
            // v2.0: Increased from 150 to 250 to beat goal path score
            const rushScore = rushTargets.includes(t) ? 250 : 0;
            // v1.3: Boost Progress path techs for progress-oriented civs in Balanced mode
            // v1.9: Added SignalRelay (new prereq for StarCharts)
            const progressBoost = (prefersProgress && progressPathBoost > 0 &&
                (t === TechId.ScriptLore || t === TechId.ScholarCourts || t === TechId.SignalRelay || t === TechId.StarCharts))
                ? progressPathBoost : 0;
            // v1.8: Universal StarCharts boost for all civs after turn 100 or 8+ techs
            // v1.9: Added SignalRelay to the boost chain
            // v2.1: Added largeMapHybridBoost for 6+ city conquest civs on large maps
            const universalStarChartsBoost = ((starChartsUniversalBoost > 0 || largeMapHybridBoost > 0) &&
                (t === TechId.StarCharts || t === TechId.SignalRelay || t === TechId.ScholarCourts || t === TechId.ScriptLore))
                ? starChartsUniversalBoost + largeMapHybridBoost : 0;
            const costTiebreaker = -TECHS[t].cost;
            return { t, score: pathScore + weight + rushScore + progressBoost + universalStarChartsBoost + costTiebreaker };
        })
        .sort((a, b) => b.score - a.score);

    // v2.0: Log when rush target is prioritized
    if (hasRushTarget && available.length > 0 && rushTargets.includes(available[0].t)) {
        aiInfo(`[AI Tech] ${playerId} Rush tech prioritized: ${available[0].t} (turn ${state.turn})`);
    }

    // v1.8: Log when StarCharts boost activates for debugging
    if (starChartsUniversalBoost > 0 && available.length > 0) {
        const topTech = available[0].t;
        if (topTech === TechId.StarCharts || topTech === TechId.ScholarCourts || topTech === TechId.ScriptLore) {
            aiInfo(`[AI Tech] ${playerId} StarCharts path prioritized (turn ${state.turn}, ${player.techs.length} techs)`);
        }
    }

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
