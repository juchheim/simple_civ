import { describe, it, expect, vi } from "vitest";
import { buildCityStateRows, buildDiplomacyRows } from "./diplomacy";
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

describe("buildCityStateRows", () => {
    it("returns investable discovered city-states with cost and standings", () => {
        const player1: Player = {
            id: "p1",
            civName: "ForgeClans",
            color: "red",
            isEliminated: false,
            techs: [],
            currentTech: null,
            completedProjects: [],
            isAI: false,
            currentEra: EraId.Hearth,
            treasury: 100,
        };
        const player2: Player = {
            id: "p2",
            civName: "ScholarKingdoms",
            color: "blue",
            isEliminated: false,
            techs: [],
            currentTech: null,
            completedProjects: [],
            isAI: true,
            currentEra: EraId.Hearth,
        };

        const state: Partial<GameState> = {
            turn: 5,
            players: [player1, player2],
            cityStates: [{
                id: "cs-1",
                ownerId: "citystate_owner_1",
                cityId: "c-citystate",
                coord: { q: 0, r: 0 },
                name: "Aetherquill",
                yieldType: "Science",
                influenceByPlayer: { p1: 50, p2: 40 },
                investmentCountByPlayer: { p1: 0, p2: 0 },
                lastInvestTurnByPlayer: { p1: -1, p2: -1 },
                suzerainId: "p1",
                lockedControllerId: undefined,
                discoveredByPlayer: { p1: true, p2: true },
                lastReinforcementTurn: 0,
                warByPlayer: { p1: false, p2: false },
            }],
            diplomacy: {},
            contacts: {},
            diplomacyOffers: [],
            sharedVision: {},
            units: [],
            cities: [],
        };

        const rows = buildCityStateRows(state as GameState, "p1");
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe("Aetherquill");
        expect(rows[0].yieldType).toBe("Science");
        expect(rows[0].investCost).toBe(40);
        expect(rows[0].canInvest).toBe(true);
    });
});
