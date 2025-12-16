import { describe, it, expect } from "vitest";
import {
    evaluatePowerRatio,
    evaluateWarStatus,
    evaluateDistance,
    aiWarPeaceDecision,
    PowerClassification,
} from "./ai-decisions.js";
import { DiplomacyState, UnitType, PlayerPhase } from "../core/types.js";
import { hexToString } from "../core/hex.js";

type HexCoord = { q: number; r: number };
function hex(q: number, r: number): HexCoord {
    return { q, r };
}

function baseState() {
    return {
        id: "g",
        turn: 50,
        players: [] as any[],
        currentPlayerId: "p",
        phase: PlayerPhase.Planning,
        map: { width: 24, height: 24, tiles: [], rivers: [] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: {} as Record<string, string[]>,
        revealed: {} as Record<string, string[]>,
        diplomacy: {} as any,
        diplomacyChangeTurn: {} as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

describe("evaluatePowerRatio", () => {
    it("classifies 5x+ power as dominating (with 100+ power)", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // 500 power vs 50 power = 10x ratio
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "u2", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0), hp: 15 },
            { id: "u3", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(2, 0), hp: 15 },
            { id: "u4", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(3, 0), hp: 15 },
            { id: "u5", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(4, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.SpearGuard, coord: hex(5, 0), hp: 10 },
        ] as any;

        const result = evaluatePowerRatio("p", "e", state as any);

        expect(result.classification).toBe("dominating");
        expect(result.isDominating).toBe(true);
        expect(result.isOverwhelming).toBe(true);
        expect(result.ratio).toBeGreaterThanOrEqual(5);
    });

    it("classifies 2x-5x power as overwhelming", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // 4 armies vs 1 army = ratio > 2x (accounting for city power)
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "u2", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0), hp: 15 },
            { id: "u3", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(2, 0), hp: 15 },
            { id: "u4", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(3, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
        ] as any;

        const result = evaluatePowerRatio("p", "e", state as any);

        expect(result.classification).toBe("overwhelming");
        expect(result.isOverwhelming).toBe(true);
        expect(result.ratio).toBeGreaterThanOrEqual(2);
        expect(result.ratio).toBeLessThan(5);
    });

    it("classifies 1.2x-2x power as advantaged", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // 3 armies vs 2 armies = 1.5x ratio
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "u2", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0), hp: 15 },
            { id: "u3", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(2, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
            { id: "e2", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(6, 0), hp: 15 },
        ] as any;

        const result = evaluatePowerRatio("p", "e", state as any);

        expect(result.classification).toBe("advantaged");
        expect(result.ratio).toBeGreaterThanOrEqual(1.2);
        expect(result.ratio).toBeLessThan(2);
    });

    it("classifies 0.6x-1.2x power as even", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // Equal armies = 1x ratio
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
        ] as any;

        const result = evaluatePowerRatio("p", "e", state as any);

        expect(result.classification).toBe("even");
        expect(result.ratio).toBeGreaterThanOrEqual(0.6);
        expect(result.ratio).toBeLessThan(1.2);
    });

    it("classifies <0.6x power as disadvantaged", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // 1 army vs 3 armies = 0.33x ratio
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
            { id: "e2", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(6, 0), hp: 15 },
            { id: "e3", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(7, 0), hp: 15 },
        ] as any;

        const result = evaluatePowerRatio("p", "e", state as any);

        expect(result.classification).toBe("disadvantaged");
        expect(result.ratio).toBeLessThan(0.6);
    });

    it("returns isFinishable when target has 1-2 cities and 1.5x power", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "p", coord: hex(1, 0) },
            { id: "c3", ownerId: "p", coord: hex(2, 0) },
            { id: "e1", ownerId: "e", coord: hex(5, 0) }, // Only 1 enemy city
        ] as any;
        // 3 armies vs 1 = 3x ratio > 1.5x
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "u2", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0), hp: 15 },
            { id: "u3", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(2, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
        ] as any;

        const result = evaluatePowerRatio("p", "e", state as any);

        expect(result.isFinishable).toBe(true);
        expect(result.hasCityAdvantage).toBe(true);
    });

    it("handles zero enemy units with high power ratio", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
        ] as any;
        // Enemy has no city and no units = 0 power
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "u2", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0), hp: 15 },
            { id: "u3", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(2, 0), hp: 15 },
        ] as any;

        const result = evaluatePowerRatio("p", "e", state as any);

        // With no enemy power, ratio is Infinity
        expect(result.ratio).toBe(Infinity);
        expect(result.classification).toBe("dominating");
    });
});

describe("evaluateWarStatus", () => {
    it("detects stalemate after 25+ turns of even war", () => {
        const state = baseState();
        state.turn = 75;
        state.diplomacyChangeTurn = { p: { e: 50 } }; // 25 turns of war
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // Equal power = evenly matched
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
        ] as any;

        const result = evaluateWarStatus("p", "e", state as any);

        expect(result.isStalemate).toBe(true);
        expect(result.turnsSinceChange).toBe(25);
    });

    it("detects exhaustion after 40+ turns of war", () => {
        const state = baseState();
        state.turn = 100;
        state.diplomacyChangeTurn = { p: { e: 60 } }; // 40 turns of war
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
        ] as any;
        state.units = [] as any;

        const result = evaluateWarStatus("p", "e", state as any);

        expect(result.isExhausted).toBe(true);
        expect(result.turnsSinceChange).toBe(40);
    });

    it("excludes stalemate when dominating (5x+ power)", () => {
        const state = baseState();
        state.turn = 80;
        state.diplomacyChangeTurn = { p: { e: 50 } }; // 30 turns of war
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // Massive power advantage = 5x+
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "u2", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0), hp: 15 },
            { id: "u3", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(2, 0), hp: 15 },
            { id: "u4", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(3, 0), hp: 15 },
            { id: "u5", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(4, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.SpearGuard, coord: hex(5, 0), hp: 10 },
        ] as any;

        const result = evaluateWarStatus("p", "e", state as any);

        expect(result.isStalemate).toBe(false); // Not a stalemate when dominating
    });

    it("detects winning war (1.2x+ power, >= cities)", () => {
        const state = baseState();
        state.turn = 60;
        state.diplomacyChangeTurn = { p: { e: 50 } };
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "p", coord: hex(1, 0) },
            { id: "c3", ownerId: "p", coord: hex(2, 0) },  // 3 vs 1 = 2+ advantage
            { id: "e1", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // 4 armies vs 1 enemy = clear power advantage (>1.2x)
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "u2", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0), hp: 15 },
            { id: "u3", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(2, 0), hp: 15 },
            { id: "u4", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(3, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
        ] as any;

        const result = evaluateWarStatus("p", "e", state as any);

        expect(result.isWinning).toBe(true);
        expect(result.hasCityAdvantage).toBe(true);
    });

    it("detects losing war (<0.6x power)", () => {
        const state = baseState();
        state.turn = 60;
        state.diplomacyChangeTurn = { p: { e: 50 } };
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "e1", ownerId: "e", coord: hex(5, 0) },
        ] as any;
        // 1 army vs 3 = 0.33x ratio
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 },
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(5, 0), hp: 15 },
            { id: "e2", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(6, 0), hp: 15 },
            { id: "e3", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(7, 0), hp: 15 },
        ] as any;

        const result = evaluateWarStatus("p", "e", state as any);

        expect(result.isLosing).toBe(true);
    });
});

describe("evaluateDistance", () => {
    it("calculates closest city distance", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "c2", ownerId: "p", coord: hex(1, 0) },
            { id: "e1", ownerId: "e", coord: hex(5, 0) },
            { id: "e2", ownerId: "e", coord: hex(10, 0) },
        ] as any;

        const result = evaluateDistance("p", "e", state as any);

        expect(result.closestCityDist).toBe(4); // hex(1,0) to hex(5,0)
        expect(result.myCities).toHaveLength(2);
        expect(result.theirCities).toHaveLength(2);
    });

    it("returns null distance when no enemy cities", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
        ] as any;

        const result = evaluateDistance("p", "e", state as any);

        expect(result.closestCityDist).toBeNull();
        expect(result.theirCities).toHaveLength(0);
    });

    it("scales warDistanceMax by map size", () => {
        const smallMap = baseState();
        smallMap.map.width = 16;
        smallMap.map.height = 16;
        smallMap.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "e1", ownerId: "e", coord: hex(5, 0) },
        ] as any;

        const largeMap = baseState();
        largeMap.map.width = 48;
        largeMap.map.height = 48;
        largeMap.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "e1", ownerId: "e", coord: hex(5, 0) },
        ] as any;

        const smallResult = evaluateDistance("p", "e", smallMap as any);
        const largeResult = evaluateDistance("p", "e", largeMap as any);

        expect(largeResult.warDistanceMax).toBeGreaterThan(smallResult.warDistanceMax);
        expect(largeResult.distanceScale).toBeGreaterThan(smallResult.distanceScale);
    });

    it("respects warDistanceMax override", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0) },
            { id: "e1", ownerId: "e", coord: hex(5, 0) },
        ] as any;

        const result = evaluateDistance("p", "e", state as any, { warDistanceMax: 3 });

        expect(result.warDistanceMax).toBe(3);
        expect(result.isInRange).toBe(false); // dist 5 > 3
    });
});

describe("aiWarPeaceDecision scenario table", () => {
    function createScenario(opts: {
        inWar: boolean;
        powerRatio: number;
        turnsSinceChange: number;
        turnNumber?: number;
        enemyCities?: number;
        playerCities?: number;
        hasWarPrep?: boolean;
    }) {
        const state = baseState();
        state.turn = opts.turnNumber ?? 50;

        const playerCities = opts.playerCities ?? 1;
        const enemyCities = opts.enemyCities ?? 1;

        state.players = [
            {
                id: "p",
                civName: "ForgeClans",
                aiGoal: "Conquest",
                completedProjects: [],
                techs: [],
                currentTech: null,
                warPreparation: opts.hasWarPrep ? { targetId: "e", state: "Ready", startedTurn: 0 } : undefined,
            },
            { id: "e", civName: "RiverLeague", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null },
        ] as any;

        state.contacts = { p: { e: true }, e: { p: true } };
        state.diplomacy = {
            p: { e: opts.inWar ? DiplomacyState.War : DiplomacyState.Peace },
            e: { p: opts.inWar ? DiplomacyState.War : DiplomacyState.Peace },
        };
        state.diplomacyChangeTurn = { p: { e: state.turn - opts.turnsSinceChange } };

        // Create cities
        for (let i = 0; i < playerCities; i++) {
            state.cities.push({
                id: `p${i}`,
                ownerId: "p",
                coord: hex(i, 0),
                hp: 20,
                maxHp: 20,
                buildings: [],
            } as any);
        }
        for (let i = 0; i < enemyCities; i++) {
            state.cities.push({
                id: `e${i}`,
                ownerId: "e",
                coord: hex(5 + i, 0),
                hp: 20,
                maxHp: 20,
                buildings: [],
            } as any);
        }

        // Setup visibility
        const allKeys = state.cities.map((c: any) => hexToString(c.coord));
        state.visibility = { p: allKeys, e: allKeys };
        state.revealed = { p: allKeys, e: allKeys };

        // Create units to match power ratio
        // Base: 1 army each = ratio 1
        const baseUnits = 2;
        const playerUnits = Math.round(baseUnits * opts.powerRatio);
        const enemyUnits = baseUnits;

        for (let i = 0; i < playerUnits; i++) {
            state.units.push({
                id: `pu${i}`,
                ownerId: "p",
                type: UnitType.ArmySpearGuard,
                coord: hex(0, i),
                hp: 15,
                maxHp: 15,
            } as any);
        }
        for (let i = 0; i < enemyUnits; i++) {
            state.units.push({
                id: `eu${i}`,
                ownerId: "e",
                type: UnitType.ArmySpearGuard,
                coord: hex(5, i),
                hp: 15,
                maxHp: 15,
            } as any);
        }

        return state;
    }

    it.each([
        // [description, scenario options, expected decision]
        ["declares war when dominating (5x+) in peace", { inWar: false, powerRatio: 6, turnsSinceChange: 20, hasWarPrep: true }, "DeclareWar"],
        ["continues war when overwhelming", { inWar: true, powerRatio: 2.5, turnsSinceChange: 30 }, "None"],
        ["proposes peace when losing and exhausted", { inWar: true, powerRatio: 0.4, turnsSinceChange: 45 }, "ProposePeace"],
        ["stays at peace when too weak", { inWar: false, powerRatio: 0.2, turnsSinceChange: 20, hasWarPrep: true, enemyCities: 3 }, "None"],
        ["respects min war duration", { inWar: true, powerRatio: 0.5, turnsSinceChange: 10 }, "None"],
    ])("%s", (_, opts, expected) => {
        const state = createScenario(opts);
        const decision = aiWarPeaceDecision("p", "e", state as any);
        expect(decision).toBe(expected);
    });
});
