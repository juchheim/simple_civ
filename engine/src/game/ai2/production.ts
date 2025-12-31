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
import { AiVictoryGoal, City, DiplomacyState, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { aiInfo } from "../ai/debug-logging.js";
import { isCombatUnitType } from "./schema.js";
import { UNIT_ROLES } from "./capabilities.js";
import {
    assessCapabilities,
    findCapabilityGaps,
    getGoalRequirements,
    getBestUnitForRole,
    getGamePhase
} from "./strategic-plan.js";
import { isWarEmergency, pickCityUnderAttackBuild } from "./production/emergency.js";
import { pickCapabilityGapBuild } from "./production/capability-gaps.js";
import { pickVictoryProject } from "./production/victory.js";
import { pickEconomyBuilding } from "./production/economy.js";
import {
    pickAetherianVanguardBuild,
    pickDefensiveArmyBuild,
    pickDefensiveEarlyMilitaryBuild,
    pickDefensiveLorekeeperBuild,
    pickRiverLeagueEarlyBoost
} from "./production/civ-builds.js";
import { resolveInterleave, shouldPrioritizeDefense } from "./production/defense-priority.js";
import { pickTechUnlockBuild } from "./production/tech-unlocks.js";
import { getUnlockedUnits } from "./production/unlocks.js";
import { pickPhaseDefensePriorityBuild, pickPhaseDefenseSupportBuild } from "./production/phases/defense.js";
import { pickPhaseEarlyExpansionBuild, pickPhaseExpansionBuild } from "./production/phases/expansion.js";
import { pickPhaseWarBuild } from "./production/phases/war.js";
import { assessCityThreatLevel } from "./defense-situation/scoring.js";

export { shouldPrioritizeDefense } from "./production/defense-priority.js";

export type BuildOption = { type: "Unit" | "Building" | "Project"; id: string; markAsHomeDefender?: boolean };

type BuildPicker = () => BuildOption | null;

function pickFirstBuild(pickers: BuildPicker[]): BuildOption | null {
    for (const pick of pickers) {
        const result = pick();
        if (result) return result;
    }
    return null;
}

// =============================================================================
// MAIN PRODUCTION SELECTION
// =============================================================================

export type ProductionContext = {
    player: GameState["players"][number];
    profile: ReturnType<typeof getAiProfileV2>;
    phase: ReturnType<typeof getGamePhase>;
    myCities: City[];
    myUnits: GameState["units"];
    myMilitaryUnits: GameState["units"];
    unlockedUnits: ReturnType<typeof getUnlockedUnits>;
    capabilities: ReturnType<typeof assessCapabilities>;
    gaps: ReturnType<typeof findCapabilityGaps>;
    warEnemies: GameState["players"];
    warEnemyIds: Set<string>;
    aliveEnemyIds: Set<string>;
    atWar: boolean;
    thisCityThreat: ReturnType<typeof assessCityThreatLevel>;
};

function buildProductionContext(
    state: GameState,
    playerId: string,
    city: City,
    goal: AiVictoryGoal
): ProductionContext | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    const profile = getAiProfileV2(state, playerId);
    const phase = getGamePhase(state);
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const myMilitaryUnits = myUnits.filter(u => isCombatUnitType(u.type));
    const unlockedUnits = getUnlockedUnits(player.techs);
    const requirements = getGoalRequirements(goal, profile.civName, phase, myCities.length);
    const capabilities = assessCapabilities(state, playerId);
    const gaps = findCapabilityGaps(capabilities, requirements);

    const warEnemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
    const warEnemyIds = new Set(warEnemies.map(p => p.id));
    const aliveEnemyIds = new Set(
        state.players.filter(p => p.id !== playerId && !p.isEliminated).map(p => p.id)
    );
    const atWar = warEnemies.length > 0;
    const thisCityThreat = assessCityThreatLevel(state, city, playerId);

    return {
        player,
        profile,
        phase,
        myCities,
        myUnits,
        myMilitaryUnits,
        unlockedUnits,
        capabilities,
        gaps,
        warEnemies,
        warEnemyIds,
        aliveEnemyIds,
        atWar,
        thisCityThreat,
    };
}

export function chooseCityBuildV2(state: GameState, playerId: string, city: City, goal: AiVictoryGoal): BuildOption | null {
    if (city.currentBuild) return null;

    const context = buildProductionContext(state, playerId, city, goal);
    if (!context) return null;
    const {
        player,
        profile,
        phase,
        myCities,
        unlockedUnits,
        atWar,
    } = context;

    const urgentBuild = pickFirstBuild([
        () => pickCityUnderAttackBuild(state, city, context),
        // =========================================================================
        // v7.9: WAR STAGING PRODUCTION - Build offensive units before declaring war
        // =========================================================================
        () => pickPhaseWarBuild(state, playerId, city, context),
    ]);
    if (urgentBuild) {
        return urgentBuild;
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

    const earlyBuild = pickFirstBuild([
        () => pickPhaseDefensePriorityBuild(state, city, context, defenseDecision, shouldBuildDefender),
        // =========================================================================
        // PRIORITY 0.4: RiverLeague Early Military Boost
        // =========================================================================
        // v6.6m: RiverLeague declined to 16.7% win rate after balance changes.
        // Give them an early military advantage - build extra BowGuard before expansion.
        () => pickRiverLeagueEarlyBoost(state, city, context),
        // =========================================================================
        // PRIORITY 0.5: Early Military for Defensive Civs (before CityWards)
        // =========================================================================
        // v6.6: FIXED - Previous logic blocked expansion entirely until 4 military.
        // ScholarKingdoms was stuck with 1 city building military forever.
        // NEW: Require only 2 military before allowing settlers, then INTERLEAVE.
        () => pickDefensiveEarlyMilitaryBuild(state, city, context),
        () => pickPhaseEarlyExpansionBuild(state, playerId, city, context, defenseDecision),
        // =========================================================================
        // PRIORITY 0.8: Lorekeeper for Defensive Civs (non-Bulwark cities only)
        // =========================================================================
        // ScholarKingdoms/StarborneSeekers get Lorekeeper as their main defensive unit
        // IMPORTANT: Only non-Bulwark cities build Lorekeepers
        // Bulwark cities focus on Victory projects (Priority 1)
        () => pickDefensiveLorekeeperBuild(state, city, context),
        // =========================================================================
        // PRIORITY 0.9: Army Units for Defensive Civs
        // =========================================================================
        // v8.3: Removed Bulwark restriction - ALL cities can now build Army units
        () => pickDefensiveArmyBuild(state, city, context),
    ]);
    if (earlyBuild) {
        return earlyBuild;
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


    const standardBuild = pickFirstBuild([
        // =========================================================================
        // PRIORITY 1.5: Tech Unlock Priority - Build units from newly researched techs
        // =========================================================================
        () => pickTechUnlockBuild(state, city, context),
        // =========================================================================
        // PRIORITY 2: AetherianVanguard Titan Rush
        // =========================================================================
        () => pickAetherianVanguardBuild(state, city, context),
        // =========================================================================
        // PRIORITY 3: Garrison Undefended Cities
        // =========================================================================
        () => pickPhaseDefenseSupportBuild(state, city, goal, context, defenseDecision),
        // =========================================================================
        // PRIORITY 5: Fill Capability Gaps
        // =========================================================================
        () => pickCapabilityGapBuild(state, city, context),
        // =========================================================================
        // PRIORITY 6: Expansion (Settlers) - Only when safe
        // =========================================================================
        // v2.2: Removed !atWar check. Priority 5 (Capability Gaps) already ensures we build units if we need them.
        // Blocking expansion just because we are at war (even if winning/defended) causes defensive civs to turtle and die.
        () => pickPhaseExpansionBuild(state, playerId, city, context, defenseDecision),
        // =========================================================================
        // PRIORITY 7: Economy Buildings
        // =========================================================================
        () => pickEconomyBuilding(state, playerId, city, profile.civName),
    ]);
    if (standardBuild) return standardBuild;

    // =========================================================================
    // FALLBACK: More military (Balanced Composition)
    // =========================================================================
    // v8.5: Enforce 3:2:1 ratio for Starborne/others (Spear : Bow : Rider)
    const myMilitary = context.myUnits.filter(u => isCombatUnitType(u.type));

    // Count specific roles (grouping base and army variants)
    const spearCount = myMilitary.filter(u => u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard).length;
    const bowCount = myMilitary.filter(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard).length;
    const riderCount = myMilitary.filter(u => u.type === UnitType.Riders || u.type === UnitType.ArmyRiders).length;
    const totalCount = spearCount + bowCount + riderCount;

    // Ideal Ratio: 3/6 Spear, 2/6 Bow, 1/6 Rider
    // We calculate "deficit" = Expected - Actual. Highest deficit gets priority.
    // Scale total by a small amount to avoid div/0 and ensure growth.
    const baseline = Math.max(6, totalCount + 1);

    const targetSpear = Math.floor(baseline * (3 / 6));
    const targetBow = Math.floor(baseline * (2 / 6));
    const targetRider = Math.floor(baseline * (1 / 6));

    const spearDeficit = targetSpear - spearCount;
    const bowDeficit = targetBow - bowCount;
    const riderDeficit = targetRider - riderCount;

    let fallbackUnit: UnitType | null = null;

    // Pick the one with highest deficit that we can actually build
    const deficits = [
        { type: "rider", val: riderDeficit, role: "capture" }, // Rider is capture role
        { type: "bow", val: bowDeficit, role: "defense" },     // Bow is defense/siege role
        { type: "spear", val: spearDeficit, role: "capture" }  // Spear is capture role
    ].sort((a, b) => b.val - a.val);

    for (const d of deficits) {
        // Try to get best unit for this "slot"
        if (d.type === "rider") {
            // Specific check for Riders since they share "capture" role with Spears
            if (unlockedUnits.includes(UnitType.ArmyRiders)) fallbackUnit = UnitType.ArmyRiders;
            else if (unlockedUnits.includes(UnitType.Riders)) fallbackUnit = UnitType.Riders;
        } else if (d.type === "bow") {
            fallbackUnit = getBestUnitForRole("defense", unlockedUnits) ?? getBestUnitForRole("siege", unlockedUnits);
            // Ensure it's a bow type if possible
            if (fallbackUnit && !String(fallbackUnit).includes("Bow")) {
                if (unlockedUnits.includes(UnitType.ArmyBowGuard)) fallbackUnit = UnitType.ArmyBowGuard;
                else if (unlockedUnits.includes(UnitType.BowGuard)) fallbackUnit = UnitType.BowGuard;
            }
        } else {
            // Spear (default capture)
            fallbackUnit = getBestUnitForRole("capture", unlockedUnits);
            // Prefer Spear if it's generic capture, unless we really want something else
            if (fallbackUnit && !String(fallbackUnit).includes("Spear") && !String(fallbackUnit).includes("Titan") && !String(fallbackUnit).includes("Landship")) {
                if (unlockedUnits.includes(UnitType.ArmySpearGuard)) fallbackUnit = UnitType.ArmySpearGuard;
                else if (unlockedUnits.includes(UnitType.SpearGuard)) fallbackUnit = UnitType.SpearGuard;
            }
        }

        if (fallbackUnit && canBuild(city, "Unit", fallbackUnit, state)) {
            aiInfo(`[AI Build] ${profile.civName} FALLBACK (3:2:1): ${fallbackUnit} (Deficits: S:${spearDeficit} B:${bowDeficit} R:${riderDeficit})`);
            return { type: "Unit", id: fallbackUnit };
        }
    }

    // Ultimate fallback
    fallbackUnit = getBestUnitForRole("capture", unlockedUnits) ?? UnitType.SpearGuard;
    if (canBuild(city, "Unit", fallbackUnit, state)) {
        aiInfo(`[AI Build] ${profile.civName} FALLBACK (Default): ${fallbackUnit}`);
        return { type: "Unit", id: fallbackUnit };
    }

    return null;
}
