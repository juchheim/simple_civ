import { describe, it, expect, vi } from 'vitest';
import { chooseVictoryGoalV2 } from './strategy.js';
import { GameState, ProjectId } from '../../core/types.js';
import { evaluateBestVictoryPath } from '../ai/victory-evaluator.js';

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

vi.mock('../ai/victory-evaluator.js', () => ({
    evaluateBestVictoryPath: vi.fn().mockReturnValue({
        path: 'Conquest',
        turnsToProgress: 999,
        turnsToConquest: 1,
        progressFaster: false,
        confidence: 'high',
        reason: 'mock'
    })
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

    it('should defer to victory evaluator after endgame crisis (turn > 225)', () => {
        const state = createTestState();
        state.turn = 300;

        (evaluateBestVictoryPath as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
            path: 'Progress',
            turnsToProgress: 50,
            turnsToConquest: 80,
            progressFaster: true,
            confidence: 'medium',
            reason: 'mock'
        });

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
