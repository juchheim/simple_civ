import { describe, it, expect, vi } from 'vitest';
import { chooseVictoryGoalV2 } from './strategy.js';
import { GameState, ProjectId, UnitType } from '../../core/types.js';

// Mock getAiProfileV2 and other dependencies
vi.mock('./rules.js', () => ({
    getAiProfileV2: vi.fn().mockReturnValue({
        civName: 'AetherianVanguard',
        build: { weights: { project: {} } },
        tactics: { riskTolerance: 0.5 },
        diplomacy: { warPowerRatio: 1.0, canInitiateWars: true }
    })
}));

vi.mock('../ai/goals.js', () => ({
    estimateMilitaryPower: vi.fn((id) => id === 'player1' ? 200 : 100) // 2x power default
}));

describe('Aetherian Vanguard Strategy', () => {
    function createTestState(): GameState {
        return {
            turn: 200,
            players: [
                {
                    id: 'player1',
                    civName: 'AetherianVanguard',
                    completedProjects: [ProjectId.TitansCoreComplete],
                    techs: [],
                    currentTech: null
                },
                { id: 'enemy', civName: 'EnemyCiv', completedProjects: [], techs: [], currentTech: null }
            ],
            units: [],
            cities: [],
            diplomacy: { 'player1': { 'enemy': 'War' }, 'enemy': { 'player1': 'War' } },
            map: { tiles: [] },
            history: { events: [] }
        } as unknown as GameState;
    }

    it('should choose Conquest when dominating (current behavior)', () => {
        const state = createTestState();
        // Power ratio is 200/100 = 2.0 (>= 1.5)

        const goal = chooseVictoryGoalV2(state, 'player1');
        expect(goal).toBe('Conquest');
    });

    it('should switch to Progress if dominating but stalled for too long (>40 turns since Core)', () => {
        const state = createTestState();
        state.turn = 250;
        // Mock that Titan's Core was finished way back at turn 200 (implied, or we track history)
        // Since we don't have explicit history tracking in the function yet, 
        // this test expects the NEW behavior we will implement.

        // This test assumes we will implement a check. 
        // For now, let's verify it currently FAILS (returns Conquest) or if we need to mock history.
        // We likely need to spy on history or just check current turn vs completion.
        // Since completion turn isn't stored on player, we might use a heuristic or add it.
        // Let's assume the heuristic: Turn > 240 (late game) and still not won?

        // Actually, the plan is to check turn limits.
        // Let's force the state to be late game.
        state.turn = 300;

        const goal = chooseVictoryGoalV2(state, 'player1');
        expect(goal).toBe('Progress');
    });

    it('should force Progress if 2/3 science projects are complete', () => {
        const state = createTestState();
        const p1 = state.players.find(p => p.id === 'player1')!;
        p1.completedProjects = [ProjectId.TitansCoreComplete, ProjectId.Observatory, ProjectId.GrandAcademy];

        // Still dominating military
        const goal = chooseVictoryGoalV2(state, 'player1');
        expect(goal).toBe('Progress');
    });
});
