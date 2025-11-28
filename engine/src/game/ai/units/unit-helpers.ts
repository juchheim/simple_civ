import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import {
    DiplomacyState,
    GameState,
    Player,
    TerrainType,
    UnitType,
    UnitState,
    BuildingType
} from "../../../core/types.js";
import {
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    DAMAGE_BASE,
    DAMAGE_MAX,
    DAMAGE_MIN,
    TERRAIN,
    UNITS
} from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { sortByDistance } from "../shared/metrics.js";
import { getEffectiveUnitStats } from "../../helpers/combat.js";
import { findFinishableEnemies, estimateMilitaryPower } from "../goals.js";

type SiegeMemory = { cityId: string; assignedTurn: number };

const primarySiegeMemory = new Map<string, SiegeMemory>();

export function cityIsCoastal(state: GameState, city: any): boolean {
    return getNeighbors(city.coord).some(c => {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, c));
        return tile && (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea);
    });
}

export function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

export function isScoutType(unitType: UnitType): boolean {
    return unitType === UnitType.Scout || unitType === UnitType.ArmyScout;
}

export function tileDefenseScore(state: GameState, coord: { q: number; r: number }): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -99;
    return TERRAIN[tile.terrain].defenseMod ?? 0;
}

export function expectedDamageToUnit(attacker: any, defender: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    const defenseStats = getEffectiveUnitStats(defender, state);
    let defensePower = defenseStats.def;
    const tile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
    if (tile) {
        defensePower += TERRAIN[tile.terrain].defenseMod;
    }
    if (defender.state === UnitState.Fortified) defensePower += 1;
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

export function expectedDamageToCity(attacker: any, city: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2);
    if (city.buildings?.includes(BuildingType.CityWard)) {
        defensePower += CITY_WARD_DEFENSE_BONUS;
    }
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

export function expectedDamageFrom(defender: any, attacker: any, state: GameState): number {
    return expectedDamageToUnit(defender, attacker, state);
}

export function friendlyAdjacencyCount(state: GameState, playerId: string, coord: { q: number; r: number }): number {
    return getNeighbors(coord).filter(n =>
        state.units.some(u => u.ownerId === playerId && hexEquals(u.coord, n))
    ).length;
}

export function enemiesWithin(state: GameState, playerId: string, coord: { q: number; r: number }, radius: number): number {
    return state.units.filter(u =>
        u.ownerId !== playerId &&
        hexDistance(u.coord, coord) <= radius
    ).length;
}

export function getWarTargets(state: GameState, playerId: string): Player[] {
    return state.players.filter(
        p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

export function warPowerRatio(state: GameState, playerId: string, warTargets: Player[]): { myPower: number; enemyPower: number; ratio: number } {
    if (!warTargets.length) {
        return { myPower: 0, enemyPower: 0, ratio: 0 };
    }
    const myPower = estimateMilitaryPower(playerId, state);
    const enemyPowers = warTargets.map(t => estimateMilitaryPower(t.id, state));
    const enemyPower = Math.max(...enemyPowers, 0);
    const ratio = enemyPower > 0 ? myPower / enemyPower : Number.POSITIVE_INFINITY;
    return { myPower, enemyPower, ratio };
}

export function shouldUseWarProsecutionMode(state: GameState, playerId: string, warTargets: Player[]): boolean {
    if (!warTargets.length) return false;
    const { enemyPower, ratio } = warPowerRatio(state, playerId, warTargets);
    return enemyPower > 0 && ratio >= 3;
}

export function warGarrisonCap(state: GameState, playerId: string, isInWarProsecutionMode: boolean): number {
    const playerCities = state.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return 0;
    if (isInWarProsecutionMode) return 1;
    return Math.max(1, Math.floor(playerCities.length / 2));
}

export function selectHeldGarrisons(state: GameState, playerId: string, warTargets: Player[], maxGarrisons: number): Set<string> {
    const held = new Set<string>();
    if (maxGarrisons <= 0) return held;

    const playerCities = state.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return held;

    const enemyUnits = state.units.filter(u => warTargets.some(w => w.id === u.ownerId));
    const orderedCities = [...playerCities].sort((a, b) => {
        if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
        const aThreat = enemyUnits.length ? Math.min(...enemyUnits.map(e => hexDistance(e.coord, a.coord))) : Number.POSITIVE_INFINITY;
        const bThreat = enemyUnits.length ? Math.min(...enemyUnits.map(e => hexDistance(e.coord, b.coord))) : Number.POSITIVE_INFINITY;
        if (aThreat !== bThreat) return aThreat - bThreat;
        return a.hp - b.hp;
    });

    for (const city of orderedCities) {
        if (held.size >= maxGarrisons) break;
        const stationed = state.units.filter(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
        if (!stationed.length) continue;
        const combatants = stationed.filter(u => UNITS[u.type].domain !== "Civilian");
        const defender = (combatants.length ? combatants : stationed).sort((a, b) => b.hp - a.hp)[0];
        if (defender) {
            held.add(defender.id);
        }
    }

    return held;
}

export function selectPrimarySiegeCity(
    state: GameState,
    playerId: string,
    units: any[],
    warCities: any[],
    options?: { forceRetarget?: boolean; preferClosest?: boolean }
): any | null {
    let preferClosest = !!options?.preferClosest;
    if (options?.forceRetarget) {
        primarySiegeMemory.delete(playerId);
    }

    const stored = primarySiegeMemory.get(playerId);
    if (stored) {
        const storedCity = warCities.find(c => c.id === stored.cityId);
        if (storedCity) {
            const turnsOnTarget = state.turn - stored.assignedTurn;
            if (turnsOnTarget >= 15) {
                primarySiegeMemory.delete(playerId);
                preferClosest = true;
            } else {
                return storedCity;
            }
        } else {
            primarySiegeMemory.delete(playerId);
        }
    }

    if (!warCities.length) {
        primarySiegeMemory.delete(playerId);
        return null;
    }

    if (!units.length) {
        primarySiegeMemory.delete(playerId);
        return null;
    }

    const finishableEnemyIds = findFinishableEnemies(playerId, state);
    const finishableCities = warCities.filter(c => finishableEnemyIds.includes(c.ownerId));
    
    const citiesToConsider = finishableCities.length > 0 ? finishableCities : warCities;
    
    const candidate = citiesToConsider
        .map(c => ({
            city: c,
            hp: c.hp,
            dist: Math.min(...units.map(u => hexDistance(u.coord, c.coord))),
            isCapital: c.isCapital ? 0 : 1,
            isFinishable: finishableEnemyIds.includes(c.ownerId) ? 0 : 1
        }))
        .sort((a, b) => {
            if (preferClosest) {
                if (a.dist !== b.dist) return a.dist - b.dist;
                if (a.hp !== b.hp) return a.hp - b.hp;
                if (a.isFinishable !== b.isFinishable) return a.isFinishable - b.isFinishable;
                return a.isCapital - b.isCapital;
            }
            if (a.isFinishable !== b.isFinishable) return a.isFinishable - b.isFinishable;
            if (a.isCapital !== b.isCapital) return a.isCapital - b.isCapital;
            if (a.hp !== b.hp) return a.hp - b.hp;
            return a.dist - b.dist;
        })[0].city;

    if (finishableEnemyIds.includes(candidate.ownerId)) {
        console.info(`[AI FINISH HIM] ${playerId} targeting ${candidate.name} (${candidate.ownerId}) - weak enemy with few cities!`);
    }

    primarySiegeMemory.set(playerId, { cityId: candidate.id, assignedTurn: state.turn });
    return candidate;
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
        const movedDirect = tryAction(state, {
            type: "MoveUnit",
            playerId,
            unitId,
            to: target
        });
        if (movedDirect !== state) return movedDirect;
    }

    const neighbors = getNeighbors(unit.coord);
    const ordered = sortByDistance(target, neighbors, coord => coord);
    for (const neighbor of ordered) {
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
