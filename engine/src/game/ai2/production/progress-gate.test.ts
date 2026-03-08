import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, ProjectId, TechId, UnitState, UnitType } from "../../../core/types.js";
import { getAiProfileV2 } from "../rules.js";
import { chooseCityBuildV2 } from "../production.js";
import { pickVictoryProject } from "./victory.js";

function makeState(
    cityCount: number,
    options?: {
        completedProjects?: ProjectId[];
        activeSettlers?: number;
        queuedSettler?: boolean;
    }
): GameState {
    const completedProjects = options?.completedProjects ?? [ProjectId.Observatory, ProjectId.GrandAcademy];
    const activeSettlers = options?.activeSettlers ?? 0;
    const queuedSettler = options?.queuedSettler ?? false;
    return {
        id: "progress-gate",
        turn: 220,
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        players: [{
            id: "p1",
            civName: "ScholarKingdoms",
            color: "#fff",
            isAI: true,
            aiGoal: "Progress",
            techs: [TechId.StarCharts],
            currentTech: null,
            completedProjects,
            isEliminated: false,
            currentEra: "Engine",
            treasury: 200,
        }],
        cities: Array.from({ length: cityCount }, (_, index) => ({
            id: `c${index + 1}`,
            name: `City ${index + 1}`,
            ownerId: "p1",
            coord: { q: index * 3, r: 0 },
            pop: 5,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: index * 3, r: 0 }],
            currentBuild: queuedSettler && index === 0 ? { type: "Unit", id: UnitType.Settler, cost: 60 } : null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: index === 0,
            hasFiredThisTurn: false,
            milestones: [],
        })),
        units: Array.from({ length: activeSettlers }, (_, index) => ({
            id: `settler-${index + 1}`,
            ownerId: "p1",
            type: UnitType.Settler,
            coord: { q: cityCount * 3 + index, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 2,
            state: UnitState.Normal,
            hasAttacked: false,
        })),
        map: {
            width: 40,
            height: 30,
            tiles: Array.from({ length: cityCount }, (_, index) => ({
                coord: { q: index * 3, r: 0 },
                terrain: "Plains",
                overlays: [],
                ownerId: "p1",
                hasCityCenter: true,
            })),
        },
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
        aiMemoryV2: {},
    } as unknown as GameState;
}

describe("Progress production without map-specific gate", () => {
    it("treats standard-map endgames as Progress stall-breaker windows", () => {
        const state = makeState(1, { completedProjects: [] });
        state.turn = 190;
        state.map.width = 30;
        state.map.height = 22;
        state.players[0]!.civName = "ForgeClans";

        const profile = getAiProfileV2(state, "p1");
        const city = state.cities[0]!;

        const build = pickVictoryProject(state, "p1", city, "Conquest", profile, state.cities);

        expect(build).toEqual({ type: "Project", id: ProjectId.Observatory });
    });

    it("continues the Progress chain on huge maps once Observatory is complete", () => {
        const state = makeState(1, { completedProjects: [ProjectId.Observatory] });
        const profile = getAiProfileV2(state, "p1");
        const city = state.cities[0]!;

        const build = pickVictoryProject(state, "p1", city, "Progress", profile, state.cities);

        expect(build).toEqual({ type: "Project", id: ProjectId.GrandAcademy });
    });

    it("chooses GrandExperiment on huge maps without forcing extra expansion", () => {
        const state = makeState(1);
        const profile = getAiProfileV2(state, "p1");
        const city = state.cities[0]!;

        const build = pickVictoryProject(state, "p1", city, "Progress", profile, state.cities);

        expect(build).toEqual({ type: "Project", id: ProjectId.GrandExperiment });
    });

    it("does not force a Settler when no map-specific Progress city gate exists", () => {
        const state = makeState(1, { completedProjects: [ProjectId.Observatory] });

        const build = chooseCityBuildV2(state, "p1", state.cities[0]!, "Progress");

        expect(build).not.toEqual({ type: "Unit", id: UnitType.Settler });
    });
});
