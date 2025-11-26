import { describe, it, expect } from "vitest";
import {
    AiVictoryGoal,
    DiplomacyState,
    OverlayType,
    PlayerPhase,
    ProjectId,
    TerrainType,
    UnitType,
} from "../core/types.js";
import { hexEquals, hexSpiral } from "../core/hex.js";
import { runAiTurn } from "./ai.js";

type HexCoord = { q: number; r: number };

function ownedMap(ownerId: string) {
    const center: HexCoord = { q: 0, r: 0 };
    const coords = hexSpiral(center, 2);
    return coords.map((coord) => ({
        coord,
        terrain: TerrainType.Plains,
        overlays: [] as OverlayType[],
        ownerId,
        hasCityCenter: hexEquals(coord, center),
    }));
}

function baseState() {
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
                aiGoal: "Balanced" as AiVictoryGoal,
                techs: [] as any[],
                currentTech: null,
                completedProjects: [] as any[],
                isEliminated: false,
            },
        ],
        currentPlayerId: owner,
        phase: PlayerPhase.Planning,
        map: { width: 5, height: 5, tiles, rivers: [] as any[] },
        units: [] as any[],
        cities: [
            {
                id: "c1",
                ownerId: owner,
                coord: { q: 0, r: 0 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [] as any[],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [] as any[],
            },
        ],
        seed: 1,
        visibility: { [owner]: [] as string[] },
        revealed: { [owner]: [] as string[] },
        diplomacy: { [owner]: {} as Record<string, DiplomacyState> },
        sharedVision: {},
        contacts: { [owner]: {} as Record<string, boolean> },
        diplomacyOffers: [] as any[],
    };
}

describe("AI end-to-end", () => {
    it("Progress-biased AI picks tech and sets a build while ending its turn", () => {
        const state = baseState();
        // Make capitals safe and completed Observatory to force Progress bias
        state.players[0].completedProjects = [ProjectId.Observatory];

        const after = runAiTurn(state as any, "p");
        const player = after.players[0];
        expect(player.aiGoal).toBe("Progress");
        expect(player.currentTech?.id).toBeDefined();
        expect(after.cities[0].currentBuild?.id).toBe(UnitType.Scout);
        expect(after.currentPlayerId).toBe("p"); // single player loops
    });

    it("AI declares war when enemy city is within 8 tiles and power is higher", () => {
        const state = baseState();
        state.players.push({
            id: "e",
            civName: "RiverLeague",
            color: "#000",
            isAI: true,
            aiGoal: "Balanced" as AiVictoryGoal,
            techs: [],
            currentTech: null,
            completedProjects: [],
            isEliminated: false,
        } as any);
        state.contacts = { p: { e: true }, e: { p: true } };
        state.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        state.cities.push({
            id: "c2",
            ownerId: "e",
            coord: { q: 0, r: 8 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 0, r: 8 }],
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

        const after = runAiTurn(state as any, "p");
        expect(after.diplomacy.p.e).toBe(DiplomacyState.War);
    });
});
