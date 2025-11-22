import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { unitImages, terrainImages, cityImages } from "../assets";
import { City, GameState, HexCoord, TerrainType, Tile, Unit } from "@simple-civ/engine";
import { buildRiverPolylines } from "../utils/rivers";

const HEX_SIZE = 75;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_SENSITIVITY = 0.1;
const UNIT_IMAGE_SIZE = 110; // Much larger unit icons
const DRAG_THRESHOLD = 3; // Pixels of movement before starting pan
const HEX_POINTS = getHexPoints();
const HEX_CORNER_OFFSETS = getHexCornerOffsets();
const RIVER_STROKE_WIDTH = 14;
const RIVER_COLOR = "#2563eb";
const RIVER_OPACITY = 0.9;

interface GameMapProps {
    gameState: GameState;
    onTileClick: (coord: HexCoord) => void;
    selectedCoord: HexCoord | null;
    playerId: string;
    showShroud: boolean;
}

type HexTileProps = {
    tile: Tile;
    hexPoints: string;
    x: number;
    y: number;
    isVisible: boolean;
    isFogged: boolean;
    isShroud: boolean;
    isSelected: boolean;
    showShroud: boolean;
};

const HexTileBase: React.FC<HexTileProps> = React.memo(({ tile, hexPoints, x, y, isVisible, isFogged, isShroud, isSelected, showShroud }) => {
    if (isShroud && !showShroud) return null;

    const color = isVisible
        ? getTerrainColor(tile.terrain)
        : isFogged
            ? getTerrainColor(tile.terrain)
            : "#050505";
    const fillOpacity = isVisible ? 1 : isFogged ? 0.55 : 0.85;
    const terrainImageUrl = getTerrainImage(tile.terrain);

    return (
        <g transform={`translate(${x},${y})`} style={{ cursor: "pointer" }}>
            {terrainImageUrl && isVisible ? (
                <polygon
                    points={hexPoints}
                    fill={`url(#terrain-pattern-${tile.terrain})`}
                    stroke={isSelected ? "white" : "rgba(0,0,0,0.2)"}
                    strokeWidth={isSelected ? 3 : 1.25}
                    opacity={fillOpacity}
                />
            ) : (
                <polygon
                    points={hexPoints}
                    fill={color}
                    stroke={isSelected ? "white" : isShroud ? "#222" : "rgba(0,0,0,0.2)"}
                    strokeWidth={isSelected ? 3 : 1.25}
                    strokeDasharray={isShroud ? "4 3" : undefined}
                    opacity={fillOpacity}
                />
            )}
            {isFogged && (
                <image
                    href={terrainImages.Fog}
                    x={-HEX_SIZE}
                    y={-HEX_SIZE}
                    width={HEX_SIZE * 2}
                    height={HEX_SIZE * 2}
                    style={{ pointerEvents: "none", opacity: 0.3 }}
                />
            )}
            {isShroud && (
                <image
                    href={terrainImages.Fog}
                    x={-HEX_SIZE}
                    y={-HEX_SIZE}
                    width={HEX_SIZE * 2}
                    height={HEX_SIZE * 2}
                    style={{ pointerEvents: "none", opacity: 1.0 }}
                />
            )}
        </g>
    );
});

type HexTileOverlayProps = {
    x: number;
    y: number;
    isVisible: boolean;
    unit?: Unit;
    city?: City;
};

const HexTileOverlay: React.FC<HexTileOverlayProps> = React.memo(({ x, y, isVisible, unit, city }) => {
    if (!isVisible) return null;
    const overlayElements: React.ReactNode[] = [];
    const unitImageOffset = UNIT_IMAGE_SIZE / 2;

    if (city) {
        const cityLevel = Math.min(city.pop, 7);
        const cityImg = cityImages[cityLevel];

        overlayElements.push(
            <g key="city">
                <polygon
                    points={HEX_POINTS}
                    fill="none"
                    stroke="#00ffff"
                    strokeWidth={15}
                    style={{ pointerEvents: "none" }}
                />
                <image
                    href={cityImg}
                    x={-75}
                    y={-75}
                    width={150}
                    height={150}
                    style={{ pointerEvents: "none" }}
                />
                <text
                    x={0}
                    y={-30}
                    textAnchor="middle"
                    fill="white"
                    fontSize={40}
                    style={{
                        pointerEvents: "none",
                        fontWeight: "bold",
                        textShadow: "2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000"
                    }}
                >
                    {city.pop}
                </text>
            </g>,
        );
    }

    if (unit) {
        overlayElements.push(
            <image
                key="unit"
                href={unitImages[unit.type] || ""}
                x={-unitImageOffset}
                y={-unitImageOffset}
                width={UNIT_IMAGE_SIZE}
                height={UNIT_IMAGE_SIZE}
                style={{ pointerEvents: "none" }}
            />,
        );
    }

    if (!overlayElements.length) return null;

    return (
        <g transform={`translate(${x},${y})`} style={{ pointerEvents: "none" }}>
            {overlayElements}
        </g>
    );
});

function getTerrainColor(type: TerrainType) {
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
}

function getTerrainImage(type: TerrainType): string | null {
    return terrainImages[type] || null;
}

function getHexPoints() {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = (Math.PI / 180) * angle_deg;
        points.push(`${HEX_SIZE * Math.cos(angle_rad)},${HEX_SIZE * Math.sin(angle_rad)}`);
    }
    return points.join(" ");
}

function getHexCornerOffsets() {
    const offsets = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = (Math.PI / 180) * angle_deg;
        offsets.push({
            x: HEX_SIZE * Math.cos(angle_rad),
            y: HEX_SIZE * Math.sin(angle_rad),
        });
    }
    return offsets;
}

function squaredDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export const GameMap: React.FC<GameMapProps> = ({ gameState, onTileClick, selectedCoord, playerId, showShroud }) => {
    const { map, units, cities } = gameState;
    const visibleSet = useMemo(() => new Set(gameState.visibility?.[playerId] ?? []), [gameState.visibility, playerId]);
    const revealedSet = useMemo(() => new Set(gameState.revealed?.[playerId] ?? []), [gameState.revealed, playerId]);
    const tileVisibility = useMemo(() => {
        const info = new Map<string, { isVisible: boolean; isFogged: boolean; isShroud: boolean }>();
        map.tiles.forEach(tile => {
            const key = `${tile.coord.q},${tile.coord.r}`;
            const isVisible = visibleSet.has(key);
            const isRevealed = revealedSet.has(key);
            info.set(key, {
                isVisible,
                isFogged: !isVisible && isRevealed,
                isShroud: !isVisible && !isRevealed,
            });
        });
        return info;
    }, [map.tiles, visibleSet, revealedSet]);

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

    // Handle mouse wheel zoom with non-passive event listener
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate zoom delta
            const delta = e.deltaY > 0 ? -ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;
            setZoom(prevZoom => {
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom + delta));

                // Zoom towards mouse position
                const zoomRatio = newZoom / prevZoom;
                setPan(prevPan => ({
                    x: mouseX - (mouseX - prevPan.x) * zoomRatio,
                    y: mouseY - (mouseY - prevPan.y) * zoomRatio
                }));

                return newZoom;
            });
        };

        // Attach event listener with passive: false to allow preventDefault
        svg.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            svg.removeEventListener('wheel', handleWheel);
        };
    }, []); // Empty deps - we use functional state updates

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

    const unitsByCoord = useMemo(() => {
        const coordMap = new Map<string, Unit>();
        units.forEach(u => coordMap.set(`${u.coord.q},${u.coord.r}`, u));
        return coordMap;
    }, [units]);

    const citiesByCoord = useMemo(() => {
        const coordMap = new Map<string, City>();
        cities.forEach(c => coordMap.set(`${c.coord.q},${c.coord.r}`, c));
        return coordMap;
    }, [cities]);

    const renderedTiles = useMemo(() => {
        return map.tiles.map(tile => {
            const key = `${tile.coord.q},${tile.coord.r}`;
            const visibility = tileVisibility.get(key) ?? { isVisible: false, isFogged: false, isShroud: true };
            const { x, y } = hexToPixel(tile.coord);
            const isSelected = !!(selectedCoord && tile.coord.q === selectedCoord.q && tile.coord.r === selectedCoord.r);
            const unit = unitsByCoord.get(key);
            const city = citiesByCoord.get(key);

            return {
                key,
                base: (
                    <HexTileBase
                        key={`base-${key}`}
                        tile={tile}
                        hexPoints={HEX_POINTS}
                        x={x}
                        y={y}
                        isVisible={visibility.isVisible}
                        isFogged={visibility.isFogged}
                        isShroud={visibility.isShroud}
                        isSelected={isSelected}
                        showShroud={showShroud}
                    />
                ),
                overlay: (
                    <HexTileOverlay
                        key={`overlay-${key}`}
                        x={x}
                        y={y}
                        isVisible={visibility.isVisible}
                        unit={unit}
                        city={city}
                    />
                ),
            };
        });
    }, [map.tiles, tileVisibility, selectedCoord, showShroud, unitsByCoord, citiesByCoord, hexToPixel]);

    useEffect(() => {
        if (map.riverPolylines && map.riverPolylines.length) {
            const sample = map.riverPolylines[0]?.slice(0, 3);
            console.log("[River Debug] using descriptor polylines", {
                count: map.riverPolylines.length,
                sample,
            });
        } else if (map.rivers && map.rivers.length) {
            console.log("[River Debug] falling back to legacy river edges", {
                count: map.rivers.length,
            });
        } else {
            console.log("[River Debug] no river data available");
        }
    }, [map.riverPolylines, map.rivers]);

    const riverLineSegments = useMemo(() => {
        const segments: { id: string; start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
        const descriptorPolylines = map.riverPolylines && map.riverPolylines.length ? map.riverPolylines : null;

        if (descriptorPolylines) {
            descriptorPolylines.forEach((polyline, polyIdx) => {
                polyline.forEach((segment, segIdx) => {
                    const tileKey = `${segment.tile.q},${segment.tile.r}`;
                    const isVisible = tileVisibility.get(tileKey)?.isVisible ?? false;
                    if (!isVisible) return;

                    segments.push({
                        id: `river-${polyIdx}-${segIdx}`,
                        start: segment.start,
                        end: segment.end,
                    });
                });

                if (polyIdx === 0 && polyline.length) {
                    console.log("[River Debug] descriptor polyline points", polyline.slice(0, 3).map(seg => ({ start: seg.start, end: seg.end })));
                }
            });
            return segments;
        }

        if (!map.rivers || map.rivers.length === 0) return segments;
        const polylines = buildRiverPolylines(map.rivers);
        const cornerCache = new Map<string, { coord: { x: number; y: number }; idx: number }[]>();

        const getCorners = (tile: HexCoord) => {
            const key = `${tile.q},${tile.r}`;
            if (!cornerCache.has(key)) {
                const center = hexToPixel(tile);
                cornerCache.set(
                    key,
                    HEX_CORNER_OFFSETS.map((offset, idx) => ({
                        coord: { x: center.x + offset.x, y: center.y + offset.y },
                        idx,
                    })),
                );
            }
            return cornerCache.get(key)!;
        };

        polylines.forEach((polyline, polyIdx) => {
            if (polyline.length < 2) return;
            const points: { x: number; y: number; cornerIdx?: number }[] = [];
            for (let i = 0; i < polyline.length - 1; i++) {
                const a = polyline[i];
                const b = polyline[i + 1];
                const aKey = `${a.q},${a.r}`;
                const bKey = `${b.q},${b.r}`;
                const aVisible = tileVisibility.get(aKey)?.isVisible ?? false;
                const bVisible = tileVisibility.get(bKey)?.isVisible ?? false;
                if (!aVisible && !bVisible) continue;

                const aCorners = getCorners(a);
                const bCorners = getCorners(b);
                const shared: { coord: { x: number; y: number }; idx: number }[] = [];

                for (const cornerA of aCorners) {
                    for (const cornerB of bCorners) {
                        if (squaredDistance(cornerA.coord, cornerB.coord) < 1e-6) {
                            shared.push({
                                coord: cornerA.coord,
                                idx: cornerA.idx,
                            });
                            break;
                        }
                    }
                    if (shared.length === 2) break;
                }

                if (shared.length !== 2) {
                    console.log("[River Debug] failed to find shared corners", { a, b, shared });
                    continue;
                }

                const lastPoint = points[points.length - 1];
                const lastIdx = lastPoint?.cornerIdx ?? null;
                const [sharedA, sharedB] = shared;

                const startShared =
                    lastIdx !== null && sharedA.idx === lastIdx
                        ? sharedA
                        : lastIdx !== null && sharedB.idx === lastIdx
                            ? sharedB
                            : lastPoint && squaredDistance(lastPoint, sharedA.coord) <= squaredDistance(lastPoint, sharedB.coord)
                                ? sharedA
                                : sharedB;
                const endShared = startShared === sharedA ? sharedB : sharedA;

                const start = { ...startShared.coord, cornerIdx: startShared.idx };
                const end = { ...endShared.coord, cornerIdx: endShared.idx };

                if (!lastPoint || squaredDistance(lastPoint, start) > 1e-4) {
                    points.push(start);
                }
                points.push(end);
            }

            if (polyIdx === 0) {
                console.log("[River Debug] fallback polyline points", points.slice(0, 6));
            }

            for (let i = 0; i < points.length - 1; i++) {
                segments.push({
                    id: `river-${polyIdx}-${i}`,
                    start: points[i],
                    end: points[i + 1],
                });
            }
        });

        return segments;
    }, [map.riverPolylines, map.rivers, hexToPixel, tileVisibility]);

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
                onMouseDown={handleMouseDown}
            >
                <defs>
                    {/* Define terrain image patterns once */}
                    {Object.entries(terrainImages).map(([terrainType, imageUrl]) => (
                        <pattern
                            key={terrainType}
                            id={`terrain-pattern-${terrainType}`}
                            x="0"
                            y="0"
                            width="1"
                            height="1"
                            patternContentUnits="objectBoundingBox"
                        >
                            <image
                                href={imageUrl}
                                x="0"
                                y="0"
                                width="1"
                                height="1"
                                preserveAspectRatio="xMidYMid slice"
                            />
                        </pattern>
                    ))}
                </defs>
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                    {renderedTiles.map(tile => tile.base)}
                    <g style={{ pointerEvents: "none" }}>
                        {riverLineSegments.map(segment => (
                            <path
                                key={segment.id}
                                d={`M ${segment.start.x} ${segment.start.y} L ${segment.end.x} ${segment.end.y}`}
                                stroke={RIVER_COLOR}
                                strokeWidth={RIVER_STROKE_WIDTH}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={RIVER_OPACITY}
                                fill="none"
                            />
                        ))}
                    </g>
                    {renderedTiles.map(tile => tile.overlay)}
                </g>
            </svg>
        </div>
    );
};
