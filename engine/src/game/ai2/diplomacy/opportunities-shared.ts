import { GameState, UnitType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { isCombatUnitType } from "../schema.js";

export type VulnerableCity = {
    q: number;
    r: number;
    name: string;
    id: string;
    defenders: number;
};

export function isMilitaryUnit(u: { type: UnitType }): boolean {
    return isCombatUnitType(u.type);
}

export function findVulnerableCity(
    state: GameState,
    ownerId: string,
    maxDefenders: number = 1
): VulnerableCity | null {
    const cities = state.cities.filter(c => c.ownerId === ownerId);
    const military = state.units.filter(u => u.ownerId === ownerId && isMilitaryUnit(u));

    let mostVulnerable: { city: typeof cities[0]; defenders: number } | null = null;

    for (const city of cities) {
        const defenders = military.filter(u => hexDistance(u.coord, city.coord) <= 2).length;
        if (defenders <= maxDefenders) {
            if (!mostVulnerable || defenders < mostVulnerable.defenders) {
                mostVulnerable = { city, defenders };
            }
        }
    }

    if (!mostVulnerable) return null;
    return {
        q: mostVulnerable.city.coord.q,
        r: mostVulnerable.city.coord.r,
        name: mostVulnerable.city.name,
        id: mostVulnerable.city.id,
        defenders: mostVulnerable.defenders
    };
}
