
import { describe, it, expect } from 'vitest';
import { handleAttack, handleSwapUnits, processAutoMovement, processAutoExplore } from './actions/units';
import { UnitType, UnitState, GameState, HexCoord } from '../core/types';
import { hexEquals } from '../core/hex';
import { refreshPlayerVision } from './vision';

// --- Local Helpers ---

function createTestState(): GameState {
    return {
        turn: 1,
        seed: 123,
        map: {
            width: 10,
            height: 10,
            tiles: []
        },
        players: [
            { id: 'player1', civ: 'AetherianVanguard', techs: [] },
            { id: 'player2', civ: 'ForgeClans', techs: [] }
        ],
        units: [],
        cities: [],
        revealed: {
            'player1': [],
            'player2': []
        },
        visibility: {
            'player1': [],
            'player2': []
        },
        contacts: {
            'player1': {},
            'player2': {}
        },
        sharedVision: {
            'player1': {},
            'player2': {}
        },
        diplomacyOffers: [],
        research: {},
        projects: {},
        stats: {},
        diplomacy: {
            'player1': { 'player2': 'War' },
            'player2': { 'player1': 'War' }
        }
    } as any;
}

function createTestUnit(state: GameState, type: UnitType, coord: HexCoord, ownerId: string) {
    const unit = {
        id: `u_${Math.random().toString(36).substr(2, 9)}`,
        ownerId,
        type,
        coord,
        movesLeft: 1,
        hp: 10,
        state: UnitState.Normal,
        hasAttacked: false,
        isAutoExploring: false
    } as any;
    state.units.push(unit);

    // Ensure tile exists
    let tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) {
        tile = { coord, terrain: 'Plains' } as any;
        state.map.tiles.push(tile);
    }

    return unit;
}

function createTestCity(state: GameState, coord: HexCoord, ownerId: string) {
    const city = {
        id: `c_${Math.random().toString(36).substr(2, 9)}`,
        ownerId,
        coord,
        pop: 1,
        hp: 100,
        buildings: []
    } as any;
    state.cities.push(city);

    // Ensure tile exists
    let tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) {
        tile = { coord, terrain: 'Plains' } as any;
        state.map.tiles.push(tile);
    }

    return city;
}

// --- Tests ---

describe('Bug Fixes', () => {
    describe('Settler Capture vs City Attack', () => {
        it('should attack the city instead of capturing the settler when a settler is in a city', () => {
            const state = createTestState();
            const cityCoord = { q: 0, r: 0 };
            const attackerCoord = { q: 0, r: 1 };

            // Create Enemy City
            const city = createTestCity(state, cityCoord, 'player2');
            city.hp = 100;

            // Create Enemy Settler in City
            const settler = createTestUnit(state, UnitType.Settler, cityCoord, 'player2');

            // Create Friendly Attacker
            const attacker = createTestUnit(state, UnitType.SpearGuard, attackerCoord, 'player1');

            // Attack the Settler (which is what the UI would target if clicking the tile)
            const nextState = handleAttack(state, {
                type: 'Attack',
                playerId: 'player1',
                attackerId: attacker.id,
                targetId: settler.id,
                targetType: 'Unit'
            });

            // Expectation: 
            // 1. City should take damage (HP < 100)
            // 2. Settler should NOT be captured (ownerId still player2)
            // 3. Attacker should NOT move into the city

            const updatedCity = nextState.cities.find(c => c.id === city.id);
            const updatedSettler = nextState.units.find(u => u.id === settler.id);
            const updatedAttacker = nextState.units.find(u => u.id === attacker.id);

            expect(updatedCity?.hp).toBeLessThan(100);
            expect(updatedSettler?.ownerId).toBe('player2');
            expect(updatedAttacker?.coord).toEqual(attackerCoord);
        });
    });

    describe('Unit Swapping with Settlers', () => {
        it('should prevent swapping if one unit is a settler', () => {
            const state = createTestState();
            const coord1 = { q: 0, r: 0 };
            const coord2 = { q: 0, r: 1 };

            // Ensure tiles exist and are adjacent
            state.map.tiles.push({ coord: coord1, terrain: 'Plains' } as any);
            state.map.tiles.push({ coord: coord2, terrain: 'Plains' } as any);

            const settler = createTestUnit(state, UnitType.Settler, coord1, 'player1');
            const warrior = createTestUnit(state, UnitType.SpearGuard, coord2, 'player1');

            expect(() => {
                handleSwapUnits(state, {
                    type: 'SwapUnits',
                    playerId: 'player1',
                    unitId: settler.id,
                    targetUnitId: warrior.id
                });
            }).toThrow(); // Should throw error or fail validation
        });
    });

    describe('Auto-Explore Stuck', () => {
        it('should clear autoMoveTarget if path is blocked', () => {
            const state = createTestState();
            const scoutCoord = { q: 0, r: 0 };
            const targetCoord = { q: 0, r: 5 }; // Far away

            const scout = createTestUnit(state, UnitType.Scout, scoutCoord, 'player1');
            scout.isAutoExploring = true;
            scout.autoMoveTarget = targetCoord;

            // Ensure target tile exists
            state.map.tiles.push({ coord: targetCoord, terrain: 'Plains' } as any);

            // Surround scout with mountains to block movement
            const adjacents = [
                { q: 0, r: 1 }, { q: 1, r: 0 }, { q: 1, r: -1 },
                { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }
            ];

            for (const adj of adjacents) {
                const tile = state.map.tiles.find(t => hexEquals(t.coord, adj));
                if (tile) {
                    tile.terrain = 'Mountain';
                } else {
                    state.map.tiles.push({ coord: adj, terrain: 'Mountain' } as any);
                }
            }

            // Ensure scout sees the mountains so pathfinding knows they are impassable
            refreshPlayerVision(state, 'player1');

            // Run processAutoMovement
            processAutoMovement(state, 'player1', scout.id);

            const updatedScout = state.units.find(u => u.id === scout.id);

            // Expectation: 
            // 1. autoMoveTarget should be undefined
            // 2. failedAutoMoveTargets should contain the blocked target
            // 3. isAutoExploring should be false (since no other targets are available/reachable in this small map)
            expect(updatedScout?.autoMoveTarget).toBeUndefined();
            expect(updatedScout?.failedAutoMoveTargets).toContainEqual(targetCoord);

            // Run explore again to trigger the "give up" logic
            processAutoExplore(state, 'player1', scout.id);
            const finalScout = state.units.find(u => u.id === scout.id);
            expect(finalScout?.isAutoExploring).toBe(false);
        });
    });
});
