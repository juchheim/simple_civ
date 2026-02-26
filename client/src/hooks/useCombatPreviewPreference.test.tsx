import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useCombatPreviewPreference } from "./useCombatPreviewPreference";

describe("useCombatPreviewPreference", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("defaults to enabled when no stored preference exists", () => {
        const { result } = renderHook(() => useCombatPreviewPreference());
        expect(result.current.showCombatPreview).toBe(true);
    });

    it("loads existing preference from localStorage", () => {
        localStorage.setItem("showCombatPreview", "false");
        const { result } = renderHook(() => useCombatPreviewPreference());
        expect(result.current.showCombatPreview).toBe(false);
    });

    it("persists toggles and explicit disable", () => {
        const { result } = renderHook(() => useCombatPreviewPreference());

        act(() => {
            result.current.toggleCombatPreview();
        });
        expect(result.current.showCombatPreview).toBe(false);
        expect(localStorage.getItem("showCombatPreview")).toBe("false");

        act(() => {
            result.current.disableCombatPreview();
        });
        expect(result.current.showCombatPreview).toBe(false);
        expect(localStorage.getItem("showCombatPreview")).toBe("false");
    });

    it("supports direct set and persists value", () => {
        const { result } = renderHook(() => useCombatPreviewPreference());

        act(() => {
            result.current.setShowCombatPreview(true);
        });
        expect(result.current.showCombatPreview).toBe(true);
        expect(localStorage.getItem("showCombatPreview")).toBe("true");
    });
});
