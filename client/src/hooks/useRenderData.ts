import { useMemo } from "react";
import { City, GameState, HexCoord, Tile, Yields, findPath, UnitType } from "@simple-civ/engine";
import { TileVisibilityState } from "./useMapVisibility";
import { CityOverlayDescriptor } from "../components/GameMap/CityLayer";
import { CityBoundsDescriptor } from "../components/GameMap/CityBoundsLayer";
import { UnitDescriptor } from "../components/GameMap/UnitLayer";
import { useRiverPolylines } from "../components/GameMap/useRiverPolylines";
import { HEX_SIZE } from "../components/GameMap/constants";
import { getHexCornerOffsets } from "../components/GameMap/geometry";
import {
    computeTileYieldsWithCivBonuses,
    createCitiesByCoord,
    createPlayerColorMap,
    createPlayersById,
    splitUnitRenderDataByCity,
    toCoordKey
} from "./render-data-helpers";
import { buildCityBoundsSegments } from "./render-data-city-bounds";

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

    const playersById = useMemo(() => createPlayersById(gameState.players), [gameState.players]);
    const citiesByCoord = useMemo(() => createCitiesByCoord(cities), [cities]);

    const tileRenderData = useMemo<TileRenderEntry[]>(() => {
        return map.tiles
            .filter(tile => renderableKeys.has(toCoordKey(tile.coord)))
            .map(tile => {
                const key = toCoordKey(tile.coord);
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
                    yields: computeTileYieldsWithCivBonuses({
                        tile,
                        playerId,
                        playersById,
                        map: gameState.map,
                    }),
                    isSelected,
                    isReachable,
                    city,
                };
            });
    }, [map.tiles, tileVisibility, selectedCoord, citiesByCoord, hexToPixel, reachableCoords, renderableKeys, FALLBACK_VISIBILITY, playerId, playersById, gameState.map]);

    const playerColorMap = useMemo(() => createPlayerColorMap(gameState.players), [gameState.players]);

    const cityOverlayData = useMemo<CityOverlayDescriptor[]>(() => {
        return tileRenderData
            // Show cities in both visible AND fogged tiles (like native camps/goodie huts)
            .filter(entry => (entry.visibility.isVisible || entry.visibility.isFogged) && !!entry.city)
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
        return buildCityBoundsSegments({
            tileRenderData,
            tileByKey,
            playerColorMap,
            hexCornerOffsets: HEX_CORNER_OFFSETS,
        });
    }, [tileRenderData, playerColorMap, tileByKey]);

    const unitRenderData = useMemo<UnitDescriptor[]>(() => {
        const linkedPartnerId = selectedUnit?.linkedUnitId ?? null;
        return units
            .filter(unit => {
                const key = toCoordKey(unit.coord);
                return tileVisibility.get(key)?.isVisible;
            })
            .map(unit => {
                const key = toCoordKey(unit.coord);
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
                    // Show indicator if: owned by player, has moves, and NOT fortified/sleeping
                    canMove: unit.ownerId === playerId && unit.movesLeft > 0 && unit.state !== "Fortified",
                };
            });
    }, [units, selectedUnitId, hexToPixel, selectedUnit, tileVisibility, citiesByCoord, playerColorMap, playerId]);

    const { unitRenderDataOnCity, unitRenderDataOffCity } = useMemo(() => {
        return splitUnitRenderDataByCity(unitRenderData);
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
