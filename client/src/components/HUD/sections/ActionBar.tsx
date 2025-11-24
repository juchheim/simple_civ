import React from "react";
import { TurnSummary } from "./TurnSummary";

type ActionBarProps = {
    turn: number;
    currentPlayerId: string;
    isMyTurn: boolean;
    onEndTurn: () => void;
};

export const ActionBar: React.FC<ActionBarProps> = ({ turn, currentPlayerId, isMyTurn, onEndTurn }) => (
    <div>
        <TurnSummary turn={turn} currentPlayerId={currentPlayerId} isMyTurn={isMyTurn} onEndTurn={onEndTurn} />
    </div>
);

