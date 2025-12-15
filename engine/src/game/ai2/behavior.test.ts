import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, BuildingType, TechId, ProjectId } from "../../core/types.js";
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
});


