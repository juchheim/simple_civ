import React from "react";
import { GameState, HexCoord, Action } from "@simple-civ/engine";
import { buildDiplomacyRows } from "./HUD/helpers";
import { useCityBuildOptions, useSelectedUnits, useUnitActions } from "./HUD/hooks";
import { ActionBar, CityPanel, DiplomacySummary, TechButton, UnitList, UnitPanel } from "./HUD/sections";

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
    const player = React.useMemo(() => gameState.players.find(p => p.id === playerId), [gameState.players, playerId]);

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

    return (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, background: "rgba(0,0,0,0.8)", color: "white", display: "flex", gap: 20 }}>
            <ActionBar turn={turn} currentPlayerId={currentPlayerId} isMyTurn={isMyTurn} onEndTurn={handleEndTurn} />

            <TechButton player={player} onShowTechTree={onShowTechTree} />

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

            {selectedCity && (
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
            )}

            {isMyTurn && <DiplomacySummary rows={diplomacyRows} playerId={playerId} onAction={onAction} />}
        </div>
    );
};
