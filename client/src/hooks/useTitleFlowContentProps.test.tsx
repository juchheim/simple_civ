import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTitleFlowContentProps } from "./useTitleFlowContentProps";

describe("useTitleFlowContentProps", () => {
    it("returns the same props object reference", () => {
        const props = {
            showTitleScreen: true,
            onShowSetup: vi.fn(),
            onLoadGame: vi.fn(),
            selectedCiv: "ForgeClans",
            selectedMapSize: "Standard",
            numCivs: 4,
            selectedDifficulty: "Normal",
            onSelectCiv: vi.fn(),
            onSelectMapSize: vi.fn(),
            onSelectNumCivs: vi.fn(),
            onSelectDifficulty: vi.fn(),
            onStartGame: vi.fn(),
            onBack: vi.fn(),
        } as const;
        const { result } = renderHook(() => useTitleFlowContentProps(props as any));

        expect(result.current).toBe(props);
    });
});
