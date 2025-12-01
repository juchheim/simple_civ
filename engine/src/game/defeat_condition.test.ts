import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop";
import { generateWorld } from "../map/map-generator";
import { Action, UnitType } from "../core/types";

describe("Defeat Condition Bug", () => {
    it("should not declare a winner if an opponent has not founded a city yet but has a settler", () => {
        // Setup a game with 2 players
        const state = generateWorld({
            mapSize: "Small",
            players: [
                { id: "p1", civName: "A", color: "red" },
                { id: "p2", civName: "B", color: "blue" }
            ]
        });

        // P1 founds a city
        const p1Settler = state.units.find(u => u.type === UnitType.Settler && u.ownerId === "p1");
        expect(p1Settler).toBeDefined();

        // Force tile to be valid for P1
        const p1Tile = state.map.tiles.find(t => t.coord.q === p1Settler!.coord.q && t.coord.r === p1Settler!.coord.r);
        if (p1Tile) p1Tile.terrain = "Plains" as any;

        const foundCityAction: Action = {
            type: "FoundCity",
            playerId: "p1",
            unitId: p1Settler!.id,
            name: "Capital P1",
        };
        const stateAfterFounding = applyAction(state, foundCityAction);

        // P2 has a settler but NO city
        const p2Settler = stateAfterFounding.units.find(u => u.type === UnitType.Settler && u.ownerId === "p2");
        expect(p2Settler).toBeDefined();
        const p2City = stateAfterFounding.cities.find(c => c.ownerId === "p2");
        expect(p2City).toBeUndefined();

        // P1 ends turn
        const endTurnP1 = applyAction(stateAfterFounding, { type: "EndTurn", playerId: "p1" });

        // P2 ends turn WITHOUT founding
        const endTurnP2 = applyAction(endTurnP1, { type: "EndTurn", playerId: "p2" });

        // Check winner
        // BUG: P1 should NOT be the winner yet, because P2 is still alive and kicking (just nomadic)
        expect(endTurnP2.winnerId).toBeFalsy();
        expect(endTurnP2.players.find(p => p.id === "p2")?.isEliminated).toBe(false);
    });
});
