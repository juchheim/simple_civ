import { UNITS } from "../../../core/constants.js";
import { hexDistance } from "../../../core/hex.js";
import { City, DiplomacyState, GameState, Unit, UnitType } from "../../../core/types.js";

export type SettlerGateReason =
    | "allowed"
    | "unsafe-war-no-staging-city"
    | "enemy-military-near-city";

export type SettlerProductionGate = {
    allowSettlers: boolean;
    reason: SettlerGateReason;
    hasSafeCity: boolean;
    enemyMilitaryNearCity: boolean;
};

const NATIVE_OWNER_ID = "natives";
const NATIVE_THREAT_RADIUS_CAP = 2;

export function isSettlerEscortCombatUnit(type: UnitType): boolean {
    if (UNITS[type].domain === "Civilian" || UNITS[type].domain === "Air") return false;
    return type !== UnitType.Scout && type !== UnitType.ArmyScout && type !== UnitType.Skiff;
}

function getEnemyPlayerIds(state: GameState, playerId: string, warOnly: boolean): Set<string> {
    const ids = new Set<string>();
    for (const player of state.players) {
        if (player.id === playerId || player.isEliminated) continue;
        if (!warOnly || state.diplomacy?.[playerId]?.[player.id] === DiplomacyState.War) {
            ids.add(player.id);
        }
    }
    return ids;
}

export function getSettlerThreatOwnerIds(state: GameState, playerId: string, warOnly: boolean): Set<string> {
    const enemyIds = getEnemyPlayerIds(state, playerId, warOnly);
    const hasNativeMilitary = state.units.some(unit =>
        unit.ownerId === NATIVE_OWNER_ID &&
        isSettlerEscortCombatUnit(unit.type)
    );
    if (hasNativeMilitary) {
        enemyIds.add(NATIVE_OWNER_ID);
    }
    return enemyIds;
}

function getEnemyMilitaryUnits(state: GameState, enemyIds: Set<string>): Unit[] {
    if (enemyIds.size === 0) return [];
    return state.units.filter(unit =>
        enemyIds.has(unit.ownerId) &&
        isSettlerEscortCombatUnit(unit.type)
    );
}

export function hasHostileMilitaryNearCity(
    state: GameState,
    playerId: string,
    cityCoord: { q: number; r: number },
    radius: number,
    warOnly: boolean
): boolean {
    const hostileIds = getSettlerThreatOwnerIds(state, playerId, warOnly);
    if (hostileIds.size === 0) return false;
    const hostileUnits = getEnemyMilitaryUnits(state, hostileIds);
    return hostileUnits.some(unit => {
        const effectiveRadius = unit.ownerId === NATIVE_OWNER_ID
            ? Math.min(radius, NATIVE_THREAT_RADIUS_CAP)
            : radius;
        return hexDistance(unit.coord, cityCoord) <= effectiveRadius;
    });
}

function cityHasGarrison(state: GameState, city: City): boolean {
    return state.units.some(unit =>
        unit.ownerId === city.ownerId &&
        hexDistance(unit.coord, city.coord) === 0 &&
        isSettlerEscortCombatUnit(unit.type)
    );
}

function frontLineCityIds(myCities: City[], enemyCities: City[], enemyMilitary: Unit[]): Set<string> {
    if (myCities.length === 0) return new Set();
    let minDistance = Number.POSITIVE_INFINITY;
    const cityDistances = new Map<string, number>();

    for (const city of myCities) {
        let nearest = Number.POSITIVE_INFINITY;

        for (const enemyCity of enemyCities) {
            nearest = Math.min(nearest, hexDistance(city.coord, enemyCity.coord));
        }

        if (!Number.isFinite(nearest)) {
            for (const enemyUnit of enemyMilitary) {
                nearest = Math.min(nearest, hexDistance(city.coord, enemyUnit.coord));
            }
        }

        cityDistances.set(city.id, nearest);
        minDistance = Math.min(minDistance, nearest);
    }

    if (!Number.isFinite(minDistance)) return new Set();

    const frontLineIds = new Set<string>();
    for (const city of myCities) {
        if (cityDistances.get(city.id) === minDistance) {
            frontLineIds.add(city.id);
        }
    }
    return frontLineIds;
}

export function hasEnemyMilitaryNearAnyCity(
    state: GameState,
    playerId: string,
    radius: number,
    warOnly: boolean
): boolean {
    const myCities = state.cities.filter(city => city.ownerId === playerId);
    if (myCities.length === 0) return false;

    const enemyIds = getSettlerThreatOwnerIds(state, playerId, warOnly);
    const enemyMilitary = getEnemyMilitaryUnits(state, enemyIds);
    if (enemyMilitary.length === 0) return false;

    return myCities.some(city =>
        enemyMilitary.some(enemy => {
            const effectiveRadius = enemy.ownerId === NATIVE_OWNER_ID
                ? Math.min(radius, NATIVE_THREAT_RADIUS_CAP)
                : radius;
            return hexDistance(enemy.coord, city.coord) <= effectiveRadius;
        })
    );
}

function safeSettlerStagingCityIds(state: GameState, playerId: string): Set<string> {
    const myCities = state.cities.filter(city => city.ownerId === playerId);
    if (myCities.length === 0) return new Set();
    const singleCityMode = myCities.length === 1;

    const warEnemyIds = getEnemyPlayerIds(state, playerId, true);
    const enemyPlayerIds = warEnemyIds.size > 0
        ? warEnemyIds
        : getEnemyPlayerIds(state, playerId, false);
    const enemyOwnerIds = getSettlerThreatOwnerIds(state, playerId, warEnemyIds.size > 0);
    if (enemyOwnerIds.size === 0) return new Set(myCities.map(city => city.id));

    const enemyMilitary = getEnemyMilitaryUnits(state, enemyOwnerIds);
    const enemyCities = state.cities.filter(city => enemyPlayerIds.has(city.ownerId));
    const frontLines = frontLineCityIds(myCities, enemyCities, enemyMilitary);
    const safeIds = new Set<string>();

    for (const city of myCities) {
        if (!singleCityMode && frontLines.has(city.id)) continue;

        const hasGarrison = cityHasGarrison(state, city) || (
            singleCityMode &&
            state.units.some(unit =>
                unit.ownerId === city.ownerId &&
                isSettlerEscortCombatUnit(unit.type) &&
                hexDistance(unit.coord, city.coord) <= 1
            )
        );
        if (!hasGarrison) continue;

        const enemyAdjacent = enemyMilitary.some(enemy => hexDistance(enemy.coord, city.coord) <= 1);
        if (enemyAdjacent) continue;

        const underSiege = enemyMilitary.some(enemy => hexDistance(enemy.coord, city.coord) <= 2);
        if (underSiege) continue;

        safeIds.add(city.id);
    }

    return safeIds;
}

export function isSafeSettlerStagingCity(
    state: GameState,
    playerId: string,
    cityId: string
): boolean {
    return safeSettlerStagingCityIds(state, playerId).has(cityId);
}

export function hasSafeSettlerStagingCity(state: GameState, playerId: string): boolean {
    return safeSettlerStagingCityIds(state, playerId).size > 0;
}

export function evaluateSettlerProductionGate(
    state: GameState,
    playerId: string,
    atWar: boolean
): SettlerProductionGate {
    const enemyMilitaryNearCity = hasEnemyMilitaryNearAnyCity(state, playerId, 4, false);
    const hasSafeCity = hasSafeSettlerStagingCity(state, playerId);

    if (atWar && !hasSafeCity) {
        return {
            allowSettlers: false,
            reason: "unsafe-war-no-staging-city",
            hasSafeCity,
            enemyMilitaryNearCity
        };
    }

    if (!atWar && enemyMilitaryNearCity) {
        return {
            allowSettlers: false,
            reason: "enemy-military-near-city",
            hasSafeCity,
            enemyMilitaryNearCity
        };
    }

    return {
        allowSettlers: true,
        reason: "allowed",
        hasSafeCity,
        enemyMilitaryNearCity
    };
}
