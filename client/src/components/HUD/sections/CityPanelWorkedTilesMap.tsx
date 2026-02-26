import React from "react";
import { City, GameState, HexCoord, getCityCenterYields, getTileYields, isTileAdjacentToRiver } from "@simple-civ/engine";
import { getTerrainColor, hexToPixel } from "../../GameMap/geometry";

type WorkedTilesMapProps = {
    city: City;
    map: GameState["map"];
    tiles: GameState["map"]["tiles"];
    workedTiles: HexCoord[];
    onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
    onLocalChange: (tiles: HexCoord[]) => void;
};

const HEX_SIZE = 36;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const HEX_PADDING = 30;

type WorkedTileNode = {
    tile: GameState["map"]["tiles"][number];
    yields: { F: number; P: number; S: number; G: number };
    isWorked: boolean;
    isCenter: boolean;
    isLocked: boolean;
    position: { x: number; y: number };
    terrainColor: string;
};

export const WorkedTilesMap: React.FC<WorkedTilesMapProps> = ({ city, map, tiles, workedTiles, onSetWorkedTiles, onLocalChange }) => {
    const nodes: WorkedTileNode[] = React.useMemo(() => {
        return tiles.map(tile => {
            const isWorked = workedTiles.some(w => w.q === tile.coord.q && w.r === tile.coord.r);
            const isCenter = tile.coord.q === city.coord.q && tile.coord.r === city.coord.r;
            const canAdd = workedTiles.length < city.pop;
            const isLocked = (!isWorked && !canAdd) || !tile.ownerId || (city.ownerId !== tile.ownerId && !isWorked) || isCenter;

            let tileYields = isCenter ? getCityCenterYields(city, tile) : getTileYields(tile);
            if (isTileAdjacentToRiver(map, tile.coord)) {
                tileYields = { ...tileYields, F: tileYields.F + 1 };
            }

            const position = hexToPixel(
                { q: tile.coord.q - city.coord.q, r: tile.coord.r - city.coord.r },
                HEX_SIZE,
            );

            return {
                tile,
                yields: tileYields,
                isWorked,
                isCenter,
                isLocked,
                position,
                terrainColor: getTerrainColor(tile.terrain),
            };
        });
    }, [city, map, tiles, workedTiles]);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
        const left = node.position.x - HEX_WIDTH / 2;
        const right = node.position.x + HEX_WIDTH / 2;
        const top = node.position.y - HEX_HEIGHT / 2;
        const bottom = node.position.y + HEX_HEIGHT / 2;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, bottom);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
        minX = -HEX_WIDTH / 2;
        maxX = HEX_WIDTH / 2;
        minY = -HEX_HEIGHT / 2;
        maxY = HEX_HEIGHT / 2;
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const viewWidth = Math.max(320, Math.round(contentWidth + HEX_PADDING * 2));
    const viewHeight = Math.max(240, Math.round(contentHeight + HEX_PADDING * 2));
    const extraX = Math.max(0, viewWidth - (contentWidth + HEX_PADDING * 2));
    const extraY = Math.max(0, viewHeight - (contentHeight + HEX_PADDING * 2));
    const offsetX = HEX_PADDING - minX + extraX / 2;
    const offsetY = HEX_PADDING - minY + extraY / 2;

    return (
        <div className="city-panel__hex-map" style={{ minHeight: viewHeight }}>
            <div className="city-panel__hex-layer" style={{ width: viewWidth, height: viewHeight }}>
                {nodes.map(node => {
                    const { tile, isWorked, isCenter, isLocked, yields, terrainColor } = node;
                    const left = offsetX + node.position.x - HEX_WIDTH / 2;
                    const top = offsetY + node.position.y - HEX_HEIGHT / 2;

                    return (
                        <button
                            key={`${tile.coord.q},${tile.coord.r}`}
                            className={`city-panel__hex-button${isWorked ? " is-worked" : ""}${isCenter ? " is-center" : ""}${isLocked && !isCenter ? " is-locked" : ""}`}
                            style={{
                                left,
                                top,
                                width: HEX_WIDTH,
                                height: HEX_HEIGHT,
                                ["--terrain-tint" as string]: `${terrainColor}55`,
                            }}
                            disabled={isLocked}
                            aria-label={`Tile ${tile.coord.q},${tile.coord.r} (${tile.terrain})`}
                            title={
                                isCenter
                                    ? "City center must always be worked"
                                    : isWorked
                                        ? "Unassign tile"
                                        : isLocked
                                            ? "No citizens available"
                                            : `Assign tile (${workedTiles.length}/${city.pop})`
                            }
                            onClick={() => {
                                if (isLocked && !isWorked) return;
                                let nextWorked = workedTiles.filter(w => !(w.q === tile.coord.q && w.r === tile.coord.r));
                                if (!isWorked) {
                                    nextWorked = [...nextWorked, tile.coord];
                                }
                                if (!nextWorked.some(w => w.q === city.coord.q && w.r === city.coord.r)) {
                                    nextWorked.unshift(city.coord);
                                }
                                nextWorked = nextWorked.slice(0, Math.max(1, city.pop));
                                onLocalChange(nextWorked);
                                onSetWorkedTiles(city.id, nextWorked);
                            }}
                        >
                            <div className="city-panel__hex-yields">
                                <div className="city-panel__yield-row">
                                    <span className="city-panel__yield city-panel__yield--food">F{yields.F}</span>
                                    <span className="city-panel__yield city-panel__yield--prod">P{yields.P}</span>
                                    <span className="city-panel__yield city-panel__yield--science">S{yields.S}</span>
                                </div>
                                <div className="city-panel__yield-row">
                                    <span className="city-panel__yield city-panel__yield--gold">G{yields.G}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
