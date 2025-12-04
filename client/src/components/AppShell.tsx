import { ReactNode } from "react";

type AppShellProps = {
    showTitleScreen: boolean;
    titleContent: ReactNode;
    gameContent: ReactNode | null;
};

export function AppShell({ showTitleScreen, titleContent, gameContent }: AppShellProps) {
    if (showTitleScreen) {
        return <>{titleContent}</>;
    }
    return <>{gameContent}</>;
}
