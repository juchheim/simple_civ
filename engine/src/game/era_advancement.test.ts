import { describe, it, expect } from "vitest";
import { GameState, Player, TechId, EraId, BuildingType, UnitType, ProjectId, PlayerPhase } from "../core/types.js";
import { advancePlayerTurn } from "./turn-lifecycle.js";
import { createTestState } from "./test-utils.js"; // Assuming this exists or I'll mock it

// Mock createTestState if not available or just build a minimal state manually
function createMinimalState(): GameState {
    const player: Player = {
        id: "p1",
        civName: "TestCiv",
        color: "#000000",
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: EraId.Primitive,
    };
    return {
        id: "test",
        turn: 1,
        players: [player],
        currentPlayerId: "p1",
        phase: PlayerPhase.StartOfTurn,
        map: { width: 10, height: 10, tiles: [] },
        units: [],
        cities: [],
        seed: 123,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };
}

describe("Era Advancement", () => {
    it("should advance to Banner era when researching a Banner tech", () => {
        const state = createMinimalState();
        const player = state.players[0];

        // Setup: Player is in Hearth era
        player.currentEra = EraId.Hearth;
        expect(player.currentEra).toBe(EraId.Hearth);

        // Setup: Player is researching Wellworks (Banner era)
        // Cost is 50. We give 50 science.
        player.currentTech = { id: TechId.Wellworks, progress: 0, cost: 50 };

        // We need to mock getSciencePerTurn or just ensure the logic uses what we expect.
        // processResearch calls getSciencePerTurn.
        // getSciencePerTurn sums city yields.
        // Let's just manually trigger the logic or mock the function?
        // Easier to just invoke advancePlayerTurn with a state that produces science.
        // Or better, just test the logic inside processResearch if exported? It's not.

        // Let's add a city with science yield.
        state.cities.push({
            id: "c1",
            name: "City",
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [BuildingType.Scriptorium], // +1 Science
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Base science is 1 + 1 (Scriptorium) = 2.
        // We need 50. So we set progress to 48.
        player.currentTech.progress = 48;

        // Run turn
        advancePlayerTurn(state, "p1");

        // Verify
        expect(player.techs).toContain(TechId.Wellworks);
        expect(player.currentEra).toBe(EraId.Banner);
    });

    it("should advance to Engine era when researching an Engine tech", () => {
        const state = createMinimalState();
        const player = state.players[0];

        // Setup: Player is in Banner era
        player.currentEra = EraId.Banner;
        player.techs.push(TechId.Wellworks); // Prereq

        // Setup: Player is researching SteamForges (Engine era)
        player.currentTech = { id: TechId.SteamForges, progress: 84, cost: 85 }; // Need 1 more

        // Add city with science
        state.cities.push({
            id: "c1",
            name: "City",
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        // Base science 1.

        advancePlayerTurn(state, "p1");

        expect(player.techs).toContain(TechId.SteamForges);
        expect(player.currentEra).toBe(EraId.Engine);
    });

    it("should NOT advance if researching a tech from the SAME era", () => {
        const state = createMinimalState();
        const player = state.players[0];

        player.currentEra = EraId.Hearth;
        expect(player.currentEra).toBe(EraId.Hearth);

        // Research Fieldcraft (Hearth)
        player.currentTech = { id: TechId.Fieldcraft, progress: 19, cost: 20 };

        state.cities.push({
            id: "c1",
            name: "City",
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        advancePlayerTurn(state, "p1");

        expect(player.techs).toContain(TechId.Fieldcraft);
        expect(player.currentEra).toBe(EraId.Hearth);
    });
    it("should advance to Hearth era when researching a Hearth tech from Primitive", () => {
        const state = createMinimalState();
        const player = state.players[0];

        // Setup: Player is in Primitive era (default in createMinimalState now)
        expect(player.currentEra).toBe(EraId.Primitive);

        // Research Fieldcraft (Hearth)
        player.currentTech = { id: TechId.Fieldcraft, progress: 19, cost: 20 };

        state.cities.push({
            id: "c1",
            name: "City",
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        advancePlayerTurn(state, "p1");

        expect(player.techs).toContain(TechId.Fieldcraft);
        expect(player.currentEra).toBe(EraId.Hearth);
    });
});
