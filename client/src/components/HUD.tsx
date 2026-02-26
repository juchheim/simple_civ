import React from "react";
import type { Action, GameState, HexCoord } from "@simple-civ/engine";
import type { MapViewport } from "./GameMap";
import { buildCityStateRows, buildDiplomacyRows } from "./HUD/helpers";
import { useCityBuildOptions, useSelectedUnits, useUnitActions } from "./HUD/hooks";
import { useDiplomacyAlerts } from "./HUD/hooks/use-diplomacy-alerts";
import { useProgressRaceAlerts } from "./HUD/hooks/use-progress-race-alerts";
import { DiplomacyAlertModal } from "./HUD/sections";
import { HUDLayout } from "./HUD/HUDLayout";
import type { HUDLayoutProps } from "./HUD/helpers";
import { buildAttentionTasks, buildBlockingTasks, calculateEmpireYields, getSelectedCity } from "./HUD/helpers/hud-utils";
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
    musicEnabled?: boolean;
    onToggleMusic?: () => void;
    musicVolume?: number;
    onMusicVolumeChange?: (volume: number) => void;
    musicStatusLabel?: string;
}

export const HUD: React.FC<HUDProps> = ({
    gameState,
    selectedCoord,
    selectedUnitId,
    onAction,
    onSelectUnit,
    onSelectCoord,
    onShowTechTree,
    playerId,
    onSave,
    onLoad,
    onRestart,
    onQuit,
    onResign,
    showShroud,
    onToggleShroud,
    showYields,
    onToggleYields,
    showCombatPreview,
    onToggleCombatPreview,
    onCenterCity,
    mapView,
    onNavigateMap,
    showGameMenu,
    onToggleGameMenu,
    musicEnabled,
    onToggleMusic,
    musicVolume,
    onMusicVolumeChange,
    musicStatusLabel,
}) => {
    const { units, cities, currentPlayerId } = gameState;
    const isMyTurn = currentPlayerId === playerId;
    const player = React.useMemo(() => gameState.players.find(p => p.id === playerId), [gameState.players, playerId]);
    const empireYields = React.useMemo(() => calculateEmpireYields(cities, playerId, gameState), [cities, gameState, playerId]);
    const playerEconomy = React.useMemo(() => {
        const income = player?.grossGold ?? empireYields.G;
        const buildingUpkeep = player?.buildingUpkeep ?? 0;
        const militaryUpkeep = player?.militaryUpkeep ?? 0;
        const usedSupply = player?.usedSupply ?? 0;
        const freeSupply = player?.freeSupply ?? 0;
        const net = player?.netGold ?? (income - buildingUpkeep - militaryUpkeep);
        return {
            treasury: player?.treasury ?? 0,
            income,
            buildingUpkeep,
            militaryUpkeep,
            usedSupply,
            freeSupply,
            net,
        };
    }, [empireYields.G, player]);
    const [showResearch, setShowResearch] = React.useState(false);
    const [showDiplomacy, setShowDiplomacy] = React.useState(false);
    const [showCodex, setShowCodex] = React.useState(false);
    const [showEconomy, setShowEconomy] = React.useState(false);

    const { unitsOnTile, selectedUnit, linkedPartner, linkCandidate } = useSelectedUnits({
        selectedCoord,
        units,
        cities,
        playerId,
        selectedUnitId,
        onSelectUnit,
    });

    const { canLinkUnits, canUnlinkUnits, handleLinkUnits, handleUnlinkUnits, handleFoundCity, handleToggleAutoExplore, handleFortifyUnit, handleDisbandUnit, handleCancelMovement } = useUnitActions({
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

    const selectedCity = React.useMemo(() => getSelectedCity(selectedCoord, cities), [cities, selectedCoord]);

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

    const handleRushBuy = React.useCallback(
        (cityId: string) => {
            onAction({ type: "RushBuyProduction", playerId, cityId });
        },
        [onAction, playerId],
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
    const cityStateRows = React.useMemo(() => buildCityStateRows(gameState, playerId), [gameState, playerId]);
    const showUnitStack = !!selectedUnit || unitsOnTile.length > 1;
    const blockingTasks = React.useMemo(
        () => buildBlockingTasks(isMyTurn, player, cities, playerId),
        [cities, isMyTurn, player, playerId]
    );

    const attentionTasks = React.useMemo(
        () => buildAttentionTasks(isMyTurn, playerId, units),
        [isMyTurn, playerId, units]
    );

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

    const layoutProps: HUDLayoutProps = {
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
        buildOptions: cityBuildOptions,
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
            setShowGameMenu: onToggleGameMenu,
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
            onBuild: handleBuild,
            onRushBuy: handleRushBuy,
            onRazeCity: handleRazeCity,
            onSetWorkedTiles: handleSetWorkedTiles,
            onLinkUnits: handleLinkUnits,
            onUnlinkUnits: handleUnlinkUnits,
            onFoundCity: handleFoundCity,
            onToggleAutoExplore: handleToggleAutoExplore,
            onFortifyUnit: handleFortifyUnit,
            onDisbandUnit: handleDisbandUnit,
            onCancelMovement: handleCancelMovement,
            onEndTurn: handleEndTurn,
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
            onCenterCity,
            onNavigateMap,
            onFocusCity: handleFocusCity,
            onFocusUnit: handleFocusUnit,
        },
    };

    return (
        <div className="hud-layer">
            <HUDLayout {...layoutProps} />
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
