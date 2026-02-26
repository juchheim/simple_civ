import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncTutorialGameId } from "./useSyncTutorialGameId";
import { useTutorial } from "../contexts/TutorialContext";

vi.mock("../contexts/TutorialContext", () => ({
    useTutorial: vi.fn(),
}));

const mockUseTutorial = vi.mocked(useTutorial);

describe("useSyncTutorialGameId", () => {
    const setGameId = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseTutorial.mockReturnValue({ setGameId } as any);
    });

    it("syncs initial gameId to tutorial context", () => {
        renderHook(() => useSyncTutorialGameId("game-1"));
        expect(setGameId).toHaveBeenCalledWith("game-1");
    });

    it("syncs updates when gameId changes", () => {
        const { rerender } = renderHook(
            ({ gameId }) => useSyncTutorialGameId(gameId),
            { initialProps: { gameId: "game-1" as string | null } }
        );

        rerender({ gameId: "game-2" });
        expect(setGameId).toHaveBeenNthCalledWith(1, "game-1");
        expect(setGameId).toHaveBeenNthCalledWith(2, "game-2");
    });

    it("syncs null when no active game exists", () => {
        renderHook(() => useSyncTutorialGameId(null));
        expect(setGameId).toHaveBeenCalledWith(null);
    });
});
