
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chooseVictoryGoalV2 } from "./strategy.js"; // Adjust path as needed
import { GameState, Player, ProjectId, TechId, UnitType } from "../../core/types.js";
import { evaluateBestVictoryPath } from "../ai/victory-evaluator.js";

// Mock the evaluator so we can control the "Best Path"
vi.mock("../ai/victory-evaluator.js", () => ({
    evaluateBestVictoryPath: vi.fn(),
}));

describe("Global Stall Prevention", () => {
    let mockState: GameState;
    let mockPlayer: Player;

    beforeEach(() => {
        mockPlayer = {
            id: "p1",
            civName: "RiverLeague", // An aggressive civ usually
            isEliminated: false,
            techs: [],
            completedProjects: [],
            cities: [],
        } as unknown as Player;

        mockState = {
            turn: 200, // Default to mid-game
            players: [mockPlayer],
            cities: [],
            units: [],
            diplomacy: {},
        } as unknown as GameState;
    });

    it("should use standard logic before Turn 225", () => {
        mockState.turn = 220;
        // Mock evaluator to return Progress, but strategy should ignore it if < 225
        (evaluateBestVictoryPath as any).mockReturnValue({ path: "Progress" });

        // RiverLeague defaults to Conquest in standard logic
        const goal = chooseVictoryGoalV2(mockState, "p1");
        expect(goal).toBe("Conquest");
    });

    it("should FORCE evaluated path after Turn 225 (Conquest case)", () => {
        mockState.turn = 226;
        // Mock evaluator to say Conquest is best
        (evaluateBestVictoryPath as any).mockReturnValue({ path: "Conquest" });

        const goal = chooseVictoryGoalV2(mockState, "p1");
        expect(goal).toBe("Conquest");
    });

    it("should FORCE evaluated path after Turn 225 (Progress case)", () => {
        mockState.turn = 230;
        // Mock evaluator to say Progress is best
        (evaluateBestVictoryPath as any).mockReturnValue({ path: "Progress" });

        // Even though RiverLeague normally hates Progress, it must obey the stall breaker
        const goal = chooseVictoryGoalV2(mockState, "p1");
        expect(goal).toBe("Progress");
    });
});
