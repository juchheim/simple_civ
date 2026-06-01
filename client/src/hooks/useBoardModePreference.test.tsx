import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reset3DCapabilityCache } from "../components/GameMap3D/capability";
import { useBoardModePreference } from "./useBoardModePreference";

describe("useBoardModePreference", () => {
    beforeEach(() => {
        localStorage.clear();
        reset3DCapabilityCache();
        vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("browser");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        reset3DCapabilityCache();
    });

    it("defaults to 3D on capable devices", () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as WebGLRenderingContext);

        const { result } = renderHook(() => useBoardModePreference());

        expect(result.current.boardMode).toBe("3d");
        expect(result.current.effectiveMode).toBe("3d");
        expect(result.current.supports3D).toBe(true);
    });

    it("preserves the stored 3D preference while falling back to 2D", () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
        localStorage.setItem("boardMode", "3d");

        const { result } = renderHook(() => useBoardModePreference());

        expect(result.current.boardMode).toBe("3d");
        expect(result.current.effectiveMode).toBe("2d");
        expect(localStorage.getItem("boardMode")).toBe("3d");
    });

    it("persists live mode changes", () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as WebGLRenderingContext);
        const { result } = renderHook(() => useBoardModePreference());

        act(() => result.current.setBoardMode("2d"));

        expect(result.current.boardMode).toBe("2d");
        expect(result.current.effectiveMode).toBe("2d");
        expect(localStorage.getItem("boardMode")).toBe("2d");
    });
});
