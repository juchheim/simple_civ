import { describe, it, expect } from "vitest";
import { DiplomacyState, EraId, GameState, PlayerPhase, UnitState, UnitType } from "../../../core/types.js";
import { getAttackingUnits, getEnemyTargets, getWarEnemyIds } from "./offense-targeting.js";

function makeState(): GameState {
    const state: GameState = {
        id: "test",
        turn: 1,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: { width: 6, height: 6, tiles: [] },
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
    };

    for (let q = -1; q <= 4; q++) {
        for (let r = -1; r <= 4; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
        }
    }

    return state;
}

function makePlayer(id: string, eliminated = false): any {
    return {
        id,
        civName: "TestCiv",
        color: "#fff",
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: eliminated,
        currentEra: EraId.Primitive,
    };
}

function makeCity(ownerId: string, q: number, r: number): any {
    return {
        id: `${ownerId}-city`,
        name: "Test City",
        ownerId,
        coord: { q, r },
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp: 10,
        maxHp: 10,
        isCapital: true,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function makeUnit(id: string, ownerId: string, type: UnitType, q: number, r: number, state: UnitState = UnitState.Normal): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        state,
        hasAttacked: false,
    };
}

describe("offense-targeting helpers", () => {
    it("filters attacking units to exclude garrisons, civilians, scouts, and titans", () => {
        const state = makeState();
        state.players = [makePlayer("p1"), makePlayer("p2")];
        state.cities = [makeCity("p1", 0, 0)];
        state.units = [
            makeUnit("a1", "p1", UnitType.SpearGuard, 1, 0),
            makeUnit("g1", "p1", UnitType.SpearGuard, 0, 0),
            makeUnit("s1", "p1", UnitType.Settler, 2, 0),
            makeUnit("sc1", "p1", UnitType.Scout, 2, 1),
            makeUnit("g2", "p1", UnitType.SpearGuard, 3, 0, UnitState.Garrisoned),
            makeUnit("t1", "p1", UnitType.Titan, 3, 1),
            makeUnit("e1", "p2", UnitType.SpearGuard, 1, 1),
            makeUnit("r1", "p1", UnitType.BowGuard, 2, 2),
        ];

        const attackers = getAttackingUnits(state, "p1").map(u => u.id);
        expect(attackers).toEqual(["a1", "r1"]);
    });

    it("returns only war enemies that are still alive", () => {
        const state = makeState();
        state.players = [makePlayer("p1"), makePlayer("p2"), makePlayer("p3", true)];
        state.diplomacy = {
            p1: { p2: DiplomacyState.War, p3: DiplomacyState.War },
            p2: { p1: DiplomacyState.War },
            p3: { p1: DiplomacyState.War },
        } as any;

        const enemyIds = getWarEnemyIds(state, "p1");
        expect(enemyIds).toEqual(["p2"]);
    });

    it("only includes settlers when they are adjacent", () => {
        const state = makeState();
        state.players = [makePlayer("p1"), makePlayer("p2")];
        const attacker = makeUnit("a1", "p1", UnitType.BowGuard, 0, 0);
        state.units = [
            attacker,
            makeUnit("settler-near", "p2", UnitType.Settler, 0, 1),
            makeUnit("settler-far", "p2", UnitType.Settler, 0, 2),
            makeUnit("spear", "p2", UnitType.SpearGuard, 0, 2),
        ];

        const targets = getEnemyTargets(state, attacker, ["p2"]);
        const targetIds = targets.map(t => t.u.id);

        expect(targetIds).toContain("settler-near");
        expect(targetIds).toContain("spear");
        expect(targetIds).not.toContain("settler-far");
    });
});
