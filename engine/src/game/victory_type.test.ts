import { describe, it, expect, vi } from "vitest";
import { finalizeVictory } from "./turn-lifecycle";
import { GameState, Player } from "../core/types";

// Mock history functions to prevent actual execution during test
vi.mock("./history", () => {
    return {
        logEvent: vi.fn(),
        recordTurnStats: vi.fn(),
    };
});

describe("finalizeVictory", () => {
    it("should set conquest victory type in state", () => {
        const state: Partial<GameState> = {
            turn: 10,
            winnerId: undefined,
            players: [
                { id: "p1", isEliminated: false } as Player,
            ],
            history: { events: [], playerStats: {}, playerFog: {} },
        };

        finalizeVictory(state as GameState, "p1", "Conquest");

        expect(state.winnerId).toBe("p1");
        expect(state.victoryType).toBe("Conquest");
    });

    it("should set progress victory type in state", () => {
        const state: Partial<GameState> = {
            turn: 10,
            winnerId: undefined,
            players: [
                { id: "p1", isEliminated: false } as Player,
            ],
            history: { events: [], playerStats: {}, playerFog: {} },
        };

        finalizeVictory(state as GameState, "p1", "Progress");

        expect(state.winnerId).toBe("p1");
        expect(state.victoryType).toBe("Progress");
    });
});
