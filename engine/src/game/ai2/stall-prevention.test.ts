
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chooseVictoryGoalV2 } from "./strategy.js"; // Adjust path as needed
import { GameState, Player } from "../../core/types.js";
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
            map: { width: 30, height: 22, tiles: [] },
            diplomacy: {},
        } as unknown as GameState;
    });

    it("uses standard logic before the standard-map endgame threshold", () => {
        mockState.turn = 189;
        (evaluateBestVictoryPath as any).mockReturnValue({ path: "Progress" });

        const goal = chooseVictoryGoalV2(mockState, "p1");
        expect(goal).toBe("Conquest");
    });

    it("forces the evaluated path at the standard-map endgame threshold", () => {
        mockState.turn = 190;
        (evaluateBestVictoryPath as any).mockReturnValue({ path: "Progress" });

        const goal = chooseVictoryGoalV2(mockState, "p1");
        expect(goal).toBe("Progress");
    });

    it("does not force the evaluated path early on huge maps", () => {
        mockState.map = { width: 40, height: 30, tiles: [] } as any;
        mockState.turn = 229;
        (evaluateBestVictoryPath as any).mockReturnValue({ path: "Progress" });

        const goal = chooseVictoryGoalV2(mockState, "p1");
        expect(goal).toBe("Conquest");
    });

    it("forces the evaluated path once huge maps hit their endgame threshold", () => {
        mockState.map = { width: 40, height: 30, tiles: [] } as any;
        mockState.turn = 230;
        (evaluateBestVictoryPath as any).mockReturnValue({ path: "Conquest" });

        const goal = chooseVictoryGoalV2(mockState, "p1");
        expect(goal).toBe("Conquest");
    });
});
