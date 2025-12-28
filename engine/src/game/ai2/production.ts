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
import { AiVictoryGoal, BuildingType, City, DiplomacyState, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { hexDistance } from "../../core/hex.js";
import { aiInfo } from "../ai/debug-logging.js";
import { isDefensiveCiv } from "../helpers/civ-helpers.js";
import { getThreatLevel } from "../ai/units/unit-helpers.js";
import { estimateMilitaryPower } from "../ai/goals.js";
import { UNITS, TERRITORIAL_DEFENDERS_PER_CITY, DEFENSIVE_CIV_DEFENDER_MULTIPLIER } from "../../core/constants.js";
import {
    assessCapabilities,
    findCapabilityGaps,
    getGoalRequirements,
    getBestUnitForRole,
    getGamePhase
} from "./strategic-plan.js";
import { UNIT_ROLES } from "./capabilities.js";
import { getAiMemoryV2 } from "./memory.js";
import { countMilitary, isWarEmergency } from "./production/emergency.js";
import { pickVictoryProject } from "./production/victory.js";
import { pickEconomyBuilding } from "./production/economy.js";
import { pickWarStagingProduction } from "./production/staging.js";

export type BuildOption = { type: "Unit" | "Building" | "Project"; id: string; markAsHomeDefender?: boolean };

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

/**
 * v7.2: Intelligent Expansion vs Defense Decision
 * 
 * Determines whether a city should prioritize building defensive units over settlers.
 * Uses multiple factors: power ratio, threat level, war status, game phase, and randomness.
 * 
 * Returns: "defend" | "expand" | "interleave"
 * - "defend" = Build defensive unit
 * - "expand" = Build settler/economy
 * - "interleave" = Use weighted random (60% expand, 40% defend by default)
 */
export function shouldPrioritizeDefense(
    state: GameState,
    city: City,
    playerId: string,
    phase: "Expand" | "Develop" | "Execute"
): "defend" | "expand" | "interleave" {
    const threat = getThreatLevel(state, city, playerId);
    const myCities = state.cities.filter(c => c.ownerId === playerId);

    // Check if at war with anyone
    const atWar = state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );

    // Calculate power ratio vs nearest enemy
    const myPower = estimateMilitaryPower(playerId, state);
    const enemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );

    let maxEnemyPower = 0;
    for (const enemy of enemies) {
        const enemyPower = estimateMilitaryPower(enemy.id, state);
        if (enemyPower > maxEnemyPower) maxEnemyPower = enemyPower;
    }
    const powerRatio = maxEnemyPower > 0 ? myPower / maxEnemyPower : Infinity;

    // ==== DECISION LOGIC ====

    // 1. CRITICAL THREAT: Always defend
    if (threat === "critical") {
        return "defend";
    }

    // 1.5. STARCHARTS: Civs with StarCharts should pursue Progress victory
    // Don't let defense priority block Grand Experiment production
    const player = state.players.find(p => p.id === playerId);
    if (player?.techs?.includes(TechId.StarCharts)) {
        return "expand"; // Let production logic build Observatory/Academy/Experiment
    }

    // 2. STRONG POSITION + NOT AT WAR: Favor expansion
    if (powerRatio >= 2.0 && !atWar) {
        return "expand";
    }

    // 2.5: COUNTER-ATTACK TRANSITION (Item 6)
    // If we are significantly stronger than the enemy even during war,
    // transition to expansion/offense to close out the game.
    if (atWar && powerRatio >= 1.5) {
        return "expand";
    }

    // 3. EARLY GAME: Expansion is critical (need cities first)
    if (phase === "Expand" && myCities.length < 3 && threat !== "high") {
        return "expand";
    }

    // 4. AT WAR + HIGH THREAT: Defend urgently
    if (atWar && threat === "high") {
        return "defend";
    }

    // 5. WEAK POSITION (power ratio < 1.0): Prioritize defense
    if (powerRatio < 1.0 && atWar) {
        return "defend";
    }

    // 6. NO THREAT + PEACE: Expansion friendly
    if (threat === "none" && !atWar) {
        return "expand";
    }

    // 7. UNCERTAIN SITUATIONS: Interleave
    // Uses weighted random based on power ratio
    // Higher power = more expansion, lower power = more defense
    return "interleave";
}

/**
 * Execute the interleave decision with weighted randomness
 * Returns true if should build defender, false if should expand
 * v7.2: Added cityIndex for per-city random seed (different cities make different decisions)
 */
function resolveInterleave(state: GameState, playerId: string, cityIndex: number = 0): boolean {
    // Calculate defense weight based on power ratio
    const myPower = estimateMilitaryPower(playerId, state);
    const enemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );

    let maxEnemyPower = 0;
    for (const enemy of enemies) {
        const enemyPower = estimateMilitaryPower(enemy.id, state);
        if (enemyPower > maxEnemyPower) maxEnemyPower = enemyPower;
    }

    // Defense weight: 0.3 (strong) to 0.7 (weak)
    // powerRatio >= 2.0 = 0.3 defense weight (30% chance to defend)
    // powerRatio <= 0.5 = 0.7 defense weight (70% chance to defend)
    let defenseWeight = 0.5; // Default 50/50
    if (maxEnemyPower > 0) {
        const powerRatio = myPower / maxEnemyPower;
        defenseWeight = Math.max(0.3, Math.min(0.7, 1.1 - powerRatio * 0.4));
    }

    // v7.2: Use turn number + cityIndex as pseudo-random seed
    // This ensures each city makes a different decision, enabling true interleaving
    const pseudoRandom = ((state.turn * 7 + cityIndex * 13) % 100) / 100;

    return pseudoRandom < defenseWeight;
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
    // v7.9: EMERGENCY - City Under Direct Attack (highest priority)
    // =========================================================================
    // If enemy units are within 2 tiles of this city, immediately produce defenders
    // This ensures AI reacts quickly when being invaded, not waiting for normal production
    const enemyPlayers = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
    const enemyUnitsNearCity = state.units.filter(u =>
        enemyPlayers.some(ep => ep.id === u.ownerId) &&
        UNITS[u.type].domain !== "Civilian" &&
        u.type !== UnitType.Scout &&
        hexDistance(u.coord, city.coord) <= 2
    );

    if (enemyUnitsNearCity.length > 0) {
        // City is under direct attack! Emergency production
        aiInfo(`[AI Build] ${profile.civName} EMERGENCY: ${city.name} under attack by ${enemyUnitsNearCity.length} enemies!`);

        // v1.0.9: Defensive civs prioritize Lorekeeper in emergencies (high def, ranged)
        if (isDefensiveCiv(profile.civName) && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
            return { type: "Unit", id: UnitType.Lorekeeper };
        }

        // Count what we have defending - prioritize what we're missing
        const nearbyRanged = state.units.filter(u =>
            u.ownerId === playerId &&
            (u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard || u.type === UnitType.Lorekeeper) &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;
        const nearbyMelee = state.units.filter(u =>
            u.ownerId === playerId &&
            (u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard) &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;

        // Build whichever we have fewer of (balanced defense)
        if (nearbyRanged <= nearbyMelee) {
            // Need ranged
            if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
                return { type: "Unit", id: UnitType.ArmyBowGuard };
            }
            if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
                return { type: "Unit", id: UnitType.BowGuard };
            }
        }
        // Need melee
        if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
            return { type: "Unit", id: UnitType.ArmySpearGuard };
        }
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            return { type: "Unit", id: UnitType.SpearGuard };
        }
        // Any military
        if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
            return { type: "Unit", id: UnitType.ArmyBowGuard };
        }
        if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
            return { type: "Unit", id: UnitType.BowGuard };
        }
    }

    // =========================================================================
    // v7.9: WAR STAGING PRODUCTION - Build offensive units before declaring war
    // =========================================================================
    const stagingBuild = pickWarStagingProduction(state, playerId, city);
    if (stagingBuild) {
        return stagingBuild;
    }

    const thisCityThreat = getThreatLevel(state, city, playerId);
    const cityNotThreatened = thisCityThreat === "none" || thisCityThreat === "low";

    // =========================================================================
    // v1.0.4: TREBUCHET PRODUCTION - Build siege units during active war
    // =========================================================================
    // Siege-focused civs build trebuchets when at war. Cap scales with army size.
    const siegeFocusedCivs = ["ForgeClans", "RiverLeague", "JadeCovenant", "AetherianVanguard"];
    if (atWar && siegeFocusedCivs.includes(profile.civName) && cityNotThreatened) {
        const trebuchetsTotal = state.units.filter(u =>
            u.ownerId === playerId && u.type === UnitType.Trebuchet
        ).length;
        // v1.0.4: Scale cap with army size (1 per 4 military, min 2, max 4)
        const militaryForCap = state.units.filter(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            u.type !== UnitType.Scout
        ).length;
        const trebuchetCap = Math.min(4, Math.max(2, Math.floor(militaryForCap / 4)));

        if (trebuchetsTotal < trebuchetCap) {
            if (canBuild(city, "Unit", UnitType.Trebuchet, state)) {
                aiInfo(`[AI Build] ${profile.civName} AT WAR: Trebuchet for siege (${trebuchetsTotal}/${trebuchetCap})`);
                return { type: "Unit", id: UnitType.Trebuchet };
            }
        }
    }

    // =========================================================================
    // v6.6h: GARRISON REPLENISHMENT when Titan pulls escorts
    // =========================================================================
    // When our Titan exists and is pulling units, undefended cities should
    // immediately start building replacement military units
    const ourTitan = state.units.find(u => u.type === UnitType.Titan && u.ownerId === playerId);
    const thisCityHasGarrison = cityHasGarrison(state, city);

    if (ourTitan && !thisCityHasGarrison) {
        aiInfo(`[AI Build] ${profile.civName} GARRISON REPLENISHMENT: City ${city.name} is undefended (Titan escort pulled units)`);

        // v1.0.9: Defensive civs prioritize Lorekeeper for garrison replenishment
        if (isDefensiveCiv(profile.civName) && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
            return { type: "Unit", id: UnitType.Lorekeeper };
        }

        // v7.9: Alternate between melee and ranged for better unit mix
        // Use turn + city hash for pseudo-random selection to get varied compositions
        const preferRanged = ((state.turn + city.id.charCodeAt(0)) % 2) === 0;

        if (preferRanged) {
            if (canBuild(city, "Unit", UnitType.ArmyBowGuard, state)) {
                return { type: "Unit", id: UnitType.ArmyBowGuard };
            }
            if (canBuild(city, "Unit", UnitType.BowGuard, state)) {
                return { type: "Unit", id: UnitType.BowGuard };
            }
        }
        // Fallback to melee capturers
        if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
            return { type: "Unit", id: UnitType.ArmySpearGuard };
        }
        if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
            return { type: "Unit", id: UnitType.SpearGuard };
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

        // v1.0.9: Lorekeeper is the best defender for Scholar/Starborne (high def, ranged, territory bonus)
        if (canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
            return { type: "Unit", id: UnitType.Lorekeeper };
        }
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
    // PRIORITY 0.3: Intelligent Expansion vs Defense Decision (v7.2)
    // =========================================================================
    // Uses shouldPrioritizeDefense() to intelligently choose between expansion
    // and defense based on power ratio, threat level, war status, and game phase.
    // Cities COME FIRST - you can't defend what you don't have!

    // v7.2: PROGRESS BYPASS - If we have StarCharts and NO city is building Progress,
    // skip defense for this city so it can build Progress projects.
    // This prevents defense from blocking Progress victory in late game stalemates.
    const hasStarChartsForBypass = player.techs.includes(TechId.StarCharts);
    const anyBuildingProgressForBypass = myCities.some(c =>
        c.currentBuild?.type === "Project" &&
        [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment].includes(c.currentBuild.id as ProjectId)
    );
    const progressBypassing = hasStarChartsForBypass && !anyBuildingProgressForBypass;

    const defenseDecision = shouldPrioritizeDefense(state, city, playerId, phase);

    // v7.2: Calculate city index for per-city random seed in interleaving
    const cityIndex = myCities.findIndex(c => c.id === city.id);

    // Only build defender if decision is "defend" OR "interleave" resolves to defense
    // UNLESS we're bypassing for Progress
    const shouldBuildDefender = !progressBypassing && (
        defenseDecision === "defend" ||
        (defenseDecision === "interleave" && resolveInterleave(state, playerId, cityIndex))
    );

    if (shouldBuildDefender) {
        // Calculate how many defenders this city should have
        const isCapitalCity = city.isCapital;

        // Check if this is a perimeter city (simplified check - closest to enemies)
        const enemyPlayers = state.players.filter(p => p.id !== playerId && !p.isEliminated);
        const enemyCities = state.cities.filter(c => enemyPlayers.some(ep => ep.id === c.ownerId));
        const enemyUnitsNearby = state.units.filter(u =>
            enemyPlayers.some(ep => ep.id === u.ownerId) &&
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

        // If closer than 5 tiles to enemy, consider it perimeter
        const isPerimeter = minEnemyDist <= 5;

        // Determine desired defenders
        // v7.2: Use perimeter status for capital too. Safe capital only needs 1 garrison.
        const desiredTotal = isCapitalCity ? (isPerimeter ? 4 : 1) : (isPerimeter ? 3 : 1);

        // Count current defenders (garrison + ring)
        const hasGarrison = state.units.some(u =>
            u.ownerId === playerId &&
            u.coord.q === city.coord.q &&
            u.coord.r === city.coord.r &&
            UNITS[u.type].domain !== "Civilian"
        ) ? 1 : 0;

        const ringDefenders = state.units.filter(u =>
            u.ownerId === playerId &&
            hexDistance(u.coord, city.coord) === 1 &&
            UNITS[u.type].domain !== "Civilian"
        ).length;

        const currentTotal = hasGarrison + ringDefenders;

        if (currentTotal < desiredTotal) {
            aiInfo(`[AI Build] ${profile.civName} DEFENSE PRIORITY (${defenseDecision}): ${city.name} needs defenders (${currentTotal}/${desiredTotal})`);

            // v7.9: Alternate between ranged and melee for balanced defense composition
            // A good defense needs both: ranged to chip away, melee to capture/block
            // Count existing unit types to determine what we need more of
            const existingRanged = state.units.filter(u =>
                u.ownerId === playerId &&
                (u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard) &&
                hexDistance(u.coord, city.coord) <= 2
            ).length;
            const existingMelee = state.units.filter(u =>
                u.ownerId === playerId &&
                (u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard) &&
                hexDistance(u.coord, city.coord) <= 2
            ).length;

            // Build whichever we have fewer of, or alternate based on turn
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
            // Lorekeeper for defensive civs
            if (unlockedUnits.includes(UnitType.Lorekeeper) && canBuild(city, "Unit", UnitType.Lorekeeper, state)) {
                return { type: "Unit", id: UnitType.Lorekeeper };
            }
            // Melee units
            if (canBuild(city, "Unit", UnitType.ArmySpearGuard, state)) {
                return { type: "Unit", id: UnitType.ArmySpearGuard };
            }
            if (canBuild(city, "Unit", UnitType.SpearGuard, state)) {
                return { type: "Unit", id: UnitType.SpearGuard };
            }
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
    // PRIORITY 0.7: Early Expansion (Aggressive Land Grab) - ALL CIVS
    // =========================================================================
    // v6.6: Defensive civs MUST expand early to survive. This is CRITICAL.
    // v1.0.9: Extended to ALL civs - non-defensive civs were drastically under-expanding
    // (1.7 cities/game vs 4.7 for defensive civs). Every civ needs to grab land early.
    if (state.turn < 80 || phase === "Expand") {
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

            // Allow expansion once we have 2 military (down from 4), OR if we're explicitly in expansion mode
            const expansionSafe = defenseDecision === "expand" || currentMilitary >= 2;
            if (expansionSafe && canBuild(city, "Unit", UnitType.Settler, state)) {
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
    // PRIORITY 0.9: Army Units for Defensive Civs
    // =========================================================================
    // v8.3: Removed Bulwark restriction - ALL cities can now build Army units
    if (isDefensiveCiv(profile.civName) && player.techs.includes(TechId.DrilledRanks)) {
        const currentArmyUnits = state.units.filter(u =>
            u.ownerId === playerId &&
            (u.type === UnitType.ArmySpearGuard || u.type === UnitType.ArmyBowGuard || u.type === UnitType.ArmyRiders)
        ).length;
        const desiredArmyUnits = Math.max(4, myCities.length * 2); // At least 4 Army units

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

    // =========================================================================
    // v1.0.8: UNIVERSAL WAR EMERGENCY - Don't build projects if army is gone!
    // =========================================================================
    // If we are at war and have critical military shortage (<5 units), 
    // we must rebuild army before victory projects, regardless of civ type.
    const warEmergency = isWarEmergency(state, playerId, atWar);

    if (!warEmergency) {
        const victoryProject = pickVictoryProject(state, playerId, city, goal, profile, myCities);
        if (victoryProject) return victoryProject;
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
        // PRIORITY 2.5: Titan Escort Production (ArmyRiders preferred)
        // =====================================================================
        // v1.0.9: Start building escorts when RESEARCHING SteamForges (not when complete)
        // This gives more time to build the deathball before Titan spawns.
        // Target: 6 fast units (ArmyRiders > Landship > Riders) before Titan spawns
        const isResearchingSteamForges = player.currentTech?.id === TechId.SteamForges;
        const hasSteamForges = player.techs.includes(TechId.SteamForges);
        const isPrepForTitan = (isResearchingSteamForges || hasSteamForges) && !hasTitan;

        if (isPrepForTitan) {
            // Count all fast escorts (2+ move units that can follow Titan)
            const currentEscorts = state.units.filter(u =>
                u.ownerId === playerId &&
                (u.type === UnitType.ArmyRiders || u.type === UnitType.Landship || u.type === UnitType.Riders)
            ).length;
            const TITAN_ESCORT_TARGET = 6; // Target 6 fast escorts for proper deathball

            if (currentEscorts < TITAN_ESCORT_TARGET) {
                // Priority: ArmyRiders (best) > Landship > Riders
                if (canBuild(city, "Unit", UnitType.ArmyRiders, state)) {
                    aiInfo(`[AI Build] AetherianVanguard TITAN ESCORT: ArmyRiders (${currentEscorts}/${TITAN_ESCORT_TARGET})`);
                    return { type: "Unit", id: UnitType.ArmyRiders };
                }
                if (canBuild(city, "Unit", UnitType.Landship, state)) {
                    aiInfo(`[AI Build] AetherianVanguard TITAN ESCORT: Landship (${currentEscorts}/${TITAN_ESCORT_TARGET})`);
                    return { type: "Unit", id: UnitType.Landship };
                }
                if (canBuild(city, "Unit", UnitType.Riders, state)) {
                    aiInfo(`[AI Build] AetherianVanguard TITAN ESCORT: Riders (${currentEscorts}/${TITAN_ESCORT_TARGET})`);
                    return { type: "Unit", id: UnitType.Riders };
                }
            }
        }
    }

    // =========================================================================
    // PRIORITY 3: Garrison Undefended Cities
    // =========================================================================
    if (!cityHasGarrison(state, city) && defenseDecision !== "expand") {
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
    // PRIORITY 3.5: Territorial Defenders (stay in friendly territory)
    // =========================================================================
    // All civs should maintain dedicated home defenders in addition to city garrisons.
    // These units will NOT be pulled to war, ensuring persistent territorial defense.
    // v7.1b: Also handles upgrades - if we have suboptimal defenders, build better ones.

    const currentDefenders = state.units.filter(u =>
        u.ownerId === playerId &&
        u.isHomeDefender === true
    );
    const currentDefenderCount = currentDefenders.length;

    const desiredDefenderCount = isDefensiveCiv(profile.civName)
        ? Math.ceil(myCities.length * DEFENSIVE_CIV_DEFENDER_MULTIPLIER)
        : myCities.length * TERRITORIAL_DEFENDERS_PER_CITY;

    // Determine the best defender unit we can currently build
    const bestDefenderUnit = getBestUnitForRole("defense", unlockedUnits)
        ?? getBestUnitForRole("capture", unlockedUnits);

    // For defensive civs, Lorekeeper is the ultimate defender if available
    const canBuildLorekeeper = isDefensiveCiv(profile.civName) &&
        unlockedUnits.includes(UnitType.Lorekeeper) &&
        canBuild(city, "Unit", UnitType.Lorekeeper, state);
    const preferredDefender = canBuildLorekeeper ? UnitType.Lorekeeper : bestDefenderUnit;

    // Define what counts as a "suboptimal" defender that should be upgraded
    const BASE_UNITS = [UnitType.SpearGuard, UnitType.BowGuard, UnitType.Riders];
    const ARMY_UNITS = [UnitType.ArmySpearGuard, UnitType.ArmyBowGuard, UnitType.ArmyRiders];

    // Count suboptimal defenders (regular units when we can build armies/lorekeepers)
    const hasArmyTech = player.techs.includes(TechId.DrilledRanks);
    const suboptimalDefenders = currentDefenders.filter(u => {
        // Lorekeeper is never suboptimal
        if (u.type === UnitType.Lorekeeper) return false;
        // Army units are suboptimal only if we're a defensive civ with Lorekeepers
        if (ARMY_UNITS.includes(u.type as UnitType)) {
            return canBuildLorekeeper;
        }
        // Base units are suboptimal if we have army tech OR can build lorekeepers
        if (BASE_UNITS.includes(u.type as UnitType)) {
            return hasArmyTech || canBuildLorekeeper;
        }
        return false;
    });

    // Priority 1: Replace lost defenders (fill up to quota)
    if (currentDefenderCount < desiredDefenderCount && defenseDecision !== "expand") {
        if (preferredDefender && canBuild(city, "Unit", preferredDefender, state)) {
            aiInfo(`[AI Build] ${profile.civName} TERRITORIAL DEFENDER (REPLACE): ${preferredDefender} (${currentDefenderCount}/${desiredDefenderCount})`);
            return { type: "Unit", id: preferredDefender, markAsHomeDefender: true };
        }
    }

    // Priority 2: Upgrade suboptimal defenders (build better one, release old one)
    if (suboptimalDefenders.length > 0 && preferredDefender) {
        if (canBuild(city, "Unit", preferredDefender, state)) {
            // Find the most suboptimal defender to release
            const toRelease = suboptimalDefenders[0];

            // Mark old defender for release from home duty (will join regular forces)
            const unitToRelease = state.units.find(u => u.id === toRelease.id);
            if (unitToRelease) {
                unitToRelease.isHomeDefender = false;
                aiInfo(`[AI Build] ${profile.civName} releasing ${toRelease.type} from home duty for upgrade`);
            }

            aiInfo(`[AI Build] ${profile.civName} TERRITORIAL DEFENDER (UPGRADE): ${preferredDefender} replacing ${toRelease.type}`);
            return { type: "Unit", id: preferredDefender, markAsHomeDefender: true };
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
            // v7.2: Allow expansion if all cities defended OR if we're explicitly in expansion mode
            if (capabilities.garrison >= myCities.length || defenseDecision === "expand") {
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
    const economy = pickEconomyBuilding(state, playerId, city, profile.civName);
    if (economy) return economy;

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
