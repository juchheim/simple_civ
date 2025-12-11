import { describe, it, expect } from "vitest";
import { expelUnitsFromTerritory } from "./helpers/movement.js";
import { GameState, PlayerPhase, TerrainType, UnitState, UnitType } from "../core/types.js";
import { UNITS } from "../core/constants.js";

const hex = (q: number, r: number) => ({ q, r });

function baseState(): GameState {
    return {
        id: "g",
        turn: 1,
        players: [
            { id: "owner", civName: "OwnerCiv", color: "#000", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "intruder", civName: "Intruder", color: "#111", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "owner",
        phase: PlayerPhase.Planning,
        map: {
            width: 3,
            height: 3,
            tiles: [
                { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner" },
                { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [], ownerId: undefined },
                { coord: hex(1, -1), terrain: TerrainType.Plains, overlays: [], ownerId: undefined },
            ],
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

describe("expelUnitsFromTerritory", () => {
    it("moves intruding units to the nearest passable, unowned, and unoccupied tile", () => {
        const state = baseState();
        const occupyingUnit = {
            id: "blocker",
            type: UnitType.SpearGuard,
            ownerId: "owner",
            coord: hex(1, 0),
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: UNITS[UnitType.SpearGuard].move,
            state: UnitState.Normal,
            hasAttacked: false,
        };
        const intruder = {
            id: "intruder-1",
            type: UnitType.SpearGuard,
            ownerId: "intruder",
            coord: hex(0, 0),
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: UNITS[UnitType.SpearGuard].move,
            state: UnitState.Normal,
            hasAttacked: false,
            isAutoExploring: true,
            autoMoveTarget: hex(2, 0),
        };

        state.units.push(occupyingUnit as any, intruder as any);

        expelUnitsFromTerritory(state, "intruder", "owner");

        expect(intruder.coord).toEqual(hex(1, -1)); // skips occupied (1,0) and picks next available neighbor
        expect(intruder.movesLeft).toBe(0);
        expect(intruder.isAutoExploring).toBe(false);
        expect(intruder.autoMoveTarget).toBeUndefined();
        expect(occupyingUnit.coord).toEqual(hex(1, 0)); // unchanged
    });

    it("moves unit 2+ hexes when surrounded by water and enemy territory", () => {
        // Setup: Unit at (0,0) which is enemy territory
        // Water tiles at (1,0) and (0,1) - impassable
        // More enemy territory at (-1,0), (-1,1), (0,-1), (1,-1)
        // Safe tile at (2,-1) - 2 hexes away
        const state = baseState();
        state.map.tiles = [
            { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner" },
            { coord: hex(1, 0), terrain: TerrainType.Coast, overlays: [], ownerId: undefined }, // Water
            { coord: hex(0, 1), terrain: TerrainType.Coast, overlays: [], ownerId: undefined }, // Water
            { coord: hex(-1, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner" },
            { coord: hex(-1, 1), terrain: TerrainType.Plains, overlays: [], ownerId: "owner" },
            { coord: hex(0, -1), terrain: TerrainType.Plains, overlays: [], ownerId: "owner" },
            { coord: hex(1, -1), terrain: TerrainType.Plains, overlays: [], ownerId: "owner" },
            // Safe tiles 2 hexes away (not owned by enemy)
            { coord: hex(2, -1), terrain: TerrainType.Plains, overlays: [], ownerId: undefined },
            { coord: hex(2, 0), terrain: TerrainType.Plains, overlays: [], ownerId: undefined },
            { coord: hex(2, -2), terrain: TerrainType.Plains, overlays: [], ownerId: undefined },
        ];

        const intruder = {
            id: "intruder-1",
            type: UnitType.SpearGuard,
            ownerId: "intruder",
            coord: hex(0, 0),
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: UNITS[UnitType.SpearGuard].move,
            state: UnitState.Normal,
            hasAttacked: false,
        };

        state.units.push(intruder as any);

        expelUnitsFromTerritory(state, "intruder", "owner");

        // Unit should be moved to a safe tile (2,-1), (2,0), or (2,-2) - the BFS should find it
        const isInSafeLocation =
            (intruder.coord.q === 2 && intruder.coord.r === -1) ||
            (intruder.coord.q === 2 && intruder.coord.r === 0) ||
            (intruder.coord.q === 2 && intruder.coord.r === -2);
        expect(isInSafeLocation).toBe(true);
        expect(intruder.movesLeft).toBe(0);
    });
});
