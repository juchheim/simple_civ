import { GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import type { InfluenceMaps } from "../influence-map.js";
import { getInfluenceRatio } from "../diplomacy-helpers.js";
import { OPPORTUNITY_STAGING } from "./constants.js";
import { isMilitaryUnit } from "./opportunities-shared.js";

export function hasUnitsStaged(
    state: GameState,
    playerId: string,
    targetId: string,
    influence?: InfluenceMaps
): boolean {
    const targetCities = state.cities.filter(c => c.ownerId === targetId);
    const focusCity = targetCities.find(c => c.isCapital) ?? targetCities[0];
    if (!focusCity) return false;

    let stagingDistance: number = OPPORTUNITY_STAGING.baseDistance;
    let minStagedUnits: number = OPPORTUNITY_STAGING.minStagedUnits;
    if (influence) {
        const frontRatio = getInfluenceRatio(influence.front, focusCity.coord);
        const pressureRatio = getInfluenceRatio(influence.pressure, focusCity.coord);
        stagingDistance = OPPORTUNITY_STAGING.baseDistance + Math.round(frontRatio * OPPORTUNITY_STAGING.frontDistanceScale);
        minStagedUnits = Math.max(
            OPPORTUNITY_STAGING.absoluteMinUnits,
            Math.round(
                OPPORTUNITY_STAGING.minStagedUnits
                + (pressureRatio < OPPORTUNITY_STAGING.lowPressureThreshold ? 1 : 0)
                - (frontRatio > OPPORTUNITY_STAGING.highFrontThreshold ? 1 : 0)
            )
        );
    }

    const stagedMilitary = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitaryUnit(u) &&
        hexDistance(u.coord, focusCity.coord) <= stagingDistance
    );

    return stagedMilitary.length >= minStagedUnits;
}
