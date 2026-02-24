import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BuildingType, City, DiplomacyState, GameState, PlayerPhase, TechId, TerrainType, Unit, UnitType, UnitState, EraId } from "@simple-civ/engine";
import React from "react";
import { applyAction } from "@simple-civ/engine";
import { CityPanel } from "./CityPanel";
import { CityBuildOptions } from "../hooks";
import { TutorialProvider } from "../../../contexts/TutorialContext";

const tile = (q: number, r: number, extras: Partial<GameState["map"]["tiles"][number]> = {}) => ({
    coord: { q, r },
    terrain: TerrainType.Plains,
    overlays: [],
    ...extras,
});

const baseCity = (): City => ({
    id: "city-1",
    name: "Capital",
    ownerId: "p1",
    coord: { q: 0, r: 0 },
    pop: 2,
    storedFood: 5,
    storedProduction: 3,
    buildings: [],
    workedTiles: [{ q: 0, r: 0 }],
    currentBuild: null,
    buildProgress: 0,
    hp: 20,
    maxHp: 20,
    isCapital: false,
    hasFiredThisTurn: false,
    milestones: [],
});



const baseGameState = (city: City, units: Unit[] = []): GameState => ({
    id: "game-1",
    turn: 1,
    players: [
        {
            id: "p1",
            civName: "Alpha",
            color: "#fff",
            techs: [],
            currentTech: { id: TechId.Fieldcraft, progress: 0, cost: 10 },
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
        width: 2,
        height: 2,
        tiles: [
            tile(0, 0, { ownerId: "p1", ownerCityId: city.id, hasCityCenter: true }),
            tile(0, 1, { ownerId: "p1", ownerCityId: city.id }),
        ],
    },
    units,
    cities: [city],
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
    nativeCamps: [],
});

const defaultBuildOptions: CityBuildOptions = {
    units: [{ id: UnitType.Scout, name: "Scout" }],
    buildings: [],
    projects: [],
};

const renderWithTutorial = (ui: Parameters<typeof render>[0]) =>
    render(ui, { wrapper: TutorialProvider });

describe("CityPanel", () => {
    it("renders build buttons and fires onBuild when clicked", () => {
        const city = baseCity();
        const onBuild = vi.fn();
        renderWithTutorial(
            <CityPanel
                city={city}
                isMyTurn={true}
                playerId="p1"
                gameState={baseGameState(city)}
                units={[]}
                buildOptions={defaultBuildOptions}
                onBuild={onBuild}
                onRushBuy={vi.fn()}
                onRazeCity={vi.fn()}

                onSetWorkedTiles={vi.fn()}
                onSelectUnit={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Train Scout" }));
        expect(onBuild).toHaveBeenCalledWith("Unit", UnitType.Scout);
    });

    it("sends updated worked tiles via onSetWorkedTiles when toggling tiles", () => {
        const city = baseCity();
        const onSetWorkedTiles = vi.fn();

        renderWithTutorial(
            <CityPanel
                city={city}
                isMyTurn={true}
                playerId="p1"
                gameState={baseGameState(city)}
                units={[]}
                buildOptions={defaultBuildOptions}
                onBuild={vi.fn()}
                onRushBuy={vi.fn()}
                onRazeCity={vi.fn()}

                onSetWorkedTiles={onSetWorkedTiles}
                onSelectUnit={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByLabelText("Tile 0,1 (Plains)"));

        expect(onSetWorkedTiles).toHaveBeenCalledWith(
            "city-1",
            expect.arrayContaining([{ q: 0, r: 1 }]),
        );
    });

    it("removes a worked tile when clicking to deselect (integration with applyAction)", () => {
        const city = { ...baseCity(), pop: 2, workedTiles: [{ q: 0, r: 0 }, { q: 0, r: 1 }] };
        const initialState = baseGameState(city);
        const Wrapper: React.FC = () => {
            const [gameState, setGameState] = React.useState<GameState>(initialState);
            const currentCity = gameState.cities[0];
            return (
                <CityPanel
                    city={currentCity}
                    isMyTurn={true}
                    playerId="p1"
                    gameState={gameState}
                    units={[]}
                    buildOptions={defaultBuildOptions}
                    onBuild={vi.fn()}
                    onRushBuy={vi.fn()}
                    onRazeCity={vi.fn()}

                    onSetWorkedTiles={(cityId, tiles) => {
                        setGameState(prev => applyAction(prev, {
                            type: "SetWorkedTiles",
                            playerId: "p1",
                            cityId,
                            tiles,
                        }));
                    }}
                    onSelectUnit={vi.fn()}
                    onClose={vi.fn()}
                />
            );
        };

        renderWithTutorial(<Wrapper />);

        const workedTileButton = screen.getByLabelText("Tile 0,1 (Plains)");
        expect(workedTileButton).toHaveClass("is-worked");

        fireEvent.click(workedTileButton);

        return waitFor(() => expect(workedTileButton).not.toHaveClass("is-worked"));
    });

    it("renders sparse view for enemy cities", () => {
        const city = { ...baseCity(), ownerId: "p2" }; // Owned by p2
        const units: Unit[] = [
            {
                id: "u1",
                ownerId: "p2",
                type: UnitType.SpearGuard,
                coord: { q: 0, r: 0 },
                hp: 100,
                maxHp: 100,
                movesLeft: 2,
                state: UnitState.Normal,
                hasAttacked: false,
            }
        ];
        const gameState = baseGameState(city, units);

        renderWithTutorial(
            <CityPanel
                city={city}
                isMyTurn={true}
                playerId="p1" // Viewing as p1
                gameState={gameState}
                units={units}
                buildOptions={defaultBuildOptions}
                onBuild={vi.fn()}
                onRushBuy={vi.fn()}
                onRazeCity={vi.fn()}
                onSetWorkedTiles={vi.fn()}
                onSelectUnit={vi.fn()}
                onClose={vi.fn()}
            />
        );

        // Should show basic info
        expect(screen.getByText("Capital")).toBeInTheDocument();
        expect(screen.getByText(/Pop 2/)).toBeInTheDocument();
        expect(screen.getByText(/HP 20\/20/)).toBeInTheDocument();

        // Should show stationed units
        expect(screen.getByText("Garrison: SpearGuard")).toBeInTheDocument();

        // Should NOT show sensitive info
        expect(screen.queryByText("Production")).not.toBeInTheDocument();
        expect(screen.queryByText("Worked Tiles")).not.toBeInTheDocument();
        expect(screen.queryByText(/Yields:/)).not.toBeInTheDocument();
        expect(screen.queryByText("Stored Food:")).not.toBeInTheDocument();
    });

    it("shows discounted rush-buy cost from city gold buildings", () => {
        const city = {
            ...baseCity(),
            buildings: [BuildingType.TradingPost],
            currentBuild: { type: "Building" as const, id: BuildingType.Farmstead, cost: 40 },
            buildProgress: 0,
        };
        const gameState = baseGameState(city);
        gameState.players[0].treasury = 38;
        const onRushBuy = vi.fn();

        renderWithTutorial(
            <CityPanel
                city={city}
                isMyTurn={true}
                playerId="p1"
                gameState={gameState}
                units={[]}
                buildOptions={defaultBuildOptions}
                onBuild={vi.fn()}
                onRushBuy={onRushBuy}
                onRazeCity={vi.fn()}
                onSetWorkedTiles={vi.fn()}
                onSelectUnit={vi.fn()}
                onClose={vi.fn()}
            />,
        );

        const rushBuy = screen.getByRole("button", { name: "Rush-Buy (38G (-5%))" });
        expect(rushBuy).toBeEnabled();
        fireEvent.click(rushBuy);
        expect(onRushBuy).toHaveBeenCalledWith("city-1");
    });
});
