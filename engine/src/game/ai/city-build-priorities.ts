import { aiInfo } from "./debug-logging.js";
import { hexDistance } from "../../core/hex.js";
import {
    AiVictoryGoal,
    BuildingType,
    GameState,
    ProjectId,
    TechId,
    UnitType,
    DiplomacyState,
} from "../../core/types.js";
import { AiPersonality, getPersonalityForPlayer } from "./personality.js";
import { UNITS } from "../../core/constants.js";
import { getProgressChainStatus } from "./progress-helpers.js";
import { isDefensiveCiv } from "../helpers/civ-helpers.js";

export type BuildOption = { type: "Unit" | "Building" | "Project"; id: string };

export function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(
        p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

/**
 * Calculate desired army size based on game state.
 * Returns the target number of military units the AI should maintain.
 */
export function calculateDesiredArmySize(state: GameState, playerId: string): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return 1;

    const personality = getPersonalityForPlayer(state, playerId);
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const cityCount = myCities.length;

    // Base: 1 unit per city minimum (for garrison)
    let desired = cityCount;

    // War preparation: 2x peacetime + siege force
    if (player.warPreparation) {
        const prepState = player.warPreparation.state;
        if (prepState === "Buildup") {
            desired = cityCount * 2 + 2; // Double + 2 for attack force
        } else if (prepState === "Gathering" || prepState === "Positioning" || prepState === "Ready") {
            desired = cityCount * 2 + 4; // Need full attack force
        }
    }

    // Active war: scale based on enemy power
    if (isAtWar(state, playerId)) {
        // Count enemy military
        const warEnemyIds = state.players
            .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
            .map(p => p.id);
        const enemyMilitary = state.units.filter(u =>
            warEnemyIds.includes(u.ownerId) &&
            UNITS[u.type].domain !== "Civilian"
        ).length;

        // Want 1.3x enemy military + garrison
        desired = Math.max(desired, Math.ceil(enemyMilitary * 1.3) + cityCount);
    }

    // v2.1: Apply personality-based army size multiplier (e.g., ForgeClans wants 50% more units)
    const armyMultiplier = personality.armySizeMultiplier ?? 1.0;
    desired = Math.ceil(desired * armyMultiplier);

    return Math.max(1, desired);
}

/**
 * Get the army deficit (how many more units we need).
 * Positive = need more units. Zero/negative = at or above target.
 */
export function getArmyDeficit(state: GameState, playerId: string): { deficit: number; currentMilitary: number; desired: number } {
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const currentMilitary = myUnits.filter(u =>
        UNITS[u.type].domain !== "Civilian" &&
        u.type !== UnitType.Scout
    ).length;

    const desired = calculateDesiredArmySize(state, playerId);

    return {
        deficit: desired - currentMilitary,
        currentMilitary,
        desired
    };
}

/**
 * Check if any active sieges need capture-capable units.
 * Returns true if we should prioritize building capture units.
 */
function siegesNeedCaptureUnits(state: GameState, playerId: string): boolean {
    const warEnemyIds = state.players
        .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
        .map(p => p.id);

    const enemyCities = state.cities.filter(c => warEnemyIds.includes(c.ownerId));

    for (const city of enemyCities) {
        // Check if we have units near this city
        const nearbyUnits = state.units.filter(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            hexDistance(u.coord, city.coord) <= 4
        );

        if (nearbyUnits.length > 0) {
            // We're engaged with this city
            const hasCaptureUnit = nearbyUnits.some(u => UNITS[u.type].canCaptureCity);
            if (!hasCaptureUnit) {
                // Siege active but no capture unit nearby
                return true;
            }
        }
    }

    return false;
}

/**
 * v2.1: Get the next progress project to build.
 * Progress projects should ALWAYS be available as fallback options, even during wartime.
 * A civ dominating militarily may find progress victory easier due to accumulated science.
 */
function getNextProgressProject(player: { techs: TechId[]; completedProjects: ProjectId[] } | undefined): BuildOption | null {
    if (!player?.techs.includes(TechId.StarCharts)) return null;
    if (!player.completedProjects.includes(ProjectId.Observatory)) {
        return { type: "Project" as const, id: ProjectId.Observatory };
    } else if (!player.completedProjects.includes(ProjectId.GrandAcademy)) {
        return { type: "Project" as const, id: ProjectId.GrandAcademy };
    } else if (!player.completedProjects.includes(ProjectId.GrandExperiment)) {
        return { type: "Project" as const, id: ProjectId.GrandExperiment };
    }
    return null; // Already completed progress victory
}

/**
 * v2.2: Progress-first priorities for designated progress city.
 * This city will always prioritize victory projects even during wartime.
 * Other cities handle military production.
 * v1.9: Added civName parameter for civ-specific science building priority.
 */
export function getProgressCityPriorities(player: { techs: TechId[]; completedProjects: ProjectId[]; civName?: string } | undefined, scoutCount: number): BuildOption[] {
    const priorities: BuildOption[] = [];

    // v5.1: ScholarKingdoms and StarborneSeekers get CityWard -> Bulwark as TOP priority
    // Bulwark provides +2 Science and high defense for these defensive civs
    if (isDefensiveCiv(player?.civName)) {
        priorities.push({ type: "Building" as const, id: BuildingType.CityWard });
        priorities.push({ type: "Building" as const, id: BuildingType.Bulwark });  // v5.1: Core defensive building
    }

    // Victory projects at TOP priority
    const nextProgress = getNextProgressProject(player);
    if (nextProgress) {
        priorities.push(nextProgress);
    }

    // Scouts for exploration (cap at 2)
    if (scoutCount < 2) {
        priorities.push({ type: "Unit" as const, id: UnitType.Scout });
    }

    // Buildings that boost science/production
    priorities.push(
        { type: "Building" as const, id: BuildingType.Academy },
        { type: "Building" as const, id: BuildingType.Scriptorium },
        { type: "Project" as const, id: ProjectId.Observatory },
        { type: "Building" as const, id: BuildingType.StoneWorkshop },
        { type: "Building" as const, id: BuildingType.CityWard },
    );

    // Note: Bulwark is already pushed at TOP priority above for defensive civs
    // canBuild() prevents building a second Bulwark, so we don't need duplicate entries

    // Fallback to military if nothing else
    priorities.push(
        { type: "Unit" as const, id: UnitType.BowGuard },
        { type: "Unit" as const, id: UnitType.SpearGuard },
    );

    return priorities;
}

function buildPriorities(goal: AiVictoryGoal, personality: AiPersonality, atWar: boolean, state: GameState, playerId: string): BuildOption[] {
    const player = state.players.find(p => p.id === playerId);

    // v2.0: Army sizing intelligence
    const armyStatus = getArmyDeficit(state, playerId);

    // v2.0: Siege composition awareness
    const needsCaptureUnits = siegesNeedCaptureUnits(state, playerId);

    if (player?.civName === "ForgeClans") {
        aiInfo(`[AI Build] ForgeClans Army Check: Deficit=${armyStatus.deficit} (Curr:${armyStatus.currentMilitary}/Desired:${armyStatus.desired}) | War=${atWar} | Prep=${!!player.warPreparation}`);
    }

    // If we urgently need military (at war with deficit), force military production
    if (atWar && armyStatus.deficit >= 2) {
        aiInfo(`[AI ARMY SIZE] ${playerId} URGENT military production! Current: ${armyStatus.currentMilitary}, Need: ${armyStatus.desired}`);

        const urgentMilitary: BuildOption[] = [];

        // v2.0: AetherianVanguard special-case - Titan IS the ultimate military unit!
        // Always prioritize building Titan's Core even during urgent wartime production.
        // Once spawned, Titan (30 ATK, 30 HP) can single-handedly win wars.
        if (player?.civName === "AetherianVanguard") {
            urgentMilitary.push({ type: "Building" as const, id: BuildingType.TitansCore });
        }

        // If sieges need capture units, prioritize those
        if (needsCaptureUnits) {
            urgentMilitary.push({ type: "Unit" as const, id: UnitType.SpearGuard });
            urgentMilitary.push({ type: "Unit" as const, id: UnitType.Riders });
        }

        urgentMilitary.push(
            { type: "Unit" as const, id: UnitType.BowGuard },
            { type: "Unit" as const, id: UnitType.SpearGuard },
            { type: "Unit" as const, id: UnitType.Riders }
        );

        // Still allow essential buildings
        urgentMilitary.push({ type: "Building" as const, id: BuildingType.StoneWorkshop });

        // v2.1: Always include progress projects as fallback - never completely abandon progress victory
        const progressFallback = getNextProgressProject(player);
        if (progressFallback) urgentMilitary.push(progressFallback);

        return urgentMilitary;
    }

    // Check if player can complete victory projects - if so, prioritize them!
    const progress = getProgressChainStatus(state, playerId);

    // Identify rush item if any
    let rushItem: BuildOption | undefined;
    if (personality.projectRush) {
        const rushType = personality.projectRush.type === "Building" ? "Building" : "Project";
        rushItem = { type: rushType, id: personality.projectRush.id as string };
    }

    // Check if we are safe enough to pursue victory
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const militaryCount = myUnits.filter(u => u.type !== UnitType.Settler && u.type !== UnitType.Scout && u.type !== UnitType.Skiff).length;
    const scoutCount = myUnits.filter(u => u.type === UnitType.Scout).length;

    let safetyThreshold = 3;
    if (player?.civName === "AetherianVanguard") {
        if (state.turn > 100) safetyThreshold += 2;
        else if (state.turn > 30) safetyThreshold += 1;
    }

    let isSafeEnough = !atWar || militaryCount >= safetyThreshold;
    if (player?.civName === "AetherianVanguard") {
        isSafeEnough = militaryCount >= safetyThreshold;
    }

    // v1.9: Simplified Progress Priority using consolidated helper
    // If player has StarCharts, prioritize Progress chain (hybrid approach)
    if (progress.canStartChain && progress.nextProject) {
        aiInfo(`[AI Build] ${playerId} has StarCharts - prioritizing ${progress.nextProject}`);
        const victoryPath: BuildOption[] = [{ type: "Project" as const, id: progress.nextProject }];
        const normalPriorities = buildNormalPriorities(goal, personality, scoutCount, isSafeEnough);
        return [...victoryPath, ...normalPriorities];
    }

    // v0.96 balance: Check for army unit production opportunities (direct build when DrilledRanks unlocked)
    const hasArmyTech = player?.techs.includes(TechId.DrilledRanks) ?? false;

    // Build army priorities based on DrilledRanks unlock
    const armyPriorities: BuildOption[] = [];
    if (hasArmyTech) {
        // Prioritize Army units when we have the tech
        armyPriorities.push({ type: "Unit" as const, id: UnitType.ArmySpearGuard });
        armyPriorities.push({ type: "Unit" as const, id: UnitType.ArmyBowGuard });
        armyPriorities.push({ type: "Unit" as const, id: UnitType.ArmyRiders });
    }

    // When at war, heavily prioritize military production
    // Army formation is TOP priority if available, then varied units
    if (atWar || player?.warPreparation || goal === "Conquest") {
        // If preparing for war, we want to build up forces
        // If actually at war, we MUST build forces
        // If Conquest goal, we ALWAYS want strongest units

        if (hasArmyTech) {
            // Prioritize Army units over individual units
            const allArmyOptions: BuildOption[] = [
                { type: "Unit" as const, id: UnitType.ArmyBowGuard },
                { type: "Unit" as const, id: UnitType.ArmySpearGuard },
                { type: "Unit" as const, id: UnitType.ArmyRiders },
            ];

            // Put armies we can actually build first
            const prioritizedArmies = allArmyOptions;

            // v2.1: Always include progress projects as fallback
            const progressFallback = getNextProgressProject(player);
            return [
                ...(rushItem ? [rushItem] : []),
                ...prioritizedArmies,
                { type: "Unit" as const, id: UnitType.Settler }, // Still allow settlers if safe
                // Army units replace base units - no more SpearGuard/BowGuard/Riders fallback
                { type: "Building" as const, id: BuildingType.StoneWorkshop },
                { type: "Building" as const, id: BuildingType.Farmstead },
                ...(progressFallback ? [progressFallback] : []),
            ];
        } else {
            // No armies yet, build varied individual units
            // Check current army composition to balance melee/ranged
            const units = state.units.filter(u => u.ownerId === playerId);
            const rangedCount = units.filter(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard).length;
            const meleeCount = units.filter(u =>
                u.type === UnitType.SpearGuard || u.type === UnitType.Riders ||
                u.type === UnitType.ArmySpearGuard || u.type === UnitType.ArmyRiders
            ).length;

            // Ensure we have at least one of each if possible
            const hasSpear = units.some(u => u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard);
            const hasBow = units.some(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard);
            const hasRider = units.some(u => u.type === UnitType.Riders || u.type === UnitType.ArmyRiders);

            // Use Army units if DrilledRanks is available (obsoletes base units)
            const spearUnit = hasArmyTech ? UnitType.ArmySpearGuard : UnitType.SpearGuard;
            const bowUnit = hasArmyTech ? UnitType.ArmyBowGuard : UnitType.BowGuard;
            const riderUnit = (player?.techs.includes(TechId.ArmyDoctrine)) ? UnitType.ArmyRiders : UnitType.Riders;

            const meleeFirst: BuildOption[] = [
                { type: "Unit" as const, id: UnitType.Settler },
                { type: "Unit" as const, id: spearUnit },
                { type: "Unit" as const, id: riderUnit },
                { type: "Unit" as const, id: bowUnit },
            ];

            const rangedFirst: BuildOption[] = [
                { type: "Unit" as const, id: UnitType.Settler },
                { type: "Unit" as const, id: bowUnit },
                { type: "Unit" as const, id: spearUnit },
                { type: "Unit" as const, id: riderUnit },
            ];

            // If we are missing a specific type, prioritize it
            let unitPriority: BuildOption[] = [];
            if (!hasSpear) unitPriority.push({ type: "Unit" as const, id: spearUnit });
            if (!hasBow) unitPriority.push({ type: "Unit" as const, id: bowUnit });
            if (!hasRider) unitPriority.push({ type: "Unit" as const, id: riderUnit });

            // Then fill with balanced approach
            if (rangedCount > meleeCount) {
                unitPriority = [...unitPriority, ...meleeFirst];
            } else {
                unitPriority = [...unitPriority, ...rangedFirst];
            }

            // Remove duplicates
            unitPriority = unitPriority.filter((v, i, a) => a.findIndex(t => t.type === v.type && t.id === v.id) === i);

            // v2.1: Always include progress projects as fallback
            const progressFallback = getNextProgressProject(player);
            return [
                ...(rushItem ? [rushItem] : []),
                ...unitPriority,
                { type: "Building" as const, id: BuildingType.StoneWorkshop },
                { type: "Building" as const, id: BuildingType.Farmstead },
                ...(progressFallback ? [progressFallback] : []),
            ];
        }
    }

    // Not at war, but if we have Army Doctrine and units to form, consider it
    let normalPriorities = buildNormalPriorities(goal, personality, scoutCount, isSafeEnough);

    // v2.2: ForgeClans & ScholarKingdoms maintain standing armies
    // ForgeClans: 2x army size (Aggressive)
    // ScholarKingdoms: 1.5x army size (Defensive deterrence)
    // v5.1: StarborneSeekers also included for Bulwark defense
    if (player?.civName === "ForgeClans" || player?.civName === "ScholarKingdoms" || player?.civName === "StarborneSeekers") {
        normalPriorities = getStandingArmyPriorities(state, playerId, normalPriorities);
    }

    if (armyPriorities.length > 0) {
        // Insert army formation opportunities after first few normal priorities
        // This allows peacetime army building without completely disrupting economy
        return [
            ...(rushItem ? [rushItem] : []),
            ...normalPriorities.slice(0, 2),
            ...armyPriorities,
            ...normalPriorities.slice(2),
        ];
    }

    // v0.99 Fix: Apply projectRush to the FINAL list, regardless of whether we are at war or not.
    // This ensures Jade Covenant builds their Granary even if they get into an early war.
    if (rushItem) {
        return [rushItem, ...normalPriorities];
    }

    // v1.1: Aetherian War Prep
    // If we are building the Titan's Core, ALL other cities must build military to support it.
    // This ensures we have a "Deathball" ready when the Titan spawns.
    const isAetherian = player?.civName === "AetherianVanguard";
    const buildingTitan = state.cities.some(c => c.ownerId === playerId && c.currentBuild?.id === BuildingType.TitansCore);

    if (isAetherian && buildingTitan) {
        aiInfo(`[AI WAR PREP] ${playerId} building Titan - switching all cities to MILITARY production!`);
        // Prioritize Armies heavily, then strongest units
        const warPrepPriorities: BuildOption[] = [];

        if (hasArmyTech) {
            warPrepPriorities.push(
                { type: "Unit" as const, id: UnitType.ArmyRiders }, // Riders prioritized for Deathball speed (v2.2)
                { type: "Unit" as const, id: UnitType.ArmyBowGuard },
                { type: "Unit" as const, id: UnitType.ArmySpearGuard },
            );
        }

        warPrepPriorities.push(
            { type: "Unit" as const, id: UnitType.Riders }, // Riders prioritized for Deathball speed
            { type: "Unit" as const, id: UnitType.BowGuard },
            { type: "Unit" as const, id: UnitType.SpearGuard },
        );

        // Still allow Stone Workshop for production if we have nothing else
        warPrepPriorities.push({ type: "Building" as const, id: BuildingType.StoneWorkshop });

        // v2.1: Always include progress projects as fallback
        const progressFallback = getNextProgressProject(player);
        if (progressFallback) warPrepPriorities.push(progressFallback);

        return warPrepPriorities;
    }

    return normalPriorities;
}

function buildNormalPriorities(goal: AiVictoryGoal, personality: AiPersonality, scoutCount: number, isSafeEnough: boolean): BuildOption[] {
    const shouldBuildScout = scoutCount === 0; // v2.0: Only build scout if none (civs start with one)

    const progress: BuildOption[] = [
        ...(shouldBuildScout ? [{ type: "Unit" as const, id: UnitType.Scout } as BuildOption] : []),          // Early exploration
        { type: "Project" as const, id: ProjectId.Observatory },
        { type: "Project" as const, id: ProjectId.GrandAcademy },
        { type: "Project" as const, id: ProjectId.GrandExperiment },
        { type: "Building" as const, id: BuildingType.Scriptorium },
        { type: "Building" as const, id: BuildingType.Academy },
        { type: "Project" as const, id: ProjectId.Observatory },
        { type: "Building" as const, id: BuildingType.JadeGranary },       // Unique
        { type: "Building" as const, id: BuildingType.CitySquare },
        { type: "Building" as const, id: BuildingType.Reservoir },
        { type: "Building" as const, id: BuildingType.Farmstead },
        { type: "Building" as const, id: BuildingType.StoneWorkshop },
        { type: "Building" as const, id: BuildingType.LumberMill },
        { type: "Building" as const, id: BuildingType.Forgeworks },
        { type: "Building" as const, id: BuildingType.CityWard },
        { type: "Building" as const, id: BuildingType.CityWard },
        ...(isSafeEnough ? [
            { type: "Project" as const, id: ProjectId.HarvestFestival },
            { type: "Project" as const, id: ProjectId.AlchemicalExperiments }
        ] : []),
        { type: "Unit" as const, id: UnitType.Settler }, // Normal priority
        { type: "Unit" as const, id: UnitType.SpearGuard },
        { type: "Unit" as const, id: UnitType.Riders },
        ...(!isSafeEnough ? [
            { type: "Project" as const, id: ProjectId.HarvestFestival },
            { type: "Project" as const, id: ProjectId.AlchemicalExperiments }
        ] : []),
    ];

    const conquest: BuildOption[] = [
        ...(shouldBuildScout ? [{ type: "Unit" as const, id: UnitType.Scout } as BuildOption] : []),          // Early exploration
        { type: "Unit" as const, id: UnitType.SpearGuard },
        { type: "Unit" as const, id: UnitType.Riders },
        { type: "Unit" as const, id: UnitType.BowGuard },
        { type: "Building" as const, id: BuildingType.TitansCore },        // Unique - Prioritize heavily for Aetherian
        { type: "Unit" as const, id: UnitType.ArmySpearGuard },
        { type: "Unit" as const, id: UnitType.ArmyRiders },
        { type: "Unit" as const, id: UnitType.ArmyBowGuard },
        { type: "Building" as const, id: BuildingType.Forgeworks },
        { type: "Building" as const, id: BuildingType.Forgeworks },
        { type: "Building" as const, id: BuildingType.JadeGranary },       // Unique (Jade Covenant needs this for growth even in Conquest)
        { type: "Building" as const, id: BuildingType.StoneWorkshop },
        { type: "Building" as const, id: BuildingType.LumberMill },
        { type: "Building" as const, id: BuildingType.CityWard },
        { type: "Building" as const, id: BuildingType.Farmstead },
        { type: "Building" as const, id: BuildingType.CitySquare },
        { type: "Building" as const, id: BuildingType.CitySquare },
        { type: "Unit" as const, id: UnitType.Settler },
        // Conquest always prioritizes units, so filler goes last
        { type: "Project" as const, id: ProjectId.HarvestFestival },
        { type: "Project" as const, id: ProjectId.AlchemicalExperiments },
    ];
    const balanced: BuildOption[] = [
        ...(shouldBuildScout ? [{ type: "Unit" as const, id: UnitType.Scout } as BuildOption] : []),          // Early exploration
        { type: "Unit" as const, id: UnitType.Settler },
        { type: "Unit" as const, id: UnitType.SpearGuard },
        { type: "Building" as const, id: BuildingType.Farmstead },
        { type: "Building" as const, id: BuildingType.StoneWorkshop },
        { type: "Building" as const, id: BuildingType.LumberMill },
        { type: "Building" as const, id: BuildingType.Scriptorium },
        { type: "Building" as const, id: BuildingType.CitySquare },
        { type: "Building" as const, id: BuildingType.CityWard },
        { type: "Building" as const, id: BuildingType.TitansCore },        // Unique - Prioritize heavily
        { type: "Building" as const, id: BuildingType.JadeGranary },       // Unique
        { type: "Project" as const, id: ProjectId.Observatory },
        { type: "Building" as const, id: BuildingType.TitansCore },        // Unique (Retry if missed)
        ...(isSafeEnough ? [
            { type: "Project" as const, id: ProjectId.HarvestFestival },
            { type: "Project" as const, id: ProjectId.AlchemicalExperiments }
        ] : []),
        { type: "Unit" as const, id: UnitType.Riders },
        ...(!isSafeEnough ? [
            { type: "Project" as const, id: ProjectId.HarvestFestival },
            { type: "Project" as const, id: ProjectId.AlchemicalExperiments }
        ] : []),
    ];

    let prioritized = goal === "Progress" ? progress : goal === "Conquest" ? conquest : balanced;

    if (personality.unitBias.navalWeight) {
        prioritized = [{ type: "Unit" as const, id: UnitType.Skiff }, ...prioritized];
    }

    // Ensure at least one military pick near the top to avoid pure builder loops.
    // v1.1: Only force military if we are not safe enough
    if (!isSafeEnough) {
        const hasEarlyMilitary = prioritized.slice(0, 3).some(p => p.type === "Unit" && p.id !== UnitType.Settler);
        if (!hasEarlyMilitary) {
            prioritized = [{ type: "Unit" as const, id: UnitType.SpearGuard }, ...prioritized];
        }
    }

    // personality tweaks
    const rangedWeight = personality.unitBias.rangedWeight ?? 0;
    const meleeWeight = personality.unitBias.meleeWeight ?? 0;
    const cavalryWeight = personality.unitBias.cavalryWeight ?? 0;
    if (rangedWeight > meleeWeight) {
        prioritized = [{ type: "Unit" as const, id: UnitType.BowGuard }, ...prioritized];
    } else if (meleeWeight > rangedWeight) {
        prioritized = [{ type: "Unit" as const, id: UnitType.SpearGuard }, ...prioritized];
    }
    if (cavalryWeight > 1) {
        prioritized = [{ type: "Unit" as const, id: UnitType.Riders }, ...prioritized];
    }

    // Remove duplicates (simple check)
    prioritized = prioritized.filter((v, i, a) => a.findIndex(t => t.type === v.type && t.id === v.id) === i);

    return prioritized;
}

/**
 * v2.2: Standing Army Priority
 * Enforces armySizeMultiplier (from personality) even during peacetime.
 * Used by ForgeClans (Aggressive) and ScholarKingdoms (Defensive).
 * v5.1: Added Bulwark support for ScholarKingdoms/StarborneSeekers.
 */
function getStandingArmyPriorities(state: GameState, playerId: string, basePriorities: BuildOption[]): BuildOption[] {
    const armyStatus = getArmyDeficit(state, playerId);
    const player = state.players.find(p => p.id === playerId);
    const isDefensive = isDefensiveCiv(player?.civName);

    // If at or above desired army size, use normal priorities
    if (armyStatus.deficit <= 0) {
        return basePriorities;
    }

    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const scoutCount = myUnits.filter(u => u.type === UnitType.Scout).length;

    // aiInfo(`[AI Build] Standing Army ${playerId} (${armyStatus.currentMilitary}/${armyStatus.desired}, deficit: ${armyStatus.deficit})`);

    // v5.1: Defensive civs prioritize Bulwark defense over mobile military
    if (isDefensive) {
        const militaryPriorities: BuildOption[] = [
            ...(scoutCount < 1 ? [{ type: "Unit" as const, id: UnitType.Scout }] : []),
            { type: "Building" as const, id: BuildingType.CityWard },  // Required for Bulwark
            { type: "Building" as const, id: BuildingType.Bulwark },           // v5.1: Core defense + Science
            { type: "Unit" as const, id: UnitType.BowGuard },          // Ranged support
            { type: "Unit" as const, id: UnitType.SpearGuard },        // Melee if needed
            { type: "Building" as const, id: BuildingType.StoneWorkshop },
            { type: "Building" as const, id: BuildingType.Farmstead },
            { type: "Unit" as const, id: UnitType.Settler },
            ...basePriorities.filter(p =>
                !((p.type === "Unit" && (p.id === UnitType.BowGuard || p.id === UnitType.SpearGuard || p.id === UnitType.Settler)) ||
                    (p.type === "Building" && (p.id === BuildingType.StoneWorkshop || p.id === BuildingType.Farmstead || p.id === BuildingType.CityWard)))
            ),
        ];
        return militaryPriorities;
    }

    // Prioritize military units to reach target (non-defensive civs)
    // Still allow scouts early and production buildings
    const militaryPriorities: BuildOption[] = [
        ...(scoutCount < 1 ? [{ type: "Unit" as const, id: UnitType.Scout }] : []),
        // v2.5: Forge Clans prioritizes "Siege & Steel" (BowGuard + SpearGuard)
        // User Request: "bowguard are siege units! prioritize spearguard and bowguard"
        ...(player?.civName === "ForgeClans" ? [
            { type: "Unit" as const, id: UnitType.BowGuard },   // Siege (Top Priority)
            { type: "Unit" as const, id: UnitType.SpearGuard }, // Steel (Frontline)
            // Riders deprioritized for Forge Clans
        ] : [
            { type: "Unit" as const, id: UnitType.BowGuard },
            { type: "Unit" as const, id: UnitType.SpearGuard },
            { type: "Unit" as const, id: UnitType.Riders },
        ]),
        { type: "Building" as const, id: BuildingType.StoneWorkshop },
        { type: "Building" as const, id: BuildingType.Farmstead },
        { type: "Unit" as const, id: UnitType.Settler },  // Still expand, but after military
        ...basePriorities.filter(p =>
            !((p.type === "Unit" && (p.id === UnitType.BowGuard || p.id === UnitType.SpearGuard || p.id === UnitType.Riders || p.id === UnitType.Settler)) ||
                (p.type === "Building" && (p.id === BuildingType.StoneWorkshop || p.id === BuildingType.Farmstead)))
        ),
    ];

    return militaryPriorities;
}

export function getCityBuildPriorities(
    goal: AiVictoryGoal,
    state: GameState,
    playerId: string
): BuildOption[] {
    const personality = getPersonalityForPlayer(state, playerId);
    return buildPriorities(goal, personality, isAtWar(state, playerId), state, playerId);
}
