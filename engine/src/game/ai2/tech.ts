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
import { evaluateBestVictoryPath } from "../ai/victory-evaluator.js";

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
    const numCities = state.cities.filter(c => c.ownerId === playerId).length;
    const requirements = getGoalRequirements(goal, profile.civName, phase, numCities);

    // PRIORITY 1: Follow the tech chain for our goal target
    const chainTech = getNextTechInChain(player.techs, requirements.techTarget);
    if (chainTech && avail.includes(chainTech)) {
        aiInfo(`[AI Tech] ${profile.civName} following ${requirements.techTarget} chain: ${chainTech}`);
        return chainTech;
    }

    // PRIORITY 1.05: v1.0.3 - Siege-focused civs should research TimberMills for Trebuchet
    // Note: Using explicit civ list because goal === "Conquest" is rarely true (default is "Balanced")
    // TODO: Cleaner approach would be a "playstyle" field on civ profiles
    const siegeFocusedCivs = ["ForgeClans", "RiverLeague", "JadeCovenant", "AetherianVanguard"];
    if (siegeFocusedCivs.includes(profile.civName) && !player.techs.includes(TechId.FormationTraining) && avail.includes(TechId.FormationTraining)) {
        aiInfo(`[AI Tech] ${profile.civName} SIEGE: FormationTraining (enables Trebuchet)`);
        return TechId.FormationTraining;
    }

    // =========================================================================
    // STRATEGIC DECISION POINTS - Evaluate Progress pivot at military milestones
    // =========================================================================
    // At each key military tech, evaluate if we should pivot to Progress.
    // These are the natural decision points in a Conquest strategy where
    // a civ should consider if Progress might now be faster.
    //
    // Decision Point 1: After DrilledRanks (unlocks Form Army)
    // Decision Point 2: After ArmyDoctrine (army boost)
    // Decision Point 3: After CompositeArmor (unlocks Landships)
    //
    // At each point: If Progress is faster, pivot to ScriptLore → ScholarCourts → SignalRelay → StarCharts
    // =========================================================================

    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    const hasSignalRelay = player.techs.includes(TechId.SignalRelay);
    const hasScholarCourts = player.techs.includes(TechId.ScholarCourts);
    const hasScriptLore = player.techs.includes(TechId.ScriptLore);

    // Check if we're at a strategic decision point (just got a key military tech)
    const hasDrilledRanks = player.techs.includes(TechId.DrilledRanks);
    const hasArmyDoctrine = player.techs.includes(TechId.ArmyDoctrine);
    const hasCompositeArmor = player.techs.includes(TechId.CompositeArmor);

    // At any military milestone, evaluate if we should pivot to Progress
    const atMilitaryMilestone = hasDrilledRanks || hasArmyDoctrine || hasCompositeArmor;

    if (!hasStarCharts && atMilitaryMilestone) {
        const victoryEval = evaluateBestVictoryPath(state, playerId);

        // Log the decision point
        const milestone = hasCompositeArmor ? "CompositeArmor" : hasArmyDoctrine ? "ArmyDoctrine" : "DrilledRanks";
        aiInfo(`[AI Tech] ${profile.civName} DECISION POINT at ${milestone}: Progress ${victoryEval.turnsToProgress} vs Conquest ${victoryEval.turnsToConquest}`);

        // STRATEGIC BIAS: At milestones, be more willing to pivot to Progress
        // Even if Conquest is "faster", diversifying to Progress is strategically wise
        // Pivot if:
        // 1. Progress is actually faster (progressFaster)
        // 2. Progress is within 40 turns of Conquest
        // 3. At CompositeArmor milestone and Progress is within 50 turns (last chance)
        const progressWithinRange = victoryEval.turnsToProgress <= victoryEval.turnsToConquest + 40;
        const lastChancePivot = hasCompositeArmor && victoryEval.turnsToProgress <= victoryEval.turnsToConquest + 50;
        const shouldPivot = victoryEval.progressFaster || progressWithinRange || lastChancePivot;

        if (shouldPivot) {
            const pivotReason = victoryEval.progressFaster ? "Progress faster" :
                lastChancePivot ? "LAST CHANCE backup" : "within range";
            // Pivot to Progress tech chain: ScriptLore → ScholarCourts → SignalRelay → StarCharts
            if (!hasScriptLore && avail.includes(TechId.ScriptLore)) {
                aiInfo(`[AI Tech] ${profile.civName} PIVOT: ScriptLore (${pivotReason} at ${milestone})`);
                return TechId.ScriptLore;
            }
            if (!hasScholarCourts && avail.includes(TechId.ScholarCourts)) {
                aiInfo(`[AI Tech] ${profile.civName} PIVOT: ScholarCourts (${pivotReason} at ${milestone})`);
                return TechId.ScholarCourts;
            }
            if (!hasSignalRelay && avail.includes(TechId.SignalRelay)) {
                aiInfo(`[AI Tech] ${profile.civName} PIVOT: SignalRelay (${pivotReason} at ${milestone})`);
                return TechId.SignalRelay;
            }
            if (avail.includes(TechId.StarCharts)) {
                aiInfo(`[AI Tech] ${profile.civName} PIVOT: StarCharts (${pivotReason} at ${milestone})`);
                return TechId.StarCharts;
            }
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
