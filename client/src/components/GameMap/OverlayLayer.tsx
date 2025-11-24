import React from "react";
import { terrainImages } from "../../assets";

export type RiverSegment = {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    isMouth?: boolean;
};

type OverlayLayerProps = {
    riverSegments: RiverSegment[];
    riverOpacity: number;
};

export const OverlayLayer: React.FC<OverlayLayerProps> = React.memo(({ riverSegments, riverOpacity }) => {
    return (
        <g style={{ pointerEvents: "none" }}>
            {riverSegments.map(segment => {
                const dx = segment.end.x - segment.start.x;
                const dy = segment.end.y - segment.start.y;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const midX = (segment.start.x + segment.end.x) / 2;
                const midY = (segment.start.y + segment.end.y) / 2;
                const width = 90;
                const height = 30;
                const texture = segment.isMouth ? terrainImages.RiverMouth : terrainImages.RiverEdge;

                return (
                    <image
                        key={segment.id}
                        href={texture}
                        x={midX - width / 2}
                        y={midY - height / 2}
                        width={width}
                        height={height}
                        transform={`rotate(${angle}, ${midX}, ${midY})`}
                        style={{ pointerEvents: "none", opacity: riverOpacity }}
                    />
                );
            })}
        </g>
    );
});

