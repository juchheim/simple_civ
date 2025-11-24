import React from "react";

export type CityBoundsDescriptor = {
    key: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    strokeColor: string;
    isVisible: boolean;
    isFogged: boolean;
};

type CityBoundsLayerProps = {
    tiles: CityBoundsDescriptor[];
};

export const CityBoundsLayer: React.FC<CityBoundsLayerProps> = React.memo(({ tiles }) => {
    return (
        <g style={{ pointerEvents: "none" }}>
            {tiles.map(tile => {
                const baseOpacity = 1.0;
                const strokeWidth = 7;

                return (
                    <line
                        key={`city-bounds-${tile.key}`}
                        x1={tile.start.x}
                        y1={tile.start.y}
                        x2={tile.end.x}
                        y2={tile.end.y}
                        stroke={tile.strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={baseOpacity}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeDasharray="8 14"
                    />
                );
            })}
        </g>
    );
});
