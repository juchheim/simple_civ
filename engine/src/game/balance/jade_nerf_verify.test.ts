import { expect, test, describe } from "vitest";
import { GameState, BuildingType, TechId } from "../../core/types.js";
import {
    JADE_COVENANT_GROWTH_MULT,
    JADE_COVENANT_SETTLER_DISCOUNT,
    JADE_COVENANT_POP_COMBAT_BONUS_PER,
    JADE_COVENANT_POP_COMBAT_BONUS_CAP,
    JADE_COVENANT_SETTLER_MOVEMENT,
} from "../../core/constants.js";
import { getGrowthCost, canBuild } from "../rules.js";

describe("JadeCovenant Balance Changes", () => {
    test("Constants reflect new nerf values", () => {
        expect(JADE_COVENANT_GROWTH_MULT).toBe(0.95);
        expect(JADE_COVENANT_SETTLER_DISCOUNT).toBe(0.90);
        expect(JADE_COVENANT_SETTLER_MOVEMENT).toBe(1);
        expect(JADE_COVENANT_POP_COMBAT_BONUS_PER).toBe(29);
        expect(JADE_COVENANT_POP_COMBAT_BONUS_CAP).toBe(2);
    });

    test("Growth discount remains modest", () => {
        const cost = getGrowthCost(10, false, false, "JadeCovenant");
        const base = getGrowthCost(10, false, false, "OtherCiv");

        // Jade keeps a modest global growth discount.
        expect(cost).toBe(Math.ceil(base * 0.95));
    });
});

describe("Bulwark Availability", () => {
    const createState = (civName: string): GameState => ({
        players: [{
            id: "p1",
            civName,
            techs: [TechId.StoneworkHalls],
            completedProjects: []
        }],
        cities: [{
            id: "c1",
            ownerId: "p1",
            buildings: [],
            currentBuild: null
        }],
        map: { tiles: [] },
        seed: 1
    } as unknown as GameState);

    test("ScholarKingdoms can build Bulwark", () => {
        const state = createState("ScholarKingdoms");
        const city = state.cities[0];
        expect(canBuild(city, "Building", BuildingType.Bulwark, state)).toBe(true);
    });

    test("StarborneSeekers can build Bulwark", () => {
        const state = createState("StarborneSeekers");
        const city = state.cities[0];
        expect(canBuild(city, "Building", BuildingType.Bulwark, state)).toBe(true);
    });

    test("Other civs CANNOT build Bulwark", () => {
        const state = createState("JadeCovenant");
        const city = state.cities[0];
        expect(canBuild(city, "Building", BuildingType.Bulwark, state)).toBe(false);
    });

    test("Bulwark requires StoneworkHalls", () => {
        const state = createState("ScholarKingdoms");
        state.players[0].techs = []; // Remove tech
        const city = state.cities[0];
        expect(canBuild(city, "Building", BuildingType.Bulwark, state)).toBe(false);
    });
});
