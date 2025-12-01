import { describe, it, expect, beforeEach } from "vitest";
import { GameState, Player, UnitType, TerrainType, DiplomacyState, PlayerPhase } from "../../core/types.js";
import { manageWarPreparation } from "./war-prep.js";
import { moveUnitsForPreparation } from "./units/offense.js";
import { aiWarPeaceDecision } from "../ai-decisions.js";
import { hexDistance } from "../../core/hex.js";

function createTestState(): GameState {
    return {
        id: "test",
        turn: 1,
        players: [
            { id: "player1", civName: "Civ 1", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "player2", civName: "Civ 2", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false }
        ],
        currentPlayerId: "player1",
        phase: PlayerPhase.Action,
        map: { width: 10, height: 10, tiles: [], rivers: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: { player1: [], player2: [] },
        revealed: { player1: [], player2: [] },
        diplomacy: { player1: { player2: DiplomacyState.Peace }, player2: { player1: DiplomacyState.Peace } },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: []
    };
}

function createTestCity(ownerId: string, coord: { q: number, r: number }, name: string): any {
    return {
        id: `city_${ownerId}_${coord.q}_${coord.r}`,
        name,
        ownerId,
        coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: true,
        hasFiredThisTurn: false,
        milestones: []
    };
}

function createTestUnit(ownerId: string, type: UnitType, coord: { q: number, r: number }): any {
    return {
        id: `unit_${ownerId}_${type}_${coord.q}_${coord.r}`,
        type,
        ownerId,
        coord,
        hp: 10,
        maxHp: 10,
        movesLeft: 2,
        state: "Normal",
        hasAttacked: false
    };
}

describe("AI War Preparation", () => {
    let state: GameState;
    const aiId = "player1";
    const enemyId = "player2";

    beforeEach(() => {
        state = createTestState();
        // Setup AI player
        const ai = state.players.find(p => p.id === aiId)!;
        ai.isAI = true;
        ai.civName = "AI Civ";

        // Setup Enemy player
        const enemy = state.players.find(p => p.id === enemyId)!;
        enemy.civName = "Enemy Civ";

        // Setup map tiles
        for (let q = -5; q <= 5; q++) {
            for (let r = -5; r <= 5; r++) {
                state.map.tiles.push({
                    coord: { q, r },
                    terrain: TerrainType.Plains,
                    overlays: []
                });
            }
        }

        // Place AI city
        state.cities.push(createTestCity(aiId, { q: 0, r: 0 }, "AI Capital"));

        // Place Enemy city nearby (distance 5)
        state.cities.push(createTestCity(enemyId, { q: 0, r: 5 }, "Enemy Capital"));

        // Ensure contact
        state.contacts = {
            [aiId]: { [enemyId]: true },
            [enemyId]: { [aiId]: true }
        };
    });

    it("should start preparation when war conditions are met", () => {
        // Give AI an army
        state.units.push(createTestUnit(aiId, UnitType.SpearGuard, { q: 0, r: 1 }));
        state.units.push(createTestUnit(aiId, UnitType.BowGuard, { q: 1, r: 0 }));

        // Make AI aggressive via personality mock or just rely on power calculation
        // Default aggression should trigger if we have power advantage and close distance

        // Run prep logic
        // Run prep logic
        state = manageWarPreparation(state, aiId);

        const updatedAi = state.players.find(p => p.id === aiId)!;
        expect(updatedAi.warPreparation).toBeDefined();
        expect(updatedAi.warPreparation?.targetId).toBe(enemyId);
        expect(updatedAi.warPreparation?.state).toBe("Gathering");
    });

    it("should advance to Positioning when gathered", () => {
        const ai = state.players.find(p => p.id === aiId)!;
        // Start in Gathering
        ai.warPreparation = {
            targetId: enemyId,
            state: "Gathering",
            startedTurn: state.turn - 5
        };

        // Give AI strong army
        state.units.push(createTestUnit(aiId, UnitType.SpearGuard, { q: 0, r: 1 }));
        state.units.push(createTestUnit(aiId, UnitType.BowGuard, { q: 1, r: 0 }));
        state.units.push(createTestUnit(aiId, UnitType.Riders, { q: -1, r: 1 }));

        state = manageWarPreparation(state, aiId);

        const updatedAi = state.players.find(p => p.id === aiId)!;
        expect(updatedAi.warPreparation?.state).toBe("Positioning");
    });

    it("should move units towards border during Positioning", () => {
        const ai = state.players.find(p => p.id === aiId)!;
        ai.warPreparation = {
            targetId: enemyId,
            state: "Positioning",
            startedTurn: state.turn
        };

        // Unit at AI capital (0,0) will be garrisoned.
        // Place unit outside capital (0,1)
        const unit = createTestUnit(aiId, UnitType.SpearGuard, { q: 0, r: 1 });
        state.units.push(unit);

        // Move units
        const nextState = moveUnitsForPreparation(state, aiId);
        const movedUnit = nextState.units.find(u => u.id === unit.id)!;

        // Should have moved closer to enemy (0,5)
        const distBefore = hexDistance({ q: 0, r: 1 }, { q: 0, r: 5 });
        const distAfter = hexDistance(movedUnit.coord, { q: 0, r: 5 });
        expect(distAfter).toBeLessThan(distBefore);
    });

    it("should NOT enter enemy territory during Positioning", () => {
        const ai = state.players.find(p => p.id === aiId)!;
        ai.warPreparation = {
            targetId: enemyId,
            state: "Positioning",
            startedTurn: state.turn
        };

        // Enemy city at 0,5. 
        // Let's say enemy owns 0,4.
        const enemyTile = state.map.tiles.find(t => t.coord.q === 0 && t.coord.r === 4)!;
        enemyTile.ownerId = enemyId;

        // Unit at 0,3 (adjacent to enemy territory)
        const unit = createTestUnit(aiId, UnitType.SpearGuard, { q: 0, r: 3 });
        state.units.push(unit);

        // Move units
        const nextState = moveUnitsForPreparation(state, aiId);
        const movedUnit = nextState.units.find(u => u.id === unit.id)!;

        // Should NOT have moved to 0,4
        expect(movedUnit.coord).toEqual({ q: 0, r: 3 });
    });

    it("should advance to Ready when positioned", () => {
        const ai = state.players.find(p => p.id === aiId)!;
        ai.warPreparation = {
            targetId: enemyId,
            state: "Positioning",
            startedTurn: state.turn - 5
        };

        // Place units near enemy city (border)
        // Enemy city at 0,5. Border at 0,4 (owned by enemy).
        // We place units at 0,3 and 1,3 (dist 2 and 3 from city)
        state.units.push(createTestUnit(aiId, UnitType.SpearGuard, { q: 0, r: 3 }));
        state.units.push(createTestUnit(aiId, UnitType.BowGuard, { q: 1, r: 3 }));

        state = manageWarPreparation(state, aiId);

        const updatedAi = state.players.find(p => p.id === aiId)!;
        expect(updatedAi.warPreparation?.state).toBe("Ready");
    });

    it("should declare war when Ready", () => {
        const ai = state.players.find(p => p.id === aiId)!;
        ai.warPreparation = {
            targetId: enemyId,
            state: "Ready",
            startedTurn: state.turn
        };

        // Check decision
        const decision = aiWarPeaceDecision(aiId, enemyId, state);
        expect(decision).toBe("DeclareWar");
    });

    it("should NOT declare war when Gathering or Positioning", () => {
        const ai = state.players.find(p => p.id === aiId)!;

        // Gathering
        ai.warPreparation = { targetId: enemyId, state: "Gathering", startedTurn: state.turn };
        expect(aiWarPeaceDecision(aiId, enemyId, state)).toBe("None");

        // Positioning
        ai.warPreparation = { targetId: enemyId, state: "Positioning", startedTurn: state.turn };
        expect(aiWarPeaceDecision(aiId, enemyId, state)).toBe("None");
    });

    it("should keep garrison in Capital (Risky Strategy - Odd Turn)", () => {
        const ai = state.players.find(p => p.id === aiId)!;
        ai.warPreparation = {
            targetId: enemyId,
            state: "Positioning",
            startedTurn: 1 // Odd = Risky
        };

        // Unit at Capital
        const garrison = createTestUnit(aiId, UnitType.SpearGuard, { q: 0, r: 0 });
        state.units.push(garrison);

        // Unit outside
        const mobile = createTestUnit(aiId, UnitType.SpearGuard, { q: 0, r: 1 });
        state.units.push(mobile);

        const nextState = moveUnitsForPreparation(state, aiId);

        const nextGarrison = nextState.units.find(u => u.id === garrison.id)!;
        const nextMobile = nextState.units.find(u => u.id === mobile.id)!;

        // Garrison should NOT move
        expect(nextGarrison.coord).toEqual({ q: 0, r: 0 });

        // Mobile unit SHOULD move towards enemy (0,5)
        expect(nextMobile.coord).not.toEqual({ q: 0, r: 1 });
    });

    it("should keep garrison in Threatened City (Cautious Strategy - Even Turn)", () => {
        const ai = state.players.find(p => p.id === aiId)!;
        ai.warPreparation = {
            targetId: enemyId,
            state: "Positioning",
            startedTurn: 2 // Even = Cautious
        };

        // Create a second city for AI
        const city2 = createTestCity(aiId, { q: -5, r: 0 }, "AI City 2");
        city2.isCapital = false;
        state.cities.push(city2);

        // Place enemy near City 2 (threat)
        state.units.push(createTestUnit(enemyId, UnitType.Riders, { q: -5, r: 2 }));

        // Garrison in City 2
        const garrison = createTestUnit(aiId, UnitType.SpearGuard, { q: -5, r: 0 });
        state.units.push(garrison);

        const nextState = moveUnitsForPreparation(state, aiId);
        const nextGarrison = nextState.units.find(u => u.id === garrison.id)!;

        // Garrison should stay because it's threatened and we are Cautious
        expect(nextGarrison.coord).toEqual({ q: -5, r: 0 });
    });
});
