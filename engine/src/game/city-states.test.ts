import { describe, expect, it } from "vitest";
import {
    CityState,
    DiplomacyState,
    GameState,
    OverlayType,
    PlayerPhase,
    TerrainType,
    UnitState,
    UnitType,
} from "../core/types.js";
import {
    CITY_STATE_FALLBACK_PREFIX,
    CITY_STATE_NAMES_BY_YIELD,
} from "../core/constants.js";
import {
    createCityStateFromClearedCamp,
    getCityStateName,
    getCityStateYieldBonusesForPlayer,
    investInCityState,
    processCityStateInfluenceContestation,
    resolveCityStateSuzerain,
    syncCityStateWarTransfers,
} from "./city-states.js";

function makeState(): GameState {
    const tiles = [];
    for (let r = 0; r < 6; r++) {
        for (let q = -3; q < 4; q++) {
            tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [] as OverlayType[] });
        }
    }
    return {
        id: "city-state-test",
        turn: 10,
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "red",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                treasury: 300,
            },
            {
                id: "p2",
                civName: "ScholarKingdoms",
                color: "blue",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                treasury: 300,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: { width: 7, height: 6, tiles },
        units: [],
        cities: [],
        seed: 42,
        visibility: {},
        revealed: {},
        diplomacy: {
            p1: { p2: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.Peace },
        },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
        cityStates: [],
        cityStateTypeCycleIndex: 0,
        usedCityNames: [],
    } as unknown as GameState;
}

describe("city-state naming", () => {
    it("uses the yield pool and falls back with the configured prefix", () => {
        const state = makeState();
        state.usedCityNames = [...CITY_STATE_NAMES_BY_YIELD.Science];
        const fallback = getCityStateName(state, "Science");
        expect(fallback.startsWith(CITY_STATE_FALLBACK_PREFIX.Science)).toBe(true);
    });

    it("assigns deterministic unique names from yield pools on conversion", () => {
        const state = makeState();
        const a = createCityStateFromClearedCamp(state, { q: 0, r: 0 }, "p1", 20);
        const b = createCityStateFromClearedCamp(state, { q: 2, r: 1 }, "p2", 20);

        expect(a).toBeTruthy();
        expect(b).toBeTruthy();
        expect(a!.name).not.toBe(b!.name);
        expect(CITY_STATE_NAMES_BY_YIELD.Science).toContain(a!.name);
        expect(CITY_STATE_NAMES_BY_YIELD.Production).toContain(b!.name);
    });
});

describe("city-state influence", () => {
    it("applies investment cost ramp and one-invest-per-turn limit", () => {
        const state = makeState();
        const cityState = createCityStateFromClearedCamp(state, { q: 0, r: 0 }, "p1", 20)!;
        state.players[0].treasury = 200;

        const firstCost = investInCityState(state, "p1", cityState.id);
        expect(firstCost).toBe(24);
        expect(cityState.influenceByPlayer.p1).toBe(54); // 30 starter + 24 invest
        expect(state.players[0].treasury).toBe(176);

        expect(() => investInCityState(state, "p1", cityState.id)).toThrow();

        state.turn += 1;
        const secondCost = investInCityState(state, "p1", cityState.id);
        expect(secondCost).toBe(26);
        expect(cityState.influenceByPlayer.p1).toBe(78);
    });

    it("retains incumbent suzerainty during close contests until challenger has clear edge", () => {
        const state = makeState();
        const cityState = createCityStateFromClearedCamp(state, { q: 0, r: 0 }, "p1", 20)!;

        cityState.discoveredByPlayer.p2 = true;
        cityState.influenceByPlayer.p1 = 40;
        cityState.influenceByPlayer.p2 = 35;

        const suzerain = resolveCityStateSuzerain(state, cityState.id);
        expect(suzerain).toBe("p1");
        expect(cityState.suzerainId).toBe("p1");
    });

    it("gives challengers extra influence pressure when investing against an incumbent", () => {
        const state = makeState();
        const cityState = createCityStateFromClearedCamp(state, { q: 0, r: 0 }, "p1", 20)!;
        cityState.discoveredByPlayer.p2 = true;
        state.players[1].treasury = 200;

        const cost = investInCityState(state, "p2", cityState.id);
        expect(cost).toBe(30);
        expect(cityState.influenceByPlayer.p2).toBe(40);
        expect(cityState.influenceByPlayer.p1).toBe(18);
        expect(cityState.suzerainId).toBe("p2");
    });

    it("applies periodic contestation pressure during end-of-round cadence", () => {
        const state = makeState();
        const cityState = createCityStateFromClearedCamp(state, { q: 0, r: 0 }, "p1", 20)!;
        state.turn = 12; // contestation interval multiple
        cityState.discoveredByPlayer.p2 = true;
        cityState.influenceByPlayer.p1 = 50;
        cityState.influenceByPlayer.p2 = 35;

        processCityStateInfluenceContestation(state);

        expect(cityState.influenceByPlayer.p1).toBe(46);
        expect(cityState.influenceByPlayer.p2).toBe(37);
        expect(cityState.suzerainId).toBe("p1");
    });

    it("continues contestation pressure during wartime lock to allow post-war turnover setup", () => {
        const state = makeState();
        const cityState = createCityStateFromClearedCamp(state, { q: 0, r: 0 }, "p1", 20)!;
        state.turn = 12;
        cityState.lockedControllerId = "p1";
        cityState.discoveredByPlayer.p2 = true;
        cityState.influenceByPlayer.p1 = 50;
        cityState.influenceByPlayer.p2 = 35;

        processCityStateInfluenceContestation(state);

        expect(cityState.influenceByPlayer.p1).toBe(45);
        expect(cityState.influenceByPlayer.p2).toBe(38);
        expect(cityState.suzerainId).toBe("p1");
    });
});

describe("city-state yield bonuses", () => {
    it("uses diminishing returns for same yield type", () => {
        const state = makeState();
        const base: Partial<CityState> = {
            ownerId: "cs-owner",
            cityId: "c-city",
            coord: { q: 0, r: 0 },
            name: "CS",
            influenceByPlayer: { p1: 50, p2: 10 },
            investmentCountByPlayer: { p1: 0, p2: 0 },
            lastInvestTurnByPlayer: { p1: -1, p2: -1 },
            discoveredByPlayer: { p1: true, p2: true },
            lastReinforcementTurn: 0,
            warByPlayer: { p1: false, p2: false },
            suzerainId: "p1",
        };
        state.cityStates = [
            { ...(base as CityState), id: "cs-1", yieldType: "Science" },
            { ...(base as CityState), id: "cs-2", yieldType: "Science" },
            { ...(base as CityState), id: "cs-3", yieldType: "Science" },
        ];

        const bonus = getCityStateYieldBonusesForPlayer(state, "p1");
        expect(bonus.Science).toBeCloseTo(9.8, 5);
    });
});

describe("city-state wartime transfer", () => {
    it("temporarily transfers and then releases city-state units", () => {
        const state = makeState();
        const cityState = createCityStateFromClearedCamp(state, { q: 0, r: 0 }, "p1", 20)!;
        const cityStateUnit = state.units.find(u => u.cityStateId === cityState.id)!;

        state.diplomacy.p1.p2 = DiplomacyState.War;
        state.diplomacy.p2.p1 = DiplomacyState.War;
        const transferred = syncCityStateWarTransfers(state);
        expect(transferred).toBe(true);
        expect(cityState.lockedControllerId).toBe("p1");
        expect(cityStateUnit.ownerId).toBe("p1");
        expect(cityStateUnit.isCityStateLevy).toBe(true);

        state.diplomacy.p1.p2 = DiplomacyState.Peace;
        state.diplomacy.p2.p1 = DiplomacyState.Peace;
        const released = syncCityStateWarTransfers(state);
        expect(released).toBe(true);
        expect(cityState.lockedControllerId).toBeUndefined();
        expect(cityStateUnit.ownerId).toBe(cityState.ownerId);
        expect(cityStateUnit.isCityStateLevy).toBe(false);
        expect(cityStateUnit.state).toBe(UnitState.Normal);
        expect([UnitType.SpearGuard, UnitType.BowGuard]).toContain(cityStateUnit.type);
    });
});
