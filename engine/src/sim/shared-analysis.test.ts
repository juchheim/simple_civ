import { describe, expect, it } from "vitest";
import { DiplomacyState, PlayerPhase, UnitState, UnitType } from "../core/types.js";
import { buildSettlerDeathTelemetry } from "./shared-analysis.js";

function baseState() {
    return {
        id: "sim-test",
        turn: 40,
        players: [] as any[],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 12,
            height: 12,
            tiles: [] as any[],
            rivers: [] as any[],
        },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: { p1: [] as string[], p2: [] as string[] },
        revealed: { p1: [] as string[], p2: [] as string[] },
        diplomacy: {} as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
        nativeCamps: [] as any[],
    };
}

function unit(ownerId: string, id: string, type: UnitType, q: number, r: number, extra?: Record<string, unknown>): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 2,
        hasAttacked: false,
        state: UnitState.Normal,
        ...extra,
    };
}

function city(ownerId: string, id: string, q: number, r: number): any {
    return {
        id,
        ownerId,
        name: id,
        coord: { q, r },
        pop: 2,
        storedFood: 0,
        storedProduction: 0,
        currentBuild: null,
        buildProgress: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        hp: 20,
        maxHp: 20,
        isCapital: id === "cap",
        hasFiredThisTurn: false,
        milestones: [],
    };
}

describe("buildSettlerDeathTelemetry", () => {
    it("captures escort loss and native pressure for produced settlers", () => {
        const previous = baseState();
        previous.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
        ] as any;
        previous.cities = [city("p1", "cap", 0, 0)];
        previous.nativeCamps = [{ id: "camp-1", coord: { q: 1, r: 0 }, state: "Patrol", aggroTurnsRemaining: 0 }];
        previous.units = [
            unit("p1", "settler", UnitType.Settler, 0, 0, { linkedUnitId: "escort" }),
            unit("p1", "escort", UnitType.SpearGuard, 0, 0),
            unit("natives", "native-1", UnitType.NativeChampion, 2, 0),
        ];

        const current = {
            ...previous,
            units: [],
        };

        const telemetry = buildSettlerDeathTelemetry(previous as any, current as any, "settler", true);
        expect(telemetry).toMatchObject({
            produced: true,
            hadLinkedEscort: true,
            hadAdjacentEscort: true,
            linkedEscortLost: true,
            nearNativeCamp: true,
            nearbyNativeMilitary: true,
            nearbyEnemyMilitary: false,
            atWar: false,
            enemyNearFriendlyCity: true,
            nearestFriendlyCityDistance: 0,
        });
    });

    it("flags unescorted wartime long-route deaths", () => {
        const previous = baseState();
        previous.players = [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "RiverLeague", isEliminated: false },
        ] as any;
        previous.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } } as any;
        previous.cities = [city("p1", "cap", 0, 0)];
        previous.units = [
            unit("p1", "settler", UnitType.Settler, 6, 0),
            unit("p2", "enemy", UnitType.SpearGuard, 8, 0),
        ];

        const current = {
            ...previous,
            units: [unit("p2", "enemy", UnitType.SpearGuard, 8, 0)],
        };

        const telemetry = buildSettlerDeathTelemetry(previous as any, current as any, "settler", false);
        expect(telemetry).toMatchObject({
            produced: false,
            hadLinkedEscort: false,
            hadAdjacentEscort: false,
            linkedEscortLost: false,
            nearbyEnemyMilitary: true,
            atWar: true,
            enemyNearFriendlyCity: false,
            nearestFriendlyCityDistance: 6,
        });
    });
});
