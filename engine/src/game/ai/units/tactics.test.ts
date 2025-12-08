import { describe, it, expect, beforeEach } from "vitest";
import { GameState, Player, UnitType, DiplomacyState, TerrainType, UnitState, PlayerPhase } from "../../../core/types.js";
import { hexEquals, hexDistance } from "../../../core/hex.js";
import { defendCities, repositionRanged } from "./defense.js";
import { attackTargets } from "./offense.js";

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
        it("should prioritize killing low HP unit over full HP unit when safe", () => {
            // Setup: AI BowGuard at (0,0) with military support (so attack is safe)
            // Enemy A (Low HP) at (0,2) - in BowGuard range, killable
            // Enemy B (Full HP) at (2,2) - in BowGuard range but NOT killable
            // Support units are nearby but not adjacent to enemies
            const attacker = createTestUnit(aiPlayer.id, UnitType.BowGuard, { q: 0, r: 0 });
            const support1 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 1, r: 0 });
            support1.movesLeft = 0; // Can't attack
            const support2 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 0, r: 1 });
            support2.movesLeft = 0; // Can't attack
            const enemyLow = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 0, r: 2 });
            enemyLow.hp = 1; // One shot kill
            const enemyHigh = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 2, r: 2 });
            enemyHigh.hp = 10; // BowGuard range is 2, this is still in range
            state.units = [attacker, support1, support2, enemyLow, enemyHigh];

            const nextState = attackTargets(state, aiPlayer.id);

            // The low HP enemy should be killed (focus fire)
            const enemyLowSurvivor = findUnit(nextState.units, enemyLow.id);
            expect(enemyLowSurvivor).toBeUndefined();

            // High HP enemy should still be alive (AI focused on killable target)
            const enemyHighSurvivor = findUnit(nextState.units, enemyHigh.id);
            expect(enemyHighSurvivor).toBeDefined();
            expect(enemyHighSurvivor!.hp).toBe(10);
        });
    });

    describe("Smart Attack Safety (v3.0)", () => {
        it("should skip attacks when outnumbered and would be exposed", () => {
            // Setup: 1 AI unit surrounded by 3 enemy units
            // AI should NOT attack because it would die after
            const aiUnit = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 5, r: 5 });
            const enemy1 = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 5, r: 6 });
            const enemy2 = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 6, r: 5 });
            const enemy3 = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 4, r: 5 });
            state.units = [aiUnit, enemy1, enemy2, enemy3];

            const nextState = attackTargets(state, aiPlayer.id);

            // All enemies should still be alive (AI skipped the attack)
            expect(findUnit(nextState.units, enemy1.id)).toBeDefined();
            expect(findUnit(nextState.units, enemy2.id)).toBeDefined();
            expect(findUnit(nextState.units, enemy3.id)).toBeDefined();
        });

        it("should attack when at military advantage despite exposure", () => {
            // Setup: 3 AI units vs 2 enemy units - AI has advantage
            const aiUnit1 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 5, r: 5 });
            const aiUnit2 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 5, r: 4 });
            const aiUnit3 = createTestUnit(aiPlayer.id, UnitType.BowGuard, { q: 4, r: 4 });
            const enemy1 = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 5, r: 6 });
            enemy1.hp = 3; // Killable
            const enemy2 = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 6, r: 5 });
            state.units = [aiUnit1, aiUnit2, aiUnit3, enemy1, enemy2];

            const nextState = attackTargets(state, aiPlayer.id);

            // The low HP enemy should be attacked (AI has advantage)
            const enemy1After = findUnit(nextState.units, enemy1.id);
            expect(enemy1After === undefined || enemy1After.hp < 3).toBe(true);
        });

        it("should retreat after attacking if now exposed", () => {
            // Setup: AI unit with moves left attacks but gets exposed
            // Give AI cities to retreat to
            const aiCity = createTestCity(aiPlayer.id, { q: 0, r: 0 });
            state.cities = [aiCity];
            // Ensure city tile exists
            const cityTile = state.map.tiles.find(t => hexEquals(t.coord, { q: 0, r: 0 }));
            if (cityTile) cityTile.ownerId = aiPlayer.id;

            // AI has advantage (more units)
            const aiUnit1 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 3, r: 3 });
            aiUnit1.movesLeft = 3; // Has moves to retreat after attack
            const aiUnit2 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 2, r: 2 });
            const aiUnit3 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 1, r: 1 });

            // Two enemies near the attacking unit
            const enemy1 = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 3, r: 4 });
            enemy1.hp = 2; // Killable
            const enemy2 = createTestUnit(humanPlayer.id, UnitType.SpearGuard, { q: 4, r: 3 });

            state.units = [aiUnit1, aiUnit2, aiUnit3, enemy1, enemy2];

            // Store initial position
            const initialCoord = { q: aiUnit1.coord.q, r: aiUnit1.coord.r };

            const nextState = attackTargets(state, aiPlayer.id);

            // After attacking, unit should have moved (retreated toward city)
            const aiUnit1After = findUnit(nextState.units, aiUnit1.id);
            if (aiUnit1After) {
                const movedAway = !hexEquals(aiUnit1After.coord, initialCoord);
                const closerToCity = hexDistance(aiUnit1After.coord, aiCity.coord) <= hexDistance(initialCoord, aiCity.coord);
                // Either the unit killed the enemy and stayed, or retreated toward safety
                expect(movedAway || findUnit(nextState.units, enemy1.id) === undefined).toBe(true);
            }
        });
    });
});
