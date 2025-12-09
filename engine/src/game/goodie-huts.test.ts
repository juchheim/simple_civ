import { describe, it, expect, beforeEach } from "vitest";
import { GameState, OverlayType, PlayerPhase, TerrainType, TechId, UnitState, UnitType } from "../core/types.js";
import { collectGoodieHut } from "./helpers/goodie-huts.js";

describe("Goodie Huts", () => {
    let baseState: GameState;

    beforeEach(() => {
        baseState = {
            id: "test",
            turn: 10,
            players: [
                {
                    id: "p1",
                    civName: "TestCiv",
                    color: "#000",
                    techs: [],
                    currentTech: { id: TechId.Fieldcraft, progress: 5, cost: 20 },
                    completedProjects: [],
                    isEliminated: false,
                    currentEra: "Hearth" as any,
                },
            ],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: {
                width: 5,
                height: 5,
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [OverlayType.GoodieHut] },
                    { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                ],
            },
            units: [
                {
                    id: "u1",
                    type: UnitType.Scout,
                    ownerId: "p1",
                    coord: { q: 0, r: 0 },
                    hp: 10,
                    maxHp: 10,
                    movesLeft: 2,
                    state: UnitState.Normal,
                    hasAttacked: false,
                },
            ],
            cities: [
                {
                    id: "c1",
                    name: "TestCity",
                    ownerId: "p1",
                    coord: { q: 1, r: 0 },
                    pop: 2,
                    storedFood: 0,
                    storedProduction: 0,
                    buildings: [],
                    workedTiles: [{ q: 1, r: 0 }],
                    currentBuild: null,
                    buildProgress: 0,
                    hp: 15,
                    maxHp: 15,
                    isCapital: true,
                    hasFiredThisTurn: false,
                    milestones: [],
                },
            ],
            seed: 12345,
            visibility: {},
            revealed: {},
            diplomacy: {},
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
        };
    });

    it("should remove goodie hut overlay after collection", () => {
        const tile = baseState.map.tiles[0];
        expect(tile.overlays).toContain(OverlayType.GoodieHut);

        const reward = collectGoodieHut(baseState, tile, "p1", { q: 0, r: 0 });

        expect(reward).not.toBeNull();
        expect(tile.overlays).not.toContain(OverlayType.GoodieHut);
    });

    it("should return null if tile has no goodie hut", () => {
        const tile = baseState.map.tiles[1]; // No goodie hut
        const reward = collectGoodieHut(baseState, tile, "p1", { q: 1, r: 0 });

        expect(reward).toBeNull();
    });

    it("should grant food reward to nearest city", () => {
        // Force the random to pick "food" by mocking Math.random
        const originalRandom = Math.random;
        Math.random = () => 0.1; // < 0.25 = food

        const tile = baseState.map.tiles[0];
        const reward = collectGoodieHut(baseState, tile, "p1", { q: 0, r: 0 });

        expect(reward?.type).toBe("food");
        expect(baseState.cities[0].storedFood).toBeGreaterThan(0);

        Math.random = originalRandom;
    });

    it("should grant production reward to nearest city", () => {
        const originalRandom = Math.random;
        Math.random = () => 0.3; // >= 0.25 && < 0.5 = production

        const tile = baseState.map.tiles[0];
        const reward = collectGoodieHut(baseState, tile, "p1", { q: 0, r: 0 });

        expect(reward?.type).toBe("production");
        expect(baseState.cities[0].storedProduction).toBeGreaterThan(0);

        Math.random = originalRandom;
    });

    it("should grant research progress if player has current tech", () => {
        const originalRandom = Math.random;
        Math.random = () => 0.6; // >= 0.5 && < 0.75 = research

        const tile = baseState.map.tiles[0];
        const initialProgress = baseState.players[0].currentTech!.progress;
        const reward = collectGoodieHut(baseState, tile, "p1", { q: 0, r: 0 });

        expect(reward?.type).toBe("research");
        expect(baseState.players[0].currentTech!.progress).toBeGreaterThan(initialProgress);

        Math.random = originalRandom;
    });

    it("should spawn a scout unit for scout reward", () => {
        const originalRandom = Math.random;
        Math.random = () => 0.8; // >= 0.75 = scout

        const tile = baseState.map.tiles[0];
        const initialUnitCount = baseState.units.length;
        const reward = collectGoodieHut(baseState, tile, "p1", { q: 0, r: 0 });

        expect(reward?.type).toBe("scout");
        expect(baseState.units.length).toBe(initialUnitCount + 1);

        const newScout = baseState.units.find(u => u.id === (reward as any).unitId);
        expect(newScout).toBeDefined();
        expect(newScout?.type).toBe(UnitType.Scout);
        expect(newScout?.ownerId).toBe("p1");

        Math.random = originalRandom;
    });
});
