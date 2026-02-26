import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoadGameModalPresenter } from "./LoadGameModalPresenter";

vi.mock("../LoadGameModal", () => ({
    LoadGameModal: ({
        isOpen,
        onClose,
        saves,
        onLoad,
    }: {
        isOpen: boolean;
        onClose: () => void;
        saves: { manual: any; auto: any };
        onLoad: (slot: "manual" | "auto") => void;
    }) => {
        // Exercise callbacks in test render to validate wiring.
        onClose();
        onLoad("manual");
        return (
            <div>
                modal-open-{String(isOpen)}
                manual-{saves.manual?.turn ?? "none"}
                auto-{saves.auto?.turn ?? "none"}
            </div>
        );
    },
}));

describe("LoadGameModalPresenter", () => {
    it("hydrates saves via listSaves and passes through callbacks", () => {
        const onClose = vi.fn();
        const onLoad = vi.fn();
        const listSaves = vi.fn(() => ({
            manual: { timestamp: 1, turn: 8, civName: "Forge Clans" },
            auto: { timestamp: 2, turn: 9, civName: "Scholar Kingdoms" },
        }));

        render(
            <LoadGameModalPresenter
                isOpen={true}
                onClose={onClose}
                listSaves={listSaves}
                onLoad={onLoad}
            />
        );

        expect(listSaves).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onLoad).toHaveBeenCalledWith("manual");
        expect(screen.getByText(/modal-open-true/)).toBeTruthy();
        expect(screen.getByText(/manual-8/)).toBeTruthy();
        expect(screen.getByText(/auto-9/)).toBeTruthy();
    });
});
