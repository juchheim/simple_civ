import { describe, expect, it } from "vitest";
import { PlayerPhase, TerrainType, UnitState, UnitType } from "../../../core/types.js";
import { computePathToTarget } from "./offense-movement-pathing.js";

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
        players: [{ id: "p", civName: "ForgeClans", isEliminated: false }] as any,
        currentPlayerId: "p",
        phase: PlayerPhase.Planning,
        map: { width: 6, height: 6, tiles: [] as any[], rivers: [] as any[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: { p: [] as string[] },
        revealed: { p: [] as string[] },
        diplomacy: { p: {} } as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

describe("offense movement pathing", () => {
    it("returns direct path when target is reachable", () => {
        const state = baseState();
        state.map.tiles = [tile(hex(0, 0)), tile(hex(1, 0)), tile(hex(2, 0))];
        const unit = {
            id: "u",
            ownerId: "p",
            type: UnitType.SpearGuard,
            coord: hex(0, 0),
            state: UnitState.Normal,
            movesLeft: 1,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
            hasActed: false,
            fortifyTurns: 0,
            visibilityRange: 2,
        } as any;
        const target = { coord: hex(2, 0), name: "EnemyCity", hp: 10, maxHp: 20 };
        const path = computePathToTarget(state as any, unit, target);
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]).toEqual(hex(1, 0));
    });

    it("falls back to adjacent-target path when target tile is blocked", () => {
        const state = baseState();
        state.map.tiles = [
            tile(hex(0, 0)),
            tile(hex(1, 0)),
            tile(hex(2, 0), TerrainType.Mountain), // blocked target tile
            tile(hex(2, -1)),
        ];
        const unit = {
            id: "u",
            ownerId: "p",
            type: UnitType.SpearGuard,
            coord: hex(0, 0),
            state: UnitState.Normal,
            movesLeft: 1,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
            hasActed: false,
            fortifyTurns: 0,
            visibilityRange: 2,
        } as any;
        const target = { coord: hex(2, 0), name: "BlockedCity", hp: 10, maxHp: 20 };
        const path = computePathToTarget(state as any, unit, target);
        expect(path.length).toBeGreaterThan(0);
        expect(path[0]).toEqual(hex(1, 0));
    });
});
