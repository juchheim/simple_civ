import React, { useEffect, useMemo, useState } from "react";
import { GameState } from "@simple-civ/engine/src/core/types";
import { hexToString } from "@simple-civ/engine/src/core/hex";
import { hexToPixel } from "../GameMap/geometry";
import {
    buildFogHistory,
    buildReplayRiverSegments,
    computeReplayViewBox,
    getActiveReplayEvents,
    getReplayEventLabel,
    getReplayMaxTurn,
    getReplayTerrainColor,
    getReplayTurnDelayMs,
    REPLAY_HEX_SIZE,
    REPLAY_SPEED_OPTIONS
} from "./replay-map-helpers";

interface ReplayMapProps {
    gameState: GameState;
    playerId: string;
}

const X_OFFSET = REPLAY_HEX_SIZE * 1;
const Y_OFFSET = REPLAY_HEX_SIZE * 1;

export const ReplayMap: React.FC<ReplayMapProps> = ({ gameState, playerId }) => {
    const [replayTurn, setReplayTurn] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);

    const maxTurn = getReplayMaxTurn(gameState);

    const fogHistory = useMemo(
        () => buildFogHistory(gameState, playerId, maxTurn),
        [gameState, playerId, maxTurn],
    );

    const activeEvents = useMemo(
        () => getActiveReplayEvents(gameState, replayTurn, playerId),
        [gameState, replayTurn, playerId],
    );

    const { viewBoxX, viewBoxY, viewBoxW, viewBoxH } = useMemo(
        () => computeReplayViewBox(gameState.map.width, gameState.map.height, REPLAY_HEX_SIZE),
        [gameState.map.width, gameState.map.height],
    );

    useEffect(() => {
        if (!isPlaying) return;

        const delay = getReplayTurnDelayMs(speedMultiplier, activeEvents.length > 0);
        const timeout = setTimeout(() => {
            setReplayTurn(previous => {
                if (previous >= maxTurn) {
                    setIsPlaying(false);
                    return previous;
                }
                return previous + 1;
            });
        }, delay);

        return () => clearTimeout(timeout);
    }, [activeEvents.length, isPlaying, maxTurn, replayTurn, speedMultiplier]);

    const allRiverSegments = useMemo(
        () => buildReplayRiverSegments(gameState.map.rivers, REPLAY_HEX_SIZE),
        [gameState.map.rivers],
    );

    const currentRevealed = fogHistory[replayTurn] || new Set();

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", alignItems: "center", justifyContent: "flex-start", paddingTop: "1rem", color: "white" }}>
            <div style={{ marginBottom: "0.5rem", fontSize: "1.5rem", fontWeight: "bold", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                Turn: {replayTurn} / {maxTurn}
            </div>

            <div style={{ flex: 1, width: "90%", minHeight: 0, maxHeight: "40vh", border: "2px solid rgba(255,255,255,0.2)", borderRadius: "12px", padding: "10px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="100%" height="100%" viewBox={`${viewBoxX + X_OFFSET} ${viewBoxY + Y_OFFSET} ${viewBoxW} ${viewBoxH}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: "100%", maxHeight: "100%" }}>
                    {gameState.map.tiles.map(tile => {
                        const key = hexToString(tile.coord);
                        if (!currentRevealed.has(key)) return null;

                        const pos = hexToPixel(tile.coord, REPLAY_HEX_SIZE);
                        const x = pos.x + X_OFFSET;
                        const y = pos.y + Y_OFFSET;

                        return (
                            <polygon
                                key={key}
                                points={`
                                    ${x + REPLAY_HEX_SIZE * 0.866},${y - REPLAY_HEX_SIZE * 0.5}
                                    ${x + REPLAY_HEX_SIZE * 0.866},${y + REPLAY_HEX_SIZE * 0.5}
                                    ${x},${y + REPLAY_HEX_SIZE}
                                    ${x - REPLAY_HEX_SIZE * 0.866},${y + REPLAY_HEX_SIZE * 0.5}
                                    ${x - REPLAY_HEX_SIZE * 0.866},${y - REPLAY_HEX_SIZE * 0.5}
                                    ${x},${y - REPLAY_HEX_SIZE}
`}
                                fill={getReplayTerrainColor(tile.terrain)}
                                stroke="rgba(0,0,0,0.1)"
                                strokeWidth="0.5"
                            />
                        );
                    })}

                    {allRiverSegments.map((segment, index) => {
                        const visible = currentRevealed.has(segment.aKey) || currentRevealed.has(segment.bKey);
                        if (!visible) return null;

                        return (
                            <line
                                key={`r-${index}`}
                                x1={segment.p1.x + X_OFFSET}
                                y1={segment.p1.y + Y_OFFSET}
                                x2={segment.p2.x + X_OFFSET}
                                y2={segment.p2.y + Y_OFFSET}
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                opacity="0.8"
                            />
                        );
                    })}
                </svg>
            </div>

            <div data-testid="event-overlay" style={{ height: "60px", marginTop: "1rem", textAlign: "center", minHeight: "60px" }}>
                {activeEvents.map((event, index) => {
                    const label = getReplayEventLabel(event, gameState, playerId);
                    if (!label) return null;

                    return (
                        <span key={index} style={{
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
                            {label}
                        </span>
                    );
                })}
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", marginBottom: "2rem", alignItems: "center", width: "80%", background: "rgba(0,0,0,0.4)", padding: "1rem", borderRadius: "30px" }}>
                <button onClick={() => {
                    if (!isPlaying && replayTurn >= maxTurn) {
                        setReplayTurn(0);
                        setIsPlaying(true);
                    } else {
                        setIsPlaying(!isPlaying);
                    }
                }} style={{
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

                <div style={{ display: "flex", gap: "5px", background: "rgba(0,0,0,0.3)", padding: "5px", borderRadius: "20px" }}>
                    {REPLAY_SPEED_OPTIONS.map(speed => (
                        <button
                            key={speed}
                            onClick={() => setSpeedMultiplier(speed)}
                            style={{
                                background: speedMultiplier === speed ? "#ffd700" : "transparent",
                                color: speedMultiplier === speed ? "black" : "white",
                                border: "none",
                                borderRadius: "15px",
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "0.8rem"
                            }}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>

                <input
                    type="range"
                    min={0}
                    max={maxTurn}
                    value={replayTurn}
                    onChange={(event) => {
                        setReplayTurn(Number(event.target.value));
                        setIsPlaying(false);
                    }}
                    style={{ flex: 1, cursor: "pointer", accentColor: "#ffd700" }}
                />
            </div>
        </div>
    );
};
