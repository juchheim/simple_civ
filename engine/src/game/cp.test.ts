import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop";
import { generateWorld } from "../map/map-generator";
import { Action, UnitType, EraId, GameState } from "../core/types";

describe("Command Points (CP)", () => {
    function setupGameWithEra(era: EraId): GameState {
        const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "Testing", color: "red" }] });
        const p1 = state.players[0];
        p1.currentEra = era;
        // Start turn to initialize CP
        state.currentPlayerId = "p2";
        // End p2's turn to start p1's turn
        return applyAction(state, { type: "EndTurn", playerId: "p2" });
    }

    it("should grant 0 CP to Primitive era players", () => {
        const state = setupGameWithEra(EraId.Primitive);
        const p1 = state.players[0];
        expect(p1.commandPoints).toBe(0);
        expect(p1.maxCommandPoints).toBe(0);
    });

    it("should grant 1 CP to Hearth era players", () => {
        const state = setupGameWithEra(EraId.Hearth);
        const p1 = state.players[0];
        expect(p1.commandPoints).toBe(1);
        expect(p1.maxCommandPoints).toBe(1);
    });

    it("should allow a spent unit to receive a CP and gain an extra action", () => {
        let state = setupGameWithEra(EraId.Hearth);
        const scout = state.units.find(u => u.type === UnitType.Scout && u.ownerId === "p1");
        expect(scout).toBeDefined();
        if (!scout) return;

        // Exhaust unit manually
        scout.movesLeft = 0;
        scout.hasAttacked = true;

        const action: Action = {
            type: "GrantCommandPoint",
            playerId: "p1",
            unitId: scout.id,
        };
        state = applyAction(state, action);

        const p1 = state.players[0];
        const updatedScout = state.units.find(u => u.id === scout.id);

        expect(p1.commandPoints).toBe(0); // 1 CP used
        expect(updatedScout?.movesLeft).toBeGreaterThan(0);
        expect(updatedScout?.hasAttacked).toBe(false);
        expect(updatedScout?.cpGranted).toBe(true);
        expect(updatedScout?.hasUsedCP).toBeFalsy();
    });

    it("should throw if trying to grant CP twice in one turn (Rule of Two)", () => {
        let state = setupGameWithEra(EraId.Banner); // 2 CP
        const scout = state.units.find(u => u.type === UnitType.Scout && u.ownerId === "p1");
        if (!scout) return;

        // Exhaust unit manually
        scout.movesLeft = 0;
        scout.hasAttacked = true;

        // First CP
        state = applyAction(state, { type: "GrantCommandPoint", playerId: "p1", unitId: scout.id });

        // Try second CP
        expect(() => {
            applyAction(state, { type: "GrantCommandPoint", playerId: "p1", unitId: scout.id });
        }).toThrow("used or received a Command Point");
    });

    it("should throw if trying to grant CP when pool is empty", () => {
        let state = setupGameWithEra(EraId.Primitive); // 0 CP
        const scout = state.units.find(u => u.type === UnitType.Scout && u.ownerId === "p1");
        if (!scout) return;

        expect(() => {
            applyAction(state, { type: "GrantCommandPoint", playerId: "p1", unitId: scout.id });
        }).toThrow("No Command Points available");
    });
});
