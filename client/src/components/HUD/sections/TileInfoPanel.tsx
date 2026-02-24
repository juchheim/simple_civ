import React from "react";
import { TerrainType, TERRAIN, OVERLAY, OverlayType, Yields, HexCoord } from "@simple-civ/engine";

type TileInfoPanelProps = {
    tile: {
        coord: HexCoord;
        terrain: TerrainType;
        overlays: OverlayType[];
    };
};

export const TileInfoPanel: React.FC<TileInfoPanelProps> = ({ tile }) => {
    const terrainData = TERRAIN[tile.terrain];

    // Calculate total yields
    const totalYields: Yields = { ...terrainData.yields };

    // Add overlay yields
    tile.overlays.forEach(overlayType => {
        const overlayData = OVERLAY[overlayType];
        if (overlayData.yieldBonus) {
            if (overlayData.yieldBonus.F) totalYields.F += overlayData.yieldBonus.F;
            if (overlayData.yieldBonus.P) totalYields.P += overlayData.yieldBonus.P;
            if (overlayData.yieldBonus.S) totalYields.S += overlayData.yieldBonus.S;
            if (overlayData.yieldBonus.G) totalYields.G += overlayData.yieldBonus.G;
        }
    });

    // Format movement cost
    const moveCost = terrainData.moveCostLand !== undefined
        ? `${terrainData.moveCostLand}`
        : terrainData.moveCostNaval !== undefined
            ? `${terrainData.moveCostNaval} (Naval)`
            : "Impassable";

    return (
        <div style={{ marginTop: 10 }}>
            <div className="hud-section-title">Selected Tile</div>
            <p className="hud-title-sm" style={{ margin: "2px 0 8px 0" }}>
                {tile.terrain}
            </p>

            <div className="hud-chip-row">
                <span className="hud-chip">Move: {moveCost}</span>
                <span className="hud-chip">Def: {terrainData.defenseMod > 0 ? "+" : ""}{terrainData.defenseMod}</span>
                {totalYields.F > 0 && <span className="hud-chip">Food: {totalYields.F}</span>}
                {totalYields.P > 0 && <span className="hud-chip">Prod: {totalYields.P}</span>}
                {totalYields.S > 0 && <span className="hud-chip">Sci: {totalYields.S}</span>}
                {totalYields.G > 0 && <span className="hud-chip">Gold: {totalYields.G}</span>}
            </div>

            {tile.overlays.length > 0 && (
                <div style={{ marginTop: 8 }}>
                    <div className="hud-subtext">Features:</div>
                    <div className="hud-chip-row" style={{ marginTop: 4 }}>
                        {tile.overlays.map((overlay, idx) => (
                            <span key={idx} className="hud-chip">
                                {overlay.replace(/([a-z])([A-Z])/g, '$1 $2')}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
