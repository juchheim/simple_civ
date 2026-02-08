import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, TechId } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { runTacticsV2 } from "../../../game/ai2/tactics.js";
import { planTacticalTurn, resolveTacticalActionConflicts, runTacticalPlanner } from "../../../game/ai2/tactical-planner.js";
import { runDiplomacy } from "../../../game/ai2/turn-runner/diplomacy.js";

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

function seedTiles(state: GameState, min: number, max: number) {
    for (let q = min; q <= max; q++) {
        for (let r = min; r <= max; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
        }
    }
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
        movesLeft: 2,
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

describe("AI Tactical Planner", () => {
    it("full mode garrisons cities while offense-only leaves units in place", () => {
        const full = baseState();
        full.players = [mkPlayer("p1", "ForgeClans")];
        full.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
        full.units = [mkUnit("p1", "u1", UnitType.SpearGuard, 1, 0)];
        seedTiles(full, -2, 2);

        const afterFull = runTacticalPlanner(full, "p1", "full");
        const garrisoned = afterFull.units.find(u => u.id === "u1");
        expect(garrisoned?.coord).toEqual({ q: 0, r: 0 });

        const offense = baseState();
        offense.players = [mkPlayer("p1", "ForgeClans")];
        offense.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
        offense.units = [mkUnit("p1", "u1", UnitType.SpearGuard, 1, 0)];
        seedTiles(offense, -2, 2);

        const afterOffense = runTacticsV2(offense, "p1");
        const stillOut = afterOffense.units.find(u => u.id === "u1");
        expect(stillOut?.coord).toEqual({ q: 1, r: 0 });
    });

    it("attacking phase executes attack order and move-attack plans against cities", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p2", "c1", 1, 0),
            mkCity("p2", "c2", 0, 4),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 2),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                armyPhase: "attacking",
                focusTargetPlayerId: "p2",
                focusCityId: "c1",
                focusSetTurn: state.turn - 1,
            },
        };
        seedTiles(state, -2, 6);

        const after = runTacticalPlanner(state, "p1", "offense-only");
        const u1 = after.units.find(u => u.id === "u1")!;
        const u2 = after.units.find(u => u.id === "u2")!;
        const c1 = after.cities.find(c => c.id === "c1")!;
        const c2 = after.cities.find(c => c.id === "c2")!;

        expect(u1.hasAttacked).toBe(true);
        expect(c1.hp).toBeLessThan(20);
        expect(u2.hasAttacked).toBe(true);
        const distToC1 = hexDistance(u2.coord, c1.coord);
        const distToC2 = hexDistance(u2.coord, c2.coord);
        expect(Math.min(distToC1, distToC2)).toBe(1);
    });

    it("staged phase allows attacking city targets when in contact", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p2", "c1", 1, 0)];
        state.units = [mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0)];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                armyPhase: "staged",
                armyRallyPoint: { q: 8, r: 8 },
                armyReadyTurn: state.turn,
                focusTargetPlayerId: "p2",
                focusCityId: "c1",
                focusSetTurn: state.turn - 1,
            },
        };
        seedTiles(state, -2, 10);

        const after = runTacticalPlanner(state, "p1", "offense-only");
        const u1 = after.units.find(u => u.id === "u1")!;
        const c1 = after.cities.find(c => c.id === "c1")!;

        expect(u1.hasAttacked).toBe(true);
        expect(c1.hp).toBeLessThan(20);
    });

    it("offense-only mode does not attack units while at peace", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ScholarKingdoms"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "home", -2, 0, { capital: true })];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        seedTiles(state, -3, 3);

        const after = runTacticalPlanner(state, "p1", "offense-only");
        const u1 = after.units.find(u => u.id === "u1")!;
        const e1 = after.units.find(u => u.id === "e1");

        expect(u1.hasAttacked).toBe(false);
        expect(e1.hp).toBe(10);
        expect(after.diplomacy?.p1?.p2).toBe(DiplomacyState.Peace);
    });

    it("offense-only mode does not attack cities while at peace", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ScholarKingdoms"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "home", -2, 0, { capital: true }),
            mkCity("p2", "c1", 1, 0),
        ];
        state.units = [mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0)];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        seedTiles(state, -3, 3);

        const after = runTacticalPlanner(state, "p1", "offense-only");
        const u1 = after.units.find(u => u.id === "u1")!;
        const c1 = after.cities.find(c => c.id === "c1")!;

        expect(u1.hasAttacked).toBe(false);
        expect(c1.hp).toBe(20);
        expect(after.diplomacy?.p1?.p2).toBe(DiplomacyState.Peace);
    });

    it("border violation declares war before attacking", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "home", 0, 0, { capital: true }),
            mkCity("p2", "enemy", 4, 0),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0),
        ];
        const enemy = state.units.find(u => u.id === "e1");
        if (enemy) {
            enemy.hp = 3;
            enemy.maxHp = 10;
        }
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        seedTiles(state, -2, 4);

        const violationTile = state.map.tiles.find(t => t.coord.q === 1 && t.coord.r === 0);
        if (violationTile) violationTile.ownerId = "p1";

        const afterDiplo = runDiplomacy(state, "p1", "Balanced");
        expect(afterDiplo.diplomacy?.p1?.p2).toBe(DiplomacyState.War);

        afterDiplo.aiMemoryV2 = {
            p1: {
                armyPhase: "attacking",
                focusTargetPlayerId: "p2",
                focusCityId: "enemy",
                focusSetTurn: afterDiplo.turn - 1,
            },
        };

        const after = runTacticalPlanner(afterDiplo, "p1", "offense-only");
        const u1 = after.units.find(u => u.id === "u1")!;
        const e1 = after.units.find(u => u.id === "e1")!;

        expect(u1.hasAttacked).toBe(true);
        expect(e1?.hp ?? 0).toBeLessThan(10);
        expect(after.diplomacy?.p1?.p2).toBe(DiplomacyState.War);
    });

    it("full mode intercepts ranged enemies beyond immediate city radius", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "cap", 12, 0, { capital: true }),
            mkCity("p1", "c1", 0, 0),
        ];
        state.units = [
            mkUnit("p1", "capG", UnitType.SpearGuard, 12, 0),
            mkUnit("p1", "capR1", UnitType.SpearGuard, 11, 0),
            mkUnit("p1", "capR2", UnitType.SpearGuard, 12, -1),
            mkUnit("p1", "capR3", UnitType.SpearGuard, 13, -1),
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "r1", UnitType.SpearGuard, 0, 2),
            mkUnit("p2", "e1", UnitType.BowGuard, 0, 4),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -3, 13);

        const after = runTacticalPlanner(state, "p1", "full");
        const r1 = after.units.find(u => u.id === "r1");
        const e1 = after.units.find(u => u.id === "e1");

        expect(r1?.hasAttacked).toBe(true);
        if (e1) {
            expect(e1.hp).toBeLessThan(10);
        }
    });

    it("full mode focus-fires the weakest nearby enemy", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "cap", 12, 0, { capital: true }),
            mkCity("p1", "c1", 0, 0),
        ];
        state.units = [
            mkUnit("p1", "capG", UnitType.SpearGuard, 12, 0),
            mkUnit("p1", "capR1", UnitType.SpearGuard, 11, 0),
            mkUnit("p1", "capR2", UnitType.SpearGuard, 12, -1),
            mkUnit("p1", "capR3", UnitType.SpearGuard, 13, -1),
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "r1", UnitType.SpearGuard, 0, 2),
            mkUnit("p2", "e1", UnitType.ArmyBowGuard, 0, 3),
            mkUnit("p2", "e2", UnitType.ArmyBowGuard, 1, 2),
        ];
        const e1 = state.units.find(u => u.id === "e1");
        if (e1) {
            e1.hp = 6;
            e1.maxHp = 15;
        }
        const e2 = state.units.find(u => u.id === "e2");
        if (e2) {
            e2.hp = 15;
            e2.maxHp = 15;
        }
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -3, 13);

        const after = runTacticalPlanner(state, "p1", "full");
        const r1 = after.units.find(u => u.id === "r1");
        const e1After = after.units.find(u => u.id === "e1");

        expect(r1?.hasAttacked).toBe(true);
        if (e1After) {
            expect(e1After.hp).toBeLessThan(6);
        }
    });

    it("resolves conflicts by intent first, then by score (regardless of source)", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];
        state.units = [
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "d1", UnitType.SpearGuard, 1, 0),
            mkUnit("p1", "d2", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "d3", UnitType.SpearGuard, -1, 0),
            mkUnit("p1", "r1", UnitType.BowGuard, 2, 0),
            mkUnit("p2", "e1", UnitType.ArmyBowGuard, 1, 2),
            mkUnit("p2", "e2", UnitType.ArmyBowGuard, 2, 1),
        ];
        for (const enemyId of ["e1", "e2"]) {
            const enemy = state.units.find(u => u.id === enemyId);
            if (enemy) {
                enemy.hp = 15;
                enemy.maxHp = 15;
            }
        }
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -2, 2);

        const result = planTacticalTurn(state, "p1", "full");
        const defenseAction = result.plan.actions.find(action => action.source === "defense");
        if (!defenseAction) {
            throw new Error("Expected at least one defense action.");
        }

        const offenseAction = { ...defenseAction, source: "offense", score: defenseAction.score + 100 } as typeof defenseAction;
        const resolved = resolveTacticalActionConflicts([defenseAction, offenseAction]);

        expect(resolved).toHaveLength(1);
        expect(resolved[0].source).toBe("offense");
        expect(resolved[0].unitId).toBe(defenseAction.unitId);
    });

    it("orders defense actions before offense actions in the unified plan", () => {
        const state = baseState();
        state.turn = 20;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "ec1", 4, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "d1", UnitType.SpearGuard, 1, 0),
            mkUnit("p1", "d2", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "d3", UnitType.SpearGuard, -1, 0),
            mkUnit("p1", "r1", UnitType.SpearGuard, 2, 0),
            mkUnit("p1", "o1", UnitType.SpearGuard, 3, 0),
            mkUnit("p2", "e1", UnitType.ArmyBowGuard, 1, 2),
        ];
        for (const id of ["d1", "d2", "d3"]) {
            const unit = state.units.find(u => u.id === id);
            if (unit) {
                unit.movesLeft = 0;
            }
        }
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                armyPhase: "attacking",
                focusTargetPlayerId: "p2",
                focusCityId: "ec1",
                focusSetTurn: state.turn - 1,
            },
        };
        seedTiles(state, -2, 5);
        // Add visibility for all tiles - required for pessimistic retreat check
        const allTileKeys = state.map.tiles.map(t => `${t.coord.q},${t.coord.r}`);
        state.visibility = { p1: allTileKeys, p2: allTileKeys };

        const result = planTacticalTurn(state, "p1", "full");
        const defenseActions = result.plan.actions.filter(action => action.source === "defense");
        const offenseActions = result.plan.actions.filter(action => action.source === "offense");

        expect(defenseActions.length).toBeGreaterThan(0);
        expect(offenseActions.length).toBeGreaterThan(0);

        const lastDefenseIndex = Math.max(...defenseActions.map(action => result.plan.actions.indexOf(action)));
        const firstOffenseIndex = Math.min(...offenseActions.map(action => result.plan.actions.indexOf(action)));

        expect(lastDefenseIndex).toBeLessThan(firstOffenseIndex);
    });

    // v1.0.3: Battle-group unification tests
    it("battle-group attacks can occur during staged phase when attack overrides trigger", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 5, 5, { capital: true })];
        // Create a battle group: 2+ friendly units near enemies
        // Add enough enemies to avoid 2:1 power override (Override 4 in checkAttackOverrides)
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 1),
            mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0),
            mkUnit("p2", "e2", UnitType.SpearGuard, 2, 0),
            mkUnit("p2", "e3", UnitType.SpearGuard, 3, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                armyPhase: "staged", // Not attacking!
                armyRallyPoint: { q: 10, r: 10 },
                armyReadyTurn: state.turn,
            },
        };
        seedTiles(state, -2, 10);

        const result = planTacticalTurn(state, "p1", "offense-only");

        const attackActions = result.plan.actions.filter(a => a.intent === "attack");
        expect(result.plan.armyPhase).toBe("attacking");
        expect(attackActions.length).toBeGreaterThan(0);
    });

    it("battle-group attacks appear in plan with source 'offense' during attacking phase", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 5, 5, { capital: true })];
        // Create a battle group: 2+ friendly units near an enemy
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 1),
            mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0),
        ];
        const enemy = state.units.find(u => u.id === "e1");
        if (enemy) {
            enemy.hp = 5; // Low HP to ensure attacks score positively
        }
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                armyPhase: "attacking",
                focusTargetPlayerId: "p2",
            },
        };
        seedTiles(state, -2, 10);

        const result = planTacticalTurn(state, "p1", "offense-only");

        const attackActions = result.plan.actions.filter(a => a.intent === "attack");
        expect(result.plan.armyPhase).toBe("attacking");
        // Should have at least one attack planned
        expect(attackActions.length).toBeGreaterThan(0);
        // All attack actions should have source "offense"
        for (const action of attackActions) {
            expect(action.source).toBe("offense");
        }
    });

    it("battle-group attacks respect movesLeft requirement", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 5, 5, { capital: true })];
        // Create units with no moves left
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 1),
            mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0),
        ];
        // Set movesLeft to 0 for friendly units
        for (const u of state.units.filter(u => u.ownerId === "p1")) {
            u.movesLeft = 0;
        }
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                armyPhase: "attacking",
            },
        };
        seedTiles(state, -2, 10);

        const result = planTacticalTurn(state, "p1", "offense-only");

        // No attacks should be planned since units have no moves
        const attackActions = result.plan.actions.filter(a => a.intent === "attack");
        expect(attackActions.length).toBe(0);
    });

    it("battle-group attacks respect LoS requirements", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 5, 5, { capital: true })];
        // Create a ranged unit with a mountain blocking LoS to enemy
        state.units = [
            mkUnit("p1", "u1", UnitType.BowGuard, 0, 0), // Ranged unit
            mkUnit("p2", "e1", UnitType.SpearGuard, 2, 0), // Enemy at range 2
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                armyPhase: "attacking",
            },
        };
        // Create tiles but put a mountain between them (blocking LoS)
        seedTiles(state, -2, 10);
        const blockingTile = state.map.tiles.find(t => t.coord.q === 1 && t.coord.r === 0);
        if (blockingTile) {
            (blockingTile as any).terrain = "Mountain";
        }

        const result = planTacticalTurn(state, "p1", "offense-only");

        // The ranged attack should be blocked by the mountain (no LoS)
        const attackActions = result.plan.actions.filter(a => a.intent === "attack");
        // Ranged unit should not have an attack action due to blocked LoS
        const bowGuardAttack = attackActions.find(a => a.unitId === "u1");
        expect(bowGuardAttack).toBeUndefined();
    });
});
