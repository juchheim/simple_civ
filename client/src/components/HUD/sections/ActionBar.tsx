import React from "react";
import { TurnSummary } from "./TurnSummary";

type ActionBarProps = {
    turn: number;
    currentPlayerId: string;
    isMyTurn: boolean;
    onEndTurn: () => void;
    canEndTurn: boolean;
    blockingCount: number;
};

export const ActionBar: React.FC<ActionBarProps> = ({ turn, currentPlayerId, isMyTurn, onEndTurn, canEndTurn, blockingCount }) => (
    <div>
        <TurnSummary
            turn={turn}
            currentPlayerId={currentPlayerId}
            isMyTurn={isMyTurn}
            onEndTurn={onEndTurn}
            canEndTurn={canEndTurn}
            blockingCount={blockingCount}
        />
    </div>
);

