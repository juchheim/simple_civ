import React from "react";
import { useTutorial } from "../../../contexts/TutorialContext";

type TurnSummaryProps = {
    turn: number;
    currentPlayerId: string;
    isMyTurn: boolean;
    canEndTurn: boolean;
    blockingCount: number;
    disableReason?: string;
    onEndTurn: () => void;
    commandPoints?: number;
    maxCommandPoints?: number;
};

export const TurnSummary: React.FC<TurnSummaryProps> = ({ turn, currentPlayerId, isMyTurn, canEndTurn, blockingCount, disableReason, onEndTurn, commandPoints, maxCommandPoints }) => {
    const tutorial = useTutorial();

    const handleEndTurn = () => {
        tutorial.markComplete("endedFirstTurn");
        onEndTurn();
    };

    const shouldPulse = canEndTurn && tutorial.shouldPulse("endedFirstTurn");

    return (
        <div>
            <div className="hud-section-title">Turn</div>
            <p className="hud-title" style={{ margin: "0 0 4px 0" }}>Turn {turn}</p>
            <div className="hud-subtext" style={{ marginTop: 0 }}>Player: {currentPlayerId}</div>
            {isMyTurn ? (
                <>
                    <div className="hud-subtext" style={{ marginTop: 6 }}>
                        Blocking tasks: {blockingCount}
                    </div>
                    {maxCommandPoints ? (
                        <div className="cp-pips" style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: "6px", alignItems: "center" }} title={`Command Points: ${commandPoints}/${maxCommandPoints}`}>
                            {Array.from({ length: maxCommandPoints }).map((_, i) => (
                                <div key={i} className={`cp-pip ${i < (commandPoints ?? 0) ? "filled" : "empty"}`} />
                            ))}
                        </div>
                    ) : null}
                    <button
                        className={`hud-button ${shouldPulse ? "pulse" : ""}`}
                        style={{
                            width: "100%",
                            marginTop: 10,
                            background: canEndTurn ? "var(--color-highlight-strong)" : undefined,
                            color: canEndTurn ? "var(--color-bg-main)" : undefined,
                            borderColor: canEndTurn ? "var(--color-highlight-strong)" : undefined
                        }}
                        onClick={handleEndTurn}
                        disabled={!canEndTurn}
                        title={shouldPulse ? "Click to end your turn." : disableReason}
                    >
                        {canEndTurn ? "End Turn" : "Finish tasks"}
                    </button>
                    {!canEndTurn && disableReason && (
                        <div className="hud-subtext warn" style={{ marginTop: 6 }}>
                            {disableReason}
                        </div>
                    )}
                </>
            ) : (
                <div className="hud-pill" style={{ marginTop: 10, justifyContent: "center" }}>
                    Waiting for opponent...
                </div>
            )}
        </div>
    );
};






