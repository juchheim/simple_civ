import { City, GameState, Unit } from "../../core/types.js";
import { hexToString } from "../../core/hex.js";

export type VisibleTargetIds = {
    units: Set<string>;
    cities: Set<string>;
};

export type AiPerception = {
    playerId: string;
    visibilitySet: Set<string>;
    visibilityKnown: boolean;
    visibleUnits: Unit[];
    visibleCities: City[];
    visibleEnemyIds: Set<string>;
    visibleTargets: VisibleTargetIds;
    isCoordVisible: (coord: { q: number; r: number }) => boolean;
};

function buildVisibility(state: GameState, playerId: string): { visibilitySet: Set<string>; visibilityKnown: boolean } {
    const visibilityList = state.visibility?.[playerId];
    const visibilityKnown = Array.isArray(visibilityList) && visibilityList.length > 0;
    return {
        visibilitySet: visibilityKnown ? new Set(visibilityList) : new Set(),
        visibilityKnown,
    };
}

export function buildPerception(state: GameState, playerId: string, strict: boolean = false): AiPerception {
    const { visibilitySet, visibilityKnown } = buildVisibility(state, playerId);
    const assumeVisible = !visibilityKnown && !strict;

    const isCoordVisible = (coord: { q: number; r: number }): boolean => {
        if (assumeVisible) return true;
        return visibilitySet.has(hexToString(coord));
    };

    const visibleUnits = state.units.filter(u => u.ownerId === playerId || isCoordVisible(u.coord));
    const visibleCities = state.cities.filter(c => c.ownerId === playerId || isCoordVisible(c.coord));

    const visibleEnemyIds = new Set<string>();
    const visibleEnemyUnitIds = new Set<string>();
    const visibleEnemyCityIds = new Set<string>();

    for (const unit of visibleUnits) {
        if (unit.ownerId !== playerId) {
            visibleEnemyIds.add(unit.ownerId);
            visibleEnemyUnitIds.add(unit.id);
        }
    }

    for (const city of visibleCities) {
        if (city.ownerId !== playerId) {
            visibleEnemyIds.add(city.ownerId);
            visibleEnemyCityIds.add(city.id);
        }
    }

    return {
        playerId,
        visibilitySet,
        visibilityKnown,
        visibleUnits,
        visibleCities,
        visibleEnemyIds,
        visibleTargets: {
            units: visibleEnemyUnitIds,
            cities: visibleEnemyCityIds,
        },
        isCoordVisible,
    };
}
