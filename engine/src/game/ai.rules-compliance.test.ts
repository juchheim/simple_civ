import { describe, it, expect } from "vitest";
import { hexEquals, hexToString } from "../core/hex.js";
import { DiplomacyState, PlayerPhase, TerrainType, UnitDomain, UnitType } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { runAiTurnSequence, runAiTurnSequenceWithTrace } from "./ai/turn-runner.js";
import { TraceEntry } from "./ai/trace.js";

function hex(q: number, r: number) {
    return { q, r };
}

function tile(coord: { q: number; r: number }, terrain: TerrainType = TerrainType.Plains) {
    return { coord, terrain, overlays: [], ownerId: undefined, hasCityCenter: false };
}

function baseState() {
    return {
        id: "g",
        turn: 1,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: { width: 8, height: 8, tiles: [] as any[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: {} as any,
        revealed: {} as any,
        diplomacy: {} as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

function makeAllVisible(state: any, playerIds: string[]) {
    const keys = state.map.tiles.map((t: any) => hexToString(t.coord));
    for (const pid of playerIds) {
        state.visibility[pid] = keys;
        state.revealed[pid] = keys;
    }
}

describe("ai rules compliance", () => {
    it("keeps AI actions within movement/stacking/terrain rules over multiple turns", () => {
        let state = baseState();
        state.players = [
            { id: "p1", techs: [], currentTech: null, completedProjects: [] },
            { id: "p2", techs: [], currentTech: null, completedProjects: [] },
        ] as any;
        state.diplomacy = {
            p1: { p2: DiplomacyState.War },
            p2: { p1: DiplomacyState.War },
        } as any;

        const coords: { q: number; r: number; terrain?: TerrainType }[] = [];
        for (let q = -2; q <= 4; q++) {
            for (let r = -2; r <= 4; r++) {
                const isCoast = (q + r) % 3 === 0;
                coords.push({ q, r, terrain: isCoast ? TerrainType.Coast : TerrainType.Plains });
            }
        }
        state.map.tiles = coords.map(c => tile(hex(c.q, c.r), c.terrain));
        state.map.width = 12;
        state.map.height = 12;

        state.cities = [
            { id: "c1", ownerId: "p1", coord: hex(-2, 0), hp: 20, maxHp: 20, buildings: [], isCapital: true },
            { id: "c2", ownerId: "p2", coord: hex(4, 0), hp: 20, maxHp: 20, buildings: [], isCapital: true },
        ] as any;

        state.units = [
            // p1 land/naval + garrison candidate adjacent to city
            { id: "p1m1", ownerId: "p1", type: UnitType.SpearGuard, coord: hex(-1, 0), hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: undefined },
            { id: "p1r1", ownerId: "p1", type: UnitType.BowGuard, coord: hex(-1, -1), hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: undefined },
            { id: "p1boat", ownerId: "p1", type: UnitType.RiverBoat, coord: hex(-2, 1), hp: 10, maxHp: 10, movesLeft: 3, hasAttacked: false, state: undefined },
            { id: "p1garrison", ownerId: "p1", type: UnitType.SpearGuard, coord: hex(-2, -1), hp: 6, maxHp: 10, movesLeft: 2, hasAttacked: false, state: undefined },
            // p2 land/naval
            { id: "p2boat", ownerId: "p2", type: UnitType.RiverBoat, coord: hex(4, -1), hp: 10, maxHp: 10, movesLeft: 3, hasAttacked: false, state: undefined },
            { id: "p2m1", ownerId: "p2", type: UnitType.SpearGuard, coord: hex(3, 0), hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: undefined },
            { id: "p2r1", ownerId: "p2", type: UnitType.BowGuard, coord: hex(3, 1), hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: undefined },
        ] as any;

        makeAllVisible(state, ["p1", "p2"]);

        const trace: TraceEntry[] = [];

        for (let round = 0; round < 20; round++) {
            state.currentPlayerId = "p1";
            state = runAiTurnSequenceWithTrace(state as any, "p1", trace, { skipDiplomacy: true });
            state.currentPlayerId = "p2";
            state = runAiTurnSequenceWithTrace(state as any, "p2", trace, { skipDiplomacy: true });
            state.turn += 1;
            // Keep war active and clear peace spam for continued observation
            state.diplomacy = {
                p1: { p2: DiplomacyState.War },
                p2: { p1: DiplomacyState.War },
            } as any;
            state.diplomacyOffers = [];
        }

        // No friendly stacking and log trace is present
        expect(trace.length).toBeGreaterThan(0);
        // At least one city gets a garrison over the run
        const garrisoned = state.units.some((u: any) =>
            (u.ownerId === "p1" || u.ownerId === "p2") &&
            state.cities.some((c: any) => c.ownerId === u.ownerId && hexEquals(c.coord, u.coord))
        );
        expect(garrisoned).toBe(true);
        // Emit trace with key action details for debugging the run
        const summary = trace.map(entry => {
            const act: any = entry.action;
            const type = act.type;
            if (type === "MoveUnit") return `${entry.playerId}:Move ${act.unitId}->(${act.to.q},${act.to.r})`;
            if (type === "Attack") return `${entry.playerId}:Attack ${act.attackerId}->${act.targetType}:${act.targetId}`;
            if (type === "ProposePeace") return `${entry.playerId}:Peace->${act.targetPlayerId}`;
            if (type === "ChooseTech") return `${entry.playerId}:Tech ${act.techId ?? ""}`;
            if (type === "SetCityBuild") return `${entry.playerId}:Build ${act.cityId}:${act.buildId}`;
            return `${entry.playerId}:${type}`;
        });
        console.info("AI trace:", summary.join(" | "));
        for (const pid of ["p1", "p2"]) {
            const occupancy = new Map<string, { military: number; civilian: number }>();
            const owned = state.units.filter((u: any) => u.ownerId === pid);
            for (const u of owned) {
                const key = hexToString(u.coord);
                const entry = occupancy.get(key) ?? { military: 0, civilian: 0 };
                const domain = UNITS[u.type].domain;
                if (domain === UnitDomain.Civilian) entry.civilian += 1;
                else entry.military += 1;
                occupancy.set(key, entry);
            }
            for (const [, entry] of occupancy) {
                expect(entry.military).toBeLessThanOrEqual(1);
                expect(entry.civilian).toBeLessThanOrEqual(1);
            }
        }

        // Domain/terrain compliance and city validity
        for (const u of state.units) {
            const tileHere = state.map.tiles.find((t: any) => hexEquals(t.coord, u.coord));
            expect(tileHere).toBeTruthy();
            if (!tileHere) continue;
            if (UNITS[u.type].domain === UnitDomain.Land) {
                expect([TerrainType.Coast, TerrainType.DeepSea, TerrainType.Mountain]).not.toContain(tileHere.terrain);
            }
            if (UNITS[u.type].domain === UnitDomain.Naval) {
                expect([TerrainType.Coast, TerrainType.DeepSea]).toContain(tileHere.terrain);
            }
        }

        for (const c of state.cities) {
            const tileHere = state.map.tiles.find((t: any) => hexEquals(t.coord, c.coord));
            expect(tileHere).toBeTruthy();
            if (!tileHere) continue;
            expect([TerrainType.Coast, TerrainType.DeepSea, TerrainType.Mountain]).not.toContain(tileHere.terrain);
        }
    });
});
