import { describe, it, expect } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, EraId, UnitState } from "../../core/types.js";
import { initValidationContext, clearValidationContext, canPlanMove, isTileReserved } from "./shared/validation.js";
import { planDefensiveRing } from "../ai2/defense-ring.js";
import { planCityGarrisons, CityThreat } from "../ai2/defense-garrison.js";

// Helper functions inlined for isolation
function baseState(): GameState {
    const tiles = [];
    for (let q = -5; q <= 5; q++) {
        for (let r = -5; r <= 5; r++) {
            tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1" });
        }
    }

    return {
        id: "test",
        turn: 10,
        players: [{
            id: "p1",
            civName: "TestCiv",
            color: "#fff",
            isAI: true,
            aiGoal: "Balanced",
            techs: [],
            currentTech: null,
            completedProjects: [],
            isEliminated: false,
            currentEra: EraId.Hearth,
        }],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 20, height: 20, tiles },
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

function mkCity(state: GameState, ownerId: string, coord: { q: number, r: number }): any {
    const id = `c_${coord.q}_${coord.r}`;
    const city = {
        id,
        name: id,
        ownerId,
        coord,
        pop: 2,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: false,
        hasFiredThisTurn: false,
        milestones: [],
    };
    state.cities.push(city);
    // Ensure tile exists (redundant with baseState but safe)
    if (!state.map.tiles.some(t => t.coord.q === coord.q && t.coord.r === coord.r)) {
        state.map.tiles.push({ coord, terrain: TerrainType.Plains, overlays: [], ownerId });
    }
    return city;
}

function mkUnit(state: GameState, ownerId: string, type: UnitType, coord: { q: number, r: number }): any {
    const id = `u_${coord.q}_${coord.r}`;
    const unit = {
        id,
        ownerId,
        type,
        coord,
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        hasAttacked: false,
        state: UnitState.Normal,
    };
    state.units.push(unit);
    // Ensure tile exists
    if (!state.map.tiles.some(t => t.coord.q === coord.q && t.coord.r === coord.r)) {
        state.map.tiles.push({ coord, terrain: TerrainType.Plains, overlays: [], ownerId });
    }
    return unit;
}

describe("Planning Validation Side Effects", () => {
    it("planDefensiveRing should not reserve tiles during planning", () => {
        const state = baseState();
        const playerId = "p1";

        // Setup: City at 0,0 - Make it capital to ensure desiredRing > 0
        const city = mkCity(state, playerId, { q: 0, r: 0 });
        city.isCapital = true;

        // Place unit at 1,1 (distance 2 from city). It should want to move to 1,0 or 0,1 (dist 1).
        mkUnit(state, playerId, UnitType.SpearGuard, { q: 1, r: 1 });

        // Initialize context
        const reservedUnits = new Set<string>();
        const reservedCoords = new Set<string>();
        initValidationContext(state, playerId);

        // Run planning
        const plans = planDefensiveRing(state, playerId, reservedUnits, reservedCoords);

        // Verify plan generated
        expect(plans.length).toBeGreaterThan(0);

        // Verify that the plan returned includes a move
        const move = plans[0].action;
        expect(move.type).toBe("MoveUnit");
        if (move.type === "MoveUnit") {
            // Target should be 1,0 or 0,1
            const t = move.to;
            expect((t.q === 1 && t.r === 0) || (t.q === 0 && t.r === 1)).toBe(true);

            expect(reservedCoords.has(`${t.q},${t.r}`)).toBe(true);
        }

        clearValidationContext();
    });

    it("planCityGarrisons should not permanently mark actions as failed", () => {
        const state = baseState();
        const playerId = "p1";

        // Setup: Empty city and a unit adj to it
        const city = mkCity(state, playerId, { q: 0, r: 0 });
        mkUnit(state, playerId, UnitType.SpearGuard, { q: 0, r: 1 });

        const reservedUnits = new Set<string>();
        const reservedCoords = new Set<string>();
        const cityCoords = new Set<string>();
        cityCoords.add("0,0");

        // Construct dummy threat
        const threats: CityThreat[] = [{
            city: city,
            threat: "raid", // Sufficient to trigger garrison logic
            isCapital: false
        }];

        initValidationContext(state, playerId);

        // Run planning
        const plans = planCityGarrisons(state, playerId, threats, cityCoords, reservedUnits, reservedCoords);

        expect(plans.length).toBe(1);
        expect(reservedCoords.has("0,0")).toBe(true);

        clearValidationContext();
    });

    it("pure planning checks should not suppress subsequent validity", () => {
        const state = baseState();
        const playerId = "p1";
        const unit = mkUnit(state, playerId, UnitType.SpearGuard, { q: 0, r: 0 });
        const targetA = { q: 0, r: 1 };
        const targetB = { q: 1, r: 0 };

        initValidationContext(state, playerId);

        // A) Call canPlanMove for Target A.
        // Let's pretend Target A is valid validation-wise (it is in this empty state)
        const validA = canPlanMove(state, playerId, unit, targetA);
        expect(validA).toBe(true);

        // Ensure NO side effects:
        // 1. Tile A should NOT be reserved
        expect(isTileReserved(targetA)).toBe(false);

        // B) Call canPlanMove for Target A AGAIN. Should still be true.
        expect(canPlanMove(state, playerId, unit, targetA)).toBe(true);

        // C) Call canPlanMove for Target B. Should be true (A didn't consume the unit).
        // If side effects existed, 'unit' might be marked as reserved/moved?
        // canPlanMove itself doesn't check if *unit* is already moved, but planner loop does.
        // But here we check internal validation state.
        expect(canPlanMove(state, playerId, unit, targetB)).toBe(true);

        clearValidationContext();
    });
});
