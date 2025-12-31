import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, UnitType, TechId, DiplomacyState } from "../../../core/types.js";
import { assessDefenseSituation } from "../../../game/ai2/defense-situation.js";
import { assessCityThreatLevel, determineThreatLevel, selectFocusTarget } from "../../../game/ai2/defense-situation/scoring.js";
import { DEFAULT_TUNING } from "../../../game/ai2/tuning.js";

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

function mkCity(ownerId: string, id: string, q: number, r: number): any {
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
        isCapital: true,
        originalOwnerId: ownerId,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number, opts?: { hp?: number; maxHp?: number }): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: opts?.hp ?? 10,
        maxHp: opts?.maxHp ?? 10,
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

describe("AI Defense Situation", () => {
    it("ignores nearby neutral units when not at war", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague", false)];
        state.cities = [mkCity("p1", "c1", 0, 0)];
        state.units = [mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1)];
        seedTiles(state, -2, 2);

        const situations = assessDefenseSituation(state, "p1");

        expect(situations.length).toBe(1);
        expect(situations[0].nearbyEnemies.length).toBe(0);
    });
});

describe("Defense Threat Levels", () => {
    it("classifies probe when pressure is very low", () => {
        const enemies = [mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1)];
        const threatLevel = determineThreatLevel(enemies, 10, 80, DEFAULT_TUNING);
        expect(threatLevel).toBe("probe");
    });

    it("classifies raid when pressure is moderate", () => {
        const enemies = [
            mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1),
            mkUnit("p2", "e2", UnitType.SpearGuard, 1, 0),
        ];
        const threatLevel = determineThreatLevel(enemies, 50, 80, DEFAULT_TUNING);
        expect(threatLevel).toBe("raid");
    });

    it("classifies assault when pressure is overwhelming", () => {
        const enemies = [
            mkUnit("p2", "e1", UnitType.ArmySpearGuard, 0, 1),
            mkUnit("p2", "e2", UnitType.ArmyBowGuard, 1, 0),
            mkUnit("p2", "e3", UnitType.ArmyRiders, 1, 1),
        ];
        const threatLevel = determineThreatLevel(enemies, 120, 40, DEFAULT_TUNING);
        expect(threatLevel).toBe("assault");
    });
});

describe("Assess City Threat Level", () => {
    it("returns probe for a single distant threat against prepared defenses", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        const city = mkCity("p1", "c1", 0, 0);
        state.cities = [city];
        state.units = [
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "r1", UnitType.BowGuard, 1, -1),
            mkUnit("p2", "e1", UnitType.SpearGuard, 3, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const threatLevel = assessCityThreatLevel(state, city, "p1");
        expect(threatLevel).toBe("probe");
    });

    it("returns raid for moderate nearby pressure", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        const city = mkCity("p1", "c1", 0, 0);
        state.cities = [city];
        state.units = [
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "r1", UnitType.BowGuard, 1, -1),
            mkUnit("p2", "e1", UnitType.SpearGuard, 2, 0),
            mkUnit("p2", "e2", UnitType.SpearGuard, 0, 2),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const threatLevel = assessCityThreatLevel(state, city, "p1");
        expect(threatLevel).toBe("raid");
    });

    it("returns assault for heavy army pressure", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        const city = mkCity("p1", "c1", 0, 0);
        state.cities = [city];
        state.units = [
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "r1", UnitType.BowGuard, 1, -1),
            mkUnit("p2", "e1", UnitType.ArmySpearGuard, 1, 0),
            mkUnit("p2", "e2", UnitType.ArmySpearGuard, 0, 1),
            mkUnit("p2", "e3", UnitType.ArmySpearGuard, -1, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const threatLevel = assessCityThreatLevel(state, city, "p1");
        expect(threatLevel).toBe("assault");
    });
});

describe("Defense Focus Target Selection", () => {
    it("prefers siege targets when under assault pressure", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague", false)];
        const city = mkCity("p1", "c1", 0, 0);
        state.cities = [city];
        state.units = [
            mkUnit("p1", "g1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "d1", UnitType.BowGuard, 0, 1),
            mkUnit("p2", "e1", UnitType.Trebuchet, 2, 0),
            mkUnit("p2", "e2", UnitType.SpearGuard, 1, 1, { hp: 3 }),
        ];
        seedTiles(state, -2, 3);

        const focus = selectFocusTarget(
            state,
            "p1",
            city,
            state.units.filter(u => u.ownerId === "p2"),
            state.units.filter(u => u.ownerId === "p1")
        );

        expect(focus?.id).toBe("e1");
    });
});
