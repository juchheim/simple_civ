import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTitleScreenReset } from "./useTitleScreenReset";

describe("useTitleScreenReset", () => {
    it("runs the full reset sequence", () => {
        const clearSelection = vi.fn();
        const resetUiOverlays = vi.fn();
        const resetMapNavigation = vi.fn();
        const showTitle = vi.fn();

        const { result } = renderHook(() => useTitleScreenReset({
            clearSelection,
            resetUiOverlays,
            resetMapNavigation,
            showTitle,
        }));

        act(() => {
            result.current();
        });

        expect(clearSelection).toHaveBeenCalledTimes(1);
        expect(resetUiOverlays).toHaveBeenCalledTimes(1);
        expect(resetMapNavigation).toHaveBeenCalledTimes(1);
        expect(showTitle).toHaveBeenCalledTimes(1);
    });
});
