
import { describe, it, expect } from 'vitest';
import { getGoalRequirements } from './strategic-plan.js';
// AiVictoryGoal and GamePhase are types, import them properly or use strings in tests
// They are not exported values, so we just use string literals in tests which match the types.

describe('strategic-plan: getGoalRequirements', () => {
    it('should return balanced siege requirements for Conquest in Expand phase', () => {
        // Expand phase multiplier is 0.5
        // Siege: ceil(4 * 0.5) = 2
        // Capture: ceil(7 * 0.5) = 4
        const reqs = getGoalRequirements("Conquest", "ForgeClans", "Expand", 1);
        expect(reqs.minSiege).toBe(2);
        expect(reqs.minCapture).toBe(4);
    });

    it('should return scaled siege requirements for Conquest in Execute phase', () => {
        // Execute phase multiplier is 1.2
        // Siege: ceil(4 * 1.2) = 5
        const reqs = getGoalRequirements("Conquest", "ForgeClans", "Execute", 1);
        expect(reqs.minSiege).toBe(5);
    });

    it('should return low siege requirements for Balanced in Expand phase', () => {
        // Balanced: ceil(2 * 0.5) = 1
        const reqs = getGoalRequirements("Balanced", "ForgeClans", "Expand", 1);
        expect(reqs.minSiege).toBe(1);
    });

    it('should return 1 siege requirement for Progress in Expand phase', () => {
        // Progress: minSiege: 1
        const reqs = getGoalRequirements("Progress", "ForgeClans", "Expand", 1);
        expect(reqs.minSiege).toBe(1);
    });
});
