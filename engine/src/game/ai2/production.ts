/**
 * production.ts - Goal-Driven Production Selection (Utility-Based)
 *
 * Utility scoring replaces the previous priority ladder.
 * Each candidate scores 0..1 with a breakdown for debug inspection.
 */

import { canBuild } from "../rules.js";
import { AiVictoryGoal, City, GameState, ProjectId, TechId } from "../../core/types.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { isWarEmergency } from "./production/emergency.js";
import { resolveInterleave, shouldPrioritizeDefense } from "./production/defense-priority.js";
import { clamp, pickBest } from "./util.js";
import { type EconomySnapshot } from "./economy/budget.js";
import { buildFallbackMixPlan, pickFallbackDefaultUnit, pickFallbackUnit } from "./production/fallback.js";
import {
    addProductionCandidate,
    formatProductionBreakdown,
    PRODUCTION_BASE_SCORES,
    type ProductionCandidate as GenericProductionCandidate
} from "./production/scoring.js";
import { computeExpansionNeed, computeGapSeverity, getInfluenceRatio } from "./production/metrics.js";
import {
    addPrimaryProductionCandidates,
} from "./production/candidate-groups.js";
import { buildProductionContext, type ProductionContext } from "./production/context.js";
import {
    PRODUCTION_INFLUENCE_MOD_WEIGHTS,
    PRODUCTION_MOD_WEIGHTS,
    PRODUCTION_THREAT_INTENSITY,
    THEATER_OBJECTIVE_BIAS
} from "./production/constants.js";

export { shouldPrioritizeDefense } from "./production/defense-priority.js";

export type BuildOption = { type: "Unit" | "Building" | "Project"; id: string; markAsHomeDefender?: boolean };
export type { ProductionContext } from "./production/context.js";

// =============================================================================
// UTILITY SCORING
// =============================================================================

type ProductionCandidate = GenericProductionCandidate<BuildOption>;

function addCandidate(
    candidates: ProductionCandidate[],
    input: {
        option: BuildOption | null;
        reason: string;
        base: number;
        components?: Record<string, number>;
        notes?: string[];
    }
): void {
    addProductionCandidate(candidates, input);
}

function addFallbackCandidates(
    candidates: ProductionCandidate[],
    state: GameState,
    city: City,
    context: ProductionContext
): void {
    const fallbackMixPlan = buildFallbackMixPlan(context.myUnits);
    const { baseline, deficitNote, entries } = fallbackMixPlan;

    let added = false;
    for (const entry of entries) {
        const unit = pickFallbackUnit(entry.kind, context.unlockedUnits);
        if (!unit || !canBuild(city, "Unit", unit, state)) continue;
        const mixScore = clamp(-1, entry.deficit / baseline, 1);
        addCandidate(candidates, {
            option: { type: "Unit", id: unit },
            reason: `fallback-${entry.kind}`,
            base: PRODUCTION_BASE_SCORES.fallbackMix,
            components: { mix: mixScore * PRODUCTION_MOD_WEIGHTS.composition },
            notes: [`deficits:${deficitNote}`],
        });
        added = true;
    }

    if (added) return;

    const fallbackUnit = pickFallbackDefaultUnit(context.unlockedUnits);
    if (canBuild(city, "Unit", fallbackUnit, state)) {
        addCandidate(candidates, {
            option: { type: "Unit", id: fallbackUnit },
            reason: "fallback-default",
            base: PRODUCTION_BASE_SCORES.fallbackDefault,
            notes: [`deficits:${deficitNote}`],
        });
    }
}

// =============================================================================
// MAIN PRODUCTION SELECTION
// =============================================================================

export function chooseCityBuildV2(
    state: GameState,
    playerId: string,
    city: City,
    goal: AiVictoryGoal,
    sharedEconomySnapshot?: EconomySnapshot
): BuildOption | null {
    if (city.currentBuild) return null;

    const context = buildProductionContext(state, playerId, city, goal, sharedEconomySnapshot);
    if (!context) return null;
    const {
        player,
        profile,
        phase,
        myCities,
        atWar,
        economy,
    } = context;

    const warEmergency = isWarEmergency(state, playerId, atWar);
    const supplyGap = economy.usedSupply - economy.freeSupply;
    const supplyNearCap = economy.usedSupply >= (economy.freeSupply - 1);
    const severeSupplyPressure = supplyGap >= 2;
    const strainedWithDeficitPressure = economy.economyState === "Strained"
        && (economy.netGold < 0 || economy.treasury < economy.reserveFloor);
    const isEconomyRecoveryState = economy.economyState === "Crisis"
        || strainedWithDeficitPressure
        || severeSupplyPressure;
    const isCrisis = economy.economyState === "Crisis";

    // v7.2: PROGRESS BYPASS - If we have StarCharts and NO city is building Progress,
    // skip defense for this city so it can build Progress projects.
    const hasStarChartsForBypass = player.techs.includes(TechId.StarCharts);
    const anyBuildingProgressForBypass = myCities.some(c =>
        c.currentBuild?.type === "Project" &&
        [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment].includes(c.currentBuild.id as ProjectId)
    );
    const progressBypassing = hasStarChartsForBypass && !anyBuildingProgressForBypass;

    const defenseDecision = shouldPrioritizeDefense(state, city, playerId, phase, context.perception.isCoordVisible);
    const cityIndex = myCities.findIndex(c => c.id === city.id);
    const shouldBuildDefender = !progressBypassing && (
        defenseDecision === "defend" ||
        (defenseDecision === "interleave" && resolveInterleave(state, playerId, cityIndex))
    );

    const threatIntensity = PRODUCTION_THREAT_INTENSITY[context.thisCityThreat] ?? 0;
    const threatMod = threatIntensity * PRODUCTION_MOD_WEIGHTS.threat;
    const safetyMod = (1 - threatIntensity) * PRODUCTION_MOD_WEIGHTS.safety;
    const gapMod = computeGapSeverity(context.gaps, context.myCities.length) * PRODUCTION_MOD_WEIGHTS.gap;
    const expansionMod = computeExpansionNeed(context.profile.build?.desiredCities ?? 0, context.myCities.length) * PRODUCTION_MOD_WEIGHTS.expansion;

    const theaterObjective = context.primaryTheater?.objective;
    const theaterBias = theaterObjective ? THEATER_OBJECTIVE_BIAS[theaterObjective] : 0;

    const frontRatio = getInfluenceRatio(context.influence?.front, city.coord);
    const borderRatio = getInfluenceRatio(context.influence?.border, city.coord);
    const pressureRatio = getInfluenceRatio(context.influence?.pressure, city.coord);
    const frontMod = (frontRatio * PRODUCTION_INFLUENCE_MOD_WEIGHTS.front)
        + (borderRatio * PRODUCTION_INFLUENCE_MOD_WEIGHTS.border);
    const pressureMod = pressureRatio * PRODUCTION_INFLUENCE_MOD_WEIGHTS.pressure;

    const candidates: ProductionCandidate[] = [];
    addPrimaryProductionCandidates({
        addCandidate: (input) => addCandidate(candidates, input),
        state,
        playerId,
        city,
        goal,
        context,
        profile,
        myCities,
        economy,
        warEmergency,
        isEconomyRecoveryState,
        isCrisis,
        defenseDecision,
        shouldBuildDefender,
        theaterBias,
        threatMod,
        frontMod,
        pressureMod,
        safetyMod,
        expansionMod,
        gapMod,
        supplyGap,
        supplyNearCap,
    });

    addFallbackCandidates(candidates, state, city, context);

    const best = pickBest(candidates, candidate => candidate.score);
    if (!best) return null;

    if (isAiDebugEnabled()) {
        const breakdown = formatProductionBreakdown(best.item.breakdown);
        const breakdownText = breakdown.length ? ` | ${breakdown}` : "";
        aiInfo(
            `[AI Build] ${profile.civName} PRODUCTION: ${best.item.reason} -> ${best.item.option.type}:${best.item.option.id}` +
            ` (${best.item.score.toFixed(2)})${breakdownText}`
        );
    }

    return best.item.option;
}
