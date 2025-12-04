import { describe, it, expect } from "vitest";
import { processAutoExplore } from "./actions/unit-automation.js";
import { GameState, HexCoord, PlayerPhase, TerrainType, UnitState, UnitType } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { hexToString } from "../core/hex.js";

const hex = (q: number, r: number): HexCoord => ({ q, r });

function baseState(): GameState {
    return {
        id: "g",
        turn: 1,
        players: [
            { id: "p1", civName: "Test", color: "#000", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 3,
            height: 3,
            tiles: [],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };
}

describe("processAutoExplore", () => {
    it("picks the nearest reachable unexplored tile and ignores impassable tiles", () => {
        const state = baseState();
        const start = hex(0, 0);
        const reachable = hex(1, 0);
        const water = hex(0, 1); // unreachable for land units

        state.map.tiles = [
            { coord: start, terrain: TerrainType.Plains, overlays: [] },
            { coord: reachable, terrain: TerrainType.Plains, overlays: [] },
            { coord: water, terrain: TerrainType.DeepSea, overlays: [] },
        ] as any;

        state.revealed["p1"] = [hexToString(start)];

        const scout = {
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: start,
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: UNITS[UnitType.SpearGuard].move,
            state: UnitState.Normal,
            hasAttacked: false,
            isAutoExploring: true,
        };

        state.units.push(scout as any);

        processAutoExplore(state, "p1", scout.id);

        expect(scout.autoMoveTarget).toEqual(reachable);
    });

    it("stops auto-exploring when no reachable unexplored tiles exist", () => {
        const state = baseState();
        const start = hex(0, 0);
        const mountain = hex(1, 0); // impassable

        state.map.tiles = [
            { coord: start, terrain: TerrainType.Plains, overlays: [] },
            { coord: mountain, terrain: TerrainType.Mountain, overlays: [] },
        ] as any;

        state.revealed["p1"] = [hexToString(start)];
        state.visibility["p1"] = [hexToString(start), hexToString(mountain)]; // ensure mountain is known impassable

        const scout = {
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: start,
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: UNITS[UnitType.SpearGuard].move,
            state: UnitState.Normal,
            hasAttacked: false,
            isAutoExploring: true,
        };

        state.units.push(scout as any);

        processAutoExplore(state, "p1", scout.id);

        expect(scout.autoMoveTarget).toBeUndefined();
        expect(scout.isAutoExploring).toBe(false);
    });
});
