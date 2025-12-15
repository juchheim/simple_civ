import { City, GameState, TechId } from "../../core/types.js";
import { hexEquals } from "../../core/hex.js";
import { getTileYields } from "../rules.js";
import { tryAction } from "../ai/shared/actions.js";

type YieldPriority = "Food" | "Prod" | "Science" | "Balanced";

function priorityForGoal(goal: "Progress" | "Conquest" | "Balanced", hasStarCharts: boolean): YieldPriority {
    if (goal === "Progress" || hasStarCharts) return "Science";
    if (goal === "Conquest") return "Prod";
    return "Balanced";
}

function scoreTile(state: GameState, city: City, coord: { q: number; r: number }, priority: YieldPriority): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -999;
    const y = getTileYields(tile);
    // Always value production and food somewhat so cities don't starve.
    if (priority === "Science") return y.S * 3 + y.P * 2 + y.F * 1;
    if (priority === "Prod") return y.P * 3 + y.F * 2 + y.S * 1;
    if (priority === "Food") return y.F * 3 + y.P * 2 + y.S * 1;
    return y.P * 2 + y.F * 2 + y.S * 2;
}

export function assignWorkedTilesV2(state: GameState, playerId: string, goal: "Progress" | "Conquest" | "Balanced"): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player) return next;

    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    const priority = priorityForGoal(goal, hasStarCharts);

    const cities = next.cities.filter(c => c.ownerId === playerId);
    for (const city of cities) {
        // Territory is stored per tile ownership; if not present, fall back to current worked tiles + city center.
        const workable = ((city as any).territory ?? city.workedTiles ?? [city.coord]) as { q: number; r: number }[];
        const candidates = workable.filter((c: { q: number; r: number }) => !hexEquals(c, city.coord));
        const ordered = candidates
            .map((c: { q: number; r: number }) => ({ coord: c, s: scoreTile(next, city, c, priority) }))
            .sort((a: { s: number }, b: { s: number }) => b.s - a.s)
            .map((x: { coord: { q: number; r: number } }) => x.coord);

        const worked: typeof city.workedTiles = [city.coord];
        for (const coord of ordered) {
            if (worked.length >= city.pop) break;
            worked.push(coord);
        }

        next = tryAction(next, { type: "SetWorkedTiles", playerId, cityId: city.id, tiles: worked });
    }

    return next;
}


