// Shared production analysis helpers.
import { City, GameState, UnitType } from "../../../core/types.js";
import { isCombatUnitType } from "../schema.js";

export function settlersInFlight(state: GameState, playerId: string): number {
    const active = state.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler).length;
    const queued = state.cities.filter(c =>
        c.ownerId === playerId && c.currentBuild?.type === "Unit" && c.currentBuild.id === UnitType.Settler
    ).length;
    return active + queued;
}

export function cityHasGarrison(state: GameState, city: City): boolean {
    return state.units.some(u =>
        u.ownerId === city.ownerId &&
        u.coord.q === city.coord.q &&
        u.coord.r === city.coord.r &&
        isCombatUnitType(u.type)
    );
}
