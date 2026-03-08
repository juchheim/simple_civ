import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InGameContent } from "./InGameContent";

vi.mock("../GameMap", () => ({
    GameMap: React.forwardRef<HTMLDivElement>((_props, _ref) => <div data-testid="game-map" />),
}));

vi.mock("../HUD", () => ({
    HUD: () => <div data-testid="hud" />,
}));

vi.mock("../TechTree", () => ({
    TechTree: () => null,
}));

vi.mock("../EndGame/EndGameExperience", () => ({
    EndGameExperience: () => null,
}));

vi.mock("../HUD/sections", () => ({
    CombatPreviewModal: () => null,
    WarDeclarationModal: () => null,
}));

vi.mock("../SaveGameModal", () => ({
    SaveGameModal: () => null,
}));

vi.mock("../Toast", () => ({
    ToastContainer: () => null,
}));

function makeGameState(width: number, height: number) {
    return {
        id: `game-${width}x${height}`,
        turn: 1,
        currentPlayerId: "p1",
        players: [{ id: "p1", civName: "ForgeClans", color: "#fff", isAI: false }],
        cities: [],
        units: [],
        map: { width, height, tiles: [] },
        diplomacy: {},
        winnerId: null,
    } as any;
}

function baseProps(overrides: Partial<React.ComponentProps<typeof InGameContent>> = {}): React.ComponentProps<typeof InGameContent> {
    return {
        gameState: makeGameState(30, 22),
        mapRef: { current: null },
        playerId: "p1",
        selectedCoord: null,
        selectedUnitId: null,
        reachableCoordSet: new Set(),
        showShroud: false,
        showTileYields: false,
        cityToCenter: null,
        onSetMapView: vi.fn(),
        onTileClick: vi.fn(),
        toasts: [],
        onDismissToast: vi.fn(),
        onAction: vi.fn(),
        onSelectUnit: vi.fn(),
        onSelectCoord: vi.fn(),
        onShowTechTree: vi.fn(),
        onSave: vi.fn(),
        onLoad: vi.fn(),
        onRestart: vi.fn(),
        onResign: vi.fn(),
        onQuit: vi.fn(),
        onToggleShroud: vi.fn(),
        onToggleYields: vi.fn(),
        showCombatPreview: false,
        onToggleCombatPreview: vi.fn(),
        onCenterCity: vi.fn(),
        mapView: null,
        onNavigateMap: vi.fn(),
        showGameMenu: false,
        onToggleGameMenu: vi.fn(),
        musicEnabled: false,
        onToggleMusic: vi.fn(),
        musicVolume: 0.5,
        onMusicVolumeChange: vi.fn(),
        musicStatusLabel: "off",
        showTechTree: false,
        onCloseTechTree: vi.fn(),
        onChooseTech: vi.fn(),
        pendingWarAttack: null,
        setPendingWarAttack: vi.fn(),
        runActions: vi.fn(),
        clearSelection: vi.fn(),
        pendingCombatPreview: null,
        confirmCombatPreview: vi.fn(),
        cancelCombatPreview: vi.fn(),
        onDisableCombatPreview: vi.fn(),
        showSaveModal: false,
        onCloseSaveModal: vi.fn(),
        onConfirmSave: vi.fn(),
        error: null,
        setError: vi.fn(),
        ...overrides,
    };
}

describe("InGameContent", () => {
    it("does not show the modal on huge maps when no map-specific rules are active", () => {
        render(<InGameContent {...baseProps({ gameState: makeGameState(40, 30) })} />);

        expect(screen.queryByText("Map-Specific Victory Rules")).not.toBeInTheDocument();
    });

    it("does not show the modal on maps with standard victory rules", () => {
        render(<InGameContent {...baseProps({ gameState: makeGameState(30, 22) })} />);

        expect(screen.queryByText("Map-Specific Victory Rules")).not.toBeInTheDocument();
    });
});
