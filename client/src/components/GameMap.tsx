import React, { useState, useEffect, useRef, useCallback } from "react";
import { unitImages } from "../assets";
import { GameState, HexCoord, TerrainType, Tile } from "@simple-civ/engine";

const HEX_SIZE = 75;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_SENSITIVITY = 0.1;
const UNIT_IMAGE_SIZE = 110; // Much larger unit icons
const DRAG_THRESHOLD = 3; // Pixels of movement before starting pan

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

    // Pan and zoom state
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1.0);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
    const [clickTarget, setClickTarget] = useState<HexCoord | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasInitializedRef = useRef(false);

    // Calculate pixel coordinates for a hex
    const hexToPixel = useCallback((hex: HexCoord) => {
        const x = HEX_SIZE * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
        const y = HEX_SIZE * ((3 / 2) * hex.r);
        return { x, y };
    }, []);

    // Convert screen coordinates to world coordinates
    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        return {
            x: (screenX - pan.x) / zoom,
            y: (screenY - pan.y) / zoom
        };
    }, [pan, zoom]);

    // Find hex at screen coordinates
    const findHexAtScreen = useCallback((screenX: number, screenY: number): HexCoord | null => {
        const world = screenToWorld(screenX, screenY);
        let closestHex: HexCoord | null = null;
        let minDist = Infinity;

        map.tiles.forEach(tile => {
            const { x, y } = hexToPixel(tile.coord);
            const dist = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
            if (dist < minDist && dist < HEX_SIZE) {
                minDist = dist;
                closestHex = tile.coord;
            }
        });

        return closestHex;
    }, [map.tiles, hexToPixel, screenToWorld]);

    // Calculate map bounds and center on initial mount only
    useEffect(() => {
        // Only initialize once, don't reset on game state changes
        if (hasInitializedRef.current || map.tiles.length === 0 || !containerRef.current) return;

        // Calculate bounds of all tiles
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        map.tiles.forEach(tile => {
            const { x, y } = hexToPixel(tile.coord);
            const hexRadius = HEX_SIZE;
            minX = Math.min(minX, x - hexRadius);
            minY = Math.min(minY, y - hexRadius);
            maxX = Math.max(maxX, x + hexRadius);
            maxY = Math.max(maxY, y + hexRadius);
        });

        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;
        const mapCenterX = (minX + maxX) / 2;
        const mapCenterY = (minY + maxY) / 2;

        // Get container dimensions
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate zoom to fit map with some padding
        const padding = 50;
        const scaleX = (containerWidth - padding * 2) / mapWidth;
        const scaleY = (containerHeight - padding * 2) / mapHeight;
        const initialZoom = Math.min(scaleX, scaleY, 1.0); // Don't zoom in beyond 1.0 initially

        // Center the map
        const centerX = containerWidth / 2 - mapCenterX * initialZoom;
        const centerY = containerHeight / 2 - mapCenterY * initialZoom;

        setPan({ x: centerX, y: centerY });
        setZoom(initialZoom);
        hasInitializedRef.current = true;
    }, [map.tiles, hexToPixel]);

    // Handle mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        
        if (!svgRef.current) return;

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate zoom delta
        const delta = e.deltaY > 0 ? -ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));

        // Zoom towards mouse position
        const zoomRatio = newZoom / zoom;
        const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
        const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
    }, [zoom, pan]);

    // Handle mouse down
    const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (e.button !== 0) return; // Only left button

        if (!svgRef.current) return;
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Find if we clicked on a hex
        const hex = findHexAtScreen(screenX, screenY);
        
        setMouseDownPos({ x: e.clientX, y: e.clientY });
        setClickTarget(hex);
        setPanStart(pan);
    }, [pan, findHexAtScreen]);

    // Handle mouse move
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!mouseDownPos) return;

        const deltaX = e.clientX - mouseDownPos.x;
        const deltaY = e.clientY - mouseDownPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If moved beyond threshold, start panning
        if (distance > DRAG_THRESHOLD) {
            if (!isPanning) {
                setIsPanning(true);
                setClickTarget(null); // Cancel click if we're panning
            }
            
            // Update pan
            setPan({
                x: panStart.x + deltaX,
                y: panStart.y + deltaY
            });
        }
    }, [mouseDownPos, panStart, isPanning]);

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        // If we were panning, don't trigger click
        if (isPanning) {
            setIsPanning(false);
            setMouseDownPos(null);
            setClickTarget(null);
            return;
        }

        // If we have a click target and didn't pan, trigger click
        if (clickTarget) {
            onTileClick(clickTarget);
        }

        setIsPanning(false);
        setMouseDownPos(null);
        setClickTarget(null);
    }, [isPanning, clickTarget, onTileClick]);

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

        const unitImageOffset = UNIT_IMAGE_SIZE / 2;

        return (
            <g transform={`translate(${x},${y})`} style={{ cursor: "pointer" }}>
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
                        <circle r={9} fill="rgba(255,255,255,0.25)" />
                    </>
                )}
                {isShroud && (
                    <text x={0} y={6} textAnchor="middle" fill="#777" fontSize={18} style={{ pointerEvents: "none" }}>
                        ?
                    </text>
                )}
                {/* Overlays */}
                {isVisible && tile.overlays.includes("RiverEdge" as any) && (
                    // Simple river indicator
                    <circle r={7.5} fill="blue" cx={0} cy={-15} />
                )}

                {/* City */}
                {isVisible && city && (
                    <g>
                        <rect x={-15} y={-15} width={30} height={30} fill="purple" stroke="white" strokeWidth={3} />
                        <text x={0} y={-20} textAnchor="middle" fill="white" fontSize={15} style={{ pointerEvents: "none" }}>
                            {city.pop}
                        </text>
                    </g>
                )}

                {/* Unit */}
                {isVisible && unit && (
                    <image
                        href={unitImages[unit.type] || ""}
                        x={-unitImageOffset}
                        y={-unitImageOffset}
                        width={UNIT_IMAGE_SIZE}
                        height={UNIT_IMAGE_SIZE}
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

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ background: "#111", cursor: isPanning ? "grabbing" : "default" }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
            >
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                    {map.tiles.map((tile) => (
                        <Hex key={`${tile.coord.q},${tile.coord.r}`} tile={tile} />
                    ))}
                </g>
            </svg>
        </div>
    );
};
