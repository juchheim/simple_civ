import { describe, it, expect } from 'vitest';
import { GameState, UnitType, UnitState, TerrainType, PlayerPhase } from '../core/types.js';
import { handleAttack, handleMoveUnit } from './actions/units.js';

describe('Post-Attack Movement Bug', () => {
    it('should prevent ranged units (BowGuard) from moving after attacking', () => {
        // Setup a simple game state with a BowGuard attacker and a defender
        const state: GameState = {
            turn: 1,
            round: 1,
            seed: 12345,
            currentPlayerId: 'p1',
            phase: PlayerPhase.Action,
            players: [
                {
                    id: 'p1',
                    civName: 'ScholarKingdoms',
                    color: '#ff0000',
                    techs: [],
                    currentTech: null,
                    cities: [],
                    isEliminated: false,
                    completedProjects: []
                },
                {
                    id: 'p2',
                    civName: 'RiverLeague',
                    color: '#0000ff',
                    techs: [],
                    currentTech: null,
                    cities: [],
                    isEliminated: false,
                    completedProjects: []
                }
            ],
            units: [
                {
                    id: 'attacker',
                    type: UnitType.BowGuard,
                    ownerId: 'p1',
                    coord: { q: 0, r: 0 },
                    hp: 10,
                    maxHp: 10,
                    movesLeft: 1, // Has 1 move left
                    state: UnitState.Normal,
                    hasAttacked: false
                },
                {
                    id: 'defender',
                    type: UnitType.SpearGuard,
                    ownerId: 'p2',
                    coord: { q: 0, r: 2 }, // 2 tiles away (within BowGuard's range of 2)
                    hp: 10,
                    maxHp: 10,
                    movesLeft: 1,
                    state: UnitState.Normal,
                    hasAttacked: false
                }
            ],
            cities: [],
            map: {
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 0, r: 2 }, terrain: TerrainType.Plains, overlays: [] }
                ]
            },
            visibility: {
                'p1': ['0,0', '0,1', '0,2'],
                'p2': ['0,0', '0,1', '0,2']
            },
            revealed: {
                'p1': ['0,0', '0,1', '0,2'],
                'p2': ['0,0', '0,1', '0,2']
            },
            contacts: { 'p1': { 'p2': true }, 'p2': { 'p1': true } },
            diplomacy: { 'p1': { 'p2': 'War' }, 'p2': { 'p1': 'War' } },
            sharedVision: { 'p1': {}, 'p2': {} },
            militaryPower: { 'p1': 10, 'p2': 10 },
            diplomacyOffers: []
        } as any;

        // Perform the attack
        const nextState = handleAttack(state, {
            type: 'Attack',
            playerId: 'p1',
            attackerId: 'attacker',
            targetId: 'defender',
            targetType: 'Unit'
        });

        // Verify the attack was successful
        const attackerAfterAttack = nextState.units.find(u => u.id === 'attacker')!;
        expect(attackerAfterAttack.hasAttacked).toBe(true);

        // CRITICAL: Verify movesLeft is now 0 (the fix)
        expect(attackerAfterAttack.movesLeft).toBe(0);

        // Attempt to move the unit after attacking - this should fail
        expect(() => {
            handleMoveUnit(nextState, {
                type: 'MoveUnit',
                playerId: 'p1',
                unitId: 'attacker',
                to: { q: 0, r: 1 }
            });
        }).toThrow('No moves left');
    });

    it('should prevent melee units (SpearGuard) from moving after attacking', () => {
        // Setup a simple game state with a SpearGuard attacker and a defender
        const state: GameState = {
            turn: 1,
            round: 1,
            seed: 12345,
            currentPlayerId: 'p1',
            phase: PlayerPhase.Action,
            players: [
                {
                    id: 'p1',
                    civName: 'ScholarKingdoms',
                    color: '#ff0000',
                    techs: [],
                    currentTech: null,
                    cities: [],
                    isEliminated: false,
                    completedProjects: []
                },
                {
                    id: 'p2',
                    civName: 'RiverLeague',
                    color: '#0000ff',
                    techs: [],
                    currentTech: null,
                    cities: [],
                    isEliminated: false,
                    completedProjects: []
                }
            ],
            units: [
                {
                    id: 'attacker',
                    type: UnitType.SpearGuard,
                    ownerId: 'p1',
                    coord: { q: 0, r: 0 },
                    hp: 10,
                    maxHp: 10,
                    movesLeft: 1, // Has 1 move left (normally could move after killing)
                    state: UnitState.Normal,
                    hasAttacked: false
                },
                {
                    id: 'defender',
                    type: UnitType.Scout, // Low HP, will likely die
                    ownerId: 'p2',
                    coord: { q: 0, r: 1 }, // Adjacent
                    hp: 2, // Low HP so it dies in one hit
                    maxHp: 10,
                    movesLeft: 2,
                    state: UnitState.Normal,
                    hasAttacked: false
                }
            ],
            cities: [],
            map: {
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 0, r: 2 }, terrain: TerrainType.Plains, overlays: [] }
                ]
            },
            visibility: {
                'p1': ['0,0', '0,1', '0,2'],
                'p2': ['0,0', '0,1', '0,2']
            },
            revealed: {
                'p1': ['0,0', '0,1', '0,2'],
                'p2': ['0,0', '0,1', '0,2']
            },
            contacts: { 'p1': { 'p2': true }, 'p2': { 'p1': true } },
            diplomacy: { 'p1': { 'p2': 'War' }, 'p2': { 'p1': 'War' } },
            sharedVision: { 'p1': {}, 'p2': {} },
            militaryPower: { 'p1': 10, 'p2': 10 },
            diplomacyOffers: []
        } as any;

        // Perform the attack
        const nextState = handleAttack(state, {
            type: 'Attack',
            playerId: 'p1',
            attackerId: 'attacker',
            targetId: 'defender',
            targetType: 'Unit'
        });

        // Verify the attack was successful
        const attackerAfterAttack = nextState.units.find(u => u.id === 'attacker')!;
        expect(attackerAfterAttack.hasAttacked).toBe(true);

        // CRITICAL: Verify movesLeft is now 0, even though melee unit moved into tile
        expect(attackerAfterAttack.movesLeft).toBe(0);

        // The attacker should have moved to the defender's position (0,1) after killing 
        expect(attackerAfterAttack.coord).toEqual({ q: 0, r: 1 });

        // Attempt to move further - this should fail
        expect(() => {
            handleMoveUnit(nextState, {
                type: 'MoveUnit',
                playerId: 'p1',
                unitId: 'attacker',
                to: { q: 0, r: 2 }
            });
        }).toThrow('No moves left');
    });
});
