import React, { useCallback, useMemo } from "react";
import { terrainImages } from "../assets";
import { City, GameState, HexCoord, Tile, Yields, getTileYields, TerrainType, isTileAdjacentToRiver, findPath, UnitType } from "@simple-civ/engine";
import { HexTile } from "./GameMap/HexTile";
import { CityImageLayer, CityLabelLayer, CityOverlayDescriptor } from "./GameMap/CityLayer";
import { OverlayLayer } from "./GameMap/OverlayLayer";
import { UnitLayer, UnitDescriptor } from "./GameMap/UnitLayer";
import { CityBoundsLayer, CityBoundsDescriptor } from "./GameMap/CityBoundsLayer";
import { PathLayer } from "./GameMap/PathLayer";
import { getHexCornerOffsets, getHexPoints, hexToPixel as projectHexToPixel } from "./GameMap/geometry";
import { useMapInteraction } from "./GameMap/useMapInteraction";
import { useRiverPolylines } from "./GameMap/useRiverPolylines";
import { HEX_SIZE, RIVER_OPACITY } from "./GameMap/constants";
import { getNeighbors } from "../utils/hex";

type TileVisibilityState = { isVisible: boolean; isFogged: boolean; isShroud: boolean };

type TileRenderEntry = {
    key: string;
    tile: Tile;
    position: { x: number; y: number };
    visibility: TileVisibilityState;
    yields: Yields;
    isSelected: boolean;
    isReachable: boolean;
    city: City | null;
};

const HEX_POINTS = getHexPoints(HEX_SIZE);
const HEX_CORNER_OFFSETS = getHexCornerOffsets(HEX_SIZE);
const FALLBACK_VISIBILITY: TileVisibilityState = { isVisible: false, isFogged: false, isShroud: true };

const RENDER_BUFFER_RADIUS = 2;
const RENDER_OFFSETS: { q: number; r: number }[] = [];
for (let q = -RENDER_BUFFER_RADIUS; q <= RENDER_BUFFER_RADIUS; q++) {
    const r1 = Math.max(-RENDER_BUFFER_RADIUS, -q - RENDER_BUFFER_RADIUS);
    const r2 = Math.min(RENDER_BUFFER_RADIUS, -q + RENDER_BUFFER_RADIUS);
    for (let r = r1; r <= r2; r++) {
        RENDER_OFFSETS.push({ q, r });
    }
}

export type MapViewport = {
    pan: { x: number; y: number };
    zoom: number;
    size: { width: number; height: number };
    worldBounds: { minX: number; maxX: number; minY: number; maxY: number };
    center: { x: number; y: number };
};

export type GameMapHandle = {
    centerOnCoord: (coord: HexCoord) => void;
    centerOnPoint: (point: { x: number; y: number }) => void;
};

interface GameMapProps {
    gameState: GameState;
    onTileClick: (coord: HexCoord) => void;
    selectedCoord: HexCoord | null;
    playerId: string;
    showShroud: boolean;
    selectedUnitId: string | null;
    reachableCoords: Set<string>;
    showTileYields: boolean;
    hoveredCoord: HexCoord | null;
    onHoverTile: (coord: HexCoord | null) => void;
    cityToCenter?: HexCoord | null;
    onViewChange?: (view: MapViewport) => void;
}

const GameMapComponent = React.forwardRef<GameMapHandle, GameMapProps>(({ gameState, onTileClick, selectedCoord, playerId, showShroud, selectedUnitId, reachableCoords, showTileYields, hoveredCoord, onHoverTile, cityToCenter, onViewChange }, ref) => {
    const { map, units, cities } = gameState;
    const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId) ?? null, [units, selectedUnitId]);
    const visibleSet = useMemo(() => new Set(gameState.visibility?.[playerId] ?? []), [gameState, playerId]);
    const revealedSet = useMemo(() => new Set(gameState.revealed?.[playerId] ?? []), [gameState, playerId]);
    const playersById = useMemo(() => {
        const playerMap = new Map<string, (typeof gameState.players)[number]>();
        gameState.players.forEach(p => playerMap.set(p.id, p));
        return playerMap;
    }, [gameState]);

    const getTileYieldsWithCiv = useCallback((tile: Tile): Yields => {
        const owner = playersById.get(tile.ownerId ?? playerId) ?? playersById.get(playerId);
        const civ = owner?.civName;
        const base = getTileYields(tile);

        let food = base.F;
        let production = base.P;
        const science = base.S;

        const adjRiver = isTileAdjacentToRiver(map, tile.coord);
        if (civ === "RiverLeague" && adjRiver) food += 1;
        if (civ === "ForgeClans" && tile.terrain === TerrainType.Hills) production += 1;

        return { F: food, P: production, S: science };
    }, [playersById, playerId, map]);
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

    const hexToPixel = useCallback((hex: HexCoord) => projectHexToPixel(hex, HEX_SIZE), []);
    const {
        pan,
        zoom,
        isPanning,
        containerRef,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        centerOnCoord,
        centerOnPoint,
    } = useMapInteraction({
        tiles: map.tiles,
        hexToPixel,
        onTileClick,
        onHoverTile,
        initialCenter: useMemo(() => {
            const unit = units.find(u => u.ownerId === playerId);
            if (unit) return unit.coord;
            const city = cities.find(c => c.ownerId === playerId);
            if (city) return city.coord;
            return null;
        }, [units, cities, playerId]),
    });

    // Center camera on city when cityToCenter changes
    React.useEffect(() => {
        if (cityToCenter) {
            centerOnCoord(cityToCenter);
        }
    }, [cityToCenter, centerOnCoord]);

    React.useImperativeHandle(ref, () => ({
        centerOnCoord,
        centerOnPoint,
    }), [centerOnCoord, centerOnPoint]);

    const [viewportSize, setViewportSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });

    React.useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setViewportSize(prev => {
                if (prev.width === width && prev.height === height) return prev;
                return { width, height };
            });
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        setViewportSize(prev => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (prev.width === width && prev.height === height) return prev;
            return { width, height };
        });
    }, [containerRef]);

    const viewport = React.useMemo<MapViewport | null>(() => {
        if (viewportSize.width === 0 || viewportSize.height === 0) return null;
        const minX = (-pan.x) / zoom;
        const minY = (-pan.y) / zoom;
        const maxX = (viewportSize.width - pan.x) / zoom;
        const maxY = (viewportSize.height - pan.y) / zoom;

        return {
            pan,
            zoom,
            size: viewportSize,
            worldBounds: { minX, maxX, minY, maxY },
            center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        };
    }, [pan, zoom, viewportSize]);

    const lastViewportRef = React.useRef<MapViewport | null>(null);
    React.useEffect(() => {
        if (!viewport || !onViewChange) return;
        const last = lastViewportRef.current;
        const unchanged =
            last &&
            last.zoom === viewport.zoom &&
            last.pan.x === viewport.pan.x &&
            last.pan.y === viewport.pan.y &&
            last.size.width === viewport.size.width &&
            last.size.height === viewport.size.height;

        if (unchanged) return;
        lastViewportRef.current = viewport;
        onViewChange(viewport);
    }, [viewport, onViewChange]);

    const citiesByCoord = useMemo(() => {
        const coordMap = new Map<string, City>();
        cities.forEach(c => coordMap.set(`${c.coord.q},${c.coord.r}`, c));
        return coordMap;
    }, [cities]);

    const renderableKeys = useMemo(() => {
        const keys = new Set<string>();
        const processSet = (s: Set<string>) => {
            s.forEach(key => {
                const parts = key.split(',');
                const q = parseInt(parts[0], 10);
                const r = parseInt(parts[1], 10);
                for (const offset of RENDER_OFFSETS) {
                    keys.add(`${q + offset.q},${r + offset.r}`);
                }
            });
        };
        processSet(visibleSet);
        processSet(revealedSet);
        return keys;
    }, [visibleSet, revealedSet]);

    const tileRenderData = useMemo<TileRenderEntry[]>(() => {
        return map.tiles
            .filter(tile => renderableKeys.has(`${tile.coord.q},${tile.coord.r}`))
            .map(tile => {
                const key = `${tile.coord.q},${tile.coord.r}`;
                const visibility = tileVisibility.get(key) ?? FALLBACK_VISIBILITY;
                const position = hexToPixel(tile.coord);
                const isSelected = !!(selectedCoord && tile.coord.q === selectedCoord.q && tile.coord.r === selectedCoord.r);
                const city = citiesByCoord.get(key) ?? null;
                const isReachable = reachableCoords.has(key);

                return {
                    key,
                    tile,
                    position,
                    visibility,
                    yields: getTileYieldsWithCiv(tile),
                    isSelected,
                    isReachable,
                    city,
                };
            });
    }, [map.tiles, tileVisibility, selectedCoord, citiesByCoord, hexToPixel, reachableCoords, getTileYieldsWithCiv, renderableKeys]);

    const playerColorMap = useMemo(() => {
        const map = new Map<string, string>();
        gameState.players.forEach(p => map.set(p.id, p.color));
        return map;
    }, [gameState.players]);

    const cityOverlayData = useMemo<CityOverlayDescriptor[]>(() => {
        return tileRenderData
            .filter(entry => entry.visibility.isVisible && !!entry.city)
            .map(entry => ({
                key: entry.key,
                position: entry.position,
                city: entry.city!,
                strokeColor: playerColorMap.get(entry.city!.ownerId) ?? "#22d3ee",
            }));
    }, [tileRenderData, playerColorMap]);

    const tileByKey = useMemo(() => {
        const map = new Map<string, TileRenderEntry>();
        tileRenderData.forEach(entry => map.set(entry.key, entry));
        return map;
    }, [tileRenderData]);

    const cityBounds = useMemo<CityBoundsDescriptor[]>(() => {
        const segments: CityBoundsDescriptor[] = [];
        const EDGE_TO_CORNER_INDICES: [number, number][] = [
            [0, 1], // E
            [5, 0], // NE
            [4, 5], // NW
            [3, 4], // W
            [2, 3], // SW
            [1, 2], // SE
        ];
        const dedup = new Set<string>();

        tileRenderData
            .filter(entry => entry.tile.ownerCityId && entry.visibility.isVisible)
            .forEach(entry => {
                const ownerCityId = entry.tile.ownerCityId!;
                const corners = HEX_CORNER_OFFSETS.map(c => ({ x: entry.position.x + c.x, y: entry.position.y + c.y }));
                const neighbors = getNeighbors(entry.tile.coord);

                neighbors.forEach((neighborCoord, dir) => {
                    const neighborKey = `${neighborCoord.q},${neighborCoord.r}`;
                    const neighborEntry = tileByKey.get(neighborKey);
                    if (neighborEntry?.tile.ownerCityId === ownerCityId) return; // interior edge
                    // Removed check for neighborEntry?.tile.ownerCityId to allow drawing boundaries between different cities

                    const [cornerA, cornerB] = EDGE_TO_CORNER_INDICES[dir];

                    // Inset the boundary line towards the center of the hex
                    const insetFactor = 0.1; // 10% inset
                    const center = entry.position;

                    const startOriginal = corners[cornerA];
                    const endOriginal = corners[cornerB];

                    const start = {
                        x: startOriginal.x + (center.x - startOriginal.x) * insetFactor,
                        y: startOriginal.y + (center.y - startOriginal.y) * insetFactor
                    };

                    const end = {
                        x: endOriginal.x + (center.x - endOriginal.x) * insetFactor,
                        y: endOriginal.y + (center.y - endOriginal.y) * insetFactor
                    };

                    const edgeKey = `${entry.key}|${neighborKey}|${ownerCityId}`;
                    if (dedup.has(edgeKey)) return;
                    dedup.add(edgeKey);
                    segments.push({
                        key: `${entry.key}-${dir}`,
                        start,
                        end,
                        strokeColor: playerColorMap.get(entry.tile.ownerId ?? "") ?? "#22d3ee",
                        isVisible: entry.visibility.isVisible,
                        isFogged: entry.visibility.isFogged,
                    });
                });
            });

        return segments;
    }, [tileRenderData, playerColorMap, tileByKey]);

    const unitRenderData = useMemo<UnitDescriptor[]>(() => {
        const linkedPartnerId = selectedUnit?.linkedUnitId ?? null;
        return units
            .filter(unit => {
                const key = `${unit.coord.q},${unit.coord.r}`;
                return tileVisibility.get(key)?.isVisible;
            })
            .map(unit => {
                const key = `${unit.coord.q},${unit.coord.r}`;
                // Settlers should always be rendered on top (not as garrison)
                const isOnCityHex = unit.type !== UnitType.Settler && citiesByCoord.has(key);
                return {
                    unit,
                    position: hexToPixel(unit.coord),
                    isSelected: selectedUnitId === unit.id,
                    isLinkedPartner: linkedPartnerId === unit.id,
                    showLinkIcon: !!unit.linkedUnitId,
                    color: playerColorMap.get(unit.ownerId) ?? "#22d3ee",
                    isOnCityHex,
                };
            });
    }, [units, selectedUnitId, hexToPixel, selectedUnit, tileVisibility, citiesByCoord, playerColorMap]);

    const riverLineSegments = useRiverPolylines({
        map,
        tileVisibility,
        hexToPixel,
        hexCornerOffsets: HEX_CORNER_OFFSETS,
    });

    const pathData = useMemo(() => {
        if (!selectedUnit || !hoveredCoord) return [];
        // Don't pathfind to self
        if (selectedUnit.coord.q === hoveredCoord.q && selectedUnit.coord.r === hoveredCoord.r) return [];
        return findPath(selectedUnit.coord, hoveredCoord, selectedUnit, gameState);
    }, [selectedUnit, hoveredCoord, gameState]);

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
                    {tileRenderData.map(entry => (
                        <HexTile
                            key={`base-${entry.key}`}
                            tile={entry.tile}
                            hexPoints={HEX_POINTS}
                            hexSize={HEX_SIZE}
                            position={entry.position}
                            visibility={entry.visibility}
                            isSelected={entry.isSelected}
                            isReachable={entry.isReachable}
                            showShroud={showShroud}
                            yields={entry.yields}
                            showTileYields={showTileYields}
                        />
                    ))}
                    <OverlayLayer
                        riverSegments={riverLineSegments}
                        riverOpacity={RIVER_OPACITY}
                    />
                    <CityBoundsLayer tiles={cityBounds} />
                    <CityImageLayer
                        overlays={cityOverlayData}
                        hexPoints={HEX_POINTS}
                    />
                    <UnitLayer units={unitRenderData.filter(u => u.isOnCityHex)} />
                    <CityLabelLayer
                        overlays={cityOverlayData}
                        hexPoints={HEX_POINTS}
                    />
                    <UnitLayer units={unitRenderData.filter(u => !u.isOnCityHex)} />
                    {selectedUnit && hoveredCoord && (
                        <PathLayer
                            path={pathData}
                            hexToPixel={hexToPixel}
                            movesLeft={selectedUnit.movesLeft}
                        />
                    )}
                </g>
            </svg>
        </div>
    );
});

GameMapComponent.displayName = "GameMap";

export const GameMap = React.memo(GameMapComponent);
