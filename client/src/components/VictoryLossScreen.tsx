import React from "react";
import { CIV_OPTIONS } from "../data/civs";

interface VictoryLossScreenProps {
    winnerId: string;
    playerId: string;
    winnerCivName: string;
    onRestart: () => void;
    onQuit: () => void;
}

export const VictoryLossScreen: React.FC<VictoryLossScreenProps> = ({
    winnerId,
    playerId,
    winnerCivName,
    onRestart,
    onQuit,
}) => {
    const isVictory = winnerId === playerId;
    const winnerCiv = CIV_OPTIONS.find((c) => c.id === winnerCivName);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 2000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(8px)",
                animation: "fadeIn 1s ease-out",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 32,
                    padding: 64,
                    background: "linear-gradient(180deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 25, 0.95) 100%)",
                    borderRadius: 24,
                    border: `1px solid ${isVictory ? "var(--color-highlight)" : "var(--color-border)"}`,
                    boxShadow: `0 0 100px ${isVictory ? "rgba(205, 138, 54, 0.3)" : "rgba(0, 0, 0, 0.5)"}`,
                    maxWidth: 600,
                    width: "90%",
                    textAlign: "center",
                    animation: "slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
            >
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        color: isVictory ? "var(--color-highlight)" : "var(--color-text-muted)",
                        textTransform: "uppercase",
                        textShadow: isVictory
                            ? "0 0 30px rgba(205, 138, 54, 0.6), 0 0 10px rgba(205, 138, 54, 0.8)"
                            : "0 0 20px rgba(0, 0, 0, 0.8)",
                        marginBottom: -16,
                    }}
                >
                    {isVictory ? "Victory" : "Defeat"}
                </div>

                <div style={{ width: 80, height: 4, background: isVictory ? "var(--color-highlight)" : "var(--color-border)", borderRadius: 2 }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 18, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Winner
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: "var(--color-text-main)" }}>
                        {winnerCiv?.title ?? winnerCivName}
                    </div>
                    {winnerCiv && (
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                background: winnerCiv.color,
                                margin: "16px auto 0",
                                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                                border: "2px solid rgba(255,255,255,0.2)",
                            }}
                        />
                    )}
                </div>

                <div style={{ display: "flex", gap: 16, marginTop: 16, width: "100%" }}>
                    <button
                        onClick={onRestart}
                        style={{
                            flex: 1,
                            padding: "16px 24px",
                            fontSize: 16,
                            fontWeight: 700,
                            borderRadius: 12,
                            border: "none",
                            background: "var(--color-highlight-strong)",
                            color: "var(--color-bg-main)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.filter = "brightness(1.1)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.filter = "brightness(1)";
                        }}
                    >
                        Restart Game
                    </button>
                    <button
                        onClick={onQuit}
                        style={{
                            flex: 1,
                            padding: "16px 24px",
                            fontSize: 16,
                            fontWeight: 700,
                            borderRadius: 12,
                            border: "1px solid var(--color-border)",
                            background: "transparent",
                            color: "var(--color-text-main)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                        }}
                    >
                        Main Menu
                    </button>
                </div>
            </div>
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};
