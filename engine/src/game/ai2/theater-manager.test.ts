import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, ProjectId } from "../../core/types.js";
import { buildOperationalTheaters } from "./theater-manager.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 80,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 20, height: 20, tiles: [] },
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
    } as GameState;
}

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean; project?: ProjectId }): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: 4,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: opts?.project ? { type: "Project", id: opts.project } : null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: !!opts?.capital,
        originalOwnerId: ownerId,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkPlayer(id: string, civName: string, ai = true): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: ai,
        aiGoal: "Balanced",
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

describe("Theater Manager", () => {
    it("clusters nearby enemy cities and prioritizes progress threats", () => {
        const state = baseState();
        state.players = [
            mkPlayer("p1", "ForgeClans"),
            mkPlayer("p2", "RiverLeague"),
            mkPlayer("p3", "ScholarKingdoms"),
        ];
        state.cities = [
            mkCity("p1", "home", 0, 0, { capital: true }),
            // Enemy cluster near home
            mkCity("p2", "e1", 4, 0, { capital: true }),
            mkCity("p2", "e2", 5, 1),
            // Distant progress threat
            mkCity("p3", "p1", 12, 0, { capital: true, project: ProjectId.Observatory }),
        ];
        state.diplomacy = {
            p1: { p2: DiplomacyState.War, p3: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.War },
            p3: { p1: DiplomacyState.Peace },
        };

        const theaters = buildOperationalTheaters(state, "p1");
        expect(theaters.length).toBeGreaterThan(0);

        const hasProgress = theaters.some(t => t.objective === "deny-progress" && t.targetPlayerId === "p3");
        expect(hasProgress).toBe(true);

        // The closest enemy cluster should produce a theater anchored at our home city.
        const cluster = theaters.find(t => t.targetPlayerId === "p2");
        expect(cluster?.anchorCityId).toBe("home");
    });
});
