import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useInGameContentProps } from "./useInGameContentProps";

describe("useInGameContentProps", () => {
    it("returns the same props object reference", () => {
        const props = { gameState: null } as any;
        const { result } = renderHook(() => useInGameContentProps(props));

        expect(result.current).toBe(props);
    });
});
