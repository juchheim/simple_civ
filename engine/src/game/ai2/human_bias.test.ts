import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, TechId, UnitType } from "../../core/types.js";
import { decideDiplomacyActionsV2 } from "./diplomacy.js";
import { scoreUnitAttack } from "./tactical-scoring.js";

const BASE_TECHS = [TechId.Fieldcraft];

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

function mkPlayer(id: string, civName: string, isAI: boolean): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI,
        aiGoal: "Balanced",
        techs: BASE_TECHS,
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

describe("Human Bias", () => {
    describe("Diplomacy Bias", () => {
        it("declares war on human player due to bias even with equal power", () => {
            const state = baseState();
            state.turn = 100;
            // P1: AI (ForgeClans), P2: Human (RiverLeague)
            state.players = [mkPlayer("p1", "ForgeClans", true), mkPlayer("p2", "RiverLeague", false)];

            // Equal forces: 1 city, 1 unit each. Ratio = 1.0.
            // ForgeClans warPowerRatio is usually > 1.05.
            // But humanBias (1.2) should boost effective ratio to 1.2, triggering war.
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "e1", 5, 0, { capital: true }),
            ];
            state.units = [
                mkUnit("p1", "u1", UnitType.SpearGuard, 2, 0),
                mkUnit("p1", "u1a", UnitType.SpearGuard, 2, 1),
                mkUnit("p1", "u1b", UnitType.SpearGuard, 3, 0),
                mkUnit("p1", "u1c", UnitType.SpearGuard, 3, 1),
                mkUnit("p1", "u1d", UnitType.SpearGuard, 4, 0),
                mkUnit("p1", "u1e", UnitType.SpearGuard, 4, 1),
                mkUnit("p2", "u2", UnitType.SpearGuard, 5, 1),
                mkUnit("p2", "u2a", UnitType.SpearGuard, 5, 2),
                mkUnit("p2", "u2b", UnitType.SpearGuard, 6, 1),
                mkUnit("p2", "u2c", UnitType.SpearGuard, 6, 2),
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
            // Ensure peace has lasted long enough
            state.aiMemoryV2 = { p1: { lastStanceTurn: { p2: 10 } } };

            const result = decideDiplomacyActionsV2(state, "p1", "Balanced");

            const warDecl = result.actions.find(a => a.type === "SetDiplomacy" && a.state === DiplomacyState.War) as any;
            expect(warDecl).toBeDefined();
            expect(warDecl.targetPlayerId).toBe("p2");
        });

        it("does NOT declare war on AI player with equal power (insufficient ratio)", () => {
            const state = baseState();
            state.turn = 100;
            // P1: AI (ForgeClans), P2: AI (RiverLeague) - Both AI!
            state.players = [mkPlayer("p1", "ForgeClans", true), mkPlayer("p2", "RiverLeague", true)];

            // Equal forces: 1 city, 1 unit each. Ratio = 1.0.
            // ForgeClans warPowerRatio is > 1.05.
            // No bias applied, so ratio 1.0 < 1.05 -> Peace.
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "e1", 5, 0, { capital: true }),
            ];
            state.units = [
                mkUnit("p1", "u1", UnitType.SpearGuard, 2, 0),
                mkUnit("p2", "u2", UnitType.SpearGuard, 5, 1),
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
            state.aiMemoryV2 = { p1: { lastStanceTurn: { p2: 10 } } };

            const result = decideDiplomacyActionsV2(state, "p1", "Balanced");

            const warDecl = result.actions.find(a => a.type === "SetDiplomacy" && a.state === DiplomacyState.War);
            expect(warDecl).toBeUndefined();
        });
    });

    describe("Tactical Scoring Bias", () => {
        it("prefers attacking human unit over identical AI unit", () => {
            const state = baseState();
            // P1: AI, P2: Human, P3: AI
            state.players = [
                mkPlayer("p1", "ForgeClans", true),
                mkPlayer("p2", "HumanPlayer", false),
                mkPlayer("p3", "OtherAI", true)
            ];

            const attacker = mkUnit("p1", "atk", UnitType.BowGuard, 0, 0);
            const humanTarget = mkUnit("p2", "h_tgt", UnitType.SpearGuard, 1, 0);
            const aiTarget = mkUnit("p3", "ai_tgt", UnitType.SpearGuard, -1, 0); // Opposite side, same dist

            state.units = [attacker, humanTarget, aiTarget];

            // Score attack on Human
            const scoreHuman = scoreUnitAttack({
                state,
                playerId: "p1",
                attacker,
                target: humanTarget,
                damage: 5,
                returnDamage: 0
            });

            // Score attack on AI
            const scoreAI = scoreUnitAttack({
                state,
                playerId: "p1",
                attacker,
                target: aiTarget,
                damage: 5,
                returnDamage: 0
            });

            // Human score should be significantly higher due to bias
            expect(scoreHuman.score).toBeGreaterThan(scoreAI.score);

            // Verify approximate magnitude (default is 50 bonus)
            expect(scoreHuman.score - scoreAI.score).toBeGreaterThanOrEqual(50);
        });
    });
});
