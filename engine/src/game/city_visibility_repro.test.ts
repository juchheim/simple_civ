import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, Player, UnitType, TerrainType, UnitState } from '../core/types';
import { handleCityAttack } from './actions/cities';
import { computeVisibility } from './vision';

// Mock createTestState if not available or just build state manually
function buildState(): GameState {
    return {
        turn: 1,
        players: [
            { id: 'p1', civName: 'AetherianVanguard', techs: [], completedProjects: [], isEliminated: false },
            { id: 'p2', civName: 'IronForge', techs: [], completedProjects: [], isEliminated: false }
        ] as Player[],
        map: {
            width: 10,
            height: 10,
            tiles: []
        },
        cities: [],
        units: [],
        diplomacy: { p1: { p2: 'War' }, p2: { p1: 'War' } },
        seed: 123,
        phase: 'Planning',
        currentPlayerId: 'p1',
        visibility: {},
        revealed: {},
        sharedVision: {}
    };
}

describe('City Attack Visibility', () => {
    let state: GameState;

    beforeEach(() => {
        state = buildState();
        // Create a line of tiles: City(0,0) -> Mountain(1,0) -> Target(2,0)
        // Using axial coordinates q, r
        // (0,0)
        // (1,0)
        // (2,0)
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p1' },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Mountain, ownerId: 'p1' }, // Mountain blocks LoS
            { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p2' },
        ];
    });

    it('should NOT allow city to attack unit behind mountain', () => {
        // Setup City at (0,0)
        state.cities.push({
            id: 'c1',
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            name: 'City1',
            pop: 1,
            hp: 20,
            maxHp: 20,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
            storedFood: 0,
            storedProduction: 0
        });

        // Setup Garrison (required for city attack)
        state.units.push({
            id: 'u_garrison',
            type: UnitType.SpearGuard,
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Fortified,
            hasAttacked: false
        });

        // Setup Target at (2,0)
        state.units.push({
            id: 'u_target',
            type: UnitType.BowGuard,
            ownerId: 'p2',
            coord: { q: 2, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false
        });

        // Verify visibility first
        const visible = computeVisibility(state, 'p1');
        // (2,0) should NOT be visible
        expect(visible).not.toContain('2,0');

        // Attempt attack
        expect(() => {
            handleCityAttack(state, {
                type: 'CityAttack',
                playerId: 'p1',
                cityId: 'c1',
                targetUnitId: 'u_target'
            });
        }).toThrow('Line of sight blocked');
    });

    it('should BLOCK diagonal attack if line passes through mountain', () => {
        // (0,0) -> (1,1) passes through (1,0)
        // Setup:
        // (0,0) City
        // (1,0) Mountain (BLOCKER)
        // (0,1) Clear
        // (1,1) Target

        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p1', overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Mountain, ownerId: 'p1', overlays: [] },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, ownerId: 'p1', overlays: [] },
            { coord: { q: 1, r: 1 }, terrain: TerrainType.Plains, ownerId: 'p2', overlays: [] },
        ];

        state.cities.push({
            id: 'c1',
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            name: 'City1',
            pop: 1, hp: 20, maxHp: 20, buildings: [], workedTiles: [], currentBuild: null, buildProgress: 0, isCapital: true, hasFiredThisTurn: false, milestones: [], storedFood: 0, storedProduction: 0
        });

        state.units.push({
            id: 'u_garrison',
            type: UnitType.SpearGuard,
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Fortified, hasAttacked: false
        });

        state.units.push({
            id: 'u_target',
            type: UnitType.BowGuard,
            ownerId: 'p2',
            coord: { q: 1, r: 1 },
            hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Normal, hasAttacked: false
        });

        const visible = computeVisibility(state, 'p1');
        expect(visible).not.toContain('1,1');

        expect(() => {
            handleCityAttack(state, {
                type: 'CityAttack',
                playerId: 'p1',
                cityId: 'c1',
                targetUnitId: 'u_target'
            });
        }).toThrow('Line of sight blocked');
    });

    it('should ALLOW diagonal attack if line passes through clear tile (even if other neighbor is mountain)', () => {
        // (0,0) -> (1,1) passes through (1,0)
        // Setup:
        // (0,0) City
        // (1,0) Clear (PATH)
        // (0,1) Mountain (IGNORED)
        // (1,1) Target

        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p1', overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p1', overlays: [] },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Mountain, ownerId: 'p1', overlays: [] },
            { coord: { q: 1, r: 1 }, terrain: TerrainType.Plains, ownerId: 'p2', overlays: [] },
        ];

        state.cities.push({
            id: 'c1',
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            name: 'City1',
            pop: 1, hp: 20, maxHp: 20, buildings: [], workedTiles: [], currentBuild: null, buildProgress: 0, isCapital: true, hasFiredThisTurn: false, milestones: [], storedFood: 0, storedProduction: 0
        });

        state.units.push({
            id: 'u_garrison',
            type: UnitType.SpearGuard,
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Fortified, hasAttacked: false
        });

        state.units.push({
            id: 'u_target',
            type: UnitType.BowGuard,
            ownerId: 'p2',
            coord: { q: 1, r: 1 },
            hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Normal, hasAttacked: false
        });

        const visible = computeVisibility(state, 'p1');
        expect(visible).toContain('1,1');

        expect(() => {
            handleCityAttack(state, {
                type: 'CityAttack',
                playerId: 'p1',
                cityId: 'c1',
                targetUnitId: 'u_target'
            });
        }).not.toThrow();
    });

    it('should BLOCK attack if target is NOT in visibility list (even if LoS is clear)', () => {
        // Setup:
        // (0,0) City
        // (1,0) Clear
        // (2,0) Target
        // Line of sight is clear, BUT we manually remove (2,0) from visibility.

        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p1', overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p1', overlays: [] },
            { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, ownerId: 'p2', overlays: [] },
        ];

        state.cities.push({
            id: 'c1',
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            name: 'City1',
            pop: 1, hp: 20, maxHp: 20, buildings: [], workedTiles: [], currentBuild: null, buildProgress: 0, isCapital: true, hasFiredThisTurn: false, milestones: [], storedFood: 0, storedProduction: 0
        });

        state.units.push({
            id: 'u_garrison',
            type: UnitType.SpearGuard,
            ownerId: 'p1',
            coord: { q: 0, r: 0 },
            hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Fortified, hasAttacked: false
        });

        state.units.push({
            id: 'u_target',
            type: UnitType.BowGuard,
            ownerId: 'p2',
            coord: { q: 2, r: 0 },
            hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Normal, hasAttacked: false
        });

        // Force visibility to NOT include target
        // Normally computeVisibility would see it. We simulate a desync or edge case by overriding.
        state.visibility['p1'] = ['0,0', '1,0']; // '2,0' is missing!

        expect(() => {
            handleCityAttack(state, {
                type: 'CityAttack',
                playerId: 'p1',
                cityId: 'c1',
                targetUnitId: 'u_target'
            });
        }).toThrow('Target not visible');
    });
});
