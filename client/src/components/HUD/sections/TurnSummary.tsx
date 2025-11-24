import React from "react";

type TurnSummaryProps = {
    turn: number;
    currentPlayerId: string;
    isMyTurn: boolean;
    onEndTurn: () => void;
};

export const TurnSummary: React.FC<TurnSummaryProps> = ({ turn, currentPlayerId, isMyTurn, onEndTurn }) => (
    <div>
        <h3>Turn {turn}</h3>
        <p>Player: {currentPlayerId}</p>
        {isMyTurn && <button onClick={onEndTurn}>End Turn</button>}
    </div>
);

