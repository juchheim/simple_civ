import { canBuild } from "../../rules.js";
import { AiVictoryGoal, BuildingType, City, GameState, TechId, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isDefensiveCiv } from "../../helpers/civ-helpers.js";
import { hexDistance } from "../../../core/hex.js";
import { TERRITORIAL_DEFENDERS_PER_CITY, DEFENSIVE_CIV_DEFENDER_MULTIPLIER } from "../../../core/constants.js";
import { cityHasGarrison } from "./analysis.js";
import { getBestUnitForRole } from "../strategic-plan.js";
import { isCombatUnitType } from "../schema.js";
import type { BuildOption, ProductionContext } from "../production.js";

const PERIMETER_DISTANCE = 5;
const RING_DISTANCE = 1;
const LOCAL_DEFENSE_RANGE = 2;

const RANGED_DEFENDERS = new Set<UnitType>([UnitType.BowGuard, UnitType.ArmyBowGuard]);
const MELEE_DEFENDERS = new Set<UnitType>([UnitType.SpearGuard, UnitType.ArmySpearGuard]);
const BASE_DEFENDER_UNITS = new Set<UnitType>([UnitType.SpearGuard, UnitType.BowGuard, UnitType.Riders]);
const ARMY_DEFENDER_UNITS = new Set<UnitType>([UnitType.ArmySpearGuard, UnitType.ArmyBowGuard, UnitType.ArmyRiders]);

function isNonCivilianUnit(unitType: UnitType): boolean {
    return isCombatUnitType(unitType);
}

function getMinimumEnemyDistance(state: GameState, city: City, enemyIds: Set<string>): number {
    let minEnemyDist = Infinity;

    for (const enemyCity of state.cities) {
        if (!enemyIds.has(enemyCity.ownerId)) continue;
        const dist = hexDistance(city.coord, enemyCity.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }

    for (const enemyUnit of state.units) {
        if (!enemyIds.has(enemyUnit.ownerId) || !isNonCivilianUnit(enemyUnit.type)) continue;
        const dist = hexDistance(city.coord, enemyUnit.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }

    return minEnemyDist;
}

function hasNonCivilianUnitAtCity(units: GameState["units"], city: City): boolean {
    return units.some(unit =>
        unit.coord.q === city.coord.q &&
        unit.coord.r === city.coord.r &&
        isNonCivilianUnit(unit.type)
    );
}

function countUnitsAtDistance(
    units: GameState["units"],
    city: City,
    distance: number,
    predicate: (unit: GameState["units"][number]) => boolean
): number {
    let count = 0;
    for (const unit of units) {
        if (predicate(unit) && hexDistance(unit.coord, city.coord) === distance) {
            count++;
        }
    }
    return count;
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

export function pickDefensePriorityBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: "defend" | "expand" | "interleave",
    shouldBuildDefender: boolean
): BuildOption | null {
    if (!shouldBuildDefender) return null;

    const minEnemyDist = getMinimumEnemyDistance(state, city, context.aliveEnemyIds);
    const isPerimeter = minEnemyDist <= PERIMETER_DISTANCE;
    const desiredTotal = city.isCapital ? (isPerimeter ? 4 : 1) : (isPerimeter ? 3 : 1);

    const hasGarrison = hasNonCivilianUnitAtCity(context.myUnits, city) ? 1 : 0;
    const ringDefenders = countUnitsAtDistance(
        context.myUnits,
        city,
        RING_DISTANCE,
        unit => isNonCivilianUnit(unit.type)
    );

    const currentTotal = hasGarrison + ringDefenders;

    if (currentTotal < desiredTotal) {
        aiInfo(`[AI Build] ${context.profile.civName} DEFENSE PRIORITY (${defenseDecision}): ${city.name} needs defenders (${currentTotal}/${desiredTotal})`);

        const existingRanged = countUnitsWithinDistance(
            context.myUnits,
            city,
            LOCAL_DEFENSE_RANGE,
            unit => RANGED_DEFENDERS.has(unit.type)
        );
        const existingMelee = countUnitsWithinDistance(
            context.myUnits,
            city,
            LOCAL_DEFENSE_RANGE,
            unit => MELEE_DEFENDERS.has(unit.type)
        );

        const needsRanged = existingRanged <= existingMelee ||
            ((state.turn + city.id.charCodeAt(0)) % 2 === 0 && existingRanged === existingMelee);

        if (needsRanged) {
            if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
                return { type: "Unit", id: UnitType.ArmyBowGuard };
            }
            if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
                return { type: "Unit", id: UnitType.BowGuard };
            }
        }
        if (context.unlockedUnits.includes(UnitType.Lorekeeper) && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
            return { type: "Unit", id: UnitType.Lorekeeper };
        }
        if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
            return { type: "Unit", id: UnitType.ArmySpearGuard };
        }
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            return { type: "Unit", id: UnitType.SpearGuard };
        }
    }

    return null;
}

export function pickGarrisonBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: "defend" | "expand" | "interleave"
): BuildOption | null {
    if (cityHasGarrison(state, city) || defenseDecision === "expand") return null;

    const isDefensive = isDefensiveCiv(context.profile.civName);
    const garrisonUnit = isDefensive
        ? getBestUnitForRole("defense", context.unlockedUnits) ?? getBestUnitForRole("capture", context.unlockedUnits)
        : getBestUnitForRole("capture", context.unlockedUnits);

    if (garrisonUnit && canBuild(city, "Unit", garrisonUnit, state)) {
        aiInfo(`[AI Build] ${context.profile.civName} GARRISON: ${garrisonUnit} for ${city.name}`);
        return { type: "Unit", id: garrisonUnit };
    }
    if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
        return { type: "Unit", id: UnitType.SpearGuard };
    }

    return null;
}

export function pickTerritorialDefenderBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: "defend" | "expand" | "interleave"
): BuildOption | null {
    const currentDefenders = context.myUnits.filter(u => u.isHomeDefender === true);
    const currentDefenderCount = currentDefenders.length;

    const isDefensive = isDefensiveCiv(context.profile.civName);
    const desiredDefenderCount = isDefensive
        ? Math.ceil(context.myCities.length * DEFENSIVE_CIV_DEFENDER_MULTIPLIER)
        : context.myCities.length * TERRITORIAL_DEFENDERS_PER_CITY;

    const bestDefenderUnit = getBestUnitForRole("defense", context.unlockedUnits)
        ?? getBestUnitForRole("capture", context.unlockedUnits);

    const canBuildLorekeeper = isDefensive &&
        context.unlockedUnits.includes(UnitType.Lorekeeper) &&
        canBuild(city, "Unit", UnitType.Lorekeeper, state);
    const preferredDefender = canBuildLorekeeper ? UnitType.Lorekeeper : bestDefenderUnit;

    const hasArmyTech = context.player.techs.includes(TechId.DrilledRanks);
    const suboptimalDefenders = currentDefenders.filter(u => {
        if (u.type === UnitType.Lorekeeper) return false;
        if (ARMY_DEFENDER_UNITS.has(u.type as UnitType)) {
            return canBuildLorekeeper;
        }
        if (BASE_DEFENDER_UNITS.has(u.type as UnitType)) {
            return hasArmyTech || canBuildLorekeeper;
        }
        return false;
    });

    if (currentDefenderCount < desiredDefenderCount && defenseDecision !== "expand") {
        if (preferredDefender && canBuild(city, "Unit", preferredDefender, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} TERRITORIAL DEFENDER (REPLACE): ${preferredDefender} (${currentDefenderCount}/${desiredDefenderCount})`);
            return { type: "Unit", id: preferredDefender, markAsHomeDefender: true };
        }
    }

    if (suboptimalDefenders.length > 0 && preferredDefender) {
        if (canBuild(city, "Unit", preferredDefender, state)) {
            const toRelease = suboptimalDefenders[0];

            const unitToRelease = context.myUnits.find(u => u.id === toRelease.id);
            if (unitToRelease) {
                unitToRelease.isHomeDefender = false;
                aiInfo(`[AI Build] ${context.profile.civName} releasing ${toRelease.type} from home duty for upgrade`);
            }

            aiInfo(`[AI Build] ${context.profile.civName} TERRITORIAL DEFENDER (UPGRADE): ${preferredDefender} replacing ${toRelease.type}`);
            return { type: "Unit", id: preferredDefender, markAsHomeDefender: true };
        }
    }

    return null;
}

export function pickShieldGeneratorBuild(
    state: GameState,
    city: City,
    goal: AiVictoryGoal,
    context: ProductionContext
): BuildOption | null {
    const isDefensive = isDefensiveCiv(context.profile.civName);
    if (goal !== "Progress" && !isDefensive) return null;

    if (!city.buildings.includes(BuildingType.ShieldGenerator) && canBuild(city, "Building", BuildingType.ShieldGenerator, state)) {
        aiInfo(`[AI Build] ${context.profile.civName} DEFENSE: ShieldGenerator`);
        return { type: "Building", id: BuildingType.ShieldGenerator };
    }

    return null;
}

export function pickBulwarkBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const isDefensive = isDefensiveCiv(context.profile.civName);
    if (!isDefensive) return null;

    const currentBulwarks = context.myCities.filter(c => c.buildings.includes(BuildingType.Bulwark)).length;
    const minBulwarks = 1;
    const maxBulwarks = Math.max(minBulwarks, Math.floor(context.myCities.length / 2));

    if (currentBulwarks < maxBulwarks && !city.buildings.includes(BuildingType.Bulwark) && canBuild(city, "Building", BuildingType.Bulwark, state)) {
        aiInfo(`[AI Build] ${context.profile.civName} DEFENSE: Bulwark (${currentBulwarks}/${maxBulwarks})`);
        return { type: "Building", id: BuildingType.Bulwark };
    }

    return null;
}
