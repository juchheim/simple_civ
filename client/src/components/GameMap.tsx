import React from "react";
import { unitImages } from "../assets";
import { GameState, HexCoord, TerrainType, Tile } from "@simple-civ/engine";

// Since we are in monorepo and using "composite", we should import from package name if linked, or relative.
// The package.json says "@simple-civ/engine": "*".
// We should import from "@simple-civ/engine".
// But `hexToString` is not exported from index?
// I exported `* from "./core/hex"` in engine/src/index.ts.
// So I can import { hexToString } from "@simple-civ/engine".

// Let's fix imports to use package name.
// Note: Vite needs to resolve this.

const HEX_SIZE = 50;

interface GameMapProps {
    gameState: GameState;
    onTileClick: (coord: HexCoord) => void;
    selectedCoord: HexCoord | null;
    playerId: string;
    showShroud: boolean;
}

export const GameMap: React.FC<GameMapProps> = ({ gameState, onTileClick, selectedCoord, playerId, showShroud }) => {
    const { map, units, cities } = gameState;
    // Only show tiles actually visible/revealed for the current player; never fall back to revealing the whole map.
    const visibleSet = new Set(gameState.visibility?.[playerId] ?? []);
    const revealedSet = new Set(gameState.revealed?.[playerId] ?? []);

    // Calculate pixel coordinates for a hex
    const hexToPixel = (hex: HexCoord) => {
        const x = HEX_SIZE * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
        const y = HEX_SIZE * ((3 / 2) * hex.r);
        return { x, y };
    };

    // Terrain Colors
    const getTerrainColor = (type: TerrainType) => {
        switch (type) {
            case "Plains": return "#86efac"; // Green-300
            case "Hills": return "#fde047"; // Yellow-300
            case "Forest": return "#166534"; // Green-800
            case "Marsh": return "#14b8a6"; // Teal-500
            case "Desert": return "#fcd34d"; // Amber-300
            case "Mountain": return "#57534e"; // Stone-600
            case "Coast": return "#60a5fa"; // Blue-400
            case "DeepSea": return "#1e3a8a"; // Blue-900
            default: return "#ccc";
        }
    };

    // Render Hex
    const Hex = ({ tile }: { tile: Tile }) => {
        const key = `${tile.coord.q},${tile.coord.r}`;
        const isVisible = visibleSet.has(key);
        const isRevealed = revealedSet.has(key);
        const isFogged = !isVisible && isRevealed;
        const isShroud = !isVisible && !isRevealed;
        if (isShroud && !showShroud) return null;
        const { x, y } = hexToPixel(tile.coord);
        const color = isVisible
            ? getTerrainColor(tile.terrain)
            : isFogged
                ? getTerrainColor(tile.terrain)
                : "#050505";
        const fillOpacity = isVisible ? 1 : isFogged ? 0.55 : 0.85;
        const isSelected = selectedCoord && tile.coord.q === selectedCoord.q && tile.coord.r === selectedCoord.r;

        const unit = units.find(u => u.coord.q === tile.coord.q && u.coord.r === tile.coord.r);
        const city = cities.find(c => c.coord.q === tile.coord.q && c.coord.r === tile.coord.r);

        return (
            <g transform={`translate(${x},${y})`} onClick={() => onTileClick(tile.coord)} style={{ cursor: "pointer" }}>
                <polygon
                    points={getHexPoints()}
                    fill={color}
                    stroke={isSelected ? "white" : isShroud ? "#222" : "rgba(0,0,0,0.2)"}
                    strokeWidth={isSelected ? 3 : 1.25}
                    strokeDasharray={isShroud ? "4 3" : undefined}
                    opacity={fillOpacity}
                />
                {isFogged && (
                    <>
                        <polygon
                            points={getHexPoints()}
                            fill="rgba(0,0,0,0.4)"
                            stroke="#111"
                            strokeWidth={1}
                        />
                        <circle r={6} fill="rgba(255,255,255,0.25)" />
                    </>
                )}
                {isShroud && (
                    <text x={0} y={4} textAnchor="middle" fill="#777" fontSize={12} style={{ pointerEvents: "none" }}>
                        ?
                    </text>
                )}
                {/* Overlays */}
                {isVisible && tile.overlays.includes("RiverEdge" as any) && (
                    // Simple river indicator
                    <circle r={5} fill="blue" cx={0} cy={-10} />
                )}

                {/* City */}
                {isVisible && city && (
                    <g>
                        <rect x={-10} y={-10} width={20} height={20} fill="purple" stroke="white" strokeWidth={2} />
                        <text x={0} y={-15} textAnchor="middle" fill="white" fontSize={10} style={{ pointerEvents: "none" }}>
                            {city.pop}
                        </text>
                    </g>
                )}

                {/* Unit */}
                {isVisible && unit && (
                    <image
                        href={unitImages[unit.type] || ""}
                        x={-20}
                        y={-20}
                        width={40}
                        height={40}
                        style={{ pointerEvents: "none" }}
                    />
                )}

                {/* Coord Debug */}
                {/* <text x={0} y={0} fontSize={8} fill="black" textAnchor="middle">{tile.coord.q},{tile.coord.r}</text> */}
            </g>
        );
    };

    const getHexPoints = () => {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = (Math.PI / 180) * angle_deg;
            points.push(`${HEX_SIZE * Math.cos(angle_rad)},${HEX_SIZE * Math.sin(angle_rad)}`);
        }
        return points.join(" ");
    };

    // ViewBox calculation
    // Find min/max x/y
    // This is rough, can be optimized

    return (
        <svg width="100%" height="100%" viewBox="-500 -500 2000 2000" style={{ background: "#111" }}>
            {map.tiles.map((tile) => (
                <Hex key={`${tile.coord.q},${tile.coord.r}`} tile={tile} />
            ))}
        </svg>
    );
};
