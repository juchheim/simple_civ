/**
 * production.ts - Goal-Driven Production Selection
 * 
 * REFACTORED: Uses capability gaps from strategic-plan.ts
 * Priority Order:
 * 1. Victory projects (if Progress goal)
 * 2. Garrison undefended cities
 * 3. Fill capability gaps (siege/capture/defense)
 * 4. Expansion (settlers) when safe
 * 5. Economy buildings
 */

import { canBuild } from "../rules.js";
import { AiVictoryGoal, BuildingType, City, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { hexDistance } from "../../core/hex.js";
import { aiInfo } from "../ai/debug-logging.js";
import { isDefensiveCiv } from "../helpers/civ-helpers.js";
import { UNITS } from "../../core/constants.js";
import {
    assessCapabilities,
    findCapabilityGaps,
    getGoalRequirements,
    getBestUnitForRole,
    getGamePhase
} from "./strategic-plan.js";
import { UNIT_ROLES, getUnitsWithRole } from "./capabilities.js";

export type BuildOption = { type: "Unit" | "Building" | "Project"; id: string };

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function countMilitary(state: GameState, playerId: string): number {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        UNIT_ROLES[u.type] !== "civilian" &&
        UNIT_ROLES[u.type] !== "vision"
    ).length;
}

function settlersInFlight(state: GameState, playerId: string): number {
    const active = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler).length;
    const queued = state.cities.filter(c =>
        c.ownerId === playerId && c.currentBuild?.type === "Unit" && c.currentBuild.id === UnitType.Settler
    ).length;
    return active + queued;
}

function cityHasGarrison(state: GameState, city: City): boolean {
    return state.units.some(u =>
        u.ownerId === city.ownerId &&
        u.coord.q === city.coord.q &&
        u.coord.r === city.coord.r &&
        UNIT_ROLES[u.type] !== "civilian"
    );
}

function getUnlockedUnits(playerTechs: TechId[]): UnitType[] {
    // Base units always available
    const unlocked: UnitType[] = [UnitType.Scout, UnitType.Settler];

    const hasDrilledRanks = playerTechs.includes(TechId.DrilledRanks);
    const hasArmyDoctrine = playerTechs.includes(TechId.ArmyDoctrine);

    if (playerTechs.includes(TechId.FormationTraining)) {
        // Unit obsolescence: SpearGuard/BowGuard become obsolete once DrilledRanks is researched
        // AI should build Army versions instead (stronger, better survival)
        if (!hasDrilledRanks) {
            unlocked.push(UnitType.SpearGuard, UnitType.BowGuard);
        }
    }
    if (playerTechs.includes(TechId.TrailMaps)) {
        // Unit obsolescence: Riders become obsolete once ArmyDoctrine is researched
        if (!hasArmyDoctrine) {
            unlocked.push(UnitType.Riders);
        }
    }
    if (hasDrilledRanks) {
        unlocked.push(UnitType.ArmySpearGuard, UnitType.ArmyBowGuard);
    }
    if (hasArmyDoctrine) {
        unlocked.push(UnitType.ArmyRiders);
    }
    // Landship and Airship are NOT obsoleted - they are unique advanced units
    if (playerTechs.includes(TechId.CompositeArmor)) {
        unlocked.push(UnitType.Landship);
    }
    if (playerTechs.includes(TechId.Aerodynamics)) {
        unlocked.push(UnitType.Airship);
    }
    if (playerTechs.includes(TechId.CityWards)) {
        // CityWards unlocks Bulwark building (not a unit)
    }
    return unlocked;
}

// =============================================================================
// MAIN PRODUCTION SELECTION
// =============================================================================

export function chooseCityBuildV2(state: GameState, playerId: string, city: City, goal: AiVictoryGoal): BuildOption | null {
    const profile = getAiProfileV2(state, playerId);
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;
    if (city.currentBuild) return null;

    const phase = getGamePhase(state);
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const unlockedUnits = getUnlockedUnits(player.techs);
    const requirements = getGoalRequirements(goal, profile.civName, phase, myCities.length);
    const capabilities = assessCapabilities(state, playerId);
    const gaps = findCapabilityGaps(capabilities, requirements);

    const atWar = state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === "War"
    );

    // =========================================================================
    // EMERGENCY: Enemy Titan Detection
    // =========================================================================
    // If we're at war with someone who has a Titan AND we're under-militarized, prioritize military
    const enemyTitan = state.units.find(u =>
        u.type === UnitType.Titan &&
        u.ownerId !== playerId &&
        state.diplomacy?.[playerId]?.[u.ownerId] === "War"
    );

    const TITAN_RESPONSE_MILITARY_THRESHOLD = 8;  // Stop emergency production once we have this many
    const myMilitary = countMilitary(state, playerId);

    if (enemyTitan && myMilitary < TITAN_RESPONSE_MILITARY_THRESHOLD) {
        aiInfo(`[AI Build] ${profile.civName} TITAN EMERGENCY: Enemy Titan detected! Military: ${myMilitary}/${TITAN_RESPONSE_MILITARY_THRESHOLD}`);

        // Try Landship first (best counter)
        if (canBuild(city, "Unit", UnitType.Landship, state)) {
            return { type: "Unit", id: UnitType.Landship };
        }
        // Then ranged (can chip away safely)
        const rangedOptions = [UnitType.ArmyBowGuard, UnitType.BowGuard];
        for (const unit of rangedOptions) {
            if (canBuild(city, "Unit", unit, state)) {
                return { type: "Unit", id: unit };
            }
        }
        // Fallback: any military
        const militaryOptions = [UnitType.ArmySpearGuard, UnitType.SpearGuard, UnitType.Riders];
        for (const unit of militaryOptions) {
            if (canBuild(city, "Unit", unit, state)) {
                return { type: "Unit", id: unit };
            }
        }
    }

    // =========================================================================
    // PRIORITY 0.5: Early Military for Defensive Civs (before CityWards)
    // =========================================================================
    // Defensive civs get attacked as early as turn 19-30, before they can build Lorekeepers.
    // Build 2-3 early military units to survive early aggression.
    // Note: SpearGuard/BowGuard are available from turn 1, no tech required.
    if (isDefensiveCiv(profile.civName) && state.turn > 20) {
        if (!player.techs.includes(TechId.CityWards)) {
            // Before CityWards: build some basic military to survive
            const currentMilitary = state.units.filter(u =>
                u.ownerId === playerId &&
                UNITS[u.type].domain !== "Civilian" &&
                u.type !== UnitType.Scout
            ).length;
            // Target: 2-3 units to deter early aggression
            const earlyMilitaryTarget = Math.max(2, myCities.length);

            if (currentMilitary < earlyMilitaryTarget) {
                // Prefer ranged for defense
                if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
                    aiInfo(`[AI Build] ${profile.civName} EARLY DEFENSE: BowGuard (${currentMilitary}/${earlyMilitaryTarget})`);
                    return { type: "Unit", id: UnitType.BowGuard };
                }
                if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
                    aiInfo(`[AI Build] ${profile.civName} EARLY DEFENSE: SpearGuard (${currentMilitary}/${earlyMilitaryTarget})`);
                    return { type: "Unit", id: UnitType.SpearGuard };
                }
            }
        }
    }

    // =========================================================================
    // PRIORITY 0.8: Lorekeeper for Defensive Civs (non-Bulwark cities only)
    // =========================================================================
    // ScholarKingdoms/StarborneSeekers get Lorekeeper as their main defensive unit
    // IMPORTANT: Only non-Bulwark cities build Lorekeepers
    // Bulwark cities focus on Victory projects (Priority 1)
    if (isDefensiveCiv(profile.civName) && player.techs.includes(TechId.CityWards)) {
        // Only non-Bulwark cities should build Lorekeepers
        if (!city.buildings.includes(BuildingType.Bulwark)) {
            const currentLorekeepers = state.units.filter(u =>
                u.ownerId === playerId && u.type === UnitType.Lorekeeper
            ).length;
            // Target: 1.5 per city (1 garrison + 0.5 field defender), min 3
            // This provides garrison coverage plus mobile defenders
            const desiredLorekeepers = Math.max(3, Math.floor(myCities.length * 1.5));

            if (currentLorekeepers < desiredLorekeepers) {
                if (canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
                    aiInfo(`[AI Build] ${profile.civName} LOREKEEPER: (${currentLorekeepers}/${desiredLorekeepers})`);
                    return { type: "Unit", id: UnitType.Lorekeeper };
                }
            }
        }
    }

    // =========================================================================
    // PRIORITY 0.9: Army Units for Defensive Civs (non-Bulwark cities)
    // =========================================================================
    // For ScholarKingdoms/StarborneSeekers: non-Bulwark cities should build Army
    // units while Bulwark cities focus on Victory projects
    if (isDefensiveCiv(profile.civName) && player.techs.includes(TechId.DrilledRanks)) {
        if (!city.buildings.includes(BuildingType.Bulwark)) {
            // Non-Bulwark city: prioritize Army units over Victory projects
            const currentArmyUnits = state.units.filter(u =>
                u.ownerId === playerId &&
                (u.type === UnitType.ArmySpearGuard || u.type === UnitType.ArmyBowGuard || u.type === UnitType.ArmyRiders)
            ).length;
            const nonBulwarkCities = myCities.filter(c => !c.buildings.includes(BuildingType.Bulwark)).length;
            const desiredArmyUnits = Math.max(4, nonBulwarkCities * 2); // At least 4 Army units

            if (currentArmyUnits < desiredArmyUnits) {
                if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
                    aiInfo(`[AI Build] ${profile.civName} ARMY (pre-project): ArmyBowGuard (${currentArmyUnits}/${desiredArmyUnits})`);
                    return { type: "Unit", id: UnitType.ArmyBowGuard };
                }
                if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
                    aiInfo(`[AI Build] ${profile.civName} ARMY (pre-project): ArmySpearGuard (${currentArmyUnits}/${desiredArmyUnits})`);
                    return { type: "Unit", id: UnitType.ArmySpearGuard };
                }
            }
        }
    }

    // =========================================================================
    // PRIORITY 1: Victory Projects (Progress goal)
    // =========================================================================
    if (goal === "Progress" || profile.civName === "ScholarKingdoms" || profile.civName === "StarborneSeekers") {
        // StarborneSeekers unique building satisfies Observatory milestone
        if (profile.civName === "StarborneSeekers" && player.techs.includes(TechId.StarCharts)) {
            if (!player.completedProjects.includes(ProjectId.Observatory)) {
                if (!city.buildings.includes(BuildingType.SpiritObservatory)) {
                    if (canBuild(city, "Building", BuildingType.SpiritObservatory, state)) {
                        aiInfo(`[AI Build] ${profile.civName} PRIORITY: SpiritObservatory (Victory)`);
                        return { type: "Building", id: BuildingType.SpiritObservatory };
                    }
                }
            }
        }

        // Victory project chain
        const progressProjects = [ProjectId.GrandExperiment, ProjectId.GrandAcademy, ProjectId.Observatory];
        for (const pid of progressProjects) {
            if (canBuild(city, "Project", pid, state)) {
                aiInfo(`[AI Build] ${profile.civName} PRIORITY: ${pid} (Victory)`);
                return { type: "Project", id: pid };
            }
        }
    }

    // =========================================================================
    // PRIORITY 1.1: HYBRID VICTORY - Opportunistic Progress for ALL civs
    // =========================================================================
    // If we've already invested in the Progress chain, continue it regardless of goal.
    // This gives Conquest/Balanced civs a backup win condition if wars stall.
    // Only triggers if we have StarCharts (meaning we *could* pursue Progress).
    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    const hasObservatory = player.completedProjects.includes(ProjectId.Observatory);
    const hasGrandAcademy = player.completedProjects.includes(ProjectId.GrandAcademy);
    const hasInvestedInProgress = hasObservatory || hasGrandAcademy;

    // Late game trigger: if turn > 200 and we have StarCharts, start Progress as backup
    const lateGameProgressTrigger = state.turn > 200 && hasStarCharts && !hasInvestedInProgress;

    if (hasStarCharts && (hasInvestedInProgress || lateGameProgressTrigger)) {
        // Check if ANY of our cities is currently building a Progress project
        const anyBuildingProgress = myCities.some(c =>
            c.currentBuild?.type === "Project" &&
            [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment].includes(c.currentBuild.id as ProjectId)
        );

        // Only assign ONE city to Progress at a time (other cities can do military)
        if (!anyBuildingProgress) {
            const progressProjects = [ProjectId.GrandExperiment, ProjectId.GrandAcademy, ProjectId.Observatory];
            for (const pid of progressProjects) {
                if (canBuild(city, "Project", pid, state)) {
                    aiInfo(`[AI Build] ${profile.civName} HYBRID: ${pid} (backup victory path)`);
                    return { type: "Project", id: pid };
                }
            }
        }
    }


    // =========================================================================
    // PRIORITY 1.5: Tech Unlock Priority - Build units from newly researched techs
    // =========================================================================

    // Landship FIRST: If we researched CompositeArmor and at war/Execute phase
    if (player.techs.includes(TechId.CompositeArmor) && (atWar || phase === "Execute")) {
        const currentLandships = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Landship).length;
        if (currentLandships < 4 && canBuild(city, "Unit", UnitType.Landship, state)) {
            aiInfo(`[AI Build] ${profile.civName} TECH UNLOCK: Landship (${currentLandships}/4)`);
            return { type: "Unit", id: UnitType.Landship };
        }
    }

    // Airship SECOND: Only if we have some offensive units AND need vision
    // v2: Reduced priority - only after offense is established
    if (player.techs.includes(TechId.Aerodynamics)) {
        const currentAirships = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Airship).length;
        const hasOffense = capabilities.siege >= 2 && capabilities.capture >= 2;
        const airshipCap = Math.min(2, myCities.length); // Max 1 per city, cap at 2
        if (hasOffense && currentAirships < airshipCap && canBuild(city, "Unit", UnitType.Airship, state)) {
            aiInfo(`[AI Build] ${profile.civName} TECH UNLOCK: Airship (${currentAirships}/${airshipCap})`);
            return { type: "Unit", id: UnitType.Airship };
        }
    }

    // =========================================================================
    // PRIORITY 2: AetherianVanguard Titan Rush
    // =========================================================================
    if (profile.civName === "AetherianVanguard") {
        const hasTitan = state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
        const hasTitansCore = myCities.some(c => c.buildings.includes(BuildingType.TitansCore));

        if (!hasTitan && !hasTitansCore && player.techs.includes(TechId.SteamForges)) {
            if (canBuild(city, "Building", BuildingType.TitansCore, state)) {
                aiInfo(`[AI Build] AetherianVanguard PRIORITY: TitansCore (Win Condition)`);
                return { type: "Building", id: BuildingType.TitansCore };
            }
        }
    }

    // =========================================================================
    // PRIORITY 3: Garrison Undefended Cities
    // =========================================================================
    if (!cityHasGarrison(state, city)) {
        // This city needs a garrison - build capture or defense unit
        const garrisonUnit = isDefensiveCiv(profile.civName)
            ? getBestUnitForRole("defense", unlockedUnits) ?? getBestUnitForRole("capture", unlockedUnits)
            : getBestUnitForRole("capture", unlockedUnits);

        if (garrisonUnit && canBuild(city, "Unit", garrisonUnit, state)) {
            aiInfo(`[AI Build] ${profile.civName} GARRISON: ${garrisonUnit} for ${city.name}`);
            return { type: "Unit", id: garrisonUnit };
        }
        // Fallback to any military
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            return { type: "Unit", id: UnitType.SpearGuard };
        }
    }

    // =========================================================================
    // PRIORITY 4.5: ShieldGenerator for Progress/Defensive Civs
    // =========================================================================
    // Moved up from Priority 8 - this needs to be built early for city defense
    if (goal === "Progress" || isDefensiveCiv(profile.civName)) {
        if (!city.buildings.includes(BuildingType.ShieldGenerator) && canBuild(city, "Building", BuildingType.ShieldGenerator, state)) {
            aiInfo(`[AI Build] ${profile.civName} DEFENSE: ShieldGenerator`);
            return { type: "Building", id: BuildingType.ShieldGenerator };
        }
    }

    // =========================================================================
    // PRIORITY 4.6: Bulwark for Defensive Civs (Scholar/Starborne)
    // =========================================================================
    // Ensure at least 1 Bulwark gets built - critical for early defense
    if (isDefensiveCiv(profile.civName)) {
        const currentBulwarks = myCities.filter(c => c.buildings.includes(BuildingType.Bulwark)).length;
        // Guarantee at least 1 Bulwark, then up to half of cities
        const minBulwarks = 1;
        const maxBulwarks = Math.max(minBulwarks, Math.floor(myCities.length / 2));

        if (currentBulwarks < maxBulwarks && !city.buildings.includes(BuildingType.Bulwark) && canBuild(city, "Building", BuildingType.Bulwark, state)) {
            aiInfo(`[AI Build] ${profile.civName} DEFENSE: Bulwark (${currentBulwarks}/${maxBulwarks})`);
            return { type: "Building", id: BuildingType.Bulwark };
        }
    }

    // =========================================================================
    // PRIORITY 5: Fill Capability Gaps
    // =========================================================================
    if (gaps.priority !== "garrison") {
        let targetUnit: UnitType | null = null;

        if (gaps.priority === "siege" && gaps.needSiege > 0) {
            targetUnit = getBestUnitForRole("siege", unlockedUnits);
            aiInfo(`[AI Build] ${profile.civName} GAP: Need siege (${gaps.needSiege})`);
        } else if (gaps.priority === "capture" && gaps.needCapture > 0) {
            targetUnit = getBestUnitForRole("capture", unlockedUnits);
            aiInfo(`[AI Build] ${profile.civName} GAP: Need capture (${gaps.needCapture})`);
        } else if (gaps.priority === "defense" && gaps.needDefense > 0) {
            targetUnit = getBestUnitForRole("defense", unlockedUnits);
            aiInfo(`[AI Build] ${profile.civName} GAP: Need defense (${gaps.needDefense})`);
        } else if (gaps.priority === "vision" && gaps.needVision > 0) {
            targetUnit = getBestUnitForRole("vision", unlockedUnits);
            aiInfo(`[AI Build] ${profile.civName} GAP: Need vision (${gaps.needVision})`);
        }

        if (targetUnit && canBuild(city, "Unit", targetUnit, state)) {
            return { type: "Unit", id: targetUnit };
        }
    }

    // =========================================================================
    // PRIORITY 6: Expansion (Settlers) - Only when safe
    // =========================================================================
    // v2.2: Removed !atWar check. Priority 5 (Capability Gaps) already ensures we build units if we need them.
    // Blocking expansion just because we are at war (even if winning/defended) causes defensive civs to turtle and die.
    if (phase === "Expand") {
        const settlerCap = profile.build.settlerCap;
        const desiredCities = profile.build.desiredCities;

        if (myCities.length < desiredCities && settlersInFlight(state, playerId) < settlerCap) {
            if (capabilities.garrison >= myCities.length) { // All cities defended
                if (canBuild(city, "Unit", UnitType.Settler, state)) {
                    aiInfo(`[AI Build] ${profile.civName} EXPAND: Settler`);
                    return { type: "Unit", id: UnitType.Settler };
                }
            }
        }
    }

    // =========================================================================
    // PRIORITY 7: Economy Buildings
    // =========================================================================
    const economyBuildings = [
        BuildingType.StoneWorkshop,
        BuildingType.Scriptorium,
        BuildingType.Academy,
        BuildingType.Farmstead,
        BuildingType.Forgeworks,
    ];

    for (const building of economyBuildings) {
        if (!city.buildings.includes(building) && canBuild(city, "Building", building, state)) {
            aiInfo(`[AI Build] ${profile.civName} ECONOMY: ${building}`);
            return { type: "Building", id: building };
        }
    }

    // Note: Bulwark moved to Priority 4.6

    // =========================================================================
    // FALLBACK: More military
    // =========================================================================
    const fallbackUnit = getBestUnitForRole("capture", unlockedUnits) ?? UnitType.SpearGuard;
    if (canBuild(city, "Unit", fallbackUnit, state)) {
        aiInfo(`[AI Build] ${profile.civName} FALLBACK: ${fallbackUnit}`);
        return { type: "Unit", id: fallbackUnit };
    }

    return null;
}
