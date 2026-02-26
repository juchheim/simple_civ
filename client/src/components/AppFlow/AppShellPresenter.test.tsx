import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShellPresenter } from "./AppShellPresenter";

vi.mock("../AppShell", () => ({
    AppShell: ({
        showTitleScreen,
        titleContent,
        gameContent,
    }: {
        showTitleScreen: boolean;
        titleContent: React.ReactNode;
        gameContent: React.ReactNode;
    }) => (
        <div>
            shell-{String(showTitleScreen)}
            <div data-testid="title">{titleContent}</div>
            <div data-testid="game">{gameContent}</div>
        </div>
    ),
}));

describe("AppShellPresenter", () => {
    it("shows title when game state is absent", () => {
        render(
            <AppShellPresenter
                hasGameState={false}
                titleContent={<span>title-content</span>}
                gameContent={<span>game-content</span>}
            />
        );

        expect(screen.getByText(/shell-true/)).toBeTruthy();
        expect(screen.getByText("title-content")).toBeTruthy();
        expect(screen.getByText("game-content")).toBeTruthy();
    });

    it("shows game shell mode when game state exists", () => {
        render(
            <AppShellPresenter
                hasGameState={true}
                titleContent={<span>title-content</span>}
                gameContent={<span>game-content</span>}
            />
        );

        expect(screen.getByText(/shell-false/)).toBeTruthy();
    });
});
