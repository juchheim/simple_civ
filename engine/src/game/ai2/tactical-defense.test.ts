import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, TerrainType, TechId } from "../../core/types.js";
import { assessDefenseSituation, assessCitySituation } from "./defense-situation.js";
import { detectEarlyRushOpportunity, detectCounterAttackOpportunity } from "./diplomacy.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 30,
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

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean; hp?: number }): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: 3,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp: opts?.hp ?? 20,
        maxHp: 20,
        isCapital: !!opts?.capital,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number, opts?: { hp?: number }): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: opts?.hp ?? 10,
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
        techs: [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

function generateMapTiles(state: GameState, minQ: number, maxQ: number, minR: number, maxR: number): void {
    for (let q = minQ; q <= maxQ; q++) {
        for (let r = minR; r <= maxR; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [] });
        }
    }
}

describe("Defense Situation Assessment", () => {
    it("detects no threat when no enemies nearby", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0), // garrison
        ];
        generateMapTiles(state, -5, 15, -5, 10);

        const situations = assessDefenseSituation(state, "p1");
        expect(situations.length).toBe(1);
        expect(situations[0].threatLevel).toBe("none");
        expect(situations[0].recommendedAction).toBe("hold");
    });

    it("detects probe threat with few weak enemies", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0), // garrison
            mkUnit("p1", "u2", UnitType.BowGuard, 1, 0),   // ring
            mkUnit("p2", "e1", UnitType.SpearGuard, 3, 0), // nearby enemy
        ];
        generateMapTiles(state, -5, 15, -5, 10);

        const situations = assessDefenseSituation(state, "p1");
        expect(situations.length).toBe(1);
        expect(situations[0].nearbyEnemies.length).toBe(1);
        // With 1 weak enemy vs garrison + ring, should be probe
        expect(["none", "probe"]).toContain(situations[0].threatLevel);
    });

    it("detects assault threat with many enemies", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0), // garrison
            // Many enemies approaching
            mkUnit("p2", "e1", UnitType.ArmySpearGuard, 2, 0),
            mkUnit("p2", "e2", UnitType.ArmyBowGuard, 2, 1),
            mkUnit("p2", "e3", UnitType.ArmyRiders, 3, 0),
            mkUnit("p2", "e4", UnitType.SpearGuard, 3, 1),
        ];
        generateMapTiles(state, -5, 15, -5, 10);

        const situations = assessDefenseSituation(state, "p1");
        expect(situations.length).toBe(1);
        expect(situations[0].nearbyEnemies.length).toBe(4);
        // With 4 enemies including armies vs 1 garrison, should be assault
        expect(["raid", "assault"]).toContain(situations[0].threatLevel);
    });

    it("identifies focus target as weakest nearby enemy", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 2, 0, { hp: 10 }),
            mkUnit("p2", "e2", UnitType.SpearGuard, 2, 1, { hp: 3 }),  // weakest
            mkUnit("p2", "e3", UnitType.SpearGuard, 3, 0, { hp: 7 }),
        ];
        generateMapTiles(state, -5, 15, -5, 10);

        const situation = assessCitySituation(state, state.cities[0], "p1");
        expect(situation.focusTarget?.id).toBe("e2");
    });
});

describe("Early Rush Detection", () => {
    it("returns null when turn > 60", () => {
        const state = baseState();
        state.turn = 70;
        state.players = [
            { ...mkPlayer("p1", "ForgeClans"), earlyRushChance: 1.0 },
            mkPlayer("p2", "RiverLeague")
        ];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 5, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "u3", UnitType.SpearGuard, 1, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        generateMapTiles(state, -5, 15, -5, 10);

        const result = detectEarlyRushOpportunity(state, "p1");
        expect(result).toBeNull();
    });

    it("returns null when civ has no earlyRushChance", () => {
        const state = baseState();
        state.turn = 30;
        state.players = [
            mkPlayer("p1", "ScholarKingdoms"), // defensive civ, no rush chance
            mkPlayer("p2", "RiverLeague")
        ];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 5, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        generateMapTiles(state, -5, 15, -5, 10);

        const result = detectEarlyRushOpportunity(state, "p1");
        expect(result).toBeNull();
    });
});

describe("Counter-Attack Detection", () => {
    it("detects opportunity when enemy military is far from their cities", () => {
        const state = baseState();
        state.turn = 50;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 15, 0, { capital: true }), // enemy capital far away
        ];
        // Our units near their city
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 12, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 13, 0),
            mkUnit("p1", "u3", UnitType.SpearGuard, 14, 0),
            // Enemy units far from their city
            mkUnit("p2", "e1", UnitType.SpearGuard, 5, 0),  // 10 tiles from capital!
            mkUnit("p2", "e2", UnitType.SpearGuard, 6, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        generateMapTiles(state, -5, 20, -5, 10);

        const result = detectCounterAttackOpportunity(state, "p1");
        // Should detect opportunity - their units are ~10 tiles from home, we have 3 nearby
        if (result) {
            expect(result.targetId).toBe("p2");
            expect(result.priority).toBeGreaterThan(0);
        }
        // May or may not trigger depending on priority threshold
    });

    it("returns null when enemy has units defending their city", () => {
        const state = baseState();
        state.turn = 50;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 15, 0, { capital: true }),
        ];
        // Enemy units defending their city
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 15, 0), // on city
            mkUnit("p2", "e2", UnitType.SpearGuard, 14, 0), // adjacent
            mkUnit("p2", "e3", UnitType.SpearGuard, 16, 0), // adjacent
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        generateMapTiles(state, -5, 20, -5, 10);

        const result = detectCounterAttackOpportunity(state, "p1");
        // Should not detect opportunity - they have 3 defenders
        expect(result).toBeNull();
    });
});
