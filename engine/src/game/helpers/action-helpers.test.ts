import { describe, expect, it } from "vitest";
import { assertAdjacent, assertHasNotAttacked, assertMovesLeft, assertOwnership, assertTileCanBeOccupied, getCityAt, getUnitOrThrow } from "./action-helpers.js";
import { City, DiplomacyState, GameState, HexCoord, PlayerPhase, TerrainType, Unit, UnitState, UnitType } from "../../core/types.js";
import { MoveParticipant } from "./movement.js";
import { UNITS } from "../../core/constants.js";

function makeState(): GameState {
    return {
        id: "state",
        turn: 1,
        players: [
            { id: "p1", civName: "Testers", color: "#1", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "p2", civName: "Rivals", color: "#2", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 2,
            height: 1,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            ],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: { p1: [], p2: [] },
        revealed: { p1: [], p2: [] },
        diplomacy: { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } },
        sharedVision: { p1: { p2: false }, p2: { p1: false } },
        contacts: { p1: { p2: false }, p2: { p1: false } },
        diplomacyOffers: [],
    };
}

function makeUnit(props: { id: string; ownerId: string; coord: HexCoord; type: UnitType; movesLeft?: number; hasAttacked?: boolean }): Unit {
    const stats = UNITS[props.type];
    return {
        id: props.id,
        ownerId: props.ownerId,
        coord: props.coord,
        type: props.type,
        hp: stats.hp,
        maxHp: stats.hp,
        movesLeft: props.movesLeft ?? stats.move,
        state: UnitState.Normal,
        hasAttacked: props.hasAttacked ?? false,
    };
}

function makeCity(coord: HexCoord, ownerId: string): City {
    return {
        id: "city-1",
        name: "Capital",
        ownerId,
        coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 10,
        maxHp: 10,
        isCapital: true,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

describe("action-helpers", () => {
    it("gets units or throws with consistent errors", () => {
        const state = makeState();
        const unit = makeUnit({ id: "u1", ownerId: "p1", coord: { q: 0, r: 0 }, type: UnitType.SpearGuard });
        state.units.push(unit);

        expect(getUnitOrThrow(state, "u1")).toBe(unit);
        expect(() => getUnitOrThrow(state, "missing")).toThrowError("Unit not found");
        expect(() => getUnitOrThrow(state, "missing", "Custom missing")).toThrowError("Custom missing");
    });

    it("finds cities at coordinates", () => {
        const state = makeState();
        const city = makeCity({ q: 0, r: 0 }, "p1");
        state.cities.push(city);

        expect(getCityAt(state, { q: 0, r: 0 })).toBe(city);
        expect(getCityAt(state, { q: 1, r: 1 })).toBeUndefined();
    });

    it("asserts ownership and moves left with shared error strings", () => {
        const unit = makeUnit({ id: "u1", ownerId: "p1", coord: { q: 0, r: 0 }, type: UnitType.SpearGuard });

        expect(() => assertOwnership(unit, "p1")).not.toThrow();
        expect(() => assertOwnership(unit, "p2")).toThrowError("Not your unit");
        expect(() => assertOwnership(unit, "p2", "Wrong owner")).toThrowError("Wrong owner");

        expect(() => assertMovesLeft(unit)).not.toThrow();
        expect(() => assertMovesLeft({ ...unit, movesLeft: 0 })).toThrowError("No moves left");
        expect(() => assertMovesLeft({ ...unit, movesLeft: -1 }, "No moves left to attack")).toThrowError("No moves left to attack");
    });

    it("asserts combat engagement state and adjacency", () => {
        const unit = makeUnit({ id: "u1", ownerId: "p1", coord: { q: 0, r: 0 }, type: UnitType.SpearGuard });

        expect(() => assertHasNotAttacked(unit)).not.toThrow();
        expect(() => assertHasNotAttacked({ ...unit, hasAttacked: true })).toThrowError("Already attacked");
        expect(() => assertHasNotAttacked({ ...unit, hasAttacked: true }, "Already attacked this turn")).toThrowError("Already attacked this turn");

        const origin = { q: 0, r: 0 };
        const adjacent = { q: 1, r: 0 };
        const distant = { q: 2, r: 0 };

        expect(() => assertAdjacent(origin, adjacent)).not.toThrow();
        expect(() => assertAdjacent(origin, distant)).toThrowError("Units must be adjacent");
        expect(() => assertAdjacent(origin, distant, "Can only move 1 tile at a time")).toThrowError("Can only move 1 tile at a time");
    });

    it("validates tile occupancy using shared helper", () => {
        const state = makeState();
        const target = state.map.tiles[0].coord;

        const mover = makeUnit({ id: "mover", ownerId: "p1", coord: { q: 1, r: 0 }, type: UnitType.SpearGuard });
        const participant: MoveParticipant = { unit: mover, stats: UNITS[mover.type] };

        expect(() => assertTileCanBeOccupied(state, target, [participant], "p1")).not.toThrow();

        state.units.push(makeUnit({ id: "blocker", ownerId: "p1", coord: target, type: UnitType.SpearGuard }));
        expect(() => assertTileCanBeOccupied(state, target, [participant], "p1")).toThrowError("Tile occupied by military unit");
    });

    it("respects peacetime territory restrictions", () => {
        const state = makeState();
        const targetTile = state.map.tiles[1];
        targetTile.ownerId = "p2";

        // Add visibility so peacetime restriction applies (only enforced for visible tiles)
        state.visibility.p1 = ["1,0"];

        const mover = makeUnit({ id: "mover", ownerId: "p1", coord: { q: 0, r: 0 }, type: UnitType.SpearGuard });
        const participant: MoveParticipant = { unit: mover, stats: UNITS[mover.type] };

        expect(() => assertTileCanBeOccupied(state, targetTile.coord, [participant], "p1")).toThrowError("Cannot enter enemy territory during peacetime");
    });
});
