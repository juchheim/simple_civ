import { useMemo } from "react";
import { Action, GameState, HexCoord, applyAction } from "@simple-civ/engine";
import { getNeighbors, hexToString } from "../utils/hex";

export type PathInfo = { path: HexCoord[]; movesLeft: number };
export type PathMap = Record<string, PathInfo>;

export function useReachablePaths(gameState: GameState | null, playerId: string, selectedUnitId: string | null) {
    const reachablePaths = useMemo<PathMap>(() => {
        if (!gameState || !selectedUnitId) return {};
        const selectedUnit = gameState.units.find(u => u.id === selectedUnitId);
        if (!selectedUnit || selectedUnit.ownerId !== playerId || selectedUnit.movesLeft <= 0) {
            return {};
        }
        try {
            return computeReachablePaths(gameState, playerId, selectedUnitId);
        } catch (err) {
            console.warn("[Movement] failed to compute reachable tiles", err);
            return {};
        }
    }, [gameState, playerId, selectedUnitId]);

    const reachableCoordSet = useMemo(() => new Set(Object.keys(reachablePaths)), [reachablePaths]);

    return { reachablePaths, reachableCoordSet };
}

function computeReachablePaths(state: GameState, playerId: string, unitId: string): PathMap {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || unit.ownerId !== playerId || unit.movesLeft <= 0) {
        return {};
    }

    const results: PathMap = {};
    type QueueNode = { state: GameState; path: HexCoord[] };
    const queue: QueueNode[] = [{ state, path: [] }];
    const bestStateSeen = new Map<string, number>();

    while (queue.length) {
        const node = queue.shift()!;
        const currentUnit = node.state.units.find(u => u.id === unitId);
        if (!currentUnit) {
            continue;
        }
        const partner = currentUnit.linkedUnitId
            ? node.state.units.find(u => u.id === currentUnit.linkedUnitId)
            : undefined;
        const signature = serializeUnitState(currentUnit, partner);
        const prevBest = bestStateSeen.get(signature);
        if (prevBest !== undefined && prevBest >= currentUnit.movesLeft) {
            continue;
        }
        bestStateSeen.set(signature, currentUnit.movesLeft);

        if (node.path.length > 0) {
            const key = hexToString(currentUnit.coord);
            const existing = results[key];
            if (!existing || existing.movesLeft < currentUnit.movesLeft) {
                results[key] = { path: [...node.path], movesLeft: currentUnit.movesLeft };
            }
        }

        if (currentUnit.movesLeft <= 0) {
            continue;
        }

        for (const neighbor of getNeighbors(currentUnit.coord)) {
            try {
                const nextState = applyAction(node.state, {
                    type: "MoveUnit",
                    playerId,
                    unitId,
                    to: neighbor,
                } as Extract<Action, { type: "MoveUnit" }>);
                queue.push({
                    state: nextState,
                    path: [...node.path, neighbor],
                });
            } catch {
                // Ignore invalid moves
            }
        }
    }

    return results;
}

function serializeUnitState(unit: GameState["units"][number], partner?: GameState["units"][number]) {
    const base = `${unit.id}:${unit.coord.q},${unit.coord.r}:${unit.movesLeft}`;
    if (!partner) return base;
    return `${base}|${partner.id}:${partner.coord.q},${partner.coord.r}:${partner.movesLeft}`;
}
