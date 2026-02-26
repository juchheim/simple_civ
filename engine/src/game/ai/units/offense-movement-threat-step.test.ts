import { describe, expect, it } from "vitest";
import { DiplomacyState, PlayerPhase, TerrainType, UnitType } from "../../../core/types.js";
import { attemptMoveAlongPath } from "./offense-movement-threat-step.js";

function hex(q: number, r: number) {
    return { q, r };
}

function tile(coord: { q: number; r: number }, terrain: TerrainType = TerrainType.Plains) {
    return { coord, terrain, overlays: [] as any[] };
}

function baseState() {
    return {
        id: "g",
        turn: 1,
        players: [
            { id: "p", civName: "ForgeClans", isEliminated: false },
            { id: "e", civName: "RiverLeague", isEliminated: false },
        ] as any,
        currentPlayerId: "p",
        phase: PlayerPhase.Planning,
        map: { width: 6, height: 6, tiles: [] as any[], rivers: [] as any[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: { p: [] as string[] },
        revealed: { p: [] as string[] },
        diplomacy: { p: { e: DiplomacyState.War }, e: { p: DiplomacyState.War } } as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

describe("offense movement threat step", () => {
    it("returns unchanged when path is empty", () => {
        const state = baseState();
        const unit = { id: "u", ownerId: "p", type: UnitType.BowGuard, coord: hex(0, 0), movesLeft: 1 } as any;
        const result = attemptMoveAlongPath({
            state: state as any,
            playerId: "p",
            unit,
            target: { coord: hex(2, 0), name: "Target", hp: 10, maxHp: 20 },
            path: [],
            rangedIds: new Set([unit.id]),
            armyUnits: [unit],
            warTargetIds: ["e"],
            isInWarProsecutionMode: false,
        });
        expect(result.state).toBe(state);
        expect(result.moved).toBe(false);
    });

    it("holds ranged unit in supported firing range", () => {
        const state = baseState();
        state.map.tiles = [tile(hex(0, 0)), tile(hex(1, 0)), tile(hex(2, 0))];
        const unit = { id: "u1", ownerId: "p", type: UnitType.BowGuard, coord: hex(0, 0), movesLeft: 1 } as any;
        const ally = { id: "u2", ownerId: "p", type: UnitType.SpearGuard, coord: hex(0, 1), movesLeft: 1 } as any;
        const result = attemptMoveAlongPath({
            state: state as any,
            playerId: "p",
            unit,
            target: { coord: hex(2, 0), name: "TargetCity", hp: 20, maxHp: 20 },
            path: [hex(1, 0)],
            rangedIds: new Set([unit.id]),
            armyUnits: [unit, ally],
            warTargetIds: ["e"],
            isInWarProsecutionMode: false,
        });
        expect(result.moved).toBe(true);
        expect(result.state).toBe(state);
    });
});
