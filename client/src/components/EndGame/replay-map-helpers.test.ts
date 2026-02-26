import { describe, expect, it } from "vitest";
import { EraId, GameState, PlayerPhase, TerrainType } from "@simple-civ/engine";
import {
    buildFogHistory,
    computeReplayViewBox,
    getActiveReplayEvents,
    getReplayEventLabel,
    getReplayTurnDelayMs,
} from "./replay-map-helpers";

function createGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        id: "game-1",
        turn: 5,
        endTurn: 5,
        players: [
            { id: "p1", civName: "MyCiv", color: "#fff", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: EraId.Primitive },
            { id: "p2", civName: "EnemyEmpire", color: "#0ff", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: EraId.Primitive },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 5,
            height: 4,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            ],
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
        history: {
            events: [],
            playerFog: {},
            playerStats: {},
        },
        ...overrides,
    };
}

describe("replay-map-helpers", () => {
    it("builds fallback fog history from revealed tiles", () => {
        const state = createGameState({
            revealed: { p1: ["0,0", "1,0"] },
            history: { events: [], playerFog: {}, playerStats: {} },
        });

        const history = buildFogHistory(state, "p1", 5);
        expect(Array.from(history[0] ?? [])).toEqual(["0,0", "1,0"]);
        expect(Array.from(history[5] ?? [])).toEqual(["0,0", "1,0"]);
    });

    it("filters active replay events by turn and relevance", () => {
        const state = createGameState({
            history: {
                playerFog: {},
                playerStats: {},
                events: [
                    { turn: 2, type: "CityFounded", playerId: "p1", data: { cityName: "A" } },
                    { turn: 2, type: "CityFounded", playerId: "p2", data: { cityName: "B" } },
                    { turn: 2, type: "WarDeclared", playerId: "p2", data: { targetId: "p1" } },
                    { turn: 1, type: "TechResearched", playerId: "p1", data: { techId: "IronWorking" } },
                ] as any,
            },
        });

        const active = getActiveReplayEvents(state, 2, "p1");
        expect(active).toHaveLength(2);
    });

    it("formats event labels with civ-contact visibility rules", () => {
        const state = createGameState();
        const hidden = getReplayEventLabel(
            { turn: 1, type: "CivContact", playerId: "p2", data: { targetId: "p1" } } as any,
            state,
            "p1",
        );
        const visible = getReplayEventLabel(
            { turn: 1, type: "CivContact", playerId: "p1", data: { targetId: "p2" } } as any,
            state,
            "p1",
        );

        expect(hidden).toBe("");
        expect(visible).toBe("Met Civilization: Enemy Empire");
    });

    it("computes replay timing and viewbox", () => {
        expect(getReplayTurnDelayMs(4, false)).toBe(75);
        expect(getReplayTurnDelayMs(4, true)).toBe(2000);

        const viewBox = computeReplayViewBox(5, 4, 10);
        expect(viewBox.viewBoxW).toBeGreaterThan(0);
        expect(viewBox.viewBoxH).toBeGreaterThan(0);
    });
});
