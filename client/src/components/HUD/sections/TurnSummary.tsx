import React from "react";

type TurnSummaryProps = {
    turn: number;
    currentPlayerId: string;
    isMyTurn: boolean;
    onEndTurn: () => void;
};

export const TurnSummary: React.FC<TurnSummaryProps> = ({ turn, currentPlayerId, isMyTurn, onEndTurn }) => (
    <div>
        <div className="hud-section-title">Turn</div>
        <p className="hud-title" style={{ margin: "0 0 4px 0" }}>Turn {turn}</p>
        <div className="hud-subtext" style={{ marginTop: 0 }}>Player: {currentPlayerId}</div>
        {isMyTurn ? (
            <button className="hud-button" style={{ width: "100%", marginTop: 10 }} onClick={onEndTurn}>
                End Turn
            </button>
        ) : (
            <div className="hud-pill" style={{ marginTop: 10, justifyContent: "center" }}>
                Waiting for opponent...
            </div>
        )}
    </div>
);
