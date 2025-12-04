
import { describe, it, expect } from 'vitest';
import { handleFortifyUnit } from './actions/units';
import { handleEndTurn } from './turn-lifecycle';
import { UnitType, UnitState, GameState, HexCoord } from '../core/types';

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
            { id: 'player1', civ: 'AetherianVanguard', techs: [], completedProjects: [] },
            { id: 'player2', civ: 'ForgeClans', techs: [], completedProjects: [] }
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
        maxHp: 10,
        state: UnitState.Normal,
        hasAttacked: false,
        isAutoExploring: false
    } as any;
    state.units.push(unit);
    return unit;
}

describe('Fortify Bug Reproduction', () => {
    it('should keep unit fortified after ending turn', () => {
        const state = createTestState();
        const player = state.players[0];

        // Add a Bowguard
        const unit = createTestUnit(state, UnitType.BowGuard, { q: 0, r: 0 }, player.id);
        unit.movesLeft = 2; // Full moves

        // Fortify the unit
        handleFortifyUnit(state, {
            type: 'FortifyUnit',
            playerId: player.id,
            unitId: unit.id
        });

        expect(unit.state).toBe(UnitState.Fortified);
        expect(unit.movesLeft).toBe(0);

        // End turn
        handleEndTurn(state, {
            type: 'EndTurn',
            playerId: player.id
        });

        // Check if unit is still fortified
        // This is where it currently fails (it becomes Normal because movesLeft is 0, not max)
        expect(unit.state).toBe(UnitState.Fortified);
    });
});
