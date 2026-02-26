import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutoClearError } from "./useAutoClearError";

describe("useAutoClearError", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("clears the error after the configured delay", () => {
        vi.useFakeTimers();
        const setError = vi.fn();

        renderHook(() => useAutoClearError("boom", setError, 3000));

        vi.advanceTimersByTime(2999);
        expect(setError).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(setError).toHaveBeenCalledWith(null);
    });

    it("does nothing when there is no error", () => {
        vi.useFakeTimers();
        const setError = vi.fn();

        renderHook(() => useAutoClearError(null, setError, 3000));
        vi.advanceTimersByTime(3000);

        expect(setError).not.toHaveBeenCalled();
    });

    it("cancels pending timeout on unmount", () => {
        vi.useFakeTimers();
        const setError = vi.fn();

        const { unmount } = renderHook(() => useAutoClearError("boom", setError, 3000));
        unmount();
        vi.advanceTimersByTime(3000);

        expect(setError).not.toHaveBeenCalled();
    });
});
