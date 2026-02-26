import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTitleFlow } from "./useTitleFlow";

describe("useTitleFlow", () => {
    it("starts on the title screen", () => {
        const { result } = renderHook(() => useTitleFlow());
        expect(result.current.showTitleScreen).toBe(true);
    });

    it("supports show/hide transitions and boolean setter", () => {
        const { result } = renderHook(() => useTitleFlow());

        act(() => {
            result.current.hideTitle();
        });
        expect(result.current.showTitleScreen).toBe(false);

        act(() => {
            result.current.setShowTitleScreen(true);
        });
        expect(result.current.showTitleScreen).toBe(true);

        act(() => {
            result.current.showTitle();
        });
        expect(result.current.showTitleScreen).toBe(true);
    });

    it("hides title on session restore callback", () => {
        const { result } = renderHook(() => useTitleFlow());

        act(() => {
            result.current.handleSessionRestore();
        });

        expect(result.current.showTitleScreen).toBe(false);
    });
});
