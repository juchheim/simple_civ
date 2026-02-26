import React from "react";
import type { HUDLayoutProps } from "./helpers";
import {
    FriendlyCityPanelCard,
    SelectionStack,
    TopLeftMenu,
    TopRow,
    TurnStack
} from "./HUDLayoutSections";

export const HUDLayout: React.FC<HUDLayoutProps> = props => {
    const {
        meta: {
            gameState,
            playerId,
            isMyTurn,
            diplomacyRows,
            cityStateRows,
            empireYields,
            playerEconomy,
            mapView,
        },
        selection: {
            selectedCoord,
            selectedUnitId,
            selectedCity,
            unitsOnTile,
            selectedUnit,
            linkedPartner,
            showUnitStack,
            canLinkUnits,
            canUnlinkUnits,
        },
        buildOptions,
        uiFlags: {
            showResearch,
            showDiplomacy,
            showCodex,
            showEconomy,
            showGameMenu,
            showShroud,
            showYields,
            showCombatPreview,
        },
        uiToggles: {
            setShowResearch,
            setShowDiplomacy,
            setShowCodex,
            setShowEconomy,
            setShowGameMenu,
            onToggleShroud,
            onToggleYields,
            onToggleCombatPreview,
        },
        actions: {
            onAction,
            onSave,
            onLoad,
            onRestart,
            onQuit,
            onResign,
            onBuild,
            onRushBuy,
            onRazeCity,
            onSetWorkedTiles,
            onLinkUnits,
            onUnlinkUnits,
            onFoundCity,
            onToggleAutoExplore,
            onFortifyUnit,
            onDisbandUnit,
            onCancelMovement,
            onEndTurn,
            onShowTechTree,
            musicEnabled,
            onToggleMusic,
            musicVolume,
            onMusicVolumeChange,
            musicStatusLabel,
        },
        tasks: {
            blockingTasks,
            attentionTasks,
            canEndTurn,
            endTurnMessage,
        },
        handlers: {
            onSelectUnit,
            onSelectCoord,
            onNavigateMap,
            onFocusCity,
            onFocusUnit,
        },
    } = props;

    return (
        <>
            <TopRow
                isMyTurn={isMyTurn}
                showCodex={showCodex}
                onToggleCodex={setShowCodex}
                showEconomy={showEconomy}
                onToggleEconomy={setShowEconomy}
                showDiplomacy={showDiplomacy}
                onToggleDiplomacy={setShowDiplomacy}
                showResearch={showResearch}
                onToggleResearch={setShowResearch}
                playerEconomy={playerEconomy}
                diplomacyRows={diplomacyRows}
                cityStateRows={cityStateRows}
                playerId={playerId}
                onAction={onAction}
                player={gameState.players.find(p => p.id === playerId)}
                onShowTechTree={onShowTechTree}
                gameState={gameState}
                mapView={mapView}
                selectedUnitId={selectedUnitId}
                onNavigateMap={onNavigateMap}
                sciencePerTurn={empireYields.S}
            />

            <TopLeftMenu
                showGameMenu={showGameMenu}
                onToggleGameMenu={setShowGameMenu}
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
                musicEnabled={musicEnabled}
                onToggleMusic={onToggleMusic}
                musicVolume={musicVolume}
                onMusicVolumeChange={onMusicVolumeChange}
                musicStatusLabel={musicStatusLabel}
                empireYields={empireYields}
                playerEconomy={playerEconomy}
            />

            <SelectionStack
                selection={{
                    selectedCoord,
                    selectedUnitId,
                    selectedCity,
                    unitsOnTile,
                    selectedUnit,
                    linkedPartner,
                    showUnitStack,
                    canLinkUnits,
                    canUnlinkUnits,
                }}
                canLinkUnits={canLinkUnits}
                canUnlinkUnits={canUnlinkUnits}
                isMyTurn={isMyTurn}
                onLinkUnits={onLinkUnits}
                onUnlinkUnits={onUnlinkUnits}
                onFoundCity={onFoundCity}
                onToggleAutoExplore={onToggleAutoExplore}
                onFortifyUnit={onFortifyUnit}
                onDisbandUnit={onDisbandUnit}
                onCancelMovement={onCancelMovement}
                gameState={gameState}
                onSelectUnit={onSelectUnit}
                playerId={playerId}
                cityBuildOptions={buildOptions}
                onBuild={onBuild}
                onRushBuy={onRushBuy}
                onRazeCity={onRazeCity}
                onSetWorkedTiles={onSetWorkedTiles}
                onSelectCoord={onSelectCoord}
                units={gameState.units}
            />

            <FriendlyCityPanelCard
                selectedCity={selectedCity}
                playerId={playerId}
                isMyTurn={isMyTurn}
                gameState={gameState}
                units={gameState.units}
                buildOptions={buildOptions}
                onBuild={onBuild}
                onRushBuy={onRushBuy}
                onRazeCity={onRazeCity}
                onSetWorkedTiles={onSetWorkedTiles}
                onSelectUnit={onSelectUnit}
                onSelectCoord={onSelectCoord}
            />

            <TurnStack
                blockingTasks={blockingTasks}
                attentionTasks={attentionTasks}
                isMyTurn={isMyTurn}
                onOpenTechTree={onShowTechTree}
                onFocusCity={onFocusCity}
                onFocusUnit={onFocusUnit}
                turn={gameState.turn}
                currentPlayerId={gameState.currentPlayerId}
                canEndTurn={canEndTurn}
                disableReason={endTurnMessage}
                onEndTurn={onEndTurn}
            />
        </>
    );
};
