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
}) => {
    const tilesForCity = gameState.map.tiles.filter(
        tile => tile.ownerId === city.ownerId && hexDistance(tile.coord, city.coord) <= 2,
    );

    const yields = getCityYields(city, gameState);
    const civ = gameState.players.find(p => p.id === city.ownerId)?.civName;
    const scholarActive = civ === "ScholarKingdoms" && city.pop >= 3;

    const garrison = units.find(u => u.ownerId === playerId && u.coord.q === city.coord.q && u.coord.r === city.coord.r);
    const targets = units.filter(u => u.ownerId !== playerId && hexDistance(u.coord, city.coord) <= 2);

    return (
        <div>
            <h4>City: {city.name}</h4>
            <p>
                HP: {city.hp}/{city.maxHp}
            </p>
            <p>Pop: {city.pop}</p>
            <p>Food: {city.storedFood}</p>
            <p>Prod: {city.storedProduction}</p>
            <p>Yields (after perks): {yields.F}F / {yields.P}P / {yields.S}S</p>
            {civ === "ScholarKingdoms" && (
                <p style={{ fontSize: 12, color: scholarActive ? "#10b981" : "#f59e0b" }}>
                    Scholar Kingdoms: +1 Science at pop 3+ ({scholarActive ? "active" : "inactive"})
                </p>
            )}
            <p>Building: {city.currentBuild ? city.currentBuild.id : "Idle"}</p>
            <p>Worked Tiles: {city.workedTiles.length}</p>

            {isMyTurn && !city.currentBuild && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {buildOptions.units.map(unit => (
                        <button key={unit.id} onClick={() => onBuild("Unit", unit.id)}>
                            Build {unit.name}
                        </button>
                    ))}
                    {buildOptions.buildings.map(building => (
                        <button key={building.id} onClick={() => onBuild("Building", building.id)}>
                            Build {building.name}
                        </button>
                    ))}
                    {buildOptions.projects.map(project => (
                        <button key={project.id} onClick={() => onBuild("Project", project.id)}>
                            Build {project.name}
                        </button>
                    ))}
                </div>
            )}

            {isMyTurn && (
                <div style={{ marginTop: 8 }}>
                    <h5>Assign Worked Tiles</h5>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {tilesForCity.map(tile => {
                            const isWorked = city.workedTiles.some(w => w.q === tile.coord.q && w.r === tile.coord.r);
                            const center = tile.coord.q === city.coord.q && tile.coord.r === city.coord.r;
                            const canAdd = city.workedTiles.length < city.pop;
                            const disabled = (!isWorked && !canAdd) || !tile.ownerId || (city.ownerId !== tile.ownerId && !isWorked) || center;

                            return (
                                <button
                                    key={`${tile.coord.q},${tile.coord.r}`}
                                    disabled={disabled}
                                    style={{
                                        background: isWorked ? "#3b8" : "#555",
                                        border: center ? "2px solid #fff" : "1px solid #999",
                                        padding: "4px 8px",
                                        opacity: disabled && !isWorked ? 0.4 : 1,
                                    }}
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
                                    {tile.coord.q},{tile.coord.r} {tile.terrain}
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: "12px", marginTop: 4, maxWidth: 280 }}>
                        Worked tiles must include the city center and are limited by population. Unseen tiles cannot be assigned until revealed.
                    </p>
                </div>
            )}

            {isMyTurn && city.ownerId === playerId && !city.isCapital && (
                <div style={{ marginTop: 8 }}>
                    <button onClick={onRazeCity} style={{ background: "#ef4444", border: "1px solid #b91c1c" }}>
                        Raze City
                    </button>
                </div>
            )}

            {isMyTurn && city.ownerId === playerId && (
                <div style={{ marginTop: 8 }}>
                    <h5>City Attack (range 2)</h5>
                    {!garrison && <p style={{ margin: "4px 0" }}>No garrison present.</p>}
                    {garrison && city.hasFiredThisTurn && <p style={{ margin: "4px 0" }}>Already fired this turn.</p>}
                    {garrison && !city.hasFiredThisTurn && !targets.length && <p style={{ margin: "4px 0" }}>No enemies in range.</p>}
                    {garrison && !city.hasFiredThisTurn && targets.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {targets.map(target => (
                                <button key={target.id} onClick={() => onCityAttack(target.id)}>
                                    Fire at {target.type} ({target.hp} hp)
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
