import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop";
import { generateWorld } from "../map/map-generator";
import { Action, UnitType, UnitState, TerrainType, DiplomacyState } from "../core/types";
import { hexNeighbor, hexEquals } from "../core/hex";

describe("Turn Loop & Actions", () => {
    it("should allow moving a unit", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const unit = state.units.find(u => u.type === UnitType.Scout && u.ownerId === "p1");
        expect(unit).toBeDefined();

        const startCoord = unit!.coord;
        const targetCoord =
            [0, 1, 2, 3, 4, 5]
                .map(d => hexNeighbor(startCoord, d))
                .find(c => !state.units.some(u => u.ownerId === "p1" && u.type !== UnitType.Settler && hexEquals(u.coord, c)));
        if (!targetCoord) throw new Error("No empty neighbor for move test");

        // Ensure target is valid (not deep sea/mountain) for test stability
        // Map gen is random, but let's assume it's valid or mock map.
        // For this test, let's force the map tile to be Plains.
        const tile = state.map.tiles.find(t => t.coord.q === targetCoord.q && t.coord.r === targetCoord.r);
        if (tile) tile.terrain = "Plains" as any;

        const action: Action = {
            type: "MoveUnit",
            playerId: "p1",
            unitId: unit!.id,
            to: targetCoord,
        };

        const nextState = applyAction(state, action);
        const movedUnit = nextState.units.find(u => u.id === unit!.id);

        expect(movedUnit!.coord).toEqual(targetCoord);
        expect(movedUnit!.movesLeft).toBe(unit!.movesLeft - 1);
    });

    it("should allow founding a city", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const settler = state.units.find(u => u.type === UnitType.Settler && u.ownerId === "p1");

        // Force tile to be valid
        const tile = state.map.tiles.find(t => t.coord.q === settler!.coord.q && t.coord.r === settler!.coord.r);
        if (tile) tile.terrain = "Plains" as any;

        const action: Action = {
            type: "FoundCity",
            playerId: "p1",
            unitId: settler!.id,
            name: "Capital",
        };

        const nextState = applyAction(state, action);

        expect(nextState.cities.length).toBe(1);
        expect(nextState.cities[0].name).toBe("Capital");
        expect(nextState.units.find(u => u.id === settler!.id)).toBeUndefined(); // Consumed
    });

    it("should handle end turn and resource accumulation", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }, { id: "p2", civName: "B", color: "blue" }] });

        // Setup a city for p1
        state.cities.push({
            id: "c1",
            name: "City 1",
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            pop: 1,
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
        });
        // Force tile yield
        const tile = state.map.tiles.find(t => t.coord.q === 0 && t.coord.r === 0);
        if (tile) {
            tile.terrain = "Plains" as any; // 2F 1P min
            tile.ownerId = "p1"; // Ensure tile is owned so it can be worked
        }

        // P1 ends turn
        const action: Action = { type: "EndTurn", playerId: "p1" };
        const s2 = applyAction(state, action);

        expect(s2.currentPlayerId).toBe("p2");

        // P2 ends turn -> Back to P1 -> Start of Turn triggers for P1
        const action2: Action = { type: "EndTurn", playerId: "p2" };
        const s3 = applyAction(s2, action2);

        expect(s3.currentPlayerId).toBe("p1");
        expect(s3.turn).toBe(2);

        // Check P1 city yields applied
        // City should have +2 Food, +1 Prod
        const city = s3.cities.find(c => c.id === "c1");
        expect(city!.storedFood).toBe(2);
    });

    it("should not eliminate a player with no cities if they still have a Settler", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const initialUnits = state.units.filter(u => u.ownerId === "p1");

        const endTurn: Action = { type: "EndTurn", playerId: "p1" };
        const next = applyAction(state, endTurn);
        const remainingUnits = next.units.filter(u => u.ownerId === "p1");
        const player = next.players.find(p => p.id === "p1");

        expect(remainingUnits.length).toBe(initialUnits.length);
        expect(remainingUnits.some(u => u.type === UnitType.Settler)).toBe(true);
        expect(player?.isEliminated).toBe(false);
    });

    it("should preserve units across multiple rounds when a Settler is alive", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const initialUnits = state.units.filter(u => u.ownerId === "p1");

        const afterFirst = applyAction(state, { type: "EndTurn", playerId: "p1" });
        const afterSecond = applyAction(afterFirst, { type: "EndTurn", playerId: "p1" });

        const remainingUnits = afterSecond.units.filter(u => u.ownerId === "p1");
        const player = afterSecond.players.find(p => p.id === "p1");

        expect(remainingUnits.length).toBe(initialUnits.length);
        expect(remainingUnits.some(u => u.type === UnitType.Settler)).toBe(true);
        expect(player?.isEliminated).toBe(false);
    });

    it("should allow 1-move units (Settler) to enter high-cost terrain (Hills)", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const settler = state.units.find(u => u.type === UnitType.Settler && u.ownerId === "p1");
        expect(settler).toBeDefined();

        const targetCoord = hexNeighbor(settler!.coord, 0);
        const tile = state.map.tiles.find(t => hexEquals(t.coord, targetCoord));
        if (tile) tile.terrain = TerrainType.Hills; // Cost 2

        const action: Action = {
            type: "MoveUnit",
            playerId: "p1",
            unitId: settler!.id,
            to: targetCoord,
        };

        const nextState = applyAction(state, action);
        const movedSettler = nextState.units.find(u => u.id === settler!.id);
        expect(movedSettler!.coord).toEqual(targetCoord);
        expect(movedSettler!.movesLeft).toBe(0); // 1 - 1 = 0
    });

    it("should apply movement penalty to >1 move units (Scout) entering high-cost terrain", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const scout = state.units.find(u => u.type === UnitType.Scout && u.ownerId === "p1");
        expect(scout).toBeDefined();

        const neighbors = [0, 1, 2, 3, 4, 5].map(d => hexNeighbor(scout!.coord, d));
        const targetCoord = neighbors.find(c => !state.units.some(u => hexEquals(u.coord, c)));
        if (!targetCoord) throw new Error("No empty neighbor for scout");
        const tile = state.map.tiles.find(t => hexEquals(t.coord, targetCoord));
        if (tile) tile.terrain = TerrainType.Hills; // Cost 2

        const action: Action = {
            type: "MoveUnit",
            playerId: "p1",
            unitId: scout!.id,
            to: targetCoord,
        };

        const nextState = applyAction(state, action);
        const movedScout = nextState.units.find(u => u.id === scout!.id);
        expect(movedScout!.coord).toEqual(targetCoord);
        expect(movedScout!.movesLeft).toBe(0); // 2 - 2 = 0
    });

    it("should prevent >1 move units from entering high-cost terrain if they lack movement", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        const scout = state.units.find(u => u.type === UnitType.Scout && u.ownerId === "p1");
        expect(scout).toBeDefined();
        scout!.movesLeft = 1; // Reduce moves to 1

        const targetCoord = hexNeighbor(scout!.coord, 0);
        const tile = state.map.tiles.find(t => hexEquals(t.coord, targetCoord));
        if (tile) tile.terrain = TerrainType.Hills; // Cost 2

        const action: Action = {
            type: "MoveUnit",
            playerId: "p1",
            unitId: scout!.id,
            to: targetCoord,
        };

        expect(() => applyAction(state, action)).toThrow("Not enough movement");
    });

    it("should move linked stacks together and unlink when the partner cannot follow", () => {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "A", color: "red" }] });
        state.currentPlayerId = "p1";
        state.map.width = 3;
        state.map.height = 1;
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
        ];

        const leaderId = "u_link_leader";
        const partnerId = "u_link_partner";
        state.units = [
            {
                id: leaderId,
                type: UnitType.Scout,
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 2,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: partnerId,
                type: UnitType.Settler,
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                hp: 10,
                maxHp: 1,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ];

        const linked = applyAction(state, { type: "LinkUnits", playerId: "p1", unitId: leaderId, partnerId });
        const firstStep = { q: 1, r: 0 };
        const afterPairedMove = applyAction(linked, { type: "MoveUnit", playerId: "p1", unitId: leaderId, to: firstStep });

        const movedLeader = afterPairedMove.units.find(u => u.id === leaderId)!;
        const movedPartner = afterPairedMove.units.find(u => u.id === partnerId)!;
        expect(movedLeader.coord).toEqual(firstStep);
        expect(movedPartner.coord).toEqual(firstStep);
        expect(movedLeader.linkedUnitId).toBe(partnerId);
        expect(movedPartner.linkedUnitId).toBe(leaderId);
        expect(movedLeader.movesLeft).toBe(movedPartner.movesLeft);

        movedLeader.movesLeft = 1;
        movedPartner.movesLeft = 0; // Force an invalid move for partner
        const secondStep = { q: 2, r: 0 };
        const afterForcedUnlink = applyAction(afterPairedMove, { type: "MoveUnit", playerId: "p1", unitId: leaderId, to: secondStep });
        const finalLeader = afterForcedUnlink.units.find(u => u.id === leaderId)!;
        const finalPartner = afterForcedUnlink.units.find(u => u.id === partnerId)!;

        expect(finalLeader.coord).toEqual(secondStep);
        expect(finalLeader.linkedUnitId).toBeUndefined();
        expect(finalPartner.coord).toEqual(firstStep);
        expect(finalPartner.linkedUnitId).toBeUndefined();
    });



    it("should enable shared vision on acceptance and revoke it automatically on war", () => {
        const state = generateWorld({
            mapSize: "Small",
            players: [
                { id: "p1", civName: "A", color: "red" },
                { id: "p2", civName: "B", color: "blue" },
            ],
        });
        state.currentPlayerId = "p1";

        state.contacts = {
            p1: { p2: true },
            p2: { p1: true },
        };
        state.diplomacy = {
            p1: { p2: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.Peace },
        };
        state.sharedVision = { p1: {}, p2: {} };
        state.diplomacyOffers = [{ from: "p2", to: "p1", type: "Vision" }];

        const accepted = applyAction(state, { type: "AcceptVisionShare", playerId: "p1", targetPlayerId: "p2" });
        expect(accepted.sharedVision.p1?.p2).toBe(true);
        expect(accepted.sharedVision.p2?.p1).toBe(true);
        expect(accepted.diplomacyOffers.some(o => o.type === "Vision")).toBe(false);

        const atWar = applyAction(accepted, { type: "SetDiplomacy", playerId: "p1", targetPlayerId: "p2", state: DiplomacyState.War });
        expect(atWar.diplomacy.p1?.p2).toBe(DiplomacyState.War);
        expect(atWar.sharedVision.p1?.p2).toBe(false);
        expect(atWar.sharedVision.p2?.p1).toBe(false);
    });
});
