import { useMemo, useCallback } from "react";
import { City, GameState, HexCoord, Tile, Yields, getTileYields, TerrainType, isTileAdjacentToRiver, findPath, UnitType } from "@simple-civ/engine";
import { TileVisibilityState } from "./useMapVisibility";
import { CityOverlayDescriptor } from "../components/GameMap/CityLayer";
import { CityBoundsDescriptor } from "../components/GameMap/CityBoundsLayer";
import { UnitDescriptor } from "../components/GameMap/UnitLayer";
import { useRiverPolylines } from "../components/GameMap/useRiverPolylines";
import { getNeighbors } from "../utils/hex";
import { HEX_SIZE } from "../components/GameMap/constants";
import { getHexCornerOffsets } from "../components/GameMap/geometry";

export type TileRenderEntry = {
    key: string;
    tile: Tile;
    position: { x: number; y: number };
    visibility: TileVisibilityState;
    yields: Yields;
    isSelected: boolean;
    isReachable: boolean;
    city: City | null;
};

type RenderDataParams = {
    gameState: GameState;
    playerId: string;
    map: { tiles: Tile[] };
    units: GameState["units"];
    cities: GameState["cities"];
    tileVisibility: Map<string, TileVisibilityState>;
    renderableKeys: Set<string>;
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    hoveredCoord: HexCoord | null;
    reachableCoords: Set<string>;
    hexToPixel: (hex: HexCoord) => { x: number; y: number };
    FALLBACK_VISIBILITY: TileVisibilityState;
};

const HEX_CORNER_OFFSETS = getHexCornerOffsets(HEX_SIZE);

export const useRenderData = ({
    gameState,
    playerId,
    map,
    units,
    cities,
    tileVisibility,
    renderableKeys,
    selectedCoord,
    selectedUnitId,
    hoveredCoord,
    reachableCoords,
    hexToPixel,
    FALLBACK_VISIBILITY,
}: RenderDataParams) => {
    const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId) ?? null, [units, selectedUnitId]);

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

        const adjRiver = Array.isArray((gameState.map as any)?.rivers)
            ? isTileAdjacentToRiver(gameState.map, tile.coord)
            : false;
        if (civ === "RiverLeague" && adjRiver) food += 1;
        if (civ === "ForgeClans" && tile.terrain === TerrainType.Hills) production += 1;

        return { F: food, P: production, S: science };
    }, [gameState.map, playerId, playersById]);

    const citiesByCoord = useMemo(() => {
        const coordMap = new Map<string, City>();
        cities.forEach(c => coordMap.set(`${c.coord.q},${c.coord.r}`, c));
        return coordMap;
    }, [cities]);

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
    }, [map.tiles, tileVisibility, selectedCoord, citiesByCoord, hexToPixel, reachableCoords, getTileYieldsWithCiv, renderableKeys, FALLBACK_VISIBILITY]);

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
                    color: unit.ownerId === "natives" ? "#f97316" : (playerColorMap.get(unit.ownerId) ?? "#22d3ee"),
                    isOnCityHex,
                };
            });
    }, [units, selectedUnitId, hexToPixel, selectedUnit, tileVisibility, citiesByCoord, playerColorMap]);

    const { unitRenderDataOnCity, unitRenderDataOffCity } = useMemo(() => {
        const onCity: UnitDescriptor[] = [];
        const offCity: UnitDescriptor[] = [];
        unitRenderData.forEach(u => {
            if (u.isOnCityHex) {
                onCity.push(u);
            } else {
                offCity.push(u);
            }
        });
        return { unitRenderDataOnCity: onCity, unitRenderDataOffCity: offCity };
    }, [unitRenderData]);

    const riverLineSegments = useRiverPolylines({
        map: gameState.map,
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

    return {
        tileRenderData,
        cityOverlayData,
        cityBounds,
        unitRenderData,
        unitRenderDataOnCity,
        unitRenderDataOffCity,
        riverLineSegments,
        pathData,
        selectedUnit, // Exporting this as it's used in GameMap for path rendering condition
    };
};
