import React, { useCallback, useMemo } from "react";
import { terrainImages } from "../assets";
import { City, GameState, HexCoord, Tile, Yields, getTileYields } from "@simple-civ/engine";
import { HexTile } from "./GameMap/HexTile";
import { CityLayer, CityOverlayDescriptor } from "./GameMap/CityLayer";
import { OverlayLayer } from "./GameMap/OverlayLayer";
import { UnitLayer, UnitDescriptor } from "./GameMap/UnitLayer";
import { CityBoundsLayer, CityBoundsDescriptor } from "./GameMap/CityBoundsLayer";
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

interface GameMapProps {
    gameState: GameState;
    onTileClick: (coord: HexCoord) => void;
    selectedCoord: HexCoord | null;
    playerId: string;
    showShroud: boolean;
    selectedUnitId: string | null;
    reachableCoords: Set<string>;
    showTileYields: boolean;
}

export const GameMap: React.FC<GameMapProps> = ({ gameState, onTileClick, selectedCoord, playerId, showShroud, selectedUnitId, reachableCoords, showTileYields }) => {
    const { map, units, cities } = gameState;
    const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId) ?? null, [units, selectedUnitId]);
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
    } = useMapInteraction({
        tiles: map.tiles,
        hexToPixel,
        onTileClick,
    });

    const citiesByCoord = useMemo(() => {
        const coordMap = new Map<string, City>();
        cities.forEach(c => coordMap.set(`${c.coord.q},${c.coord.r}`, c));
        return coordMap;
    }, [cities]);

    const tileRenderData = useMemo<TileRenderEntry[]>(() => {
        return map.tiles.map(tile => {
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
                yields: getTileYields(tile),
                isSelected,
                isReachable,
                city,
            };
        });
    }, [map.tiles, tileVisibility, selectedCoord, citiesByCoord, hexToPixel, reachableCoords]);

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
            .filter(entry => entry.tile.ownerCityId && !(entry.visibility.isShroud && !showShroud))
            .forEach(entry => {
                const ownerCityId = entry.tile.ownerCityId!;
                const corners = HEX_CORNER_OFFSETS.map(c => ({ x: entry.position.x + c.x, y: entry.position.y + c.y }));
                const neighbors = getNeighbors(entry.tile.coord);

                neighbors.forEach((neighborCoord, dir) => {
                    const neighborKey = `${neighborCoord.q},${neighborCoord.r}`;
                    const neighborEntry = tileByKey.get(neighborKey);
                    if (neighborEntry?.tile.ownerCityId === ownerCityId) return; // interior edge
                    if (neighborEntry?.tile.ownerCityId) return; // edge touches another city: skip drawing shared boundary

                    const [cornerA, cornerB] = EDGE_TO_CORNER_INDICES[dir];
                    const start = corners[cornerA];
                    const end = corners[cornerB];
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
    }, [tileRenderData, playerColorMap, showShroud, tileByKey]);

    const unitRenderData = useMemo<UnitDescriptor[]>(() => {
        const linkedPartnerId = selectedUnit?.linkedUnitId ?? null;
        return units
            .filter(unit => {
                const key = `${unit.coord.q},${unit.coord.r}`;
                return tileVisibility.get(key)?.isVisible;
            })
            .map(unit => ({
                unit,
                position: hexToPixel(unit.coord),
                isSelected: selectedUnitId === unit.id,
                isLinkedPartner: linkedPartnerId === unit.id,
                showLinkIcon: !!unit.linkedUnitId,
            }));
    }, [units, selectedUnitId, hexToPixel, selectedUnit, tileVisibility]);

    const riverLineSegments = useRiverPolylines({
        map,
        tileVisibility,
        hexToPixel,
        hexCornerOffsets: HEX_CORNER_OFFSETS,
    });

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
                    <CityLayer
                        overlays={cityOverlayData}
                        hexPoints={HEX_POINTS}
                    />
                    <UnitLayer units={unitRenderData} />
                </g>
            </svg>
        </div>
    );
};
