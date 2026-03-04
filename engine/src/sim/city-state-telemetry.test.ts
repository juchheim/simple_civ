import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, HistoryEventType, PlayerPhase, TerrainType, UnitState, UnitType } from "../core/types.js";
import { createCityStateTelemetryTracker } from "./city-state-telemetry.js";

function baseState(): GameState {
    return {
        id: "telemetry-test",
        turn: 50,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Conquest",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: "Hearth",
                treasury: 100,
                netGold: 5,
            },
            {
                id: "p2",
                civName: "ScholarKingdoms",
                color: "#000",
                isAI: true,
                aiGoal: "Progress",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: "Hearth",
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 20,
            height: 20,
            tiles: [
                {
                    coord: { q: 0, r: 0 },
                    terrain: TerrainType.Plains,
                    overlays: [],
                    ownerId: "p1",
                    ownerCityId: "c1",
                    hasCityCenter: true,
                },
                {
                    coord: { q: 4, r: 0 },
                    terrain: TerrainType.Forest,
                    overlays: [],
                },
            ],
        },
        units: [
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
                type: UnitType.SpearGuard,
                ownerId: "p1",
                coord: { q: 2, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "u3",
                type: UnitType.SpearGuard,
                ownerId: "p1",
                coord: { q: 3, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ],
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
        ],
        seed: 1,
        sharedVision: { p1: {}, p2: {} },
        contacts: { p1: {}, p2: {} },
        visibility: { p1: ["4,0"], p2: [] },
        revealed: { p1: ["4,0"], p2: [] },
        diplomacy: {
            p1: { p2: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.Peace },
        },
        diplomacyOffers: [],
        nativeCamps: [
            {
                id: "camp-1",
                coord: { q: 4, r: 0 },
                state: "Patrol",
                aggroTurnsRemaining: 0,
            },
        ],
        cityStates: [],
        cityStateTypeCycleIndex: 0,
        history: {
            events: [],
            playerStats: {},
            playerFog: {},
        },
    };
}

describe("city-state telemetry camp clearing episodes", () => {
    it("records a prep episode that reaches ready and clears the camp", () => {
        const initial = baseState();
        initial.players[0].campClearingPrep = {
            targetCampId: "camp-1",
            state: "Positioning",
            startedTurn: 50,
        };

        const tracker = createCityStateTelemetryTracker(initial);
        tracker.sampleTurn(initial);

        const readyState = structuredClone(initial);
        readyState.turn = 51;
        readyState.players[0].campClearingPrep = {
            targetCampId: "camp-1",
            state: "Ready",
            startedTurn: 50,
        };
        readyState.history.events = [
            {
                turn: 51,
                type: HistoryEventType.CampClearingStateChanged,
                playerId: "p1",
                data: {
                    campId: "camp-1",
                    fromState: "Positioning",
                    toState: "Ready",
                },
            },
        ];
        tracker.observe(readyState);
        tracker.sampleTurn(readyState);

        const clearedState = structuredClone(readyState);
        clearedState.turn = 52;
        clearedState.players[0].campClearingPrep = undefined;
        clearedState.nativeCamps = [];
        clearedState.history.events = [
            ...readyState.history.events,
            {
                turn: 52,
                type: HistoryEventType.CampClearingEnded,
                playerId: "p1",
                data: {
                    campId: "camp-1",
                    campCoord: { q: 4, r: 0 },
                    outcome: "ClearedBySelf",
                    resolvedByPlayerId: "p1",
                },
            },
        ];
        clearedState.cityStates = [
            {
                id: "cs-1",
                ownerId: "citystate_owner_1",
                cityId: "cs-city",
                coord: { q: 4, r: 0 },
                name: "Aetherquill",
                yieldType: "Science",
                influenceByPlayer: { p1: 30, p2: 0 },
                investmentCountByPlayer: { p1: 0, p2: 0 },
                lastInvestTurnByPlayer: { p1: -1, p2: -1 },
                suzerainId: "p1",
                lockedControllerId: undefined,
                discoveredByPlayer: { p1: true, p2: false },
                lastReinforcementTurn: 52,
                warByPlayer: { p1: false, p2: false },
                lastPairFatigueTurnByPlayer: { p1: -1, p2: -1 },
                lastPairFatigueBonusReductionByPlayer: { p1: 0, p2: 0 },
                lastPairFatiguePressureReductionByPlayer: { p1: 0, p2: 0 },
            },
        ];
        tracker.observe(clearedState);

        const summary = tracker.finalize(clearedState);
        expect(summary.campClearing.episodes).toHaveLength(1);
        expect(summary.campClearing.episodes[0]).toMatchObject({
            civName: "ForgeClans",
            campId: "camp-1",
            outcome: "ClearedBySelf",
            prepStartedTurn: 50,
            firstReadyTurn: 51,
            campClearedTurn: 52,
            positioningTurns: 1,
            readyTurns: 1,
            totalPrepTurns: 2,
        });
    });

    it("records timeout outcomes when prep is abandoned with the camp still alive", () => {
        const initial = baseState();
        initial.turn = 80;
        initial.players[0].campClearingPrep = {
            targetCampId: "camp-1",
            state: "Buildup",
            startedTurn: 60,
        };

        const tracker = createCityStateTelemetryTracker(initial);
        tracker.sampleTurn(initial);

        const timedOut = structuredClone(initial);
        timedOut.turn = 81;
        timedOut.players[0].campClearingPrep = undefined;
        timedOut.history.events = [
            {
                turn: 81,
                type: HistoryEventType.CampClearingEnded,
                playerId: "p1",
                data: {
                    campId: "camp-1",
                    campCoord: { q: 4, r: 0 },
                    outcome: "TimedOut",
                },
            },
        ];
        tracker.observe(timedOut);

        const summary = tracker.finalize(timedOut);
        expect(summary.campClearing.episodes).toHaveLength(1);
        expect(summary.campClearing.episodes[0]).toMatchObject({
            outcome: "TimedOut",
            prepStartedTurn: 60,
            endedTurn: 81,
            buildupTurns: 1,
            totalPrepTurns: 1,
        });
    });
});
