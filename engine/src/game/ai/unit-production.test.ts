import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, Player, UnitType, TechId, DiplomacyState, TerrainType, PlayerPhase } from '../../core/types.js';
import { pickCityBuilds } from './cities.js';

// --- Helper Functions ---

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
    };
}

function createTestPlayer(id: string): Player {
    return {
        id,
        civName: 'TestCiv',
        color: '#000000',
        isAI: true,
        aiGoal: 'Balanced',
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
    };
}

function createTestCity(id: string, ownerId: string, coord: { q: number; r: number }) {
    return {
        id,
        ownerId,
        name: 'Test City',
        coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        currentBuild: null,
        buildProgress: 0,
        workedTiles: [coord],
        isCapital: false,
        hp: 20,
        maxHp: 20,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function createTestTile(coord: { q: number; r: number }, ownerId?: string) {
    return {
        coord,
        terrain: TerrainType.Plains,
        overlays: [],
        ownerId,
        hasCityCenter: !!ownerId,
    };
}

// --- Tests ---

describe('AI Unit Production', () => {
    let state: GameState;
    let player: Player;

    beforeEach(() => {
        state = createTestState();
        player = createTestPlayer('p1', 'Player 1');
        state.players = [player];
        const cityCoord = { q: 0, r: 0 };
        state.cities = [createTestCity('c1', 'p1', cityCoord)];
        state.map.tiles = [createTestTile(cityCoord, 'p1')];

        // Give player some techs to allow building units
        player.techs = [TechId.TrailMaps, TechId.StoneworkHalls, TechId.Fieldcraft];
    });

    it('should cap Scout production in peacetime', () => {
        // Give the player 3 scouts already
        state.units = [
            { id: 'u1', ownerId: 'p1', type: UnitType.Scout, coord: { q: 1, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
            { id: 'u2', ownerId: 'p1', type: UnitType.Scout, coord: { q: 2, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
            { id: 'u3', ownerId: 'p1', type: UnitType.Scout, coord: { q: 3, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
        ];

        // Run pickCityBuilds
        const nextState = pickCityBuilds(state, 'p1', 'Progress');
        const city = nextState.cities[0];

        // Should NOT be building a Scout
        expect(city.currentBuild?.id).not.toBe(UnitType.Scout);
    });

    it('should prioritize military units during war preparation', () => {
        // Set player to war prep state
        player.warPreparation = {
            targetId: 'p2',
            state: 'Gathering',
            startedTurn: 10
        };
        state.turn = 12;

        // Ensure we have enough scouts so we don't build them
        state.units = [
            { id: 'u1', ownerId: 'p1', type: UnitType.Scout, coord: { q: 1, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
            { id: 'u2', ownerId: 'p1', type: UnitType.Scout, coord: { q: 2, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
            { id: 'u3', ownerId: 'p1', type: UnitType.Scout, coord: { q: 3, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
        ];

        // Run pickCityBuilds
        const nextState = pickCityBuilds(state, 'p1', 'Conquest');
        const city = nextState.cities[0];

        // Should be building a military unit
        const militaryUnits = [UnitType.SpearGuard, UnitType.BowGuard, UnitType.Riders];
        expect(militaryUnits).toContain(city.currentBuild?.id);
    });

    it('should build a mix of units', () => {
        // Give player a SpearGuard
        state.units = [
            { id: 'u1', ownerId: 'p1', type: UnitType.SpearGuard, coord: { q: 1, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
            { id: 'u2', ownerId: 'p1', type: UnitType.Scout, coord: { q: 2, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
            { id: 'u3', ownerId: 'p1', type: UnitType.Scout, coord: { q: 3, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
            { id: 'u4', ownerId: 'p1', type: UnitType.Scout, coord: { q: 4, r: 0 }, movesLeft: 1, state: 'Idle' } as any,
        ];

        // Force war to ensure military production
        state.players.push(createTestPlayer('p2', 'Player 2'));
        state.diplomacy = { p1: { p2: DiplomacyState.War } };

        // Run pickCityBuilds
        const nextState = pickCityBuilds(state, 'p1', 'Conquest');
        const city = nextState.cities[0];

        // Should prefer BowGuard or Riders since we have a SpearGuard
        expect([UnitType.BowGuard, UnitType.Riders]).toContain(city.currentBuild?.id);
    });
});
