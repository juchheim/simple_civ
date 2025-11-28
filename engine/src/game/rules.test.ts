import { describe, it, expect } from "vitest";
import { getCityYields, getGrowthCost, canBuild } from "./rules";
import {
    BuildingType,
    City,
    TerrainType,
    Tile,
    TechId,
} from "../core/types";
import { generateWorld } from "../map/map-generator";

describe("Rules", () => {
    describe("Yields", () => {
        it("should calculate base city yields correctly", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
            const tile: Tile = {
                coord: { q: 0, r: 0 },
                terrain: TerrainType.Plains,
                overlays: [],
            };
            state.map.tiles = [tile];

            const city: City = {
                id: "c1",
                name: "City",
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
            };

            // Plains: 1F, 1P. City Min: 2F, 1P. Base Science: 1.
            // Total: 2F, 1P, 1S.
            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 1, S: 1 });
        });

        it("should apply building bonuses", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
            const tile: Tile = {
                coord: { q: 0, r: 0 },
                terrain: TerrainType.Plains,
                overlays: [],
            };
            state.map.tiles = [tile];

            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 1,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.StoneWorkshop], // +1P
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
            };

            // Base: 2F, 1P, 1S. +1P from Workshop.
            // Total: 2F, 2P, 1S.
            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 2, S: 1 });
        });
    });

    describe("Growth", () => {
        it("should calculate growth cost correctly", () => {
            // Pop 1 -> 2: 30
            expect(getGrowthCost(1, false)).toBe(30);

            // Pop 2 -> 3: 39
            expect(getGrowthCost(2, false)).toBe(39);

            // With Farmstead (Pop 1 -> 2): ceil(30 * 0.9) = 27
            expect(getGrowthCost(1, true)).toBe(27);
        });
    });

    describe("Build Requirements", () => {
        it("should check tech requirements for buildings", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
            const player = state.players[0];
            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 1,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
            };
            state.cities.push(city);

            // Farmstead requires Fieldcraft
            expect(canBuild(city, "Building", BuildingType.Farmstead, state)).toBe(false);

            player.techs.push(TechId.Fieldcraft);
            expect(canBuild(city, "Building", BuildingType.Farmstead, state)).toBe(true);
        });
    });
});
