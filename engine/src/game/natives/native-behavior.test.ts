import { describe, it, expect, beforeEach } from "vitest";
import { clearNativeCamp, processNativeTurn } from "./native-behavior.js";
import { GameState, PlayerPhase, OverlayType, TerrainType, UnitState, UnitType } from "../../core/types.js";
import { CITY_NAMES, NATIVE_CAMP_CLEAR_PRODUCTION_REWARD } from "../../core/constants.js";

describe("Native camp conversion", () => {
    const campCoord = { q: 0, r: 0 };
    const playerId = "p1";
    const civName = "ForgeClans";
    let state: GameState;

    beforeEach(() => {
        state = {
            id: "test",
            turn: 1,
            players: [{ id: playerId, civName, color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false }],
            currentPlayerId: playerId,
            phase: PlayerPhase.Action,
            map: { width: 5, height: 5, tiles: [{ coord: campCoord, terrain: TerrainType.Plains, overlays: [OverlayType.NativeCamp] }] },
            units: [],
            cities: [],
            seed: 42,
            visibility: {},
            revealed: {},
            diplomacy: {},
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
            usedCityNames: [],
            nativeCamps: [{ id: "camp-1", coord: campCoord, state: "Patrol", aggroTurnsRemaining: 0 }],
        } as unknown as GameState;
    });

    it("creates a city for the capturing player when a camp is cleared", () => {
        clearNativeCamp(state, "camp-1", playerId);

        expect(state.nativeCamps).toHaveLength(0);
        expect(state.cities).toHaveLength(1);
        const city = state.cities[0];
        expect(city.ownerId).toBe(playerId);
        expect(city.coord).toEqual(campCoord);
        expect(city.storedProduction).toBe(NATIVE_CAMP_CLEAR_PRODUCTION_REWARD);
        expect(state.usedCityNames).toContain(city.name);
        expect(state.players[0].hasFoundedFirstCity).toBe(true);

        const campTile = state.map.tiles[0];
        expect(campTile.hasCityCenter).toBe(true);
        expect(campTile.overlays).not.toContain(OverlayType.NativeCamp);
        expect(campTile.overlays).not.toContain(OverlayType.ClearedSettlement);
    });

    it("respects used city names when converting a camp", () => {
        const allNames = CITY_NAMES[civName];
        const lastName = allNames[allNames.length - 1];
        state.usedCityNames = allNames.slice(0, allNames.length - 1);

        clearNativeCamp(state, "camp-1", playerId);

        expect(state.cities[0].name).toBe(lastName);
        expect(state.usedCityNames).toContain(lastName);
    });
});

describe("Native camp city interaction", () => {
    const campCoord = { q: 0, r: 0 };
    const cityCoord = { q: 1, r: 0 };
    let state: GameState;

    beforeEach(() => {
        state = {
            id: "native-city-test",
            turn: 1,
            players: [{ id: "p1", civName: "ForgeClans", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false }],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: {
                width: 5,
                height: 5,
                tiles: [
                    { coord: campCoord, terrain: TerrainType.Plains, overlays: [OverlayType.NativeCamp] },
                    { coord: cityCoord, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true, ownerId: "p1", ownerCityId: "c1" },
                    { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                ],
            },
            units: [],
            cities: [
                {
                    id: "c1",
                    name: "CityOne",
                    ownerId: "p1",
                    coord: cityCoord,
                    pop: 1,
                    storedFood: 0,
                    storedProduction: 0,
                    buildings: [],
                    workedTiles: [cityCoord],
                    currentBuild: null,
                    buildProgress: 0,
                    hp: 20,
                    maxHp: 20,
                    isCapital: true,
                    hasFiredThisTurn: false,
                    milestones: [],
                },
            ],
            seed: 42,
            visibility: {},
            revealed: {},
            diplomacy: {},
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
            nativeCamps: [{ id: "camp-1", coord: campCoord, state: "Aggro", aggroTurnsRemaining: 1 }],
        } as unknown as GameState;
    });

    it("drops back to patrol when only nearby unit is garrisoned in a city", () => {
        state.units.push(
            {
                id: "native-1",
                type: UnitType.NativeChampion,
                ownerId: "natives",
                coord: campCoord,
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
            {
                id: "garrison-1",
                type: UnitType.SpearGuard,
                ownerId: "p1",
                coord: cityCoord,
                hp: 10,
                maxHp: 10,
                movesLeft: 0,
                state: UnitState.Garrisoned,
                hasAttacked: false,
            }
        );

        processNativeTurn(state);

        expect(state.nativeCamps[0].state).toBe("Patrol");
    });

    it("does not step onto city-center tiles while chasing a target", () => {
        state.nativeCamps[0].aggroTurnsRemaining = 3;
        state.units.push(
            {
                id: "native-1",
                type: UnitType.NativeChampion,
                ownerId: "natives",
                coord: campCoord,
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
            {
                id: "scout-1",
                type: UnitType.Scout,
                ownerId: "p1",
                coord: { q: 2, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            }
        );

        processNativeTurn(state);

        const nativeUnit = state.units.find(u => u.id === "native-1");
        expect(nativeUnit?.coord).toEqual(campCoord);
    });
});
