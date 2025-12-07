import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HUD } from "../HUD";
import {
    GameState,
    Unit,
    City,
    UnitType,
    UnitState,
    TerrainType,
    PlayerPhase,
    EraId,
    DiplomacyState,
    TechId,
} from "@simple-civ/engine";
import * as Engine from "@simple-civ/engine";
import { MapViewport } from "../GameMap";

const tile = (q: number, r: number, extras: Partial<GameState["map"]["tiles"][number]> = {}) => ({
    coord: { q, r },
    terrain: TerrainType.Plains,
    overlays: [],
    ...extras,
});

const createGameState = (overrides: Partial<GameState> = {}): GameState => ({
    id: "game-1",
    turn: 3,
    players: [
        {
            id: "p1",
            civName: "Alpha",
            color: "#fff",
            techs: [],
            currentTech: { id: TechId.Fieldcraft, progress: 4, cost: 20 },
            completedProjects: [],
            isEliminated: false,
            currentEra: EraId.Primitive,
        },
        {
            id: "p2",
            civName: "Beta",
            color: "#0ff",
            techs: [],
            currentTech: null,
            completedProjects: [],
            isEliminated: false,
            currentEra: EraId.Primitive,
        },
    ],
    currentPlayerId: "p1",
    phase: PlayerPhase.Action,
    map: {
        width: 3,
        height: 3,
        tiles: [
            tile(0, 0, { ownerId: "p1", ownerCityId: "city-1", hasCityCenter: true }),
            tile(0, 1, { ownerId: "p1", ownerCityId: "city-1" }),
            tile(1, 0, { ownerId: "p1", ownerCityId: "city-1" }),
        ],
    },
    units: [],
    cities: [],
    seed: 1,
    visibility: { p1: [], p2: [] },
    revealed: { p1: [], p2: [] },
    diplomacy: {
        p1: { p2: DiplomacyState.Peace },
        p2: { p1: DiplomacyState.Peace },
    },
    sharedVision: {},
    contacts: { p1: { p2: true }, p2: { p1: true } },
    diplomacyOffers: [],
    ...overrides,
});

const createUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: "unit-1",
    type: UnitType.Settler,
    ownerId: "p1",
    coord: { q: 0, r: 0 },
    hp: 10,
    maxHp: 10,
    movesLeft: 2,
    state: UnitState.Normal,
    hasAttacked: false,
    ...overrides,
});

const createCity = (overrides: Partial<City> = {}): City => ({
    id: "city-1",
    name: "Alpha Prime",
    ownerId: "p1",
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
    ...overrides,
});

const mockMapView: MapViewport = {
    pan: { x: 0, y: 0 },
    zoom: 1,
    size: { width: 800, height: 600 },
    worldBounds: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
    center: { x: 0, y: 0 },
};

describe("HUD", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders selected unit info and reflects link availability", () => {
        const selectedUnit = createUnit({ id: "u-1", type: UnitType.Settler });
        const partner = createUnit({ id: "u-2", type: UnitType.Scout });
        const gameState = createGameState({
            units: [selectedUnit, partner],
        });
        render(
            <HUD
                gameState={gameState}
                selectedCoord={{ q: 0, r: 0 }}
                selectedUnitId="u-1"
                onAction={vi.fn()}
                onSelectUnit={vi.fn()}
                onShowTechTree={vi.fn()}
                playerId="p1"
                onSave={vi.fn()}
                onLoad={vi.fn()}
                onRestart={vi.fn()}
                onResign={vi.fn()}
                onQuit={vi.fn()}
                showShroud={true}
                onToggleShroud={vi.fn()}
                showYields={false}
                onToggleYields={vi.fn()}
                onSelectCoord={vi.fn()}
                onCenterCity={vi.fn()}
                mapView={mockMapView}
                onNavigateMap={vi.fn()}
                showGameMenu={false}
                onToggleGameMenu={vi.fn()}
            />,
        );

        expect(screen.getByText(/Unit: Settler/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Link" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Unlink" })).toBeDisabled();
    });

    it("shows idle city build buttons and dispatches SetCityBuild", () => {
        const canBuildSpy = vi.spyOn(Engine, "canBuild").mockReturnValue(true);
        const city = createCity();
        const gameState = createGameState({
            cities: [city],
        });
        const onAction = vi.fn();

        render(
            <HUD
                gameState={gameState}
                selectedCoord={city.coord}
                selectedUnitId={null}
                onAction={onAction}
                onSelectUnit={vi.fn()}
                onShowTechTree={vi.fn()}
                playerId="p1"
                onSave={vi.fn()}
                onLoad={vi.fn()}
                onRestart={vi.fn()}
                onResign={vi.fn()}
                onQuit={vi.fn()}
                showShroud={true}
                onToggleShroud={vi.fn()}
                showYields={false}
                onToggleYields={vi.fn()}
                onSelectCoord={vi.fn()}
                onCenterCity={vi.fn()}
                mapView={mockMapView}
                onNavigateMap={vi.fn()}
                showGameMenu={false}
                onToggleGameMenu={vi.fn()}
            />,
        );

        const scoutButton = screen.getByRole("button", { name: "Train Scout" });
        expect(scoutButton).toBeInTheDocument();
        fireEvent.click(scoutButton);

        expect(onAction).toHaveBeenCalledWith({
            type: "SetCityBuild",
            playerId: "p1",
            cityId: "city-1",
            buildType: "Unit",
            buildId: UnitType.Scout,
        });
        expect(canBuildSpy).toHaveBeenCalled();
    });

    it("surfaces diplomacy offers and accepts incoming peace", () => {
        const gameState = createGameState({
            diplomacy: {
                p1: { p2: DiplomacyState.War },
                p2: { p1: DiplomacyState.War },
            },
            diplomacyOffers: [{ from: "p2", to: "p1", type: "Peace" }],
        });
        const onAction = vi.fn();

        render(
            <HUD
                gameState={gameState}
                selectedCoord={null}
                selectedUnitId={null}
                onAction={onAction}
                onSelectUnit={vi.fn()}
                onShowTechTree={vi.fn()}
                playerId="p1"
                onSave={vi.fn()}
                onLoad={vi.fn()}
                onRestart={vi.fn()}
                onResign={vi.fn()}
                onQuit={vi.fn()}
                showShroud={true}
                onToggleShroud={vi.fn()}
                showYields={false}
                onToggleYields={vi.fn()}
                onSelectCoord={vi.fn()}
                onCenterCity={vi.fn()}
                mapView={mockMapView}
                onNavigateMap={vi.fn()}
                showGameMenu={false}
                onToggleGameMenu={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Diplomacy" }));
        expect(screen.getByRole("button", { name: "At War" })).toBeDisabled();
        const acceptButton = screen.getByRole("button", { name: "Accept Peace" });
        fireEvent.click(acceptButton);

        expect(onAction).toHaveBeenCalledWith({
            type: "AcceptPeace",
            playerId: "p1",
            targetPlayerId: "p2",
        });
    });

    it("does not block turn when tech tree is completed", () => {
        // Mock a player with NO available techs (tech tree complete)
        // We'll mock pickBestAvailableTech to return null
        vi.spyOn(Engine, "pickBestAvailableTech").mockReturnValue(null);

        const gameState = createGameState({
            players: [
                {
                    id: "p1",
                    civName: "Alpha",
                    color: "#fff",
                    techs: [], // Doesn't matter if we mock the helper
                    currentTech: null, // No current tech selected
                    completedProjects: [],
                    isEliminated: false,
                    currentEra: EraId.Primitive,
                },
            ],
            currentPlayerId: "p1",
        });

        const onAction = vi.fn();

        render(
            <HUD
                gameState={gameState}
                selectedCoord={null}
                selectedUnitId={null}
                onAction={onAction}
                onSelectUnit={vi.fn()}
                onShowTechTree={vi.fn()}
                playerId="p1"
                onSave={vi.fn()}
                onLoad={vi.fn()}
                onRestart={vi.fn()}
                onResign={vi.fn()}
                onQuit={vi.fn()}
                showShroud={true}
                onToggleShroud={vi.fn()}
                showYields={false}
                onToggleYields={vi.fn()}
                onSelectCoord={vi.fn()}
                onCenterCity={vi.fn()}
                mapView={mockMapView}
                onNavigateMap={vi.fn()}
                showGameMenu={false}
                onToggleGameMenu={vi.fn()}
            />,
        );

        // Should NOT show blocking tasks
        const pill = screen.getByText(/Blocking: 0/i);
        expect(pill).toBeInTheDocument();

        // Should allow updating turn
        // Note: The "End Turn" button is inside TurnSummary, which we can't easily click here without more setup,
        // but checking blocking count is sufficient for this logic unit test.
    });
});
