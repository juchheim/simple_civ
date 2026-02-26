import { hexDistance, getNeighbors } from "../../../core/hex.js";
import { GameState, Unit } from "../../../core/types.js";
import { findPath } from "../../helpers/pathfinding.js";
import type { MovementTarget } from "./offense-movement-target-selection.js";

type PathCandidate = { coord: { q: number; r: number }; path: { q: number; r: number }[] };

export function computePathToTarget(state: GameState, unit: Unit, target: MovementTarget): { q: number; r: number }[] {
    let path = findPath(unit.coord, target.coord, unit, state);
    if (path.length === 0 && hexDistance(unit.coord, target.coord) > 1) {
        const neighbors = getNeighbors(target.coord);
        const validNeighbors: PathCandidate[] = neighbors
            .map(n => ({ coord: n, path: findPath(unit.coord, n, unit, state) }))
            .filter(n => n.path.length > 0)
            .sort((a, b) => a.path.length - b.path.length);
        if (validNeighbors.length > 0) {
            path = validNeighbors[0].path;
        }
    }
    return path;
}
