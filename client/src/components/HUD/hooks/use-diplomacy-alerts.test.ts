import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDiplomacyAlerts } from "./use-diplomacy-alerts";
import { GameState, DiplomacyState } from "@simple-civ/engine";

const createMockState = (
    diplomacy: Record<string, Record<string, DiplomacyState>> = {},
    diplomacyOffers: any[] = []
): GameState => ({
    players: [
        { id: "p1", civName: "Player 1", color: "red", techs: [], completedProjects: [], isEliminated: false, currentTech: null },
        { id: "p2", civName: "Player 2", color: "blue", techs: [], completedProjects: [], isEliminated: false, currentTech: null }
    ],
    diplomacy,
    diplomacyOffers,
    units: [],
    cities: [],
    turn: 1,
    currentPlayerId: "p1",
    phase: "Action",
    map: { width: 10, height: 10, tiles: [] },
    seed: 123,
    visibility: {},
    revealed: {},
    sharedVision: {},
    contacts: {}
} as unknown as GameState);

describe("useDiplomacyAlerts", () => {
    it("detects war declaration", () => {
        const initialDiplomacy = {
            "p2": { "p1": DiplomacyState.Peace }
        };
        const initialState = createMockState(initialDiplomacy);

        const { result, rerender } = renderHook(
            ({ state }) => useDiplomacyAlerts(state, "p1"),
            { initialProps: { state: initialState } }
        );

        expect(result.current.activeAlert).toBeNull();

        // Update state to War
        const nextDiplomacy = {
            "p2": { "p1": DiplomacyState.War }
        };
        const nextState = createMockState(nextDiplomacy);

        rerender({ state: nextState });

        expect(result.current.activeAlert).toEqual(expect.objectContaining({
            type: "WarDeclared",
            otherPlayerId: "p2"
        }));
    });

    it("detects peace offer", () => {
        const initialState = createMockState({}, []);

        const { result, rerender } = renderHook(
            ({ state }) => useDiplomacyAlerts(state, "p1"),
            { initialProps: { state: initialState } }
        );

        expect(result.current.activeAlert).toBeNull();

        // Add peace offer
        const nextOffers = [{ from: "p2", to: "p1", type: "Peace" }];
        const nextState = createMockState({}, nextOffers);

        rerender({ state: nextState });

        expect(result.current.activeAlert).toEqual(expect.objectContaining({
            type: "PeaceOffered",
            otherPlayerId: "p2"
        }));
    });
});
