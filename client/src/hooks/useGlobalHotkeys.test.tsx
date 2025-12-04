import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useGlobalHotkeys } from "./useGlobalHotkeys";

describe("useGlobalHotkeys", () => {
    const pressEscape = () => {
        const event = new KeyboardEvent("keydown", { key: "Escape" });
        window.dispatchEvent(event);
    };

    it("clears selection first when unit or coord is selected", () => {
        const clearSelection = vi.fn();
        const closeTechTree = vi.fn();
        const closeGameMenu = vi.fn();
        const openGameMenu = vi.fn();

        renderHook(() => useGlobalHotkeys({
            selectedCoord: { q: 0, r: 0 },
            selectedUnitId: "u1",
            showTechTree: false,
            showGameMenu: false,
            clearSelection,
            closeTechTree,
            closeGameMenu,
            openGameMenu,
        }));

        pressEscape();

        expect(clearSelection).toHaveBeenCalledTimes(1);
        expect(closeTechTree).not.toHaveBeenCalled();
        expect(closeGameMenu).not.toHaveBeenCalled();
        expect(openGameMenu).not.toHaveBeenCalled();
    });

    it("closes tech tree when open and nothing selected", () => {
        const clearSelection = vi.fn();
        const closeTechTree = vi.fn();
        const closeGameMenu = vi.fn();
        const openGameMenu = vi.fn();

        renderHook(() => useGlobalHotkeys({
            selectedCoord: null,
            selectedUnitId: null,
            showTechTree: true,
            showGameMenu: false,
            clearSelection,
            closeTechTree,
            closeGameMenu,
            openGameMenu,
        }));

        pressEscape();

        expect(closeTechTree).toHaveBeenCalledTimes(1);
        expect(clearSelection).not.toHaveBeenCalled();
        expect(closeGameMenu).not.toHaveBeenCalled();
        expect(openGameMenu).not.toHaveBeenCalled();
    });

    it("closes game menu when open and no selection/tech tree", () => {
        const clearSelection = vi.fn();
        const closeTechTree = vi.fn();
        const closeGameMenu = vi.fn();
        const openGameMenu = vi.fn();

        renderHook(() => useGlobalHotkeys({
            selectedCoord: null,
            selectedUnitId: null,
            showTechTree: false,
            showGameMenu: true,
            clearSelection,
            closeTechTree,
            closeGameMenu,
            openGameMenu,
        }));

        pressEscape();

        expect(closeGameMenu).toHaveBeenCalledTimes(1);
        expect(clearSelection).not.toHaveBeenCalled();
        expect(closeTechTree).not.toHaveBeenCalled();
        expect(openGameMenu).not.toHaveBeenCalled();
    });

    it("opens game menu when nothing else is active", () => {
        const clearSelection = vi.fn();
        const closeTechTree = vi.fn();
        const closeGameMenu = vi.fn();
        const openGameMenu = vi.fn();

        renderHook(() => useGlobalHotkeys({
            selectedCoord: null,
            selectedUnitId: null,
            showTechTree: false,
            showGameMenu: false,
            clearSelection,
            closeTechTree,
            closeGameMenu,
            openGameMenu,
        }));

        pressEscape();

        expect(openGameMenu).toHaveBeenCalledTimes(1);
        expect(clearSelection).not.toHaveBeenCalled();
        expect(closeTechTree).not.toHaveBeenCalled();
        expect(closeGameMenu).not.toHaveBeenCalled();
    });
});
