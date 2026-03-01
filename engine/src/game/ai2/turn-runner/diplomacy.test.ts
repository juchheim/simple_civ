import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase } from "../../../core/types.js";
import { computeCityStateInvestmentCadence, runDiplomacy } from "./diplomacy.js";
import { EconomySnapshot } from "../economy/budget.js";
import { setAiMemoryV2 } from "../memory.js";

function createBaseState(): GameState {
    return {
        id: "ai2-diplomacy-turn-runner-test",
        turn: 70,
        players: [
            {
                id: "p1",
                civName: "ScholarKingdoms",
                color: "#fff",
                isAI: true,
                aiGoal: "Balanced",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: "Hearth",
                treasury: 200,
                grossGold: 20,
                buildingUpkeep: 4,
                militaryUpkeep: 4,
                netGold: 8,
                usedSupply: 4,
                freeSupply: 8,
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
                treasury: 150,
                grossGold: 14,
                buildingUpkeep: 4,
                militaryUpkeep: 4,
                netGold: 6,
                usedSupply: 4,
                freeSupply: 8,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 20,
            height: 20,
            tiles: [],
        },
        units: [],
        cities: [],
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

function economySnapshot(overrides: Partial<EconomySnapshot>): EconomySnapshot {
    return {
        grossGold: 20,
        buildingUpkeep: 4,
        militaryUpkeep: 4,
        netGold: 8,
        treasury: 300,
        reserveFloor: 80,
        deficitRiskTurns: Number.POSITIVE_INFINITY,
        economyState: "Healthy",
        spendableTreasury: 220,
        usedSupply: 4,
        freeSupply: 8,
        upkeepRatio: 0.4,
        atWar: false,
        ...overrides,
    };
}

function addCityState(
    state: GameState,
    input: {
        id: string;
        myInfluence?: number;
        rivalInfluence?: number;
        suzerainId?: string;
        discovered?: boolean;
        atWar?: boolean;
        investedThisTurn?: boolean;
        lastSuzerainChangeTurn?: number;
        recentSuzerainChangeCount?: number;
        lastSuzerainChangeCause?: "Investment" | "PassiveContestation" | "WartimeRelease" | "WarBreak" | "Other";
        lastSuzerainHolderId?: string;
        recentSuzerainPairKey?: string;
        recentSuzerainPairChangeCount?: number;
        recentSuzerainPairTurn?: number;
    },
): void {
    const myInfluence = input.myInfluence ?? 0;
    const rivalInfluence = input.rivalInfluence ?? 0;
    state.cityStates?.push({
        id: input.id,
        ownerId: `cs_owner_${input.id}`,
        cityId: `cs_city_${input.id}`,
        coord: { q: state.cityStates.length + 1, r: 0 },
        name: input.id,
        yieldType: "Science",
        influenceByPlayer: { p1: myInfluence, p2: rivalInfluence },
        investmentCountByPlayer: { p1: 0, p2: 0 },
        lastInvestTurnByPlayer: { p1: input.investedThisTurn ? state.turn : -1, p2: -1 },
        suzerainId: input.suzerainId,
        lockedControllerId: undefined,
        discoveredByPlayer: { p1: input.discovered ?? true, p2: true },
        lastReinforcementTurn: 0,
        warByPlayer: { p1: input.atWar ?? false, p2: false },
        lastSuzerainChangeTurn: input.lastSuzerainChangeTurn,
        recentSuzerainChangeCount: input.recentSuzerainChangeCount,
        lastSuzerainChangeCause: input.lastSuzerainChangeCause,
        lastSuzerainHolderId: input.lastSuzerainHolderId,
        recentSuzerainPairKey: input.recentSuzerainPairKey,
        recentSuzerainPairChangeCount: input.recentSuzerainPairChangeCount,
        recentSuzerainPairTurn: input.recentSuzerainPairTurn,
    });
}

describe("computeCityStateInvestmentCadence", () => {
    it("returns 0 when no city-state is currently investable", () => {
        const state = createBaseState();
        addCityState(state, { id: "cs1", discovered: false });
        addCityState(state, { id: "cs2", atWar: true });
        addCityState(state, { id: "cs3", investedThisTurn: true });

        const cadence = computeCityStateInvestmentCadence(state, "p1", undefined, economySnapshot({}));
        expect(cadence).toBe(0);
    });

    it("scales to 5 investments in healthy, high-pressure races", () => {
        const state = createBaseState();
        addCityState(state, { id: "cs1", myInfluence: 8, rivalInfluence: 28, suzerainId: "p2" });
        addCityState(state, { id: "cs2", myInfluence: 6, rivalInfluence: 26, suzerainId: "p2" });
        addCityState(state, { id: "cs3", myInfluence: 10, rivalInfluence: 30, suzerainId: "p2" });
        addCityState(state, { id: "cs4", myInfluence: 11, rivalInfluence: 31, suzerainId: "p2" });
        addCityState(state, { id: "cs5", myInfluence: 3, rivalInfluence: 20, suzerainId: "p2" });

        const cadence = computeCityStateInvestmentCadence(
            state,
            "p1",
            undefined,
            economySnapshot({ economyState: "Healthy", spendableTreasury: 520, netGold: 20 }),
        );
        expect(cadence).toBe(5);
    });

    it("stays conservative in guarded economy without pressure", () => {
        const state = createBaseState();
        addCityState(state, { id: "cs1", myInfluence: 0, rivalInfluence: 120, suzerainId: "p2" });
        addCityState(state, { id: "cs2", myInfluence: 4, rivalInfluence: 90, suzerainId: "p2" });

        const cadence = computeCityStateInvestmentCadence(
            state,
            "p1",
            undefined,
            economySnapshot({ economyState: "Guarded", spendableTreasury: 120, netGold: 3 }),
        );
        expect(cadence).toBe(1);
    });

    it("commits two spends in guarded economy when a focus campaign exists", () => {
        const state = createBaseState();
        addCityState(state, { id: "cs1", myInfluence: 0, rivalInfluence: 120, suzerainId: "p2" });
        addCityState(state, { id: "cs2", myInfluence: 4, rivalInfluence: 90, suzerainId: "p2" });

        const cadence = computeCityStateInvestmentCadence(
            state,
            "p1",
            "cs1",
            economySnapshot({ economyState: "Guarded", spendableTreasury: 120, netGold: 3 }),
        );
        expect(cadence).toBe(2);
    });

    it("does not force extra cadence for a purely defensive focus campaign", () => {
        const state = createBaseState();
        addCityState(state, { id: "cs1", myInfluence: 30, rivalInfluence: 18, suzerainId: "p1" });
        addCityState(state, { id: "cs2", myInfluence: 0, rivalInfluence: 100, suzerainId: "p2" });

        const cadence = computeCityStateInvestmentCadence(
            state,
            "p1",
            "cs1",
            economySnapshot({ economyState: "Guarded", spendableTreasury: 160, netGold: 4 }),
        );
        expect(cadence).toBe(1);
    });

    it("clamps to one investment in crisis", () => {
        const state = createBaseState();
        addCityState(state, { id: "cs1", myInfluence: 8, rivalInfluence: 28, suzerainId: "p2" });
        addCityState(state, { id: "cs2", myInfluence: 6, rivalInfluence: 26, suzerainId: "p2" });
        addCityState(state, { id: "cs3", myInfluence: 10, rivalInfluence: 30, suzerainId: "p2" });

        const cadence = computeCityStateInvestmentCadence(
            state,
            "p1",
            "cs1",
            economySnapshot({ economyState: "Crisis", spendableTreasury: 500, netGold: 15 }),
        );
        expect(cadence).toBe(1);
    });

    it("caps upkeep spending when already controlling city-states and no races are contested", () => {
        const state = createBaseState();
        addCityState(state, { id: "cs1", myInfluence: 36, rivalInfluence: 4, suzerainId: "p1" });
        addCityState(state, { id: "cs2", myInfluence: 32, rivalInfluence: 3, suzerainId: "p1" });
        addCityState(state, { id: "cs3", myInfluence: 0, rivalInfluence: 90, suzerainId: "p2" });
        addCityState(state, { id: "cs4", myInfluence: 2, rivalInfluence: 88, suzerainId: "p2" });

        const cadence = computeCityStateInvestmentCadence(
            state,
            "p1",
            undefined,
            economySnapshot({ economyState: "Healthy", spendableTreasury: 460, netGold: 18 }),
        );
        expect(cadence).toBe(2);
    });

    it("clears stale safe incumbent focus instead of refreshing it indefinitely", () => {
        let state = createBaseState();
        state.turn = 90;
        addCityState(state, { id: "cs1", myInfluence: 44, rivalInfluence: 4, suzerainId: "p1" });
        state = setAiMemoryV2(state, "p1", {
            cityStateFocusId: "cs1",
            cityStateFocusSetTurn: 60,
        });

        const next = runDiplomacy(state, "p1", "Balanced");
        expect(next.aiMemoryV2?.p1?.cityStateFocusId).toBeUndefined();
        expect(next.players.find(player => player.id === "p1")?.treasury).toBe(200);
    });

    it("drops defensive focus when rival influence is below the meaningful threat floor", () => {
        let state = createBaseState();
        state.turn = 90;
        addCityState(state, { id: "cs1", myInfluence: 28, rivalInfluence: 2, suzerainId: "p1" });
        state = setAiMemoryV2(state, "p1", {
            cityStateFocusId: "cs1",
            cityStateFocusSetTurn: 88,
        });

        const next = runDiplomacy(state, "p1", "Balanced");
        expect(next.aiMemoryV2?.p1?.cityStateFocusId).toBeUndefined();
        expect(next.cityStates?.find(cityState => cityState.id === "cs1")?.lastInvestTurnByPlayer.p1).toBe(-1);
    });

    it("keeps challenger focus fresh while a live turnover campaign is still active", () => {
        let state = createBaseState();
        state.turn = 90;
        addCityState(state, { id: "cs1", myInfluence: 20, rivalInfluence: 78, suzerainId: "p2" });
        state = setAiMemoryV2(state, "p1", {
            cityStateFocusId: "cs1",
            cityStateFocusSetTurn: 60,
        });

        const next = runDiplomacy(state, "p1", "Balanced");
        expect(next.aiMemoryV2?.p1?.cityStateFocusId).toBe("cs1");
        expect(next.aiMemoryV2?.p1?.cityStateFocusSetTurn).toBe(90);
        expect(next.players.find(player => player.id === "p1")?.treasury).toBeLessThan(200);
    });

    it("keeps the primary turnover target as focus when secondary spends happen later in the turn", () => {
        let state = createBaseState();
        state.turn = 90;
        addCityState(state, { id: "cs1", myInfluence: 20, rivalInfluence: 78, suzerainId: "p2" });
        addCityState(state, { id: "cs2", myInfluence: 10, rivalInfluence: 26, suzerainId: "p2" });
        state = setAiMemoryV2(state, "p1", {
            cityStateFocusId: "cs1",
            cityStateFocusSetTurn: 88,
        });

        const next = runDiplomacy(state, "p1", "Balanced");
        expect(next.aiMemoryV2?.p1?.cityStateFocusId).toBe("cs1");
        expect(next.aiMemoryV2?.p1?.cityStateFocusSetTurn).toBe(90);
        expect(next.players.find(player => player.id === "p1")?.treasury).toBeLessThanOrEqual(140);
        expect(next.cityStates?.find(cityState => cityState.id === "cs1")?.lastInvestTurnByPlayer.p1).toBe(90);
        expect(next.cityStates?.find(cityState => cityState.id === "cs2")?.lastInvestTurnByPlayer.p1).toBe(90);
    });

    it("drops hotspot pair-loop incumbent focus and redirects spending to another live race", () => {
        let state = createBaseState();
        state.turn = 96;
        addCityState(state, {
            id: "looped",
            myInfluence: 40,
            rivalInfluence: 28,
            suzerainId: "p1",
            lastSuzerainChangeTurn: 94,
            recentSuzerainChangeCount: 4,
            lastSuzerainChangeCause: "Investment",
            lastSuzerainHolderId: "p2",
            recentSuzerainPairKey: "p1|p2",
            recentSuzerainPairChangeCount: 4,
            recentSuzerainPairTurn: 94,
        });
        addCityState(state, {
            id: "fresh",
            myInfluence: 16,
            rivalInfluence: 34,
            suzerainId: "p2",
        });
        state = setAiMemoryV2(state, "p1", {
            cityStateFocusId: "looped",
            cityStateFocusSetTurn: 94,
        });

        const next = runDiplomacy(state, "p1", "Balanced");
        expect(next.aiMemoryV2?.p1?.cityStateFocusId).not.toBe("looped");
        expect(next.cityStates?.find(cityState => cityState.id === "looped")?.lastInvestTurnByPlayer.p1).toBe(-1);
        expect(next.cityStates?.find(cityState => cityState.id === "fresh")?.lastInvestTurnByPlayer.p1).toBe(96);
    });

});
