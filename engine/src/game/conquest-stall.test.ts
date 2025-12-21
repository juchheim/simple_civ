
import { describe, it, expect } from 'vitest';
import { GameState, Player, UnitType, BuildingType, TechId, DiplomacyState, PlayerPhase } from '../core/types.js';
import { runEndOfRound } from './turn-lifecycle.js';

describe('Conquest Victory Stall', () => {
    it('should award conquest victory when player controls majority of capitals (2 of 2 in 2-player game)', () => {
        // v6.7: Capital Majority Victory - in 2-player game, need BOTH capitals (2/2 = 100% > 50%)
        const state = {
            turn: 100,
            players: [
                { id: 'p1', isEliminated: false, civName: 'Civ1', completedProjects: [], techs: [], hasFoundedFirstCity: true },
                { id: 'p2', isEliminated: false, civName: 'Civ2', completedProjects: [], techs: [], hasFoundedFirstCity: true }, // Defeated
            ],
            cities: [
                { id: 'c1', ownerId: 'p1', isCapital: true, name: 'Capital1', buildings: [], originalOwnerId: 'p1' },
                { id: 'c2', ownerId: 'p1', isCapital: true, name: 'Capital2', buildings: [], originalOwnerId: 'p2' }, // CAPTURED from p2
            ],
            units: [
                { id: 'u1', ownerId: 'p2', type: UnitType.Settler },
            ],
            winnerId: null,
            map: { tiles: [] },
            diplomacy: {},
        } as unknown as GameState;

        runEndOfRound(state);

        expect(state.winnerId).toBe('p1'); // p1 controls 2/2 capitals = 100% > 50%
    });

    it('should NOT award conquest victory if player only controls their own capital (1 of 2)', () => {
        // v6.7: Capital Majority Victory - 1/2 capitals is only 50%, need MORE than 50%
        const state = {
            turn: 100,
            players: [
                { id: 'p1', isEliminated: false, civName: 'Civ1', completedProjects: [], techs: [], hasFoundedFirstCity: true },
                { id: 'p2', isEliminated: false, civName: 'Civ2', completedProjects: [], techs: [], hasFoundedFirstCity: true },
            ],
            cities: [
                { id: 'c1', ownerId: 'p1', isCapital: true, name: 'Capital1', buildings: [], originalOwnerId: 'p1' },
                // p2's capital still exists, owned by p2 - no majority
            ],
            units: [
                { id: 'u1', ownerId: 'p2', type: UnitType.Settler },
            ],
            winnerId: null,
            map: { tiles: [] },
            diplomacy: {},
        } as unknown as GameState;

        runEndOfRound(state);

        expect(state.winnerId).toBe(null); // 1/2 = 50%, need MORE than 50%
    });

    it('should NOT award conquest victory if opponent has no city but hasnt founded yet (running around)', () => {
        const state = {
            turn: 100, // Even late game
            players: [
                { id: 'p1', isEliminated: false, civName: 'Civ1', completedProjects: [], techs: [], hasFoundedFirstCity: true },
                { id: 'p2', isEliminated: false, civName: 'Civ2', completedProjects: [], techs: [], hasFoundedFirstCity: false }, // Running around
            ],
            cities: [
                { id: 'c1', ownerId: 'p1', isCapital: true, name: 'Capital1', buildings: [], originalOwnerId: 'p1' },
            ],
            units: [
                { id: 'u1', ownerId: 'p2', type: UnitType.Settler },
            ],
            winnerId: null,
            map: { tiles: [] },
            diplomacy: {},
        } as unknown as GameState;

        runEndOfRound(state);

        // v6.7: Only 1 player has founded, so totalCapitals = 1
        // The guard `totalCapitals < 2` returns null to avoid premature victory
        // This prevents winning "by default" when opponent hasn't even founded yet
        expect(state.winnerId).toBe(null);
    });
});
