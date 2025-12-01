import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, UnitType, UnitState } from '../core/types';
import { handleAttack } from './actions/units';
import { UNITS } from '../core/constants';

// Mock state creation if helper not available
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
                { coord: { q: 1, r: 0 }, terrain: 'Plains' }, // Adjacent
            ]
        },
        players: [
            { id: 'p1', civ: 'AetherianVanguard', techs: [] },
            { id: 'p2', civ: 'ForgeClans', techs: [] }
        ],
        units: [],
        cities: [],
        revealed: {},
        research: {},
        projects: {},
        stats: {}
    } as any;
}

describe('Bowguard Settler Capture in City', () => {
    let state: GameState;

    beforeEach(() => {
        state = createTestState();
    });

    it('should currently allow Bowguard to capture Settler in enemy city (Reproduction)', () => {
        // Setup:
        // P1 Bowguard at (0,0)
        // P2 City at (0,1)
        // P2 Settler at (0,1)

        const bowguard = {
            id: 'u1',
            ownerId: 'p1',
            type: UnitType.BowGuard,
            coord: { q: 0, r: 0 },
            movesLeft: 1,
            hp: 10,
            state: UnitState.Normal,
            hasAttacked: false
        };

        const city = {
            id: 'c1',
            ownerId: 'p2',
            coord: { q: 0, r: 1 },
            pop: 1,
            hp: 20,
            buildings: []
        };

        const settler = {
            id: 'u2',
            ownerId: 'p2',
            type: UnitType.Settler,
            coord: { q: 0, r: 1 },
            movesLeft: 1,
            hp: 1,
            state: UnitState.Normal
        };

        state.units = [bowguard, settler] as any;
        state.cities = [city] as any;

        // Ensure map has tiles
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: 'Plains' },
            { coord: { q: 0, r: 1 }, terrain: 'Plains' }
        ] as any;

        // Action: Attack Settler
        const action = {
            type: "Attack" as const,
            playerId: 'p1',
            attackerId: 'u1',
            targetId: 'u2',
            targetType: "Unit" as const
        };

        // Expectation (Current Bug): It succeeds
        const newState = handleAttack(state, action);

        const updatedBowguard = newState.units.find(u => u.id === 'u1');
        const updatedSettler = newState.units.find(u => u.id === 'u2');

        // Bowguard moved into city
        expect(updatedBowguard?.coord).toEqual({ q: 0, r: 1 });
        // Settler captured
        expect(updatedSettler?.ownerId).toBe('p1');
    });

    it('should currently allow SpearGuard to capture Settler in enemy city (Reproduction)', () => {
        // Setup:
        // P1 SpearGuard at (0,0)
        // P2 City at (0,1)
        // P2 Settler at (0,1)

        const spearguard = {
            id: 'u3',
            ownerId: 'p1',
            type: UnitType.SpearGuard,
            coord: { q: 0, r: 0 },
            movesLeft: 1,
            hp: 10,
            state: UnitState.Normal,
            hasAttacked: false
        };

        const city = {
            id: 'c1',
            ownerId: 'p2',
            coord: { q: 0, r: 1 },
            pop: 1,
            hp: 20,
            buildings: []
        };

        const settler = {
            id: 'u2',
            ownerId: 'p2',
            type: UnitType.Settler,
            coord: { q: 0, r: 1 },
            movesLeft: 1,
            hp: 1,
            state: UnitState.Normal
        };

        state.units = [spearguard, settler] as any;
        state.cities = [city] as any;

        // Ensure map has tiles
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: 'Plains' },
            { coord: { q: 0, r: 1 }, terrain: 'Plains' }
        ] as any;

        // Action: Attack Settler
        const action = {
            type: "Attack" as const,
            playerId: 'p1',
            attackerId: 'u3',
            targetId: 'u2',
            targetType: "Unit" as const
        };

        // Expectation (Current Bug): It succeeds
        const newState = handleAttack(state, action);

        const updatedSpearguard = newState.units.find(u => u.id === 'u3');
        const updatedSettler = newState.units.find(u => u.id === 'u2');

        // SpearGuard moved into city
        expect(updatedSpearguard?.coord).toEqual({ q: 0, r: 1 });
        // Settler captured
        expect(updatedSettler?.ownerId).toBe('p1');
    });
});
