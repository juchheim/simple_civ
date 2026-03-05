import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, TechId, TerrainType, UnitState, UnitType } from "../../../core/types.js";
import { moveUnitsForCampClearing, attackCampTargets } from "./offense-camp-clearing.js";
import { expectedDamageToUnit } from "./unit-helpers.js";

function makeState(): GameState {
    const tiles = [];
    for (let q = 0; q <= 6; q++) {
        for (let r = 0; r <= 2; r++) {
            tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: [],
            });
        }
    }

    return {
        id: "offense-camp-clearing-test",
        turn: 80,
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
                campClearingPrep: {
                    targetCampId: "camp-1",
                    state: "Ready",
                    startedTurn: 78,
                },
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 7,
            height: 3,
            tiles,
        },
        units: [
            {
                id: "bow-1",
                ownerId: "p1",
                type: UnitType.BowGuard,
                coord: { q: 2, r: 0 },
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
        visibility: { p1: ["4,0", "4,1"] },
        revealed: { p1: ["4,0", "4,1"] },
        diplomacy: { p1: {} },
        sharedVision: { p1: {} },
        contacts: { p1: {} },
        diplomacyOffers: [],
        nativeCamps: [
            {
                id: "camp-1",
                coord: { q: 4, r: 0 },
                state: "Aggro",
                aggroTurnsRemaining: 3,
            },
        ],
        cityStateTypeCycleIndex: 0,
    };
}

describe("offense camp clearing movement", () => {
    it("keeps moving in Ready when only the camp tile is in range but defenders are not", () => {
        const state = makeState();
        state.units.push({
            id: "native-1",
            ownerId: "natives",
            type: UnitType.NativeArcher,
            coord: { q: 4, r: 1 },
            hp: 12,
            maxHp: 12,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
            campId: "camp-1",
        });

        const next = moveUnitsForCampClearing(state, "p1");
        const bow = next.units.find(unit => unit.id === "bow-1");
        expect(bow?.coord).not.toEqual({ q: 2, r: 0 });
    });

    it("holds position in Ready when a defender is already in range", () => {
        const state = makeState();
        state.units.push({
            id: "native-1",
            ownerId: "natives",
            type: UnitType.NativeArcher,
            coord: { q: 4, r: 0 },
            hp: 12,
            maxHp: 12,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
            campId: "camp-1",
        });

        const next = moveUnitsForCampClearing(state, "p1");
        const bow = next.units.find(unit => unit.id === "bow-1");
        expect(bow?.coord).toEqual({ q: 2, r: 0 });
    });

    it("moves a friendly blocker aside in Ready to keep closing on the camp", () => {
        const state = makeState();
        state.units = [
            {
                id: "bow-1",
                ownerId: "p1",
                type: UnitType.BowGuard,
                coord: { q: 1, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "spear-blocker",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 2, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ];
        state.units.push({
            id: "native-1",
            ownerId: "natives",
            type: UnitType.NativeArcher,
            coord: { q: 4, r: 1 },
            hp: 12,
            maxHp: 12,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
            campId: "camp-1",
        });

        const next = moveUnitsForCampClearing(state, "p1");
        const bow = next.units.find(unit => unit.id === "bow-1");
        const blocker = next.units.find(unit => unit.id === "spear-blocker");
        expect(bow?.coord).toEqual({ q: 2, r: 0 });
        expect(blocker?.coord).not.toEqual({ q: 2, r: 0 });
    });
});

describe("offense camp clearing attacks", () => {
    it("downgrades Ready to Positioning when badly outmatched but reinforcements are nearby", () => {
        const state = makeState();
        state.nativeCamps[0].coord = { q: 6, r: 0 };
        state.units = [
            {
                id: "spear-front",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 5, r: 0 },
                hp: 4,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "spear-reinforce",
                ownerId: "p1",
                type: UnitType.ArmySpearGuard,
                coord: { q: 0, r: 2 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "spear-reinforce-2",
                ownerId: "p1",
                type: UnitType.ArmySpearGuard,
                coord: { q: 0, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "native-1",
                ownerId: "natives",
                type: UnitType.NativeChampion,
                coord: { q: 6, r: 0 },
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
            {
                id: "native-2",
                ownerId: "natives",
                type: UnitType.NativeChampion,
                coord: { q: 6, r: 1 },
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
        ];

        const next = attackCampTargets(state, "p1");
        const prep = next.players.find(player => player.id === "p1")?.campClearingPrep;
        expect(prep?.state).toBe("Positioning");
    });

    it("ends a doomed Ready assault when no reinforcements are available", () => {
        const state = makeState();
        state.units = [
            {
                id: "spear-front",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 3, r: 0 },
                hp: 3,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "native-1",
                ownerId: "natives",
                type: UnitType.NativeChampion,
                coord: { q: 4, r: 0 },
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
            {
                id: "native-2",
                ownerId: "natives",
                type: UnitType.NativeChampion,
                coord: { q: 4, r: 1 },
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
        ];

        const next = attackCampTargets(state, "p1");
        expect(next.players.find(player => player.id === "p1")?.campClearingPrep).toBeUndefined();
    });

    it("immediately retargets after exiting a doomed Ready assault", () => {
        const state = makeState();
        state.players[0].techs = [TechId.DrilledRanks];
        state.visibility.p1 = ["4,0", "4,1", "1,2"];
        state.revealed.p1 = ["4,0", "4,1", "1,2"];
        state.nativeCamps.push({
            id: "camp-2",
            coord: { q: 1, r: 2 },
            state: "Patrol",
            aggroTurnsRemaining: 0,
        });
        state.units = [
            {
                id: "spear-front",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 3, r: 0 },
                hp: 3,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "native-1",
                ownerId: "natives",
                type: UnitType.NativeChampion,
                coord: { q: 4, r: 0 },
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
            {
                id: "native-2",
                ownerId: "natives",
                type: UnitType.NativeChampion,
                coord: { q: 4, r: 1 },
                hp: 18,
                maxHp: 18,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
                campId: "camp-1",
            },
        ];

        const next = attackCampTargets(state, "p1");
        const prep = next.players.find(player => player.id === "p1")?.campClearingPrep;
        expect(prep?.targetCampId).toBe("camp-2");
    });

    it("uses ranged attackers first so melee can finish the camp in the same turn", () => {
        const state = makeState();
        state.units = [
            {
                id: "spear-1",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 3, r: 0 },
                hp: 1,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "bow-1",
                ownerId: "p1",
                type: UnitType.BowGuard,
                coord: { q: 2, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ];
        state.units.push({
            id: "native-1",
            ownerId: "natives",
            type: UnitType.NativeChampion,
            coord: { q: 4, r: 0 },
            hp: 18,
            maxHp: 18,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
            campId: "camp-1",
        });

        const spear = state.units.find(unit => unit.id === "spear-1")!;
        const bow = state.units.find(unit => unit.id === "bow-1")!;
        const champion = state.units.find(unit => unit.id === "native-1")!;
        champion.hp = expectedDamageToUnit(spear, champion, state) + expectedDamageToUnit(bow, champion, state) - 1;

        const next = attackCampTargets(state, "p1");
        expect(next.units.find(unit => unit.id === "native-1")).toBeUndefined();
    });

    it("takes a pressure trade when another attacker can finish the last defender", () => {
        const state = makeState();
        state.units = [
            {
                id: "spear-low",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 3, r: 0 },
                hp: 5,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "spear-full",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 3, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ];
        state.units.push({
            id: "native-1",
            ownerId: "natives",
            type: UnitType.NativeChampion,
            coord: { q: 4, r: 0 },
            hp: 18,
            maxHp: 18,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
            campId: "camp-1",
        });

        const low = state.units.find(unit => unit.id === "spear-low")!;
        const full = state.units.find(unit => unit.id === "spear-full")!;
        const champion = state.units.find(unit => unit.id === "native-1")!;
        champion.hp = expectedDamageToUnit(low, champion, state) + expectedDamageToUnit(full, champion, state) - 1;

        const next = attackCampTargets(state, "p1");
        expect(next.units.find(unit => unit.id === "native-1")).toBeUndefined();
    });
});
