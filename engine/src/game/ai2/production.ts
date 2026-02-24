/**
 * production.ts - Goal-Driven Production Selection (Utility-Based)
 *
 * Utility scoring replaces the previous priority ladder.
 * Each candidate scores 0..1 with a breakdown for debug inspection.
 */

import { canBuild } from "../rules.js";
import { AiVictoryGoal, City, DiplomacyState, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { getAiMemoryV2, type OperationalTheater } from "./memory.js";
import { buildPerception, type AiPerception } from "./perception.js";
import { getInfluenceMapsCached, type InfluenceMaps } from "./influence-map.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { isCombatUnitType } from "./schema.js";
import {
    assessCapabilities,
    findCapabilityGaps,
    getGoalRequirements,
    getBestUnitForRole,
    getGamePhase
} from "./strategic-plan.js";
import {
    isWarEmergency,
    pickCityUnderAttackBuild,
    pickGarrisonReplenishmentBuild,
    pickWarEmergencyBuild
} from "./production/emergency.js";
import { pickCapabilityGapBuild } from "./production/capability-gaps.js";
import { pickVictoryProject } from "./production/victory.js";
import { pickEconomyBuilding } from "./production/economy.js";
import {
    pickAetherianVanguardBuild,
    pickDefensiveArmyBuild,
    pickDefensiveEarlyMilitaryBuild,
    pickDefensiveLorekeeperBuild,
    pickRiverLeagueEarlyBoost
} from "./production/civ-builds.js";
import { resolveInterleave, shouldPrioritizeDefense } from "./production/defense-priority.js";
import { pickTechUnlockBuild } from "./production/tech-unlocks.js";
import { getUnlockedUnits } from "./production/unlocks.js";
import { pickPhaseDefensePriorityBuild, pickPhaseDefenseSupportBuild } from "./production/phases/defense.js";
import { pickPhaseEarlyExpansionBuild, pickPhaseExpansionBuild } from "./production/phases/expansion.js";
import { assessCityThreatLevel } from "./defense-situation/scoring.js";
import { pickProactiveReinforcementBuild } from "./production/proactive.js";
import { pickWarStagingProduction } from "./production/staging.js";
import { pickTrebuchetProduction } from "./production/war.js";
import { clamp, clamp01, pickBest } from "./util.js";
import { computeEconomySnapshot, type EconomySnapshot } from "./economy/budget.js";

export { shouldPrioritizeDefense } from "./production/defense-priority.js";

export type BuildOption = { type: "Unit" | "Building" | "Project"; id: string; markAsHomeDefender?: boolean };

// =============================================================================
// CONTEXT
// =============================================================================

export type ProductionContext = {
    player: GameState["players"][number];
    profile: ReturnType<typeof getAiProfileV2>;
    memory: ReturnType<typeof getAiMemoryV2>;
    perception: AiPerception;
    influence?: InfluenceMaps;
    primaryTheater?: OperationalTheater;
    phase: ReturnType<typeof getGamePhase>;
    myCities: City[];
    myUnits: GameState["units"];
    myMilitaryUnits: GameState["units"];
    unlockedUnits: ReturnType<typeof getUnlockedUnits>;
    capabilities: ReturnType<typeof assessCapabilities>;
    gaps: ReturnType<typeof findCapabilityGaps>;
    warEnemies: GameState["players"];
    warEnemyIds: Set<string>;
    aliveEnemyIds: Set<string>;
    atWar: boolean;
    thisCityThreat: ReturnType<typeof assessCityThreatLevel>;
    economy: EconomySnapshot;
};

function buildProductionContext(
    state: GameState,
    playerId: string,
    city: City,
    goal: AiVictoryGoal,
    sharedEconomySnapshot?: EconomySnapshot
): ProductionContext | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    const memory = getAiMemoryV2(state, playerId);
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    const primaryTheater = theaterFresh ? memory.operationalTheaters?.[0] : undefined;

    const profile = getAiProfileV2(state, playerId);
    const economy = sharedEconomySnapshot ?? computeEconomySnapshot(state, playerId);
    const perception = buildPerception(state, playerId);
    const influence = state.map?.tiles
        ? (getInfluenceMapsCached(state, playerId, { budget: 600 }).maps ?? undefined)
        : undefined;
    const phase = getGamePhase(state);
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const myMilitaryUnits = myUnits.filter(u => isCombatUnitType(u.type));
    const unlockedUnits = getUnlockedUnits(player.techs);
    const requirements = getGoalRequirements(goal, profile.civName, phase, myCities.length);
    const capabilities = assessCapabilities(state, playerId);
    const gaps = findCapabilityGaps(capabilities, requirements);

    const warEnemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
    const warEnemyIds = new Set(warEnemies.map(p => p.id));
    const aliveEnemyIds = new Set(
        state.players.filter(p => p.id !== playerId && !p.isEliminated).map(p => p.id)
    );
    const atWar = warEnemies.length > 0;
    const thisCityThreat = assessCityThreatLevel(state, city, playerId, 5, 2, perception.isCoordVisible);

    return {
        player,
        profile,
        memory,
        perception,
        influence,
        primaryTheater,
        phase,
        myCities,
        myUnits,
        myMilitaryUnits,
        unlockedUnits,
        capabilities,
        gaps,
        warEnemies,
        warEnemyIds,
        aliveEnemyIds,
        atWar,
        thisCityThreat,
        economy,
    };
}

// =============================================================================
// UTILITY SCORING
// =============================================================================

type ProductionScoreBreakdown = {
    total: number;
    components: Record<string, number>;
    notes?: string[];
};

type ProductionCandidate = {
    option: BuildOption;
    score: number;
    reason: string;
    breakdown: ProductionScoreBreakdown;
};

const PRODUCTION_BASE_SCORES = {
    cityUnderAttack: 1.0,
    warStaging: 0.96,
    warTrebuchet: 0.93,
    warGarrison: 0.90,
    warEmergency: 0.88,
    aetherianRush: 0.86,
    victoryProject: 0.84,
    defensePriority: 0.80,
    riverLeagueBoost: 0.78,
    defensiveEarly: 0.76,
    earlyExpansion: 0.74,
    defensiveLorekeeper: 0.72,
    defensiveArmy: 0.70,
    techUnlock: 0.66,
    proactiveReinforcement: 0.64,
    defenseSupport: 0.62,
    capabilityGap: 0.60,
    expansion: 0.58,
    economy: 0.54,
    fallbackMix: 0.50,
    fallbackDefault: 0.46,
};

const THREAT_MOD_WEIGHT = 0.01;
const SAFETY_MOD_WEIGHT = 0.01;
const GAP_MOD_WEIGHT = 0.01;
const EXPANSION_MOD_WEIGHT = 0.01;
const COMPOSITION_MOD_WEIGHT = 0.04;

type ThreatLevel = ReturnType<typeof assessCityThreatLevel>;
const THREAT_INTENSITY: Record<ThreatLevel, number> = {
    none: 0,
    probe: 0.25,
    raid: 0.6,
    assault: 1,
};

function formatProductionBreakdown(breakdown: ProductionScoreBreakdown): string {
    const parts = Object.entries(breakdown.components)
        .filter(([, value]) => Math.abs(value) >= 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([key, value]) => `${key}:${value.toFixed(2)}`);
    if (breakdown.notes && breakdown.notes.length > 0) {
        parts.push(`notes:${breakdown.notes.join("|")}`);
    }
    return parts.join(", ");
}

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
    if (!input.option) return;
    const components = { base: input.base, ...(input.components ?? {}) };
    const total = clamp01(Object.values(components).reduce((sum, value) => sum + value, 0));
    candidates.push({
        option: input.option,
        score: total,
        reason: input.reason,
        breakdown: {
            total,
            components,
            notes: input.notes && input.notes.length > 0 ? input.notes : undefined,
        },
    });
}

function computeGapSeverity(context: ProductionContext): number {
    const gaps = context.gaps as Partial<ReturnType<typeof findCapabilityGaps>> | null | undefined;
    if (!gaps || typeof gaps.needSiege !== "number") return 0;
    const gapTotal =
        (gaps.needSiege ?? 0) +
        (gaps.needCapture ?? 0) +
        (gaps.needDefense ?? 0) +
        (gaps.needVision ?? 0) +
        (gaps.needGarrison ?? 0);
    const scale = Math.max(1, context.myCities.length + 2);
    return clamp01(gapTotal / scale);
}

function computeExpansionNeed(context: ProductionContext): number {
    const desired = context.profile.build?.desiredCities ?? 0;
    if (desired <= 0) return 0;
    return clamp01((desired - context.myCities.length) / desired);
}

function getInfluenceRatio(layer: InfluenceMaps["threat"] | undefined, coord: { q: number; r: number }): number {
    if (!layer || layer.max <= 0) return 0;
    return clamp01(layer.get(coord) / layer.max);
}

function pickFallbackUnit(kind: "rider" | "bow" | "spear", unlockedUnits: UnitType[]): UnitType | null {
    if (kind === "rider") {
        if (unlockedUnits.includes(UnitType.ArmyRiders)) return UnitType.ArmyRiders;
        if (unlockedUnits.includes(UnitType.Riders)) return UnitType.Riders;
        return null;
    }

    if (kind === "bow") {
        let unit = getBestUnitForRole("defense", unlockedUnits) ?? getBestUnitForRole("siege", unlockedUnits);
        if (unit && !String(unit).includes("Bow")) {
            if (unlockedUnits.includes(UnitType.ArmyBowGuard)) unit = UnitType.ArmyBowGuard;
            else if (unlockedUnits.includes(UnitType.BowGuard)) unit = UnitType.BowGuard;
        }
        return unit ?? null;
    }

    let unit = getBestUnitForRole("capture", unlockedUnits);
    if (unit && !String(unit).includes("Spear") && !String(unit).includes("Titan") && !String(unit).includes("Landship")) {
        if (unlockedUnits.includes(UnitType.ArmySpearGuard)) unit = UnitType.ArmySpearGuard;
        else if (unlockedUnits.includes(UnitType.SpearGuard)) unit = UnitType.SpearGuard;
    }
    return unit ?? null;
}

function addFallbackCandidates(
    candidates: ProductionCandidate[],
    state: GameState,
    city: City,
    context: ProductionContext
): void {
    const myMilitary = context.myUnits.filter(u => isCombatUnitType(u.type));

    const spearCount = myMilitary.filter(u => u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard).length;
    const bowCount = myMilitary.filter(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard).length;
    const riderCount = myMilitary.filter(u => u.type === UnitType.Riders || u.type === UnitType.ArmyRiders).length;
    const totalCount = spearCount + bowCount + riderCount;

    const baseline = Math.max(6, totalCount + 1);

    const targetSpear = Math.floor(baseline * (3 / 6));
    const targetBow = Math.floor(baseline * (2 / 6));
    const targetRider = Math.floor(baseline * (1 / 6));

    const spearDeficit = targetSpear - spearCount;
    const bowDeficit = targetBow - bowCount;
    const riderDeficit = targetRider - riderCount;

    const deficitNote = `S:${spearDeficit} B:${bowDeficit} R:${riderDeficit}`;

    const deficits = [
        { key: "rider", deficit: riderDeficit, order: 0 },
        { key: "bow", deficit: bowDeficit, order: 1 },
        { key: "spear", deficit: spearDeficit, order: 2 },
    ].sort((a, b) => b.deficit - a.deficit || a.order - b.order);

    let added = false;
    for (const entry of deficits) {
        const unit = pickFallbackUnit(entry.key as "rider" | "bow" | "spear", context.unlockedUnits);
        if (!unit || !canBuild(city, "Unit", unit, state)) continue;
        const mixScore = clamp(-1, entry.deficit / baseline, 1);
        addCandidate(candidates, {
            option: { type: "Unit", id: unit },
            reason: `fallback-${entry.key}`,
            base: PRODUCTION_BASE_SCORES.fallbackMix,
            components: { mix: mixScore * COMPOSITION_MOD_WEIGHT },
            notes: [`deficits:${deficitNote}`],
        });
        added = true;
    }

    if (added) return;

    const fallbackUnit = getBestUnitForRole("capture", context.unlockedUnits) ?? UnitType.SpearGuard;
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
    const hasSupplyPressure = supplyGap >= 1;
    const isEconomyRecoveryState = economy.economyState === "Strained"
        || economy.economyState === "Crisis"
        || hasSupplyPressure
        || (economy.atWar && supplyGap >= 0);
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

    const threatIntensity = THREAT_INTENSITY[context.thisCityThreat] ?? 0;
    const threatMod = threatIntensity * THREAT_MOD_WEIGHT;
    const safetyMod = (1 - threatIntensity) * SAFETY_MOD_WEIGHT;
    const gapMod = computeGapSeverity(context) * GAP_MOD_WEIGHT;
    const expansionMod = computeExpansionNeed(context) * EXPANSION_MOD_WEIGHT;

    const theaterObjective = context.primaryTheater?.objective;
    const theaterBias = theaterObjective === "deny-progress" ? 0.02
        : theaterObjective === "capture-capital" ? 0.015
        : theaterObjective === "pressure" ? 0.01
        : 0;

    const frontRatio = getInfluenceRatio(context.influence?.front, city.coord);
    const borderRatio = getInfluenceRatio(context.influence?.border, city.coord);
    const pressureRatio = getInfluenceRatio(context.influence?.pressure, city.coord);
    const frontMod = (frontRatio * 0.03) + (borderRatio * 0.02);
    const pressureMod = pressureRatio * 0.02;

    const candidates: ProductionCandidate[] = [];

    addCandidate(candidates, {
        option: pickCityUnderAttackBuild(state, city, context),
        reason: "city-under-attack",
        base: PRODUCTION_BASE_SCORES.cityUnderAttack,
        components: { threat: threatMod },
    });

    addCandidate(candidates, {
        option: pickWarStagingProduction(state, playerId, city, context),
        reason: "war-staging",
        base: PRODUCTION_BASE_SCORES.warStaging,
        components: { theater: theaterBias, front: frontMod, pressure: pressureMod },
    });

    addCandidate(candidates, {
        option: pickTrebuchetProduction(state, city, context),
        reason: "war-siege",
        base: PRODUCTION_BASE_SCORES.warTrebuchet,
        components: { theater: theaterBias * 0.8, front: frontMod * 0.6 },
    });

    addCandidate(candidates, {
        option: pickGarrisonReplenishmentBuild(state, city, context),
        reason: "war-garrison",
        base: PRODUCTION_BASE_SCORES.warGarrison,
        components: { threat: threatMod },
    });

    addCandidate(candidates, {
        option: pickWarEmergencyBuild(state, playerId, city, context),
        reason: "war-emergency",
        base: PRODUCTION_BASE_SCORES.warEmergency,
        components: { threat: threatMod },
    });

    addCandidate(candidates, {
        option: pickAetherianVanguardBuild(state, city, context),
        reason: "aetherian-titan",
        base: PRODUCTION_BASE_SCORES.aetherianRush,
    });

    if (!warEmergency && !isEconomyRecoveryState) {
        addCandidate(candidates, {
            option: pickVictoryProject(state, playerId, city, goal, profile, myCities),
            reason: "victory-project",
            base: PRODUCTION_BASE_SCORES.victoryProject,
            components: { progress: goal === "Progress" ? 0.01 : 0 },
        });
    }

    addCandidate(candidates, {
        option: pickPhaseDefensePriorityBuild(state, city, context, defenseDecision, shouldBuildDefender),
        reason: "defense-priority",
        base: PRODUCTION_BASE_SCORES.defensePriority,
        components: { threat: threatMod, pressure: pressureMod },
        notes: [`decision:${defenseDecision}`],
    });

    addCandidate(candidates, {
        option: pickRiverLeagueEarlyBoost(state, city, context),
        reason: "riverleague-boost",
        base: PRODUCTION_BASE_SCORES.riverLeagueBoost,
    });

    addCandidate(candidates, {
        option: pickDefensiveEarlyMilitaryBuild(state, city, context),
        reason: "defensive-early-military",
        base: PRODUCTION_BASE_SCORES.defensiveEarly,
        components: { threat: threatMod },
    });

    addCandidate(candidates, {
        option: pickPhaseEarlyExpansionBuild(state, playerId, city, context, defenseDecision),
        reason: "early-expansion",
        base: PRODUCTION_BASE_SCORES.earlyExpansion,
        components: {
            safety: safetyMod,
            expansion: expansionMod,
            recoveryPenalty: isEconomyRecoveryState ? -0.03 : 0,
            supplyPressurePenalty: supplyGap >= 2 ? -0.08 : supplyGap >= 1 ? -0.05 : (economy.atWar && supplyGap >= 0 ? -0.03 : 0),
        },
    });

    addCandidate(candidates, {
        option: pickDefensiveLorekeeperBuild(state, city, context),
        reason: "defensive-lorekeeper",
        base: PRODUCTION_BASE_SCORES.defensiveLorekeeper,
        components: { threat: threatMod },
    });

    if (!isEconomyRecoveryState) {
        addCandidate(candidates, {
            option: pickDefensiveArmyBuild(state, city, context),
            reason: "defensive-army",
            base: PRODUCTION_BASE_SCORES.defensiveArmy,
            components: { threat: threatMod },
        });
    }

    addCandidate(candidates, {
        option: pickTechUnlockBuild(state, city, context),
        reason: "tech-unlock",
        base: PRODUCTION_BASE_SCORES.techUnlock,
    });

    addCandidate(candidates, {
        option: pickProactiveReinforcementBuild(state, playerId, city, context),
        reason: "proactive-reinforcement",
        base: PRODUCTION_BASE_SCORES.proactiveReinforcement,
        components: { theater: theaterBias * 0.6, front: frontMod * 0.4 },
    });

    addCandidate(candidates, {
        option: pickPhaseDefenseSupportBuild(state, city, goal, context, defenseDecision),
        reason: "defense-support",
        base: PRODUCTION_BASE_SCORES.defenseSupport,
        components: { threat: threatMod, pressure: pressureMod * 0.7 },
    });

    addCandidate(candidates, {
        option: pickCapabilityGapBuild(state, city, context),
        reason: "capability-gap",
        base: PRODUCTION_BASE_SCORES.capabilityGap,
        components: { gap: gapMod },
    });

    addCandidate(candidates, {
        option: pickPhaseExpansionBuild(state, playerId, city, context, defenseDecision),
        reason: "expansion",
        base: PRODUCTION_BASE_SCORES.expansion,
        components: {
            safety: safetyMod,
            expansion: expansionMod,
            pressure: -pressureMod,
            recoveryPenalty: isEconomyRecoveryState ? -0.04 : 0,
            supplyPressurePenalty: supplyGap >= 2 ? -0.10 : supplyGap >= 1 ? -0.06 : (economy.atWar && supplyGap >= 0 ? -0.03 : 0),
        },
    });

    addCandidate(candidates, {
        option: pickEconomyBuilding(state, playerId, city, profile.civName, economy, profile.economy.goldBuildBias),
        reason: "economy",
        base: PRODUCTION_BASE_SCORES.economy,
        components: {
            safety: safetyMod,
            recoveryBoost: isCrisis ? 0.20 : (isEconomyRecoveryState ? 0.10 : 0),
            upkeepPressureBoost: economy.upkeepRatio > profile.economy.upkeepRatioLimit ? 0.10 : 0,
            militaryPressureBoost: supplyGap >= 3
                ? 0.20
                : supplyGap >= 1
                    ? 0.14
                    : (economy.atWar && supplyGap >= 0)
                        ? 0.08
                        : (supplyNearCap ? 0.04 : 0),
        },
        notes: [`economy:${economy.economyState}`],
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
