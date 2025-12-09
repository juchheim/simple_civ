import React from "react";
import { GameState, HexCoord, Action, UnitState, pickBestAvailableTech, getCityYields } from "@simple-civ/engine";
import { MapViewport } from "./GameMap";
import { buildDiplomacyRows } from "./HUD/helpers";
import { useCityBuildOptions, useSelectedUnits, useUnitActions } from "./HUD/hooks";
import { useDiplomacyAlerts } from "./HUD/hooks/use-diplomacy-alerts";
import { useProgressRaceAlerts } from "./HUD/hooks/use-progress-race-alerts";
import { CityPanel, Codex, DiplomacySummary, GameMenu, TechButton, TurnSummary, TurnTasks, UnitList, UnitPanel, DiplomacyAlertModal, TileInfoPanel } from "./HUD/sections";
import { MiniMap } from "./HUD/MiniMap";
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
    onRestart: () => void;
    onQuit: () => void;
    onResign: () => void;
    showShroud: boolean;
    onToggleShroud: () => void;
    showYields: boolean;
    onToggleYields: () => void;
    showCombatPreview: boolean;
    onToggleCombatPreview: () => void;
    onCenterCity: (coord: HexCoord) => void;

    mapView: MapViewport | null;
    onNavigateMap: (point: { x: number; y: number }) => void;
    showGameMenu: boolean;
    onToggleGameMenu: (show: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({ gameState, selectedCoord, selectedUnitId, onAction, onSelectUnit, onSelectCoord, onShowTechTree, playerId, onSave, onLoad, onRestart, onQuit, onResign, showShroud, onToggleShroud, showYields, onToggleYields, showCombatPreview, onToggleCombatPreview, onCenterCity, mapView, onNavigateMap, showGameMenu, onToggleGameMenu }) => {
    const { units, cities, currentPlayerId, turn } = gameState;
    const isMyTurn = currentPlayerId === playerId;
    const player = React.useMemo(() => gameState.players.find(p => p.id === playerId), [gameState.players, playerId]);
    const empireYields = React.useMemo(() => {
        const playerCities = cities.filter(c => c.ownerId === playerId);
        return playerCities.reduce(
            (acc, city) => {
                const yields = getCityYields(city, gameState);
                return { F: acc.F + yields.F, P: acc.P + yields.P, S: acc.S + yields.S };
            },
            { F: 0, P: 0, S: 0 }
        );
    }, [cities, playerId, gameState]);
    const [showResearch, setShowResearch] = React.useState(false);
    const [showDiplomacy, setShowDiplomacy] = React.useState(false);
    const [showCodex, setShowCodex] = React.useState(false);

    const { unitsOnTile, selectedUnit, linkedPartner, linkCandidate } = useSelectedUnits({
        selectedCoord,
        units,
        cities,
        playerId,
        selectedUnitId,
        onSelectUnit,
    });

    const { canLinkUnits, canUnlinkUnits, handleLinkUnits, handleUnlinkUnits, handleFoundCity, handleToggleAutoExplore, handleFortifyUnit, handleCancelMovement } = useUnitActions({
        isMyTurn,
        selectedUnit,
        linkCandidate,
        linkedPartner,
        playerId,
        onAction,
    });

    const { activeAlert: diplomacyAlert, dismissAlert: dismissDiplomacyAlert } = useDiplomacyAlerts(gameState, playerId);
    const { activeAlert: progressRaceAlert, dismissAlert: dismissProgressRaceAlert } = useProgressRaceAlerts(gameState, playerId);

    // Only show modal alerts for diplomacy (war/peace) and progress race events
    // Game events (era transitions, capitals, etc.) are now toasts in App.tsx
    const activeAlert = progressRaceAlert || diplomacyAlert;
    const dismissAlert = progressRaceAlert
        ? dismissProgressRaceAlert
        : dismissDiplomacyAlert;

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
            // Only require selection if there is available research
            const nextTech = pickBestAvailableTech(player);
            if (nextTech) {
                required.push({ id: "research", kind: "research", label: "Select new research" });
            }
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
            onCenterCity(coord);
        },
        [onSelectCoord, onSelectUnit, onCenterCity],
    );

    const handleFocusUnit = React.useCallback(
        (unitId: string, coord: HexCoord) => {
            onSelectCoord(coord);
            onSelectUnit(unitId);
            onCenterCity(coord);
        },
        [onSelectCoord, onSelectUnit, onCenterCity],
    );

    const canEndTurn = isMyTurn && blockingTasks.length === 0;
    const endTurnMessage = !isMyTurn
        ? "Waiting for opponents"
        : blockingTasks.length > 0
            ? "Resolve blocking tasks to end turn"
            : undefined;

    // Center camera on city when city panel is displayed
    React.useEffect(() => {
        if (selectedCity) {
            onCenterCity(selectedCity.coord);
        }
    }, [selectedCity, onCenterCity]);

    return (
        <div className="hud-layer">
            <div className="hud-top-row">
                <div className="hud-top-row-buttons">
                    {showCodex ? (
                        <div className="hud-card hud-menu-card" style={{ position: "relative", width: "500px", maxWidth: "90vw" }}>
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
                <MiniMap
                    gameState={gameState}
                    playerId={playerId}
                    mapView={mapView}
                    selectedUnitId={selectedUnitId}
                    onNavigate={onNavigateMap}
                />
            </div>

            <div className="hud-top-left">
                {showGameMenu ? (
                    <div className="hud-card hud-menu-card" style={{ position: "relative" }}>
                        <button className="hud-close-button" onClick={() => onToggleGameMenu(false)} aria-label="Close game menu">
                            X
                        </button>
                        <GameMenu
                            onSave={onSave}
                            onLoad={onLoad}
                            onRestart={onRestart}
                            onQuit={onQuit}
                            onResign={onResign}
                            showShroud={showShroud}
                            onToggleShroud={onToggleShroud}
                            showYields={showYields}
                            onToggleYields={onToggleYields}
                            showCombatPreview={showCombatPreview}
                            onToggleCombatPreview={onToggleCombatPreview}
                        />
                    </div>
                ) : (
                    <button className="hud-tab-trigger" onClick={() => onToggleGameMenu(true)}>
                        Game
                    </button>
                )}
                <div className="hud-empire-yields">
                    <span className="hud-yield hud-yield--food" title="Food per turn"><img src="/ui/Food.png" alt="Food" className="hud-yield-icon" /> {empireYields.F}</span>
                    <span className="hud-yield hud-yield--prod" title="Production per turn"><img src="/ui/Production.png" alt="Production" className="hud-yield-icon" /> {empireYields.P}</span>
                    <span className="hud-yield hud-yield--science" title="Science per turn"><img src="/ui/Science.png" alt="Science" className="hud-yield-icon" /> {empireYields.S}</span>
                </div>
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
                                onFortifyUnit={handleFortifyUnit}
                                onCancelMovement={handleCancelMovement}
                                gameState={gameState}
                            />
                        )}
                    </div>
                )}
                {selectedCoord && !selectedCity && (
                    <div className="hud-card hud-selection-card">
                        <TileInfoPanel
                            tile={gameState.map.tiles.find(t => t.coord.q === selectedCoord.q && t.coord.r === selectedCoord.r)!}
                        />
                    </div>
                )}
                {selectedCity && selectedCity.ownerId !== playerId && (
                    <div className="hud-card hud-enemy-city-card">
                        <CityPanel
                            city={selectedCity}
                            isMyTurn={isMyTurn}
                            playerId={playerId}
                            gameState={gameState}
                            units={units}
                            buildOptions={cityBuildOptions}
                            onBuild={handleBuild}
                            onRazeCity={handleRazeCity}
                            onSetWorkedTiles={handleSetWorkedTiles}
                            onSelectUnit={onSelectUnit}
                            onClose={() => onSelectCoord(null)}
                        />
                    </div>
                )}
            </div>

            {selectedCity && selectedCity.ownerId === playerId && (
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
                        onSetWorkedTiles={handleSetWorkedTiles}
                        onSelectUnit={onSelectUnit}
                        onClose={() => onSelectCoord(null)}
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
            {activeAlert && (
                <DiplomacyAlertModal
                    alert={activeAlert}
                    gameState={gameState}
                    onOpenDiplomacy={activeAlert.type !== "ProgressRace" ? () => {
                        setShowDiplomacy(true);
                        dismissAlert(activeAlert.id);
                    } : undefined}
                    onDismiss={() => dismissAlert(activeAlert.id)}
                />
            )}
        </div>
    );
};
