import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import {
    DiplomacyState,
    GameState,
    Player,
    TerrainType,
    UnitType
} from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { sortByDistance } from "../shared/metrics.js";
import { tileDefenseScore, expectedDamageFrom, expectedDamageToCity, expectedDamageToUnit, friendlyAdjacencyCount, enemiesWithin } from "./combat-metrics.js";
import {
    getWarTargets,
    hasMilitaryAdvantage,
    isAtWar,
    selectHeldGarrisons,
    selectPrimarySiegeCity,
    shouldUseWarProsecutionMode,
    warGarrisonCap,
    warPowerRatio
} from "./war-state.js";
import {
    canKillNearbyEnemy,
    countThreatsToTile,
    evaluateTileDanger,
    findSafeRetreatTile,
    getBestSkirmishPosition,
    getNearbyThreats,
    isAttackSafe,
    isMeleeAttackExposed,
    shouldRetreat,
    shouldRetreatAfterAttacking,
    estimateSurvivalRounds
} from "./movement-safety.js";

export {
    tileDefenseScore,
    expectedDamageToUnit,
    expectedDamageToCity,
    expectedDamageFrom,
    friendlyAdjacencyCount,
    enemiesWithin,
    isAtWar,
    getWarTargets,
    warPowerRatio,
    shouldUseWarProsecutionMode,
    warGarrisonCap,
    selectHeldGarrisons,
    selectPrimarySiegeCity,
    getBestSkirmishPosition,
    evaluateTileDanger,
    getNearbyThreats,
    findSafeRetreatTile,
    estimateSurvivalRounds,
    canKillNearbyEnemy,
    shouldRetreat,
    hasMilitaryAdvantage,
    countThreatsToTile,
    isAttackSafe,
    shouldRetreatAfterAttacking,
    isMeleeAttackExposed
};

export function cityIsCoastal(state: GameState, city: any): boolean {
    return getNeighbors(city.coord).some(c => {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, c));
        return tile && (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea);
    });
}

export function isScoutType(unitType: UnitType): boolean {
    return unitType === UnitType.Scout || unitType === UnitType.ArmyScout;
}

export function getThreatLevel(state: GameState, city: any, playerId: string): "none" | "low" | "high" | "critical" {
    const enemies = enemiesWithin(state, playerId, city.coord, 3);
    if (enemies === 0) return "none";

    const cityHpPercent = city.hp / city.maxHp;
    if (cityHpPercent <= 0.5 || enemies >= 3) return "critical";
    if (enemies >= 1) return "high";
    return "low";
}

export function stepToward(
    state: GameState,
    playerId: string,
    unitId: string,
    target: { q: number; r: number }
): GameState {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || unit.movesLeft <= 0) return state;

    if (hexDistance(unit.coord, target) === 1) {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, target));
        let allowed = true;
        if (tile && tile.ownerId && tile.ownerId !== playerId) {
            const diplomacy = state.diplomacy[playerId]?.[tile.ownerId];
            const isCity = state.cities.some(c => hexEquals(c.coord, target));
            if (!isCity && diplomacy !== DiplomacyState.War) allowed = false;
        }

        if (allowed) {
            const movedDirect = tryAction(state, {
                type: "MoveUnit",
                playerId,
                unitId,
                to: target
            });
            if (movedDirect !== state) return movedDirect;
        }
    }

    const neighbors = getNeighbors(unit.coord);
    const ordered = sortByDistance(target, neighbors, coord => coord);
    for (const neighbor of ordered) {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, neighbor));
        if (tile && tile.ownerId && tile.ownerId !== playerId) {
            const diplomacy = state.diplomacy[playerId]?.[tile.ownerId];
            const isCity = state.cities.some(c => hexEquals(c.coord, neighbor));
            if (!isCity && diplomacy !== DiplomacyState.War) continue;
        }

        const moved = tryAction(state, {
            type: "MoveUnit",
            playerId,
            unitId,
            to: neighbor
        });
        if (moved !== state) return moved;
    }

    return state;
}
