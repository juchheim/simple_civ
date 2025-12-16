import { canBuild } from "../rules.js";
import { AiVictoryGoal, BuildingType, City, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { pickBest } from "./util.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { aiInfo } from "../ai/debug-logging.js";
import { isDefensiveCiv } from "../helpers/civ-helpers.js";

export type BuildOption = { type: "Unit" | "Building" | "Project"; id: string };

const ALL_UNIT_OPTIONS: UnitType[] = [
    UnitType.Settler,
    UnitType.Scout,
    UnitType.SpearGuard,
    UnitType.BowGuard,
    UnitType.Riders,
    UnitType.Skiff,

];

const ALL_BUILDING_OPTIONS: BuildingType[] = [
    BuildingType.Farmstead,
    BuildingType.StoneWorkshop,
    BuildingType.Scriptorium,
    BuildingType.Reservoir,
    BuildingType.LumberMill,
    BuildingType.Academy,
    BuildingType.CityWard,
    BuildingType.Forgeworks,
    BuildingType.CitySquare,
    BuildingType.TitansCore,
    BuildingType.SpiritObservatory,
    BuildingType.JadeGranary,
    BuildingType.Bulwark,
];

const ALL_PROJECT_OPTIONS: ProjectId[] = [
    ProjectId.Observatory,
    ProjectId.GrandAcademy,
    ProjectId.GrandExperiment,
    ProjectId.FormArmy_SpearGuard,
    ProjectId.FormArmy_BowGuard,
    ProjectId.FormArmy_Riders,
    ProjectId.HarvestFestival,
    ProjectId.AlchemicalExperiments,
];

function formArmyBaseUnit(projectId: ProjectId): UnitType | null {
    if (projectId === ProjectId.FormArmy_SpearGuard) return UnitType.SpearGuard;
    if (projectId === ProjectId.FormArmy_BowGuard) return UnitType.BowGuard;
    if (projectId === ProjectId.FormArmy_Riders) return UnitType.Riders;
    return null;
}

function hasNearbyHealthyUnit(state: GameState, playerId: string, unitType: UnitType, city: City, distMax: number): boolean {
    return state.units.some(u =>
        u.ownerId === playerId &&
        u.type === unitType &&
        u.hp === u.maxHp &&
        hexDistance(u.coord, city.coord) <= distMax
    );
}

function bestImmediateFormArmyProject(state: GameState, playerId: string, city: City): ProjectId | null {
    // Rule: once FormArmy becomes available (canBuild + base unit ready), always convert immediately.
    const options: ProjectId[] = [
        ProjectId.FormArmy_SpearGuard,
        ProjectId.FormArmy_BowGuard,
        ProjectId.FormArmy_Riders,
    ];
    for (const pr of options) {
        if (!canBuild(city, "Project", pr, state)) continue;
        const baseUnit = formArmyBaseUnit(pr);
        if (!baseUnit) continue;
        if (hasNearbyHealthyUnit(state, playerId, baseUnit, city, 2)) return pr;
    }
    return null;
}

function countMilitary(state: GameState, playerId: string): number {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        u.type !== UnitType.Settler &&
        u.type !== UnitType.Scout &&
        u.type !== UnitType.Skiff
    ).length;
}

function settlersInFlight(state: GameState, playerId: string): number {
    const active = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler).length;
    const queued = state.cities.filter(c =>
        c.ownerId === playerId && c.currentBuild?.type === "Unit" && c.currentBuild.id === UnitType.Settler
    ).length;
    return active + queued;
}

function shouldQueueSettler(state: GameState, playerId: string, goal: AiVictoryGoal): boolean {
    const profile = getAiProfileV2(state, playerId);
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const cap = profile.build.settlerCap;
    if (settlersInFlight(state, playerId) >= cap) return false;
    if (goal === "Conquest" && profile.civName === "JadeCovenant") return false;
    const atWar = state.players.some(p => p.id !== playerId && state.diplomacy?.[playerId]?.[p.id] === "War");
    // Critical for conquest wins: stop “infinite city spam” during wars.
    // If we're fighting, spend production on units, not settlers (progress civs can keep minimal expansion early only).
    if (atWar) {
        if (goal !== "Progress") return false;
        if (state.turn >= 60) return false;
    }

    // Soft city target scaling by map size (bigger maps can support more cities).
    const mapArea = state.map.width * state.map.height;
    const baselineArea = 24 * 24;
    const mapScale = Math.max(0.75, Math.min(1.75, Math.sqrt(mapArea / baselineArea)));
    const desiredCities = Math.max(2, Math.round(profile.build.desiredCities * mapScale));

    if (myCities.length >= desiredCities) {
        // Past target city count: settlers become rare and mostly only happen if we're clearly not under pressure.
        const mil = countMilitary(state, playerId);
        if (mil < myCities.length) return false;
        if (goal === "Conquest") return false;
    }

    // Avoid settlers if at war and under-armed (extra safety for early Progress civs).
    const mil = countMilitary(state, playerId);
    if (atWar && mil < myCities.length + 1) return false;
    return true;
}

function progressProjectOrdering(player: { techs: TechId[]; completedProjects: ProjectId[] } | undefined): ProjectId[] {
    if (!player?.techs.includes(TechId.StarCharts)) return [];
    if (!player.completedProjects.includes(ProjectId.Observatory)) return [ProjectId.Observatory];
    if (!player.completedProjects.includes(ProjectId.GrandAcademy)) return [ProjectId.GrandAcademy];
    if (!player.completedProjects.includes(ProjectId.GrandExperiment)) return [ProjectId.GrandExperiment];
    return [];
}

export function chooseCityBuildV2(state: GameState, playerId: string, city: City, goal: AiVictoryGoal): BuildOption | null {
    const profile = getAiProfileV2(state, playerId);
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;
    if (city.currentBuild) return null;

    // Hard rule: always form armies immediately when possible.
    const immediateArmy = bestImmediateFormArmyProject(state, playerId, city);
    if (immediateArmy) return { type: "Project", id: immediateArmy };

    // v5.13: Hard Priority for Progress Victory Projects (Scholar/Starborne)
    // If we can build the game-winning projects, DO IT NOW.
    if (profile.civName === "ScholarKingdoms" || profile.civName === "StarborneSeekers" || goal === "Progress") {
        const progressProjects = [ProjectId.GrandAcademy, ProjectId.GrandExperiment];
        for (const pid of progressProjects) {
            if (canBuild(city, "Project", pid, state)) {
                // If it's one of these civs, it's CRITICAL priority.
                // If it's just "Goal=Progress" (generic), we still do it unless we're about to die (handled via 'immediateArmy' above getting picked first if available).
                // Actually, let's make it absolute. The 'immediateArmy' check above preserves tactical combining,
                // but for production, this should beat everything else.
                aiInfo(`[AI Build] ${profile.civName} (${playerId}) PRIORITY #1: Beelining ${pid}`);
                return { type: "Project", id: pid };
            }
        }
    }

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myMilitary = countMilitary(state, playerId);

    // DYNAMIC ARMY SIZING (matching Legacy AI logic)
    let desiredArmy = Math.ceil(myCities.length * profile.build.armyPerCity);

    // During active war: scale to enemy strength (like Legacy AI)
    const atWar = state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === "War"
    );

    if (atWar) {
        // Count enemy military strength
        const warEnemyIds = state.players
            .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War")
            .map(p => p.id);

        const enemyMilitary = state.units.filter(u =>
            warEnemyIds.includes(u.ownerId) &&
            u.type !== UnitType.Settler &&
            u.type !== UnitType.Scout &&
            u.type !== UnitType.Skiff
        ).length;

        // Want 1.3x enemy military + garrisons (matching Legacy AI)
        const warTarget = Math.ceil(enemyMilitary * 1.3) + myCities.length;
        desiredArmy = Math.max(desiredArmy, warTarget);
    }

    const armyDeficit = desiredArmy - myMilitary;

    if (profile.civName === "ForgeClans" || profile.civName === "AetherianVanguard") {
        aiInfo(`[AI Build] ${profile.civName} (${playerId}) Army Check: Deficit=${armyDeficit} (Current:${myMilitary}/Desired:${desiredArmy}) | War=${atWar}`);
    }

    // City target scaling by map size (same heuristic used in settler gating).
    const mapArea = state.map.width * state.map.height;
    const baselineArea = 24 * 24;
    const mapScale = Math.max(0.75, Math.min(1.75, Math.sqrt(mapArea / baselineArea)));
    const desiredCities = Math.max(2, Math.round(profile.build.desiredCities * mapScale));
    const cityShortfall = Math.max(0, desiredCities - myCities.length);

    // Candidate list is small enough: score across known options and filter by canBuild.
    const candidates: BuildOption[] = [];

    // Civ unique pushes (if not already built anywhere).
    const owns = (b: BuildingType) => state.cities.some(c => c.ownerId === playerId && c.buildings.includes(b));
    const uniqueBoost: Record<string, number> = {};
    if (profile.civName === "AetherianVanguard" && !owns(BuildingType.TitansCore)) uniqueBoost[BuildingType.TitansCore] = 9999; // HARD PRIORITY
    if (profile.civName === "StarborneSeekers" && !owns(BuildingType.SpiritObservatory)) uniqueBoost[BuildingType.SpiritObservatory] = 250;
    if (profile.civName === "JadeCovenant" && !owns(BuildingType.JadeGranary)) uniqueBoost[BuildingType.JadeGranary] = 250;

    // Progress chain: always consider, even for conquest civs.
    const progressNext = progressProjectOrdering(player);
    for (const pr of progressNext) candidates.push({ type: "Project", id: pr });

    for (const u of ALL_UNIT_OPTIONS) candidates.push({ type: "Unit", id: u });
    for (const b of ALL_BUILDING_OPTIONS) candidates.push({ type: "Building", id: b });
    for (const p of ALL_PROJECT_OPTIONS) candidates.push({ type: "Project", id: p });

    const best = pickBest(candidates, opt => {
        // Filter with rules (includes tech reqs, uniqueness, etc.)
        if (!canBuild(city, opt.type, opt.id, state)) return Number.NEGATIVE_INFINITY;

        // Base weights by type.
        let base = 0;
        if (opt.type === "Unit") base = (profile.build.weights.unit[opt.id as UnitType] ?? 0) * 100;
        if (opt.type === "Building") base = (profile.build.weights.building[opt.id as BuildingType] ?? 0) * 100;
        if (opt.type === "Project") base = (profile.build.weights.project[opt.id as ProjectId] ?? 0) * 100;

        // Goal modifiers.
        if (goal === "Progress") {
            if (opt.type === "Project" && (opt.id === ProjectId.Observatory || opt.id === ProjectId.GrandAcademy || opt.id === ProjectId.GrandExperiment)) base += 120;
            if (opt.type === "Building" && (opt.id === BuildingType.Academy || opt.id === BuildingType.Scriptorium)) base += 60;
        } else if (goal === "Conquest") {
            if (opt.type === "Unit" && opt.id !== UnitType.Settler && opt.id !== UnitType.Scout) base += 60;
            if (opt.type === "Project" && String(opt.id).startsWith("FormArmy_")) base += 80;
        }

        // Army deficit => boost military.
        if (armyDeficit > 0) {
            // If we're still under our desired city count and not actively at war, avoid over-militarizing too early.
            // (We still build *some* military via base weights; this just prevents endless “army deficit” spam.)
            const earlyExpansionPenalty = (!atWar && cityShortfall > 0) ? Math.max(0.35, 1 - (cityShortfall / desiredCities) * 0.7) : 1.0;
            if (opt.type === "Unit" && opt.id !== UnitType.Settler && opt.id !== UnitType.Scout) base += (70 + armyDeficit * 15) * earlyExpansionPenalty;
            if (opt.type === "Project" && String(opt.id).startsWith("FormArmy_")) base += (50 + armyDeficit * 10) * earlyExpansionPenalty;
        }

        // Settlers are conditional.
        if (opt.type === "Unit" && opt.id === UnitType.Settler) {
            if (!shouldQueueSettler(state, playerId, goal)) return Number.NEGATIVE_INFINITY;
            base += 35;
            // If we're under our city target and not at war, strongly prioritize catching up.
            if (!atWar && cityShortfall > 0) {
                base += 70 + cityShortfall * 18;
            }
            // If already have many cities (relative to civ target), dial down.
            base -= Math.max(0, myCities.length - desiredCities) * 18;
        }

        // Scouts: only if we have none.
        if (opt.type === "Unit" && opt.id === UnitType.Scout) {
            const scoutCount = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Scout).length;
            if (scoutCount > 0) base -= 200;
        }

        // If FormArmy is unlocked but we don't have the base unit near this city, strongly bias producing it.
        // This makes FormArmy become "available" quickly, matching the hard rule above.
        if (opt.type === "Unit") {
            const unitType = opt.id as UnitType;
            const formArmyProject =
                unitType === UnitType.SpearGuard
                    ? ProjectId.FormArmy_SpearGuard
                    : unitType === UnitType.BowGuard
                        ? ProjectId.FormArmy_BowGuard
                        : unitType === UnitType.Riders
                            ? ProjectId.FormArmy_Riders
                            : null;
            if (formArmyProject && canBuild(city, "Project", formArmyProject, state)) {
                const alreadyNearby = hasNearbyHealthyUnit(state, playerId, unitType, city, 2);
                if (!alreadyNearby) {
                    base += 260;
                    if (atWar || goal === "Conquest") base += 180;
                }
            }

            // DYNAMIC COMPOSITION FIX: Prioritize Siege if we have Capturers but no Siege support
            // This prevents the "Melee Only" inefficiency by actively correcting the composition.
            if (unitType === UnitType.BowGuard) {
                const totalSiege = state.units.filter(u => u.ownerId === playerId && (u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard)).length;
                const totalCapturers = state.units.filter(u => u.ownerId === playerId && (u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard || u.type === UnitType.Titan)).length;

                // If we have capturers but scarce siege, boost siege massively.
                if (totalCapturers >= 2 && totalSiege < 2) {
                    base += 350; // Huge boost to get at least 2 siege units
                } else if (totalCapturers > totalSiege * 2) {
                    base += 150; // Moderate boost to maintain ratio
                }
            }
        }

        // Defensive building if capital threatened.
        if (opt.type === "Building" && opt.id === BuildingType.CityWard) {
            const capital = myCities.find(c => c.isCapital);
            if (capital) {
                const enemiesNear = state.units.some(u => u.ownerId !== playerId && u.type !== UnitType.Settler && u.type !== UnitType.Scout &&
                    Math.abs(u.coord.q - capital.coord.q) + Math.abs(u.coord.r - capital.coord.r) <= 6);
                if (enemiesNear) base += 60;
            }
            // v5.1: Defensive civs always want CityWard for Bulwark unlock
            if (isDefensiveCiv(profile.civName)) {
                base += 150;  // High priority - enables Bulwark
            }
        }

        // v5.1: Bulwark - Defensive emplacement for Scholar/Starborne
        // High priority for defensive civs: +2 Science + Range 2 + 18 Defense
        // v5.2: Each city can only have ONE Bulwark (stationary garrison)
        if (opt.type === "Building" && opt.id === BuildingType.Bulwark) {
            // Check if THIS city already has a Bulwark garrison (they can't move)
            const alreadyHasOne = city.buildings.includes(BuildingType.Bulwark) ||
                (city.currentBuild?.type === "Building" && city.currentBuild.id === BuildingType.Bulwark);
            if (alreadyHasOne) {
                return Number.NEGATIVE_INFINITY;  // Don't build another!
            }

            if (isDefensiveCiv(profile.civName)) {
                // v5.3: Bulwark Production Cap
                // Bulwarks disable unit production, so we MUST reserve cities for military.
                // Rule: Reserve 50% of cities (rounded up) for pure military production.
                // 1 City -> 1 Reserved -> 0 Bulwarks (unless we want to risk it? No, 1 city must be factory).
                // 2 Cities -> 1 Reserved -> 1 Bulwark.
                // 3 Cities -> 2 Reserved -> 1 Bulwark.
                // 4 Cities -> 2 Reserved -> 2 Bulwarks.
                const reservedForMilitary = Math.ceil(myCities.length / 2);
                const currentBulwarks = myCities.filter(c =>
                    c.buildings.includes(BuildingType.Bulwark) ||
                    (c.currentBuild?.type === "Building" && c.currentBuild.id === BuildingType.Bulwark)
                ).length;

                if (currentBulwarks >= myCities.length - reservedForMilitary) {
                    return Number.NEGATIVE_INFINITY;
                }

                base += 200;  // Core defensive unit
                // Extra boost if this city has no Bulwark (though alreadyHasOne check above handles this,
                // this is for emphasis if we removed that check, but we didn't).
                base += 100;
            } else {
                // Other civs: don't really need Bulwarks
                return Number.NEGATIVE_INFINITY;
            }
        }

        // Unique boosts.
        if (opt.type === "Building" && uniqueBoost[opt.id]) base += uniqueBoost[opt.id];

        // Mild “avoid duplicate junk” penalty.
        if (opt.type === "Building" && city.buildings.includes(opt.id as BuildingType)) base -= 999;

        // Army formation: ensure we actually use FormArmy once DrilledRanks is available.
        // These projects are a cheap power spike and are required for Conquest civs to actually convert unit spam into captures.
        if (opt.type === "Project" && String(opt.id).startsWith("FormArmy_")) {
            const baseUnit = formArmyBaseUnit(opt.id as ProjectId);
            if (!baseUnit) return Number.NEGATIVE_INFINITY;

            // Require a healthy base unit near THIS city so the project actually does something immediately.
            const hasNearbyBase = hasNearbyHealthyUnit(state, playerId, baseUnit, city, 2);
            if (!hasNearbyBase) return Number.NEGATIVE_INFINITY;

            // Always convert immediately when possible (early-return above). Keep a huge score anyway as a guardrail.
            base += 2000;
        }

        return base;
    });

    const result = best?.item ?? null;
    if (result && (profile.civName === "ForgeClans" || profile.civName === "AetherianVanguard" || result.type === "Project")) {
        aiInfo(`[AI Build] ${playerId} chose ${result.id} (Score: ${best?.score})`);
    }
    return result;
}


