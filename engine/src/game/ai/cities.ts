import { hexEquals, hexDistance } from "../../core/hex.js";
import {
    AiVictoryGoal,
    BuildingType,
    GameState,
    ProjectId,
    UnitType,
    TerrainType,
} from "../../core/types.js";
import { canBuild } from "../rules.js";
import { tryAction } from "./shared/actions.js";
import { tileWorkingPriority, tilesByPriority } from "./city-heuristics.js";
import { AiPersonality, getPersonalityForPlayer } from "./personality.js";
import { hexSpiral } from "../../core/hex.js";
import { CITY_WORK_RADIUS_RINGS } from "../../core/constants.js";

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

function buildPriorities(goal: AiVictoryGoal, personality: AiPersonality): BuildOption[] {
    const progress: BuildOption[] = [
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
    const cityOrder = next.cities.filter(c => c.ownerId === playerId);
    const priorities = buildPriorities(goal, personality);
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
