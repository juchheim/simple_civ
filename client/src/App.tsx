import { AppShellPresenter } from "./components/AppFlow/AppShellPresenter";
import { LoadGameModalPresenter } from "./components/AppFlow/LoadGameModalPresenter";
import { useAppViewModel } from "./hooks/useAppViewModel";

/**
 * The main application component.
 * Handles the game loop, UI state (Title Screen, HUD, Tech Tree), and global hotkeys.
 * Manages the top-level game session via `useGameSession`.
 */
function App() {
    const { appShellProps, loadGameModalPresenterProps } = useAppViewModel();

    return (
        <>
            <AppShellPresenter {...appShellProps} />
            <LoadGameModalPresenter {...loadGameModalPresenterProps} />
        </>
    );
}

export default App;
