import { describe, it, expect } from "vitest";
import { GameState, UnitType, UnitDomain, UnitState, HexCoord, PlayerPhase, DiplomacyState, TerrainType } from "../../core/types.js";
import { handleSwapUnits } from "../actions/units.js";
import { routeCityCaptures } from "./units/offense.js";
import { hexEquals } from "../../core/hex.js";

function createTestState(): GameState {
    const state: GameState = {
        id: "test",
        turn: 1,
        players: [
            { id: "player1", civName: "Civ 1", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "player2", civName: "Civ 2", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false }
        ],
        currentPlayerId: "player1",
        phase: PlayerPhase.Action,
        map: { width: 10, height: 10, tiles: [], rivers: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: { player1: [], player2: [] },
        revealed: { player1: [], player2: [] },
        diplomacy: { player1: { player2: DiplomacyState.Peace }, player2: { player1: DiplomacyState.Peace } },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: []
    };

    // Populate tiles
    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {
            state.map.tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: []
            });
        }
    }
    return state;
}

function createTestCity(state: GameState, ownerId: string, coord: { q: number, r: number }): any {
    const city = {
        id: `city_${ownerId}_${coord.q}_${coord.r}`,
        name: "Test City",
        ownerId,
        coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: true,
        hasFiredThisTurn: false,
        milestones: []
    };
    state.cities.push(city);
    return city;
}

function createTestUnit(state: GameState, ownerId: string, type: UnitType, coord: { q: number, r: number }): any {
    const unit = {
        id: `unit_${ownerId}_${type}_${coord.q}_${coord.r}`,
        type,
        ownerId,
        coord,
        hp: 10,
        maxHp: 10,
        movesLeft: 2,
        state: UnitState.Normal,
        hasAttacked: false
    };
    state.units.push(unit);
    return unit;
}

describe("SwapUnits Action", () => {
    it("should swap positions of two adjacent units", () => {
        const state = createTestState();
        const p1 = state.players[0];

        const u1 = createTestUnit(state, p1.id, UnitType.SpearGuard, { q: 0, r: 0 });
        const u2 = createTestUnit(state, p1.id, UnitType.BowGuard, { q: 0, r: 1 });

        u1.movesLeft = 1;
        u2.movesLeft = 0; // Target doesn't need moves

        const next = handleSwapUnits(state, {
            type: "SwapUnits",
            playerId: p1.id,
            unitId: u1.id,
            targetUnitId: u2.id
        });

        const nextU1 = next.units.find(u => u.id === u1.id);
        const nextU2 = next.units.find(u => u.id === u2.id);

        expect(nextU1?.coord).toEqual({ q: 0, r: 1 });
        expect(nextU2?.coord).toEqual({ q: 0, r: 0 });
        expect(nextU1?.movesLeft).toBe(0); // Cost 1 move
    });

    it("should fail if units are not adjacent", () => {
        const state = createTestState();
        const p1 = state.players[0];

        const u1 = createTestUnit(state, p1.id, UnitType.SpearGuard, { q: 0, r: 0 });
        const u2 = createTestUnit(state, p1.id, UnitType.BowGuard, { q: 0, r: 2 });

        expect(() => handleSwapUnits(state, {
            type: "SwapUnits",
            playerId: p1.id,
            unitId: u1.id,
            targetUnitId: u2.id
        })).toThrow("Units must be adjacent to swap");
    });

    it("should swap even if target unit has 0 moves", () => {
        const state = createTestState();
        const p1 = state.players[0];

        const u1 = createTestUnit(state, p1.id, UnitType.SpearGuard, { q: 0, r: 0 });
        const u2 = createTestUnit(state, p1.id, UnitType.BowGuard, { q: 0, r: 1 });

        u1.movesLeft = 1;
        u2.movesLeft = 0;

        const next = handleSwapUnits(state, {
            type: "SwapUnits",
            playerId: p1.id,
            unitId: u1.id,
            targetUnitId: u2.id
        });

        const nextU1 = next.units.find(u => u.id === u1.id);
        const nextU2 = next.units.find(u => u.id === u2.id);

        expect(nextU1?.coord).toEqual({ q: 0, r: 1 });
        expect(nextU2?.coord).toEqual({ q: 0, r: 0 });
    });
});

describe("AI routeCityCaptures with Swap", () => {
    it("should swap with blocking unit to reach capture target", () => {
        const state = createTestState();
        const p1 = state.players[0];
        const p2 = state.players[1];

        // Setup: City at 0,2 (HP 0)
        // Capture unit at 0,0
        // Blocking friendly unit at 0,1 (surrounded by obstacles/enemies so it can't move aside easily)
        // Actually, our logic tries "move aside" first. If that fails, it swaps.
        // To force swap, we can make "move aside" fail by blocking all neighbors of 0,1.

        const city = createTestCity(state, p2.id, { q: 0, r: 2 });
        city.hp = 0;

        const captureUnit = createTestUnit(state, p1.id, UnitType.SpearGuard, { q: 0, r: 0 });
        captureUnit.movesLeft = 1;

        const blocker = createTestUnit(state, p1.id, UnitType.BowGuard, { q: 0, r: 1 });
        blocker.movesLeft = 0; // Cannot move aside

        // Block other neighbors of 0,0 to force path through 0,1
        const neighbors = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }
        ];
        for (const n of neighbors) {
            const tile = state.map.tiles.find(t => hexEquals(t.coord, n));
            if (tile) tile.terrain = TerrainType.Mountain;
        }

        const next = routeCityCaptures(state, p1.id);

        const nextCapture = next.units.find(u => u.id === captureUnit.id);
        const nextBlocker = next.units.find(u => u.id === blocker.id);

        // Expect swap
        expect(nextCapture?.coord).toEqual({ q: 0, r: 1 });
        expect(nextBlocker?.coord).toEqual({ q: 0, r: 0 });
    });
});
