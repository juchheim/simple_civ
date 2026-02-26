import React from "react";
import { AppShell } from "../AppShell";

type AppShellPresenterProps = {
    hasGameState: boolean;
    titleContent: React.ReactNode;
    gameContent: React.ReactNode;
};

export const AppShellPresenter: React.FC<AppShellPresenterProps> = ({
    hasGameState,
    titleContent,
    gameContent,
}) => {
    return (
        <AppShell
            showTitleScreen={!hasGameState}
            titleContent={titleContent}
            gameContent={gameContent}
        />
    );
};
