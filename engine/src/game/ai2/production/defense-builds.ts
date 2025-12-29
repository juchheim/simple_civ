import { canBuild } from "../../rules.js";
import { AiVictoryGoal, BuildingType, City, GameState, TechId, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isDefensiveCiv } from "../../helpers/civ-helpers.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS, TERRITORIAL_DEFENDERS_PER_CITY, DEFENSIVE_CIV_DEFENDER_MULTIPLIER } from "../../../core/constants.js";
import { cityHasGarrison } from "./analysis.js";
import { getBestUnitForRole } from "../strategic-plan.js";
import type { BuildOption, ProductionContext } from "../production.js";

export function pickDefensePriorityBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: "defend" | "expand" | "interleave",
    shouldBuildDefender: boolean
): BuildOption | null {
    if (!shouldBuildDefender) return null;

    const enemyCities = state.cities.filter(c => context.aliveEnemyIds.has(c.ownerId));
    const enemyUnitsNearby = state.units.filter(u =>
        context.aliveEnemyIds.has(u.ownerId) &&
        UNITS[u.type].domain !== "Civilian"
    );

    let minEnemyDist = Infinity;
    for (const ec of enemyCities) {
        const dist = hexDistance(city.coord, ec.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }
    for (const eu of enemyUnitsNearby) {
        const dist = hexDistance(city.coord, eu.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }

    const isPerimeter = minEnemyDist <= 5;
    const desiredTotal = city.isCapital ? (isPerimeter ? 4 : 1) : (isPerimeter ? 3 : 1);

    const hasGarrison = context.myUnits.some(u =>
        u.coord.q === city.coord.q &&
        u.coord.r === city.coord.r &&
        UNITS[u.type].domain !== "Civilian"
    ) ? 1 : 0;

    const ringDefenders = context.myUnits.filter(u =>
        hexDistance(u.coord, city.coord) === 1 &&
        UNITS[u.type].domain !== "Civilian"
    ).length;

    const currentTotal = hasGarrison + ringDefenders;

    if (currentTotal < desiredTotal) {
        aiInfo(`[AI Build] ${context.profile.civName} DEFENSE PRIORITY (${defenseDecision}): ${city.name} needs defenders (${currentTotal}/${desiredTotal})`);

        const existingRanged = context.myUnits.filter(u =>
            (u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard) &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;
        const existingMelee = context.myUnits.filter(u =>
            (u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard) &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;

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

    const garrisonUnit = isDefensiveCiv(context.profile.civName)
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

    const desiredDefenderCount = isDefensiveCiv(context.profile.civName)
        ? Math.ceil(context.myCities.length * DEFENSIVE_CIV_DEFENDER_MULTIPLIER)
        : context.myCities.length * TERRITORIAL_DEFENDERS_PER_CITY;

    const bestDefenderUnit = getBestUnitForRole("defense", context.unlockedUnits)
        ?? getBestUnitForRole("capture", context.unlockedUnits);

    const canBuildLorekeeper = isDefensiveCiv(context.profile.civName) &&
        context.unlockedUnits.includes(UnitType.Lorekeeper) &&
        canBuild(city, "Unit", UnitType.Lorekeeper, state);
    const preferredDefender = canBuildLorekeeper ? UnitType.Lorekeeper : bestDefenderUnit;

    const BASE_UNITS = [UnitType.SpearGuard, UnitType.BowGuard, UnitType.Riders];
    const ARMY_UNITS = [UnitType.ArmySpearGuard, UnitType.ArmyBowGuard, UnitType.ArmyRiders];

    const hasArmyTech = context.player.techs.includes(TechId.DrilledRanks);
    const suboptimalDefenders = currentDefenders.filter(u => {
        if (u.type === UnitType.Lorekeeper) return false;
        if (ARMY_UNITS.includes(u.type as UnitType)) {
            return canBuildLorekeeper;
        }
        if (BASE_UNITS.includes(u.type as UnitType)) {
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
    if (goal !== "Progress" && !isDefensiveCiv(context.profile.civName)) return null;

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
    if (!isDefensiveCiv(context.profile.civName)) return null;

    const currentBulwarks = context.myCities.filter(c => c.buildings.includes(BuildingType.Bulwark)).length;
    const minBulwarks = 1;
    const maxBulwarks = Math.max(minBulwarks, Math.floor(context.myCities.length / 2));

    if (currentBulwarks < maxBulwarks && !city.buildings.includes(BuildingType.Bulwark) && canBuild(city, "Building", BuildingType.Bulwark, state)) {
        aiInfo(`[AI Build] ${context.profile.civName} DEFENSE: Bulwark (${currentBulwarks}/${maxBulwarks})`);
        return { type: "Building", id: BuildingType.Bulwark };
    }

    return null;
}
