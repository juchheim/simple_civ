import { describe, expect, it } from "vitest";
import { buildInfluenceMaps, clearInfluenceMapCache, getInfluenceMapsCached } from "./influence-map.js";
import { GameState, TerrainType, UnitState, UnitType } from "../../core/types.js";

function makeState(): GameState {
    const tiles = [];
    for (let r = 0; r < 3; r++) {
        for (let q = 0; q < 3; q++) {
            tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: [],
            });
        }
    }

    return {
        turn: 1,
        currentPlayerId: "p1",
        players: [
            { id: "p1", civName: "ForgeClans", techs: [], completedProjects: [], isEliminated: false },
            { id: "p2", civName: "ScholarKingdoms", techs: [], completedProjects: [], isEliminated: false },
        ],
        cities: [],
        units: [
            {
                id: "u1",
                ownerId: "p2",
                type: UnitType.SpearGuard,
                coord: { q: 1, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "u2",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 0, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ],
        map: {
            width: 3,
            height: 3,
            tiles,
        },
        visibility: {},
    } as GameState;
}

describe("Influence Maps", () => {
    it("should register enemy threat and friendly control near units", () => {
        const state = makeState();
        const maps = buildInfluenceMaps(state, "p1");

        expect(maps.threat.get({ q: 1, r: 1 })).toBeGreaterThan(0);
        expect(maps.control.get({ q: 0, r: 1 })).toBeGreaterThan(0);
    });

    it("should support time-sliced cached builds", () => {
        clearInfluenceMapCache();
        const state = makeState();

        const first = getInfluenceMapsCached(state, "p1", { budget: 1 });
        expect(first.complete).toBe(false);

        const second = getInfluenceMapsCached(state, "p1", { budget: 1000 });
        expect(second.complete).toBe(true);
        expect(second.maps).toBeTruthy();

        const full = buildInfluenceMaps(state, "p1");
        expect(second.maps?.threat.get({ q: 1, r: 1 })).toBeCloseTo(full.threat.get({ q: 1, r: 1 }));
        expect(second.maps?.control.get({ q: 0, r: 1 })).toBeCloseTo(full.control.get({ q: 0, r: 1 }));
    });

    it("should compute border/front/pressure near enemy cities", () => {
        const state = makeState();
        state.cities = [
            {
                id: "c1",
                name: "Enemy",
                ownerId: "p2",
                coord: { q: 2, r: 2 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 2, r: 2 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: false,
                hasFiredThisTurn: false,
                milestones: [],
                originalOwnerId: "p2",
            } as any,
        ];

        const maps = buildInfluenceMaps(state, "p1");
        expect(maps.border.get({ q: 2, r: 2 })).toBeGreaterThan(0);
        expect(maps.pressure.get({ q: 1, r: 1 })).toBeGreaterThan(0);
        expect(maps.front.get({ q: 1, r: 1 })).toBeGreaterThan(0);
    });
});
