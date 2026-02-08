import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType } from "../../core/types.js";
import { pickWarStagingProduction } from "./production/staging.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 50,
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

function mkCity(ownerId: string, id: string, q: number, r: number): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: 2,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: false,
        originalOwnerId: ownerId,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 2,
        hasAttacked: false,
        state: "Normal",
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

describe("War staging uses theater target", () => {
    it("stages toward theater target when no focus target is set", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "home", 0, 0),
            mkCity("p2", "e1", 6, 0),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

        state.aiMemoryV2 = {
            p1: {
                operationalTurn: state.turn,
                operationalTheaters: [
                    {
                        id: "front-1",
                        targetPlayerId: "p2",
                        targetCityId: "e1",
                        anchorCityId: "home",
                        anchorCoord: { q: 0, r: 0 },
                        targetCoord: { q: 6, r: 0 },
                        objective: "pressure",
                        priority: 0.8,
                        threat: 0,
                        friendly: 0,
                        distance: 6,
                        atWar: false,
                        cityCount: 1,
                    },
                ],
            },
        } as any;

        const build = pickWarStagingProduction(state, "p1", state.cities[0]);
        expect(build).not.toBeNull();
        expect(build?.type).toBe("Unit");
    });
});

describe("War staging reinforcement", () => {
    it("builds offensive units during war after failed siege waves", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "home", 0, 0),
            mkCity("p2", "e1", 6, 0),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        state.aiMemoryV2 = {
            p1: {
                focusCityId: "e1",
                siegeFailureCount: { e1: 1 },
            },
        } as any;

        const build = pickWarStagingProduction(state, "p1", state.cities[0]);
        expect(build).not.toBeNull();
        expect(build?.type).toBe("Unit");
    });
});
