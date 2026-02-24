import { describe, it, expect } from "vitest";
import { getCityRushBuyDiscount, getCityYields, getGrowthCost, canBuild, getPlayerSupplyUsage, getRushBuyGoldCost } from "./rules";
import {
    BuildingType,
    City,
    TerrainType,
    Tile,
    TechId,
    UnitState,
    UnitType,
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

            // Plains: 1F, 1P, 0G. City Min: 2F, 1P, 1G. Base yields: +1S, +1G.
            // Total: 2F, 1P, 1S, 2G.
            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 1, S: 1, G: 2 });
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

            // Base: 2F, 1P, 1S, 2G. +1P from Workshop.
            // Total: 2F, 2P, 1S, 2G.
            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 2, S: 1, G: 2 });
        });
    });

    describe("Growth", () => {
        it("should calculate growth cost correctly", () => {
            // Pop 1 -> 2: 30
            expect(getGrowthCost(1, false)).toBe(30);

            // Pop 2 -> 3: 39
            expect(getGrowthCost(2, false)).toBe(41);

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

        it("requires Bank before Exchange and unlocks Exchange at SignalRelay", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
            const player = state.players[0];
            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 2,
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
            state.cities.push(city);

            player.techs.push(TechId.SignalRelay);
            expect(canBuild(city, "Building", BuildingType.Exchange, state)).toBe(false);

            city.buildings.push(BuildingType.Bank);
            expect(canBuild(city, "Building", BuildingType.Exchange, state)).toBe(true);
        });
    });

    describe("Rush-Buy Discounts", () => {
        it("uses the highest completed gold-building discount in a city", () => {
            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost, BuildingType.Bank],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
            };

            expect(getCityRushBuyDiscount(city)).toBe(15);
            expect(getRushBuyGoldCost(city, 20)).toBe(17);

            city.buildings.push(BuildingType.Exchange);
            expect(getCityRushBuyDiscount(city)).toBe(20);
            expect(getRushBuyGoldCost(city, 20)).toBe(16);
        });
    });

    describe("Supply Economy Dependency", () => {
        it("economic buildings increase free supply and lower military upkeep", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });

            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 2,
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
            state.cities = [city];

            state.units = Array.from({ length: 5 }, (_, i) => ({
                id: `u${i}`,
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: i, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            }));

            const withoutEconomy = getPlayerSupplyUsage(state, "p1");
            expect(withoutEconomy.freeSupply).toBe(2);
            expect(withoutEconomy.militaryUpkeep).toBe(6);

            city.buildings = [BuildingType.TradingPost];
            const withTradingPost = getPlayerSupplyUsage(state, "p1");
            expect(withTradingPost.freeSupply).toBe(3);
            expect(withTradingPost.militaryUpkeep).toBe(4);
        });
    });
});
