import React from "react";
import { InGameContent } from "./InGameContent";

type InGameContentProps = React.ComponentProps<typeof InGameContent>;

type InGameContentAdapterProps = Omit<InGameContentProps, "gameState"> & {
    gameState: InGameContentProps["gameState"] | null;
};

export const InGameContentAdapter: React.FC<InGameContentAdapterProps> = ({
    gameState,
    ...props
}) => {
    if (!gameState) return null;
    return <InGameContent gameState={gameState} {...props} />;
};
