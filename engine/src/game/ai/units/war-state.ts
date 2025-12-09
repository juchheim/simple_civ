import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { DiplomacyState, GameState, Player, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { estimateMilitaryPower, findFinishableEnemies } from "../goals.js";

export function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
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

    // Check if any enemy is "finishable" (few cities)
    const hasWeakEnemy = warTargets.some(p => {
        const cities = state.cities.filter(c => c.ownerId === p.id);
        return cities.length <= 2;
    });

    // v0.99: Steamroll logic - if we are 2x stronger OR enemy is weak, prosecute!
    return enemyPower > 0 && (ratio >= 2.0 || hasWeakEnemy);
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
    type SiegeMemory = { cityId: string; assignedTurn: number };
    const primarySiegeMemory: Map<string, SiegeMemory> = (selectPrimarySiegeCity as any)._memory || new Map();
    (selectPrimarySiegeCity as any)._memory = primarySiegeMemory;

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
        aiInfo(`[AI FINISH HIM] ${playerId} targeting ${candidate.name} (${candidate.ownerId}) - weak enemy with few cities!`);
    }

    primarySiegeMemory.set(playerId, { cityId: candidate.id, assignedTurn: state.turn });
    return candidate;
}

export function hasMilitaryAdvantage(state: GameState, playerId: string): { advantage: boolean; ratio: number } {
    const warTargets = getWarTargets(state, playerId);
    if (warTargets.length === 0) return { advantage: true, ratio: Infinity };

    const { ratio } = warPowerRatio(state, playerId, warTargets);
    return { advantage: ratio >= 1.0, ratio };
}
