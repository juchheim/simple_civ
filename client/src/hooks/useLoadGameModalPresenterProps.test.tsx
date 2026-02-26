import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLoadGameModalPresenterProps } from "./useLoadGameModalPresenterProps";

describe("useLoadGameModalPresenterProps", () => {
    it("returns the same props object reference", () => {
        const props = {
            isOpen: true,
            onClose: vi.fn(),
            listSaves: vi.fn(() => ({ manual: null, auto: null })),
            onLoad: vi.fn(),
        };
        const { result } = renderHook(() => useLoadGameModalPresenterProps(props));

        expect(result.current).toBe(props);
    });
});
