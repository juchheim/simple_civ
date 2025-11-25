import React from "react";
import { HexCoord } from "@simple-civ/engine";

interface PathLayerProps {
    path: HexCoord[];
    hexToPixel: (hex: HexCoord) => { x: number; y: number };
    movesLeft: number;
}

export const PathLayer: React.FC<PathLayerProps> = ({ path, hexToPixel, movesLeft }) => {
    if (path.length === 0) return null;

    const points = path.map(hex => hexToPixel(hex));

    return (
        <g pointerEvents="none">
            {/* Draw connecting lines */}
            <polyline
                points={points.map(p => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="8 4"
            />

            {/* Draw dots at each step */}
            {points.map((p, i) => {
                // Simple heuristic: first N steps are green (reachable), rest are white (future)
                // Note: This assumes 1 move cost per tile for visualization simplicity. 
                // A perfect visualization would need to run the cost calculation again.
                // Given the "Optimistic" nature, this is an acceptable approximation for the UI.
                const isReachable = i < movesLeft;
                const color = isReachable ? "#4ade80" : "#ffffff";

                return (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={6}
                        fill={color}
                        stroke="#000"
                        strokeWidth="2"
                    />
                );
            })}

            {/* Draw target marker */}
            {points.length > 0 && (
                <circle
                    cx={points[points.length - 1].x}
                    cy={points[points.length - 1].y}
                    r={10}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                />
            )}
        </g>
    );
};
