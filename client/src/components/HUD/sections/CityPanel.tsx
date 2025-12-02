import React from "react";
import { City, GameState, HexCoord, Unit, getCityYields, getTileYields, getCityCenterYields, isTileAdjacentToRiver } from "@simple-civ/engine";
import { hexDistance } from "../../../utils/hex";
import { getTerrainColor, hexToPixel } from "../../GameMap/geometry";
import { CityBuildOptions } from "../hooks";

type CityPanelProps = {
    city: City;
    isMyTurn: boolean;
    playerId: string;
    gameState: GameState;
    units: Unit[];
    buildOptions: CityBuildOptions;
    onBuild: (type: "Unit" | "Building" | "Project", id: string) => void;
    onRazeCity: () => void;
    // onCityAttack: (targetUnitId: string) => void;
    onSetWorkedTiles: (cityId: string, tiles: HexCoord[]) => void;
    onSelectUnit: (unitId: string) => void;
    onClose: () => void;
};

export const CityPanel: React.FC<CityPanelProps> = ({
    city,
    isMyTurn,
    playerId,
    gameState,
    units,
    buildOptions,
    onBuild,
    onRazeCity,
    // onCityAttack,
    onSetWorkedTiles,
    onSelectUnit,
    onClose,
}) => {
    const [localWorked, setLocalWorked] = React.useState<HexCoord[]>(city.workedTiles);

    React.useEffect(() => {
        setLocalWorked(city.workedTiles);
    }, [city.id, city.workedTiles]);

    const ownedTiles = React.useMemo(() => {
        const byCityClaim = gameState.map.tiles.filter(tile => tile.ownerCityId === city.id);
        const fallbackRange = gameState.map.tiles.filter(
            tile => tile.ownerId === city.ownerId && hexDistance(tile.coord, city.coord) <= 2,
        );
        const tilesForMap = byCityClaim.length > 0 ? byCityClaim : fallbackRange;
        const hasCenter = tilesForMap.some(t => t.coord.q === city.coord.q && t.coord.r === city.coord.r);
        if (hasCenter) return tilesForMap;

        const centerTile = gameState.map.tiles.find(t => t.coord.q === city.coord.q && t.coord.r === city.coord.r);
        return centerTile ? [centerTile, ...tilesForMap] : tilesForMap;
    }, [city.coord.q, city.coord.r, city.id, city.ownerId, gameState.map.tiles]);

    const yields = getCityYields(city, gameState);
    const civ = gameState.players.find(p => p.id === city.ownerId)?.civName;
    const scholarActive = civ === "ScholarKingdoms" && city.pop >= 3;

    const garrison = units.find(u => u.ownerId === playerId && u.coord.q === city.coord.q && u.coord.r === city.coord.r);
    const targets = units.filter(u => u.ownerId !== playerId && hexDistance(u.coord, city.coord) <= 2);
    const workedCount = localWorked.length;

    return (
        <div>
            <div className="hud-section-title">City</div>
            <div className="hud-menu-header" style={{ alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                    <p className="hud-title" style={{ margin: "0 0 4px 0" }}>{city.name}</p>
                    <div className="hud-subtext" style={{ marginTop: 0 }}>
                        Pop {city.pop} · HP {city.hp}/{city.maxHp}
                    </div>
                    {civ === "ScholarKingdoms" && (
                        <div className="hud-subtext" style={{ color: scholarActive ? "#a7f3d0" : "#fcd34d" }}>
                            Scholar Kingdoms: +1 Science at pop 3+ ({scholarActive ? "active" : "inactive"})
                        </div>
                    )}
                </div>
                <div className="hud-chip-row" style={{ justifyContent: "flex-end" }}>
                    <span className="hud-chip">Stored Food: {city.storedFood}</span>
                    <span className="hud-chip">Stored Prod: {city.storedProduction}</span>
                </div>
            </div>

            <div className="city-panel__stats">
                <span className="hud-chip">Yields: {yields.F}F / {yields.P}P / {yields.S}S</span>
                <span className="hud-chip">Worked: {workedCount}/{city.pop}</span>
                <span className="hud-chip">Build: {city.currentBuild ? city.currentBuild.id : "Idle"}</span>
            </div>

            <div className="city-panel__grid">
                <div className="city-panel__section">
                    <h5>Production</h5>
                    {city.currentBuild ? (
                        <>
                            <div className="hud-subtext">Building {city.currentBuild.id}</div>
                            <div className="hud-progress" style={{ marginTop: 6 }}>
                                <div
                                    className="hud-progress-fill"
                                    style={{
                                        width: `${Math.min(100, Math.round((city.buildProgress / city.currentBuild.cost) * 100))}%`,
                                    }}
                                />
                            </div>
                            <div className="hud-subtext">
                                Progress: {city.buildProgress}/{city.currentBuild.cost}
                            </div>
                        </>
                    ) : (
                        <div className="hud-subtext" style={{ marginBottom: 6 }}>Choose what to produce.</div>
                    )}
                    {isMyTurn && (
                        <div className="city-panel__build-grid" style={{ marginTop: 6 }}>
                            {buildOptions.units.map(unit => {
                                const key = `Unit:${unit.id}`;
                                const saved = city.savedProduction?.[key];
                                return (
                                    <button key={unit.id} className="hud-button small" onClick={() => onBuild("Unit", unit.id)}>
                                        Train {unit.name}
                                        {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                                    </button>
                                );
                            })}
                            {buildOptions.buildings.map(building => {
                                const key = `Building:${building.id}`;
                                const saved = city.savedProduction?.[key];
                                return (
                                    <button key={building.id} className="hud-button small" onClick={() => onBuild("Building", building.id)}>
                                        Construct {building.name}
                                        {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                                    </button>
                                );
                            })}
                            {buildOptions.projects.map(project => {
                                const key = `Project:${project.id}`;
                                const saved = city.savedProduction?.[key];
                                return (
                                    <button key={project.id} className="hud-button small" onClick={() => onBuild("Project", project.id)}>
                                        Launch {project.name}
                                        {saved ? <span style={{ fontSize: "0.8em", opacity: 0.7, marginLeft: 4 }}>({saved} prod)</span> : null}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="city-panel__section">
                    <div className="city-panel__section-head">
                        <h5>Worked Tiles</h5>
                        <span className="hud-chip">Assigned {workedCount}/{city.pop}</span>
                    </div>
                    <div className="hud-subtext" style={{ marginTop: 0 }}>
                        Tap owned hexes to focus citizens; the layout scales as {city.name} claims more land.
                    </div>
                    <WorkedTilesMap
                        city={city}
                        map={gameState.map}
                        tiles={ownedTiles}
                        workedTiles={localWorked}
                        onSetWorkedTiles={onSetWorkedTiles}
                        onLocalChange={setLocalWorked}
                    />
                    <div className="hud-subtext" style={{ marginTop: 6 }}>
                        City center is always assigned. Unseen or enemy tiles cannot be worked.
                    </div>
                </div>

                <div className="city-panel__section">
                    <h5>Defense & Actions</h5>
                    <div className="hud-chip-row" style={{ marginBottom: 8 }}>
                        {garrison ? (
                            <button
                                className="hud-chip success clickable"
                                onClick={() => {
                                    onSelectUnit(garrison.id);
                                    onClose();
                                }}
                                style={{ cursor: "pointer", border: "1px solid var(--color-success)", background: "rgba(34, 197, 94, 0.1)" }}
                            >
                                Garrison: {garrison.type}
                            </button>
                        ) : (
                            <span className="hud-chip warn">No garrison</span>
                        )}
                        {city.hasFiredThisTurn && <span className="hud-chip warn">Fired this turn</span>}
                    </div>
                    {isMyTurn && city.ownerId === playerId && (
                        <>
                            {/* <div className="hud-subtext" style={{ marginTop: 0 }}>City attack range 2</div> */}
                            {!garrison && <div className="hud-subtext warn">Station a unit to enable attacks.</div>}
                            {/* {garrison && !city.hasFiredThisTurn && targets.length === 0 && (
                                <div className="hud-subtext">No enemies in range.</div>
                            )}
                            {garrison && !city.hasFiredThisTurn && targets.length > 0 && (
                                <div className="hud-chip-row" style={{ marginTop: 6 }}>
                                    {targets.map(target => (
                                        <button key={target.id} className="hud-button small" onClick={() => onCityAttack(target.id)}>
                                            Fire at {target.type} ({target.hp} hp)
                                        </button>
                                    ))}
                                </div>
                            )} */}
                            {!city.isCapital && (
                                <button className="hud-button small danger" style={{ marginTop: 10 }} onClick={onRazeCity}>
                                    Raze City
                                </button>
                            )}
                        </>
                    )}
                    {!isMyTurn && <div className="hud-subtext">Wait for your turn to manage city actions.</div>}
                </div>
            </div>
        </div>
    );
};

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
    yields: { F: number; P: number; S: number };
    isWorked: boolean;
    isCenter: boolean;
    isLocked: boolean;
    position: { x: number; y: number };
    terrainColor: string;
};

const WorkedTilesMap: React.FC<WorkedTilesMapProps> = ({ city, map, tiles, workedTiles, onSetWorkedTiles, onLocalChange }) => {
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
                    const statusLabel = isCenter
                        ? "City center"
                        : isWorked
                            ? "Worked"
                            : isLocked
                                ? "Locked"
                                : "Idle";

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
                                <span className="city-panel__yield city-panel__yield--food">F{yields.F}</span>
                                <span className="city-panel__yield city-panel__yield--prod">P{yields.P}</span>
                                <span className="city-panel__yield city-panel__yield--science">S{yields.S}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
