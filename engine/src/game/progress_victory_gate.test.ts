import { describe, expect, it } from "vitest";
import { GameState, ProjectId } from "../core/types.js";
import { runEndOfRound } from "./turn-lifecycle.js";

function makeState(map: { width: number; height: number }): GameState {
    return {
        turn: 200,
        players: [
            {
                id: "p1",
                civName: "ScholarKingdoms",
                color: "#fff",
                isEliminated: false,
                techs: [],
                currentTech: null,
                completedProjects: [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment],
            },
            {
                id: "p2",
                civName: "ForgeClans",
                color: "#000",
                isEliminated: false,
                techs: [],
                currentTech: null,
                completedProjects: [],
            },
        ],
        cities: [
            {
                id: "p1c1",
                ownerId: "p1",
                isCapital: true,
                name: "P1 Capital",
                buildings: [],
                originalOwnerId: "p1",
            },
            {
                id: "p2c1",
                ownerId: "p2",
                isCapital: true,
                name: "P2 Capital",
                buildings: [],
                originalOwnerId: "p2",
            },
        ],
        units: [],
        winnerId: null,
        map: { ...map, tiles: [] },
        diplomacy: {},
        nativeCamps: [],
    } as unknown as GameState;
}

describe("Progress victory city requirement", () => {
    it("allows one-city Progress wins on standard maps", () => {
        const state = makeState({ width: 30, height: 22 });

        runEndOfRound(state);

        expect(state.winnerId).toBe("p1");
        expect(state.victoryType).toBe("Progress");
    });

    it("allows one-city Progress wins on huge maps when no map-specific gate is active", () => {
        const state = makeState({ width: 40, height: 30 });

        runEndOfRound(state);

        expect(state.winnerId).toBe("p1");
        expect(state.victoryType).toBe("Progress");
    });
});
