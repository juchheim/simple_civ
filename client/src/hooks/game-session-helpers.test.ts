import { describe, expect, it } from "vitest";
import { GameState, TerrainType } from "@simple-civ/engine";
import {
    chooseSave,
    createSaveData,
    ensureEndTurnForWinner,
    parseSave,
    pickActivePlayerId,
    shouldCreateAutosave
} from "./game-session-helpers";

function createGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        id: "game-1",
        turn: 6,
        players: [
            { id: "p1", civName: "ScholarKingdoms", color: "#fff", isAI: false, techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "p2", civName: "ForgeClans", color: "#0ff", isAI: true, techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "p2",
        phase: "Action" as any,
        map: {
            width: 2,
            height: 2,
            tiles: [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] }],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
        ...overrides,
    } as unknown as GameState;
}

describe("game-session-helpers", () => {
    it("picks active non-ai player when current player is ai", () => {
        const state = createGameState();
        expect(pickActivePlayerId(state)).toBe("p1");
    });

    it("builds save metadata with civ title", () => {
        const state = createGameState({ currentPlayerId: "p1", turn: 4 });
        const save = createSaveData(state, 123);
        expect(save).toEqual(expect.objectContaining({
            timestamp: 123,
            turn: 4,
            civName: "Scholar Kingdoms",
        }));
    });

    it("parses legacy and wrapped save formats", () => {
        const legacyState = createGameState({ currentPlayerId: "p1", turn: 8 });
        const legacy = parseSave(JSON.stringify(legacyState));
        expect(legacy?.turn).toBe(8);
        expect(legacy?.civName).toBe("Scholar Kingdoms");

        const wrappedMissingMeta = parseSave(JSON.stringify({
            timestamp: 100,
            gameState: createGameState({ currentPlayerId: "p1", turn: 3 }),
        }));
        expect(wrappedMissingMeta?.turn).toBe(3);
        expect(wrappedMissingMeta?.civName).toBe("Scholar Kingdoms");
    });

    it("chooses save by slot with manual fallback", () => {
        const manual = { timestamp: 1 } as any;
        const auto = { timestamp: 2 } as any;

        expect(chooseSave("manual", manual, auto)).toBe(manual);
        expect(chooseSave("auto", manual, auto)).toBe(auto);
        expect(chooseSave(undefined, manual, auto)).toBe(manual);
        expect(chooseSave(undefined, null, auto)).toBe(auto);
    });

    it("normalizes endTurn and autosave gate", () => {
        const state = createGameState({ turn: 10, winnerId: "p1" });
        const normalized = ensureEndTurnForWinner(state);
        expect(normalized.endTurn).toBe(10);

        expect(shouldCreateAutosave(createGameState({ turn: 10, currentPlayerId: "p1" }), "p1", null)).toBe(true);
        expect(shouldCreateAutosave(createGameState({ turn: 9, currentPlayerId: "p1" }), "p1", null)).toBe(false);
        expect(shouldCreateAutosave(createGameState({ turn: 10, currentPlayerId: "p2" }), "p1", null)).toBe(false);
        expect(shouldCreateAutosave(createGameState({ turn: 10, currentPlayerId: "p1" }), "p1", 10)).toBe(false);
    });
});
