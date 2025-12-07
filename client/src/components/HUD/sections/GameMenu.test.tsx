import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameMenu } from "./GameMenu";

describe("GameMenu", () => {
    const defaultProps = {
        onSave: vi.fn(),
        onLoad: vi.fn(),
        onRestart: vi.fn(),
        onResign: vi.fn(),
        onQuit: vi.fn(),
        showShroud: true,
        onToggleShroud: vi.fn(),
        showYields: false,
        onToggleYields: vi.fn(),
        showCombatPreview: true,
        onToggleCombatPreview: vi.fn(),
    };

    it("renders all menu options", () => {
        render(<GameMenu {...defaultProps} />);

        expect(screen.getByText("Preferences")).toBeInTheDocument();
        expect(screen.getByText("Save Game")).toBeInTheDocument();
        expect(screen.getByText("Load Game")).toBeInTheDocument();
        expect(screen.getByText("Restart Game")).toBeInTheDocument();
        expect(screen.getByText("Quit to Main Menu")).toBeInTheDocument();
    });

    it("calls onRestart when Restart Game is clicked", () => {
        render(<GameMenu {...defaultProps} />);

        fireEvent.click(screen.getByText("Restart Game"));
        expect(defaultProps.onRestart).toHaveBeenCalled();
    });

    it("calls onSave when Save Game is clicked", () => {
        render(<GameMenu {...defaultProps} />);

        fireEvent.click(screen.getByText("Save Game"));
        expect(defaultProps.onSave).toHaveBeenCalled();
    });

    it("calls onLoad when Load Game is clicked", () => {
        render(<GameMenu {...defaultProps} />);

        fireEvent.click(screen.getByText("Load Game"));
        expect(defaultProps.onLoad).toHaveBeenCalled();
    });

    it("calls onQuit when Quit is clicked", () => {
        render(<GameMenu {...defaultProps} />);

        fireEvent.click(screen.getByText("Quit to Main Menu"));
        expect(defaultProps.onQuit).toHaveBeenCalled();
    });
});
