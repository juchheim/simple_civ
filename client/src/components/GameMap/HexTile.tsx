import React from "react";
import { Tile, Yields, OverlayType } from "@simple-civ/engine";
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
    yields: Yields;
    showTileYields: boolean;
};

export const HexTile: React.FC<HexTileProps> = React.memo(({ tile, hexPoints, hexSize, position, visibility, isSelected, isReachable, showShroud, yields, showTileYields }) => {
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
    const resourceOverlays = tile.overlays.filter(ov => ov !== OverlayType.RiverEdge);
    const overlayOpacity = isVisible ? 0.95 : 0.6;

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
            {resourceOverlays.length > 0 && (isVisible || isFogged) && (
                <g style={{ pointerEvents: "none" }}>
                    {resourceOverlays.map((overlay, idx) => {
                        // GoodieHut renders as a full-hex centered image
                        if (overlay === OverlayType.GoodieHut) {
                            const hutSize = hexSize * 1.6;
                            return (
                                <image
                                    key={`${overlay}-${idx}`}
                                    href={terrainImages.GoodieHut}
                                    x={-hutSize / 2}
                                    y={-hutSize / 2}
                                    width={hutSize}
                                    height={hutSize}
                                    opacity={overlayOpacity}
                                    style={{ pointerEvents: "none" }}
                                />
                            );
                        }
                        // Other overlays render as small icons
                        const iconX = -hexSize * 0.45 + idx * 18;
                        const iconY = -hexSize * 0.35;
                        if (overlay === OverlayType.RichSoil) {
                            return (
                                <g key={`${overlay}-${idx}`} transform={`translate(${iconX},${iconY})`} opacity={overlayOpacity}>
                                    <circle cx={0} cy={0} r={8} fill="#65a30d" stroke="#365314" strokeWidth={2} />
                                    <circle cx={0} cy={0} r={4} fill="#bef264" stroke="#365314" strokeWidth={1} />
                                </g>
                            );
                        }
                        if (overlay === OverlayType.OreVein) {
                            return (
                                <g key={`${overlay}-${idx}`} transform={`translate(${iconX},${iconY}) rotate(45)`} opacity={overlayOpacity}>
                                    <rect x={-8} y={-8} width={16} height={16} fill="#d6d3d1" stroke="#44403c" strokeWidth={2} rx={2} ry={2} />
                                    <rect x={-4} y={-4} width={8} height={8} fill="#f59e0b" stroke="#92400e" strokeWidth={1.5} rx={1} ry={1} />
                                </g>
                            );
                        }
                        if (overlay === OverlayType.SacredSite) {
                            return (
                                <g key={`${overlay}-${idx}`} transform={`translate(${iconX},${iconY})`} opacity={overlayOpacity}>
                                    <polygon points="0,-9 8,6 -8,6" fill="#fde68a" stroke="#b45309" strokeWidth={2} />
                                    <circle cx={0} cy={-3} r={3} fill="#fbbf24" stroke="#92400e" strokeWidth={1.5} />
                                </g>
                            );
                        }
                        // NativeCamp renders as full-hex centered image like GoodieHut
                        if (overlay === OverlayType.NativeCamp) {
                            const campSize = hexSize * 1.6;
                            return (
                                <image
                                    key={`${overlay}-${idx}`}
                                    href={terrainImages.NativeCamp}
                                    x={-campSize / 2}
                                    y={-campSize / 2}
                                    width={campSize}
                                    height={campSize}
                                    opacity={overlayOpacity}
                                    style={{ pointerEvents: "none" }}
                                />
                            );
                        }
                        // ClearedSettlement renders as full-hex centered image
                        if (overlay === OverlayType.ClearedSettlement) {
                            const settlementSize = hexSize * 1.6;
                            return (
                                <image
                                    key={`${overlay}-${idx}`}
                                    href={terrainImages.ClearedSettlement}
                                    x={-settlementSize / 2}
                                    y={-settlementSize / 2}
                                    width={settlementSize}
                                    height={settlementSize}
                                    opacity={overlayOpacity}
                                    style={{ pointerEvents: "none" }}
                                />
                            );
                        }
                        return null;
                    })}
                </g>
            )}
            {showTileYields && (isVisible || isFogged) && (
                <g style={{ pointerEvents: "none" }}>
                    {(() => {
                        const label = `${yields.F}F ${yields.P}P ${yields.S}S ${yields.G}G`;
                        const labelWidth = Math.max(60, label.length * 7);
                        const labelHeight = 18;
                        const labelY = hexSize * 0.55;
                        return (
                            <>
                                <rect
                                    x={-labelWidth / 2}
                                    y={labelY - labelHeight + 4}
                                    width={labelWidth}
                                    height={labelHeight}
                                    rx={8}
                                    ry={8}
                                    fill="rgba(0,0,0,0.6)"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeWidth={1}
                                />
                                <text
                                    x={0}
                                    y={labelY}
                                    textAnchor="middle"
                                    fill={isVisible ? "#f8fafc" : "#cbd5e1"}
                                    fontSize={12}
                                    fontWeight={700}
                                >
                                    {label}
                                </text>
                            </>
                        );
                    })()}
                </g>
            )}
        </g>
    );
});
