import { City, GameState, UnitType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { canBuild } from "../../rules.js";
import { isDefensiveCiv } from "../../helpers/civ-helpers.js";
import { UNIT_ROLES } from "../capabilities.js";
import { cityHasGarrison } from "./analysis.js";
import type { BuildOption, ProductionContext } from "../production.js";

export function countMilitary(state: GameState, playerId: string): number {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        UNIT_ROLES[u.type] !== "civilian" &&
        UNIT_ROLES[u.type] !== "vision"
    ).length;
}

/**
 * Checks whether we are in a universal wartime emergency that should skip
 * victory projects and focus on rebuilding the army first.
 */
export function isWarEmergency(state: GameState, playerId: string, atWar: boolean, threshold = 5): boolean {
    if (!atWar) return false;
    return countMilitary(state, playerId) < threshold;
}

export function pickCityUnderAttackBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const enemyUnitsNearCity = state.units.filter(u =>
        context.warEnemyIds.has(u.ownerId) &&
        UNITS[u.type].domain !== "Civilian" &&
        u.type !== UnitType.Scout &&
        hexDistance(u.coord, city.coord) <= 2
    );
    if (enemyUnitsNearCity.length === 0) return null;

    aiInfo(`[AI Build] ${context.profile.civName} EMERGENCY: ${city.name} under attack by ${enemyUnitsNearCity.length} enemies!`);

    if (isDefensiveCiv(context.profile.civName) && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
        return { type: "Unit", id: UnitType.Lorekeeper };
    }

    const nearbyRanged = context.myUnits.filter(u =>
        (u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard || u.type === UnitType.Lorekeeper) &&
        hexDistance(u.coord, city.coord) <= 2
    ).length;
    const nearbyMelee = context.myUnits.filter(u =>
        (u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard) &&
        hexDistance(u.coord, city.coord) <= 2
    ).length;

    if (nearbyRanged <= nearbyMelee) {
        if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
            return { type: "Unit", id: UnitType.ArmyBowGuard };
        }
        if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
            return { type: "Unit", id: UnitType.BowGuard };
        }
    }

    if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
        return { type: "Unit", id: UnitType.ArmySpearGuard };
    }
    if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
        return { type: "Unit", id: UnitType.SpearGuard };
    }
    if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
        return { type: "Unit", id: UnitType.ArmyBowGuard };
    }
    if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
        return { type: "Unit", id: UnitType.BowGuard };
    }

    return null;
}

export function pickGarrisonReplenishmentBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const ourTitan = context.myUnits.find(u => u.type === UnitType.Titan);
    if (!ourTitan || cityHasGarrison(state, city)) return null;

    aiInfo(`[AI Build] ${context.profile.civName} GARRISON REPLENISHMENT: City ${city.name} is undefended (Titan escort pulled units)`);

    if (isDefensiveCiv(context.profile.civName) && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
        return { type: "Unit", id: UnitType.Lorekeeper };
    }

    const preferRanged = ((state.turn + city.id.charCodeAt(0)) % 2) === 0;

    if (preferRanged) {
        if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
            return { type: "Unit", id: UnitType.ArmyBowGuard };
        }
        if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
            return { type: "Unit", id: UnitType.BowGuard };
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

export function pickWarEmergencyBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const enemyTitan = state.units.find(u =>
        u.type === UnitType.Titan &&
        u.ownerId !== playerId &&
        state.diplomacy?.[playerId]?.[u.ownerId] === "War"
    );

    const TITAN_RESPONSE_MILITARY_THRESHOLD = 8;
    const myMilitary = countMilitary(state, playerId);

    if (enemyTitan && myMilitary < TITAN_RESPONSE_MILITARY_THRESHOLD) {
        aiInfo(`[AI Build] ${context.profile.civName} TITAN EMERGENCY: Enemy Titan detected! Military: ${myMilitary}/${TITAN_RESPONSE_MILITARY_THRESHOLD}`);

        if (canBuild(city, "Unit", UnitType.Landship, state)) {
            return { type: "Unit", id: UnitType.Landship };
        }
        const rangedOptions = [UnitType.ArmyBowGuard, UnitType.BowGuard];
        for (const unit of rangedOptions) {
            if (canBuild(city, "Unit", unit, state)) {
                return { type: "Unit", id: unit };
            }
        }
        const militaryOptions = [UnitType.ArmySpearGuard, UnitType.SpearGuard, UnitType.Riders];
        for (const unit of militaryOptions) {
            if (canBuild(city, "Unit", unit, state)) {
                return { type: "Unit", id: unit };
            }
        }
    }

    const WAR_EMERGENCY_THRESHOLD = 6;
    if (isDefensiveCiv(context.profile.civName) && context.atWar && myMilitary < WAR_EMERGENCY_THRESHOLD) {
        aiInfo(`[AI Build] ${context.profile.civName} WAR EMERGENCY: Under attack! Military: ${myMilitary}/${WAR_EMERGENCY_THRESHOLD}`);

        if (canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
            return { type: "Unit", id: UnitType.Lorekeeper };
        }
        if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
            return { type: "Unit", id: UnitType.BowGuard };
        }
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            return { type: "Unit", id: UnitType.SpearGuard };
        }
        if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
            return { type: "Unit", id: UnitType.ArmyBowGuard };
        }
        if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
            return { type: "Unit", id: UnitType.ArmySpearGuard };
        }
    }

    return null;
}
