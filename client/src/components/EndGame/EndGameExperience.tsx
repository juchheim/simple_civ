
import React, { useState, useEffect } from "react";
import { GameState } from "@simple-civ/engine/src/core/types";
import { ReplayMap } from "./ReplayMap";
import { StatsScreen } from "./StatsScreen";

interface EndGameExperienceProps {
    gameState: GameState;
    playerId: string;
    onRestart: () => void;
    onQuit: () => void;
}

type Stage = "SPLASH" | "REPLAY" | "STATS";

export const EndGameExperience: React.FC<EndGameExperienceProps> = ({
    gameState,
    playerId,
    onRestart,
    onQuit,
}) => {
    const [stage, setStage] = useState<Stage>("SPLASH");
    const [opacity, setOpacity] = useState(0);

    const winnerId = gameState.winnerId;
    const player = gameState.players.find(p => p.id === playerId);
    const isVictory = winnerId === playerId;
    const finalTurn = gameState.endTurn ?? gameState.turn;

    // Derive score from last turn stats
    const playerStats = gameState.history?.playerStats?.[playerId];
    const score = playerStats && playerStats.length > 0 ? playerStats[playerStats.length - 1].stats.score : 0;

    // Determine background based on Era/Civ
    // If Victory: Check player's era.
    // If Defeat: Generic defeat.
    const getBackground = () => {
        if (!isVictory) return "/assets/victory/defeat_generic.png";

        const era = player?.currentEra || "Hearth";
        if (era === "Primitive") return "/assets/victory/victory_hearth.png";
        if (era === "Hearth") return "/assets/victory/victory_hearth.png";
        if (era === "Banner") return "/assets/victory/victory_banner.png";
        if (era === "Engine") return "/assets/victory/victory_engine.png";
        return "/assets/victory/victory_hearth.png";
    };

    const bgImage = getBackground();

    useEffect(() => {
        // Fade in on mount
        const timer = setTimeout(() => setOpacity(1), 100);
        return () => clearTimeout(timer);
    }, []);

    // Layout Constants
    // Fixed viewport, no scroll.
    const containerStyle: React.CSSProperties = {
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        overflow: "hidden",
        backgroundColor: "#000",

        color: "white",
        opacity,
        transition: "opacity 1s ease-in-out",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
    };

    const contentStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)", // Dark overlay
        backdropFilter: "blur(5px)",
        display: "flex",
        flexDirection: "column",
    };

    const headerStyle: React.CSSProperties = {
        padding: "1rem",
        textAlign: "center",
        flexShrink: 0,
    };

    const titleStyle: React.CSSProperties = {
        fontSize: "3rem",
        fontWeight: "bold",
        textTransform: "uppercase",
        background: isVictory
            ? "linear-gradient(to bottom, #ffd700, #ff8c00)"
            : "linear-gradient(to bottom, #a9a9a9, #696969)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        filter: "drop-shadow(0 0 10px rgba(0,0,0,0.8))",
        marginBottom: "0.5rem",
    };

    const navStyle: React.CSSProperties = {
        display: "flex",
        justifyContent: "center",
        gap: "2rem",
        padding: "1rem",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
        flexShrink: 0,
    };

    const navBtnStyle = (active: boolean): React.CSSProperties => ({
        background: "none",
        border: "none",
        color: active ? "#ffd700" : "rgba(255,255,255,0.7)",
        fontSize: "1.2rem",
        cursor: "pointer",
        padding: "0.5rem 1rem",
        borderBottom: active ? "2px solid #ffd700" : "2px solid transparent",
        transition: "all 0.3s",
        fontFamily: "inherit",
    });

    return (
        <div style={containerStyle}>
            <div style={contentStyle}>
                <div style={headerStyle}>
                    <h1 style={titleStyle}>{isVictory ? "VICTORY" : "DEFEAT"}</h1>
                    <div style={{ fontSize: "1.2rem", color: "#ccc" }}>
                        {isVictory ? `The ${player?.civName.replace(/([A-Z])/g, ' $1').trim()} have stood the test of time.` : "Your civilization has fallen."}
                    </div>
                    {isVictory && gameState.victoryType && (
                        <div style={{ fontSize: "1.2rem", color: "var(--color-highlight)", fontWeight: "bold", marginTop: "0.5rem" }}>
                            {gameState.victoryType === "Progress" ? "Scientific Victory" : gameState.victoryType === "Conquest" ? "Conquest Victory" : "Victory"}
                        </div>
                    )}
                </div>

                <div style={navStyle}>
                    <button style={navBtnStyle(stage === "SPLASH")} onClick={() => setStage("SPLASH")}>Overview</button>
                    <button style={navBtnStyle(stage === "REPLAY")} onClick={() => setStage("REPLAY")}>History Replay</button>
                    <button style={navBtnStyle(stage === "STATS")} onClick={() => setStage("STATS")}>Statistics</button>
                </div>

                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    {stage === "SPLASH" && (
                        <div style={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: "2rem"
                        }}>
                            <div style={{
                                padding: "2rem",
                                background: "rgba(255,255,255,0.1)",
                                borderRadius: "1rem",
                                backdropFilter: "blur(10px)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                maxWidth: "600px",
                                textAlign: "center"
                            }}>
                                <h2>Game Summary</h2>
                                <p>Turns: {finalTurn}</p>
                                <p>Score: {score}</p>
                                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem" }}>
                                    <button
                                        onClick={onRestart}
                                        style={{
                                            padding: "1rem 2rem",
                                            fontSize: "1.2rem",
                                            background: "var(--color-highlight-strong)",
                                            border: "2px solid var(--color-highlight)",
                                            borderRadius: "2rem",
                                            color: "var(--color-bg-main)",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            boxShadow: "0 0 15px rgba(205, 138, 54, 0.4)"
                                        }}
                                    >
                                        Play Again
                                    </button>
                                    <button
                                        onClick={onQuit}
                                        style={{
                                            padding: "1rem 2rem",
                                            fontSize: "1.2rem",
                                            background: "rgba(0,0,0,0.3)",
                                            border: "2px solid var(--color-text-muted)",
                                            borderRadius: "2rem",
                                            color: "var(--color-text-muted)",
                                            cursor: "pointer",
                                            boxShadow: "none"
                                        }}
                                    >
                                        Return to Menu
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {stage === "REPLAY" && (
                        <ReplayMap gameState={gameState} playerId={playerId} />
                    )}

                    {stage === "STATS" && (
                        <StatsScreen gameState={gameState} playerId={playerId} />
                    )}
                </div>
            </div >
        </div >
    );
};
