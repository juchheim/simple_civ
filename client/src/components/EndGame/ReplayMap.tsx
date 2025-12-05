
import React, { useMemo, useState, useEffect } from "react";
import { GameState } from "@simple-civ/engine/src/core/types";
import { hexToString } from "@simple-civ/engine/src/core/hex";
import { hexToPixel, getHexCornerOffsets, squaredDistance } from "../GameMap/geometry";

interface ReplayMapProps {
    gameState: GameState;
    playerId: string;
}

const HEX_SIZE = 10; // Internal coordinate system size
const X_OFFSET = HEX_SIZE * 2;
const Y_OFFSET = HEX_SIZE * 2;

export const ReplayMap: React.FC<ReplayMapProps> = ({ gameState, playerId }) => {
    const [replayTurn, setReplayTurn] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    // Limits
    const maxTurn = gameState.endTurn ?? gameState.turn;

    // Reconstruct Fog History
    // refinedHistory[turn] = Set<string keys of revealed tiles>
    const fogHistory = useMemo(() => {
        const history: Record<number, Set<string>> = {};
        const playerFog = gameState.history?.playerFog?.[playerId];

        // Fallback: if no history captured, use final revealed set so replay is not blank
        if (!playerFog) {
            const fallback = new Set<string>();
            (gameState.revealed?.[playerId] ?? []).forEach(k => fallback.add(k));
            history[0] = new Set(fallback);
            history[maxTurn] = new Set(fallback);
            return history;
        }

        let cumulative = new Set<string>();
        // Initialize with starting vision if any? 
        // We assume turn 0 starts blank or with initial vision.

        for (let t = 0; t <= maxTurn; t++) {
            if (playerFog[t]) {
                playerFog[t].forEach(c => cumulative.add(hexToString(c)));
            }
            history[t] = new Set(cumulative);
        }
        return history;
    }, [gameState.history, gameState.revealed, playerId, maxTurn]);

    // Active Events at current turn
    const activeEvents = useMemo(() => {
        if (!gameState.history?.events) return [];
        return gameState.history.events.filter(e => e.turn === replayTurn);
    }, [gameState.history, replayTurn]);

    // Dimensions for ViewBox
    const width = gameState.map.width;
    const height = gameState.map.height;

    // Calculate total internal dimensions
    // Width approx: width * (sqrt(3) * size)
    // Height approx: height * (1.5 * size)
    // We add some buffer
    const viewBoxWidth = (width * HEX_SIZE * 2) + X_OFFSET * 2;
    const viewBoxHeight = (height * HEX_SIZE * 1.75) + Y_OFFSET * 2;

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setReplayTurn(prev => {
                    if (prev >= maxTurn) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 300); // 3-4 turns per second for fluidity
        }
        return () => clearInterval(interval);
    }, [isPlaying, maxTurn]);

    // River Segments
    // Pre-calculate all river segments in internal coordinates
    const allRiverSegments = useMemo(() => {
        if (!gameState.map.rivers) return [];

        const segments: { aKey: string; bKey: string; p1: { x: number, y: number }; p2: { x: number, y: number } }[] = [];
        const offsets = getHexCornerOffsets(HEX_SIZE);

        const getCorners = (q: number, r: number) => {
            const center = hexToPixel({ q, r }, HEX_SIZE);
            return offsets.map(o => ({ x: center.x + o.x, y: center.y + o.y }));
        };

        gameState.map.rivers.forEach(river => {
            const cA = getCorners(river.a.q, river.a.r);
            const cB = getCorners(river.b.q, river.b.r);

            // Find shared corners (distance ~ 0)
            const shared: { x: number, y: number }[] = [];
            for (const pA of cA) {
                for (const pB of cB) {
                    if (squaredDistance(pA, pB) < 0.1) { // Use a small epsilon for float comparison
                        shared.push(pA);
                        break;
                    }
                }
                if (shared.length === 2) break; // Found both shared corners
            }

            if (shared.length === 2) {
                segments.push({
                    aKey: hexToString(river.a),
                    bKey: hexToString(river.b),
                    p1: shared[0],
                    p2: shared[1]
                });
            }
        });
        return segments;
    }, [gameState.map.rivers]);

    // Helper to get color
    const getTerrainColor = (terrain: string) => {
        switch (terrain) {
            case "Ocean": return "#1e3a8a"; // DeepSea
            case "DeepSea": return "#172554";
            case "Coast": return "#3b82f6";
            case "Grassland": return "#4ade80";
            case "Plains": return "#facc15"; // Yellow-ish
            case "Desert": return "#fbbf24";
            case "Tundra": return "#e5e7eb";
            case "Snow": return "#ffffff";
            case "Mountain": return "#57534e";
            case "Forest": return "#166534";
            case "Marsh": return "#10b981";
            case "Hills": return "#a3e635"; // Light green/yellow
            default: return "#333";
        }
    };

    const currentRevealed = fogHistory[replayTurn] || new Set();

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", alignItems: "center", justifyContent: "center", color: "white" }}>
            <div style={{ marginBottom: "1rem", fontSize: "2rem", fontWeight: "bold", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                Turn: {replayTurn} / {maxTurn}
            </div>

            <div style={{ flex: 1, width: "90%", minHeight: 0, border: "2px solid rgba(255,255,255,0.2)", borderRadius: "12px", padding: "20px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight} `} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: "100%", maxHeight: "100%" }}>

                    {/* Tiles */}
                    {gameState.map.tiles.map(tile => {
                        const key = hexToString(tile.coord);
                        if (!currentRevealed.has(key)) return null;

                        const pos = hexToPixel(tile.coord, HEX_SIZE);
                        const x = pos.x + X_OFFSET;
                        const y = pos.y + Y_OFFSET;

                        return (
                            <polygon
                                key={key}
                                points={`
                                    ${x + HEX_SIZE * 0.866},${y - HEX_SIZE * 0.5}
                                    ${x + HEX_SIZE * 0.866},${y + HEX_SIZE * 0.5}
                                    ${x},${y + HEX_SIZE}
                                    ${x - HEX_SIZE * 0.866},${y + HEX_SIZE * 0.5}
                                    ${x - HEX_SIZE * 0.866},${y - HEX_SIZE * 0.5}
                                    ${x},${y - HEX_SIZE}
`}
                                fill={getTerrainColor(tile.terrain)}
                                stroke="rgba(0,0,0,0.1)"
                                strokeWidth="0.5"
                            />
                        );
                    })}

                    {/* Rivers */}
                    {allRiverSegments.map((seg, i) => {
                        const visible = currentRevealed.has(seg.aKey) || currentRevealed.has(seg.bKey);
                        if (!visible) return null;

                        return (
                            <line
                                key={`r - ${i} `}
                                x1={seg.p1.x + X_OFFSET}
                                y1={seg.p1.y + Y_OFFSET}
                                x2={seg.p2.x + X_OFFSET}
                                y2={seg.p2.y + Y_OFFSET}
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                opacity="0.8"
                            />
                        );
                    })}

                    {/* Cities? Maybe small dots? */}
                    {/* Units? Dots? */}

                </svg>
            </div>

            {/* Event Log Overlay - Make it absolute or floating? */}
            <div style={{ height: "60px", marginTop: "1rem", textAlign: "center", minHeight: "60px" }}>
                {activeEvents.map((e, i) => (
                    <span key={i} style={{
                        background: "rgba(0, 0, 0, 0.6)",
                        border: "1px solid #ffd700",
                        color: "#ffd700",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        display: "inline-block",
                        margin: "0 5px",
                        fontSize: "0.9rem",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
                    }}>
                        {e.type === "CityFounded" && `City Founded: ${e.data.cityName} `}
                        {e.type === "TechResearched" && `Tech Researched`}
                        {e.type === "EraEntered" && `Entered Era: ${e.data.era || "?"} `}
                        {e.type === "WarDeclared" && `War Declared!`}
                        {e.type === "CityCaptured" && `City Captured!`}
                        {e.type === "PeaceMade" && `Peace Treaty Signed`}
                        {e.type === "VictoryAchieved" && `Victory (${e.data.victoryType})`}
                    </span>
                ))}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", marginBottom: "2rem", alignItems: "center", width: "60%", background: "rgba(0,0,0,0.4)", padding: "1rem", borderRadius: "30px" }}>
                <button onClick={() => setIsPlaying(!isPlaying)} style={{
                    padding: "0",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.5)",
                    background: isPlaying ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s"
                }}>
                    {isPlaying ? "||" : "▶"}
                </button>
                <input
                    type="range"
                    min={0}
                    max={maxTurn}
                    value={replayTurn}
                    onChange={(e) => {
                        setReplayTurn(Number(e.target.value));
                        setIsPlaying(false);
                    }}
                    style={{ flex: 1, cursor: "pointer", accentColor: "#ffd700" }}
                />
            </div>
        </div>
    );
};
