import { canBuild } from "../../rules.js";
import { City, GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isDefensiveCiv } from "../../helpers/civ-helpers.js";
import { assessCityThreatLevel } from "../defense-situation/scoring.js";
import { buildPerception } from "../perception.js";
import { getAiProfileV2 } from "../rules.js";
import { getAiMemoryV2 } from "../memory.js";
import { getReinforcedRequiredNear, getSiegeFailureCount } from "../siege-wave.js";
import { hexDistance } from "../../../core/hex.js";
import { canCaptureCities, isCombatUnitType } from "../schema.js";
import type { BuildOption, ProductionContext } from "../production.js";
import type { OperationalTheater } from "../memory.js";

/**
 * Staging selector: builds offensive units before war declaration to meet force concentration thresholds.
 * Returns a BuildOption when staging should occur, otherwise null.
 */
function selectTheaterFocusCity(state: GameState, memory: ReturnType<typeof getAiMemoryV2>): City | null {
    const theaters = memory.operationalTheaters ?? [];
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    if (!theaterFresh || theaters.length === 0) return null;

    const top = theaters[0] as OperationalTheater;
    if (!top?.targetCityId) return null;
    const targetCity = state.cities.find(c => c.id === top.targetCityId);
    return targetCity ?? null;
}

export function pickWarStagingProduction(
    state: GameState,
    playerId: string,
    city: City,
    context?: ProductionContext
): BuildOption | null {
    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const perception = context?.perception ?? buildPerception(state, playerId);
    const hasFocusTarget = !!memory.focusTargetPlayerId;
    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : null;
    const theaterCity = selectTheaterFocusCity(state, memory);
    const effectiveFocusCity = focusCity ?? theaterCity;
    const visibleFocusCity = effectiveFocusCity && (!perception.visibilityKnown || perception.isCoordVisible(effectiveFocusCity.coord))
        ? effectiveFocusCity
        : null;

    if (context?.influence?.front && context.influence.front.max > 0) {
        const frontRatio = context.influence.front.get(city.coord) / context.influence.front.max;
        if (frontRatio < 0.15) {
            return null;
        }
    }

    const focusTargetId = memory.focusTargetPlayerId ?? effectiveFocusCity?.ownerId;
    const isAlreadyAtWar = focusTargetId
        ? state.diplomacy?.[playerId]?.[focusTargetId] === "War"
        : false;

    const canStageOnTarget = !perception.visibilityKnown || !!visibleFocusCity;
    const isStagingBase = (hasFocusTarget || !!visibleFocusCity) && canStageOnTarget;

    const isAggressiveCiv = !isDefensiveCiv(profile.civName);
    const defensiveCivStagingChance = 0.30; // 30% chance defensive civs build for staging
    const stagingRoll = ((state.turn * 17 + city.id.charCodeAt(0) * 7) % 100) / 100;

    const thisCityThreat = context?.thisCityThreat ?? assessCityThreatLevel(state, city, playerId, 5, 2, perception.isCoordVisible);
    const cityNotThreatened = thisCityThreat === "none" || thisCityThreat === "probe";

    if (!isStagingBase || !visibleFocusCity || !cityNotThreatened) return null;

    const stageDistMax = 6;
    const nearCount = state.units.filter(u =>
        u.ownerId === playerId &&
        isCombatUnitType(u.type) &&
        hexDistance(u.coord, visibleFocusCity.coord) <= stageDistMax
    ).length;

    const stagingProfile = getAiProfileV2(state, playerId);
    const baseRequired = Math.max(4, Math.ceil(stagingProfile.tactics.forceConcentration * 5));
    const failureCount = getSiegeFailureCount(memory, visibleFocusCity.id);
    const requiredNear = getReinforcedRequiredNear(baseRequired, failureCount);
    const needsReinforcement = isAlreadyAtWar && failureCount > 0 && nearCount < requiredNear;
    const isStaging = isStagingBase && (!isAlreadyAtWar || needsReinforcement);
    const shouldStageForWar = needsReinforcement || isAggressiveCiv || (stagingRoll < defensiveCivStagingChance);

    if (!isStaging || !shouldStageForWar) return null;

    const capturersNear = state.units.filter(u =>
        u.ownerId === playerId &&
        canCaptureCities(u.type) &&
        hexDistance(u.coord, visibleFocusCity.coord) <= stageDistMax
    ).length;

    if (nearCount >= requiredNear && capturersNear >= 1) return null;

    aiInfo(`[AI Build] ${profile.civName} WAR STAGING: Building offensive units (${nearCount}/${requiredNear} near target, ${capturersNear} capturers)`);
    // PRIORITY 1: Ensure at least 1 capturer
    if (capturersNear < 1) {
        if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
            return { type: "Unit", id: UnitType.ArmySpearGuard };
        }
        if (canBuild(city, "Unit", UnitType.ArmyRiders, state)) {
            return { type: "Unit", id: UnitType.ArmyRiders };
        }
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            return { type: "Unit", id: UnitType.SpearGuard };
        }
        if (canBuild(city, "Unit", UnitType.Riders, state)) {
            return { type: "Unit", id: UnitType.Riders };
        }
    }

    // PRIORITY 2: Enforce army composition - Riders for flanking/mobility
    // Goal: ~1 rider per 3 spears. Build riders if we have 3+ spears but 0 riders.
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const spearCount = myUnits.filter(u =>
        u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard
    ).length;
    const riderCount = myUnits.filter(u =>
        u.type === UnitType.Riders || u.type === UnitType.ArmyRiders
    ).length;

    // Aggressive civs want more riders (2:2:1.5 ratio vs 3:2:1)
    const riderThreshold = isAggressiveCiv ? 2 : 3;
    const needsRiders = riderCount === 0 && spearCount >= riderThreshold;

    if (needsRiders) {
        if (canBuild(city, "Unit", UnitType.ArmyRiders, state)) {
            aiInfo(`[AI Build] ${profile.civName} WAR STAGING: ArmyRiders for flanking (${riderCount} riders, ${spearCount} spears)`);
            return { type: "Unit", id: UnitType.ArmyRiders };
        }
        if (canBuild(city, "Unit", UnitType.Riders, state)) {
            aiInfo(`[AI Build] ${profile.civName} WAR STAGING: Riders for flanking (${riderCount} riders, ${spearCount} spears)`);
            return { type: "Unit", id: UnitType.Riders };
        }
    }

    // PRIORITY 3: Ranged support (BowGuard)
    if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
        return { type: "Unit", id: UnitType.ArmyBowGuard };
    }
    if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
        return { type: "Unit", id: UnitType.BowGuard };
    }

    const trebuchetsNear = state.units.filter(u =>
        u.ownerId === playerId &&
        u.type === UnitType.Trebuchet &&
        hexDistance(u.coord, visibleFocusCity.coord) <= stageDistMax
    ).length;
    const trebuchetsTotal = state.units.filter(u =>
        u.ownerId === playerId && u.type === UnitType.Trebuchet
    ).length;
    const militaryCount = state.units.filter(u =>
        u.ownerId === playerId &&
        isCombatUnitType(u.type)
    ).length;
    const trebuchetCap = Math.min(4, Math.max(2, Math.floor(militaryCount / 4)));
    if (trebuchetsNear < 1 && trebuchetsTotal < trebuchetCap) {
        if (canBuild(city, "Unit", UnitType.Trebuchet, state)) {
            aiInfo(`[AI Build] ${profile.civName} WAR STAGING: Trebuchet for siege (${trebuchetsTotal}/${trebuchetCap})`);
            return { type: "Unit", id: UnitType.Trebuchet };
        }
    }

    if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
        return { type: "Unit", id: UnitType.ArmySpearGuard };
    }
    if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
        return { type: "Unit", id: UnitType.SpearGuard };
    }

    return null;
}
