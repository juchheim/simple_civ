/**
 * tech.ts - Goal-Driven Tech Selection
 * 
 * REFACTORED: Uses capability chains from strategic-plan.ts
 * Removed: Weight scoring, Aether bonuses, hardcoded civ paths
 */

import { TECHS, ENABLE_AETHER_ERA } from "../../core/constants.js";
import { aiInfo } from "../ai/debug-logging.js";
import { AiVictoryGoal, GameState, TechId } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { getGoalRequirements, getNextTechInChain, getGamePhase } from "./strategic-plan.js";

// =============================================================================
// TECH AVAILABILITY
// =============================================================================

function meetsEraGate(playerTechs: TechId[], techId: TechId): boolean {
    const data = TECHS[techId];
    const hearthCount = playerTechs.filter(t => TECHS[t].era === "Hearth").length;
    const bannerCount = playerTechs.filter(t => TECHS[t].era === "Banner").length;
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

// =============================================================================
// MAIN TECH SELECTION
// =============================================================================

export function chooseTechV2(state: GameState, playerId: string, goal: AiVictoryGoal): TechId | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.currentTech) return null;
    const profile = getAiProfileV2(state, playerId);
    const phase = getGamePhase(state);

    const avail = availableTechs(player.techs);
    if (avail.length === 0) return null;

    // Get goal-driven requirements
    const requirements = getGoalRequirements(goal, profile.civName, phase);

    // PRIORITY 1: Follow the tech chain for our goal target
    const chainTech = getNextTechInChain(player.techs, requirements.techTarget);
    if (chainTech && avail.includes(chainTech)) {
        aiInfo(`[AI Tech] ${profile.civName} following ${requirements.techTarget} chain: ${chainTech}`);
        return chainTech;
    }

    // PRIORITY 1.1: HYBRID VICTORY - Late game StarCharts backup for ALL civs
    // If we're past turn 180 and don't have StarCharts, prioritize getting it
    // This enables the hybrid production logic (backup Progress victory path)
    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    if (state.turn >= 180 && !hasStarCharts) {
        // Need SignalRelay first
        if (!player.techs.includes(TechId.SignalRelay) && avail.includes(TechId.SignalRelay)) {
            aiInfo(`[AI Tech] ${profile.civName} HYBRID: SignalRelay (backup victory path)`);
            return TechId.SignalRelay;
        }
        // Then StarCharts
        if (avail.includes(TechId.StarCharts)) {
            aiInfo(`[AI Tech] ${profile.civName} HYBRID: StarCharts (backup victory path)`);
            return TechId.StarCharts;
        }
    }

    // PRIORITY 2: If chain tech not available, pick standard progression by era
    // This ensures we don't stall waiting for prereqs
    const byEra = {
        Hearth: avail.filter(t => TECHS[t].era === "Hearth"),
        Banner: avail.filter(t => TECHS[t].era === "Banner"),
        Engine: avail.filter(t => TECHS[t].era === "Engine"),
        Aether: avail.filter(t => TECHS[t].era === "Aether"),
    };

    // Phase-appropriate fallback
    let fallback: TechId | null = null;
    if (phase === "Expand") {
        // Hearth priority: ScriptLore (science), FormationTraining (military), StoneworkHalls (production)
        fallback = byEra.Hearth.find(t => t === TechId.ScriptLore)
            ?? byEra.Hearth.find(t => t === TechId.FormationTraining)
            ?? byEra.Hearth[0];
    } else if (phase === "Develop") {
        // Banner/Engine priority
        fallback = byEra.Banner[0] ?? byEra.Engine[0] ?? byEra.Hearth[0];
    } else {
        // Execute phase: Aether for military punch
        if (goal === "Conquest") {
            fallback = byEra.Aether.find(t => t === TechId.CompositeArmor)
                ?? byEra.Aether.find(t => t === TechId.Aerodynamics)
                ?? byEra.Aether[0]
                ?? byEra.Engine[0];
        } else {
            fallback = byEra.Aether.find(t => t === TechId.PlasmaShields)
                ?? byEra.Aether.find(t => t === TechId.ZeroPointEnergy)
                ?? byEra.Aether[0]
                ?? byEra.Engine[0];
        }
    }

    if (fallback) {
        aiInfo(`[AI Tech] ${profile.civName} fallback (${phase}): ${fallback}`);
        return fallback;
    }

    // Last resort: cheapest available
    const cheapest = avail.sort((a, b) => TECHS[a].cost - TECHS[b].cost)[0];
    aiInfo(`[AI Tech] ${profile.civName} cheapest fallback: ${cheapest}`);
    return cheapest ?? null;
}
