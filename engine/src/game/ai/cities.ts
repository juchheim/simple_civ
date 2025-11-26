import { hexEquals, hexDistance } from "../../core/hex.js";
import {
    AiVictoryGoal,
    BuildingType,
    GameState,
    ProjectId,
    TechId,
    UnitType,
    TerrainType,
    DiplomacyState,
} from "../../core/types.js";
import { canBuild } from "../rules.js";
import { tryAction } from "./shared/actions.js";
import { tileWorkingPriority, tilesByPriority } from "./city-heuristics.js";
import { AiPersonality, getPersonalityForPlayer } from "./personality.js";
import { hexSpiral } from "../../core/hex.js";
import { CITY_WORK_RADIUS_RINGS } from "../../core/constants.js";

function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(
        p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

type BuildOption = { type: "Unit" | "Building" | "Project"; id: string };

function hasAvailableCitySite(state: GameState, playerId: string): boolean {
    const MIN_CITY_DISTANCE = 3;

    for (const tile of state.map.tiles) {
        // Basic terrain checks
        if (tile.ownerId) continue;
        if (tile.hasCityCenter) continue;
        if (tile.terrain === TerrainType.Mountain ||
            tile.terrain === TerrainType.Coast ||
            tile.terrain === TerrainType.DeepSea) continue;

        // Check distance from ALL cities (match validation logic in handleFoundCity)
        let tooClose = false;
        for (const city of state.cities) {
            const dist = hexDistance(tile.coord, city.coord);
            if (dist < MIN_CITY_DISTANCE) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) continue;

        return true;  // Found at least one valid site!
    }
    return false;
}

function buildPriorities(goal: AiVictoryGoal, personality: AiPersonality, atWar: boolean, state: GameState, playerId: string): BuildOption[] {
    const player = state.players.find(p => p.id === playerId);

    // Check if player can complete victory projects - if so, prioritize them!
    const canCompleteVictoryProjects = player && player.techs.includes(TechId.StarCharts);
    const hasObservatory = player?.completedProjects.includes(ProjectId.Observatory);
    const hasGrandAcademy = player?.completedProjects.includes(ProjectId.GrandAcademy);

    // Check if we are safe enough to pursue victory
    // Safe if: Not at war OR we have a decent military (at least 3 units)
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const militaryCount = myUnits.filter(u => u.type !== UnitType.Settler && u.type !== UnitType.Scout && u.type !== UnitType.RiverBoat).length;
    const isSafeEnough = !atWar || militaryCount >= 3;

    // If we can work on victory, do it (unless massively losing a war)
    if (canCompleteVictoryProjects && isSafeEnough) {
        const victoryPath: BuildOption[] = [];
        if (!hasObservatory) {
            victoryPath.push({ type: "Project", id: ProjectId.Observatory });
        } else if (!hasGrandAcademy) {
            victoryPath.push({ type: "Project", id: ProjectId.GrandAcademy });
        } else {
            victoryPath.push({ type: "Project", id: ProjectId.GrandExperiment });
        }

        // Prepend victory projects to normal priorities
        const normalPriorities = buildNormalPriorities(goal, personality);
        return [...victoryPath, ...normalPriorities];
    }

    // When at war, heavily prioritize military production
    // Army formation is TOP priority if available, then varied units
    if (atWar) {
        const player = state.players.find(p => p.id === playerId);
        const hasFormArmyTech = player?.techs.includes(TechId.ArmyDoctrine) ?? false;

        if (hasFormArmyTech) {
            // Prioritize army formation over individual units
            return [
                { type: "Project", id: ProjectId.FormArmy_BowGuard },
                { type: "Project", id: ProjectId.FormArmy_SpearGuard },
                { type: "Project", id: ProjectId.FormArmy_Riders },
                { type: "Unit", id: UnitType.Settler },
                { type: "Unit", id: UnitType.BowGuard },
                { type: "Unit", id: UnitType.SpearGuard },
                { type: "Unit", id: UnitType.Riders },
                { type: "Building", id: BuildingType.StoneWorkshop },
                { type: "Building", id: BuildingType.Farmstead },
            ];
        } else {
            // No armies yet, build varied individual units
            // Check current army composition to balance melee/ranged
            const units = state.units.filter(u => u.ownerId === playerId);
            const rangedCount = units.filter(u => u.type === UnitType.BowGuard).length;
            const meleeCount = units.filter(u => u.type === UnitType.SpearGuard || u.type === UnitType.Riders).length;

            const meleeFirst: BuildOption[] = [
                { type: "Unit", id: UnitType.Settler },
                { type: "Unit", id: UnitType.SpearGuard },
                { type: "Unit", id: UnitType.Riders },
                { type: "Unit", id: UnitType.BowGuard },
            ];

            const rangedFirst: BuildOption[] = [
                { type: "Unit", id: UnitType.Settler },
                { type: "Unit", id: UnitType.BowGuard },
                { type: "Unit", id: UnitType.SpearGuard },
                { type: "Unit", id: UnitType.Riders },
            ];

            // If we have more ranged than melee, prioritize melee
            const unitPriority = rangedCount > meleeCount ? meleeFirst : rangedFirst;

            return [
                ...unitPriority,
                { type: "Building", id: BuildingType.StoneWorkshop },
                { type: "Building", id: BuildingType.Farmstead },
            ];
        }
    }

    return buildNormalPriorities(goal, personality);
}

function buildNormalPriorities(goal: AiVictoryGoal, personality: AiPersonality): BuildOption[] {
    const progress: BuildOption[] = [
        { type: "Unit", id: UnitType.Scout },          // Early exploration
        { type: "Project", id: ProjectId.Observatory },
        { type: "Project", id: ProjectId.GrandAcademy },
        { type: "Project", id: ProjectId.GrandExperiment },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
    ];
    const conquest: BuildOption[] = [
        { type: "Unit", id: UnitType.Scout },          // Early exploration
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
        { type: "Unit", id: UnitType.BowGuard },
        { type: "Project", id: ProjectId.FormArmy_SpearGuard },
        { type: "Project", id: ProjectId.FormArmy_Riders },
        { type: "Project", id: ProjectId.FormArmy_BowGuard },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Unit", id: UnitType.Settler },
    ];
    const balanced: BuildOption[] = [
        { type: "Unit", id: UnitType.Scout },          // Early exploration
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Unit", id: UnitType.Riders },
    ];

    let prioritized = goal === "Progress" ? progress : goal === "Conquest" ? conquest : balanced;

    if (personality.projectRush) {
        const rushType = personality.projectRush.type === "Building" ? "Building" : "Project";
        prioritized = [{ type: rushType, id: personality.projectRush.id as string }, ...prioritized];
    }

    if (personality.unitBias.navalWeight) {
        prioritized = [{ type: "Unit", id: UnitType.RiverBoat }, ...prioritized];
    }

    // Ensure at least one military pick near the top to avoid pure builder loops.
    const hasEarlyMilitary = prioritized.slice(0, 3).some(p => p.type === "Unit" && p.id !== UnitType.Settler);
    if (!hasEarlyMilitary) {
        prioritized = [{ type: "Unit", id: UnitType.SpearGuard }, ...prioritized];
    }

    return prioritized;
}

export function pickCityBuilds(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const personality = getPersonalityForPlayer(next, playerId);
    const player = next.players.find(p => p.id === playerId);
    const desiredCities = personality.desiredCities ?? 3;
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const cityCountShort = myCities.length < desiredCities;
    const desiredShortfall = Math.max(0, desiredCities - myCities.length);
    const freeLandNear = myCities.some(c => {
        const ring = hexSpiral(c.coord, 4);
        return ring.some(coord => {
            const tile = next.map.tiles.find(t => hexEquals(t.coord, coord));
            return tile && !tile.ownerId && tile.terrain !== TerrainType.Mountain && tile.terrain !== TerrainType.DeepSea && tile.terrain !== TerrainType.Coast;
        });
    });
    const activeSettlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler).length;
    const settlersQueued = next.cities.filter(
        c => c.ownerId === playerId && c.currentBuild?.type === "Unit" && c.currentBuild.id === UnitType.Settler
    ).length;
    let settlersInFlight = activeSettlers + settlersQueued;
    const openCitySite = hasAvailableCitySite(next, playerId);
    const settlerCap = Math.max(1, Math.ceil(desiredShortfall / 2));
    const cityOrder = state.cities.filter(c => c.ownerId === playerId);
    const atWar = isAtWar(next, playerId);
    const priorities = buildPriorities(goal, personality, atWar, next, playerId);
    for (const city of cityOrder) {
        if (city.currentBuild) continue;
        for (const option of priorities) {
            if (option.type === "Unit" && option.id === UnitType.Settler) {
                const allowSettler = desiredShortfall > 0 && settlersInFlight < settlerCap && (cityCountShort || freeLandNear) && openCitySite;
                if (!allowSettler) continue;
                console.info(`[AI Build] ${playerId} queuing Settler in ${city.name} (cities=${myCities.length}/${desiredCities}, inFlight=${settlersInFlight})`);
                settlersInFlight++;
            }
            if (canBuild(city, option.type, option.id, next)) {
                // Log all builds (military and buildings are silent otherwise)
                if (option.type !== "Unit" || option.id !== UnitType.Settler) {
                    console.info(`[AI Build] ${playerId} queuing ${option.id} in ${city.name}`);
                }

                next = tryAction(next, {
                    type: "SetCityBuild",
                    playerId,
                    cityId: city.id,
                    buildType: option.type,
                    buildId: option.id,
                });
                break;
            }
        }
    }
    return next;
}

export function assignWorkedTiles(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const cities = next.cities.filter(c => c.ownerId === playerId);
    for (const city of cities) {
        const priority = tileWorkingPriority(goal, city, next);
        const sorted = tilesByPriority(city, next, priority);
        const worked: typeof city.workedTiles = [city.coord];
        for (const tile of sorted) {
            if (worked.length >= city.pop) break;
            if (hexEquals(tile.coord, city.coord)) continue;
            worked.push(tile.coord);
        }
        next = tryAction(next, {
            type: "SetWorkedTiles",
            playerId,
            cityId: city.id,
            tiles: worked,
        });
    }
    return next;
}
