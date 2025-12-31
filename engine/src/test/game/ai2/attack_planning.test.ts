import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, TerrainType, UnitType, TechId } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { planAttackOrderV2 } from "../../../game/ai2/attack-order/attack-plan.js";
import { planMoveAndAttack } from "../../../game/ai2/attack-order/move-attack.js";
import { scoreAttackOption } from "../../../game/ai2/attack-order/scoring.js";
import { selectFocusCityAgainstTarget } from "../../../game/ai2/strategy.js";
import { initValidationContext, clearValidationContext } from "../../../game/ai/shared/validation.js";

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
        isCapital: false,
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

describe("AI Attack Planning", () => {
    it("plans Trebuchet attacks only against cities", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p2", "c1", 0, 2)];
        state.units = [
            mkUnit("p1", "t1", UnitType.Trebuchet, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -3, 3);

        const planned = planAttackOrderV2(state, "p1");

        expect(planned.some(p => p.targetType === "Unit")).toBe(false);
        expect(planned.some(p => p.targetType === "City")).toBe(true);
    });

    it("plans move-attack from adjacent tiles only", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 2, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -3, 3);

        const plans = planMoveAndAttack(state, "p1");

        expect(plans.length).toBe(1);
        expect(plans[0].targetId).toBe("e1");
        expect(hexDistance(state.units[0].coord, plans[0].moveTo)).toBe(1);
    });

    it("does not plan move-attack when ranged line of sight is blocked", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.units = [
            mkUnit("p1", "u1", UnitType.BowGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 0, 3),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -1, 3);
        const blockingTile = state.map.tiles.find(t => t.coord.q === 0 && t.coord.r === 2);
        if (blockingTile) {
            blockingTile.terrain = TerrainType.Hills;
        }

        initValidationContext(state, "p1");
        const plans = planMoveAndAttack(state, "p1");
        clearValidationContext();

        expect(plans.length).toBe(0);
    });

    it("does not plan move-attack when exposure is lethal and no kill is available", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.SpearGuard, 2, 0),
            mkUnit("p2", "t1", UnitType.SpearGuard, 3, 0),
            mkUnit("p2", "t2", UnitType.SpearGuard, 3, -1),
            mkUnit("p2", "t3", UnitType.SpearGuard, 2, 1),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -2, 3);

        const plans = planMoveAndAttack(state, "p1");

        expect(plans.length).toBe(0);
    });

    it("plans move-attack when exposure is non-lethal and the trade is favorable", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "e1", UnitType.Settler, 2, 0),
            mkUnit("p2", "t1", UnitType.SpearGuard, 3, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -2, 3);

        const plans = planMoveAndAttack(state, "p1");

        expect(plans.length).toBe(1);
        expect(plans[0].targetId).toBe("e1");
    });

    it("avoids zeroing a city without capture support when a unit kill is available", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p2", "c1", 0, 2)];
        state.units = [
            mkUnit("p1", "a1", UnitType.ArmyBowGuard, 0, 0),
            mkUnit("p2", "s1", UnitType.Settler, 1, 0),
        ];
        const city = state.cities[0];
        if (city) {
            city.hp = 1;
            city.maxHp = 20;
        }
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        seedTiles(state, -3, 3);

        const planned = planAttackOrderV2(state, "p1");

        expect(planned.length).toBe(1);
        expect(planned[0].targetType).toBe("Unit");
        expect(planned[0].targetId).toBe("s1");
    });

    it("scales focus capital priority with siegeCommitment", () => {
        const buildState = (civName: string, focusCity: boolean) => {
            const state = baseState();
            state.players = [mkPlayer("p1", civName), mkPlayer("p2", "RiverLeague")];
            const attacker = mkUnit("p1", "a1", UnitType.SpearGuard, 0, 0);
            const city = mkCity("p2", "c1", 0, 2);
            city.isCapital = true;
            state.units = [attacker];
            state.cities = [city];
            state.aiMemoryV2 = { p1: focusCity ? { focusCityId: "c1" } : {} } as any;
            return { state, attacker, city };
        };

        const lowFocus = buildState("ScholarKingdoms", true);
        const lowNoFocus = buildState("ScholarKingdoms", false);
        const highFocus = buildState("ForgeClans", true);
        const highNoFocus = buildState("ForgeClans", false);

        const damage = 5;
        const returnDamage = 2;

        const lowFocusScore = scoreAttackOption({
            state: lowFocus.state,
            playerId: "p1",
            attacker: lowFocus.attacker,
            targetType: "City",
            target: lowFocus.city,
            damage,
            returnDamage
        }).score;

        const lowNoFocusScore = scoreAttackOption({
            state: lowNoFocus.state,
            playerId: "p1",
            attacker: lowNoFocus.attacker,
            targetType: "City",
            target: lowNoFocus.city,
            damage,
            returnDamage
        }).score;

        const highFocusScore = scoreAttackOption({
            state: highFocus.state,
            playerId: "p1",
            attacker: highFocus.attacker,
            targetType: "City",
            target: highFocus.city,
            damage,
            returnDamage
        }).score;

        const highNoFocusScore = scoreAttackOption({
            state: highNoFocus.state,
            playerId: "p1",
            attacker: highNoFocus.attacker,
            targetType: "City",
            target: highNoFocus.city,
            damage,
            returnDamage
        }).score;

        expect(lowFocusScore).toBeGreaterThan(lowNoFocusScore);
        expect(highFocusScore).toBeGreaterThan(highNoFocusScore);
        expect(highFocusScore - highNoFocusScore).toBeGreaterThan(lowFocusScore - lowNoFocusScore);
    });

    it("increases damaged-city focus bias with higher siegeCommitment", () => {
        const buildState = (civName: string) => {
            const state = baseState();
            state.players = [mkPlayer("p1", civName), mkPlayer("p2", "RiverLeague")];
            state.cities = [
                mkCity("p1", "home", 0, 0),
                mkCity("p2", "near", 0, 2),
                mkCity("p2", "far", 0, 30),
            ];
            const far = state.cities.find(c => c.id === "far");
            if (far) {
                far.hp = 4;
                far.maxHp = 20;
            }
            return state;
        };

        const lowState = buildState("ScholarKingdoms");
        const highState = buildState("ForgeClans");

        const lowFocus = selectFocusCityAgainstTarget(lowState, "p1", "p2");
        const highFocus = selectFocusCityAgainstTarget(highState, "p1", "p2");

        expect(lowFocus?.id).toBe("near");
        expect(highFocus?.id).toBe("far");
    });

    it("scales focus proximity bonus with forceConcentration", () => {
        const buildState = (civName: string, focusCity: boolean) => {
            const state = baseState();
            state.players = [mkPlayer("p1", civName), mkPlayer("p2", "RiverLeague")];
            const attacker = mkUnit("p1", "a1", UnitType.SpearGuard, 0, 0);
            const target = mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1);
            const city = mkCity("p2", "c1", 0, 2);
            state.units = [attacker, target];
            state.cities = [city];
            state.aiMemoryV2 = { p1: focusCity ? { focusCityId: "c1" } : {} } as any;
            return { state, attacker, target };
        };

        const lowFocus = buildState("ScholarKingdoms", true);
        const lowNoFocus = buildState("ScholarKingdoms", false);
        const highFocus = buildState("ForgeClans", true);
        const highNoFocus = buildState("ForgeClans", false);

        const damage = 4;
        const returnDamage = 2;

        const lowFocusScore = scoreAttackOption({
            state: lowFocus.state,
            playerId: "p1",
            attacker: lowFocus.attacker,
            targetType: "Unit",
            target: lowFocus.target,
            damage,
            returnDamage
        }).score;

        const lowNoFocusScore = scoreAttackOption({
            state: lowNoFocus.state,
            playerId: "p1",
            attacker: lowNoFocus.attacker,
            targetType: "Unit",
            target: lowNoFocus.target,
            damage,
            returnDamage
        }).score;

        const highFocusScore = scoreAttackOption({
            state: highFocus.state,
            playerId: "p1",
            attacker: highFocus.attacker,
            targetType: "Unit",
            target: highFocus.target,
            damage,
            returnDamage
        }).score;

        const highNoFocusScore = scoreAttackOption({
            state: highNoFocus.state,
            playerId: "p1",
            attacker: highNoFocus.attacker,
            targetType: "Unit",
            target: highNoFocus.target,
            damage,
            returnDamage
        }).score;

        expect(lowFocusScore).toBeGreaterThan(lowNoFocusScore);
        expect(highFocusScore).toBeGreaterThan(highNoFocusScore);
        expect(highFocusScore - highNoFocusScore).toBeGreaterThan(lowFocusScore - lowNoFocusScore);
    });

    it("scales ranged exposure penalty with rangedCaution", () => {
        const buildState = (civName: string) => {
            const state = baseState();
            state.players = [mkPlayer("p1", civName), mkPlayer("p2", "RiverLeague")];
            const attacker = mkUnit("p1", "a1", UnitType.BowGuard, 0, 0);
            const target = mkUnit("p2", "e1", UnitType.SpearGuard, 0, 2);
            const threat1 = mkUnit("p2", "e2", UnitType.SpearGuard, 1, 0);
            const threat2 = mkUnit("p2", "e3", UnitType.SpearGuard, -1, 0);
            state.units = [attacker, target, threat1, threat2];
            return { state, attacker, target };
        };

        const cautious = buildState("ScholarKingdoms");
        const aggressive = buildState("RiverLeague");

        const cautiousScore = scoreAttackOption({
            state: cautious.state,
            playerId: "p1",
            attacker: cautious.attacker,
            targetType: "Unit",
            target: cautious.target,
            damage: 4,
            returnDamage: 0
        }).score;

        const aggressiveScore = scoreAttackOption({
            state: aggressive.state,
            playerId: "p1",
            attacker: aggressive.attacker,
            targetType: "Unit",
            target: aggressive.target,
            damage: 4,
            returnDamage: 0
        }).score;

        expect(cautiousScore).toBeLessThan(aggressiveScore);
    });

    it("boosts city attacks when follow-up capture is available", () => {
        const buildState = (withCapturer: boolean) => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            const attacker = mkUnit("p1", "a1", UnitType.BowGuard, 0, 0);
            const city = mkCity("p2", "c1", 0, 2);
            city.hp = 4;
            city.maxHp = 20;
            state.units = [attacker];
            if (withCapturer) {
                state.units.push(mkUnit("p1", "cap1", UnitType.SpearGuard, 1, 2));
            }
            state.cities = [city];
            return { state, attacker, city };
        };

        const unsupported = buildState(false);
        const supported = buildState(true);

        const baseScore = scoreAttackOption({
            state: unsupported.state,
            playerId: "p1",
            attacker: unsupported.attacker,
            targetType: "City",
            target: unsupported.city,
            damage: 5,
            returnDamage: 0
        }).score;

        const supportedScore = scoreAttackOption({
            state: supported.state,
            playerId: "p1",
            attacker: supported.attacker,
            targetType: "City",
            target: supported.city,
            damage: 5,
            returnDamage: 0
        }).score;

        expect(supportedScore).toBeGreaterThan(baseScore);
    });

    it("keeps city-only siege bonus for Trebuchet attacks", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        const city = mkCity("p2", "c1", 0, 2);
        state.cities = [city];
        const trebuchet = mkUnit("p1", "t1", UnitType.Trebuchet, 0, 0);
        const bowguard = mkUnit("p1", "b1", UnitType.BowGuard, 0, 0);
        state.units = [trebuchet, bowguard];

        const damage = 5;
        const returnDamage = 2;

        const trebScore = scoreAttackOption({
            state,
            playerId: "p1",
            attacker: trebuchet,
            targetType: "City",
            target: city,
            damage,
            returnDamage
        }).score;

        const bowScore = scoreAttackOption({
            state,
            playerId: "p1",
            attacker: bowguard,
            targetType: "City",
            target: city,
            damage,
            returnDamage
        }).score;

        expect(trebScore).toBeGreaterThan(bowScore);
    });

    it("scales risk tolerance for risky unit attacks", () => {
        const buildState = (civName: string) => {
            const state = baseState();
            state.players = [mkPlayer("p1", civName), mkPlayer("p2", "RiverLeague")];
            const attacker = mkUnit("p1", "a1", UnitType.SpearGuard, 0, 0);
            const target = mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1);
            state.units = [attacker, target];
            return { state, attacker, target };
        };

        const cautious = buildState("ScholarKingdoms");
        const aggressive = buildState("RiverLeague");

        const cautiousScore = scoreAttackOption({
            state: cautious.state,
            playerId: "p1",
            attacker: cautious.attacker,
            targetType: "Unit",
            target: cautious.target,
            damage: 2,
            returnDamage: 8
        }).score;

        const aggressiveScore = scoreAttackOption({
            state: aggressive.state,
            playerId: "p1",
            attacker: aggressive.attacker,
            targetType: "Unit",
            target: aggressive.target,
            damage: 2,
            returnDamage: 8
        }).score;

        expect(aggressiveScore).toBeGreaterThan(cautiousScore);
    });
});
