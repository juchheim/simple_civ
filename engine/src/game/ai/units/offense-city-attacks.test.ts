import { describe, expect, it } from "vitest";
import { DiplomacyState, EraId, GameState, PlayerPhase, TerrainType, UnitState, UnitType } from "../../../core/types.js";
import { tryCityAttacks } from "./offense-city-attacks.js";

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

    for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [] } as any);
        }
    }

    return state;
}

function makePlayer(id: string, civName = "TestCiv"): any {
    return {
        id,
        civName,
        color: "#fff",
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: EraId.Primitive,
    };
}

function makeCity(id: string, ownerId: string, q: number, r: number, hp: number, isCapital = false): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp,
        maxHp: 20,
        isCapital,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function makeUnit(id: string, ownerId: string, type: UnitType, q: number, r: number): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        state: UnitState.Normal,
        hasAttacked: false,
    };
}

describe("tryCityAttacks", () => {
    it("prioritizes killable cities over primary and low-HP targets", () => {
        const state = makeState();
        state.players = [makePlayer("p1"), makePlayer("p2")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const attacker = makeUnit("a1", "p1", UnitType.BowGuard, 0, 0);
        state.units = [attacker];

        const killCity = makeCity("kill", "p2", 0, 2, 1);
        const primaryCity = makeCity("primary", "p2", 1, 1, 12, true);
        const lowCity = makeCity("low", "p2", -1, 1, 5);
        state.cities = [killCity, primaryCity, lowCity];

        const result = tryCityAttacks(state, "p1", attacker, state.cities, primaryCity);

        expect(result.acted).toBe(true);
        expect(result.state.cities.find(c => c.id === "kill")?.lastDamagedOnTurn).toBe(state.turn);
        expect(result.state.cities.find(c => c.id === "primary")?.lastDamagedOnTurn).toBeUndefined();
        expect(result.state.cities.find(c => c.id === "low")?.lastDamagedOnTurn).toBeUndefined();
    });

    it("prefers primary targets, then lowest HP when no killable city exists", () => {
        const state = makeState();
        state.players = [makePlayer("p1"), makePlayer("p2")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const attacker = makeUnit("a1", "p1", UnitType.BowGuard, 0, 0);
        state.units = [attacker];

        const primaryCity = makeCity("primary", "p2", 1, 1, 12, true);
        const lowCity = makeCity("low", "p2", -1, 1, 5);
        state.cities = [primaryCity, lowCity];

        const primaryResult = tryCityAttacks(state, "p1", attacker, state.cities, primaryCity);

        expect(primaryResult.acted).toBe(true);
        expect(primaryResult.state.cities.find(c => c.id === "primary")?.lastDamagedOnTurn).toBe(state.turn);
        expect(primaryResult.state.cities.find(c => c.id === "low")?.lastDamagedOnTurn).toBeUndefined();

        const fallbackState = makeState();
        fallbackState.players = [makePlayer("p1"), makePlayer("p2")];
        fallbackState.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        fallbackState.units = [makeUnit("a1", "p1", UnitType.BowGuard, 0, 0)];
        fallbackState.cities = [
            makeCity("primary", "p2", 1, 1, 12, true),
            makeCity("low", "p2", -1, 1, 5),
        ];

        const lowResult = tryCityAttacks(fallbackState, "p1", fallbackState.units[0], fallbackState.cities, null);

        expect(lowResult.acted).toBe(true);
        expect(lowResult.state.cities.find(c => c.id === "low")?.lastDamagedOnTurn).toBe(fallbackState.turn);
        expect(lowResult.state.cities.find(c => c.id === "primary")?.lastDamagedOnTurn).toBeUndefined();
    });
});
