import { describe, it, expect } from "vitest";
import { getCityRushBuyDiscount, getCityYields, getGrowthCost, canBuild, getPlayerSupplyUsage, getRushBuyGoldCost } from "./rules";
import {
    BuildingType,
    City,
    OverlayType,
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

            // Plains: 1F, 1P, 0G. City Min: 2F, 1P, 1G. Base yields: +1S, +2G.
            // Total: 2F, 1P, 1S, 3G.
            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 1, S: 1, G: 3 });
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

            // Base: 2F, 1P, 1S, 3G. +1P from Workshop.
            // Total: 2F, 2P, 1S, 3G.
            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 2, S: 1, G: 3 });
        });

        it("applies reduced returns to additional gold buildings in the same city", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
            state.map.tiles = [
                {
                    coord: { q: 0, r: 0 },
                    terrain: TerrainType.Plains,
                    overlays: [],
                },
            ];

            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 6,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
            };

            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 1, S: 1, G: 9 });
        });

        it("heavily caps third and fourth gold buildings in the same city", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
            state.map.tiles = [
                {
                    coord: { q: 0, r: 0 },
                    terrain: TerrainType.Plains,
                    overlays: [],
                },
                {
                    coord: { q: 1, r: 0 },
                    terrain: TerrainType.Hills,
                    overlays: [OverlayType.OreVein],
                },
            ];

            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 6,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall, BuildingType.Bank, BuildingType.Exchange],
                workedTiles: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
            };

            const yields = getCityYields(city, state);
            expect(yields).toEqual({ F: 2, P: 4, S: 1, G: 13 });
        });

        it("spreads MarketHall gold to other TradingPost cities", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
            state.map.tiles = [
                {
                    coord: { q: 0, r: 0 },
                    terrain: TerrainType.Plains,
                    overlays: [],
                    ownerId: "p1",
                    ownerCityId: "c1",
                    hasCityCenter: true,
                },
                {
                    coord: { q: 3, r: 0 },
                    terrain: TerrainType.Plains,
                    overlays: [],
                    ownerId: "p1",
                    ownerCityId: "c2",
                    hasCityCenter: true,
                },
            ];

            const marketCity: City = {
                id: "c1",
                name: "Market",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 6,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
            };
            const spokeCity: City = {
                id: "c2",
                name: "Spoke",
                ownerId: "p1",
                coord: { q: 3, r: 0 },
                pop: 6,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost],
                workedTiles: [{ q: 3, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: false,
            };
            state.cities = [marketCity, spokeCity];

            const yields = getCityYields(spokeCity, state);
            expect(yields).toEqual({ F: 2, P: 1, S: 1, G: 8 });
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

        it("requires the prior gold-building tier before advancing the chain", () => {
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

            player.techs.push(TechId.Fieldcraft, TechId.Wellworks, TechId.UrbanPlans, TechId.SignalRelay);

            expect(canBuild(city, "Building", BuildingType.MarketHall, state)).toBe(false);
            city.buildings.push(BuildingType.TradingPost);
            expect(canBuild(city, "Building", BuildingType.MarketHall, state)).toBe(true);

            expect(canBuild(city, "Building", BuildingType.Bank, state)).toBe(false);
            city.buildings.push(BuildingType.MarketHall);
            expect(canBuild(city, "Building", BuildingType.Bank, state)).toBe(true);

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
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall, BuildingType.Bank],
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
        it("military supply relief starts at MarketHall instead of TradingPost", () => {
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
            expect(withoutEconomy.militaryUpkeep).toBe(9);

            city.buildings = [BuildingType.TradingPost];
            const withTradingPost = getPlayerSupplyUsage(state, "p1");
            expect(withTradingPost.freeSupply).toBe(2);
            expect(withTradingPost.militaryUpkeep).toBe(9);

            city.buildings = [BuildingType.TradingPost, BuildingType.MarketHall];
            const withMarketHall = getPlayerSupplyUsage(state, "p1");
            expect(withMarketHall.freeSupply).toBe(3);
            expect(withMarketHall.militaryUpkeep).toBe(6);
        });

        it("ScholarKingdoms receives a passive free supply bonus", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ScholarKingdoms", color: "red" }] });

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

            const scholarSupply = getPlayerSupplyUsage(state, "p1");
            expect(scholarSupply.freeSupply).toBe(4);
            expect(scholarSupply.militaryUpkeep).toBe(3);
        });
    });
});
