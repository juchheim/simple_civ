import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppInteractionBindings } from "./useAppInteractionBindings";
import { useGlobalHotkeys } from "./useGlobalHotkeys";
import { useInteractionController } from "./useInteractionController";

vi.mock("./useInteractionController", () => ({
    useInteractionController: vi.fn(),
}));

vi.mock("./useGlobalHotkeys", () => ({
    useGlobalHotkeys: vi.fn(),
}));

const mockUseInteractionController = vi.mocked(useInteractionController);
const mockUseGlobalHotkeys = vi.mocked(useGlobalHotkeys);

describe("useAppInteractionBindings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseInteractionController.mockReturnValue({
            selectedCoord: { q: 1, r: 2 },
            setSelectedCoord: vi.fn(),
            selectedUnitId: "u1",
            setSelectedUnitId: vi.fn(),
            pendingWarAttack: null,
            setPendingWarAttack: vi.fn(),
            pendingCombatPreview: null,
            confirmCombatPreview: vi.fn(),
            cancelCombatPreview: vi.fn(),
            handleTileClick: vi.fn(),
            reachableCoordSet: new Set<string>(),
        } as any);
    });

    it("wires interaction controller with dispatchAction wrapper", () => {
        const runActions = vi.fn();

        renderHook(() => useAppInteractionBindings({
            gameState: null,
            playerId: "p1",
            runActions,
            showCombatPreview: true,
            showTechTree: false,
            showGameMenu: false,
            closeTechTree: vi.fn(),
            closeGameMenu: vi.fn(),
            openGameMenu: vi.fn(),
        }));

        const args = mockUseInteractionController.mock.calls[0]?.[0];
        expect(args?.playerId).toBe("p1");
        expect(args?.showCombatPreview).toBe(true);

        act(() => {
            args?.dispatchAction({ type: "Resign", playerId: "p1" });
        });
        expect(runActions).toHaveBeenCalledWith([{ type: "Resign", playerId: "p1" }]);
    });

    it("provides clearSelection and registers global hotkeys", () => {
        const setSelectedCoord = vi.fn();
        const setSelectedUnitId = vi.fn();
        mockUseInteractionController.mockReturnValueOnce({
            selectedCoord: { q: 0, r: 0 },
            setSelectedCoord,
            selectedUnitId: "u1",
            setSelectedUnitId,
            pendingWarAttack: null,
            setPendingWarAttack: vi.fn(),
            pendingCombatPreview: null,
            confirmCombatPreview: vi.fn(),
            cancelCombatPreview: vi.fn(),
            handleTileClick: vi.fn(),
            reachableCoordSet: new Set<string>(),
        } as any);

        const { result } = renderHook(() => useAppInteractionBindings({
            gameState: null,
            playerId: "p1",
            runActions: vi.fn(),
            showCombatPreview: true,
            showTechTree: true,
            showGameMenu: true,
            closeTechTree: vi.fn(),
            closeGameMenu: vi.fn(),
            openGameMenu: vi.fn(),
        }));

        expect(mockUseGlobalHotkeys).toHaveBeenCalledTimes(1);

        act(() => {
            result.current.clearSelection();
        });

        expect(setSelectedCoord).toHaveBeenCalledWith(null);
        expect(setSelectedUnitId).toHaveBeenCalledWith(null);
    });
});
