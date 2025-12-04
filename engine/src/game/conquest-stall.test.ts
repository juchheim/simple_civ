
import { describe, it, expect } from 'vitest';
import { GameState, Player, UnitType, BuildingType, TechId, DiplomacyState, PlayerPhase } from '../core/types.js';
import { runEndOfRound } from './turn-lifecycle.js';

describe('Conquest Victory Stall', () => {
    it('should award conquest victory if opponent has no city AND hasFoundedFirstCity is true (defeated)', () => {
        const state = {
            turn: 100,
            players: [
                { id: 'p1', isEliminated: false, civName: 'Civ1', completedProjects: [], techs: [], hasFoundedFirstCity: true },
                { id: 'p2', isEliminated: false, civName: 'Civ2', completedProjects: [], techs: [], hasFoundedFirstCity: true }, // Defeated
            ],
            cities: [
                { id: 'c1', ownerId: 'p1', isCapital: true, name: 'Capital1', buildings: [] },
            ],
            units: [
                { id: 'u1', ownerId: 'p2', type: UnitType.Settler },
            ],
            winnerId: null,
            map: { tiles: [] },
            diplomacy: {},
        } as unknown as GameState;

        runEndOfRound(state);

        expect(state.winnerId).toBe('p1');
    });

    it('should NOT award conquest victory if opponent has no city AND hasFoundedFirstCity is false (running around)', () => {
        const state = {
            turn: 100, // Even late game
            players: [
                { id: 'p1', isEliminated: false, civName: 'Civ1', completedProjects: [], techs: [], hasFoundedFirstCity: true },
                { id: 'p2', isEliminated: false, civName: 'Civ2', completedProjects: [], techs: [], hasFoundedFirstCity: false }, // Running around
            ],
            cities: [
                { id: 'c1', ownerId: 'p1', isCapital: true, name: 'Capital1', buildings: [] },
            ],
            units: [
                { id: 'u1', ownerId: 'p2', type: UnitType.Settler },
            ],
            winnerId: null,
            map: { tiles: [] },
            diplomacy: {},
        } as unknown as GameState;

        runEndOfRound(state);

        expect(state.winnerId).toBe(null);
    });
});
