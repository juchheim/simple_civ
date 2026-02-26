import { describe, expect, it } from "vitest";
import { applyAction } from "./turn-loop.js";
import { DiplomacyState, EraId, GameState, PlayerPhase, TerrainType, UnitState, UnitType } from "../core/types.js";

function createTestState(): GameState {
    return {
        id: "disband-test",
        turn: 3,
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "#ff0000",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Primitive,
                treasury: 5,
            },
            {
                id: "p2",
                civName: "RiverLeague",
                color: "#00aaff",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Primitive,
                treasury: 5,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 4,
            height: 4,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 3, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            ],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: { p1: [], p2: [] },
        revealed: { p1: [], p2: [] },
        diplomacy: { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } },
        sharedVision: {},
        contacts: { p1: {}, p2: {} },
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

function unit(
    id: string,
    ownerId: string,
    type: UnitType,
    coord: { q: number; r: number },
    overrides: Partial<GameState["units"][number]> = {}
): GameState["units"][number] {
    return {
        id,
        ownerId,
        type,
        coord,
        hp: 10,
        maxHp: 10,
        movesLeft: 2,
        state: UnitState.Normal,
        hasAttacked: false,
        ...overrides,
    };
}

describe("Disband Unit", () => {
    it("disbands the selected unit and safely unlinks partner", () => {
        const state = createTestState();
        state.units = [
            unit("escort", "p1", UnitType.SpearGuard, { q: 0, r: 0 }, { linkedUnitId: "settler" }),
            unit("settler", "p1", UnitType.Settler, { q: 0, r: 0 }, { linkedUnitId: "escort" }),
        ];

        const next = applyAction(state, { type: "DisbandUnit", playerId: "p1", unitId: "escort" });
        const remainingSettler = next.units.find(u => u.id === "settler");

        expect(next.units.find(u => u.id === "escort")).toBeUndefined();
        expect(remainingSettler).toBeTruthy();
        expect(remainingSettler?.linkedUnitId).toBeUndefined();
    });

    it("rejects disbanding units the player does not own", () => {
        const state = createTestState();
        state.units = [unit("enemy", "p2", UnitType.SpearGuard, { q: 1, r: 0 })];

        expect(() => applyAction(state, { type: "DisbandUnit", playerId: "p1", unitId: "enemy" })).toThrow(/Not your unit/i);
    });

    it("refreshes economy snapshot after disbanding military units", () => {
        const state = createTestState();
        state.units = [
            unit("u1", "p1", UnitType.SpearGuard, { q: 0, r: 0 }),
            unit("u2", "p1", UnitType.BowGuard, { q: 1, r: 0 }),
            unit("u3", "p1", UnitType.Riders, { q: 2, r: 0 }),
        ];

        const next = applyAction(state, { type: "DisbandUnit", playerId: "p1", unitId: "u1" });
        const player = next.players.find(p => p.id === "p1");

        expect(player?.usedSupply).toBe(2);
        expect(player?.freeSupply).toBe(1);
        expect(player?.militaryUpkeep).toBe(3);
        expect(player?.netGold).toBe(-3);
    });
});
