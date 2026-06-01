import { describe, it, expect } from "vitest";
import { BUILDINGS, TITAN_REGEN_BASE, TITAN_REGEN_CITY, TITAN_REGEN_TERRITORY, UNITS } from "../core/constants.js";
import { startPlayerTurn } from "./turn-lifecycle.js";
import { BuildingType, EraId, GameState, PlayerPhase, TerrainType, UnitState, UnitType } from "../core/types.js";

function createTitanRegenState(overrides?: { tileOwnerId?: string; inCity?: boolean }): GameState {
    const state: GameState = {
        id: "test-game",
        turn: 1,
        players: [
            { id: "p1", civName: "AetherianVanguard", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false, hasFoundedFirstCity: true, currentEra: EraId.Hearth },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: { width: 3, height: 3, tiles: [] },
        units: [
            {
                id: "u1",
                type: UnitType.Titan,
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                hp: 10,
                maxHp: 35,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
            }
        ],
        cities: overrides?.inCity ? [{
            id: "c1",
            name: "Capital",
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
            hasFiredThisTurn: false,
            milestones: [],
        } as any] : [],
        seed: 123,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };

    for (let q = 0; q < 3; q++) {
        for (let r = 0; r < 3; r++) {
            state.map.tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: [],
                ownerId: q === 0 && r === 0 ? overrides?.tileOwnerId : undefined,
            } as any);
        }
    }

    return state;
}

describe("Titan Stats & Mechanics", () => {
    it("should have correct Titan stats (as defined in core/constants)", () => {
        const titan = UNITS[UnitType.Titan];
        expect(titan.def).toBe(12);
        expect(titan.hp).toBe(35);
        expect(titan.atk).toBe(13);
    });

    it("should keep Titan's Core expensive enough to delay the summon", () => {
        expect(BUILDINGS[BuildingType.TitansCore].cost).toBe(90);
    });

    it("should not regenerate in enemy or neutral territory", () => {
        const state = createTitanRegenState();
        startPlayerTurn(state, state.players[0]);
        expect(TITAN_REGEN_BASE).toBe(0);
        expect(state.units.find(u => u.id === "u1")?.hp).toBe(10);
    });

    it("should regenerate exactly 1 HP in friendly territory", () => {
        const state = createTitanRegenState({ tileOwnerId: "p1" });
        startPlayerTurn(state, state.players[0]);
        expect(TITAN_REGEN_TERRITORY).toBe(1);
        expect(state.units.find(u => u.id === "u1")?.hp).toBe(11);
    });

    it("should regenerate exactly 3 HP in a friendly city", () => {
        const state = createTitanRegenState({ tileOwnerId: "p1", inCity: true });
        startPlayerTurn(state, state.players[0]);
        expect(TITAN_REGEN_CITY).toBe(3);
        expect(state.units.find(u => u.id === "u1")?.hp).toBe(13);
    });
});
