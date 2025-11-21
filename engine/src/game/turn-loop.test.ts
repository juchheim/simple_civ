import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop";
import { generateWorld } from "../map/map-generator";
import { Action, UnitType, UnitState, PlayerPhase, TechId, BuildingType } from "../core/types";
import { hexNeighbor } from "../core/hex";

describe("Turn Loop & Actions", () => {
    it("should allow moving a unit", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const unit = state.units.find(u => u.type === UnitType.Scout && u.ownerId === "p1");
        expect(unit).toBeDefined();

        const startCoord = unit!.coord;
        const targetCoord = hexNeighbor(startCoord, 0); // Neighbor 0

        // Ensure target is valid (not deep sea/mountain) for test stability
        // Map gen is random, but let's assume it's valid or mock map.
        // For this test, let's force the map tile to be Plains.
        const tile = state.map.tiles.find(t => t.coord.q === targetCoord.q && t.coord.r === targetCoord.r);
        if (tile) tile.terrain = "Plains" as any;

        const action: Action = {
            type: "MoveUnit",
            playerId: "p1",
            unitId: unit!.id,
            to: targetCoord,
        };

        const nextState = applyAction(state, action);
        const movedUnit = nextState.units.find(u => u.id === unit!.id);

        expect(movedUnit!.coord).toEqual(targetCoord);
        expect(movedUnit!.movesLeft).toBe(unit!.movesLeft - 1);
    });

    it("should allow founding a city", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const settler = state.units.find(u => u.type === UnitType.Settler && u.ownerId === "p1");

        // Force tile to be valid
        const tile = state.map.tiles.find(t => t.coord.q === settler!.coord.q && t.coord.r === settler!.coord.r);
        if (tile) tile.terrain = "Plains" as any;

        const action: Action = {
            type: "FoundCity",
            playerId: "p1",
            unitId: settler!.id,
            name: "Capital",
        };

        const nextState = applyAction(state, action);

        expect(nextState.cities.length).toBe(1);
        expect(nextState.cities[0].name).toBe("Capital");
        expect(nextState.units.find(u => u.id === settler!.id)).toBeUndefined(); // Consumed
    });

    it("should handle end turn and resource accumulation", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }, { id: "p2", civName: "B", color: "blue" }] });

        // Setup a city for p1
        state.cities.push({
            id: "c1",
            name: "City 1",
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 0, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
        });
        // Force tile yield
        const tile = state.map.tiles.find(t => t.coord.q === 0 && t.coord.r === 0);
        if (tile) tile.terrain = "Plains" as any; // 2F 1P min

        // P1 ends turn
        const action: Action = { type: "EndTurn", playerId: "p1" };
        const s2 = applyAction(state, action);

        expect(s2.currentPlayerId).toBe("p2");

        // P2 ends turn -> Back to P1 -> Start of Turn triggers for P1
        const action2: Action = { type: "EndTurn", playerId: "p2" };
        const s3 = applyAction(s2, action2);

        expect(s3.currentPlayerId).toBe("p1");
        expect(s3.turn).toBe(2);

        // Check P1 city yields applied
        // City should have +2 Food, +1 Prod
        const city = s3.cities.find(c => c.id === "c1");
        expect(city!.storedFood).toBe(2);
    });
});
