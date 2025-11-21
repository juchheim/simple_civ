import { describe, it, expect } from "vitest";
import { generateWorld } from "./map-generator";
import { TerrainType, UnitType } from "../core/types";

describe("World Generation", () => {
    it("should generate a map with correct dimensions", () => {
        const state = generateWorld({
            mapSize: "Small",
            players: [{ id: "p1", civName: "Civ A", color: "red" }],
        });

        expect(state.map.width).toBe(16);
        expect(state.map.height).toBe(12);
        expect(state.map.tiles.length).toBe(16 * 12);
    });

    it("should place players with starting units", () => {
        const state = generateWorld({
            mapSize: "Small",
            players: [
                { id: "p1", civName: "Civ A", color: "red" },
                { id: "p2", civName: "Civ B", color: "blue" },
            ],
        });

        expect(state.players.length).toBe(2);
        expect(state.units.length).toBe(4); // 2 units per player

        const p1Units = state.units.filter((u) => u.ownerId === "p1");
        expect(p1Units).toHaveLength(2);
        expect(p1Units.some((u) => u.type === UnitType.Settler)).toBe(true);
        expect(p1Units.some((u) => u.type === UnitType.Scout)).toBe(true);
    });

    it("should ensure starting positions are on valid terrain", () => {
        const state = generateWorld({
            mapSize: "Standard",
            players: [{ id: "p1", civName: "Civ A", color: "red" }],
        });

        const settler = state.units.find((u) => u.type === UnitType.Settler);
        expect(settler).toBeDefined();

        const tile = state.map.tiles.find(
            (t) => t.coord.q === settler!.coord.q && t.coord.r === settler!.coord.r
        );
        expect(tile).toBeDefined();
        expect(tile!.terrain).not.toBe(TerrainType.DeepSea);
        expect(tile!.terrain).not.toBe(TerrainType.Mountain);
        expect(tile!.terrain).not.toBe(TerrainType.Coast);
    });
});
