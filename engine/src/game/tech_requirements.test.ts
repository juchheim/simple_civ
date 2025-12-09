import { describe, it, expect } from "vitest";
import { GameState, Player, TechId, PlayerPhase, EraId } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("Tech Requirements", () => {
    const createInitialState = (): GameState => {
        const player: Player = {
            id: "p1",
            civName: "TestCiv",
            color: "blue",
            techs: [],
            currentTech: null,
            completedProjects: [],
            isEliminated: false,
            researchHistory: {},
            currentEra: EraId.Hearth,
        };

        return {
            id: "game1",
            turn: 1,
            players: [player],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: { width: 10, height: 10, tiles: [] },
            units: [],
            cities: [],
            seed: 123,
            visibility: { p1: [] },
            revealed: { p1: [] },
            diplomacy: {},
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
        };
    };

    it("should BLOCK researching Banner tech with only 2 Hearth techs", () => {
        let state = createInitialState();
        state.players[0].techs = [TechId.Fieldcraft, TechId.StoneworkHalls];

        expect(() => {
            applyAction(state, {
                type: "ChooseTech",
                playerId: "p1",
                techId: TechId.Wellworks,
            });
        }).toThrow("Need 3 Hearth techs");
    });

    it("should ALLOW researching Banner tech with 3 Hearth techs", () => {
        let state = createInitialState();
        // Give 3 Hearth techs
        state.players[0].techs = [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore];

        state = applyAction(state, {
            type: "ChooseTech",
            playerId: "p1",
            techId: TechId.Wellworks,
        });

        expect(state.players[0].currentTech?.id).toBe(TechId.Wellworks);
    });
});
