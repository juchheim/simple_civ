import { describe, it, expect, beforeEach } from "vitest";
import { clearNativeCamp } from "./native-behavior.js";
import { GameState, PlayerPhase, OverlayType, TerrainType } from "../../core/types.js";
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
