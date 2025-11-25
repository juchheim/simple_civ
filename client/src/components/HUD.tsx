import React from "react";
import { GameState, HexCoord, Action } from "@simple-civ/engine";
import { buildDiplomacyRows } from "./HUD/helpers";
import { useCityBuildOptions, useSelectedUnits, useUnitActions } from "./HUD/hooks";
import { CityPanel, Codex, DiplomacySummary, GameMenu, TechButton, TurnSummary, UnitList, UnitPanel } from "./HUD/sections";
import "./HUD/hud.css";

interface HUDProps {
    gameState: GameState;
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    onAction: (action: Action) => void;
    onSelectUnit: (unitId: string | null) => void;
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

export const HUD: React.FC<HUDProps> = ({ gameState, selectedCoord, selectedUnitId, onAction, onSelectUnit, onShowTechTree, playerId, onSave, onLoad, onQuit, showShroud, onToggleShroud, showYields, onToggleYields }) => {
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
        playerId,
        selectedUnitId,
        onSelectUnit,
    });

    const { canLinkUnits, canUnlinkUnits, handleLinkUnits, handleUnlinkUnits, handleFoundCity } = useUnitActions({
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

            <div className="hud-card hud-turn-panel">
                <TurnSummary turn={turn} currentPlayerId={currentPlayerId} isMyTurn={isMyTurn} onEndTurn={handleEndTurn} />
            </div>
        </div>
    );
};
