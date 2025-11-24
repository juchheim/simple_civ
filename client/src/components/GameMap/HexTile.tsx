import React from "react";
import { Tile } from "@simple-civ/engine";
import { terrainImages } from "../../assets";
import { getTerrainColor, getTerrainImage } from "./geometry";

export type HexTileProps = {
    tile: Tile;
    hexPoints: string;
    hexSize: number;
    position: { x: number; y: number };
    visibility: { isVisible: boolean; isFogged: boolean; isShroud: boolean };
    isSelected: boolean;
    isReachable: boolean;
    showShroud: boolean;
};

export const HexTile: React.FC<HexTileProps> = React.memo(({ tile, hexPoints, hexSize, position, visibility, isSelected, isReachable, showShroud }) => {
    const { isVisible, isFogged, isShroud } = visibility;
    if (isShroud && !showShroud) return null;

    const color = isVisible
        ? getTerrainColor(tile.terrain)
        : isFogged
            ? getTerrainColor(tile.terrain)
            : "#050505";
    const fillOpacity = isVisible ? 1 : isFogged ? 0.55 : 0.85;
    const terrainImageUrl = getTerrainImage(tile.terrain);
    const strokeColor = isSelected ? "white" : isReachable ? "#4ade80" : isShroud ? "#222" : "rgba(0,0,0,0.2)";
    const strokeWidth = isSelected ? 3 : isReachable ? 2 : 1.25;
    const fogImageSize = hexSize * 2;

    return (
        <g transform={`translate(${position.x},${position.y})`} style={{ cursor: "pointer" }}>
            {terrainImageUrl && isVisible ? (
                <polygon
                    points={hexPoints}
                    fill={`url(#terrain-pattern-${tile.terrain})`}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={fillOpacity}
                />
            ) : (
                <polygon
                    points={hexPoints}
                    fill={color}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isShroud ? "4 3" : undefined}
                    opacity={fillOpacity}
                />
            )}
            {isReachable && !isSelected && (
                <circle
                    cx={0}
                    cy={0}
                    r={hexSize * 0.4}
                    fill="rgba(34,197,94,0.18)"
                    stroke="rgba(74,222,128,0.9)"
                    strokeWidth={2}
                    style={{ pointerEvents: "none" }}
                />
            )}
            {isFogged && (
                <image
                    href={terrainImages.Fog}
                    x={-hexSize}
                    y={-hexSize}
                    width={fogImageSize}
                    height={fogImageSize}
                    style={{ pointerEvents: "none", opacity: 0.3 }}
                />
            )}
            {isShroud && (
                <image
                    href={terrainImages.Fog}
                    x={-hexSize}
                    y={-hexSize}
                    width={fogImageSize}
                    height={fogImageSize}
                    style={{ pointerEvents: "none", opacity: 1.0 }}
                />
            )}
        </g>
    );
});

