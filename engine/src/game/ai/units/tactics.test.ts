import { describe, it, expect, beforeEach } from "vitest";
import { GameState, Player, UnitType, DiplomacyState, TerrainType, UnitState, PlayerPhase } from "../../../core/types.js";
import { hexEquals, hexDistance } from "../../../core/hex.js";
import { defendCities, repositionRanged } from "./defense.js";
import { attackTargets } from "./offense.js";
import { UNITS } from "../../../core/constants.js";

// Helper to find unit by ID using manual loop (Array.find doesn't work reliably in test env)
function findUnit(units: any[], id: string): any {
    for (const u of units) {
        if (u.id === id) {
            return u;
        }
    }
    return undefined;
}

function createTestTile(coord: { q: number; r: number }, ownerId?: string) {
    return {
        coord,
        terrain: TerrainType.Plains,
        overlays: [],
        ownerId
    };
}

function createTestCity(ownerId: string, coord: { q: number; r: number }) {
    return {
        id: `city_${coord.q}_${coord.r} `,
        name: 'Test City',
        ownerId,
        coord,
        pop: 1,
        buildings: [],
        hp: 100,
        maxHp: 100,
        isCapital: false,
        storedFood: 0,
        storedProduction: 0,
        workedTiles: [],
        buildProgress: 0,
        currentBuild: null,
        hasFiredThisTurn: false,
        milestones: []
    };
}

function createTestUnit(ownerId: string, type: UnitType, coord: { q: number; r: number }) {
    return {
        id: `u_${ownerId}_${coord.q}_${coord.r}`,
        type,
        ownerId,
        coord,
        hp: 10,
        maxHp: 10,
        movesLeft: 2,
        state: UnitState.Normal,
        hasAttacked: false
    };
}

function createPlayer(id: string, civName: string = "TestCiv"): Player {
    return {
        id,
        civName,
        color: 'red',
        isAI: false,
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false
    };
}

function createGame(): GameState {
    return {
        id: 'test-game',
        turn: 1,
        players: [],
        currentPlayerId: 'p1',
        phase: PlayerPhase.Action,
        map: { width: 10, height: 10, tiles: [] },
        units: [],
        cities: [],
        seed: 123,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: []
    };
}

describe("AI Battle Tactics", () => {
    let state: GameState;
    let aiPlayer: Player;
    let humanPlayer: Player;

    beforeEach(() => {
        state = createGame();
        // Fill map with tiles
        for (let q = 0; q < 10; q++) {
            for (let r = 0; r < 10; r++) {
                state.map.tiles.push(createTestTile({ q, r }));
            }
        }

        aiPlayer = createPlayer("ai-player");
        aiPlayer.isAI = true;
        humanPlayer = createPlayer("human-player");
        state.players = [aiPlayer, humanPlayer];
        state.currentPlayerId = aiPlayer.id;
        state.diplomacy[aiPlayer.id] = { [humanPlayer.id]: DiplomacyState.War };
        state.diplomacy[humanPlayer.id] = { [aiPlayer.id]: DiplomacyState.War };
    });

    describe("Skirmishing (Kiting)", () => {
        it("should move BowGuard back to max range when threatened by melee", () => {
            // Setup: AI BowGuard at (5,5), Human SpearGuard at (5,6) - adjacent!
            // BowGuard has range 2. It should move to (5,4) or similar to be range 2 away.
            const bowGuard = createTestUnit(aiPlayer.id, UnitType.BowGuard, { q: 5, r: 5 });
            const spearGuard = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 5, r: 6 });
            state.units = [bowGuard, spearGuard];

            // Run reposition logic
            const nextState = repositionRanged(state, aiPlayer.id);
            const movedBowGuard = findUnit(nextState.units, bowGuard.id);

            expect(movedBowGuard).toBeDefined();
            // It should have moved away from the melee threat
            expect(hexEquals(movedBowGuard!.coord, { q: 5, r: 5 })).toBe(false);

            const newDist = hexDistance(movedBowGuard!.coord, spearGuard.coord);
            expect(newDist).toBe(2); // Should be at max range
        });

        it("should not move if already at safe max range", () => {
            // Setup: AI BowGuard at (5,5), Human SpearGuard at (5,7) - dist 2
            const bowGuard = createTestUnit(aiPlayer.id, UnitType.BowGuard, { q: 5, r: 5 });
            const spearGuard = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 5, r: 7 });
            state.units = [bowGuard, spearGuard];

            const nextState = repositionRanged(state, aiPlayer.id);
            const movedBowGuard = findUnit(nextState.units, bowGuard.id);

            expect(hexEquals(movedBowGuard!.coord, { q: 5, r: 5 })).toBe(true); // Should stay put
        });
    });

    describe("Capital Defense Protocol", () => {
        it("should pull units back to defend threatened Capital", () => {
            // Setup: AI Capital at (0,0). Enemy unit at (0,2).
            // AI Unit at (5,5) - far away.
            const capital = createTestCity(aiPlayer.id, { q: 0, r: 0 });
            capital.isCapital = true;
            state.cities = [capital];
            // Ensure tile exists and is owned
            const capTile = state.map.tiles.find(t => hexEquals(t.coord, { q: 0, r: 0 }));
            if (capTile) capTile.ownerId = aiPlayer.id;

            const enemy = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 0, r: 2 });
            const defender = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 5, r: 5 });
            state.units = [enemy, defender];

            // Run defense logic
            const nextState = defendCities(state, aiPlayer.id);
            const movedDefender = findUnit(nextState.units, defender.id);

            // Should have moved towards capital (0,0)
            const oldDist = hexDistance({ q: 5, r: 5 }, { q: 0, r: 0 });
            const newDist = hexDistance(movedDefender!.coord, { q: 0, r: 0 });
            expect(newDist).toBeLessThan(oldDist);
        });
    });

    describe("Smart Targeting (Focus Fire)", () => {
        it("should prioritize killing low HP unit over full HP unit", () => {
            // Setup: AI BowGuard at (0,0).
            // Enemy A (Low HP) at (0,2). Enemy B (Full HP) at (1,1). Both in range.
            const attacker = createTestUnit(aiPlayer.id, UnitType.BowGuard, { q: 0, r: 0 });
            const enemyLow = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 0, r: 2 });
            enemyLow.hp = 1; // One shot kill
            const enemyHigh = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 1, r: 1 });
            enemyHigh.hp = 10;
            state.units = [attacker, enemyLow, enemyHigh];

            const nextState = attackTargets(state, aiPlayer.id);

            // The low HP enemy should be killed (focus fire)
            const enemyLowSurvivor = findUnit(nextState.units, enemyLow.id);
            expect(enemyLowSurvivor).toBeUndefined();

            const enemyHighSurvivor = findUnit(nextState.units, enemyHigh.id);
            expect(enemyHighSurvivor).toBeDefined();
            expect(enemyHighSurvivor!.hp).toBe(10);
        });
    });
});
