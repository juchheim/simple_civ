import React from "react";
import { GameState, HexCoord, Action, UnitState } from "@simple-civ/engine";
import { buildDiplomacyRows } from "./HUD/helpers";
import { useCityBuildOptions, useSelectedUnits, useUnitActions } from "./HUD/hooks";
import { CityPanel, Codex, DiplomacySummary, GameMenu, TechButton, TurnSummary, TurnTasks, UnitList, UnitPanel } from "./HUD/sections";
import "./HUD/hud.css";

interface HUDProps {
    gameState: GameState;
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    onAction: (action: Action) => void;
    onSelectUnit: (unitId: string | null) => void;
    onSelectCoord: (coord: HexCoord | null) => void;
    onShowTechTree: () => void;
    playerId: string;
    onSave: () => void;
    onLoad: () => void;
    onQuit: () => void;
    showShroud: boolean;
    onToggleShroud: () => void;
    showYields: boolean;
    onToggleYields: () => void;
}

export const HUD: React.FC<HUDProps> = ({ gameState, selectedCoord, selectedUnitId, onAction, onSelectUnit, onSelectCoord, onShowTechTree, playerId, onSave, onLoad, onQuit, showShroud, onToggleShroud, showYields, onToggleYields }) => {
    const { units, cities, currentPlayerId, turn } = gameState;
    const isMyTurn = currentPlayerId === playerId;
    const player = React.useMemo(() => gameState.players.find(p => p.id === playerId), [gameState.players, playerId]);
    const [showResearch, setShowResearch] = React.useState(false);
    const [showDiplomacy, setShowDiplomacy] = React.useState(false);
    const [showCodex, setShowCodex] = React.useState(false);
    const [showGame, setShowGame] = React.useState(false);

    const { unitsOnTile, selectedUnit, linkedPartner, linkCandidate } = useSelectedUnits({
        selectedCoord,
        units,
        cities,
        playerId,
        selectedUnitId,
        onSelectUnit,
    });

    const { canLinkUnits, canUnlinkUnits, handleLinkUnits, handleUnlinkUnits, handleFoundCity, handleToggleAutoExplore } = useUnitActions({
        isMyTurn,
        selectedUnit,
        linkCandidate,
        linkedPartner,
        playerId,
        onAction,
    });

    const selectedCity = selectedCoord
        ? cities.find(c => c.coord.q === selectedCoord.q && c.coord.r === selectedCoord.r) ?? null
        : null;

    const handleEndTurn = React.useCallback(() => {
        onAction({ type: "EndTurn", playerId });
    }, [onAction, playerId]);

    const handleBuild = React.useCallback(
        (type: "Unit" | "Building" | "Project", id: string) => {
            if (!selectedCity) return;
            onAction({ type: "SetCityBuild", playerId, cityId: selectedCity.id, buildType: type, buildId: id });
        },
        [selectedCity, onAction, playerId],
    );

    const handleRazeCity = React.useCallback(() => {
        if (!selectedCity) return;
        if (!window.confirm("Raze this city? This will remove it permanently.")) return;
        onAction({ type: "RazeCity", playerId, cityId: selectedCity.id });
    }, [selectedCity, onAction, playerId]);

    const handleCityAttack = React.useCallback(
        (targetUnitId: string) => {
            if (!selectedCity) return;
            onAction({ type: "CityAttack", playerId, cityId: selectedCity.id, targetUnitId });
        },
        [selectedCity, onAction, playerId],
    );

    const handleSetWorkedTiles = React.useCallback(
        (cityId: string, tiles: HexCoord[]) => {
            onAction({
                type: "SetWorkedTiles",
                playerId,
                cityId,
                tiles,
            });
        },
        [onAction, playerId],
    );

    const cityBuildOptions = useCityBuildOptions(selectedCity, gameState);
    const diplomacyRows = React.useMemo(() => buildDiplomacyRows(gameState, playerId), [gameState, playerId]);
    const showUnitStack = !!selectedUnit || unitsOnTile.length > 1;
    const blockingTasks = React.useMemo(() => {
        if (!isMyTurn || !player) return [];
        const required: { id: string; kind: "research" | "city"; label: string; coord?: HexCoord }[] = [];
        if (!player.currentTech) {
            required.push({ id: "research", kind: "research", label: "Select new research" });
        }
        for (const city of cities) {
            if (city.ownerId !== playerId) continue;
            if (!city.currentBuild) {
                required.push({
                    id: `city-${city.id}`,
                    kind: "city",
                    label: `Choose production: ${city.name}`,
                    coord: city.coord,
                });
            }
        }
        return required;
    }, [cities, isMyTurn, player, playerId]);

    const attentionTasks = React.useMemo(() => {
        if (!isMyTurn) return [];
        const optional: { id: string; kind: "unit"; label: string; coord: HexCoord; unitId: string }[] = [];
        for (const unit of units) {
            if (unit.ownerId !== playerId) continue;
            if (unit.movesLeft <= 0) continue;
            if (unit.state !== UnitState.Normal) continue;
            if (unit.autoMoveTarget) continue;
            optional.push({
                id: `unit-${unit.id}`,
                kind: "unit",
                label: `Unit idle: ${unit.type}`,
                coord: unit.coord,
                unitId: unit.id,
            });
        }
        return optional;
    }, [isMyTurn, playerId, units]);

    const handleFocusCity = React.useCallback(
        (coord: HexCoord) => {
            onSelectCoord(coord);
            onSelectUnit(null);
        },
        [onSelectCoord, onSelectUnit],
    );

    const handleFocusUnit = React.useCallback(
        (unitId: string, coord: HexCoord) => {
            onSelectCoord(coord);
            onSelectUnit(unitId);
        },
        [onSelectCoord, onSelectUnit],
    );

    const canEndTurn = isMyTurn && blockingTasks.length === 0;
    const endTurnMessage = !isMyTurn
        ? "Waiting for opponents"
        : blockingTasks.length > 0
            ? "Resolve blocking tasks to end turn"
            : undefined;

    return (
        <div className="hud-layer">
            <div className="hud-top-row">
                {showCodex ? (
                    <div className="hud-card hud-menu-card" style={{ position: "relative" }}>
                        <button className="hud-close-button" onClick={() => setShowCodex(false)} aria-label="Close codex">
                            X
                        </button>
                        <Codex />
                    </div>
                ) : (
                    <button className="hud-tab-trigger" onClick={() => setShowCodex(true)}>
                        Codex
                    </button>
                )}
                {isMyTurn && (
                    showDiplomacy ? (
                        <div className="hud-card hud-menu-card" style={{ position: "relative" }}>
                            <button className="hud-close-button" onClick={() => setShowDiplomacy(false)} aria-label="Close diplomacy menu">
                                X
                            </button>
                            <DiplomacySummary rows={diplomacyRows} playerId={playerId} onAction={onAction} />
                        </div>
                    ) : (
                        <button className="hud-tab-trigger" onClick={() => setShowDiplomacy(true)}>
                            Diplomacy
                        </button>
                    )
                )}
                {showResearch ? (
                    <div className="hud-card hud-menu-card" style={{ position: "relative" }}>
                        <button className="hud-close-button" onClick={() => setShowResearch(false)} aria-label="Close research menu">
                            X
                        </button>
                        <TechButton player={player} onShowTechTree={onShowTechTree} />
                    </div>
                ) : (
                    <button className="hud-tab-trigger" onClick={() => setShowResearch(true)}>
                        Research
                    </button>
                )}
            </div>

            <div className="hud-top-left">
                {showGame ? (
                    <div className="hud-card hud-menu-card" style={{ position: "relative" }}>
                        <button className="hud-close-button" onClick={() => setShowGame(false)} aria-label="Close game menu">
                            X
                        </button>
                        <GameMenu
                            onSave={onSave}
                            onLoad={onLoad}
                            onQuit={onQuit}
                            showShroud={showShroud}
                            onToggleShroud={onToggleShroud}
                            showYields={showYields}
                            onToggleYields={onToggleYields}
                        />
                    </div>
                ) : (
                    <button className="hud-tab-trigger" onClick={() => setShowGame(true)}>
                        Game
                    </button>
                )}
            </div>

            <div className="hud-left-stack">
                {showUnitStack && (
                    <div className="hud-card hud-selection-card">
                        <UnitList units={unitsOnTile} selectedUnitId={selectedUnitId} onSelectUnit={unitId => onSelectUnit(unitId)} />
                        {selectedUnit && (
                            <UnitPanel
                                unit={selectedUnit}
                                linkedPartner={linkedPartner ?? null}
                                canLinkUnits={canLinkUnits}
                                canUnlinkUnits={canUnlinkUnits}
                                isMyTurn={isMyTurn}
                                onLinkUnits={handleLinkUnits}
                                onUnlinkUnits={handleUnlinkUnits}
                                onFoundCity={handleFoundCity}
                                onToggleAutoExplore={handleToggleAutoExplore}
                            />
                        )}
                    </div>
                )}
            </div>

            {selectedCity && (
                <div className="hud-card hud-city-panel">
                    <CityPanel
                        city={selectedCity}
                        isMyTurn={isMyTurn}
                        playerId={playerId}
                        gameState={gameState}
                        units={units}
                        buildOptions={cityBuildOptions}
                        onBuild={handleBuild}
                        onRazeCity={handleRazeCity}
                        onCityAttack={handleCityAttack}
                        onSetWorkedTiles={handleSetWorkedTiles}
                    />
                </div>
            )}

            <div className="hud-turn-stack">
                <TurnTasks
                    blockingTasks={blockingTasks}
                    attentionTasks={attentionTasks}
                    isMyTurn={isMyTurn}
                    onOpenTechTree={onShowTechTree}
                    onFocusCity={handleFocusCity}
                    onFocusUnit={handleFocusUnit}
                />
                <div className="hud-card hud-turn-panel">
                    <TurnSummary
                        turn={turn}
                        currentPlayerId={currentPlayerId}
                        isMyTurn={isMyTurn}
                        canEndTurn={canEndTurn}
                        blockingCount={blockingTasks.length}
                        disableReason={endTurnMessage}
                        onEndTurn={handleEndTurn}
                    />
                </div>
            </div>
        </div>
    );
};
