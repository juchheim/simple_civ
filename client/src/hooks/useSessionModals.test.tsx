import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSessionModals } from "./useSessionModals";

describe("useSessionModals", () => {
    it("initializes with both modals closed", () => {
        const { result } = renderHook(() => useSessionModals());
        expect(result.current.showSaveModal).toBe(false);
        expect(result.current.showLoadModal).toBe(false);
    });

    it("opens and closes save modal", () => {
        const { result } = renderHook(() => useSessionModals());

        act(() => result.current.openSaveModal());
        expect(result.current.showSaveModal).toBe(true);

        act(() => result.current.closeSaveModal());
        expect(result.current.showSaveModal).toBe(false);
    });

    it("opens and closes load modal", () => {
        const { result } = renderHook(() => useSessionModals());

        act(() => result.current.openLoadModal());
        expect(result.current.showLoadModal).toBe(true);

        act(() => result.current.closeLoadModal());
        expect(result.current.showLoadModal).toBe(false);
    });
});
