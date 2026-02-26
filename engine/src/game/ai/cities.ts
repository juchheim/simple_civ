import { aiInfo } from "./debug-logging.js";
import { hexEquals, hexDistance } from "../../core/hex.js";
import {
    AiVictoryGoal,
    City,
    GameState,
    ProjectId,
    TechId,
    UnitType,
    TerrainType,
} from "../../core/types.js";
import { canBuild, getMinimumCityDistance } from "../rules.js";
import { tryAction } from "./shared/actions.js";
import { tileWorkingPriority, tilesByPriority } from "./city-heuristics.js";
import { getPersonalityForPlayer } from "./personality.js";
import { hexSpiral } from "../../core/hex.js";
import { getCityBuildPriorities, getProgressCityPriorities } from "./city-build-priorities.js";
export { considerRazing } from "./city-razing.js";

function countAvailableCitySites(state: GameState, playerId: string, limit: number = 10): number {
    const MIN_CITY_DISTANCE = getMinimumCityDistance(state, playerId);
    const MAX_EXPANSION_RANGE = 12; // Reduced from 15 to ensure realistic targets
    let count = 0;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    // If no cities (start of game), map is wide open
    if (myCities.length === 0) return limit;

    for (const tile of state.map.tiles) {
        // Basic terrain checks
        if (tile.ownerId) continue;
        if (tile.hasCityCenter) continue;
        if (tile.terrain === TerrainType.Mountain ||
            tile.terrain === TerrainType.Coast ||
            tile.terrain === TerrainType.DeepSea) continue;

        // Optimization: Check distance to nearest friendly city first
        // If it's too far from ALL our cities, ignore it (likely unreachable or inefficient)
        const distToNearest = Math.min(...myCities.map(c => hexDistance(tile.coord, c.coord)));
        if (distToNearest > MAX_EXPANSION_RANGE) continue;

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

        count++;
        if (count >= limit) return count;
    }
    return count;
}

type ExpansionContext = {
    desiredCities: number;
    cityCountShort: boolean;
    desiredShortfall: number;
    freeLandNear: boolean;
    settlersInFlight: number;
    settlerCap: number;
    availableSites: number;
    cityOrder: City[];
    canPursueProgress: boolean;
    progressCityId: string | undefined;
    scoutCount: number;
};

function buildExpansionContext(state: GameState, playerId: string, goal: AiVictoryGoal): ExpansionContext {
    const personality = getPersonalityForPlayer(state, playerId);
    const desiredCities = personality.desiredCities ?? 3;
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const cityCountShort = myCities.length < desiredCities;
    const desiredShortfall = Math.max(0, desiredCities - myCities.length);
    const freeLandNear = myCities.some(c => {
        const ring = hexSpiral(c.coord, 4);
        return ring.some(coord => {
            const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
            return tile && !tile.ownerId && tile.terrain !== TerrainType.Mountain && tile.terrain !== TerrainType.DeepSea && tile.terrain !== TerrainType.Coast;
        });
    });
    const activeSettlers = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler).length;
    const settlersQueued = state.cities.filter(
        c => c.ownerId === playerId && c.currentBuild?.type === "Unit" && c.currentBuild.id === UnitType.Settler
    ).length;
    const cityOrder = state.cities.filter(c => c.ownerId === playerId);

    const player = state.players.find(p => p.id === playerId);
    const mapSize = state.map.width * state.map.height;
    const isLargeMap = mapSize > 200;
    let globalSettlerLimit = isLargeMap ? 3 : 2;
    if (player?.civName === "JadeCovenant" || player?.civName === "RiverLeague") {
        globalSettlerLimit += 1;
    }
    if (player?.civName === "JadeCovenant" && goal === "Conquest") {
        globalSettlerLimit = 0;
    }

    const settlerCap = Math.min(
        globalSettlerLimit,
        Math.max(1, Math.ceil(desiredShortfall / 2))
    );
    const availableSites = countAvailableCitySites(state, playerId, settlerCap + 2);

    const capital = myCities.find(c => c.isCapital);
    const highestPopCity = myCities.reduce((best, city) =>
        city.pop > (best?.pop ?? 0) ? city : best, myCities[0]);
    const progressCityId = capital?.id ?? highestPopCity?.id;
    const canPursueProgress = player?.techs.includes(TechId.StarCharts) ?? false;
    const scoutCount = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Scout).length;

    return {
        desiredCities,
        cityCountShort,
        desiredShortfall,
        freeLandNear,
        settlersInFlight: activeSettlers + settlersQueued,
        settlerCap,
        availableSites,
        cityOrder,
        canPursueProgress,
        progressCityId,
        scoutCount
    };
}

function getCityPrioritiesForGoal(
    city: City,
    player: { techs: TechId[]; completedProjects: ProjectId[]; civName?: string } | undefined,
    goal: AiVictoryGoal,
    context: ExpansionContext,
    state: GameState,
    playerId: string
) {
    // v2.8: Unblocking Progress Victory for Forge Clans
    // Removed logic that forced military production when army deficit > 0.
    // Forge Clans can now pursue Progress victory if they choose.
    const forceMilitary = false;

    const isProgressCity = !forceMilitary && city.id === context.progressCityId && context.canPursueProgress;
    return isProgressCity
        ? getProgressCityPriorities(player, context.scoutCount)
        : getCityBuildPriorities(goal, state, playerId);
}

export function pickCityBuilds(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const expansion = buildExpansionContext(next, playerId, goal);
    let settlersInFlight = expansion.settlersInFlight;
    const player = next.players.find(p => p.id === playerId);

    for (const city of expansion.cityOrder) {
        if (city.currentBuild) continue;

        const priorities = getCityPrioritiesForGoal(city, player, goal, expansion, next, playerId);

        for (const option of priorities) {

            if (option.type === "Unit" && option.id === UnitType.Settler) {
                // Only build if:
                // 1. We want more cities (shortfall > 0)
                // 2. We haven't hit the hard cap (inFlight < cap)
                // 3. We have valid sites (inFlight < available)
                const allowSettler = expansion.desiredShortfall > 0 &&
                    settlersInFlight < expansion.settlerCap &&
                    settlersInFlight < expansion.availableSites &&
                    (expansion.cityCountShort || expansion.freeLandNear);

                if (!allowSettler) continue;
                aiInfo(`[AI Build] ${playerId} queuing Settler in ${city.name} (cities=${expansion.cityOrder.length}/${expansion.desiredCities}, inFlight=${settlersInFlight}, sites=${expansion.availableSites}, cap=${expansion.settlerCap})`);
                settlersInFlight++;
            }
            if (canBuild(city, option.type, option.id, next)) {
                // Log all builds (military and buildings are silent otherwise)
                if (option.type !== "Unit" || option.id !== UnitType.Settler) {
                    aiInfo(`[AI Build] ${playerId} queuing ${option.id} in ${city.name}`);
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
