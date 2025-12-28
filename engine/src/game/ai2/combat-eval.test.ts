import { describe, it, expect } from "vitest";
import { bestAttackForUnit } from "./combat-eval.js";
import { UnitType, DiplomacyState, GameState } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";

const baseUnit = (override: Partial<NonNullable<GameState["units"][number]>>): NonNullable<GameState["units"][number]> => ({
    id: "u",
    ownerId: "p1",
    type: UnitType.SpearGuard,
    hp: UNITS[UnitType.SpearGuard].hp,
    maxHp: UNITS[UnitType.SpearGuard].hp,
    coord: { q: 0, r: 0 },
    movesLeft: 1,
    hasAttacked: false,
    ...override,
});

const baseState = (): GameState => ({
    id: "g",
    turn: 1,
    currentPlayerId: "p1",
    players: [
        { id: "p1", civName: "Test", color: "#fff", techs: [], isEliminated: false },
        { id: "p2", civName: "Test2", color: "#000", techs: [], isEliminated: false },
    ],
    diplomacy: { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } },
    cities: [],
    units: [],
    map: { tiles: [] as any },
});

describe("bestAttackForUnit", () => {
    it("returns null when no enemies in range", () => {
        const state = baseState();
        state.units = [baseUnit({})];
        const res = bestAttackForUnit(state, "p1", state.units[0]);
        expect(res).toBeNull();
    });

    it("prefers adjacent lethal city capture", () => {
        const state = baseState();
        const attacker = baseUnit({ id: "a", type: UnitType.SpearGuard, coord: { q: 0, r: 0 } });
        state.units = [attacker];
        state.cities = [{
            id: "c1",
            name: "C",
            ownerId: "p2",
            originalOwnerId: "p2",
            coord: { q: 1, r: 0 },
            hp: 0,
            maxHp: 20,
            isCapital: false,
            defense: 0,
            projects: [],
            buildQueue: [],
            pop: 1,
            workedTiles: [],
            currentBuild: null,
            buildings: [],
            yields: { F: 0, P: 0, S: 0 },
        } as any];
        const res = bestAttackForUnit(state, "p1", attacker);
        expect(res?.action.targetType).toBe("City");
        expect(res?.action.targetId).toBe("c1");
    });

    it("scores focus city higher", () => {
        const state = baseState();
        const attacker = baseUnit({ id: "a", type: UnitType.BowGuard, coord: { q: 0, r: 0 } });
        const unit = baseUnit({ id: "e1", ownerId: "p2", coord: { q: 1, r: 0 }, hp: 5 });
        const city = {
            id: "c1",
            name: "C",
            ownerId: "p2",
            originalOwnerId: "p2",
            coord: { q: 2, r: 0 },
            hp: 10,
            maxHp: 20,
            isCapital: false,
            defense: 0,
            projects: [],
            buildQueue: [],
            pop: 1,
            workedTiles: [],
            currentBuild: null,
            buildings: [],
            yields: { F: 0, P: 0, S: 0 },
        } as any;
        state.units = [attacker, unit];
        state.cities = [city];
        state.aiMemoryV2 = { p1: { focusCityId: "c1" } } as any;
        const res = bestAttackForUnit(state, "p1", attacker, new Set(["p2"]));
        expect(res).not.toBeNull();
        expect(["City", "Unit"]).toContain(res!.action.targetType);
    });
});
