import { City, GameState, HexCoord, Unit } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { MoveParticipant, validateTileOccupancy } from "./movement.js";

export function getUnitOrThrow(state: GameState, unitId: string, errorMessage = "Unit not found"): Unit {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) throw new Error(errorMessage);
    return unit;
}

export function getCityAt(state: GameState, coord: HexCoord): City | undefined {
    return state.cities.find(c => hexEquals(c.coord, coord));
}

export function assertOwnership(entity: { ownerId: string }, playerId: string, errorMessage = "Not your unit"): void {
    if (entity.ownerId !== playerId) {
        throw new Error(errorMessage);
    }
}

export function assertMovesLeft(unit: { movesLeft: number }, errorMessage = "No moves left"): void {
    if (unit.movesLeft <= 0) {
        throw new Error(errorMessage);
    }
}

export function assertHasNotAttacked(unit: { hasAttacked?: boolean }, errorMessage = "Already attacked"): void {
    if (unit.hasAttacked) {
        throw new Error(errorMessage);
    }
}

export function assertAdjacent(a: HexCoord, b: HexCoord, errorMessage = "Units must be adjacent"): void {
    if (hexDistance(a, b) !== 1) {
        throw new Error(errorMessage);
    }
}

export function assertTileCanBeOccupied(state: GameState, target: HexCoord, movers: MoveParticipant[], playerId: string): void {
    validateTileOccupancy(state, target, movers, playerId);
}
