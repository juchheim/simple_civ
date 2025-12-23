import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";
import { getCombatPreviewUnitVsCity } from "./helpers/combat-preview.js";

describe("Multi-Unit Garrison Retaliation (v6.7)", () => {
    let state: GameState;

    beforeEach(() => {
        state = {
            id: "test-game",
            turn: 1,
            players: [
                { id: "p1", civName: "Civ1", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: 1 },
                { id: "p2", civName: "Civ2", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: 1 },
            ],
            currentPlayerId: "p2",
            phase: PlayerPhase.Action,
            map: {
                width: 10,
                height: 10,
                tiles: [
                    { coord: { q: 5, r: 5 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 5, r: 6 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 5, r: 7 }, terrain: TerrainType.Plains, overlays: [] },
                ],
            },
            units: [],
            cities: [],
            seed: 123,
            visibility: {},
            revealed: {},
            diplomacy: {
                "p1": { "p2": DiplomacyState.War },
                "p2": { "p1": DiplomacyState.War }
            },
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
        };
    });

    it("should pick ranged garrison for retaliation when both melee and ranged units in city", () => {
        // City with BOTH SpearGuard (melee) and ArmyBowGuard (ranged) garrison
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 50,
            maxHp: 50,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Melee garrison (added first - would previously be selected)
        state.units.push({
            id: "u_melee_garrison",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Ranged garrison (added second - should be selected for best retaliation)
        state.units.push({
            id: "u_ranged_garrison",
            type: UnitType.ArmyBowGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 15,
            maxHp: 15,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Attacker at range 2
        state.units.push({
            id: "u_attacker",
            type: UnitType.ArmyBowGuard,
            ownerId: "p2",
            coord: { q: 5, r: 7 },
            hp: 15,
            maxHp: 15,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Attack the city
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;

        // With the fix, the ranged garrison (range 2) should retaliate at distance 2
        // Without the fix, the melee garrison (range 1) would be selected and couldn't retaliate
        expect(attacker.hp).toBeLessThan(15);
        console.log(`Attacker HP after attack: ${attacker.hp} (was 15) - ranged garrison retaliated!`);
    });

    it("combat preview should show return damage when ranged garrison present among multiple units", () => {
        // City with both melee and ranged units
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 50,
            maxHp: 50,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Melee garrison (added first)
        state.units.push({
            id: "u_melee_garrison",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Ranged garrison (added second)
        state.units.push({
            id: "u_ranged_garrison",
            type: UnitType.ArmyBowGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 15,
            maxHp: 15,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Attacker at range 2
        const attacker = {
            id: "u_attacker",
            type: UnitType.ArmyBowGuard,
            ownerId: "p2",
            coord: { q: 5, r: 7 },
            hp: 15,
            maxHp: 15,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        };
        state.units.push(attacker);

        const city = state.cities[0];
        const preview = getCombatPreviewUnitVsCity(state, attacker, city);

        console.log("Preview returnDamage:", preview.returnDamage);

        // Combat preview should show return damage since ranged garrison can reach
        expect(preview.returnDamage).not.toBeNull();
        expect(preview.returnDamage!.avg).toBeGreaterThan(0);
    });
});
