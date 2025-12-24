import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, BuildingType, TechId, ProjectId } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { coordinateDefensiveFocusFire, runDefensiveRingCombat, positionDefensiveRing, sendMutualDefenseReinforcements } from "../../../game/ai2/defense.js";
import { shouldPrioritizeDefense } from "../../../game/ai2/production.js";
import { aiInfo } from "../../../game/ai/debug-logging.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 10,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 20, height: 20, tiles: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean }): any {
    return {
        id,
        name: id,
        ownerId,
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
        isCapital: !!opts?.capital,
        originalOwnerId: ownerId,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        hasAttacked: false,
        state: "Normal",
    };
}

function mkPlayer(id: string, civName: string, ai = true): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: ai,
        aiGoal: "Balanced",
        techs: [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore, TechId.DrilledRanks],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

describe("AI Defense Logic (v7.2)", () => {
    describe("coordinateDefensiveFocusFire", () => {
        it("concentrates fire on a single target when multiple enemies are present", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
            state.units = [
                mkUnit("p1", "d1", UnitType.BowGuard, -1, 0), // Defender 1
                mkUnit("p1", "d2", UnitType.BowGuard, 1, -1), // Defender 2
                mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1), // Enemy 1 (wounded)
                mkUnit("p2", "e2", UnitType.SpearGuard, 1, 0), // Enemy 2
            ];
            state.units[2].hp = 5; // e1 is wounded
            state.units[0].movesLeft = 1;
            state.units[1].movesLeft = 1;
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            for (let q = -5; q <= 5; q++) {
                for (let r = -5; r <= 5; r++) {
                    state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
                }
            }

            const after = coordinateDefensiveFocusFire(state, "p1");

            const e1 = after.units.find(u => u.id === "e1");
            const d1 = after.units.find(u => u.id === "d1")!;
            const d2 = after.units.find(u => u.id === "d2")!;

            // At least one defender should have attacked e1
            expect(d1.hasAttacked || d2.hasAttacked).toBe(true);
            if (e1) {
                expect(e1.hp).toBeLessThan(5);
            }
        });
    });

    describe("runDefensiveRingCombat", () => {
        it("ring defenders attack approaching enemies", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
            state.units = [
                mkUnit("p1", "ring1", UnitType.SpearGuard, 0, 1), // Ring defender (distance 1 from city)
                mkUnit("p2", "e1", UnitType.SpearGuard, 0, 2), // Enemy approaching (distance 2 from city)
            ];
            state.units[0].movesLeft = 1;
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            for (let q = -5; q <= 5; q++) {
                for (let r = -5; r <= 5; r++) {
                    state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
                }
            }

            const after = runDefensiveRingCombat(state, "p1");

            const ring1 = after.units.find(u => u.id === "ring1")!;
            const e1 = after.units.find(u => u.id === "e1");

            // Ring defender should have attacked
            expect(ring1.hasAttacked).toBe(true);
            // Enemy should have taken damage or be dead
            if (e1) {
                expect(e1.hp).toBeLessThan(10);
            }
        });
    });

    describe("positionDefensiveRing", () => {
        it("forms a ring around a perimeter city", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            // 3 cities ensures perimeter logic works (half of cities)
            state.cities = [
                mkCity("p1", "cap", 0, 0, { capital: true }),
                mkCity("p1", "interior", 0, 2),
                mkCity("p1", "perimeter", 0, 8),
            ];
            state.units = [
                mkUnit("p1", "p1", UnitType.SpearGuard, 0, 8), // Garrison
                mkUnit("p1", "r1", UnitType.BowGuard, 0, 7),  // Excess defender
            ];
            state.units[1].movesLeft = 1;
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            // Place an enemy so 'perimeter' is a perimeter city
            state.units.push(mkUnit("p2", "e1", UnitType.SpearGuard, 0, 9));

            for (let q = -10; q <= 10; q++) {
                for (let r = -10; r <= 15; r++) {
                    state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
                }
            }

            const after = positionDefensiveRing(state, "p1");
            const r1 = after.units.find(u => u.id === "r1")!;
            expect(hexDistance(r1.coord, { q: 0, r: 8 })).toBe(1); // Moved to ring
        });
    });

    describe("sendMutualDefenseReinforcements", () => {
        it("sends units from an interior city to help a threatened perimeter city", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            // 5 cities to ensure (2,0) is NOT a perimeter city (perimeterCount = 3)
            state.cities = [
                mkCity("p1", "c1", 8, 0),  // 1. Perimeter (dist 1)
                mkCity("p1", "c2", 6, 0),  // 2. Perimeter (dist 3)
                mkCity("p1", "c3", 4, 0),  // 3. Perimeter (dist 5)
                mkCity("p1", "c4", 2, 0),  // 4. Interior (dist 7) - Reinforcement source
                mkCity("p1", "c5", 0, 0),  // 5. Interior (dist 9)
            ];
            // (8,0) needs help (threatened, 1 garrison vs 3 min)
            // (2,0) can help (2 units vs 1 min)
            state.units = [
                mkUnit("p1", "p1", UnitType.SpearGuard, 8, 0), // Perimeter garrison
                mkUnit("p1", "i1", UnitType.SpearGuard, 2, 0), // Interior garrison
                mkUnit("p1", "i2", UnitType.BowGuard, 2, 1),  // Interior spare (ring position)
            ];
            state.units[2].movesLeft = 2;
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            // Threaten (8,0)
            state.units.push(mkUnit("p2", "e1", UnitType.SpearGuard, 9, 0));
            state.units.push(mkUnit("p2", "e2", UnitType.SpearGuard, 8, -1));

            for (let q = -5; q <= 15; q++) {
                for (let r = -5; r <= 10; r++) {
                    state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
                }
            }

            const after = sendMutualDefenseReinforcements(state, "p1");
            const i2 = after.units.find(u => u.id === "i2")!;
            // i2 should move from (2,1) toward (8,0)
            expect(hexDistance(i2.coord, { q: 2, r: 1 })).toBeGreaterThan(0);
        });
    });

    describe("shouldPrioritizeDefense", () => {
        it("returns 'defend' for critical threats", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            const city = mkCity("p1", "c1", 0, 0);
            state.cities = [city];
            state.units = [mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1)]; // Adjacent enemy
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            const decision = shouldPrioritizeDefense(state, city, "p1", "Expand");
            expect(decision).toBe("defend");
        });

        it("returns 'expand' when significantly stronger than enemy", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            const city = mkCity("p1", "c1", 0, 0);
            state.cities = [city];
            state.units = [
                mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
                mkUnit("p1", "u2", UnitType.SpearGuard, 0, -1),
                mkUnit("p1", "u3", UnitType.SpearGuard, -1, 0),
                mkUnit("p1", "u4", UnitType.SpearGuard, 1, 1),
                mkUnit("p1", "u5", UnitType.SpearGuard, 2, 2),
                mkUnit("p2", "e1", UnitType.Scout, 10, 10), // Far and weak
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            const decision = shouldPrioritizeDefense(state, city, "p1", "Develop");
            expect(decision).toBe("expand");
        });
    });
});
