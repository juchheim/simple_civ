import { canBuild } from "../../rules.js";
import { City, GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isDefensiveCiv } from "../../helpers/civ-helpers.js";
import { assessCityThreatLevel } from "../defense-situation/scoring.js";
import { getAiProfileV2 } from "../rules.js";
import { getAiMemoryV2 } from "../memory.js";
import { hexDistance } from "../../../core/hex.js";
import { canCaptureCities, isCombatUnitType } from "../schema.js";
import type { BuildOption } from "../production.js";

/**
 * Staging selector: builds offensive units before war declaration to meet force concentration thresholds.
 * Returns a BuildOption when staging should occur, otherwise null.
 */
export function pickWarStagingProduction(state: GameState, playerId: string, city: City): BuildOption | null {
    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const hasFocusTarget = !!memory.focusTargetPlayerId;
    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : null;

    const isStaging = hasFocusTarget && !state.players.some(p =>
        p.id === memory.focusTargetPlayerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === "War"
    );

    const isAggressiveCiv = !isDefensiveCiv(profile.civName);
    const defensiveCivStagingChance = 0.30; // 30% chance defensive civs build for staging
    const stagingRoll = ((state.turn * 17 + city.id.charCodeAt(0) * 7) % 100) / 100;
    const shouldStageForWar = isAggressiveCiv || (stagingRoll < defensiveCivStagingChance);

    const thisCityThreat = assessCityThreatLevel(state, city, playerId);
    const cityNotThreatened = thisCityThreat === "none" || thisCityThreat === "probe";

    if (!isStaging || !focusCity || !shouldStageForWar || !cityNotThreatened) return null;

    const stageDistMax = 6;
    const nearCount = state.units.filter(u =>
        u.ownerId === playerId &&
        isCombatUnitType(u.type) &&
        hexDistance(u.coord, focusCity.coord) <= stageDistMax
    ).length;

    const stagingProfile = getAiProfileV2(state, playerId);
    const requiredNear = Math.max(4, Math.ceil(stagingProfile.tactics.forceConcentration * 5));

    const capturersNear = state.units.filter(u =>
        u.ownerId === playerId &&
        canCaptureCities(u.type) &&
        hexDistance(u.coord, focusCity.coord) <= stageDistMax
    ).length;

    if (nearCount >= requiredNear && capturersNear >= 1) return null;

    aiInfo(`[AI Build] ${profile.civName} WAR STAGING: Building offensive units (${nearCount}/${requiredNear} near target, ${capturersNear} capturers)`);

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

    if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
        return { type: "Unit", id: UnitType.ArmyBowGuard };
    }
    if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
        return { type: "Unit", id: UnitType.BowGuard };
    }

    const trebuchetsNear = state.units.filter(u =>
        u.ownerId === playerId &&
        u.type === UnitType.Trebuchet &&
        hexDistance(u.coord, focusCity.coord) <= stageDistMax
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
