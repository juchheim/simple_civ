// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";

import { ReplayMap } from "./ReplayMap";
import { GameState, TerrainType, PlayerPhase, EraId } from "@simple-civ/engine";

// Minimal mock of GameState
const createMockGameState = (maxTurn: number, events: any[] = []): GameState => ({
    id: "test-game",
    turn: maxTurn,
    endTurn: maxTurn,
    players: [],
    currentPlayerId: "p1",
    phase: PlayerPhase.Action,
    map: {
        width: 5,
        height: 5,
        tiles: Array.from({ length: 25 }, () => ({
            coord: { q: 0, r: 0 }, // dummy
            terrain: TerrainType.Plains,
            overlays: [],
        })),
    },
    units: [],
    cities: [],
    seed: 123,
    visibility: {},
    revealed: {},
    diplomacy: {},
    sharedVision: {},
    contacts: {},
    diplomacyOffers: [],
    nativeCamps: [],
    history: {
        events: events,
        playerFog: {},
        playerStats: {}, // Added missing required property
    },
});

describe("ReplayMap Smart Replay", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("advances turns automatically", () => {
        const gameState = createMockGameState(10);
        render(<ReplayMap gameState={gameState} playerId="p1" />);

        // Starts at turn 0
        screen.getByText("Turn: 0 / 10");

        // Advance 310ms (default speed 300ms + buffer)
        act(() => {
            vi.advanceTimersByTime(310);
        });

        screen.getByText("Turn: 1 / 10");
    });

    it("slows down when an event is present (Smart Slowdown)", () => {
        const events = [
            { turn: 2, type: "CityFounded", playerId: "p1", data: { cityName: "TestCity" } }
        ];
        const gameState = createMockGameState(10, events);
        render(<ReplayMap gameState={gameState} playerId="p1" />);

        // Turn 0 -> 1 (300ms)
        act(() => vi.advanceTimersByTime(310));
        screen.getByText("Turn: 1 / 10");

        // Turn 1 -> 2 (300ms)
        act(() => vi.advanceTimersByTime(310));
        screen.getByText("Turn: 2 / 10");

        // Turn 2 has event! Should stay on Turn 2 for 2000ms.
        // Advance 300ms -> Should still be Turn 2
        act(() => vi.advanceTimersByTime(310)); // 310 to be safe
        screen.getByText("Turn: 2 / 10");

        // Advance another 1000ms (total 1310ms) -> Still Turn 2
        act(() => vi.advanceTimersByTime(1000));
        screen.getByText("Turn: 2 / 10");

        // Advance to >2000ms total -> Should move to Turn 3
        act(() => vi.advanceTimersByTime(800)); // Total 2110ms since start of Turn 2
        screen.getByText("Turn: 3 / 10");
    });

    it("adjusts speed with controls", () => {
        const gameState = createMockGameState(10);
        render(<ReplayMap gameState={gameState} playerId="p1" />);

        // Click 2x speed
        const speed2x = screen.getByRole("button", { name: "2x" });
        fireEvent.click(speed2x);

        // Delay should be 300 / 2 = 150ms.
        // Wait 160ms.
        act(() => vi.advanceTimersByTime(160));
        screen.getByText("Turn: 1 / 10");

        // Click 0.5x speed
        const speedHalf = screen.getByRole("button", { name: "0.5x" });
        fireEvent.click(speedHalf);

        // Delay should be 300 / 0.5 = 600ms.
        // We are at Turn 1.
        // Wait 160ms (less than 600)
        act(() => vi.advanceTimersByTime(160));
        screen.getByText("Turn: 1 / 10");

        // Wait rest (450ms) -> Total > 600ms
        act(() => vi.advanceTimersByTime(450));
        screen.getByText("Turn: 2 / 10");
    });

    it("does not render empty bubbles for unhandled events", () => {
        // Unknown event type
        const events = [
            { turn: 1, type: "SomeFutureEvent", data: {} }
        ];
        const gameState = createMockGameState(10, events);
        render(<ReplayMap gameState={gameState} playerId="p1" />);

        // Advance to turn 1
        act(() => vi.advanceTimersByTime(310));
        screen.getByText("Turn: 1 / 10");

        // The overlay should be empty
        const overlay = screen.getByTestId("event-overlay");
        expect(overlay.children.length).toBe(0);
    });


    it("filters out events from other players", () => {
        const events = [
            { turn: 1, type: "CityFounded", playerId: "p2", data: { cityName: "EnemyCity" } }
        ];
        const gameState = createMockGameState(10, events);
        render(<ReplayMap gameState={gameState} playerId="p1" />);

        act(() => vi.advanceTimersByTime(310));

        const overlay = screen.getByTestId("event-overlay");
        expect(overlay.children.length).toBe(0);
        expect(screen.queryByText(/EnemyCity/)).toBeNull();
    });

    it("shows specific details for Tech and CivContact", () => {
        const events = [
            { turn: 1, type: "TechResearched", playerId: "p1", data: { techId: "IronWorking" } },
            { turn: 2, type: "CivContact", playerId: "p1", data: { targetId: "p2" } }
        ];

        const gameState = createMockGameState(10, events);
        // Add player p2 to mock so we can resolve name
        gameState.players = [
            { id: "p1", civName: "MyCiv", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: EraId.Primitive },
            { id: "p2", civName: "EnemyEmpire", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: EraId.Primitive }
        ];

        render(<ReplayMap gameState={gameState} playerId="p1" />);

        // Turn 1: Tech
        act(() => vi.advanceTimersByTime(310));
        screen.getByText("Researched: Iron Working");

        // Turn 2: Contact
        // Wait for turn duration... Tech event has Smart Slowdown (2000ms)
        act(() => vi.advanceTimersByTime(2050));
        screen.getByText("Met Civilization: Enemy Empire");
    });

    it("shows specific details for CityCaptured", () => {
        const events = [
            { turn: 1, type: "CityCaptured", playerId: "p1", data: { cityName: "ConqueredCity", cityId: "c1" } }
        ];
        const gameState = createMockGameState(10, events);
        render(<ReplayMap gameState={gameState} playerId="p1" />);

        act(() => vi.advanceTimersByTime(310));
        screen.getByText("City Captured: ConqueredCity");
    });

    it("restarts replay from beginning if play is clicked after completion", () => {
        const events: any[] = [];
        const gameState = createMockGameState(5, events);
        render(<ReplayMap gameState={gameState} playerId="p1" />);

        // Fast forward to end
        const slider = screen.getByRole("slider");
        fireEvent.change(slider, { target: { value: "5" } });

        // Ensure we are paused (slider interaction pauses)
        // Click play to restart
        const playButton = screen.getByText("▶");
        fireEvent.click(playButton);

        // Should be playing now (button shows pause)
        screen.getByText("||");
        // Turn should be reset to 0
        screen.getByText("Turn: 0 / 5");
    });

    it("does not show CivContact when initiated by other player", () => {
        const events = [
            // p2 meets p1. p1 should NOT see this message.
            { turn: 1, type: "CivContact", playerId: "p2", data: { targetId: "p1" } },
            // p1 meets p2. p1 SHOULD see this.
            { turn: 2, type: "CivContact", playerId: "p1", data: { targetId: "p2" } }
        ];

        const gameState = createMockGameState(10, events);
        gameState.players = [
            { id: "p1", civName: "MyCiv", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: EraId.Primitive },
            { id: "p2", civName: "EnemyEmpire", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: EraId.Primitive }
        ];

        render(<ReplayMap gameState={gameState} playerId="p1" />);

        // Turn 1: p2 finds me. Should be hidden.
        act(() => vi.advanceTimersByTime(310));
        const overlay = screen.getByTestId("event-overlay");
        expect(overlay.children.length).toBe(0);
        expect(screen.queryByText(/Met Civilization/)).toBeNull();

        // Turn 2: I find p2. Should be visible.
        // Note: ghost pause for turn 1 (2000ms) because event is in activeEvents but hidden
        act(() => vi.advanceTimersByTime(2050));
        screen.getByText("Met Civilization: Enemy Empire");
    });
});
