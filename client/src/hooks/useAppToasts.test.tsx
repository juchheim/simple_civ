import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppToasts } from "./useAppToasts";
import { useGoodieHutAlerts } from "./useGoodieHutAlerts";
import { useGameEventToasts } from "../components/HUD/hooks/use-game-event-toasts";
import { useTutorialToasts } from "../components/HUD/hooks/use-tutorial-toasts";

vi.mock("./useGoodieHutAlerts", () => ({
    useGoodieHutAlerts: vi.fn(),
}));

vi.mock("../components/HUD/hooks/use-game-event-toasts", () => ({
    useGameEventToasts: vi.fn(),
}));

vi.mock("../components/HUD/hooks/use-tutorial-toasts", () => ({
    useTutorialToasts: vi.fn(),
}));

const mockUseGoodieHutAlerts = vi.mocked(useGoodieHutAlerts);
const mockUseGameEventToasts = vi.mocked(useGameEventToasts);
const mockUseTutorialToasts = vi.mocked(useTutorialToasts);

describe("useAppToasts", () => {
    const dismissGoodie = vi.fn();
    const dismissEvents = vi.fn();
    const dismissTutorial = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseGoodieHutAlerts.mockReturnValue({
            toasts: [{ id: "g1", message: "goodie", icon: "🎁" }],
            dismissToast: dismissGoodie,
        });
        mockUseGameEventToasts.mockReturnValue({
            toasts: [{ id: "e1", message: "event", icon: "📜" }],
            dismissToast: dismissEvents,
        });
        mockUseTutorialToasts.mockReturnValue({
            toasts: [{ id: "t1", message: "tutorial", icon: "⚠️" }],
            dismissToast: dismissTutorial,
        });
    });

    it("combines toasts in source order", () => {
        const { result } = renderHook(() => useAppToasts(null, "p1"));

        expect(result.current.toasts.map(t => t.id)).toEqual(["g1", "e1", "t1"]);
    });

    it("passes a fallback gameState to goodie hut alerts when state is null", () => {
        renderHook(() => useAppToasts(null, "p1"));

        expect(mockUseGoodieHutAlerts).toHaveBeenCalledWith(
            expect.objectContaining({
                map: expect.objectContaining({ tiles: [] }),
                units: [],
                players: [],
            }),
            "p1"
        );
    });

    it("dismisses toast from all toast sources", () => {
        const { result } = renderHook(() => useAppToasts(null, "p1"));

        act(() => {
            result.current.dismissToast("toast-123");
        });

        expect(dismissGoodie).toHaveBeenCalledWith("toast-123");
        expect(dismissEvents).toHaveBeenCalledWith("toast-123");
        expect(dismissTutorial).toHaveBeenCalledWith("toast-123");
    });
});
