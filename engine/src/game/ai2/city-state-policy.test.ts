import { describe, expect, it } from "vitest";
import { CityState, DiplomacyState, GameState, PlayerPhase, TerrainType, UnitState, UnitType } from "../../core/types.js";
import { getOffensiveCityStateOwnerIds, getOffensiveEnemyIds, pickCityStateInvestmentTarget } from "./city-state-policy.js";
import { getWarEnemyIds } from "./schema.js";

function createBaseState(): GameState {
    const tiles = [];
    for (let q = -2; q <= 8; q++) {
        for (let r = -2; r <= 8; r++) {
            tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: [],
            });
        }
    }

    return {
        id: "city-state-policy-test",
        turn: 60,
        players: [
            {
                id: "p1",
                civName: "ScholarKingdoms",
                color: "#fff",
                isAI: true,
                aiGoal: "Progress",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: "Hearth",
                treasury: 220,
                grossGold: 20,
                buildingUpkeep: 4,
                militaryUpkeep: 4,
                netGold: 12,
                usedSupply: 4,
                freeSupply: 6,
            },
            {
                id: "p2",
                civName: "ForgeClans",
                color: "#000",
                isAI: true,
                aiGoal: "Conquest",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: "Hearth",
                treasury: 180,
                grossGold: 15,
                buildingUpkeep: 3,
                militaryUpkeep: 3,
                netGold: 9,
                usedSupply: 3,
                freeSupply: 6,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 20,
            height: 20,
            tiles,
        },
        units: [],
        cities: [
            {
                id: "c1",
                name: "Capital",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            },
            {
                id: "c2",
                name: "EnemyCap",
                ownerId: "p2",
                coord: { q: 7, r: 0 },
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 7, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ],
        seed: 1,
        visibility: { p1: [], p2: [] },
        revealed: { p1: [], p2: [] },
        diplomacy: {
            p1: { p2: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.Peace },
        },
        sharedVision: { p1: {}, p2: {} },
        contacts: { p1: {}, p2: {} },
        diplomacyOffers: [],
        nativeCamps: [],
        cityStates: [],
        cityStateTypeCycleIndex: 0,
    };
}

function createCityState(
    id: string,
    ownerId: string,
    cityId: string,
    coord: { q: number; r: number },
    yieldType: CityState["yieldType"],
    overrides?: Partial<CityState>
): CityState {
    return {
        id,
        ownerId,
        cityId,
        coord,
        name: id,
        yieldType,
        influenceByPlayer: { p1: 0, p2: 0 },
        investmentCountByPlayer: { p1: 0, p2: 0 },
        lastInvestTurnByPlayer: { p1: -1, p2: -1 },
        suzerainId: "p2",
        discoveredByPlayer: { p1: true, p2: true },
        lastReinforcementTurn: 0,
        warByPlayer: { p1: false, p2: false },
        ...overrides,
    };
}

describe("city-state-policy", () => {
    it("prioritizes Science city-states for Progress investment decisions", () => {
        const state = createBaseState();
        state.cityStates = [
            createCityState("science-cs", "cs_owner_1", "cs-city-1", { q: 3, r: 0 }, "Science", {
                influenceByPlayer: { p1: 6, p2: 22 },
            }),
            createCityState("prod-cs", "cs_owner_2", "cs-city-2", { q: 3, r: 1 }, "Production", {
                influenceByPlayer: { p1: 6, p2: 22 },
            }),
        ];

        const choice = pickCityStateInvestmentTarget(state, "p1", "Progress");
        expect(choice?.cityStateId).toBe("science-cs");
    });

    it("respects reserve safety for non-critical investments", () => {
        const state = createBaseState();
        const p1 = state.players.find(player => player.id === "p1")!;
        p1.treasury = 52;
        p1.netGold = 1;
        state.units = [
            {
                id: "u1",
                type: UnitType.SpearGuard,
                ownerId: "p1",
                coord: { q: 1, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "u2",
                type: UnitType.BowGuard,
                ownerId: "p1",
                coord: { q: 1, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ];
        state.cityStates = [
            createCityState("gold-cs", "cs_owner_3", "cs-city-3", { q: 4, r: 0 }, "Gold", {
                influenceByPlayer: { p1: 0, p2: 18 },
                suzerainId: "p2",
            }),
        ];

        const choice = pickCityStateInvestmentTarget(state, "p1", "Balanced");
        expect(choice).toBeUndefined();
    });

    it("allows defensive maintenance investments below reserve floor", () => {
        const state = createBaseState();
        const p1 = state.players.find(player => player.id === "p1")!;
        p1.treasury = 52;
        p1.netGold = 0;

        state.cityStates = [
            createCityState("frontier-cs", "cs_owner_4", "cs-city-4", { q: 2, r: 0 }, "Gold", {
                suzerainId: "p1",
                influenceByPlayer: { p1: 30, p2: 40 },
            }),
        ];

        const choice = pickCityStateInvestmentTarget(state, "p1", "Balanced");
        expect(choice?.cityStateId).toBe("frontier-cs");
    });

    it("identifies opportunistic city-state war targets when local power is favorable", () => {
        const state = createBaseState();
        const p1 = state.players.find(player => player.id === "p1")!;
        p1.aiGoal = "Conquest";

        state.units = [
            {
                id: "a1",
                type: UnitType.ArmySpearGuard,
                ownerId: "p1",
                coord: { q: 2, r: 0 },
                hp: 18,
                maxHp: 18,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "a2",
                type: UnitType.ArmyBowGuard,
                ownerId: "p1",
                coord: { q: 2, r: 1 },
                hp: 18,
                maxHp: 18,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "d1",
                type: UnitType.SpearGuard,
                ownerId: "cs_owner_5",
                coord: { q: 4, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
                cityStateId: "cs5",
            },
        ];
        state.cityStates = [
            createCityState("cs5", "cs_owner_5", "cs-city-5", { q: 4, r: 0 }, "Production", {
                suzerainId: undefined,
                influenceByPlayer: { p1: 0, p2: 0 },
            }),
        ];
        state.cities.push({
            id: "cs-city-5",
            name: "cs-city-5",
            ownerId: "cs_owner_5",
            coord: { q: 4, r: 0 },
            pop: 2,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 4, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: false,
            hasFiredThisTurn: false,
            milestones: [],
        });

        const targets = getOffensiveCityStateOwnerIds(state, "p1", "Conquest");
        expect(targets.has("cs_owner_5")).toBe(true);
    });

    it("treats active city-state wars as valid war enemies", () => {
        const state = createBaseState();
        state.cityStates = [
            createCityState("cs-war", "cs_owner_war", "cs-city-war", { q: 5, r: 1 }, "Science", {
                warByPlayer: { p1: true, p2: false },
            }),
        ];

        const enemies = getWarEnemyIds(state, "p1");
        expect(enemies.has("cs_owner_war")).toBe(true);
    });

    it("merges major-war and opportunistic city-state enemies for offense planning", () => {
        const state = createBaseState();
        state.players.find(player => player.id === "p1")!.aiGoal = "Conquest";
        state.diplomacy.p1.p2 = DiplomacyState.War;
        state.diplomacy.p2.p1 = DiplomacyState.War;
        state.units = [
            {
                id: "a1",
                type: UnitType.ArmySpearGuard,
                ownerId: "p1",
                coord: { q: 2, r: 0 },
                hp: 18,
                maxHp: 18,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "a2",
                type: UnitType.ArmyBowGuard,
                ownerId: "p1",
                coord: { q: 2, r: 1 },
                hp: 18,
                maxHp: 18,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "d1",
                type: UnitType.SpearGuard,
                ownerId: "cs_owner_7",
                coord: { q: 4, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
                cityStateId: "cs7",
            },
        ];
        state.cityStates = [
            createCityState("cs7", "cs_owner_7", "cs-city-7", { q: 4, r: 0 }, "Production", {
                suzerainId: undefined,
                influenceByPlayer: { p1: 0, p2: 0 },
            }),
        ];
        state.cities.push({
            id: "cs-city-7",
            name: "cs-city-7",
            ownerId: "cs_owner_7",
            coord: { q: 4, r: 0 },
            pop: 2,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 4, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: false,
            hasFiredThisTurn: false,
            milestones: [],
        });

        const enemies = getOffensiveEnemyIds(state, "p1", "Conquest");
        expect(enemies.has("p2")).toBe(true);
        expect(enemies.has("cs_owner_7")).toBe(true);
    });
});
