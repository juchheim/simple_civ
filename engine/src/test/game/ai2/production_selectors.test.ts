import { describe, it, expect } from "vitest";
import { pickVictoryProject } from "../../../game/ai2/production/victory.js";
import { pickEconomyBuilding } from "../../../game/ai2/production/economy.js";
import { resolveInterleave } from "../../../game/ai2/production/defense-priority.js";
import { getUnlockedUnits } from "../../../game/ai2/production/unlocks.js";
import { getAiProfileV2 } from "../../../game/ai2/rules.js";
import { AiVictoryGoal, BuildingType, City, EraId, GameState, ProjectId, TechId, UnitType } from "../../../core/types.js";

function makeCity(overrides: Partial<City> = {}): City {
    return {
        id: "c1",
        ownerId: "p1",
        name: "Capital",
        coord: { q: 0, r: 0 },
        buildings: [],
        currentBuild: undefined,
        hp: 15,
        maxHp: 15,
        pop: 3,
        isCapital: true,
        ...overrides,
    } as City;
}

function makeBaseState(overrides: Partial<GameState> = {}): GameState {
    const city = makeCity();
    const base: Partial<GameState> = {
        id: "g",
        turn: 10,
        players: [
            {
                id: "p1",
                civName: "ScholarKingdoms",
                techs: [],
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Primitive,
            },
        ],
        currentPlayerId: "p1",
        phase: "Action" as any,
        map: { width: 5, height: 5, tiles: [{ coord: { q: 0, r: 0 }, terrain: "Plains", overlays: [] }] } as any,
        units: [],
        cities: [city],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: { p1: {} as any } as any,
        diplomacyOffers: [],
        sharedVision: {},
        contacts: {},
        history: { events: [], playerStats: {}, playerFog: {} },
        nativeCamps: [],
    };
    return { ...base, ...overrides } as GameState;
}

describe("production selectors", () => {
    it("picks Observatory when Progress goal and StarCharts unlocked", () => {
        const state = makeBaseState();
        state.players[0].techs = [TechId.StarCharts];
        const profile = getAiProfileV2(state, "p1");
        const city = state.cities[0];

        const build = pickVictoryProject(state, "p1", city, "Progress" as AiVictoryGoal, profile, state.cities);

        expect(build).toEqual({ type: "Project", id: ProjectId.Observatory });
    });

    it("picks first available gold economy building", () => {
        const state = makeBaseState();
        state.players[0].techs = [TechId.Fieldcraft];
        const city = state.cities[0];

        const build = pickEconomyBuilding(state, "p1", city, "ScholarKingdoms");

        expect(build).toEqual({ type: "Building", id: BuildingType.TradingPost });
    });
});

describe("production helpers", () => {
    it("unlocks army units when DrilledRanks is researched", () => {
        const unlocked = getUnlockedUnits([TechId.DrilledRanks]);
        expect(unlocked).toContain(UnitType.ArmySpearGuard);
        expect(unlocked).toContain(UnitType.ArmyBowGuard);
        expect(unlocked).not.toContain(UnitType.SpearGuard);
        expect(unlocked).not.toContain(UnitType.BowGuard);
    });

    it("resolves interleave deterministically per city index", () => {
        const state = makeBaseState({ turn: 1 });
        const shouldDefend = resolveInterleave(state, "p1", 0);
        expect(shouldDefend).toBe(true);
    });
});
