import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, UnitType, TechId, DiplomacyState } from "../../../core/types.js";
import { planTacticalDefense } from "../../../game/ai2/defense-combat/tactical-defense.js";
import { assessDefenseSituation } from "../../../game/ai2/defense-situation.js";

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

describe("Tactical Defense - Garrison Attack Filtering", () => {
    it("does not include garrisoned units as attackers in focus-fire actions", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];

        // City at (0,0)
        const city = mkCity("p1", "c1", 0, 0);
        state.cities = [city];

        // Garrison unit ON the city tile (0,0) - this should NOT be an attacker
        const garrisonUnit = mkUnit("p1", "garrison1", UnitType.SpearGuard, 0, 0);

        // Ring defender at distance 1 from city - this CAN attack
        const ringDefender = mkUnit("p1", "ring1", UnitType.BowGuard, 1, 0);

        // Enemy unit adjacent to city
        const enemy = mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1);

        state.units = [garrisonUnit, ringDefender, enemy];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        seedTiles(state, -2, 2);

        const plan = planTacticalDefense(state, "p1");

        // Collect all unit IDs that are scheduled as attackers
        const attackerIds = new Set<string>();
        for (const entry of plan) {
            for (const action of entry.actions) {
                attackerIds.add(action.unitId);
            }
        }

        // The garrison unit should NOT be included as an attacker
        expect(attackerIds.has("garrison1")).toBe(false);
    });

    it("assesses defense situations for cities under threat", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];

        const city = mkCity("p1", "c1", 0, 0);
        state.cities = [city];

        // Ring defender at distance 1 from city
        const ringDefender = mkUnit("p1", "ring1", UnitType.BowGuard, 1, 0);

        // Multiple enemies near city to create threat
        const enemy1 = mkUnit("p2", "e1", UnitType.SpearGuard, 2, 0);
        const enemy2 = mkUnit("p2", "e2", UnitType.SpearGuard, 0, 2);

        state.units = [ringDefender, enemy1, enemy2];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        seedTiles(state, -3, 3);

        const plan = planTacticalDefense(state, "p1");

        // Should have at least one defense situation for our city
        expect(plan.length).toBeGreaterThanOrEqual(1);
    });
});

// Import for last-stand tests
import { planLastStandAttacks, checkCanRetreat } from "../../../game/ai2/defense-combat/last-stand.js";

describe("Last Stand - Garrison Attack Filtering", () => {
    it("does not include garrisoned units in last-stand attacks", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];

        // City at (0,0)
        const city = mkCity("p1", "c1", 0, 0);
        state.cities = [city];

        // Garrison unit ON the city tile - should not be treated as "cornered"
        const garrisonUnit = mkUnit("p1", "garrison1", UnitType.SpearGuard, 0, 0);

        // Enemy adjacent to city - creates threat
        const enemy = mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1);

        state.units = [garrisonUnit, enemy];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        seedTiles(state, -2, 2);

        const reservedUnits = new Set<string>();
        const reservedCoords = new Set<string>();
        const plans = planLastStandAttacks(state, "p1", reservedUnits, reservedCoords);

        // Garrison unit should NOT be in the last-stand plans
        const attackerIds = new Set(plans.map(p => p.unitId));
        expect(attackerIds.has("garrison1")).toBe(false);
    });
});

describe("Last Stand - Retreat Detection Fix", () => {
    // Custom tile seeder that allows specifying terrain types
    function seedTilesWithTerrain(
        state: GameState,
        min: number,
        max: number,
        terrainFn: (q: number, r: number) => string = () => "Plains"
    ) {
        for (let q = min; q <= max; q++) {
            for (let r = min; r <= max; r++) {
                state.map.tiles.push({
                    coord: { q, r },
                    terrain: terrainFn(q, r),
                    overlays: []
                } as any);
            }
        }
    }

    it("checkCanRetreat returns false when unit is blocked by water", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];

        // City on mainland at (5, 0)
        const city = mkCity("p1", "c1", 5, 0);
        state.cities = [city];

        // Unit on island at (0, 0)
        const unit = mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0);

        // Enemy also on the island at (1, 0)
        const enemy = mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0);

        state.units = [unit, enemy];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        // Create an island: (0,0) and (1,0) are Plains, everything else is Coast
        seedTilesWithTerrain(state, -3, 8, (q, r) => {
            if (q === 0 && r === 0) return "Plains";
            if (q === 1 && r === 0) return "Plains";
            if (q >= 5) return "Plains";
            return "Coast";
        });

        // CRITICAL: Add visibility for all tiles - pathfinding assumes hidden tiles are passable!
        const allTileKeys = state.map.tiles.map(t => `${t.coord.q},${t.coord.r}`);
        state.visibility = { p1: allTileKeys, p2: allTileKeys };

        const myCities = state.cities.filter(c => c.ownerId === "p1");
        const enemyIds = new Set(["p2"]);

        // Directly test checkCanRetreat
        const result = checkCanRetreat(state, unit, myCities, enemyIds);

        // Should be false - unit is on island with no path to mainland city
        expect(result).toBe(false);
    });

    it("triggers last-stand when unit is on an island (blocked by water)", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];

        // City on mainland at (5, 0)
        const city = mkCity("p1", "c1", 5, 0);
        state.cities = [city];

        // Unit on island at (0, 0)
        const unit = mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0);

        // Enemy also on the island at (1, 0) - creates threat
        const enemy = mkUnit("p2", "e1", UnitType.SpearGuard, 1, 0);

        state.units = [unit, enemy];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        // Create an island: (0,0) and (1,0) are Plains (island)
        // Everything else between the island and city is Coast (water)
        // Land units cannot cross water
        seedTilesWithTerrain(state, -3, 8, (q, r) => {
            // Island tiles
            if (q === 0 && r === 0) return "Plains";
            if (q === 1 && r === 0) return "Plains";
            // Mainland/city area
            if (q >= 5) return "Plains";
            // Everything else is water (Coast)
            return "Coast";
        });

        // CRITICAL: Add visibility for all tiles - pathfinding assumes hidden tiles are passable!
        const allTileKeys = state.map.tiles.map(t => `${t.coord.q},${t.coord.r}`);
        state.visibility = { p1: allTileKeys, p2: allTileKeys };

        const reservedUnits = new Set<string>();
        const reservedCoords = new Set<string>();
        const plans = planLastStandAttacks(state, "p1", reservedUnits, reservedCoords);

        // The unit should be cornered (no way to cross water to reach mainland city)
        const attackerIds = new Set(plans.map(p => p.unitId));
        expect(attackerIds.has("u1")).toBe(true);
    });

    it("does NOT trigger last-stand when unit has clear path to city", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];

        // City at (3, 0) - close to unit with clear path
        const city = mkCity("p1", "c1", 3, 0);
        state.cities = [city];

        // Unit at (0, 0)
        const unit = mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0);

        // Enemy adjacent to unit - creates threat but doesn't block retreat path
        const enemy = mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1);

        state.units = [unit, enemy];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        // All plains - clear path exists
        seedTiles(state, -2, 5);

        // Add visibility for all tiles - pessimistic retreat check requires visibility
        const allTileKeys = state.map.tiles.map(t => `${t.coord.q},${t.coord.r}`);
        state.visibility = { p1: allTileKeys, p2: allTileKeys };

        const reservedUnits = new Set<string>();
        const reservedCoords = new Set<string>();
        const plans = planLastStandAttacks(state, "p1", reservedUnits, reservedCoords);

        // The unit should NOT be considered cornered - has clear retreat path
        const attackerIds = new Set(plans.map(p => p.unitId));
        expect(attackerIds.has("u1")).toBe(false);
    });

    it("triggers last-stand when unit is completely surrounded by enemy units", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];

        // City at (5, 5) - unreachable due to enemy encirclement
        const city = mkCity("p1", "c1", 5, 5);
        state.cities = [city];

        // Unit at (0, 0)
        const unit = mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0);

        // Enemies surrounding the unit on all sides
        const enemies = [
            mkUnit("p2", "e1", UnitType.SpearGuard, 0, -1),
            mkUnit("p2", "e2", UnitType.SpearGuard, 1, -1),
            mkUnit("p2", "e3", UnitType.SpearGuard, 1, 0),
            mkUnit("p2", "e4", UnitType.SpearGuard, 0, 1),
            mkUnit("p2", "e5", UnitType.SpearGuard, -1, 1),
            mkUnit("p2", "e6", UnitType.SpearGuard, -1, 0),
        ];

        state.units = [unit, ...enemies];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        seedTiles(state, -3, 8);

        // Add visibility for consistency with pessimistic retreat check
        const allTileKeys = state.map.tiles.map(t => `${t.coord.q},${t.coord.r}`);
        state.visibility = { p1: allTileKeys, p2: allTileKeys };

        const reservedUnits = new Set<string>();
        const reservedCoords = new Set<string>();
        const plans = planLastStandAttacks(state, "p1", reservedUnits, reservedCoords);

        // The unit should be considered cornered due to enemy encirclement
        const attackerIds = new Set(plans.map(p => p.unitId));
        expect(attackerIds.has("u1")).toBe(true);
    });
});

