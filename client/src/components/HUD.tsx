import React from "react";
import { GameState, HexCoord, Action, UnitType, BuildingType, ProjectId, DiplomacyState } from "@simple-civ/engine";
import { canBuild } from "../utils/rules";
import { hexDistance } from "../utils/hex";

interface HUDProps {
    gameState: GameState;
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    onAction: (action: Action) => void;
    onSelectUnit: (unitId: string | null) => void;
    onShowTechTree: () => void;
    playerId: string;
}

export const HUD: React.FC<HUDProps> = ({ gameState, selectedCoord, selectedUnitId, onAction, onSelectUnit, onShowTechTree, playerId }) => {
    const { units, cities, currentPlayerId, turn } = gameState;
    const isMyTurn = currentPlayerId === playerId;

    // Get all units on the selected tile
    const unitsOnTile = selectedCoord
        ? units.filter(u => u.coord.q === selectedCoord.q && u.coord.r === selectedCoord.r && u.ownerId === playerId)
        : [];

    // Auto-select if only one unit
    React.useEffect(() => {
        if (unitsOnTile.length === 1 && !selectedUnitId) {
            onSelectUnit(unitsOnTile[0].id);
        }
    }, [selectedCoord, unitsOnTile.length, selectedUnitId, onSelectUnit]);

    const selectedUnit = selectedUnitId
        ? units.find(u => u.id === selectedUnitId)
        : null;

    const selectedCity = selectedCoord
        ? cities.find(c => c.coord.q === selectedCoord.q && c.coord.r === selectedCoord.r)
        : null;
    const ownedCities = cities.filter(c => c.ownerId === playerId);
    const tilesForCity = (cityId: string) => {
        const city = cities.find(c => c.id === cityId);
        if (!city) return [];
        return gameState.map.tiles.filter(t => t.ownerId === city.ownerId && hexDistance(t.coord, city.coord) <= 2);
    };

    const handleEndTurn = () => {
        onAction({ type: "EndTurn", playerId });
    };

    const handleFoundCity = () => {
        if (!selectedUnit) return;
        const name = prompt("City Name:", "New City");
        if (name) {
            onAction({ type: "FoundCity", playerId, unitId: selectedUnit.id, name });
        }
    };

    const handleBuild = (type: "Unit" | "Building" | "Project", id: string) => {
        if (!selectedCity) return;
        onAction({ type: "SetCityBuild", playerId, cityId: selectedCity.id, buildType: type, buildId: id });
    };

    const handleRazeCity = () => {
        if (!selectedCity) return;
        if (!window.confirm("Raze this city? This will remove it permanently.")) return;
        onAction({ type: "RazeCity", playerId, cityId: selectedCity.id });
    };

    const handleCityAttack = (targetUnitId: string) => {
        if (!selectedCity) return;
        onAction({ type: "CityAttack", playerId, cityId: selectedCity.id, targetUnitId });
    };

    // Define full build options
    const unitOptions = [
        { id: UnitType.Scout, name: "Scout" },
        { id: UnitType.SpearGuard, name: "Spear Guard" },
        { id: UnitType.BowGuard, name: "Bow Guard" },
        { id: UnitType.Riders, name: "Riders" },
        { id: UnitType.RiverBoat, name: "River Boat" },
        { id: UnitType.Settler, name: "Settler" },
    ];

    const buildingOptions = [
        { id: BuildingType.Farmstead, name: "Farmstead" },
        { id: BuildingType.StoneWorkshop, name: "Stone Workshop" },
        { id: BuildingType.Scriptorium, name: "Scriptorium" },
        { id: BuildingType.Reservoir, name: "Reservoir" },
        { id: BuildingType.LumberMill, name: "Lumber Mill" },
        { id: BuildingType.Academy, name: "Academy" },
        { id: BuildingType.CityWard, name: "City Ward" },
        { id: BuildingType.Forgeworks, name: "Forgeworks" },
        { id: BuildingType.CitySquare, name: "City Square" },
    ];

    const projectOptions = [
        { id: ProjectId.Observatory, name: "Observatory" },
        { id: ProjectId.GrandAcademy, name: "Grand Academy" },
        { id: ProjectId.GrandExperiment, name: "Grand Experiment" },
        { id: ProjectId.FormArmy_SpearGuard, name: "Form Army (Spear)" },
        { id: ProjectId.FormArmy_BowGuard, name: "Form Army (Bow)" },
        { id: ProjectId.FormArmy_Riders, name: "Form Army (Riders)" },
    ];

    return (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, background: "rgba(0,0,0,0.8)", color: "white", display: "flex", gap: 20 }}>
            <div>
                <h3>Turn {turn}</h3>
                <p>Player: {currentPlayerId}</p>
                {isMyTurn && <button onClick={handleEndTurn}>End Turn</button>}
            </div>

            <div>
                <h4>Research</h4>
                {gameState.players.find(p => p.id === playerId)?.currentTech ? (
                    <div>
                        <p style={{ margin: "5px 0" }}>
                            {gameState.players.find(p => p.id === playerId)!.currentTech!.id}
                        </p>
                        <p style={{ margin: "5px 0", fontSize: "12px" }}>
                            Progress: {gameState.players.find(p => p.id === playerId)!.currentTech!.progress}/
                            {gameState.players.find(p => p.id === playerId)!.currentTech!.cost}
                        </p>
                    </div>
                ) : (
                    <p style={{ margin: "5px 0", color: "#ff9800" }}>No active research</p>
                )}
                <button onClick={onShowTechTree} style={{ marginTop: "10px" }}>Tech Tree</button>
            </div>

            {unitsOnTile.length > 1 && (
                <div>
                    <h4>Units on Tile:</h4>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {unitsOnTile.map(unit => (
                            <button
                                key={unit.id}
                                onClick={() => onSelectUnit(unit.id)}
                                style={{
                                    background: selectedUnitId === unit.id ? "#4CAF50" : "#666",
                                    border: selectedUnitId === unit.id ? "2px solid white" : "1px solid #999",
                                    padding: "5px 10px"
                                }}
                            >
                                {unit.type} (M:{unit.movesLeft})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedUnit && (
                <div>
                    <h4>Unit: {selectedUnit.type}</h4>
                    <p>Moves: {selectedUnit.movesLeft}</p>
                    <p>HP: {selectedUnit.hp}</p>
                    {selectedUnit.type === "Settler" && isMyTurn && (
                        <button onClick={handleFoundCity}>Found City</button>
                    )}
                </div>
            )}

            {selectedCity && (
                <div>
                    <h4>City: {selectedCity.name}</h4>
                    <p>Pop: {selectedCity.pop}</p>
                    <p>Food: {selectedCity.storedFood}</p>
                    <p>Prod: {selectedCity.storedProduction}</p>
                    <p>Building: {selectedCity.currentBuild ? selectedCity.currentBuild.id : "Idle"}</p>
                    <p>Worked Tiles: {selectedCity.workedTiles.length}</p>

                    {isMyTurn && !selectedCity.currentBuild && (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {unitOptions.filter(unit => canBuild(selectedCity, "Unit", unit.id, gameState)).map(unit => (
                                <button key={unit.id} onClick={() => handleBuild("Unit", unit.id)}>
                                    Build {unit.name}
                                </button>
                            ))}
                            {buildingOptions.filter(building => canBuild(selectedCity, "Building", building.id, gameState)).map(building => (
                                <button key={building.id} onClick={() => handleBuild("Building", building.id)}>
                                    Build {building.name}
                                </button>
                            ))}
                            {projectOptions.filter(p => canBuild(selectedCity, "Project", p.id, gameState)).map(project => (
                                <button key={project.id} onClick={() => handleBuild("Project", project.id)}>
                                    Build {project.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {isMyTurn && (
                        <div style={{ marginTop: 8 }}>
                            <h5>Assign Worked Tiles</h5>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {tilesForCity(selectedCity.id).map(t => {
                                    const isWorked = selectedCity.workedTiles.some(w => w.q === t.coord.q && w.r === t.coord.r);
                                    const center = t.coord.q === selectedCity.coord.q && t.coord.r === selectedCity.coord.r;
                                    const canAdd = selectedCity.workedTiles.length < selectedCity.pop;
                                    const disabled = (!isWorked && !canAdd) || !t.ownerId || (selectedCity.ownerId !== t.ownerId && !isWorked) || center;
                                    return (
                                        <button
                                            key={`${t.coord.q},${t.coord.r}`}
                                            disabled={disabled}
                                            style={{
                                                background: isWorked ? "#3b8" : "#555",
                                                border: center ? "2px solid #fff" : "1px solid #999",
                                                padding: "4px 8px",
                                                opacity: disabled && !isWorked ? 0.4 : 1,
                                            }}
                                            onClick={() => {
                                                let nextWorked = selectedCity.workedTiles.filter(w => !(w.q === t.coord.q && w.r === t.coord.r));
                                                if (!isWorked) {
                                                    nextWorked = [...nextWorked, t.coord];
                                                }
                                                // enforce center + pop trim
                                                if (!nextWorked.some(w => w.q === selectedCity.coord.q && w.r === selectedCity.coord.r)) {
                                                    nextWorked.unshift(selectedCity.coord);
                                                }
                                                nextWorked = nextWorked.slice(0, Math.max(1, selectedCity.pop));
                                                onAction({
                                                    type: "SetWorkedTiles",
                                                    playerId,
                                                    cityId: selectedCity.id,
                                                    tiles: nextWorked,
                                                });
                                            }}
                                            title={center ? "City center must always be worked" : isWorked ? "Unassign tile" : `Assign tile (${selectedCity.workedTiles.length}/${selectedCity.pop})`}
                                        >
                                            {t.coord.q},{t.coord.r} {t.terrain}
                                        </button>
                                    );
                                })}
                            </div>
                            <p style={{ fontSize: "12px", marginTop: 4, maxWidth: 280 }}>
                                Worked tiles must include the city center and are limited by population. Unseen tiles cannot be assigned until revealed.
                            </p>
                        </div>
                    )}

                    {isMyTurn && selectedCity.ownerId === playerId && (
                        <div style={{ marginTop: 8 }}>
                            <button onClick={handleRazeCity}>Raze City</button>
                        </div>
                    )}

                    {isMyTurn && selectedCity.ownerId === playerId && (
                        <div style={{ marginTop: 8 }}>
                            <h5>City Attack (range 2)</h5>
                            {(() => {
                                const garrison = units.find(u => u.ownerId === playerId && u.coord.q === selectedCity.coord.q && u.coord.r === selectedCity.coord.r);
                                const targets = units.filter(u =>
                                    u.ownerId !== playerId &&
                                    hexDistance(u.coord, selectedCity.coord) <= 2
                                );
                                if (!garrison) return <p style={{ margin: "4px 0" }}>No garrison present.</p>;
                                if (selectedCity.hasFiredThisTurn) return <p style={{ margin: "4px 0" }}>Already fired this turn.</p>;
                                if (!targets.length) return <p style={{ margin: "4px 0" }}>No enemies in range.</p>;
                                return (
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        {targets.map(t => (
                                            <button key={t.id} onClick={() => handleCityAttack(t.id)}>
                                                Fire at {t.type} ({t.hp} hp)
                                            </button>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {isMyTurn && (
                <div>
                    <h4>Diplomacy</h4>
                    {gameState.players
                        .filter(p => p.id !== playerId)
                        .map(p => {
                            const state = gameState.diplomacy[playerId]?.[p.id] ?? DiplomacyState.Peace;
                            const hasContact = !!gameState.contacts?.[playerId]?.[p.id];
                            const incomingPeace = gameState.diplomacyOffers.some(o => o.type === "Peace" && o.from === p.id && o.to === playerId);
                            const outgoingPeace = gameState.diplomacyOffers.some(o => o.type === "Peace" && o.from === playerId && o.to === p.id);
                            const sharingVision = !!gameState.sharedVision?.[playerId]?.[p.id];
                            const incomingVision = gameState.diplomacyOffers.some(o => o.type === "Vision" && o.from === p.id && o.to === playerId);
                            const outgoingVision = gameState.diplomacyOffers.some(o => o.type === "Vision" && o.from === playerId && o.to === p.id);
                            const atPeace = state === DiplomacyState.Peace;
                            return (
                                <div key={p.id} style={{ marginBottom: 6 }}>
                                    <div>
                                        <span>{p.id}: {state}</span>
                                        {!hasContact && <span style={{ marginLeft: 6, fontSize: 11, color: "#ffd" }}>(No contact)</span>}
                                        <button style={{ marginLeft: 8 }} onClick={() => onAction({ type: "SetDiplomacy", playerId, targetPlayerId: p.id, state: DiplomacyState.War })} disabled={state === DiplomacyState.War || !hasContact}>
                                            {state === DiplomacyState.War ? "At War" : "Declare War"}
                                        </button>
                                        <button style={{ marginLeft: 4 }} onClick={() => onAction({ type: "ProposePeace", playerId, targetPlayerId: p.id })} disabled={state === DiplomacyState.Peace || outgoingPeace || !hasContact}>
                                            {outgoingPeace ? "Peace Proposed" : "Propose Peace"}
                                        </button>
                                        {incomingPeace && state === DiplomacyState.War && (
                                            <button style={{ marginLeft: 4 }} onClick={() => onAction({ type: "AcceptPeace", playerId, targetPlayerId: p.id })}>Accept Peace</button>
                                        )}
                                    </div>
                                    {incomingPeace && state === DiplomacyState.War && <div style={{ fontSize: 11, color: "#ffd" }}>Peace offer received</div>}
                                    {outgoingPeace && state === DiplomacyState.War && <div style={{ fontSize: 11, color: "#9cf" }}>Peace offer sent</div>}
                                    <div style={{ marginTop: 4 }}>
                                        <span style={{ marginRight: 6, fontSize: 12 }}>Vision:</span>
                                        <button
                                            onClick={() => onAction({ type: "ProposeVisionShare", playerId, targetPlayerId: p.id })}
                                            disabled={!atPeace || sharingVision || outgoingVision || !hasContact}
                                            style={{ marginRight: 4 }}
                                        >
                                            {sharingVision ? "Sharing" : outgoingVision ? "Vision Proposed" : "Offer Vision Share"}
                                        </button>
                                        {incomingVision && atPeace && !sharingVision && hasContact && (
                                            <button onClick={() => onAction({ type: "AcceptVisionShare", playerId, targetPlayerId: p.id })} style={{ marginRight: 4 }}>
                                                Accept Vision
                                            </button>
                                        )}
                                        {sharingVision && (
                                            <button onClick={() => onAction({ type: "RevokeVisionShare", playerId, targetPlayerId: p.id })}>
                                                Revoke
                                            </button>
                                        )}
                                        {incomingVision && !atPeace && <span style={{ fontSize: 11, color: "#ffd", marginLeft: 6 }}>Vision offer pending (needs peace)</span>}
                                        {sharingVision && <span style={{ fontSize: 11, color: "#9cf", marginLeft: 6 }}>Map sharing active</span>}
                                        {outgoingVision && !sharingVision && <span style={{ fontSize: 11, color: "#9cf", marginLeft: 6 }}>Vision offer sent</span>}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
};
