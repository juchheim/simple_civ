import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, TechId, TerrainType } from "../../core/types.js";
import { decideDiplomacyActionsV2 } from "./diplomacy.js";
import { runTacticsV2 } from "./tactics.js";
import { getAiMemoryV2 } from "./memory.js";

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

describe("UtilityV2 AI (behavior sanity)", () => {
    it("ForgeClans does not declare war if forces are not staged near the front", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p1", "c2", 0, 2),
            mkCity("p2", "e1", 12, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "u2", UnitType.BowGuard, 0, 1),
            // enemy has almost nothing => ratio should be favorable
            mkUnit("p2", "eU", UnitType.Scout, 12, 1),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

        const res = decideDiplomacyActionsV2(state, "p1", "Balanced");
        expect(res.actions.some(a => a.type === "SetDiplomacy" && (a as any).state === DiplomacyState.War)).toBe(false);

        const mem = getAiMemoryV2(res.state, "p1");
        expect(mem.focusTargetPlayerId).toBe("p2");
        expect(mem.focusCityId).toBe("e1");
    });

    it("Titan agent prefers capital targets when available", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "AetherianVanguard"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "cap", 2, 0, { capital: true }),
            mkCity("p2", "town", 4, 0),
        ];
        state.units = [
            mkUnit("p1", "t", UnitType.Titan, 0, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const after = runTacticsV2(state, "p1");
        const mem = getAiMemoryV2(after, "p1");
        expect(mem.titanFocusCityId).toBe("cap");
    });

    it("Post-war rally: units move toward focus city on war declaration turn", () => {
        const state = baseState();
        state.turn = 50;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 10, 0, { capital: true }),
        ];
        // Units far from enemy city
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "u2", UnitType.BowGuard, 1, 0),
            mkUnit("p1", "u3", UnitType.Riders, 0, 2),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        // Set up memory to simulate just declaring war this turn
        state.aiMemoryV2 = {
            p1: {
                focusTargetPlayerId: "p2",
                focusCityId: "e1",
                focusSetTurn: 50, // Same as current turn = just declared war
            }
        };

        // Generate map tiles for pathfinding
        for (let q = -2; q <= 15; q++) {
            for (let r = -2; r <= 5; r++) {
                state.map.tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [] });
            }
        }

        const after = runTacticsV2(state, "p1");

        // Units should have moved closer to the enemy city at (10, 0)
        const u1After = after.units.find(u => u.id === "u1");
        const u2After = after.units.find(u => u.id === "u2");
        const u3After = after.units.find(u => u.id === "u3");

        // At least some units should have moved toward the target
        const u1MovedCloser = u1After && (u1After.coord.q > 0 || u1After.movesLeft === 0);
        const u2MovedCloser = u2After && (u2After.coord.q > 1 || u2After.movesLeft === 0);
        const u3MovedCloser = u3After && (u3After.coord.q > 0 || u3After.movesLeft === 0);

        expect(u1MovedCloser || u2MovedCloser || u3MovedCloser).toBe(true);
    });
});

