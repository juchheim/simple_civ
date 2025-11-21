import { describe, it, expect } from "vitest";
import { runAiTurn } from "./ai";
import { GameState, PlayerPhase, TerrainType, OverlayType, UnitType, DiplomacyState } from "./engine-types";
import { hexSpiral, hexEquals } from "./hex";

type HexCoord = { q: number; r: number };

function ownedMap(ownerId: string) {
    const center: HexCoord = { q: 0, r: 0 };
    const coords = hexSpiral(center, 1);
    return coords.map((coord) => ({
        coord,
        terrain: TerrainType.Plains,
        overlays: [] as OverlayType[],
        ownerId,
        hasCityCenter: hexEquals(coord, center),
    }));
}

function baseState(): GameState {
    const owner = "p";
    const tiles = ownedMap(owner);
    return {
        id: "g1",
        turn: 1,
        players: [
            {
                id: owner,
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Balanced",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
            },
        ],
        currentPlayerId: owner,
        phase: PlayerPhase.Planning,
        map: { width: 3, height: 3, tiles },
        units: [],
        cities: [
            {
                id: "c1",
                ownerId: owner,
                coord: { q: 0, r: 0 },
                pop: 2,
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
        visibility: { [owner]: [] },
        revealed: { [owner]: [] },
        diplomacy: { [owner]: {} as Record<string, DiplomacyState> },
        sharedVision: {},
        contacts: { [owner]: {} as Record<string, boolean> },
        diplomacyOffers: [],
    };
}

describe("client AI wrapper", () => {
    it("delegates to engine runAiTurn to set goal, tech, and a build", () => {
        const state = baseState();
        state.players[0].completedProjects = []; // stay Balanced until bias sets

        const after = runAiTurn(state, "p");
        const player = after.players[0];
        expect(player.aiGoal).toBeDefined();
        expect(player.currentTech?.id).toBeDefined();
        expect(after.cities[0].currentBuild?.id).toBeDefined();
    });

    it("declares war via engine AI when enemy city is close and power favors AI", () => {
        const state = baseState();
        state.players.push({
            id: "e",
            civName: "RiverLeague",
            color: "#000",
            isAI: true,
            aiGoal: "Balanced",
            techs: [],
            currentTech: null,
            completedProjects: [],
            isEliminated: false,
        });
        state.contacts = { p: { e: true }, e: { p: true } };
        state.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        state.cities.push({
            id: "c2",
            ownerId: "e",
            coord: { q: 0, r: 2 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 0, r: 2 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        } as any);
        state.units = [
            { id: "a", ownerId: "p", type: UnitType.ArmySpearGuard, coord: { q: 0, r: 0 }, hp: 15, maxHp: 15, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
        ];

        const after = runAiTurn(state, "p");
        expect(after.diplomacy.p.e).toBe(DiplomacyState.War);
    });
});
