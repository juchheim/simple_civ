import { City, GameState, UnitType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { canBuild } from "../../rules.js";
import { isDefensiveCiv } from "../../helpers/civ-helpers.js";
import { UNIT_ROLES } from "../capabilities.js";
import { cityHasGarrison } from "./analysis.js";
import type { BuildOption, ProductionContext } from "../production.js";

const CITY_THREAT_DISTANCE = 2;
const TITAN_RESPONSE_MILITARY_THRESHOLD = 8;
const WAR_EMERGENCY_THRESHOLD = 6;

const RANGED_GARRISON_OPTIONS = [UnitType.ArmyBowGuard, UnitType.BowGuard];
const MELEE_GARRISON_OPTIONS = [UnitType.ArmySpearGuard, UnitType.SpearGuard];
const TITAN_RESPONSE_RANGED_OPTIONS = [UnitType.ArmyBowGuard, UnitType.BowGuard];
const TITAN_RESPONSE_MILITARY_OPTIONS = [UnitType.ArmySpearGuard, UnitType.SpearGuard, UnitType.Riders];
const WAR_EMERGENCY_FALLBACK_OPTIONS = [
    UnitType.BowGuard,
    UnitType.SpearGuard,
    UnitType.ArmyBowGuard,
    UnitType.ArmySpearGuard,
];

const RANGED_THREAT_UNITS = new Set<UnitType>([
    UnitType.BowGuard,
    UnitType.ArmyBowGuard,
    UnitType.Lorekeeper,
]);
const MELEE_THREAT_UNITS = new Set<UnitType>([
    UnitType.SpearGuard,
    UnitType.ArmySpearGuard,
]);

function isThreateningEnemyUnit(unitType: UnitType): boolean {
    return UNITS[unitType].domain !== "Civilian" && unitType !== UnitType.Scout;
}

function pickFirstBuildableUnit(
    state: GameState,
    city: City,
    options: UnitType[]
): BuildOption | null {
    for (const unit of options) {
        if (canBuild(city, "Unit", unit, state)) {
            return { type: "Unit", id: unit };
        }
    }
    return null;
}

function countUnitsWithinDistance(
    units: GameState["units"],
    city: City,
    distance: number,
    predicate: (unit: GameState["units"][number]) => boolean
): number {
    let count = 0;
    for (const unit of units) {
        if (predicate(unit) && hexDistance(unit.coord, city.coord) <= distance) {
            count++;
        }
    }
    return count;
}

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
        isThreateningEnemyUnit(u.type) &&
        hexDistance(u.coord, city.coord) <= CITY_THREAT_DISTANCE
    );
    if (enemyUnitsNearCity.length === 0) return null;

    aiInfo(`[AI Build] ${context.profile.civName} EMERGENCY: ${city.name} under attack by ${enemyUnitsNearCity.length} enemies!`);

    const isDefensive = isDefensiveCiv(context.profile.civName);
    if (isDefensive && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
        return { type: "Unit", id: UnitType.Lorekeeper };
    }

    const nearbyRanged = countUnitsWithinDistance(
        context.myUnits,
        city,
        CITY_THREAT_DISTANCE,
        unit => RANGED_THREAT_UNITS.has(unit.type)
    );
    const nearbyMelee = countUnitsWithinDistance(
        context.myUnits,
        city,
        CITY_THREAT_DISTANCE,
        unit => MELEE_THREAT_UNITS.has(unit.type)
    );

    const responseOrder = nearbyRanged <= nearbyMelee
        ? [
            UnitType.ArmyBowGuard,
            UnitType.BowGuard,
            UnitType.ArmySpearGuard,
            UnitType.SpearGuard,
            UnitType.ArmyBowGuard,
            UnitType.BowGuard,
        ]
        : [
            UnitType.ArmySpearGuard,
            UnitType.SpearGuard,
            UnitType.ArmyBowGuard,
            UnitType.BowGuard,
        ];

    const responseBuild = pickFirstBuildableUnit(state, city, responseOrder);
    if (responseBuild) return responseBuild;

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

    const isDefensive = isDefensiveCiv(context.profile.civName);
    if (isDefensive && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
        return { type: "Unit", id: UnitType.Lorekeeper };
    }

    const preferRanged = ((state.turn + city.id.charCodeAt(0)) % 2) === 0;

    if (preferRanged) {
        const rangedBuild = pickFirstBuildableUnit(state, city, RANGED_GARRISON_OPTIONS);
        if (rangedBuild) return rangedBuild;
    }

    const meleeBuild = pickFirstBuildableUnit(state, city, MELEE_GARRISON_OPTIONS);
    if (meleeBuild) return meleeBuild;

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

    const myMilitary = countMilitary(state, playerId);

    if (enemyTitan && myMilitary < TITAN_RESPONSE_MILITARY_THRESHOLD) {
        aiInfo(`[AI Build] ${context.profile.civName} TITAN EMERGENCY: Enemy Titan detected! Military: ${myMilitary}/${TITAN_RESPONSE_MILITARY_THRESHOLD}`);

        if (canBuild(city, "Unit", UnitType.Landship, state)) {
            return { type: "Unit", id: UnitType.Landship };
        }
        const rangedBuild = pickFirstBuildableUnit(state, city, TITAN_RESPONSE_RANGED_OPTIONS);
        if (rangedBuild) return rangedBuild;

        const militaryBuild = pickFirstBuildableUnit(state, city, TITAN_RESPONSE_MILITARY_OPTIONS);
        if (militaryBuild) return militaryBuild;
    }

    const isDefensive = isDefensiveCiv(context.profile.civName);
    if (isDefensive && context.atWar && myMilitary < WAR_EMERGENCY_THRESHOLD) {
        aiInfo(`[AI Build] ${context.profile.civName} WAR EMERGENCY: Under attack! Military: ${myMilitary}/${WAR_EMERGENCY_THRESHOLD}`);

        if (canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
            return { type: "Unit", id: UnitType.Lorekeeper };
        }
        const emergencyBuild = pickFirstBuildableUnit(state, city, WAR_EMERGENCY_FALLBACK_OPTIONS);
        if (emergencyBuild) return emergencyBuild;
    }

    return null;
}
