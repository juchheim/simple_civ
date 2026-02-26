import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InGameContentAdapter } from "./InGameContentAdapter";
import { InGameContent } from "./InGameContent";

vi.mock("./InGameContent", () => ({
    InGameContent: vi.fn(() => <div>in-game-content</div>),
}));

const mockInGameContent = vi.mocked(InGameContent);

function makeProps(
    overrides: Partial<React.ComponentProps<typeof InGameContentAdapter>> = {}
): React.ComponentProps<typeof InGameContentAdapter> {
    return {
        gameState: {
            id: "game-1",
            players: [],
            units: [],
            cities: [],
            turn: 1,
            currentPlayerId: "p1",
            phase: "Action",
            map: { width: 1, height: 1, tiles: [] },
            seed: 1,
            diplomacy: {},
            diplomacyOffers: [],
            visibility: {},
            revealed: {},
            sharedVision: {},
            contacts: {},
        } as any,
        mapRef: { current: null },
        playerId: "p1",
        selectedCoord: null,
        selectedUnitId: null,
        reachableCoordSet: new Set<string>(),
        showShroud: true,
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
        showCombatPreview: true,
        onToggleCombatPreview: vi.fn(),
        onCenterCity: vi.fn(),
        mapView: null,
        onNavigateMap: vi.fn(),
        showGameMenu: false,
        onToggleGameMenu: vi.fn(),
        musicEnabled: true,
        onToggleMusic: vi.fn(),
        musicVolume: 0.5,
        onMusicVolumeChange: vi.fn(),
        musicStatusLabel: "Music is idle.",
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

describe("InGameContentAdapter", () => {
    it("renders nothing when gameState is null", () => {
        const props = makeProps({ gameState: null });
        render(<InGameContentAdapter {...props} />);

        expect(screen.queryByText("in-game-content")).toBeNull();
        expect(mockInGameContent).not.toHaveBeenCalled();
    });

    it("renders InGameContent and forwards props when gameState is present", () => {
        const props = makeProps();
        render(<InGameContentAdapter {...props} />);

        expect(screen.getByText("in-game-content")).toBeTruthy();
        expect(mockInGameContent).toHaveBeenCalled();
        const call = mockInGameContent.mock.calls[0]?.[0];
        expect(call?.gameState).toBe(props.gameState);
        expect(call?.playerId).toBe(props.playerId);
        expect(call?.mapRef).toBe(props.mapRef);
    });
});
