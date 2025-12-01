import React from "react";
import { GameState } from "@simple-civ/engine";
import { MapViewport } from "../GameMap";
import { getTerrainColor, getHexPoints, hexToPixel } from "../GameMap/geometry";
import { HEX_SIZE } from "../GameMap/constants";

type MiniMapProps = {
    gameState: GameState;
    playerId: string;
    mapView: MapViewport | null;
    selectedUnitId: string | null;
    onNavigate: (point: { x: number; y: number }) => void;
};

const MINIMAP_SIZE = 220;
const VIEWPORT_MIN_SIZE = 10;
const CITY_MARK_SCALE = 0.72;
const UNIT_MARK_SCALE = 0.6;

export const MiniMap: React.FC<MiniMapProps> = ({ gameState, playerId, mapView, selectedUnitId, onNavigate }) => {
    const svgRef = React.useRef<SVGSVGElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const hexPoints = React.useMemo(() => getHexPoints(HEX_SIZE), []);

    const visibleSet = React.useMemo(() => new Set(gameState.visibility?.[playerId] ?? []), [gameState, playerId]);
    const revealedSet = React.useMemo(() => {
        const revealed = gameState.revealed?.[playerId];
        if (revealed && revealed.length > 0) return new Set(revealed);
        return visibleSet;
    }, [gameState, playerId, visibleSet]);

    const tileEntries = React.useMemo(() => {
        return gameState.map.tiles
            .filter(tile => revealedSet.has(`${tile.coord.q},${tile.coord.r}`))
            .map(tile => ({
                key: `${tile.coord.q},${tile.coord.r}`,
                terrain: tile.terrain,
                position: hexToPixel(tile.coord, HEX_SIZE),
            }));
    }, [gameState.map.tiles, revealedSet]);

    const bounds = React.useMemo(() => {
        if (tileEntries.length === 0) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        tileEntries.forEach(entry => {
            minX = Math.min(minX, entry.position.x - HEX_SIZE);
            minY = Math.min(minY, entry.position.y - HEX_SIZE);
            maxX = Math.max(maxX, entry.position.x + HEX_SIZE);
            maxY = Math.max(maxY, entry.position.y + HEX_SIZE);
        });

        const padding = HEX_SIZE * 0.8;
        return {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding,
        };
    }, [tileEntries]);

    const playerColorMap = React.useMemo(() => {
        const map = new Map<string, string>();
        gameState.players.forEach(p => map.set(p.id, p.color));
        return map;
    }, [gameState.players]);

    const cityMarkers = React.useMemo(() => {
        return gameState.cities
            .filter(city => revealedSet.has(`${city.coord.q},${city.coord.r}`))
            .map(city => ({
                id: city.id,
                position: hexToPixel(city.coord, HEX_SIZE),
                color: playerColorMap.get(city.ownerId) ?? "#22d3ee",
            }));
    }, [gameState.cities, revealedSet, playerColorMap]);

    const selectedUnitMarker = React.useMemo(() => {
        if (!selectedUnitId) return null;
        const unit = gameState.units.find(u => u.id === selectedUnitId);
        if (!unit) return null;
        const key = `${unit.coord.q},${unit.coord.r}`;
        if (!revealedSet.has(key)) return null;
        return {
            position: hexToPixel(unit.coord, HEX_SIZE),
            color: playerColorMap.get(unit.ownerId) ?? "#f97316",
        };
    }, [selectedUnitId, gameState.units, revealedSet, playerColorMap]);

    const viewBox = React.useMemo(() => {
        if (!bounds) return "0 0 10 10";
        const width = Math.max(bounds.maxX - bounds.minX, 1);
        const height = Math.max(bounds.maxY - bounds.minY, 1);
        return `${bounds.minX} ${bounds.minY} ${width} ${height}`;
    }, [bounds]);

    const viewportRect = React.useMemo(() => {
        if (!bounds || !mapView) return null;

        const areaWidth = Math.max(bounds.maxX - bounds.minX, VIEWPORT_MIN_SIZE);
        const areaHeight = Math.max(bounds.maxY - bounds.minY, VIEWPORT_MIN_SIZE);
        const desiredWidth = Math.max(mapView.worldBounds.maxX - mapView.worldBounds.minX, VIEWPORT_MIN_SIZE);
        const desiredHeight = Math.max(mapView.worldBounds.maxY - mapView.worldBounds.minY, VIEWPORT_MIN_SIZE);

        const centerX = Math.min(Math.max(mapView.center.x, bounds.minX), bounds.maxX);
        const centerY = Math.min(Math.max(mapView.center.y, bounds.minY), bounds.maxY);
        const width = Math.min(desiredWidth, areaWidth);
        const height = Math.min(desiredHeight, areaHeight);
        const minX = Math.min(Math.max(centerX - width / 2, bounds.minX), bounds.maxX - width);
        const minY = Math.min(Math.max(centerY - height / 2, bounds.minY), bounds.maxY - height);

        return { x: minX, y: minY, width, height };
    }, [bounds, mapView]);

    const handleGlobalMouseUp = React.useCallback(() => setIsDragging(false), []);

    React.useEffect(() => {
        if (!isDragging) return;
        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, [isDragging, handleGlobalMouseUp]);

    const clampPoint = React.useCallback((point: { x: number; y: number }) => {
        if (!bounds) return point;
        return {
            x: Math.min(Math.max(point.x, bounds.minX), bounds.maxX),
            y: Math.min(Math.max(point.y, bounds.minY), bounds.maxY),
        };
    }, [bounds]);

    const toWorldPoint = React.useCallback((clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg || !bounds) return null;
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;
        const ratioX = (clientX - rect.left) / rect.width;
        const ratioY = (clientY - rect.top) / rect.height;
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        return {
            x: bounds.minX + ratioX * width,
            y: bounds.minY + ratioY * height,
        };
    }, [bounds]);

    const handleNavigate = React.useCallback((clientX: number, clientY: number) => {
        const world = toWorldPoint(clientX, clientY);
        if (!world) return;
        const clamped = clampPoint(world);
        onNavigate(clamped);
    }, [toWorldPoint, clampPoint, onNavigate]);

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();
        handleNavigate(e.clientX, e.clientY);
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDragging) return;
        e.preventDefault();
        handleNavigate(e.clientX, e.clientY);
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className="hud-card hud-minimap-card">
            <div className="hud-menu-header" style={{ marginBottom: 8 }}>
                <div className="hud-section-title" style={{ marginBottom: 0 }}>Minimap</div>
            </div>
            <svg
                ref={svgRef}
                className="hud-minimap-svg"
                width={MINIMAP_SIZE}
                height={MINIMAP_SIZE}
                viewBox={viewBox}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                {bounds && (
                    <rect
                        x={bounds.minX}
                        y={bounds.minY}
                        width={bounds.maxX - bounds.minX}
                        height={bounds.maxY - bounds.minY}
                        className="hud-minimap-background"
                        rx={6}
                    />
                )}
                {tileEntries.map(entry => (
                    <polygon
                        key={entry.key}
                        points={hexPoints}
                        transform={`translate(${entry.position.x},${entry.position.y})`}
                        fill={getTerrainColor(entry.terrain)}
                        opacity={0.8}
                    />
                ))}
                {cityMarkers.map(city => (
                    <polygon
                        key={city.id}
                        points={hexPoints}
                        transform={`translate(${city.position.x},${city.position.y}) scale(${CITY_MARK_SCALE})`}
                        fill={city.color}
                        stroke="#0f172a"
                        strokeWidth={6}
                        opacity={0.9}
                    />
                ))}
                {selectedUnitMarker && (
                    <polygon
                        points={hexPoints}
                        transform={`translate(${selectedUnitMarker.position.x},${selectedUnitMarker.position.y}) scale(${UNIT_MARK_SCALE})`}
                        className="hud-minimap-unit"
                        stroke={selectedUnitMarker.color}
                        strokeWidth={4}
                        fill={selectedUnitMarker.color}
                        fillOpacity={0.5}
                    />
                )}
                {viewportRect && (
                    <rect
                        x={viewportRect.x}
                        y={viewportRect.y}
                        width={viewportRect.width}
                        height={viewportRect.height}
                        className="hud-minimap-viewport"
                    />
                )}
            </svg>
        </div>
    );
};
