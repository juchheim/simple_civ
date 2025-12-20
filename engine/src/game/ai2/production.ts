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
import { getAiMemoryV2 } from "./memory.js";

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
    // v6.6h: GARRISON REPLENISHMENT when Titan pulls escorts
    // =========================================================================
    // When our Titan exists and is pulling units, undefended cities should
    // immediately start building replacement military units
    const ourTitan = state.units.find(u => u.type === UnitType.Titan && u.ownerId === playerId);
    const thisCityHasGarrison = cityHasGarrison(state, city);

    if (ourTitan && !thisCityHasGarrison) {
        aiInfo(`[AI Build] ${profile.civName} GARRISON REPLENISHMENT: City ${city.name} is undefended (Titan escort pulled units)`);

        // Build fast military unit to replace pulled garrison
        const garrisonOptions = [UnitType.SpearGuard, UnitType.ArmySpearGuard, UnitType.BowGuard];
        for (const unit of garrisonOptions) {
            if (canBuild(city, "Unit", unit, state)) {
                return { type: "Unit", id: unit };
            }
        }
    }

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
    // EMERGENCY: Defensive Civs Under Attack
    // =========================================================================
    // v6.5: Scholar/Starborne have 38%/33% elimination rates. When at war,
    // they need to immediately prioritize military production.
    const WAR_EMERGENCY_THRESHOLD = 6;  // Need at least 6 military to survive
    if (isDefensiveCiv(profile.civName) && atWar && myMilitary < WAR_EMERGENCY_THRESHOLD) {
        aiInfo(`[AI Build] ${profile.civName} WAR EMERGENCY: Under attack! Military: ${myMilitary}/${WAR_EMERGENCY_THRESHOLD}`);

        // BowGuard is best for defense (ranged, no retaliation)
        if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
            return { type: "Unit", id: UnitType.BowGuard };
        }
        // SpearGuard as fallback
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            return { type: "Unit", id: UnitType.SpearGuard };
        }
        // Army units if available
        if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
            return { type: "Unit", id: UnitType.ArmyBowGuard };
        }
        if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
            return { type: "Unit", id: UnitType.ArmySpearGuard };
        }
    }

    // =========================================================================
    // PRIORITY 0.4: RiverLeague Early Military Boost
    // =========================================================================
    // v6.6m: RiverLeague declined to 16.7% win rate after balance changes.
    // Give them an early military advantage - build extra BowGuard before expansion.
    if (profile.civName === "RiverLeague" && state.turn < 25) {
        const currentMilitary = state.units.filter(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            u.type !== UnitType.Scout
        ).length;

        // RiverLeague wants 3 military early (1 more than standard civs)
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
    }

    // =========================================================================
    // PRIORITY 0.5: Early Military for Defensive Civs (before CityWards)
    // =========================================================================
    // v6.6: FIXED - Previous logic blocked expansion entirely until 4 military.
    // ScholarKingdoms was stuck with 1 city building military forever.
    // NEW: Require only 2 military before allowing settlers, then INTERLEAVE.
    if (isDefensiveCiv(profile.civName) && state.turn > 10) {
        if (!player.techs.includes(TechId.CityWards)) {
            const currentMilitary = state.units.filter(u =>
                u.ownerId === playerId &&
                UNITS[u.type].domain !== "Civilian" &&
                u.type !== UnitType.Scout
            ).length;

            // v6.6: Lower threshold to START expanding - only need 2 military
            // This prevents the "stuck on 1 city" problem
            const MIN_MILITARY_TO_EXPAND = 2;

            if (currentMilitary < MIN_MILITARY_TO_EXPAND) {
                // Must have at least 2 military before any expansion
                if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
                    aiInfo(`[AI Build] ${profile.civName} EARLY DEFENSE: BowGuard (${currentMilitary}/${MIN_MILITARY_TO_EXPAND} min)`);
                    return { type: "Unit", id: UnitType.BowGuard };
                }
                if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
                    aiInfo(`[AI Build] ${profile.civName} EARLY DEFENSE: SpearGuard (${currentMilitary}/${MIN_MILITARY_TO_EXPAND} min)`);
                    return { type: "Unit", id: UnitType.SpearGuard };
                }
            }
            // v6.6: Once we have 2+ military, INTERLEAVE settlers and military
            // Don't block expansion entirely
        }
    }

    // =========================================================================
    // PRIORITY 0.7: Early Expansion (Aggressive Land Grab)
    // =========================================================================
    // v6.6: Defensive civs MUST expand early to survive. This is CRITICAL.
    // ScholarKingdoms was ending games with 1.4 avg cities (should be 4).
    if (isDefensiveCiv(profile.civName) && (state.turn < 80 || phase === "Expand")) {
        const settlerCap = profile.build.settlerCap;
        const desiredCities = profile.build.desiredCities;

        // If we have room to grow and capacity to build
        if (myCities.length < desiredCities && settlersInFlight(state, playerId) < settlerCap) {
            // v6.6: Lower military check - only 2 needed (was implicit 4)
            const currentMilitary = state.units.filter(u =>
                u.ownerId === playerId &&
                UNITS[u.type].domain !== "Civilian" &&
                u.type !== UnitType.Scout
            ).length;

            // Allow expansion once we have 2 military (down from 4)
            if (currentMilitary >= 2 && canBuild(city, "Unit", UnitType.Settler, state)) {
                aiInfo(`[AI Build] ${profile.civName} EARLY EXPANSION: Settler (${myCities.length}/${desiredCities} cities)`);
                return { type: "Unit", id: UnitType.Settler };
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

    // v6.1: Monster Trigger (e.g., Jade Covenant with 10 cities)
    // If we are huge, we can afford to pursue Progress in parallel with Conquest.
    const hasMonsterEmpire = myCities.length >= 8 && hasStarCharts;

    // v6.5: STALL PREVENTION - If tech tree is complete, FORCE Progress chain completion
    // Analysis showed games stalling at turn 300 with 20 techs but no Victory
    // If you have 20 techs and Observatory, you MUST continue to Grand Academy/Experiment
    const FULL_TECH_TREE_SIZE = 20;
    const techTreeComplete = player.techs.length >= FULL_TECH_TREE_SIZE;
    const hasIncompleteProgressChain = hasObservatory && !player.completedProjects.includes(ProjectId.GrandExperiment);
    const forceProgressFinish = techTreeComplete && hasIncompleteProgressChain;

    // v6.6: Very late game - always pursue Progress as backup
    // Lowered from 200 to 150 to reduce 14.2% stall rate
    const veryLateGamePush = state.turn >= 150 && hasStarCharts;

    if (hasStarCharts && (hasInvestedInProgress || lateGameProgressTrigger || hasMonsterEmpire || forceProgressFinish || veryLateGamePush)) {
        // Check if ANY of our cities is currently building a Progress project
        const anyBuildingProgress = myCities.some(c =>
            c.currentBuild?.type === "Project" &&
            [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment].includes(c.currentBuild.id as ProjectId)
        );

        // Only assign ONE city to Progress at a time (other cities can do military)
        // EXCEPTION: forceProgressFinish allows multiple cities to work on it
        const allowMultipleCities = forceProgressFinish || veryLateGamePush;
        if (!anyBuildingProgress || allowMultipleCities) {
            const progressProjects = [ProjectId.GrandExperiment, ProjectId.GrandAcademy, ProjectId.Observatory];
            for (const pid of progressProjects) {
                if (canBuild(city, "Project", pid, state)) {
                    const reason = forceProgressFinish ? "STALL PREVENTION" :
                        veryLateGamePush ? "VERY LATE GAME" : "backup victory path";
                    aiInfo(`[AI Build] ${profile.civName} HYBRID: ${pid} (${reason})`);
                    return { type: "Project", id: pid };
                }
            }
        }
    }


    // =========================================================================
    // PRIORITY 1.5: Tech Unlock Priority - Build units from newly researched techs
    // =========================================================================

    // Landship FIRST: If we researched CompositeArmor and at war/Execute phase
    // v6.1: Landship is CORE late game unit. Increase cap to 8.
    if (player.techs.includes(TechId.CompositeArmor) && (atWar || phase === "Execute")) {
        const currentLandships = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Landship).length;
        if (currentLandships < 8 && canBuild(city, "Unit", UnitType.Landship, state)) {
            aiInfo(`[AI Build] ${profile.civName} TECH UNLOCK: Landship (${currentLandships}/8)`);
            return { type: "Unit", id: UnitType.Landship };
        }
    }

    // Airship SECOND: Niche support unit
    // v6.1: ONLY build if we already have Landships (Core). Don't build Airships in isolation.
    if (player.techs.includes(TechId.Aerodynamics)) {
        const currentLandships = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Landship).length;
        const currentAirships = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Airship).length;

        // Strict Condition: Must have 2+ Landships first
        if (currentLandships >= 2) {
            const airshipCap = Math.min(2, myCities.length); // Max 1 per city, cap at 2
            if (currentAirships < airshipCap && canBuild(city, "Unit", UnitType.Airship, state)) {
                aiInfo(`[AI Build] ${profile.civName} TECH UNLOCK: Airship (${currentAirships}/${airshipCap}) - Have Landships`);
                return { type: "Unit", id: UnitType.Airship };
            }
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

        // =====================================================================
        // PRIORITY 2.5: Titan Escort Production (ArmyRiders ONLY)
        // =====================================================================
        // Build ArmyRiders as Titan escorts - they have 2 movement to match Titan's 2 move.
        // Triggers when: SteamForges researched AND (titanCoreCityId set OR core building)
        // Target: 5-6 ArmyRiders before Titan spawns
        const memory = getAiMemoryV2(state, playerId);
        const isBuildingCore = myCities.some(c =>
            c.currentBuild?.type === "Building" && c.currentBuild?.id === BuildingType.TitansCore
        );
        const isPrepForTitan = player.techs.includes(TechId.SteamForges) &&
            (memory.titanCoreCityId || isBuildingCore) &&
            !hasTitan;

        if (isPrepForTitan && player.techs.includes(TechId.ArmyDoctrine)) {
            const currentRiders = state.units.filter(u =>
                u.ownerId === playerId && u.type === UnitType.ArmyRiders
            ).length;
            const TITAN_ESCORT_TARGET = 6; // Target 6 ArmyRiders for proper deathball

            if (currentRiders < TITAN_ESCORT_TARGET) {
                if (canBuild(city, "Unit", UnitType.ArmyRiders, state)) {
                    aiInfo(`[AI Build] AetherianVanguard TITAN ESCORT: ArmyRiders (${currentRiders}/${TITAN_ESCORT_TARGET})`);
                    return { type: "Unit", id: UnitType.ArmyRiders };
                }
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
