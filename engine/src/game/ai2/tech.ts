/**
 * tech.ts - Goal-Driven Tech Selection (Utility-Based)
 *
 * Utility scoring replaces the previous hard-coded priority ladder.
 * Each tech candidate is scored 0..1 with a breakdown for debugging.
 */

import { TECHS, ENABLE_AETHER_ERA } from "../../core/constants.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { AiVictoryGoal, GameState, TechId } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { getGoalRequirements, getNextTechInChain, getGamePhase } from "./strategic-plan.js";
import { evaluateBestVictoryPath } from "../ai/victory-evaluator.js";
import { clamp01, pickBest } from "./util.js";

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
// UTILITY SCORING
// =============================================================================

type TechScoreBreakdown = {
    total: number;
    components: Record<string, number>;
    notes?: string[];
};

type TechCandidateScore = {
    techId: TechId;
    score: number;
    breakdown: TechScoreBreakdown;
};

const PROGRESS_CHAIN: TechId[] = [
    TechId.ScriptLore,
    TechId.ScholarCourts,
    TechId.SignalRelay,
    TechId.StarCharts,
];

const SIEGE_FOCUSED_CIVS = new Set([
    "ForgeClans",
    "RiverLeague",
    "JadeCovenant",
    "AetherianVanguard",
]);

const TECH_SCORE_WEIGHTS: Record<string, number> = {
    goalChain: 0.45,
    progressPivot: 0.18,
    siegeUnlock: 0.12,
    pathAffinity: 0.08,
    profileWeight: 0.07,
    phaseFit: 0.06,
    cost: 0.04,
};

function phaseFitScore(techId: TechId, phase: ReturnType<typeof getGamePhase>, goal: AiVictoryGoal): number {
    const era = TECHS[techId].era;
    if (phase === "Expand") {
        if (era === "Hearth") return 1;
        if (era === "Banner") return 0.4;
        if (era === "Engine") return 0.2;
        return 0.1;
    }
    if (phase === "Develop") {
        if (era === "Banner") return 1;
        if (era === "Engine") return 0.8;
        if (era === "Hearth") return 0.3;
        return 0.3;
    }
    // Execute phase
    if (goal === "Conquest") {
        if (era === "Aether") return 1;
        if (era === "Engine") return 0.8;
        if (era === "Banner") return 0.5;
        return 0.2;
    }
    if (era === "Aether") return 0.9;
    if (era === "Engine") return 0.8;
    if (era === "Banner") return 0.6;
    return 0.3;
}

function computeCostScore(techId: TechId, minCost: number, maxCost: number): number {
    if (maxCost <= minCost) return 0.5;
    const cost = TECHS[techId].cost;
    return clamp01(1 - (cost - minCost) / (maxCost - minCost));
}

function nextInPath(playerTechs: TechId[], path: TechId[]): TechId | null {
    for (const tech of path) {
        if (!playerTechs.includes(tech)) return tech;
    }
    return null;
}

function pathAffinityScore(techId: TechId, playerTechs: TechId[], path: TechId[]): number {
    if (path.length === 0) return 0;
    const next = nextInPath(playerTechs, path);
    if (next && techId === next) return 1;
    if (path.includes(techId)) return 0.5;
    return 0;
}

type ProgressPivot = {
    score: number;
    milestone?: string;
    turnsToProgress?: number;
    turnsToConquest?: number;
};

function computeProgressPivotScore(state: GameState, playerId: string, playerTechs: TechId[]): ProgressPivot {
    const hasStarCharts = playerTechs.includes(TechId.StarCharts);
    if (hasStarCharts) return { score: 0 };

    const hasDrilledRanks = playerTechs.includes(TechId.DrilledRanks);
    const hasArmyDoctrine = playerTechs.includes(TechId.ArmyDoctrine);
    const hasCompositeArmor = playerTechs.includes(TechId.CompositeArmor);

    const atMilestone = hasDrilledRanks || hasArmyDoctrine || hasCompositeArmor;
    if (!atMilestone) return { score: 0 };

    const victoryEval = evaluateBestVictoryPath(state, playerId);
    const range = hasCompositeArmor ? 50 : 40;
    const delta = victoryEval.turnsToProgress - victoryEval.turnsToConquest;
    const score = clamp01((range - delta) / range);
    const milestone = hasCompositeArmor ? "CompositeArmor" : hasArmyDoctrine ? "ArmyDoctrine" : "DrilledRanks";

    return {
        score,
        milestone,
        turnsToProgress: victoryEval.turnsToProgress,
        turnsToConquest: victoryEval.turnsToConquest,
    };
}

function formatTechScoreBreakdown(breakdown: TechScoreBreakdown): string {
    const parts = Object.entries(breakdown.components)
        .filter(([, value]) => Math.abs(value) >= 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([key, value]) => `${key}:${value.toFixed(2)}`);
    if (breakdown.notes && breakdown.notes.length > 0) {
        parts.push(`notes:${breakdown.notes.join("|")}`);
    }
    return parts.join(", ");
}

function scoreTechCandidate(input: {
    techId: TechId;
    playerTechs: TechId[];
    chainTech?: TechId | null;
    goalPath: TechId[];
    phase: ReturnType<typeof getGamePhase>;
    goal: AiVictoryGoal;
    profileWeight: number;
    progressPivotScore: number;
    siegeUnlockActive: boolean;
    minCost: number;
    maxCost: number;
}): TechCandidateScore {
    const {
        techId,
        playerTechs,
        chainTech,
        goalPath,
        phase,
        goal,
        profileWeight,
        progressPivotScore,
        siegeUnlockActive,
        minCost,
        maxCost,
    } = input;

    const components: Record<string, number> = {
        goalChain: chainTech && techId === chainTech ? 1 : 0,
        progressPivot: progressPivotScore > 0 && PROGRESS_CHAIN.includes(techId) ? progressPivotScore : 0,
        siegeUnlock: siegeUnlockActive && techId === TechId.FormationTraining ? 1 : 0,
        pathAffinity: pathAffinityScore(techId, playerTechs, goalPath),
        profileWeight: clamp01(profileWeight / 2),
        phaseFit: phaseFitScore(techId, phase, goal),
        cost: computeCostScore(techId, minCost, maxCost),
    };

    const notes: string[] = [];
    if (components.goalChain > 0) notes.push("goal-chain");
    if (components.progressPivot > 0) notes.push("progress-pivot");
    if (components.siegeUnlock > 0) notes.push("siege-unlock");
    if (components.pathAffinity >= 1) notes.push("goal-path-next");

    let weightedSum = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(TECH_SCORE_WEIGHTS)) {
        totalWeight += weight;
        weightedSum += (components[key] ?? 0) * weight;
    }

    const total = totalWeight > 0 ? clamp01(weightedSum / totalWeight) : 0;

    return {
        techId,
        score: total,
        breakdown: {
            total,
            components,
            notes: notes.length ? notes : undefined,
        },
    };
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

    const numCities = state.cities.filter(c => c.ownerId === playerId).length;
    const requirements = getGoalRequirements(goal, profile.civName, phase, numCities);
    const chainTech = getNextTechInChain(player.techs, requirements.techTarget);

    const goalPath = profile.tech.pathsByGoal?.[goal] ?? [];
    const pivot = computeProgressPivotScore(state, playerId, player.techs);

    const siegeUnlockActive =
        SIEGE_FOCUSED_CIVS.has(profile.civName) && !player.techs.includes(TechId.FormationTraining);

    const costs = avail.map(t => TECHS[t].cost);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);

    const candidates = avail.map(techId =>
        scoreTechCandidate({
            techId,
            playerTechs: player.techs,
            chainTech,
            goalPath,
            phase,
            goal,
            profileWeight: profile.tech.weights[techId] ?? 0,
            progressPivotScore: pivot.score,
            siegeUnlockActive,
            minCost,
            maxCost,
        })
    );

    const best = pickBest(candidates, c => c.score);
    if (!best) return null;

    if (isAiDebugEnabled()) {
        const breakdown = formatTechScoreBreakdown(best.item.breakdown);
        const pivotNote = pivot.score > 0 && pivot.milestone
            ? ` pivotScore=${pivot.score.toFixed(2)} (${pivot.milestone}) ${pivot.turnsToProgress}/${pivot.turnsToConquest}`
            : "";
        aiInfo(`[AI Tech] ${profile.civName} pick ${best.item.techId} score=${best.item.score.toFixed(2)}${pivotNote} | ${breakdown}`);
    } else {
        aiInfo(`[AI Tech] ${profile.civName} pick ${best.item.techId}`);
    }

    return best.item.techId;
}
