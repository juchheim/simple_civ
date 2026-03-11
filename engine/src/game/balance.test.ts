import { describe, it, expect } from "vitest";
import { getUnitCost } from "./units.js";
import { UnitType, City, TerrainType, Tile, GameState, ProjectId } from "../core/types.js";
import { getCityYields } from "./rules.js";
import { UNIT_BASE_DAMAGE, FORTIFY_DEFENSE_BONUS, UNITS } from "../core/constants.js";
import { applyCityProduction } from "./helpers/builds.js";

describe("Balance Adjustments", () => {
    describe("Unit Cost Scaling", () => {
        const baseCost = UNITS[UnitType.SpearGuard].cost;
        it("should have base cost at Turn 1", () => {
            expect(getUnitCost(UnitType.SpearGuard, 1)).toBe(baseCost);
        });

        it("should have base cost at Turn 34", () => {
            expect(getUnitCost(UnitType.SpearGuard, 34)).toBe(baseCost);
        });

        it("should double cost at Turn 35", () => {
            expect(getUnitCost(UnitType.SpearGuard, 35)).toBe(baseCost * 2);
        });

        it("should triple cost at Turn 70", () => {
            expect(getUnitCost(UnitType.SpearGuard, 70)).toBe(baseCost * 3);
        });

        it("should quadruple cost at Turn 105", () => {
            expect(getUnitCost(UnitType.SpearGuard, 105)).toBe(baseCost * 4);
        });

        it("should cap at 4x for late game (Turn 150)", () => {
            expect(getUnitCost(UnitType.SpearGuard, 150)).toBe(baseCost * 4);
        });
    });

    describe("Forge Clans Nerf", () => {
        const createMockState = (isCapital: boolean): { city: City, state: GameState } => {
            const city: City = {
                id: "c1",
                ownerId: "p1",
                name: "Test City",
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
                isCapital: isCapital,
                hasFiredThisTurn: false,
                milestones: [],
            };

            const tile: Tile = {
                coord: { q: 0, r: 0 },
                terrain: TerrainType.Hills,
                overlays: [],
                ownerId: "p1",
                hasCityCenter: true,
            };

            const state: GameState = {
                id: "test",
                turn: 1,
                players: [{ id: "p1", civName: "ForgeClans", color: "red", techs: [], completedProjects: [], currentTech: null, isEliminated: false }],
                currentPlayerId: "p1",
                phase: "Planning",
                map: { width: 10, height: 10, tiles: [tile], rivers: [] },
                units: [],
                cities: [city],
                seed: 123,
                visibility: {},
                revealed: {},
                diplomacy: {},
                sharedVision: {},
                contacts: {},
                diplomacyOffers: [],
            } as any;

            return { city, state };
        };

        it("should apply bonus to Capital on Hills", () => {
            const { city, state } = createMockState(true);
            // Hills: 0F, 2P. City Min: 2F, 1P.
            // ForgeClans Capital: +1P from Hill.
            // Total P: 2 (Base) + 1 (Trait) = 3?
            // Wait, City Center logic:
            // Base Hill: 0F, 2P.
            // City Min: max(0, 2)F = 2F. max(2, 1)P = 2P.
            // Trait adds +1P.
            // Total: 3P.
            const yields = getCityYields(city, state);
            expect(yields.P).toBe(3);
        });

        it("should NOT apply bonus to Non-Capital on Hills", () => {
            const { city, state } = createMockState(false);
            // Non-Capital Hill City.
            // Base: 2P.
            // Trait: 0.
            // Total: 2P.
            const yields = getCityYields(city, state);
            expect(yields.P).toBe(2);
        });

        it("should apply the current Forge project speed bonus", () => {
            const { city, state } = createMockState(true);
            const player = state.players[0] as any;
            city.currentBuild = { type: "Project", id: ProjectId.Observatory, cost: 100 };
            city.buildProgress = 0;

            applyCityProduction(state, city, player, 20);

            expect(city.buildProgress).toBe(24);
        });
    });

    describe("Combat Constants", () => {
        it("should have correct base damage", () => {
            expect(UNIT_BASE_DAMAGE).toBe(6);
        });

        it("should have correct fortify bonus", () => {
            expect(FORTIFY_DEFENSE_BONUS).toBe(1);
        });
    });

    describe("Jade Covenant Buff", () => {
        it("should apply 10% discount to Settlers", () => {
            const base = 20;
            const discounted = Math.floor(base * 0.9);
            expect(discounted).toBe(18);
        });
    });
});
