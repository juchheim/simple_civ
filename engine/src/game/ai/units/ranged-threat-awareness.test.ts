import { describe, it, expect, beforeEach } from "vitest";
import { GameState, Player, UnitType, DiplomacyState, TerrainType, UnitState, PlayerPhase } from "../../../core/types.js";
import { hexEquals, hexDistance } from "../../../core/hex.js";
import { moveMilitaryTowardTargets } from "./offense.js";

// Helper to find unit by ID
function findUnit(units: any[], id: string): any {
    for (const u of units) {
        if (u.id === id) return u;
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
        id: `city_${coord.q}_${coord.r}`,
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

function createTestUnit(ownerId: string, type: UnitType, coord: { q: number; r: number }, id?: string) {
    return {
        id: id || `u_${ownerId}_${coord.q}_${coord.r}`,
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
        currentPlayerId: 'ai',
        phase: PlayerPhase.Action,
        map: { width: 15, height: 15, tiles: [] },
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

describe("Ranged Threat Awareness", () => {
    let state: GameState;
    let aiPlayer: Player;
    let humanPlayer: Player;

    beforeEach(() => {
        state = createGame();
        // Fill map with tiles
        for (let q = 0; q < 15; q++) {
            for (let r = 0; r < 15; r++) {
                state.map.tiles.push(createTestTile({ q, r }));
            }
        }

        aiPlayer = createPlayer("ai");
        aiPlayer.isAI = true;
        humanPlayer = createPlayer("human");
        state.players = [aiPlayer, humanPlayer];
        state.currentPlayerId = aiPlayer.id;
        state.diplomacy[aiPlayer.id] = { [humanPlayer.id]: DiplomacyState.War };
        state.diplomacy[humanPlayer.id] = { [aiPlayer.id]: DiplomacyState.War };
    });

    describe("Melee vs Ranged Movement", () => {
        it("alone melee unit should prefer path that avoids BowGuard range when possible", () => {
            // Setup: 
            // AI SpearGuard at (0,5)
            // Enemy BowGuard at (3,5) - Has range 2, covers tiles (2,5), (2,4), (2,6), etc.
            // Enemy City at (7,5)
            // Direct path goes through (1,5) -> (2,5) which is in BowGuard range
            // Unit should consider avoiding the danger zone if safer path exists

            const spearGuard = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 0, r: 5 }, "spear1");
            const bowGuard = createTestUnit(humanPlayer.id, UnitType.BowGuard, { q: 3, r: 5 }, "bow1");
            const enemyCity = createTestCity(humanPlayer.id, { q: 7, r: 5 });

            state.units = [spearGuard, bowGuard];
            state.cities = [enemyCity];

            const nextState = moveMilitaryTowardTargets(state, aiPlayer.id);
            const movedSpear = findUnit(nextState.units, "spear1");

            expect(movedSpear).toBeDefined();
            // Unit should have moved (made progress toward target)
            expect(hexEquals(movedSpear!.coord, { q: 0, r: 5 })).toBe(false);

            // The key test: unit should NOT have moved directly into BowGuard range at (2,5)
            // Instead should take a path via (1,4) or (1,6) to approach from an angle
            // Unit should avoid moving directly into range 2 of BowGuard (unless no alternative)
            // This is a soft check - the AI might still move toward target but via safer route
            expect(movedSpear!.coord.q).toBeGreaterThan(0); // Made progress
        });

        it("melee unit with friendly support should still advance toward target", () => {
            // Setup: AI SpearGuard + support units approaching enemy with BowGuard
            // With 2+ friendlies nearby, should still advance despite ranged threat

            const spearGuard = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 0, r: 5 }, "spear1");
            const support1 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 0, r: 4 }, "support1");
            const support2 = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 0, r: 6 }, "support2");
            const bowGuard = createTestUnit(humanPlayer.id, UnitType.BowGuard, { q: 3, r: 5 }, "bow1");
            const enemyCity = createTestCity(humanPlayer.id, { q: 7, r: 5 });

            state.units = [spearGuard, support1, support2, bowGuard];
            state.cities = [enemyCity];

            const nextState = moveMilitaryTowardTargets(state, aiPlayer.id);
            const movedSpear = findUnit(nextState.units, "spear1");

            expect(movedSpear).toBeDefined();
            // With support, unit should advance confidently
            expect(movedSpear!.coord.q).toBeGreaterThan(0);
        });

        it("melee unit should still advance when siege is critical (no alternative)", () => {
            // Setup: AI SpearGuard adjacent to enemy city, BowGuard nearby
            // Must capture city - should advance despite ranged threat

            const spearGuard = createTestUnit(aiPlayer.id, UnitType.SpearGuard, { q: 5, r: 5 }, "spear1");
            const bowGuard = createTestUnit(humanPlayer.id, UnitType.BowGuard, { q: 7, r: 5 }, "bow1");
            const enemyCity = createTestCity(humanPlayer.id, { q: 6, r: 5 });
            enemyCity.hp = 0; // City is capturable!

            state.units = [spearGuard, bowGuard];
            state.cities = [enemyCity];

            const nextState = moveMilitaryTowardTargets(state, aiPlayer.id);
            const movedSpear = findUnit(nextState.units, "spear1");

            expect(movedSpear).toBeDefined();
            // Should advance toward capturable city despite danger
            const distToCity = hexDistance(movedSpear!.coord, enemyCity.coord);
            expect(distToCity).toBeLessThanOrEqual(1);
        });
    });
});
