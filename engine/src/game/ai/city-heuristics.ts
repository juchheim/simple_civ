import { TERRAIN } from "../../core/constants.js";
import { getTileYields } from "../rules.js";
import { hexEquals, hexSpiral } from "../../core/hex.js";
import { AiVictoryGoal, City, GameState, OverlayType, Tile } from "../../core/types.js";
import { isTileAdjacentToRiver } from "../../map/rivers.js";

type YieldKey = "F" | "P" | "S";

export function tileWorkingPriority(goal: AiVictoryGoal, city: City, state: GameState): YieldKey[] {
    const avgPop =
        state.cities.filter(c => c.ownerId === city.ownerId).reduce((s, c) => s + c.pop, 0) /
        Math.max(1, state.cities.filter(c => c.ownerId === city.ownerId).length);
    const popBehind = city.pop < Math.max(3, Math.floor(avgPop));
    if (popBehind) return ["F", "P", "S"];
    if (goal === "Progress") return ["S", "P", "F"];
    if (goal === "Conquest") return ["P", "F", "S"];
    return ["F", "P", "S"];
}

export function tilesByPriority(city: City, state: GameState, prioritized: YieldKey[]): Tile[] {
    const radius = 2;
    const owned = hexSpiral(city.coord, radius)
        .map(c => state.map.tiles.find(t => hexEquals(t.coord, c) && t.ownerId === city.ownerId))
        .filter((t): t is Tile => !!t && TERRAIN[t.terrain].workable);

    const scoreTile = (tile: Tile) => {
        const y = getTileYields(tile);
        const adjRiver = isTileAdjacentToRiver(state.map, tile.coord);
        const weighted = {
            F: y.F + (adjRiver ? 1 : 0),
            P: y.P,
            S: y.S,
        };
        return (
            weighted[prioritized[0]] * 100 +
            weighted[prioritized[1]] * 10 +
            weighted[prioritized[2]] +
            (tile.overlays.includes(OverlayType.RichSoil) ? 0.1 : 0)
        );
    };

    return owned.sort((a, b) => scoreTile(b) - scoreTile(a));
}

