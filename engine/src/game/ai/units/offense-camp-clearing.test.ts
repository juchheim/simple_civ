import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, TerrainType, UnitState, UnitType } from "../../../core/types.js";
import { moveUnitsForCampClearing } from "./offense-camp-clearing.js";

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
});
