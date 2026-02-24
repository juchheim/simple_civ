import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UnitPanel } from "./UnitPanel";
import { GameState, PlayerPhase, Unit, UnitState, UnitType, EraId } from "@simple-civ/engine";
import { TutorialProvider } from "../../../contexts/TutorialContext";

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

const mockGameState: GameState = {
    id: "g1",
    turn: 1,
    players: [{ id: "p1", civName: "Civ", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: EraId.Primitive }],
    currentPlayerId: "p1",
    phase: PlayerPhase.Action,
    map: { width: 10, height: 10, tiles: [] },
    units: [],
    cities: [],
    seed: 1,
    visibility: {},
    revealed: {},
    diplomacy: {},
    sharedVision: {},
    contacts: {},
    diplomacyOffers: [],
    nativeCamps: [],
};

const renderWithTutorial = (ui: Parameters<typeof render>[0]) =>
    render(ui, { wrapper: TutorialProvider });

describe("UnitPanel", () => {
    it("reflects link button enablement and hides found city when not my turn", () => {
        const unit = createUnit({ type: UnitType.Scout });
        renderWithTutorial(
            <UnitPanel
                unit={unit}
                linkedPartner={null}
                canLinkUnits={false}
                canUnlinkUnits={true}
                isMyTurn={false}
                onLinkUnits={vi.fn()}
                onUnlinkUnits={vi.fn()}
                onFoundCity={vi.fn()}
                onToggleAutoExplore={vi.fn()}
                onFortifyUnit={vi.fn()}
                onDisbandUnit={vi.fn()}
                onCancelMovement={vi.fn()}
                gameState={mockGameState}
            />,
        );

        expect(screen.getByRole("button", { name: "Link" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Unlink" })).toBeEnabled();
        expect(screen.queryByText("Found City")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Disband" })).not.toBeInTheDocument();
    });

    it("fires callbacks when actions are enabled", () => {
        const onLink = vi.fn();
        const onUnlink = vi.fn();
        const onFoundCity = vi.fn();
        const onFortify = vi.fn();
        const onDisband = vi.fn();
        const unit = createUnit();

        renderWithTutorial(
            <UnitPanel
                unit={unit}
                linkedPartner={null}
                canLinkUnits={true}
                canUnlinkUnits={true}
                isMyTurn={true}
                onLinkUnits={onLink}
                onUnlinkUnits={onUnlink}
                onFoundCity={onFoundCity}
                onToggleAutoExplore={vi.fn()}
                onFortifyUnit={onFortify}
                onDisbandUnit={onDisband}
                onCancelMovement={vi.fn()}
                gameState={mockGameState}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Link" }));
        fireEvent.click(screen.getByRole("button", { name: "Unlink" }));
        fireEvent.click(screen.getByText("Found City"));
        fireEvent.click(screen.getByRole("button", { name: "Disband" }));

        expect(onLink).toHaveBeenCalledTimes(1);
        expect(onUnlink).toHaveBeenCalledTimes(1);
        expect(onFoundCity).toHaveBeenCalledTimes(1);
        expect(onDisband).toHaveBeenCalledTimes(1);
    });

    it("enables Fortify button for eligible units", () => {
        const onFortify = vi.fn();
        const unit = createUnit({ type: UnitType.Scout, movesLeft: 1, state: UnitState.Normal });

        renderWithTutorial(
            <UnitPanel
                unit={unit}
                linkedPartner={null}
                canLinkUnits={false}
                canUnlinkUnits={false}
                isMyTurn={true}
                onLinkUnits={vi.fn()}
                onUnlinkUnits={vi.fn()}
                onFoundCity={vi.fn()}
                onToggleAutoExplore={vi.fn()}
                onFortifyUnit={onFortify}
                onDisbandUnit={vi.fn()}
                onCancelMovement={vi.fn()}
                gameState={mockGameState}
            />,
        );

        const btn = screen.getByRole("button", { name: "Fortify" });
        expect(btn).toBeEnabled();
        fireEvent.click(btn);
        expect(onFortify).toHaveBeenCalled();
    });

    it("disables Fortify button for Settlers", () => {
        const unit = createUnit({ type: UnitType.Settler, movesLeft: 1 });

        renderWithTutorial(
            <UnitPanel
                unit={unit}
                linkedPartner={null}
                canLinkUnits={false}
                canUnlinkUnits={false}
                isMyTurn={true}
                onLinkUnits={vi.fn()}
                onUnlinkUnits={vi.fn()}
                onFoundCity={vi.fn()}
                onToggleAutoExplore={vi.fn()}
                onFortifyUnit={vi.fn()}
                onDisbandUnit={vi.fn()}
                onCancelMovement={vi.fn()}
                gameState={mockGameState}
            />,
        );

        expect(screen.getByRole("button", { name: "Fortify" })).toBeDisabled();
    });
});
