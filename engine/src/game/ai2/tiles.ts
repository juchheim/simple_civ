import { CITY_WORK_RADIUS_RINGS, TERRAIN } from "../../core/constants.js";
import { BuildingType, City, GameState, OverlayType, TechId } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { getTileYields } from "../rules.js";
import { tryAction } from "../ai/shared/actions.js";

type YieldPriority = "Food" | "Prod" | "Science" | "Balanced";

function priorityForGoal(goal: "Progress" | "Conquest" | "Balanced", hasStarCharts: boolean, foodPush: boolean): YieldPriority {
    if (foodPush) return "Food";
    if (goal === "Progress" || hasStarCharts) return "Science";
    if (goal === "Conquest") return "Prod";
    return "Balanced";
}

function scoreTile(
    state: GameState,
    city: City,
    coord: { q: number; r: number },
    priority: YieldPriority,
    goldWeight: number,
    bankOrePush: boolean,
): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -999;
    const y = getTileYields(tile);
    const food = y.F;
    const production = y.P;
    const science = y.S;
    const gold = y.G;

    const oreBonus = bankOrePush && tile.overlays.includes(OverlayType.OreVein) ? 4 : 0;

    // Always value production and food somewhat so cities don't starve.
    if (priority === "Science") return science * 3 + production * 2 + food * 1 + gold * goldWeight + oreBonus;
    if (priority === "Prod") return production * 3 + food * 2 + science * 1 + gold * goldWeight + oreBonus;
    if (priority === "Food") return food * 4 + production * 2 + science * 1 + gold * 0.5 + oreBonus;
    return production * 2 + food * 2 + science * 2 + gold * goldWeight + oreBonus;
}

function getCityWorkableTiles(state: GameState, city: City): { q: number; r: number }[] {
    const byCityOwnership = state.map.tiles
        .filter(tile => tile.ownerCityId === city.id && TERRAIN[tile.terrain].workable)
        .map(tile => tile.coord);
    if (byCityOwnership.length > 0) return byCityOwnership;

    return state.map.tiles
        .filter(tile =>
            tile.ownerId === city.ownerId &&
            TERRAIN[tile.terrain].workable &&
            hexDistance(tile.coord, city.coord) <= CITY_WORK_RADIUS_RINGS
        )
        .map(tile => tile.coord);
}

export function assignWorkedTilesV2(state: GameState, playerId: string, goal: "Progress" | "Conquest" | "Balanced"): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player) return next;

    const hasStarCharts = player.techs.includes(TechId.StarCharts);

    const cities = next.cities.filter(c => c.ownerId === playerId);
    for (const city of cities) {
        const hasMarketHall = city.buildings.includes(BuildingType.MarketHall);
        const marketHallGrowthPush = hasMarketHall && city.pop < 5;
        const priority = priorityForGoal(goal, hasStarCharts, marketHallGrowthPush);

        const netGold = player.netGold ?? 0;
        const treasury = player.treasury ?? 0;
        const underEconomicPressure = !!player.austerityActive || netGold < 0 || treasury <= 20;
        const goldWeight = underEconomicPressure ? 2 : 1;

        const hasOrBuildingBank = city.buildings.includes(BuildingType.Bank) ||
            (city.currentBuild?.type === "Building" && city.currentBuild.id === BuildingType.Bank);

        const workable = getCityWorkableTiles(next, city);
        const candidates = workable.filter(c => !hexEquals(c, city.coord));
        const oreCandidates = candidates.filter(coord => {
            const tile = next.map.tiles.find(t => hexEquals(t.coord, coord));
            return !!tile?.overlays.includes(OverlayType.OreVein);
        });
        const bankOrePush = hasOrBuildingBank && oreCandidates.length > 0;

        const ordered = candidates
            .map(c => ({ coord: c, s: scoreTile(next, city, c, priority, goldWeight, bankOrePush) }))
            .sort((a, b) => b.s - a.s)
            .map(x => x.coord);

        const worked: typeof city.workedTiles = [city.coord];
        if (bankOrePush && city.pop > 1) {
            const bestOre = oreCandidates
                .map(coord => ({ coord, s: scoreTile(next, city, coord, priority, goldWeight, true) }))
                .sort((a, b) => b.s - a.s)[0]?.coord;
            if (bestOre) {
                worked.push(bestOre);
            }
        }

        for (const coord of ordered) {
            if (worked.length >= city.pop) break;
            if (worked.some(w => hexEquals(w, coord))) continue;
            worked.push(coord);
        }

        next = tryAction(next, { type: "SetWorkedTiles", playerId, cityId: city.id, tiles: worked });
    }

    return next;
}
