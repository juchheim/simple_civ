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
                { coord: { q: 0, r: 2 }, terrain: 'Plains' }, // Range 2
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
        stats: {},
        diplomacy: {
            p1: { p2: 'War' },
            p2: { p1: 'War' }
        },
        contacts: {},
        sharedVision: {},
        diplomacyOffers: []
    } as any;
}

describe('Bowguard Ranged Attack on City', () => {
    let state: GameState;

    beforeEach(() => {
        state = createTestState();
    });

    it('should allow Bowguard to attack ungarrisoned city from range 2', () => {
        // Setup:
        // P1 Bowguard at (0,0)
        // P2 City at (0,2) - Distance 2
        // No garrison

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
            coord: { q: 0, r: 2 },
            pop: 1,
            hp: 20,
            buildings: [],
            lastDamagedOnTurn: 0
        };

        state.units = [bowguard] as any;
        state.cities = [city] as any;

        // Ensure map has tiles
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: 'Plains' },
            { coord: { q: 0, r: 1 }, terrain: 'Plains' },
            { coord: { q: 0, r: 2 }, terrain: 'Plains' }
        ] as any;

        // Ensure visibility (though engine handleAttack checks it, we mock it via hasClearLineOfSight helper or just assume it works if tiles exist)
        // We need to make sure hasClearLineOfSight works. It uses state.map.tiles.
        // And we need to make sure the unit can see the target.
        // For simplicity, let's assume vision is handled or mocked if needed.
        // But handleAttack calls hasClearLineOfSight.
        // We need to make sure the tiles exist in the map.

        // Action: Attack City
        const action = {
            type: "Attack" as const,
            playerId: 'p1',
            attackerId: 'u1',
            targetId: 'c1',
            targetType: "City" as const
        };

        // Expectation: It succeeds and deals damage
        const newState = handleAttack(state, action);

        const updatedCity = newState.cities.find(c => c.id === 'c1');
        const updatedBowguard = newState.units.find(u => u.id === 'u1');

        // City took damage
        expect(updatedCity?.hp).toBeLessThan(20);
        // Bowguard used action
        expect(updatedBowguard?.hasAttacked).toBe(true);
        expect(updatedBowguard?.movesLeft).toBe(0);
        // Bowguard did NOT move
        expect(updatedBowguard?.coord).toEqual({ q: 0, r: 0 });
    });
});
