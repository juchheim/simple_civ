import { describe, expect, it } from "vitest";
import { analyzeWarConversion } from "./war-conversion-analysis.mjs";

function createBaseSim(overrides: Record<string, unknown>) {
    return {
        seed: 1,
        mapSize: "Standard",
        turnReached: 120,
        winTurn: null,
        winner: null,
        victoryType: "None",
        events: [],
        participatingCivs: [
            { id: "p1", civName: "ForgeClans", isEliminated: false },
            { id: "p2", civName: "ScholarKingdoms", isEliminated: false },
        ],
        finalState: {
            civs: [
                { id: "p1", civName: "ForgeClans", isEliminated: false },
                { id: "p2", civName: "ScholarKingdoms", isEliminated: false },
            ],
            cities: [],
            units: [],
        },
        ...overrides,
    };
}

describe("analyzeWarConversion", () => {
    it("tracks initiated-war conversion, burst captures, and progress pivots", () => {
        const results = [
            createBaseSim({
                seed: 1001,
                turnReached: 80,
                winTurn: 80,
                winner: { id: "p1", civ: "ForgeClans" },
                victoryType: "Progress",
                participatingCivs: [
                    { id: "p1", civName: "ForgeClans", isEliminated: false },
                    { id: "p2", civName: "ScholarKingdoms", isEliminated: true },
                ],
                finalState: {
                    civs: [
                        { id: "p1", civName: "ForgeClans", isEliminated: false },
                        { id: "p2", civName: "ScholarKingdoms", isEliminated: true },
                    ],
                    cities: [],
                    units: [],
                },
                events: [
                    { type: "WarDeclaration", turn: 10, initiator: "p1", target: "p2", initiatorPower: 60, targetPower: 40 },
                    { type: "CityCapture", turn: 20, cityId: "c-1", from: "p2", to: "p1", isCapital: false },
                    { type: "CityCapture", turn: 25, cityId: "c-2", from: "p2", to: "p1", isCapital: true },
                    { type: "Elimination", turn: 30, eliminated: "p2", by: "p1" },
                    { type: "ProjectComplete", turn: 40, civ: "p1", project: "Observatory" },
                    { type: "ProjectComplete", turn: 55, civ: "p1", project: "GrandAcademy" },
                    { type: "ProjectComplete", turn: 80, civ: "p1", project: "GrandExperiment" },
                ],
            }),
            createBaseSim({
                seed: 2002,
                turnReached: 90,
                winner: { id: "p2", civ: "RiverLeague" },
                victoryType: "Conquest",
                participatingCivs: [
                    { id: "p1", civName: "ForgeClans", isEliminated: false },
                    { id: "p2", civName: "RiverLeague", isEliminated: false },
                ],
                finalState: {
                    civs: [
                        { id: "p1", civName: "ForgeClans", isEliminated: false },
                        { id: "p2", civName: "RiverLeague", isEliminated: false },
                    ],
                    cities: [],
                    units: [],
                },
                events: [
                    { type: "WarDeclaration", turn: 15, initiator: "p1", target: "p2", initiatorPower: 36, targetPower: 30 },
                    { type: "PeaceTreaty", turn: 28, civ1: "p1", civ2: "p2" },
                ],
            }),
        ];

        const analysis = analyzeWarConversion(results);
        const forge = analysis.byCiv.get("ForgeClans");

        expect(forge).toBeDefined();
        expect(forge?.gamesPlayed).toBe(2);
        expect(forge?.wins).toBe(1);
        expect(forge?.progressWins).toBe(1);
        expect(forge?.initiatedWars).toBe(2);
        expect(forge?.initiatedWarsWithCapture).toBe(1);
        expect(forge?.initiatedWarsWithCapitalCapture).toBe(1);
        expect(forge?.initiatedWarsWithElimination).toBe(1);
        expect(forge?.citiesCapturedInInitiatedWars).toBe(2);
        expect(forge?.capitalCapturesInInitiatedWars).toBe(1);
        expect(forge?.eliminationsCausedInInitiatedWars).toBe(1);
        expect(forge?.avgDeclarationPowerRatio).toBeCloseTo(1.35);
        expect(forge?.warCaptureConversionRate).toBeCloseTo(50);
        expect(forge?.capturesPerInitiatedWar).toBeCloseTo(1);
        expect(forge?.winRateAfterAnyCapture).toBeCloseTo(100);
        expect(forge?.winRateAfterFirstCapture).toBeCloseTo(100);
        expect(forge?.progressWinsWithPriorCapture).toBe(1);
        expect(forge?.progressWinsWithPriorCapitalCapture).toBe(1);
        expect(forge?.avgCapturesBeforeFirstProgressProject).toBeCloseTo(2);
        expect(forge?.medianFirstWarTurnInWins).toBe(10);
        expect(forge?.medianFirstWarTurnInLosses).toBe(15);
        expect(forge?.medianFirstCaptureTurnInWins).toBe(20);
        expect(forge?.medianCaptureBurst25InWins).toBe(2);
        expect(forge?.medianTurnsFromFirstCaptureToWin).toBe(60);
        expect(forge?.medianTurnsToFirstCaptureFromDeclaredWar).toBe(10);
    });
});
