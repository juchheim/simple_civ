import { canBuild } from "../../rules.js";
import { BuildingType, City, GameState, TechId, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isDefensiveCiv } from "../../helpers/civ-helpers.js";
import type { BuildOption, ProductionContext } from "../production.js";

export function pickRiverLeagueEarlyBoost(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    if (context.profile.civName !== "RiverLeague" || state.turn >= 25) return null;

    const currentMilitary = context.myMilitaryUnits.length;
    const RIVER_LEAGUE_EARLY_MILITARY_TARGET = 3;

    if (currentMilitary < RIVER_LEAGUE_EARLY_MILITARY_TARGET) {
        if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
            aiInfo(`[AI Build] RiverLeague EARLY BOOST: BowGuard (${currentMilitary}/${RIVER_LEAGUE_EARLY_MILITARY_TARGET})`);
            return { type: "Unit", id: UnitType.BowGuard };
        }
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            aiInfo(`[AI Build] RiverLeague EARLY BOOST: SpearGuard (${currentMilitary}/${RIVER_LEAGUE_EARLY_MILITARY_TARGET})`);
            return { type: "Unit", id: UnitType.SpearGuard };
        }
    }

    return null;
}

export function pickDefensiveEarlyMilitaryBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    if (!isDefensiveCiv(context.profile.civName) || state.turn <= 10) return null;
    if (context.player.techs.includes(TechId.CityWards)) return null;

    const currentMilitary = context.myMilitaryUnits.length;
    const MIN_MILITARY_TO_EXPAND = 2;

    if (currentMilitary < MIN_MILITARY_TO_EXPAND) {
        if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} EARLY DEFENSE: BowGuard (${currentMilitary}/${MIN_MILITARY_TO_EXPAND} min)`);
            return { type: "Unit", id: UnitType.BowGuard };
        }
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} EARLY DEFENSE: SpearGuard (${currentMilitary}/${MIN_MILITARY_TO_EXPAND} min)`);
            return { type: "Unit", id: UnitType.SpearGuard };
        }
    }

    return null;
}

export function pickDefensiveLorekeeperBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    if (!isDefensiveCiv(context.profile.civName)) return null;
    if (!context.player.techs.includes(TechId.CityWards)) return null;
    if (city.buildings.includes(BuildingType.Bulwark)) return null;

    const currentLorekeepers = context.myUnits.filter(u => u.type === UnitType.Lorekeeper).length;
    const desiredLorekeepers = Math.max(3, Math.floor(context.myCities.length * 1.5));

    if (currentLorekeepers < desiredLorekeepers) {
        if (canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} LOREKEEPER: (${currentLorekeepers}/${desiredLorekeepers})`);
            return { type: "Unit", id: UnitType.Lorekeeper };
        }
    }

    return null;
}

export function pickDefensiveArmyBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    if (!isDefensiveCiv(context.profile.civName)) return null;
    if (!context.player.techs.includes(TechId.DrilledRanks)) return null;

    const currentArmyUnits = context.myUnits.filter(u =>
        (u.type === UnitType.ArmySpearGuard || u.type === UnitType.ArmyBowGuard || u.type === UnitType.ArmyRiders)
    ).length;
    const desiredArmyUnits = Math.max(4, context.myCities.length * 2);

    if (currentArmyUnits < desiredArmyUnits) {
        if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} ARMY (pre-project): ArmyBowGuard (${currentArmyUnits}/${desiredArmyUnits})`);
            return { type: "Unit", id: UnitType.ArmyBowGuard };
        }
        if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} ARMY (pre-project): ArmySpearGuard (${currentArmyUnits}/${desiredArmyUnits})`);
            return { type: "Unit", id: UnitType.ArmySpearGuard };
        }
    }

    return null;
}

export function pickAetherianVanguardBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    if (context.profile.civName !== "AetherianVanguard") return null;

    const hasTitan = context.myUnits.some(u => u.type === UnitType.Titan);
    // Check if built OR being built anywhere
    const hasTitansCore = context.myCities.some(c =>
        c.buildings.includes(BuildingType.TitansCore) ||
        (c.currentBuild?.type === "Building" && c.currentBuild.id === BuildingType.TitansCore)
    );

    // v9.10: Count Riders specifically for deathball composition
    const currentRiders = context.myUnits.filter(u =>
        u.type === UnitType.Riders || u.type === UnitType.ArmyRiders
    ).length;

    const hasSteamForges = context.player.techs.includes(TechId.SteamForges);

    // v9.10: Build Titan's Core immediately after SteamForges - no Rider prerequisite
    // Previous requirement of 4 Riders was blocking Titan spawn in 54% of games!
    // Riders can be built in parallel from other cities
    if (hasSteamForges && !hasTitan && !hasTitansCore) {
        if (canBuild(city, "Building", BuildingType.TitansCore, state)) {
            aiInfo(`[AI Build] AetherianVanguard PRIORITY: TitansCore IMMEDIATELY after SteamForges!`);
            return { type: "Building", id: BuildingType.TitansCore };
        }
    }

    // After Titan's Core is started/built, continue building escorts
    const isResearchingSteamForges = context.player.currentTech?.id === TechId.SteamForges;
    const isPrepForTitan = (isResearchingSteamForges || hasSteamForges) && !hasTitan;

    if (isPrepForTitan || hasTitan) {
        // v9.10: Maintain minimum 4 Riders in deathball at all times
        const RIDER_MINIMUM = 4;
        if (currentRiders < RIDER_MINIMUM) {
            if (canBuild(city, "Unit", UnitType.ArmyRiders, state)) {
                aiInfo(`[AI Build] AetherianVanguard DEATHBALL RIDERS: ArmyRiders (${currentRiders}/${RIDER_MINIMUM} min)`);
                return { type: "Unit", id: UnitType.ArmyRiders };
            }
            if (canBuild(city, "Unit", UnitType.Riders, state)) {
                aiInfo(`[AI Build] AetherianVanguard DEATHBALL RIDERS: Riders (${currentRiders}/${RIDER_MINIMUM} min)`);
                return { type: "Unit", id: UnitType.Riders };
            }
        }

        // After Rider minimum met, build additional escorts (Landships, more Riders)
        const totalEscorts = context.myUnits.filter(u =>
            u.type === UnitType.ArmyRiders || u.type === UnitType.Landship || u.type === UnitType.Riders
        ).length;
        const TITAN_ESCORT_TARGET = 6;

        if (totalEscorts < TITAN_ESCORT_TARGET) {
            if (canBuild(city, "Unit", UnitType.Landship, state)) {
                aiInfo(`[AI Build] AetherianVanguard TITAN ESCORT: Landship (${totalEscorts}/${TITAN_ESCORT_TARGET})`);
                return { type: "Unit", id: UnitType.Landship };
            }
            if (canBuild(city, "Unit", UnitType.ArmyRiders, state)) {
                aiInfo(`[AI Build] AetherianVanguard TITAN ESCORT: ArmyRiders (${totalEscorts}/${TITAN_ESCORT_TARGET})`);
                return { type: "Unit", id: UnitType.ArmyRiders };
            }
            if (canBuild(city, "Unit", UnitType.Riders, state)) {
                aiInfo(`[AI Build] AetherianVanguard TITAN ESCORT: Riders (${totalEscorts}/${TITAN_ESCORT_TARGET})`);
                return { type: "Unit", id: UnitType.Riders };
            }
        }
    }

    return null;
}
