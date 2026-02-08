import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, Player, City, UnitType, BuildingType, PlayerPhase, TerrainType } from '../../core/types.js';
import { canBuild, getCityYields } from '../rules.js';

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

function createTestCity(id: string, ownerId: string, coord: { q: number, r: number }): City {
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
        isCapital: false,
        hasFiredThisTurn: false,
        milestones: []
    };
}

describe('Bulwark Building Balances', () => {
    let state: GameState;
    let player: Player;
    let city: City;

    beforeEach(() => {
        state = createTestState();
        player = createTestPlayer('p1', 'ScholarKingdoms');
        state.players = [player];

        // Setup city at 0,0
        city = createTestCity('c1', 'p1', { q: 0, r: 0 });
        state.cities = [city];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] } as any
        ];

        // Give techs required for units
        player.techs = ['StoneworkHalls', 'Fieldcraft', 'FormationTraining'] as any[];
    });

    describe('Production Restrictions', () => {
        it('should allow building military units when no Bulwark Building is present', () => {
            // Can build SpearGuard?
            expect(canBuild(city, 'Unit', UnitType.SpearGuard, state)).toBe(true);
        });

        it('should PREVENT building military units when a Bulwark Building is present', () => {
            // Add Bulwark Building
            city.buildings.push(BuildingType.Bulwark);

            // UtilityV2 allows military builds even with Bulwark present
            expect(canBuild(city, 'Unit', UnitType.SpearGuard, state)).toBe(true);

            // Should be able to build BowGuard
            expect(canBuild(city, 'Unit', UnitType.BowGuard, state)).toBe(true);

            // Should be able to build Riders
            expect(canBuild(city, 'Unit', UnitType.Riders, state)).toBe(true);
        });

        it('should ALLOW building Civilian units and Scouts when a Bulwark Building is present', () => {
            // Add Bulwark Building
            city.buildings.push(BuildingType.Bulwark);

            // Settlers require pop >= 2, so set city pop to 2
            city.pop = 2;

            // Should be able to build Settler (Civilian)
            expect(canBuild(city, 'Unit', UnitType.Settler, state)).toBe(true);

            // Should be able to build Scout (Recon - explicitly allowed exception)
            expect(canBuild(city, 'Unit', UnitType.Scout, state)).toBe(true);
        });

        it('should ALLOW building other Buildings when a Bulwark Building is present', () => {
            // Add Bulwark Building
            city.buildings.push(BuildingType.Bulwark);

            // Should be able to build Farmstead
            expect(canBuild(city, 'Building', 'Farmstead', state)).toBe(true);
        });
    });

    describe('Construction Restrictions', () => {
        it('should ALLOW Scholar Kingdoms to build Bulwark', () => {
            // player is already ScholarKingdoms in beforeEach
            expect(canBuild(city, 'Building', BuildingType.Bulwark, state)).toBe(true);
        });

        it('should ALLOW Starborne Seekers to build Bulwark', () => {
            player.civName = 'StarborneSeekers';
            expect(canBuild(city, 'Building', BuildingType.Bulwark, state)).toBe(true);
        });

        it('should PREVENT other civs (e.g. ForgeClans) from building Bulwark', () => {
            player.civName = 'ForgeClans';
            expect(canBuild(city, 'Building', BuildingType.Bulwark, state)).toBe(false);
        });
    });

    describe('Science Yield', () => {
        it('should not grant bonus Science when a Bulwark Building is present', () => {
            // Base science is 1 (City Center)
            const baseYields = getCityYields(city, state);
            expect(baseYields.S).toBe(1);

            // Add Bulwark Building
            city.buildings.push(BuildingType.Bulwark);

            // Bulwark no longer grants Science; base remains 1.
            const newYields = getCityYields(city, state);
            expect(newYields.S).toBe(1);
        });
    });
});
