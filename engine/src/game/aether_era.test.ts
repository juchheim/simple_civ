import { describe, it, expect, beforeEach } from "vitest";
import { GameState, UnitType, TerrainType, TechId, UnitDomain, UnitState, Unit } from "../core/types.js";
import { handleAttack } from "./actions/unit-combat.js";
import { computeMoveCost, ensureTerrainEntry } from "./helpers/movement.js";
import { UNITS, TECHS } from "../core/constants.js";
import { chooseTechV2 } from "./ai2/tech.js";

const mockState = (overrides: Partial<GameState> = {}): GameState => ({
    units: [],
    cities: [],
    players: [],
    map: { width: 10, height: 10, tiles: [] },
    seed: 12345,
    turn: 1,
    diplomacy: { "p1": { "p2": "War" }, "p2": { "p1": "War" } },
    ...overrides,
} as unknown as GameState);

describe("Aether Era Mechanics", () => {
    describe("Airship Movement", () => {
        it("should allow moving over Mountains", () => {
            const airship = { type: UnitType.Airship, movesLeft: 4 } as Unit;
            const mountainTile = { terrain: TerrainType.Mountain, coord: { q: 0, r: 0 }, overlays: [] };

            expect(() => ensureTerrainEntry(UNITS[UnitType.Airship], mountainTile as any)).not.toThrow();
        });

        it("should allow moving over DeepSea", () => {
            const airship = { type: UnitType.Airship, movesLeft: 4 } as Unit;
            const seaTile = { terrain: TerrainType.DeepSea, coord: { q: 0, r: 0 }, overlays: [] };

            expect(() => ensureTerrainEntry(UNITS[UnitType.Airship], seaTile as any)).not.toThrow();
        });

        it("should always cost 1 movement", () => {
            const airship = { type: UnitType.Airship, movesLeft: 4 } as Unit;
            const hillTile = { terrain: TerrainType.Hills, coord: { q: 0, r: 0 }, overlays: [] }; // Hills usually cost 2 logic

            const cost = computeMoveCost(airship, UNITS[UnitType.Airship], hillTile as any);
            expect(cost).toBe(1);
        });
    });

    describe("Airship Combat", () => {
        it("should throw error when trying to attack an Airship", () => {
            const state = mockState({
                units: [
                    { id: "attacker", type: UnitType.ArmySpearGuard, ownerId: "p1", coord: { q: 0, r: 0 }, movesLeft: 1, state: UnitState.Normal, hasAttacked: false, hp: 10, maxHp: 10 } as Unit,
                    { id: "target", type: UnitType.Airship, ownerId: "p2", coord: { q: 0, r: 1 }, hp: 20 } as Unit
                ],
                cities: []
            });

            expect(() => handleAttack(state, {
                type: "Attack",
                playerId: "p1",
                attackerId: "attacker",
                targetId: "target",
                targetType: "Unit"
            })).toThrow("Cannot attack air units");
        });
    });

    describe("AI Tech Gate", () => {
        it("should not pick Aether techs if requirements not met", () => {
            // No Engine techs -> No Aether
            const state = mockState({ players: [{ id: "p1", civName: "Test", techs: [] } as any] });
            const choice = chooseTechV2(state, "p1", "Progress");
            if (choice) {
                expect(TECHS[choice].era).not.toBe("Aether");
            }
        });

        it("should allow Aether techs if requirements met", () => {
            // Has prereq for Airship (SteamForges) and Era Gate check passed mechanism needs checking logic

            // To pass EraGate("Engine" -> "Aether"? No, era gate logic is internal to tech.ts)
            // Tech gate logic checks: data.prereqTechs.every(t => playerTechs.includes(t)) AND meetsEraGate

            // For now, let's just assume we have everything
            // BUT, `availableTechs` is internal. `chooseTechV2` returns one result.
            // If we force give all techs EXCEPT Airship, it should pick Airship or similar.

            const allButAether = Object.values(TechId).filter(t => TECHS[t].era !== "Aether");
            const state = mockState({
                players: [{ id: "p1", civName: "Test", techs: allButAether } as any],
                seed: 123
            });

            const choice = chooseTechV2(state, "p1", "Progress");
            // Should be an Aether tech now
            expect(choice).toBeTruthy();
            expect(TECHS[choice!].era).toBe("Aether");
        });
    });
});
