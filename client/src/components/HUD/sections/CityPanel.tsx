import React from "react";
import { City, GameState, HexCoord, Unit, getCityYields } from "@simple-civ/engine";
import { hexDistance } from "../../../utils/hex";
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
    onCityAttack: (targetUnitId: string) => void;
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
    onCityAttack,
    onSetWorkedTiles,
    onSelectUnit,
    onClose,
}) => {
    const tilesForCity = gameState.map.tiles.filter(
        tile => tile.ownerId === city.ownerId && hexDistance(tile.coord, city.coord) <= 2,
    );

    const yields = getCityYields(city, gameState);
    const civ = gameState.players.find(p => p.id === city.ownerId)?.civName;
    const scholarActive = civ === "ScholarKingdoms" && city.pop >= 3;

    const garrison = units.find(u => u.ownerId === playerId && u.coord.q === city.coord.q && u.coord.r === city.coord.r);
    const targets = units.filter(u => u.ownerId !== playerId && hexDistance(u.coord, city.coord) <= 2);
    const workedCount = city.workedTiles.length;

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
                    {isMyTurn && !city.currentBuild && (
                        <div className="city-panel__build-grid" style={{ marginTop: 6 }}>
                            {buildOptions.units.map(unit => (
                                <button key={unit.id} className="hud-button small" onClick={() => onBuild("Unit", unit.id)}>
                                    Train {unit.name}
                                </button>
                            ))}
                            {buildOptions.buildings.map(building => (
                                <button key={building.id} className="hud-button small" onClick={() => onBuild("Building", building.id)}>
                                    Construct {building.name}
                                </button>
                            ))}
                            {buildOptions.projects.map(project => (
                                <button key={project.id} className="hud-button small" onClick={() => onBuild("Project", project.id)}>
                                    Launch {project.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="city-panel__section">
                    <h5>Worked Tiles</h5>
                    <div className="hud-subtext" style={{ marginTop: 0 }}>
                        Assign up to {city.pop} tiles · {workedCount} selected
                    </div>
                    <div className="city-panel__tiles">
                        {tilesForCity.map(tile => {
                            const isWorked = city.workedTiles.some(w => w.q === tile.coord.q && w.r === tile.coord.r);
                            const center = tile.coord.q === city.coord.q && tile.coord.r === city.coord.r;
                            const canAdd = city.workedTiles.length < city.pop;
                            const disabled = (!isWorked && !canAdd) || !tile.ownerId || (city.ownerId !== tile.ownerId && !isWorked) || center;

                            return (
                                <button
                                    key={`${tile.coord.q},${tile.coord.r}`}
                                    disabled={disabled}
                                    className={`hud-chip-button ${isWorked ? "active" : ""}`}
                                    style={{ borderColor: center ? "#60a5fa" : undefined }}
                                    onClick={() => {
                                        let nextWorked = city.workedTiles.filter(w => !(w.q === tile.coord.q && w.r === tile.coord.r));
                                        if (!isWorked) {
                                            nextWorked = [...nextWorked, tile.coord];
                                        }
                                        if (!nextWorked.some(w => w.q === city.coord.q && w.r === city.coord.r)) {
                                            nextWorked.unshift(city.coord);
                                        }
                                        nextWorked = nextWorked.slice(0, Math.max(1, city.pop));
                                        onSetWorkedTiles(city.id, nextWorked);
                                    }}
                                    title={
                                        center
                                            ? "City center must always be worked"
                                            : isWorked
                                                ? "Unassign tile"
                                                : `Assign tile (${city.workedTiles.length}/${city.pop})`
                                    }
                                >
                                    ({tile.coord.q},{tile.coord.r}) {tile.terrain}
                                </button>
                            );
                        })}
                    </div>
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
                            <div className="hud-subtext" style={{ marginTop: 0 }}>City attack range 2</div>
                            {!garrison && <div className="hud-subtext warn">Station a unit to enable attacks.</div>}
                            {garrison && !city.hasFiredThisTurn && targets.length === 0 && (
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
                            )}
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
