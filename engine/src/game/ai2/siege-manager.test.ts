import { describe, it, expect } from 'vitest';
import { planSiegeOperations } from './siege-manager.js';
import { MilitaryDoctrine } from './military-doctrine.js';
import { GameState, Unit, UnitType, City, UnitState } from '../../core/types.js';

function createTestState(): GameState {
    return {
        turn: 1,
        seed: 123,
        map: {
            width: 10,
            height: 10,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: 'Plains' },
                { coord: { q: 0, r: 1 }, terrain: 'Plains' },
                { coord: { q: 0, r: 2 }, terrain: 'Plains' },
            ]
        },
        players: [
            { id: 'player1', civ: 'ForgeClans', techs: [] },
            { id: 'enemy', civ: 'AetherianVanguard', techs: [] }
        ],
        units: [],
        cities: [],
        revealed: {},
        research: {},
        projects: {},
        stats: {},
        diplomacy: {
            player1: { enemy: 'War' },
            enemy: { player1: 'War' }
        },
        contacts: {},
        sharedVision: {},
        diplomacyOffers: []
    } as any;
}

function createTestUnit(ownerId: string, type: UnitType, coord: { q: number, r: number }): Unit {
    return {
        id: `u_${ownerId}_${Math.random()}`,
        ownerId,
        type,
        coord,
        movesLeft: 1,
        hp: 100,
        state: UnitState.Normal,
        hasAttacked: false
    } as any;
}

function createTestCity(ownerId: string, coord: { q: number, r: number }): City {
    return {
        id: `c_${ownerId}_${Math.random()}`,
        ownerId,
        coord,
        pop: 1,
        hp: 100,
        maxHp: 100,
        buildings: [],
        lastDamagedOnTurn: 0
    } as any;
}

describe('SiegeManager', () => {
    // SiegeBreaker Doctrine for testing
    const aggressiveDoctrine: MilitaryDoctrine = {
        type: 'SiegeBreaker',
        breachThresholdRatio: 1.2,
        cityAttackPriorityMult: 5.0,
        ignoreCityArmor: true,
        flankingBonusMult: 1.0,
        unitCycleAggression: 0.9,
        preferredTradeRatio: 0.6
    };

    it('should cycle wounded units away from the front', () => {
        const state = createTestState();
        const playerId = 'player1';

        // Enemy city at 0,0
        const enemyCity = createTestCity('enemy', { q: 0, r: 0 });
        state.cities.push(enemyCity);

        // Wounded unit at 0,1 (frontline)
        const wounded = createTestUnit(playerId, UnitType.SpearGuard, { q: 0, r: 1 });
        wounded.hp = 4; // Wounded (Max 10) -> 40%
        state.units.push(wounded);

        // Fresh unit at 0,2 (behind frontline)
        const fresh = createTestUnit(playerId, UnitType.SpearGuard, { q: 0, r: 2 });
        fresh.hp = 10; // Full HP
        state.units.push(fresh);

        // Ensure map matches
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: 'Plains', type: 'plain' },
            { coord: { q: 0, r: 1 }, terrain: 'Plains', type: 'plain' },
            { coord: { q: 0, r: 2 }, terrain: 'Plains', type: 'plain' },
            { coord: { q: 1, r: 0 }, terrain: 'Plains', type: 'plain' }, // Retreat spot
            { coord: { q: 1, r: 1 }, terrain: 'Plains', type: 'plain' }
        ] as any;

        const reserved = new Set<string>();
        const plan = planSiegeOperations(state, playerId, enemyCity.id, reserved, aggressiveDoctrine);

        expect(plan.cycleMoves).toHaveLength(2);

        // Should have a move for wounded unit to retreat
        const woundedMove = plan.cycleMoves.find(m => m.unitId === wounded.id);
        expect(woundedMove).toBeDefined();
        // Should move AWAY from (0,0) - likely to (1,0) or (1,1)
        expect(woundedMove!.to).not.toEqual({ q: 0, r: 0 });

        // Should have a move for fresh unit to take the spot (0,1)
        const freshMove = plan.cycleMoves.find(m => m.unitId === fresh.id);
        expect(freshMove).toBeDefined();
        expect(freshMove!.to).toEqual({ q: 0, r: 1 });
    });

    it('should NOT cycle if unit is not wounded enough', () => {
        const state = createTestState();
        const playerId = 'player1';
        const enemyCity = createTestCity('enemy', { q: 0, r: 0 });
        state.cities.push(enemyCity);

        const notWounded = createTestUnit(playerId, UnitType.SpearGuard, { q: 0, r: 1 });
        notWounded.hp = 8; // 80% HP - not wounded enough (<60%)
        state.units.push(notWounded);

        const fresh = createTestUnit(playerId, UnitType.SpearGuard, { q: 0, r: 2 });
        fresh.hp = 10;
        state.units.push(fresh);

        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: 'Plains', type: 'plain' },
            { coord: { q: 0, r: 1 }, terrain: 'Plains', type: 'plain' },
            { coord: { q: 0, r: 2 }, terrain: 'Plains', type: 'plain' }
        ] as any;

        const reserved = new Set<string>();
        const plan = planSiegeOperations(state, playerId, enemyCity.id, reserved, aggressiveDoctrine);

        expect(plan.cycleMoves).toHaveLength(0);
    });

    it('should NOT cycle if no fresh unit is available', () => {
        const state = createTestState();
        const playerId = 'player1';
        const enemyCity = createTestCity('enemy', { q: 0, r: 0 });
        state.cities.push(enemyCity);

        const wounded = createTestUnit(playerId, UnitType.SpearGuard, { q: 0, r: 1 });
        wounded.hp = 4;
        state.units.push(wounded);

        // No fresh unit behind

        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: 'Plains', type: 'plain' },
            { coord: { q: 0, r: 1 }, terrain: 'Plains', type: 'plain' }
        ] as any;

        const reserved = new Set<string>();
        const plan = planSiegeOperations(state, playerId, enemyCity.id, reserved, aggressiveDoctrine);

        expect(plan.cycleMoves).toHaveLength(0);
    });
});
