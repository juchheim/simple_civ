import { describe, it, expect } from "vitest";
import { GameState, PlayerPhase, TerrainType, UnitType, UnitState, DiplomacyState } from "../core/types.js";
import { claimCityTerritory } from "./helpers/cities.js";
import { UNITS } from "../core/constants.js";

const hex = (q: number, r: number) => ({ q, r });

function baseState(): GameState {
    return {
        id: "g",
        turn: 1,
        players: [
            { id: "owner", civName: "OwnerCiv", color: "#000", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "peaceful_intruder", civName: "Intruder", color: "#111", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "owner",
        phase: PlayerPhase.Planning,
        map: {
            width: 5,
            height: 5,
            tiles: [
                { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner", hasCityCenter: true, ownerCityId: "c1" },
                { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [], ownerId: undefined }, // Target for expansion
                { coord: hex(2, 0), terrain: TerrainType.Plains, overlays: [], ownerId: undefined }, // Safe tile
            ],
            rivers: [],
        },
        units: [],
        cities: [
            {
                id: "c1",
                name: "Capital",
                ownerId: "owner",
                coord: hex(0, 0),
                pop: 1,
                buildings: [],
                workedTiles: [],
                milestones: [],
            }
        ],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {
            "owner": { "peaceful_intruder": DiplomacyState.Peace },
            "peaceful_intruder": { "owner": DiplomacyState.Peace },
        },
        sharedVision: {},
        contacts: {
            "owner": { "peaceful_intruder": true },
            "peaceful_intruder": { "owner": true },
        },
        diplomacyOffers: [],
    };
}

describe("Territory Expansion Expulsion", () => {
    it("expels units when territory expands over them during peace", () => {
        const state = baseState();
        const intruder = {
            id: "intruder",
            type: UnitType.SpearGuard,
            ownerId: "peaceful_intruder",
            coord: hex(1, 0), // Standing on the tile that will be claimed
            hp: 10,
            maxHp: 10,
            movesLeft: 2,
            state: UnitState.Normal,
            hasAttacked: false,
        };
        state.units.push(intruder as any);

        const city = state.cities[0];
        // Claim ring 1 (includes hex(1,0))
        // This simulates population growth or initial founding expansion
        claimCityTerritory(city as any, state as any, "owner", 1);

        // Expectation: The unit should be expelled to (2,0) or another safe tile
        // because it is now inside "owner"'s territory and they are at peace.

        // Assert the tile was claimed
        const tile = state.map.tiles.find(t => t.coord.q === 1 && t.coord.r === 0);
        expect(tile?.ownerId).toBe("owner");

        // Assert the unit was expelled
        expect(intruder.coord).not.toEqual(hex(1, 0));
        // It should have moved to (2,0) which is adjacent and unowned
        expect(intruder.coord).toEqual(hex(2, 0));
    });
});
