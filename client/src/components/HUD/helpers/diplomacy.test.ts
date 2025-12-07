import { describe, it, expect, vi } from "vitest";
import { buildDiplomacyRows } from "./diplomacy";
import { GameState, DiplomacyState, Player, EraId } from "@simple-civ/engine";

// Mock estimateMilitaryPower since it's used in buildDiplomacyRows
vi.mock("@simple-civ/engine", async () => {
    const actual = await vi.importActual("@simple-civ/engine");
    return {
        ...actual,
        estimateMilitaryPower: () => 100,
    };
});

describe("buildDiplomacyRows", () => {
    it("should include valid contacts", () => {
        const player1: Player = {
            id: "p1",
            civName: "Rome",
            color: "red",
            isEliminated: false,
            techs: [],
            currentTech: null,
            completedProjects: [],
            isAI: false,
            currentEra: EraId.Hearth,
        };
        const player2: Player = {
            id: "p2",
            civName: "Greece",
            color: "blue",
            isEliminated: false,
            techs: [],
            currentTech: null,
            completedProjects: [],
            isAI: true,
            currentEra: EraId.Hearth,
        };

        const state: Partial<GameState> = {
            players: [player1, player2],
            diplomacy: {
                p1: { p2: DiplomacyState.Peace },
            },
            contacts: {
                p1: { p2: true },
            },
            diplomacyOffers: [],
            sharedVision: {},
            units: [],
            cities: [],
        };

        const rows = buildDiplomacyRows(state as GameState, "p1");
        expect(rows).toHaveLength(1);
        expect(rows[0].playerId).toBe("p2");
    });

    it("should NOT include eliminated players", () => {
        const player1: Player = {
            id: "p1",
            civName: "Rome",
            color: "red",
            isEliminated: false,
            techs: [],
            currentTech: null,
            completedProjects: [],
            isAI: false,
            currentEra: EraId.Hearth,
        };
        const player2: Player = {
            id: "p2",
            civName: "Greece",
            color: "blue",
            isEliminated: true, // ELIMINATED
            techs: [],
            currentTech: null,
            completedProjects: [],
            isAI: true,
            currentEra: EraId.Hearth,
        };

        const state: Partial<GameState> = {
            players: [player1, player2],
            diplomacy: {
                p1: { p2: DiplomacyState.Peace },
            },
            contacts: {
                p1: { p2: true },
            },
            diplomacyOffers: [],
            sharedVision: {},
            units: [],
            cities: [],
        };

        const rows = buildDiplomacyRows(state as GameState, "p1");
        // EXPECTATION FOR FIX: Eliminated players should be filtered out
        expect(rows).toHaveLength(0);
    });
});
