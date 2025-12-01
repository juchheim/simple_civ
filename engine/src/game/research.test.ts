import { describe, it, expect } from "vitest";
import { GameState, Player, TechId, PlayerPhase, Action } from "../core/types.js";
import { applyAction } from "./turn-loop.js";
import { TECHS } from "../core/constants.js";

describe("Research Preservation", () => {
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

    it("should save progress when switching research", () => {
        let state = createInitialState();
        const player = state.players[0];

        // 1. Start researching Fieldcraft
        state = applyAction(state, {
            type: "ChooseTech",
            playerId: "p1",
            techId: TechId.Fieldcraft,
        });

        expect(state.players[0].currentTech?.id).toBe(TechId.Fieldcraft);
        expect(state.players[0].currentTech?.progress).toBe(0);

        // 2. Simulate some progress (manually, as turn end logic does this)
        if (state.players[0].currentTech) {
            state.players[0].currentTech.progress = 10;
        }

        // 3. Switch to StoneworkHalls
        state = applyAction(state, {
            type: "ChooseTech",
            playerId: "p1",
            techId: TechId.StoneworkHalls,
        });

        // Verify new tech is active and starts at 0
        expect(state.players[0].currentTech?.id).toBe(TechId.StoneworkHalls);
        expect(state.players[0].currentTech?.progress).toBe(0);

        // Verify old tech progress is saved
        expect(state.players[0].researchHistory?.[TechId.Fieldcraft]).toBe(10);
    });

    it("should restore progress when switching back", () => {
        let state = createInitialState();

        // Setup: Player has 15 progress on Fieldcraft in history
        state.players[0].researchHistory = {
            [TechId.Fieldcraft]: 15
        };

        // Switch to Fieldcraft
        state = applyAction(state, {
            type: "ChooseTech",
            playerId: "p1",
            techId: TechId.Fieldcraft,
        });

        // Verify progress is restored
        expect(state.players[0].currentTech?.id).toBe(TechId.Fieldcraft);
        expect(state.players[0].currentTech?.progress).toBe(15);
    });

    it("should accumulate progress correctly across switches", () => {
        let state = createInitialState();

        // 1. Start Fieldcraft
        state = applyAction(state, { type: "ChooseTech", playerId: "p1", techId: TechId.Fieldcraft });
        state.players[0].currentTech!.progress = 5;

        // 2. Switch to StoneworkHalls
        state = applyAction(state, { type: "ChooseTech", playerId: "p1", techId: TechId.StoneworkHalls });
        state.players[0].currentTech!.progress = 8;

        // 3. Switch back to Fieldcraft
        state = applyAction(state, { type: "ChooseTech", playerId: "p1", techId: TechId.Fieldcraft });
        expect(state.players[0].currentTech?.progress).toBe(5);

        // 4. Add more progress to Fieldcraft
        state.players[0].currentTech!.progress = 20;

        // 5. Switch back to StoneworkHalls
        state = applyAction(state, { type: "ChooseTech", playerId: "p1", techId: TechId.StoneworkHalls });
        expect(state.players[0].currentTech?.progress).toBe(8);
        expect(state.players[0].researchHistory?.[TechId.Fieldcraft]).toBe(20);
    });
});
