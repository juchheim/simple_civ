import React from "react";
import { GameMap, GameMapHandle, GameMapProps } from "../GameMap";
import type { BoardMode } from "../../hooks/useBoardModePreference";

const LazyGameMap3D = React.lazy(() => import("../GameMap3D/GameMap3D"));

type BoardRendererProps = GameMapProps & {
    boardMode: BoardMode;
};

type BoardRendererState = {
    failed: boolean;
};

class BoardErrorBoundary extends React.Component<{
    children: React.ReactNode;
    fallback: React.ReactNode;
}, BoardRendererState> {
    state: BoardRendererState = { failed: false };

    static getDerivedStateFromError(): BoardRendererState {
        return { failed: true };
    }

    componentDidCatch(error: Error): void {
        console.error("3D board failed to initialize; falling back to the 2D map.", error);
    }

    render(): React.ReactNode {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

export const BoardRenderer = React.forwardRef<GameMapHandle, BoardRendererProps>(
    ({ boardMode, ...props }, ref) => {
        if (boardMode === "2d") {
            return <GameMap ref={ref} {...props} />;
        }

        const fallback = <GameMap ref={ref} {...props} />;
        return (
            <BoardErrorBoundary fallback={fallback}>
                <React.Suspense fallback={fallback}>
                    <LazyGameMap3D ref={ref} {...props} />
                </React.Suspense>
            </BoardErrorBoundary>
        );
    },
);

BoardRenderer.displayName = "BoardRenderer";
