import React from "react";

type TurnSummaryProps = {
    turn: number;
    currentPlayerId: string;
    isMyTurn: boolean;
    canEndTurn: boolean;
    blockingCount: number;
    disableReason?: string;
    onEndTurn: () => void;
};

export const TurnSummary: React.FC<TurnSummaryProps> = ({ turn, currentPlayerId, isMyTurn, canEndTurn, blockingCount, disableReason, onEndTurn }) => (
    <div>
        <div className="hud-section-title">Turn</div>
        <p className="hud-title" style={{ margin: "0 0 4px 0" }}>Turn {turn}</p>
        <div className="hud-subtext" style={{ marginTop: 0 }}>Player: {currentPlayerId}</div>
        {isMyTurn ? (
            <>
                <div className="hud-subtext" style={{ marginTop: 6 }}>
                    Blocking tasks: {blockingCount}
                </div>
                <button
                    className="hud-button"
                    style={{
                        width: "100%",
                        marginTop: 10,
                        background: canEndTurn ? "var(--color-highlight-strong)" : undefined,
                        color: canEndTurn ? "var(--color-bg-main)" : undefined,
                        borderColor: canEndTurn ? "var(--color-highlight-strong)" : undefined
                    }}
                    onClick={onEndTurn}
                    disabled={!canEndTurn}
                    title={disableReason}
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





