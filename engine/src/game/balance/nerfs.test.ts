
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, Player, City, UnitType, UnitState, PlayerPhase, TerrainType, DiplomacyState } from '../../core/types.js';
import { getCityYields } from '../rules.js';

function createTestState(): GameState {
    return {
        id: 'test-game',
        turn: 1,
        players: [],
        currentPlayerId: 'p1',
        phase: PlayerPhase.Planning,
        map: { width: 10, height: 10, tiles: [], rivers: [] },
        units: [],
        cities: [],
        seed: 123,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    } as any;
}

function createTestPlayer(id: string, civName: string): Player {
    return {
        id,
        civName,
        color: '#000000',
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false
    } as any;
}

function createTestCity(id: string, ownerId: string, coord: { q: number, r: number }, isCapital: boolean = false): City {
    return {
        id,
        name: 'Test City',
        ownerId,
        coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital,
        hasFiredThisTurn: false,
        milestones: []
    };
}

describe('Civ Balance Nerfs', () => {
    let state: GameState;
    let player: Player;
    let city: City;

    beforeEach(() => {
        state = createTestState();
        // Setup map tile
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] } as any
        ];
    });

    describe('Scholar Kingdoms: Citadel Protocol', () => {
        it('should provide +1 Science in Capital (Nerfed from +3)', () => {
            player = createTestPlayer('p1', 'ScholarKingdoms');
            state.players = [player];
            city = createTestCity('c1', 'p1', { q: 0, r: 0 }, true); // Capital
            state.cities = [city];

            // Base Science: 1
            // Citadel Protocol (Capital): Should be +1 (Total 2)
            // Note: worked tile (Plains 2F 1P) gives 0 Science.

            const yields = getCityYields(city, state);
            // Current code gives +3, so total 4. We want total 2 match the nerf.
            expect(yields.S).toBe(2);
        });

        it('should NOT provide capital bonus to non-capital cities', () => {
            player = createTestPlayer('p1', 'ScholarKingdoms');
            state.players = [player];
            city = createTestCity('c1', 'p1', { q: 0, r: 0 }, false); // Not Capital
            state.cities = [city];

            const yields = getCityYields(city, state);
            expect(yields.S).toBe(1); // Base only
        });

        it('should provide +1 Science per CityWard (Nerfed from +3)', () => {
            player = createTestPlayer('p1', 'ScholarKingdoms');
            state.players = [player];
            // Create a city with a CityWard
            city = createTestCity('c1', 'p1', { q: 0, r: 0 }, false);
            // Manually add CityWard building since createTestCity doesn't have it
            city.buildings.push('CityWard' as any);
            state.cities = [city];

            // Base Science: 1
            // City Ward Bonus: Should be +1 (Total 2)

            const yields = getCityYields(city, state);
            expect(yields.S).toBe(2);
        });
    });

    describe('Starborne Seekers: Peaceful Meditation', () => {
        it('should provide +1 Science when at peace (Nerfed from +3)', () => {
            player = createTestPlayer('p1', 'StarborneSeekers');
            const otherPlayer = createTestPlayer('p2', 'ForgeClans');
            state.players = [player, otherPlayer];
            city = createTestCity('c1', 'p1', { q: 0, r: 0 }, false);
            state.cities = [city];

            // Diplomacy defaults to Peace (undefined is treated as peace/neutral)
            // Base Science: 1
            // Peaceful Meditation: Should be +1 (Total 2)

            const yields = getCityYields(city, state);
            expect(yields.S).toBe(2);
        });

        it('should provide +0 bonus Science when at war', () => {
            player = createTestPlayer('p1', 'StarborneSeekers');
            const otherPlayer = createTestPlayer('p2', 'ForgeClans');
            state.players = [player, otherPlayer];
            city = createTestCity('c1', 'p1', { q: 0, r: 0 }, false);
            state.cities = [city];

            // Set War
            state.diplomacy = {
                'p1': { 'p2': DiplomacyState.War },
                'p2': { 'p1': DiplomacyState.War }
            };

            const yields = getCityYields(city, state);
            expect(yields.S).toBe(1); // Base only (1)
        });
    });
});
