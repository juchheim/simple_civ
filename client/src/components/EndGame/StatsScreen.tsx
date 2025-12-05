
import React, { useState } from "react";
import { GameState } from "@simple-civ/engine/src/core/types";

interface StatsScreenProps {
    gameState: GameState;
    playerId: string;
}

type StatType = "score" | "science" | "production" | "military" | "territory";

export const StatsScreen: React.FC<StatsScreenProps> = ({ gameState, playerId }) => {
    const [activeTab, setActiveTab] = useState<StatType>("score");

    const statsHistory = gameState.history?.playerStats || {};
    // Collect all players' stats for comparison
    const players = gameState.players;

    // Helper to get color
    const getPlayerColor = (pid: string) => {
        const p = players.find(pl => pl.id === pid);
        return p?.color || "#fff";
    };

    const renderChart = () => {
        const width = 800;
        const height = 400;
        const padding = 50;

        // Get max Y value across all players for this stat
        let maxY = 0;
        const maxX = Math.max(1, gameState.endTurn ?? gameState.turn);

        Object.values(statsHistory).forEach(playerTurnStats => {
            playerTurnStats.forEach(stat => {
                const val = stat.stats[activeTab] || 0;
                if (val > maxY) maxY = val;
            });
        });

        // Ensure chart isn't flat if max is 0
        if (maxY === 0) maxY = 10;

        return (
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                {/* Axes */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="white" strokeWidth="2" />
                <line x1={padding} y1={height - padding} x2={padding} y2={padding} stroke="white" strokeWidth="2" />

                {/* Grid lines (horizontal) */}
                {[0.25, 0.5, 0.75, 1].map(ratio => {
                    const y = (height - padding) - ((height - 2 * padding) * ratio);
                    return (
                        <line key={ratio} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    );
                })}

                {/* Data Lines */}
                {Object.keys(statsHistory).map(pid => {
                    const pStats = statsHistory[pid];
                    const points = pStats.map(s => {
                        const x = padding + (s.turn / maxX) * (width - 2 * padding);
                        const y = (height - padding) - ((s.stats[activeTab] || 0) / maxY) * (height - 2 * padding);
                        return `${x},${y}`;
                    }).join(" ");

                    return (
                        <polyline
                            key={pid}
                            points={points}
                            fill="none"
                            stroke={getPlayerColor(pid)}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.8}
                        />
                    );
                })}
            </svg>
        );
    };

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: "1rem 2rem",
        background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
        border: "none",
        borderBottom: isActive ? "3px solid #ffd700" : "3px solid transparent",
        color: isActive ? "white" : "rgba(255,255,255,0.6)",
        fontSize: "1.2rem",
        cursor: "pointer",
        transition: "all 0.2s",
        fontFamily: "inherit"
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", padding: "2rem", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <button style={tabStyle(activeTab === "score")} onClick={() => setActiveTab("score")}>Score</button>
                <button style={tabStyle(activeTab === "science")} onClick={() => setActiveTab("science")}>Science</button>
                <button style={tabStyle(activeTab === "production")} onClick={() => setActiveTab("production")}>Production</button>
                <button style={tabStyle(activeTab === "military")} onClick={() => setActiveTab("military")}>Military</button>
                <button style={tabStyle(activeTab === "territory")} onClick={() => setActiveTab("territory")}>Territory</button>
            </div>

            <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: "1rem", padding: "1rem" }}>
                {Object.keys(statsHistory).length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: "20%" }}>No stats recorded for this game.</div>
                ) : (
                    renderChart()
                )}
            </div>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "2rem" }}>
                {players.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: p.id === playerId ? "bold" : "normal" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: p.color, border: p.id === playerId ? "2px solid white" : "none" }}></div>
                        <span style={{ color: p.id === playerId ? "white" : "rgba(255,255,255,0.8)" }}>{p.civName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
