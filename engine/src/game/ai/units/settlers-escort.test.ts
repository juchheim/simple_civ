import { describe, expect, it } from "vitest";
import { hexDistance } from "../../../core/hex.js";
import { DiplomacyState, PlayerPhase, TerrainType, UnitState, UnitType } from "../../../core/types.js";
import { manageSettlerEscorts, moveSettlersAndFound } from "./settlers.js";

function openTiles(radius = 6): any[] {
    const tiles: any[] = [];
    for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
            tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: [],
                hasCityCenter: false,
            });
        }
    }
    return tiles;
}

function baseState() {
    return {
        id: "test",
        turn: 20,
        players: [] as any[],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: { width: 20, height: 20, tiles: openTiles(), rivers: [] as any[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: { p1: [] as string[], p2: [] as string[] },
        revealed: { p1: [] as string[], p2: [] as string[] },
        diplomacy: {} as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

function unit(ownerId: string, id: string, type: UnitType, q: number, r: number): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 2,
        hasAttacked: false,
        state: UnitState.Normal,
    };
}

function city(ownerId: string, id: string, q: number, r: number): any {
    return {
        id,
        ownerId,
        name: id,
        coord: { q, r },
        pop: 2,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: id === "cap",
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function markCityTile(state: any, q: number, r: number, ownerId: string): void {
    const tile = state.map.tiles.find((t: any) => t.coord.q === q && t.coord.r === r);
    if (!tile) return;
    tile.hasCityCenter = true;
    tile.ownerId = ownerId;
}

describe("settler escort and retreat behavior", () => {
    it("retreats an unescorted settler when enemy military is within 3 tiles", () => {
        const state = baseState();
        state.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "RiverLeague", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } } as any;
        state.cities = [
            city("p1", "cap", 0, 0),
            city("p1", "rear", -3, 0),
        ];
        markCityTile(state, 0, 0, "p1");
        markCityTile(state, -3, 0, "p1");
        state.units = [
            unit("p1", "settler", UnitType.Settler, 2, 0),
            unit("p2", "enemy", UnitType.SpearGuard, 3, 0),
        ];

        const beforeDist = Math.min(
            hexDistance(state.units[0].coord, state.cities[0].coord),
            hexDistance(state.units[0].coord, state.cities[1].coord)
        );
        const after = moveSettlersAndFound(state as any, "p1");
        const liveSettler = after.units.find((u: any) => u.id === "settler");
        expect(liveSettler).toBeDefined();

        const afterDist = Math.min(
            hexDistance(liveSettler.coord, after.cities[0].coord),
            hexDistance(liveSettler.coord, after.cities[1].coord)
        );
        expect(afterDist).toBeLessThan(beforeDist);
    });

    it("keeps unescorted settlers waiting in city while regrouping", () => {
        const state = baseState();
        state.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "RiverLeague", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } } as any;
        state.cities = [
            city("p1", "cap", 0, 0),
            city("p1", "rear", -4, 0),
        ];
        markCityTile(state, 0, 0, "p1");
        markCityTile(state, -4, 0, "p1");
        state.units = [
            unit("p1", "settler", UnitType.Settler, 0, 0),
        ];

        const after = moveSettlersAndFound(state as any, "p1");
        const liveSettler = after.units.find((u: any) => u.id === "settler");
        expect(liveSettler.coord).toEqual({ q: 0, r: 0 });
        expect(after.cities).toHaveLength(2);
    });

    it("prefers idle escorts and leaves frontline units in place", () => {
        const state = baseState();
        state.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "RiverLeague", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } } as any;
        state.cities = [
            city("p2", "enemy-cap", 4, 0),
        ];
        markCityTile(state, 4, 0, "p2");
        state.units = [
            unit("p1", "settler", UnitType.Settler, 0, 0),
            unit("p1", "frontline", UnitType.SpearGuard, 2, 0),
            unit("p1", "idle", UnitType.SpearGuard, -2, 0),
            unit("p2", "enemy", UnitType.SpearGuard, 3, 0),
        ];

        const beforeFrontline = { ...state.units.find((u: any) => u.id === "frontline").coord };
        const beforeIdleDist = hexDistance(
            state.units.find((u: any) => u.id === "idle").coord,
            state.units.find((u: any) => u.id === "settler").coord
        );

        const after = manageSettlerEscorts(state as any, "p1");
        const frontline = after.units.find((u: any) => u.id === "frontline");
        const idle = after.units.find((u: any) => u.id === "idle");
        const settler = after.units.find((u: any) => u.id === "settler");

        expect(frontline.coord).toEqual(beforeFrontline);
        expect(hexDistance(idle.coord, settler.coord)).toBeLessThan(beforeIdleDist);
    });

    it("does not exempt newly produced solo settlers from escort requirements", () => {
        const state = baseState();
        state.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "RiverLeague", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } } as any;
        state.cities = [
            city("p1", "cap", 0, 0),
        ];
        markCityTile(state, 0, 0, "p1");
        state.units = [
            unit("p1", "u_p1_new_settler", UnitType.Settler, 0, 0),
        ];

        const after = moveSettlersAndFound(state as any, "p1");
        const liveSettler = after.units.find((u: any) => u.id === "u_p1_new_settler");
        expect(liveSettler).toBeDefined();
        expect(liveSettler.coord).toEqual({ q: 0, r: 0 });
    });

    it("keeps produced settlers in-city until escort is linked even if escort is adjacent", () => {
        const state = baseState();
        state.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "RiverLeague", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } } as any;
        state.cities = [
            city("p1", "cap", 0, 0),
        ];
        markCityTile(state, 0, 0, "p1");
        state.units = [
            unit("p1", "u_p1_new_settler", UnitType.Settler, 0, 0),
            unit("p1", "escort-nearby", UnitType.SpearGuard, 1, 0),
        ];

        const after = moveSettlersAndFound(state as any, "p1");
        const liveSettler = after.units.find((u: any) => u.id === "u_p1_new_settler");
        expect(liveSettler).toBeDefined();
        expect(liveSettler.coord).toEqual({ q: 0, r: 0 });
    });

    it("keeps the starting settler exemption active when no military exists", () => {
        const state = baseState();
        state.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "RiverLeague", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } } as any;
        state.cities = [
            city("p1", "cap", 0, 0),
        ];
        markCityTile(state, 0, 0, "p1");
        state.units = [
            unit("p1", "u_p1_settler", UnitType.Settler, 0, 0),
        ];

        const after = moveSettlersAndFound(state as any, "p1");
        const liveSettler = after.units.find((u: any) => u.id === "u_p1_settler");
        if (liveSettler) {
            expect(liveSettler.coord).not.toEqual({ q: 0, r: 0 });
        } else {
            expect(after.cities.length).toBeGreaterThan(1);
        }
    });
});
