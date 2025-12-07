
import React, { useMemo, useState, useEffect } from "react";
import { GameState } from "@simple-civ/engine/src/core/types";
import { hexToString } from "@simple-civ/engine/src/core/hex";
import { hexToPixel, getHexCornerOffsets, squaredDistance } from "../GameMap/geometry";

interface ReplayMapProps {
    gameState: GameState;
    playerId: string;
}

const HEX_SIZE = 10; // Internal coordinate system size
const X_OFFSET = HEX_SIZE * 1;
const Y_OFFSET = HEX_SIZE * 1;

export const ReplayMap: React.FC<ReplayMapProps> = ({ gameState, playerId }) => {
    const [replayTurn, setReplayTurn] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);

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
    // Active Events at current turn
    const activeEvents = useMemo(() => {
        if (!gameState.history?.events) return [];
        return gameState.history.events.filter(e => {
            if (e.turn !== replayTurn) return false;

            // Filter: Only show events relevant to the viewing player
            const isMyEvent = e.playerId === playerId;
            const isInvolvingMe = (e.data as any)?.targetId === playerId || (e.data as any)?.otherPlayerId === playerId;

            return isMyEvent || isInvolvingMe;
        });
    }, [gameState.history, replayTurn, playerId]);

    // Dimensions for ViewBox
    // Calculate exact bounding box of the hex grid
    const maxQ = gameState.map.width - 1;
    const maxR = gameState.map.height - 1;

    // We check the 4 corners of the logic grid (0,0), (max, 0), (0, max), (max, max)
    // Actually, hex grid allows varying geometry but assuming rectangular storage:
    // We'll iterate the corners of the theoretical rectangle grid to find pixel bounds.

    // Better: Helper to check limits.
    // The extreme x/y points in a hex grid are usually at the corners.
    // But due to staggered rows, we should check all 4 corners of the q/r bounds.

    const corners = [
        { q: 0, r: 0 },
        { q: maxQ, r: 0 },
        { q: 0, r: maxR },
        { q: maxQ, r: maxR }
    ];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    corners.forEach(c => {
        const center = hexToPixel(c, HEX_SIZE);
        // Add/Sub radius (size) to account for the hex shape itself
        // A hex extends size * 1 in X and size * sqrt(3)/2 ??
        // Actually geometry.ts says: 
        // x = size * (sqrt(3)*q + sqrt(3)/2 * r)
        // y = size * (3/2 * r)

        // We know each hex extends roughly `size` in all directions from center.
        // Let's be generous and say center +/- size * 1.5?
        // Actually specific points are (size, 0), (size/2, size*sqrt3/2) etc.
        // The max extent from center is `size`.

        minX = Math.min(minX, center.x - HEX_SIZE);
        maxX = Math.max(maxX, center.x + HEX_SIZE);
        minY = Math.min(minY, center.y - HEX_SIZE);
        maxY = Math.max(maxY, center.y + HEX_SIZE);
    });

    // Width/Height logic of hexToPixel(q,r) depends on both.
    // X grows with Q and R. Y grows with R.
    // Top-Left (0,0) is min. Bottom-Right (Q, R) is max.
    // But check for "negative" shifts if we had them or specialized layouts. 
    // Here we assume standard Q,R positive.

    const viewBoxX = minX - HEX_SIZE; // Adding small buffer
    const viewBoxY = minY - HEX_SIZE;
    const viewBoxW = (maxX - minX) + HEX_SIZE * 2;
    const viewBoxH = (maxY - minY) + HEX_SIZE * 2;

    // Constants for rendering offset - we want to shift everything so (viewBoxX, viewBoxY) becomes (0,0) visually?
    // Actually SVG viewBox handles the shifting.
    // So we don't need X_OFFSET/Y_OFFSET to shift positive, we can just set viewBox to start at minX/minY.
    // BUT the drawing code uses X_OFFSET and Y_OFFSET. Let's make them 0 and rely on viewBox?
    // Wait, the drawing code adds X_OFFSET. If we change that, we break drawing unless we update viewBox logic accordingly.
    // Let's keep existing X_OFFSET/Y_OFFSET as 0 in this scope or remove them from drawing?
    // The previous code had const X_OFFSET outside. I should update them or compensate.

    // Simpler: Set offsets to 0 here (conceptually) by adjusting viewBox.
    // The drawing usage implies `x + OFFSET`. 
    // If we define local renders offsets as 0, then we just need the viewBox to cover the [minX, minY, width, height].


    // SMART REPLAY LOGIC
    useEffect(() => {
        if (!isPlaying) return;

        // Calculate delay for the CURRENT turn
        // If there are events to show, we want to linger on this turn.
        const hasEvents = activeEvents.length > 0;

        let delay = 300 / speedMultiplier;
        if (hasEvents) {
            // "Smart Slowdown": force at least 2000ms if there are events
            // but respect if user makes it super slow manually? 
            // The requirement is to make it readable. 2s is good.
            delay = Math.max(delay, 2000);
        }

        const timeout = setTimeout(() => {
            setReplayTurn(prev => {
                if (prev >= maxTurn) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, delay);

        return () => clearTimeout(timeout);
    }, [isPlaying, replayTurn, maxTurn, activeEvents.length, speedMultiplier]);

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

    // Helper to format CamelCase IDs
    const formatId = (id: string) => id.replace(/([A-Z])/g, ' $1').trim();

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", alignItems: "center", justifyContent: "flex-start", paddingTop: "1rem", color: "white" }}>
            <div style={{ marginBottom: "0.5rem", fontSize: "1.5rem", fontWeight: "bold", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                Turn: {replayTurn} / {maxTurn}
            </div>

            <div style={{ flex: 1, width: "90%", minHeight: 0, maxHeight: "40vh", border: "2px solid rgba(255,255,255,0.2)", borderRadius: "12px", padding: "10px", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="100%" height="100%" viewBox={`${viewBoxX + X_OFFSET} ${viewBoxY + Y_OFFSET} ${viewBoxW} ${viewBoxH}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: "100%", maxHeight: "100%" }}>

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
            <div data-testid="event-overlay" style={{ height: "60px", marginTop: "1rem", textAlign: "center", minHeight: "60px" }}>
                {activeEvents.map((e, i) => {
                    let text = "";
                    switch (e.type) {
                        case "CityFounded":
                            text = `City Founded: ${e.data.cityName}`;
                            break;
                        case "TechResearched":
                            // data should have techId
                            text = `Researched: ${formatId(e.data.techId)}`;
                            break;
                        case "EraEntered":
                            text = `Entered Era: ${e.data.era || "?"}`;
                            break;
                        case "WarDeclared": {
                            const targetId = (e.data as any).targetId;
                            if (e.playerId === playerId) {
                                const targetName = gameState.players.find(p => p.id === targetId)?.civName || "Unknown";
                                text = `Declared War on ${formatId(targetName)}`;
                            } else {
                                const attackerName = gameState.players.find(p => p.id === e.playerId)?.civName || "Unknown";
                                text = `${formatId(attackerName)} Declared War!`;
                            }
                            break;
                        }
                        case "CityCaptured":
                            text = `City Captured: ${e.data.cityName}`;
                            break;
                        case "PeaceMade":
                            text = `Peace Treaty Signed`;
                            break;
                        case "VictoryAchieved":
                            text = `Victory (${e.data.victoryType})`;
                            break;
                        case "CivContact":
                            // Only show if WE met them, not if they met us
                            if (e.playerId !== playerId) break;

                            // data: { targetId: string }
                            // Ideally we want the Civ Name. We have gameState.players.
                            const otherId = e.data.targetId;
                            const otherCiv = gameState.players.find(p => p.id === otherId)?.civName || "Unknown";
                            text = `Met Civilization: ${formatId(otherCiv)}`;
                            break;
                        case "WonderBuilt":
                            // data: { wonderId: string } ??
                            text = `Wonder Completed: ${formatId(e.data.wonderId || "Unknown")}`;
                            break;
                        default: text = "";
                    }

                    if (!text) return null;

                    return (
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
                            {text}
                        </span>
                    );
                })}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", marginBottom: "2rem", alignItems: "center", width: "80%", background: "rgba(0,0,0,0.4)", padding: "1rem", borderRadius: "30px" }}>

                {/* Play/Pause */}
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

                {/* Speed Controls */}
                <div style={{ display: "flex", gap: "5px", background: "rgba(0,0,0,0.3)", padding: "5px", borderRadius: "20px" }}>
                    {[0.5, 1, 2, 4].map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeedMultiplier(s)}
                            style={{
                                background: speedMultiplier === s ? "#ffd700" : "transparent",
                                color: speedMultiplier === s ? "black" : "white",
                                border: "none",
                                borderRadius: "15px",
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "0.8rem"
                            }}
                        >
                            {s}x
                        </button>
                    ))}
                </div>

                {/* Scrubber */}
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
