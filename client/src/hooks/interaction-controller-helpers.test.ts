import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, TerrainType, UnitType } from "@simple-civ/engine";
import {
    canUnitAttackCity,
    canUnitsStack,
    createAttackAction,
    createMoveUnitAction,
    getEnemyTerritoryOwnerAtPeaceForCoord,
    getTileVisibilityState,
    isAtPeaceWithTarget,
    pickLinkedOrFirstFriendlyUnitId
} from "./interaction-controller-helpers";

function makeState(overrides: Partial<GameState>): GameState {
    return {
        id: "game-1",
        players: [
            { id: "p1", civName: "Alpha", color: "#fff", techs: [], completedProjects: [], isEliminated: false, currentTech: null },
            { id: "p2", civName: "Beta", color: "#0ff", techs: [], completedProjects: [], isEliminated: false, currentTech: null },
        ],
        diplomacy: {},
        diplomacyOffers: [],
        units: [],
        cities: [],
        turn: 1,
        currentPlayerId: "p1",
        phase: "Action" as any,
        map: {
            width: 3,
            height: 3,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p2" },
            ],
        },
        seed: 1,
        visibility: { p1: [] },
        revealed: { p1: [] },
        sharedVision: {},
        contacts: {},
        nativeCamps: [],
        ...overrides,
    } as unknown as GameState;
}

describe("interaction-controller-helpers", () => {
    it("classifies tile visibility states", () => {
        const state = makeState({
            visibility: { p1: ["0,0"] },
            revealed: { p1: ["0,0", "0,1"] },
        });

        expect(getTileVisibilityState(state, "p1", { q: 0, r: 0 })).toBe("visible");
        expect(getTileVisibilityState(state, "p1", { q: 0, r: 1 })).toBe("fogged");
        expect(getTileVisibilityState(state, "p1", { q: 1, r: 1 })).toBe("shroud");
    });

    it("detects enemy territory at peace and excludes city tiles", () => {
        const state = makeState({
            diplomacy: {
                p1: { p2: DiplomacyState.Peace },
                p2: { p1: DiplomacyState.Peace },
            },
        });

        const owner = getEnemyTerritoryOwnerAtPeaceForCoord(state, "p1", state.diplomacy, { q: 0, r: 1 });
        expect(owner).toBe("p2");

        const withCity = makeState({
            diplomacy: state.diplomacy,
            cities: [{ id: "c1", ownerId: "p2", coord: { q: 0, r: 1 } } as any],
        });
        expect(getEnemyTerritoryOwnerAtPeaceForCoord(withCity, "p1", withCity.diplomacy, { q: 0, r: 1 })).toBeNull();
    });

    it("builds actions and diplomacy decisions", () => {
        expect(createMoveUnitAction("p1", "u1", { q: 1, r: 2 })).toEqual({
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u1",
            to: { q: 1, r: 2 },
        });
        expect(createAttackAction("p1", "u1", "u2", "Unit")).toEqual({
            type: "Attack",
            playerId: "p1",
            attackerId: "u1",
            targetId: "u2",
            targetType: "Unit",
        });
        expect(isAtPeaceWithTarget({ p1: { p2: DiplomacyState.War } } as any, "p1", "p2")).toBe(false);
        expect(isAtPeaceWithTarget({ p1: { p2: DiplomacyState.Peace } } as any, "p1", "p2")).toBe(true);
    });

    it("handles unit attack/civillian stacking and linked selection", () => {
        const settler = { id: "s1", type: UnitType.Settler } as any;
        const guard = { id: "g1", type: UnitType.SpearGuard } as any;
        const scout = { id: "sc1", type: UnitType.Scout } as any;

        expect(canUnitAttackCity(settler)).toBe(false);
        expect(canUnitAttackCity(guard)).toBe(true);
        expect(canUnitsStack(settler, guard)).toBe(true);
        expect(canUnitsStack(guard, scout)).toBe(false);

        expect(pickLinkedOrFirstFriendlyUnitId([
            { id: "u1", linkedUnitId: "u2" },
            { id: "u2" },
            { id: "u3" },
        ] as any)).toBe("u1");
        expect(pickLinkedOrFirstFriendlyUnitId([{ id: "u9" }] as any)).toBe("u9");
    });
});
