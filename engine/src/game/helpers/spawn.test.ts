import { describe, expect, it } from "vitest";
import { findSpawnCoord, generateUnitId } from "./spawn.js";
import { City, GameState, HexCoord, PlayerPhase, TerrainType, UnitState, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";

function makeState(): GameState {
    return {
        id: "s",
        turn: 1,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: { width: 3, height: 3, tiles: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: { p1: {}, p2: {} } as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [],
    };
}

function makeTile(coord: HexCoord, terrain: TerrainType, ownerId?: string) {
    return { coord, terrain, overlays: [], ownerId };
}

function makeCity(coord: HexCoord, ownerId: string): City {
    return {
        id: "c1",
        name: "City",
        ownerId,
        coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 10,
        maxHp: 10,
        isCapital: true,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

describe("spawn helpers", () => {
    it("advances seed and builds unit ids matching current formulas", () => {
        const state = makeState();
        state.seed = 1;
        const idNoLabel = generateUnitId(state, "p1", undefined, 1000);
        // rand = floor(1 * 10000) = 10000, seed becomes 58_598
        expect(idNoLabel).toBe("u_p1_1000_10000");
        expect(state.seed).toBe(58598);

        const idWithLabel = generateUnitId(state, "p2", "titan", 2000);
        // rand uses updated seed
        expect(idWithLabel.startsWith("u_p2_titan_2000_")).toBe(true);
        expect(state.seed).toBe((58598 * 9301 + 49297) % 233280);
    });

    it("finds nearest valid spawn respecting domain and occupancy", () => {
        const state = makeState();
        state.map.tiles = [
            makeTile({ q: 0, r: 0 }, TerrainType.Plains),
            makeTile({ q: 1, r: 0 }, TerrainType.Coast),
            makeTile({ q: 0, r: 1 }, TerrainType.Plains),
        ];
        const city = makeCity({ q: 0, r: 0 }, "p1");
        state.cities.push(city);

        // Occupy the immediate land neighbor to force next choice
        state.units.push({
            id: "blocker",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const landSpawn = findSpawnCoord(state, city, UnitType.SpearGuard, 1);
        expect(landSpawn).toEqual({ q: 0, r: 0 }); // falls back to city because nearest land is occupied

        const navalSpawn = findSpawnCoord(state, city, UnitType.RiverBoat, 1);
        expect(navalSpawn).toEqual({ q: 1, r: 0 }); // picks coast tile for naval unit
    });

    it("falls back to city center when no free tiles exist", () => {
        const state = makeState();
        state.map.tiles = [
            makeTile({ q: 0, r: 0 }, TerrainType.Plains),
            makeTile({ q: 1, r: 0 }, TerrainType.Plains),
        ];
        const city = makeCity({ q: 0, r: 0 }, "p1");
        state.cities.push(city);
        state.units.push({
            id: "blocker",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 1, r: 0 },
            hp: UNITS[UnitType.SpearGuard].hp,
            maxHp: UNITS[UnitType.SpearGuard].hp,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const spawn = findSpawnCoord(state, city, UnitType.SpearGuard, 1);
        expect(spawn).toEqual(city.coord);
    });
});
